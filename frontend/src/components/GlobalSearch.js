import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Bookmark, FolderOpen, Shield, Smartphone, Timer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { globalSearch } from '../services/api';

function GlobalSearch({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      setQuery('');
      setResults(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        performSearch();
      } else {
        setResults(null);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const response = await globalSearch(query);
      setResults(response.data);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (type, item) => {
    onClose();
    switch (type) {
      case 'bookmarks': navigate('/bookmarks'); break;
      case 'files': navigate('/file-organizer'); break;
      case 'passwords': navigate('/password-auditor'); break;
      case 'screen_time': navigate('/digital-detox'); break;
      case 'focus_sessions': navigate('/focus-timer'); break;
      default: break;
    }
  };

  const icons = {
    bookmarks: { icon: Bookmark, color: '#6366f1' },
    files: { icon: FolderOpen, color: '#10b981' },
    passwords: { icon: Shield, color: '#f59e0b' },
    screen_time: { icon: Smartphone, color: '#ec4899' },
    focus_sessions: { icon: Timer, color: '#3b82f6' }
  };

  const getItemTitle = (type, item) => {
    switch (type) {
      case 'bookmarks': return item.title;
      case 'files': return item.filename;
      case 'passwords': return item.site_name;
      case 'screen_time': return item.app_name;
      case 'focus_sessions': return item.session_name;
      default: return '';
    }
  };

  const getItemSubtitle = (type, item) => {
    switch (type) {
      case 'bookmarks': return item.url;
      case 'files': return `${item.filepath} (${item.extension})`;
      case 'passwords': return item.username;
      case 'screen_time': return item.category;
      case 'focus_sessions': return item.status;
      default: return '';
    }
  };

  if (!isOpen) return null;

  const totalResults = results ? Object.values(results).reduce((sum, arr) => sum + arr.length, 0) : 0;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ alignItems: 'flex-start', paddingTop: '10vh' }}>
      <div style={{ width: '100%', maxWidth: 600, background: 'var(--card-bg)', borderRadius: '1rem', border: '1px solid var(--border)', overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <Search size={20} color="var(--text-muted)" />
          <input ref={inputRef} type="text" placeholder="Search bookmarks, files, passwords..." value={query} onChange={(e) => setQuery(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text)', fontSize: '1rem', outline: 'none' }} />
          <kbd style={{ padding: '0.125rem 0.5rem', background: 'var(--dark)', borderRadius: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>ESC</kbd>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}>
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>

        <div style={{ maxHeight: 400, overflowY: 'auto', padding: '0.5rem' }}>
          {loading && <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Searching...</div>}

          {!loading && query.length >= 2 && totalResults === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No results found for "{query}"</div>
          )}

          {!loading && results && Object.entries(results).map(([type, items]) => {
            if (items.length === 0) return null;
            const { icon: Icon, color } = icons[type] || {};
            return (
              <div key={type}>
                <div style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {type.replace(/_/g, ' ')} ({items.length})
                </div>
                {items.map((item) => (
                  <div key={`${type}-${item.id}`} onClick={() => handleSelect(type, item)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--dark-lighter)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    {Icon && <Icon size={18} color={color} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getItemTitle(type, item)}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getItemSubtitle(type, item)}</div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          {!loading && query.length < 2 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Search size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} /><br />
              Type at least 2 characters to search
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GlobalSearch;
