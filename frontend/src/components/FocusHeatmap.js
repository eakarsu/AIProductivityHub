import React, { useState } from 'react';

// VIZ: 7x24 heatmap of focus/distraction. Pure inline SVG.
export default function FocusHeatmap({ data }) {
  const [mode, setMode] = useState('focus');
  if (!data || !data.grid) return <div style={{ color: '#9ca3af' }}>No data</div>;

  const cell = 22;
  const padL = 60, padT = 30;
  const W = padL + 24 * cell + 20;
  const H = padT + 7 * cell + 30;

  const color = (v) => {
    // v 0..1 → focus: green ramp, distraction: red ramp
    const c = Math.round(v * 255);
    return mode === 'focus' ? `rgb(${255 - c}, ${c + 30 > 255 ? 255 : c + 30}, ${100})` : `rgb(${c + 50 > 255 ? 255 : c + 50}, ${80}, ${80})`;
  };

  return (
    <div data-testid="focus-heatmap" style={{ background: '#0f172a', padding: 16, borderRadius: 8, border: '1px solid #1f2937' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ color: '#e5e7eb', margin: 0 }}>Focus / Distraction Heatmap</h3>
        <div>
          <button onClick={() => setMode('focus')} style={{ background: mode === 'focus' ? '#10b981' : '#1f2937', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, marginRight: 6, cursor: 'pointer' }}>Focus</button>
          <button onClick={() => setMode('distraction')} style={{ background: mode === 'distraction' ? '#ef4444' : '#1f2937', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer' }}>Distraction</button>
        </div>
      </div>
      <svg width={W} height={H} role="img" aria-label="Focus heatmap">
        {/* hour labels */}
        {data.hours.map((h) => (
          <text key={'h' + h} x={padL + h * cell + cell / 2} y={padT - 8} fontSize="9" fill="#9ca3af" textAnchor="middle">{h}</text>
        ))}
        {/* day labels */}
        {data.dayLabels.map((d, di) => (
          <text key={'d' + d} x={padL - 8} y={padT + di * cell + cell / 2 + 4} fontSize="11" fill="#9ca3af" textAnchor="end">{d}</text>
        ))}
        {/* cells */}
        {data.grid.map((g, i) => {
          const v = mode === 'focus' ? g.focus : g.distraction;
          return (
            <rect key={i} x={padL + g.hour * cell + 1} y={padT + g.dayIndex * cell + 1} width={cell - 2} height={cell - 2} fill={color(v)} rx="3">
              <title>{`${g.day} ${g.hour}:00 — focus ${g.focus} / distraction ${g.distraction}`}</title>
            </rect>
          );
        })}
      </svg>
      <div style={{ marginTop: 8, color: '#9ca3af', fontSize: 12 }}>
        Peak focus: <strong style={{ color: '#10b981' }}>{data.peak.day} {data.peak.hour}:00</strong> ({data.peak.focus})
      </div>
    </div>
  );
}
