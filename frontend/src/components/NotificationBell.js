import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, AlertCircle, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markNotificationRead } from '../services/api';

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await getNotifications({ limit: 5, unread: 'true' });
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (error) {}
  };

  const handleRead = async (id) => {
    await markNotificationRead(id);
    fetchNotifications();
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle size={16} color="var(--success)" />;
      case 'warning': return <AlertTriangle size={16} color="var(--warning)" />;
      case 'error': return <AlertCircle size={16} color="var(--danger)" />;
      default: return <Info size={16} color="var(--primary)" />;
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setIsOpen(!isOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem', position: 'relative' }}>
        <Bell size={22} color="var(--text)" />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: '50%',
            background: 'var(--danger)', color: 'white', fontSize: '0.65rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, width: 360, background: 'var(--card-bg)',
          border: '1px solid var(--border)', borderRadius: '0.75rem', boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
          zIndex: 100, overflow: 'hidden'
        }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Notifications</strong>
            <button onClick={() => { setIsOpen(false); navigate('/notifications'); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem' }}>
              View All
            </button>
          </div>

          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No new notifications</div>
            ) : (
              notifications.map(n => (
                <div key={n.id} style={{ display: 'flex', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', background: 'rgba(99, 102, 241, 0.03)' }}>
                  {getIcon(n.type)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.125rem' }}>{n.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.message}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                  <button onClick={() => handleRead(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }} title="Mark read">
                    <Check size={14} color="var(--text-muted)" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
