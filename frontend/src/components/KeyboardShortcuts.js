import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Keyboard, X } from 'lucide-react';

function KeyboardShortcuts({ onToggleSearch }) {
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

      // Cmd/Ctrl + K = Open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onToggleSearch?.();
        return;
      }

      // Escape = Close modals (handled by individual components)
      if (e.key === 'Escape') {
        setShowHelp(false);
        return;
      }

      // ? = Show shortcuts help
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        setShowHelp(true);
        return;
      }

      // g then... (navigation shortcuts)
      if (e.key === 'g') return; // First key of combo

      // Alt + number shortcuts
      if (e.altKey) {
        switch (e.key) {
          case '1': e.preventDefault(); navigate('/'); break;
          case '2': e.preventDefault(); navigate('/bookmarks'); break;
          case '3': e.preventDefault(); navigate('/file-organizer'); break;
          case '4': e.preventDefault(); navigate('/password-auditor'); break;
          case '5': e.preventDefault(); navigate('/digital-detox'); break;
          case '6': e.preventDefault(); navigate('/focus-timer'); break;
          case '7': e.preventDefault(); navigate('/profile'); break;
          case '8': e.preventDefault(); navigate('/settings'); break;
          case '9': e.preventDefault(); navigate('/notifications'); break;
          default: break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, onToggleSearch]);

  const shortcuts = [
    { keys: ['Ctrl/Cmd', 'K'], description: 'Open global search' },
    { keys: ['?'], description: 'Show keyboard shortcuts' },
    { keys: ['Esc'], description: 'Close modals / search' },
    { keys: ['Alt', '1'], description: 'Go to Dashboard' },
    { keys: ['Alt', '2'], description: 'Go to Bookmarks' },
    { keys: ['Alt', '3'], description: 'Go to File Organizer' },
    { keys: ['Alt', '4'], description: 'Go to Password Auditor' },
    { keys: ['Alt', '5'], description: 'Go to Digital Detox' },
    { keys: ['Alt', '6'], description: 'Go to Focus Timer' },
    { keys: ['Alt', '7'], description: 'Go to Profile' },
    { keys: ['Alt', '8'], description: 'Go to Settings' },
    { keys: ['Alt', '9'], description: 'Go to Notifications' }
  ];

  if (!showHelp) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowHelp(false)}>
      <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Keyboard size={24} /> Keyboard Shortcuts
          </h2>
          <button className="modal-close" onClick={() => setShowHelp(false)}><X size={24} /></button>
        </div>
        <div className="modal-body">
          {shortcuts.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: i < shortcuts.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{s.description}</span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {s.keys.map((key, j) => (
                  <React.Fragment key={j}>
                    <kbd style={{ padding: '0.25rem 0.5rem', background: 'var(--dark)', border: '1px solid var(--border)', borderRadius: '0.25rem', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                      {key}
                    </kbd>
                    {j < s.keys.length - 1 && <span style={{ color: 'var(--text-muted)', padding: '0 0.125rem' }}>+</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default KeyboardShortcuts;
