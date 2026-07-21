const fetch = require('node-fetch');
const nodemailer = require('nodemailer');

class IntegrationError extends Error {
  constructor(code, message, status = 502) {
    super(message);
    this.name = 'IntegrationError';
    this.code = code;
    this.status = status;
  }
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new IntegrationError('NOT_CONFIGURED', `${name} is not configured`, 503);
  return value;
}

async function parseResponse(response, provider) {
  const text = await response.text();
  let payload = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { message: text.slice(0, 300) }; }
  if (!response.ok) {
    const providerMessage = payload?.error?.message || payload?.error_description || payload?.message;
    const code = [401, 403].includes(response.status) ? 'PERMISSION_REVOKED'
      : [409, 412].includes(response.status) ? 'CONFLICT'
        : response.status === 429 ? 'RATE_LIMITED' : 'PROVIDER_ERROR';
    const status = code === 'CONFLICT' ? 409 : code === 'PERMISSION_REVOKED' ? 409 : code === 'RATE_LIMITED' ? 503 : 502;
    throw new IntegrationError(code, `${provider} request failed${providerMessage ? `: ${providerMessage}` : ''}`, status);
  }
  return payload;
}

async function exchangeRefreshToken({ tokenUrl, clientId, clientSecret, refreshToken, scope, provider }) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });
  if (scope) body.set('scope', scope);
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const payload = await parseResponse(response, provider);
  if (!payload.access_token) throw new IntegrationError('INVALID_TOKEN_RESPONSE', `${provider} did not return an access token`);
  return payload.access_token;
}

function isoOrDefault(value, fallback) {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new IntegrationError('INVALID_INPUT', 'Invalid date range', 400);
  return parsed.toISOString();
}

async function listGoogleCalendarEvents({ timeMin, timeMax, maxResults = 50 } = {}) {
  const accessToken = await exchangeRefreshToken({
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientId: required('GOOGLE_CALENDAR_CLIENT_ID'),
    clientSecret: required('GOOGLE_CALENDAR_CLIENT_SECRET'),
    refreshToken: required('GOOGLE_CALENDAR_REFRESH_TOKEN'),
    provider: 'Google OAuth'
  });
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(process.env.GOOGLE_CALENDAR_ID || 'primary')}/events`);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', String(Math.min(Math.max(Number(maxResults) || 50, 1), 100)));
  url.searchParams.set('timeMin', isoOrDefault(timeMin, new Date().toISOString()));
  if (timeMax) url.searchParams.set('timeMax', isoOrDefault(timeMax));
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const payload = await parseResponse(response, 'Google Calendar');
  return (payload.items || []).map((event) => ({
    id: event.id,
    title: event.summary || '(untitled)',
    starts_at: event.start?.dateTime || event.start?.date,
    ends_at: event.end?.dateTime || event.end?.date,
    status: event.status,
    updated_at: event.updated,
    html_url: event.htmlLink
  }));
}

function normalizedEventInput(input = {}) {
  const title = String(input.title || '').trim();
  if (!title || title.length > 500) throw new IntegrationError('INVALID_INPUT', 'title is required and must be at most 500 characters', 400);
  if (!input.starts_at || !input.ends_at) throw new IntegrationError('INVALID_INPUT', 'starts_at and ends_at are required', 400);
  const startsAt = isoOrDefault(input.starts_at);
  const endsAt = isoOrDefault(input.ends_at);
  if (new Date(startsAt) >= new Date(endsAt)) throw new IntegrationError('INVALID_INPUT', 'starts_at must precede ends_at', 400);
  return {
    title,
    description: input.description ? String(input.description).slice(0, 5000) : undefined,
    starts_at: startsAt,
    ends_at: endsAt,
    timezone: input.timezone || 'UTC',
    external_id: input.external_id || null,
    version: input.version || null
  };
}

async function upsertGoogleCalendarEvent(input) {
  const event = normalizedEventInput(input);
  const accessToken = await exchangeRefreshToken({
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientId: required('GOOGLE_CALENDAR_CLIENT_ID'),
    clientSecret: required('GOOGLE_CALENDAR_CLIENT_SECRET'),
    refreshToken: required('GOOGLE_CALENDAR_REFRESH_TOKEN'),
    provider: 'Google OAuth'
  });
  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(process.env.GOOGLE_CALENDAR_ID || 'primary')}/events`;
  const url = event.external_id ? `${base}/${encodeURIComponent(event.external_id)}` : base;
  const response = await fetch(url, {
    method: event.external_id ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(event.version ? { 'If-Match': event.version } : {})
    },
    body: JSON.stringify({
      summary: event.title,
      description: event.description,
      start: { dateTime: event.starts_at, timeZone: event.timezone },
      end: { dateTime: event.ends_at, timeZone: event.timezone }
    })
  });
  const payload = await parseResponse(response, 'Google Calendar');
  return {
    id: payload.id,
    title: payload.summary || event.title,
    starts_at: payload.start?.dateTime || event.starts_at,
    ends_at: payload.end?.dateTime || event.ends_at,
    version: payload.etag || null,
    html_url: payload.htmlLink || null
  };
}

async function listOutlookEvents({ timeMin, timeMax, maxResults = 50 } = {}) {
  const tenant = process.env.OUTLOOK_TENANT_ID || 'common';
  const accessToken = await exchangeRefreshToken({
    tokenUrl: `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`,
    clientId: required('OUTLOOK_CLIENT_ID'),
    clientSecret: required('OUTLOOK_CLIENT_SECRET'),
    refreshToken: required('OUTLOOK_REFRESH_TOKEN'),
    scope: 'offline_access Calendars.Read',
    provider: 'Microsoft OAuth'
  });
  const url = new URL('https://graph.microsoft.com/v1.0/me/calendarView');
  url.searchParams.set('startDateTime', isoOrDefault(timeMin, new Date().toISOString()));
  url.searchParams.set('endDateTime', isoOrDefault(timeMax, new Date(Date.now() + 30 * 86400000).toISOString()));
  url.searchParams.set('$top', String(Math.min(Math.max(Number(maxResults) || 50, 1), 100)));
  url.searchParams.set('$select', 'id,subject,start,end,isCancelled,lastModifiedDateTime,webLink');
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.timezone="UTC"' }
  });
  const payload = await parseResponse(response, 'Microsoft Graph');
  return (payload.value || []).map((event) => ({
    id: event.id,
    title: event.subject || '(untitled)',
    starts_at: event.start?.dateTime,
    ends_at: event.end?.dateTime,
    status: event.isCancelled ? 'cancelled' : 'confirmed',
    updated_at: event.lastModifiedDateTime,
    html_url: event.webLink
  }));
}

async function upsertOutlookEvent(input) {
  const event = normalizedEventInput(input);
  const tenant = process.env.OUTLOOK_TENANT_ID || 'common';
  const accessToken = await exchangeRefreshToken({
    tokenUrl: `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`,
    clientId: required('OUTLOOK_CLIENT_ID'),
    clientSecret: required('OUTLOOK_CLIENT_SECRET'),
    refreshToken: required('OUTLOOK_REFRESH_TOKEN'),
    scope: 'offline_access Calendars.ReadWrite',
    provider: 'Microsoft OAuth'
  });
  const base = 'https://graph.microsoft.com/v1.0/me/events';
  const url = event.external_id ? `${base}/${encodeURIComponent(event.external_id)}` : base;
  const response = await fetch(url, {
    method: event.external_id ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(event.version ? { 'If-Match': event.version } : {})
    },
    body: JSON.stringify({
      subject: event.title,
      body: event.description ? { contentType: 'text', content: event.description } : undefined,
      start: { dateTime: event.starts_at, timeZone: event.timezone },
      end: { dateTime: event.ends_at, timeZone: event.timezone }
    })
  });
  const payload = await parseResponse(response, 'Microsoft Graph');
  return {
    id: payload.id || event.external_id,
    title: payload.subject || event.title,
    starts_at: payload.start?.dateTime || event.starts_at,
    ends_at: payload.end?.dateTime || event.ends_at,
    version: payload['@odata.etag'] || null,
    html_url: payload.webLink || null
  };
}

function validateSlackWebhook(value) {
  let url;
  try { url = new URL(value); } catch { throw new IntegrationError('INVALID_CONFIG', 'SLACK_WEBHOOK_URL is invalid', 503); }
  if (url.protocol !== 'https:' || url.hostname !== 'hooks.slack.com' || !url.pathname.startsWith('/services/')) {
    throw new IntegrationError('INVALID_CONFIG', 'SLACK_WEBHOOK_URL must be an HTTPS hooks.slack.com URL', 503);
  }
  return url;
}

async function sendSlackNotification({ text, blocks }) {
  if (!text || !String(text).trim()) throw new IntegrationError('INVALID_INPUT', 'text is required', 400);
  const url = validateSlackWebhook(required('SLACK_WEBHOOK_URL'));
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: String(text).slice(0, 4000), ...(Array.isArray(blocks) ? { blocks } : {}) })
  });
  if (!response.ok) throw new IntegrationError('PROVIDER_ERROR', 'Slack webhook request failed');
  return { delivered: true };
}

async function sendEmail({ to, subject, text, html }) {
  if (!to || !subject || (!text && !html)) throw new IntegrationError('INVALID_INPUT', 'to, subject, and message content are required', 400);
  const transport = nodemailer.createTransport({
    host: required('SMTP_HOST'),
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: required('SMTP_PASSWORD') } : undefined
  });
  const result = await transport.sendMail({
    from: required('SMTP_FROM'),
    to,
    subject: String(subject).slice(0, 200),
    text,
    html
  });
  return { delivered: true, message_id: result.messageId || null };
}

async function getGoogleFitSummary({ startTimeMillis, endTimeMillis } = {}) {
  const end = Number(endTimeMillis) || Date.now();
  const start = Number(startTimeMillis) || end - 86400000;
  if (start >= end) throw new IntegrationError('INVALID_INPUT', 'startTimeMillis must precede endTimeMillis', 400);
  const response = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${required('GOOGLE_FIT_ACCESS_TOKEN')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      aggregateBy: [
        { dataTypeName: 'com.google.step_count.delta' },
        { dataTypeName: 'com.google.active_minutes' }
      ],
      bucketByTime: { durationMillis: end - start },
      startTimeMillis: start,
      endTimeMillis: end
    })
  });
  const payload = await parseResponse(response, 'Google Fit');
  const points = (payload.bucket || []).flatMap((bucket) => bucket.dataset || []).flatMap((dataset) => dataset.point || []);
  const values = points.flatMap((point) => point.value || []).map((value) => Number(value.intVal ?? value.fpVal ?? 0));
  return { start_time_millis: start, end_time_millis: end, total: values.reduce((sum, value) => sum + value, 0), raw: payload };
}

module.exports = {
  IntegrationError,
  listGoogleCalendarEvents,
  upsertGoogleCalendarEvent,
  listOutlookEvents,
  upsertOutlookEvent,
  sendSlackNotification,
  sendEmail,
  getGoogleFitSummary,
  validateSlackWebhook
};
