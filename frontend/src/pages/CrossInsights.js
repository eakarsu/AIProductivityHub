import React, { useState } from 'react';
import { Layers, Sparkles, TrendingUp, Target } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

function CrossInsights() {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getToken = () => localStorage.getItem('token');

  const generateInsights = async () => {
    setLoading(true); setError(''); setInsights(null);
    try {
      const res = await fetch(`${API_URL}/ai/cross-insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setInsights(data.insights);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const impactColor = (impact) => ({ high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--success)' }[impact] || 'var(--primary)');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title"><Layers size={28} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Cross-Tool Insights</h1>
          <p className="page-subtitle">AI synthesizes patterns across tasks, habits, screen time, and goals</p>
        </div>
        <button className="btn btn-primary" onClick={generateInsights} disabled={loading}>
          <Sparkles size={18} /> {loading ? 'Analyzing...' : 'Generate Insights'}
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {!insights && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Layers size={64} color="var(--text-muted)" style={{ marginBottom: '1.5rem' }} />
          <h3>Get cross-tool productivity insights</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            The AI analyzes patterns across all your tools — focus sessions, habits, bookmarks, and screen time —
            to give you unified recommendations you wouldn't see from any single tool.
          </p>
          <button className="btn btn-primary btn-lg" onClick={generateInsights} disabled={loading}>
            <Sparkles size={20} /> Analyze My Productivity
          </button>
        </div>
      )}

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p>Analyzing cross-tool patterns...</p>
        </div>
      )}

      {insights && typeof insights === 'object' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Score + Weekly Goal */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', alignItems: 'start' }}>
            <div className="card">
              <h3>Cross-Tool Pattern</h3>
              <p style={{ fontSize: '1.05rem', lineHeight: 1.6 }}>{insights.cross_tool_patterns}</p>
            </div>
            {insights.productivity_score && (
              <div className="card" style={{ textAlign: 'center', minWidth: '140px' }}>
                <div style={{ fontSize: '3rem', fontWeight: 700, color: insights.productivity_score >= 70 ? 'var(--success)' : insights.productivity_score >= 40 ? 'var(--warning)' : 'var(--danger)' }}>
                  {insights.productivity_score}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Productivity Score</div>
              </div>
            )}
          </div>

          {insights.key_observations?.length > 0 && (
            <div className="card">
              <h3>Key Observations</h3>
              {insights.key_observations.map((obs, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem', background: 'var(--dark)', borderRadius: '0.375rem', marginBottom: '0.5rem' }}>
                  <TrendingUp size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{obs}</span>
                </div>
              ))}
            </div>
          )}

          {insights.priority_recommendations?.length > 0 && (
            <div className="card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Target size={20} color="var(--primary)" /> Priority Recommendations
              </h3>
              {insights.priority_recommendations.map((rec, i) => (
                <div key={i} style={{ display: 'flex', gap: '1rem', padding: '0.75rem', background: 'var(--dark)', borderRadius: '0.375rem', marginBottom: '0.75rem', borderLeft: `3px solid ${impactColor(rec.impact)}` }}>
                  <div style={{ flexShrink: 0 }}>
                    <span className={`tag tag-${rec.impact === 'high' ? 'danger' : rec.impact === 'medium' ? 'warning' : 'success'}`} style={{ fontSize: '0.7rem' }}>{rec.impact?.toUpperCase()}</span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{rec.area}</div>
                    <div>{rec.action}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {insights.weekly_goal && (
            <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
              <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>This Week's Focus Goal</h4>
              <p style={{ fontSize: '1.05rem', margin: 0 }}>{insights.weekly_goal}</p>
            </div>
          )}
        </div>
      )}

      {insights && typeof insights !== 'object' && (
        <div className="card">
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{String(insights)}</pre>
        </div>
      )}
    </div>
  );
}

export default CrossInsights;
