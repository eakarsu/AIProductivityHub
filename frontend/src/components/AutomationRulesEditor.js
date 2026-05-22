import React, { useEffect, useState } from 'react';

// NON-VIZ: CRUD editor for workflow automation rules (trigger → action).
export default function AutomationRulesEditor() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState(null);

  const token = () => (typeof localStorage !== 'undefined' && localStorage.getItem('token')) || '';

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/custom-views/automations', { headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) throw new Error(`Load failed (${res.status})`);
      const data = await res.json();
      setRules(data.rules || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const update = (i, patch) => setRules((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remove = (i) => setRules((rs) => rs.filter((_, idx) => idx !== i));
  const add = () => setRules((rs) => [...rs, { id: Date.now(), name: 'New rule', trigger: 'time:08:00', action: 'send_digest', enabled: true }]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch('/api/custom-views/automations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ rules }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      const data = await res.json();
      setRules(data.rules || []);
      setStatus(`Saved ${data.rules.length} rule(s) at ${new Date().toLocaleTimeString()}.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="automation-rules-editor" style={{ background: '#0f172a', padding: 16, borderRadius: 8, border: '1px solid #1f2937' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ color: '#e5e7eb', margin: 0 }}>Workflow Automation Rules</h3>
        <div>
          <button onClick={add} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 4, marginRight: 6, cursor: 'pointer' }}>+ Add Rule</button>
          <button onClick={save} disabled={saving} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 4, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save All'}</button>
        </div>
      </div>
      {loading && <div style={{ color: '#9ca3af' }}>Loading…</div>}
      {error && <div style={{ background: '#7f1d1d', color: '#fecaca', padding: 10, borderRadius: 6, marginBottom: 10 }}>{error}</div>}
      {status && <div style={{ background: '#064e3b', color: '#a7f3d0', padding: 10, borderRadius: 6, marginBottom: 10 }}>{status}</div>}
      <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e5e7eb', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#1f2937', textAlign: 'left' }}>
            <th style={{ padding: 8 }}>Name</th>
            <th style={{ padding: 8 }}>Trigger</th>
            <th style={{ padding: 8 }}>Action</th>
            <th style={{ padding: 8 }}>On</th>
            <th style={{ padding: 8 }}></th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r, i) => (
            <tr key={r.id || i} style={{ borderBottom: '1px solid #1f2937' }}>
              <td style={{ padding: 6 }}>
                <input value={r.name} onChange={(e) => update(i, { name: e.target.value })} style={inputStyle} />
              </td>
              <td style={{ padding: 6 }}>
                <input value={r.trigger} onChange={(e) => update(i, { trigger: e.target.value })} style={inputStyle} />
              </td>
              <td style={{ padding: 6 }}>
                <input value={r.action} onChange={(e) => update(i, { action: e.target.value })} style={inputStyle} />
              </td>
              <td style={{ padding: 6, textAlign: 'center' }}>
                <input type="checkbox" checked={!!r.enabled} onChange={(e) => update(i, { enabled: e.target.checked })} />
              </td>
              <td style={{ padding: 6 }}>
                <button onClick={() => remove(i)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}>Delete</button>
              </td>
            </tr>
          ))}
          {rules.length === 0 && !loading && (
            <tr>
              <td colSpan="5" style={{ padding: 12, color: '#9ca3af', textAlign: 'center' }}>No rules yet. Click "Add Rule".</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const inputStyle = { width: '100%', padding: 6, background: '#1f2937', color: '#e5e7eb', border: '1px solid #374151', borderRadius: 4, fontSize: 13 };
