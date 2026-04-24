import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const getPages = () => {
    const pages = [];
    const delta = 2;
    const start = Math.max(1, page - delta);
    const end = Math.min(totalPages, page + delta);

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('...');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.25rem', padding: '1rem' }} role="navigation" aria-label="Pagination">
      <button className="btn btn-secondary btn-icon" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
        <ChevronLeft size={18} />
      </button>
      {getPages().map((p, i) => (
        p === '...' ? (
          <span key={`dots-${i}`} style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>...</span>
        ) : (
          <button key={p} className={`btn ${p === page ? 'btn-primary' : 'btn-secondary'} btn-icon`}
            onClick={() => onPageChange(p)} aria-label={`Page ${p}`} aria-current={p === page ? 'page' : undefined}
            style={{ minWidth: 36, height: 36 }}>
            {p}
          </button>
        )
      ))}
      <button className="btn btn-secondary btn-icon" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

export default Pagination;
