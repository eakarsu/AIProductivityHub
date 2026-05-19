import React, { useState } from 'react';
import { Activity, Sparkles } from 'lucide-react';
import AIResponseDisplay from '../components/AIResponseDisplay';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

function UsageAnomalyDetect() {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState('');

  const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  const handleRun = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setResponse(null);
    try {
      const payload = { window_days: Number(days) || 30 };
      const res = await fetch(`${API_URL}/ai/usage-anomaly-detect`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Detection failed');
        return;
      }
      setResponse(data);
    } catch (err) {
      setError(err.message || 'Network error');
    }
    setLoading(false);
  };

  return (
    <div className="page-content">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Activity size={28} color="var(--warning)" />
        <div>
          <h1 className="page-title">Usage Anomaly Detector</h1>
          <p className="page-subtitle">
            Spot screen-time spikes/drops, night-creep and new apps with wellness recommendations
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginTop: '1rem' }}>
        <form
          onSubmit={handleRun}
          style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}
        >
          <div style={{ width: 200 }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                marginBottom: '0.5rem',
              }}
            >
              Window (days)
            </label>
            <input
              type="number"
              min="7"
              max="180"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text)',
              }}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Sparkles size={16} style={{ marginRight: 6 }} />
            {loading ? 'Analyzing...' : 'Detect Anomalies'}
          </button>
        </form>
        {error && (
          <div
            style={{
              marginTop: '1rem',
              padding: '0.75rem',
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              borderRadius: 6,
            }}
          >
            {error}
          </div>
        )}
      </div>

      {loading && (
        <div className="card" style={{ marginTop: '1rem', padding: '2rem', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p>AI is reviewing your usage data...</p>
        </div>
      )}

      {response && !loading && (
        <div style={{ marginTop: '1rem' }}>
          <AIResponseDisplay response={response} title="Usage Anomaly Report" />
        </div>
      )}
    </div>
  );
}

export default UsageAnomalyDetect;
