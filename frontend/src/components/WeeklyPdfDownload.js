import React, { useState } from 'react';

// NON-VIZ: Download / preview weekly productivity PDF.
export default function WeeklyPdfDownload() {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  const fetchPdf = async () => {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const token = (typeof localStorage !== 'undefined' && localStorage.getItem('token')) || '';
      const res = await fetch('/api/custom-views/weekly-pdf', {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setInfo({ size: blob.size, type: blob.type, fetchedAt: new Date().toISOString() });
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="weekly-pdf-download" style={{ background: '#0f172a', padding: 16, borderRadius: 8, border: '1px solid #1f2937' }}>
      <h3 style={{ color: '#e5e7eb', margin: '0 0 8px 0' }}>Weekly Productivity Report (PDF)</h3>
      <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 12 }}>
        Generate a one-page PDF summarizing your focus hours, meeting load, distraction share, habits, and goal progress for the past week.
      </p>
      <button
        onClick={fetchPdf}
        disabled={loading}
        style={{ background: '#6366f1', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontWeight: 600 }}
      >
        {loading ? 'Generating…' : 'Generate Weekly PDF'}
      </button>
      {previewUrl && (
        <a href={previewUrl} download={`weekly-productivity-${new Date().toISOString().slice(0, 10)}.pdf`} style={{ marginLeft: 10, color: '#10b981', textDecoration: 'underline' }}>
          Download
        </a>
      )}
      {info && (
        <div style={{ marginTop: 10, color: '#9ca3af', fontSize: 12 }}>Generated PDF: {info.size} bytes ({info.type}).</div>
      )}
      {error && <div style={{ marginTop: 10, background: '#7f1d1d', color: '#fecaca', padding: 10, borderRadius: 6 }}>{error}</div>}
      {previewUrl && (
        <iframe title="weekly-pdf-preview" src={previewUrl} style={{ width: '100%', height: 380, marginTop: 12, border: '1px solid #1f2937', borderRadius: 6, background: '#fff' }} />
      )}
    </div>
  );
}
