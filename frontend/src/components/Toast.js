import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

function Toast({ message, type = 'success', onClose, duration = 3000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className={`toast ${type}`}>
      {type === 'success' ? (
        <CheckCircle size={20} color="var(--success)" />
      ) : (
        <AlertCircle size={20} color="var(--danger)" />
      )}
      <span>{message}</span>
      <button
        onClick={onClose}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', marginLeft: '0.5rem' }}
      >
        <X size={16} color="var(--text-muted)" />
      </button>
    </div>
  );
}

export default Toast;
