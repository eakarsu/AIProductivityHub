import React, { useState } from 'react';
import { Zap, Sparkles } from 'lucide-react';
import AIResponseDisplay from '../components/AIResponseDisplay';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

function FocusBoostRecommend() {
  const [currentTask, setCurrentTask] = useState('');
  const [energy, setEnergy] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('');
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
      const payload = {};
      if (currentTask.trim()) payload.current_task = currentTask.trim();
      if (energy.trim()) payload.energy_level = Number(energy) || energy;
      if (timeOfDay.trim()) payload.time_of_day = timeOfDay.trim();
      const res = await fetch(`${API_URL}/ai/focus-boost-recommend`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 503) {
          setError(data.error || 'AI provider not configured (503).');
        } else {
          setError(data.error || 'Recommendation failed');
        }
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
        <Zap size={28} color="var(--primary)" />
        <div>
          <h1 className="page-title">Focus Boost Recommender</h1>
          <p className="page-subtitle">
            Get 3 immediate, evidence-backed interventions to boost focus right now
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginTop: '1rem' }}>
        <form
          onSubmit={handleRun}
          style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}
        >
          <div style={{ flex: '1 1 300px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                marginBottom: '0.5rem',
              }}
            >
              Current task (optional)
            </label>
            <input
              type="text"
              value={currentTask}
              onChange={(e) => setCurrentTask(e.target.value)}
              placeholder="e.g., Write Q3 report"
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
          <div style={{ width: 160 }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                marginBottom: '0.5rem',
              }}
            >
              Energy (1-10)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={energy}
              onChange={(e) => setEnergy(e.target.value)}
              placeholder="e.g., 6"
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
          <div style={{ width: 200 }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                marginBottom: '0.5rem',
              }}
            >
              Time of day
            </label>
            <select
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.8rem',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text)',
              }}
            >
              <option value="">— select —</option>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
              <option value="late-night">Late night</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Sparkles size={16} style={{ marginRight: 6 }} />
            {loading ? 'Computing...' : 'Get Boosts'}
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
          <p>AI is computing focus boosts...</p>
        </div>
      )}

      {response && !loading && (
        <div style={{ marginTop: '1rem' }}>
          <AIResponseDisplay response={response} title="Focus Boost Recommendations" />
        </div>
      )}
    </div>
  );
}

export default FocusBoostRecommend;
