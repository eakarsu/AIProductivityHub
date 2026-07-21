jest.mock('node-fetch', () => jest.fn());
jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

const fetch = require('node-fetch');
const nodemailer = require('nodemailer');
const integrations = require('../services/integrationService');

function response(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: jest.fn().mockResolvedValue(typeof payload === 'string' ? payload : JSON.stringify(payload))
  };
}

describe('integrationService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      GOOGLE_CALENDAR_CLIENT_ID: 'client-id',
      GOOGLE_CALENDAR_CLIENT_SECRET: 'client-secret',
      GOOGLE_CALENDAR_REFRESH_TOKEN: 'refresh-token',
      GOOGLE_CALENDAR_ID: 'primary',
      SLACK_WEBHOOK_URL: 'https://hooks.slack.com/services/T/B/secret',
      SMTP_HOST: 'smtp.example.test',
      SMTP_FROM: 'no-reply@example.test'
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('exchanges a refresh token and normalizes Google Calendar events', async () => {
    fetch
      .mockResolvedValueOnce(response(200, { access_token: 'access-token' }))
      .mockResolvedValueOnce(response(200, {
        items: [{
          id: 'event-1',
          summary: 'Planning',
          start: { dateTime: '2026-07-18T14:00:00Z' },
          end: { dateTime: '2026-07-18T14:30:00Z' },
          status: 'confirmed',
          updated: '2026-07-18T12:00:00Z',
          htmlLink: 'https://calendar.google.com/event?eid=event-1'
        }]
      }));

    const events = await integrations.listGoogleCalendarEvents({
      timeMin: '2026-07-18T00:00:00Z',
      timeMax: '2026-07-19T00:00:00Z'
    });

    expect(events).toEqual([expect.objectContaining({ id: 'event-1', title: 'Planning', status: 'confirmed' })]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(String(fetch.mock.calls[1][0])).toContain('/calendar/v3/calendars/primary/events');
  });

  test('rejects Slack webhook hosts outside hooks.slack.com', () => {
    expect(() => integrations.validateSlackWebhook('https://example.com/services/T/B/secret'))
      .toThrow('hooks.slack.com');
  });

  test('creates Google Calendar events with normalized output and optimistic version support', async () => {
    fetch
      .mockResolvedValueOnce(response(200, { access_token: 'access-token' }))
      .mockResolvedValueOnce(response(201, {
        id: 'event-2', summary: 'Deep work', etag: 'version-1',
        start: { dateTime: '2026-07-18T14:00:00.000Z' },
        end: { dateTime: '2026-07-18T15:00:00.000Z' }
      }));

    const event = await integrations.upsertGoogleCalendarEvent({
      title: 'Deep work', starts_at: '2026-07-18T14:00:00Z', ends_at: '2026-07-18T15:00:00Z'
    });

    expect(event).toEqual(expect.objectContaining({ id: 'event-2', version: 'version-1' }));
    expect(fetch.mock.calls[1][1]).toEqual(expect.objectContaining({ method: 'POST' }));
  });

  test('maps provider precondition failures to a conflict', async () => {
    fetch
      .mockResolvedValueOnce(response(200, { access_token: 'access-token' }))
      .mockResolvedValueOnce(response(412, { error: { message: 'etag mismatch' } }));

    await expect(integrations.upsertGoogleCalendarEvent({
      external_id: 'event-1', version: 'old-version', title: 'Changed',
      starts_at: '2026-07-18T14:00:00Z', ends_at: '2026-07-18T15:00:00Z'
    })).rejects.toEqual(expect.objectContaining({ code: 'CONFLICT', status: 409 }));
  });

  test('delivers a Slack notification through the configured webhook', async () => {
    fetch.mockResolvedValueOnce(response(200, 'ok'));
    await expect(integrations.sendSlackNotification({ text: 'Focus session starts now' }))
      .resolves.toEqual({ delivered: true });
    expect(fetch.mock.calls[0][1]).toEqual(expect.objectContaining({ method: 'POST' }));
  });

  test('delivers email through the configured SMTP transport', async () => {
    const sendMail = jest.fn().mockResolvedValue({ messageId: 'message-1' });
    nodemailer.createTransport.mockReturnValue({ sendMail });
    await expect(integrations.sendEmail({
      to: 'user@example.test',
      subject: 'Weekly plan',
      text: 'Your plan is ready.'
    })).resolves.toEqual({ delivered: true, message_id: 'message-1' });
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'user@example.test' }));
  });

  test('fails closed when provider credentials are missing', async () => {
    delete process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
    await expect(integrations.listGoogleCalendarEvents()).rejects.toEqual(
      expect.objectContaining({ code: 'NOT_CONFIGURED', status: 503 })
    );
    expect(fetch).not.toHaveBeenCalled();
  });
});
