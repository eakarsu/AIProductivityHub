import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, HeartPulse, Mail, Plug, RefreshCw, Send } from 'lucide-react';
import {
  getGoogleCalendarEvents, getGoogleFitSummary, getIntegrationHistory,
  getOutlookEvents, sendIntegrationEmail, sendSlackNotification, upsertCalendarEvent
} from '../services/api';

function errorMessage(error) {
  return error.response?.data?.error || error.message || 'Integration request failed';
}

function Integrations() {
  const [events, setEvents] = useState([]);
  const [history, setHistory] = useState([]);
  const [health, setHealth] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  const [slackText, setSlackText] = useState('');
  const [email, setEmail] = useState({ to: '', subject: '', text: '' });
  const [calendarForm, setCalendarForm] = useState({ provider: 'google-calendar', title: '', starts_at: '', ends_at: '' });

  const loadHistory = useCallback(async () => {
    try {
      const response = await getIntegrationHistory();
      setHistory(response.data.items || []);
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const run = async (name, action, onSuccess) => {
    setBusy(name);
    setMessage('');
    try {
      const response = await action();
      onSuccess(response.data);
      setMessage(`${name} completed.`);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy('');
      await loadHistory();
    }
  };

  const loadCalendar = (provider) => run(
    provider,
    provider === 'Google Calendar' ? getGoogleCalendarEvents : getOutlookEvents,
    (data) => setEvents((data.events || []).map((event) => ({ ...event, provider })))
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title"><Plug size={28} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Integrations</h1>
          <p className="page-subtitle">Run credential-backed provider actions and inspect their audit trail.</p>
        </div>
        <button className="btn btn-secondary" onClick={loadHistory}><RefreshCw size={16} /> Refresh history</button>
      </div>

      {message && <div className="card" role="status" style={{ marginBottom: '1rem' }}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <section className="card">
          <h3><Calendar size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />Calendars</h3>
          <p style={{ color: 'var(--text-muted)' }}>OAuth refresh credentials stay on the server. A missing or revoked credential produces an audited failure.</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" disabled={Boolean(busy)} onClick={() => loadCalendar('Google Calendar')}>Sync Google</button>
            <button className="btn btn-secondary" disabled={Boolean(busy)} onClick={() => loadCalendar('Outlook')}>Sync Outlook</button>
          </div>
          <hr style={{ borderColor: 'var(--border)', margin: '1rem 0' }} />
          <div className="form-group">
            <label className="form-label" htmlFor="calendar-provider">Create in</label>
            <select id="calendar-provider" className="form-input" value={calendarForm.provider} onChange={(event) => setCalendarForm({ ...calendarForm, provider: event.target.value })}>
              <option value="google-calendar">Google Calendar</option><option value="outlook">Outlook</option>
            </select>
          </div>
          <div className="form-group"><label className="form-label" htmlFor="calendar-title">Event title</label><input id="calendar-title" className="form-input" maxLength={500} value={calendarForm.title} onChange={(event) => setCalendarForm({ ...calendarForm, title: event.target.value })} /></div>
          <div className="form-group"><label className="form-label" htmlFor="calendar-start">Starts</label><input id="calendar-start" type="datetime-local" className="form-input" value={calendarForm.starts_at} onChange={(event) => setCalendarForm({ ...calendarForm, starts_at: event.target.value })} /></div>
          <div className="form-group"><label className="form-label" htmlFor="calendar-end">Ends</label><input id="calendar-end" type="datetime-local" className="form-input" value={calendarForm.ends_at} onChange={(event) => setCalendarForm({ ...calendarForm, ends_at: event.target.value })} /></div>
          <button className="btn btn-primary" disabled={Boolean(busy) || !calendarForm.title || !calendarForm.starts_at || !calendarForm.ends_at} onClick={() => {
            const idempotencyKey = window.crypto?.randomUUID?.() || `web-${Date.now()}`;
            const provider = calendarForm.provider;
            run('Calendar write', () => upsertCalendarEvent(provider, {
              ...calendarForm,
              starts_at: new Date(calendarForm.starts_at).toISOString(),
              ends_at: new Date(calendarForm.ends_at).toISOString(),
              idempotency_key: idempotencyKey
            }), (data) => {
              setEvents((current) => [{ ...data.event, provider: data.provider }, ...current]);
              setCalendarForm({ provider, title: '', starts_at: '', ends_at: '' });
            });
          }}>Create event</button>
        </section>

        <section className="card">
          <h3><HeartPulse size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />Activity</h3>
          <p style={{ color: 'var(--text-muted)' }}>Fetch a one-day Google Fit activity aggregate through the configured provider token.</p>
          <button className="btn btn-primary" disabled={Boolean(busy)} onClick={() => run('Google Fit', getGoogleFitSummary, (data) => setHealth(data.summary))}>Load summary</button>
          {health && <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: '0.75rem' }}>{JSON.stringify({ total: health.total, start: health.start_time_millis, end: health.end_time_millis }, null, 2)}</pre>}
        </section>

        <section className="card">
          <h3><Send size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />Slack notification</h3>
          <div className="form-group">
            <label className="form-label" htmlFor="slack-text">Message</label>
            <textarea id="slack-text" className="form-input" rows={3} maxLength={4000} value={slackText} onChange={(event) => setSlackText(event.target.value)} />
          </div>
          <button className="btn btn-primary" disabled={Boolean(busy) || !slackText.trim()} onClick={() => run('Slack', () => sendSlackNotification({ text: slackText }), () => setSlackText(''))}>Send</button>
        </section>

        <section className="card">
          <h3><Mail size={18} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />Email</h3>
          <div className="form-group"><label className="form-label" htmlFor="email-to">To</label><input id="email-to" type="email" className="form-input" value={email.to} onChange={(event) => setEmail({ ...email, to: event.target.value })} /></div>
          <div className="form-group"><label className="form-label" htmlFor="email-subject">Subject</label><input id="email-subject" className="form-input" value={email.subject} onChange={(event) => setEmail({ ...email, subject: event.target.value })} /></div>
          <div className="form-group"><label className="form-label" htmlFor="email-body">Message</label><textarea id="email-body" className="form-input" rows={3} value={email.text} onChange={(event) => setEmail({ ...email, text: event.target.value })} /></div>
          <button className="btn btn-primary" disabled={Boolean(busy) || !email.to || !email.subject || !email.text} onClick={() => run('Email', () => sendIntegrationEmail(email), () => setEmail({ to: '', subject: '', text: '' }))}>Send</button>
        </section>
      </div>

      <section className="card" style={{ marginBottom: '1rem' }}>
        <h3>Calendar results</h3>
        <div className="table-container"><table><thead><tr><th>Provider</th><th>Event</th><th>Starts</th><th>Status</th></tr></thead><tbody>
          {events.map((event) => <tr key={`${event.provider}-${event.id}`}><td>{event.provider}</td><td>{event.html_url ? <a href={event.html_url} target="_blank" rel="noreferrer">{event.title}</a> : event.title}</td><td>{event.starts_at ? new Date(event.starts_at).toLocaleString() : '—'}</td><td>{event.status || '—'}</td></tr>)}
          {!events.length && <tr><td colSpan={4}>No calendar sync has run in this session.</td></tr>}
        </tbody></table></div>
      </section>

      <section className="card">
        <h3>Integration audit history</h3>
        <div className="table-container"><table><thead><tr><th>Time</th><th>Provider</th><th>Direction</th><th>Operation</th><th>Status</th><th>Items</th></tr></thead><tbody>
          {history.map((item, index) => <tr key={`${item.created_at}-${index}`}><td>{new Date(item.created_at).toLocaleString()}</td><td>{item.provider}</td><td>{item.direction}</td><td>{item.operation}</td><td>{item.status}{item.error_code ? ` (${item.error_code})` : ''}</td><td>{item.item_count}</td></tr>)}
          {!history.length && <tr><td colSpan={6}>No provider actions have been recorded.</td></tr>}
        </tbody></table></div>
      </section>
    </div>
  );
}

export default Integrations;
