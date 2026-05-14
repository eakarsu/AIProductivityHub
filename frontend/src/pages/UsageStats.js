import React, { useState, useEffect } from 'react';
import { BarChart2, Zap, DollarSign, Activity } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

function UsageStats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const getToken = () => localStorage.getItem('token');

  const fetchStats = async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/usage/stats?page=${p}&limit=20`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load stats');
      setData(json);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  useEffect(() => { fetchStats(page); }, [page]);

  if (loading && !data) return (
    <div>
      <div className="page-header"><h1 className="page-title"><BarChart2 size={28} /> AI Usage Stats</h1></div>
      <div className="loading"><div className="spinner" /></div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title"><BarChart2 size={28} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />AI Usage Stats</h1>
          <p className="page-subtitle">Daily and weekly AI token consumption and cost estimates</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {data && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <Activity size={24} color="var(--primary)" style={{ marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>{data.summary?.weekly_calls || 0}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>AI Calls (7d)</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <Zap size={24} color="var(--warning)" style={{ marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)' }}>{parseInt(data.summary?.weekly_tokens || 0).toLocaleString()}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Tokens (7d)</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <DollarSign size={24} color="var(--success)" style={{ marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>${parseFloat(data.summary?.weekly_cost || 0).toFixed(4)}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Est. Cost (7d)</div>
            </div>
          </div>

          {data.daily_breakdown?.length > 0 && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3>Daily Breakdown (Last 7 Days)</h3>
              <div className="table-container">
                <table>
                  <thead><tr><th>Date</th><th>AI Calls</th><th>Tokens Used</th><th>Est. Cost</th></tr></thead>
                  <tbody>
                    {data.daily_breakdown.map((d, i) => (
                      <tr key={i}>
                        <td>{new Date(d.date).toLocaleDateString()}</td>
                        <td>{d.calls}</td>
                        <td>{parseInt(d.tokens || 0).toLocaleString()}</td>
                        <td>${parseFloat(d.cost || 0).toFixed(6)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data.by_endpoint?.length > 0 && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h3>Usage by Feature</h3>
              <div className="table-container">
                <table>
                  <thead><tr><th>Endpoint / Feature</th><th>Calls</th><th>Tokens</th><th>Cost</th></tr></thead>
                  <tbody>
                    {data.by_endpoint.map((row, i) => (
                      <tr key={i}>
                        <td><code style={{ fontSize: '0.8rem' }}>{row.endpoint}</code></td>
                        <td>{row.calls}</td>
                        <td>{parseInt(row.tokens || 0).toLocaleString()}</td>
                        <td>${parseFloat(row.cost || 0).toFixed(6)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data.data?.length > 0 && (
            <div className="card">
              <h3>Recent AI Calls</h3>
              <div className="table-container">
                <table>
                  <thead><tr><th>Endpoint</th><th>Tokens</th><th>Cost</th><th>When</th></tr></thead>
                  <tbody>
                    {data.data.map((row, i) => (
                      <tr key={i}>
                        <td><code style={{ fontSize: '0.8rem' }}>{row.endpoint}</code></td>
                        <td>{row.tokens_used || 0}</td>
                        <td>${parseFloat(row.cost_estimate || 0).toFixed(6)}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(row.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.pagination?.totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                  <button className="btn btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                  <span style={{ padding: '0.5rem' }}>Page {page} of {data.pagination.totalPages}</span>
                  <button className="btn btn-secondary" disabled={page >= data.pagination.totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default UsageStats;
