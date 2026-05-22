import React from 'react';

// VIZ: Stacked bar chart of minutes per category per day (last 7 days). Pure inline SVG.
export default function TimeTrackingChart({ data }) {
  if (!data || !data.days) return <div style={{ color: '#9ca3af' }}>No data</div>;

  const palette = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#a78bfa', '#ef4444'];
  const cats = data.categories;
  const days = data.days;
  const maxTotal = Math.max(...days.map((d) => d.totalMinutes), 60);

  const W = 720, H = 320, padL = 50, padB = 40, padT = 20, padR = 20;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const barW = (innerW / days.length) * 0.65;
  const slotW = innerW / days.length;

  return (
    <div data-testid="time-tracking-chart" style={{ background: '#0f172a', padding: 16, borderRadius: 8, border: '1px solid #1f2937' }}>
      <h3 style={{ color: '#e5e7eb', margin: '0 0 12px 0' }}>Time Tracking — Last 7 Days (minutes)</h3>
      <svg width={W} height={H} role="img" aria-label="Time tracking stacked bar chart">
        {/* Y grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const y = padT + innerH * (1 - t);
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#1f2937" strokeWidth="1" />
              <text x={padL - 8} y={y + 4} fontSize="10" fill="#9ca3af" textAnchor="end">{Math.round(maxTotal * t)}</text>
            </g>
          );
        })}
        {/* Bars */}
        {days.map((d, di) => {
          let yCursor = padT + innerH;
          const x = padL + di * slotW + (slotW - barW) / 2;
          return (
            <g key={d.date}>
              {cats.map((cat, ci) => {
                const v = d.byCategory[cat];
                const h = (v / maxTotal) * innerH;
                yCursor -= h;
                return <rect key={cat} x={x} y={yCursor} width={barW} height={h} fill={palette[ci % palette.length]}>
                  <title>{`${d.date} ${cat}: ${v}m`}</title>
                </rect>;
              })}
              <text x={x + barW / 2} y={H - padB + 14} fontSize="10" fill="#9ca3af" textAnchor="middle">{d.date.slice(5)}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
        {cats.map((c, i) => (
          <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#d1d5db', fontSize: 12 }}>
            <span style={{ width: 12, height: 12, background: palette[i % palette.length], borderRadius: 2, display: 'inline-block' }} />
            {c} ({data.totals[c]}m)
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, color: '#9ca3af', fontSize: 12 }}>Total: {data.totalMinutes} minutes across {days.length} days.</div>
    </div>
  );
}
