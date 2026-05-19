import React, { useEffect, useState } from 'react';
import TimeTrackingChart from '../components/TimeTrackingChart';
import FocusHeatmap from '../components/FocusHeatmap';
import WeeklyPdfDownload from '../components/WeeklyPdfDownload';
import AutomationRulesEditor from '../components/AutomationRulesEditor';

export default function CustomViewsPage() {
  const [timeData, setTimeData] = useState(null);
  const [heatmapData, setHeatmapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const token = (typeof localStorage !== 'undefined' && localStorage.getItem('token')) || '';
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [tRes, hRes] = await Promise.all([
          fetch('/api/custom-views/time-tracking', { headers }),
          fetch('/api/custom-views/focus-heatmap', { headers }),
        ]);
        if (!tRes.ok) throw new Error(`time-tracking failed (${tRes.status})`);
        if (!hRes.ok) throw new Error(`focus-heatmap failed (${hRes.status})`);
        const tData = await tRes.json();
        const hData = await hRes.json();
        if (!cancelled) {
          setTimeData(tData);
          setHeatmapData(hData);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div data-testid="custom-views-page" style={{ padding: 24, color: '#e5e7eb' }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Productivity Views</h1>
      <p style={{ color: '#9ca3af', marginBottom: 18 }}>
        Custom views for time tracking, focus patterns, weekly PDF reports, and workflow automation rules.
      </p>
      {error && <div style={{ background: '#7f1d1d', color: '#fecaca', padding: 10, borderRadius: 6, marginBottom: 12 }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 18 }}>
        <section data-testid="section-time-tracking">
          {loading ? <div style={{ color: '#9ca3af' }}>Loading time tracking…</div> : <TimeTrackingChart data={timeData} />}
        </section>
        <section data-testid="section-focus-heatmap">
          {loading ? <div style={{ color: '#9ca3af' }}>Loading heatmap…</div> : <FocusHeatmap data={heatmapData} />}
        </section>
        <section data-testid="section-weekly-pdf">
          <WeeklyPdfDownload />
        </section>
        <section data-testid="section-automation-rules">
          <AutomationRulesEditor />
        </section>
      </div>
    </div>
  );
}
