import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, AlertCircle, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { getNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification } from '../services/api';
import Toast from '../components/Toast';

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState(null);

  useEffect(() => { fetchNotifications(); }, [page, filter]);

  const fetchNotifications = async () => {
    try {
      const params = { page, limit: 10 };
      if (filter === 'unread') params.unread = 'true';
      const response = await getNotifications(params);
      setNotifications(response.data.notifications);
      setTotal(response.data.total);
      setUnreadCount(response.data.unreadCount);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id) => {
    await markNotificationRead(id);
    fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    fetchNotifications();
    setToast({ message: 'All notifications marked as read', type: 'success' });
  };

  const handleDelete = async (id) => {
    await deleteNotification(id);
    fetchNotifications();
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle size={20} color="var(--success)" />;
      case 'warning': return <AlertTriangle size={20} color="var(--warning)" />;
      case 'error': return <AlertCircle size={20} color="var(--danger)" />;
      default: return <Info size={20} color="var(--primary)" />;
    }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title"><Bell size={28} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Notifications</h1>
          <p className="page-subtitle">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select className="form-input" style={{ width: 120 }} value={filter} onChange={(e) => { setFilter(e.target.value); setPage(1); }}>
            <option value="all">All</option>
            <option value="unread">Unread</option>
          </select>
          <button className="btn btn-primary" onClick={handleMarkAllRead}>
            <CheckCheck size={18} /> Mark All Read
          </button>
        </div>
      </div>

      <div className="card">
        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <Bell size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>No notifications</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem',
              borderBottom: '1px solid var(--border)', cursor: 'pointer',
              background: n.is_read ? 'transparent' : 'rgba(99, 102, 241, 0.05)',
              borderLeft: n.is_read ? 'none' : '3px solid var(--primary)'
            }} onClick={() => !n.is_read && handleMarkRead(n.id)}>
              {getIcon(n.type)}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: n.is_read ? 400 : 600, marginBottom: '0.25rem' }}>{n.title}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{n.message}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span>{new Date(n.created_at).toLocaleString()}</span>
                  {n.category && <span className="tag tag-primary">{n.category}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {!n.is_read && (
                  <button className="btn btn-icon btn-secondary" onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }} title="Mark as read">
                    <Check size={16} />
                  </button>
                )}
                <button className="btn btn-icon btn-secondary" onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }} title="Delete">
                  <Trash2 size={16} color="var(--danger)" />
                </button>
              </div>
            </div>
          ))
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '1rem' }}>
            <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
            <span style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
            <button className="btn btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        )}
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default Notifications;
