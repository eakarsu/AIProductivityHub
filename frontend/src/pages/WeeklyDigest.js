import React, { useState } from 'react';
import { BookOpen, Sparkles, TrendingUp, Award, AlertTriangle } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

function WeeklyDigest() {
  const [digest, setDigest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getToken = () => localStorage.getItem('token');

  const generateDigest = async () => {
    setLoading(true); setError(''); setDigest(null);
    try {
      const res = await fetch(`${API_URL}/ai/weekly-digest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate digest');
      setDigest(data.digest);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const scoreColor = (score) => {
    if (score >= 70) return 'var(--success)';
    if (score >= 40) return 'var(--warning)';
    return 'var(--danger)';
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title"><BookOpen size={28} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Weekly Digest</h1>
          <p className="page-subtitle">AI-generated summary of your week and priorities for next week</p>
        </div>
        <button className="btn btn-primary" onClick={generateDigest} disabled={loading}>
          <Sparkles size={18} /> {loading ? 'Generating...' : 'Generate This Week\'s Digest'}
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {!digest && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <BookOpen size={64} color="var(--text-muted)" style={{ marginBottom: '1.5rem' }} />
          <h3>Generate your weekly productivity digest</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Click the button above to analyze your week's focus sessions, habits, and screen time,
            then get personalized insights and priorities for next week.
          </p>
          <button className="btn btn-primary btn-lg" onClick={generateDigest} disabled={loading}>
            <Sparkles size={20} /> Generate Digest
          </button>
        </div>
      )}

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p>Analyzing your week and generating insights...</p>
        </div>
      )}

      {digest && typeof digest === 'object' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Summary + Score */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', alignItems: 'start' }}>
            <div className="card">
              <h3>Week Summary</h3>
              <p style={{ fontSize: '1.05rem', lineHeight: 1.6 }}>{digest.week_summary}</p>
              {digest.motivational_message && (
                <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--dark)', borderRadius: '0.5rem', borderLeft: '3px solid var(--primary)', fontStyle: 'italic', color: 'var(--primary-light)' }}>
                  "{digest.motivational_message}"
                </div>
              )}
            </div>
            {digest.productivity_score !== undefined && (
              <div className="card" style={{ textAlign: 'center', minWidth: '160px' }}>
                <div style={{ fontSize: '3.5rem', fontWeight: 700, color: scoreColor(digest.productivity_score) }}>
                  {digest.productivity_score}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Productivity Score</div>
              </div>
            )}
          </div>

          {/* Wins + Improve */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={20} color="var(--success)" /> This Week's Wins
              </h3>
              {digest.wins?.map((win, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--success)', flexShrink: 0 }}>✓</span>
                  <span>{win}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={20} color="var(--warning)" /> Areas to Improve
              </h3>
              {digest.areas_to_improve?.map((area, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--warning)', flexShrink: 0 }}>!</span>
                  <span>{area}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Next Week Priorities */}
          {digest.next_week_priorities?.length > 0 && (
            <div className="card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={20} color="var(--primary)" /> Next Week's Priorities
              </h3>
              {digest.next_week_priorities.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: '1rem', padding: '0.75rem', background: 'var(--dark)', borderRadius: '0.5rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: '28px', height: '28px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, flexShrink: 0 }}>
                    {p.priority}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500 }}>{p.task}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.reasoning}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Habit + Focus Insights */}
          {(digest.habit_insights || digest.focus_insights) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {digest.habit_insights && (
                <div className="card">
                  <h4>Habit Insights</h4>
                  <p style={{ color: 'var(--text-muted)' }}>{digest.habit_insights}</p>
                </div>
              )}
              {digest.focus_insights && (
                <div className="card">
                  <h4>Focus Insights</h4>
                  <p style={{ color: 'var(--text-muted)' }}>{digest.focus_insights}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {digest && typeof digest !== 'object' && (
        <div className="card">
          <h3>AI Analysis</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{String(digest)}</pre>
        </div>
      )}
    </div>
  );
}

export default WeeklyDigest;
