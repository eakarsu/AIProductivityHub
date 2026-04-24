import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, Activity, MessageCircle, FileText, Eye, Trash2, Edit2 } from 'lucide-react';
import { getAdminStats, getAdminUsers, getAuditLogs, getAdminFeedback, updateFeedbackStatus } from '../services/api';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

function AdminPanel() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [toast, setToast] = useState(null);
  const [userPage, setUserPage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);

  useEffect(() => { fetchData(); }, [activeTab, userPage, logPage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview' || !stats) {
        const s = await getAdminStats();
        setStats(s.data);
      }
      if (activeTab === 'users') {
        const u = await getAdminUsers({ page: userPage, limit: 10 });
        setUsers(u.data.users);
        setUserTotalPages(u.data.totalPages);
      }
      if (activeTab === 'audit') {
        const a = await getAuditLogs({ page: logPage, limit: 20 });
        setAuditLogs(a.data.logs);
        setLogTotalPages(a.data.totalPages);
      }
      if (activeTab === 'feedback') {
        const f = await getAdminFeedback();
        setFeedback(f.data);
      }
    } catch (error) {
      console.error('Admin error:', error);
      setToast({ message: 'Admin access required', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = (item, type) => {
    setSelectedItem(item);
    setSelectedType(type);
  };

  const handleUpdateFeedback = async (id, status) => {
    try {
      await updateFeedbackStatus(id, { status });
      fetchData();
      setToast({ message: 'Feedback status updated', type: 'success' });
    } catch (error) {
      setToast({ message: 'Failed to update', type: 'error' });
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
    { id: 'feedback', label: 'Feedback', icon: MessageCircle }
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title"><ShieldCheck size={28} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Admin Panel</h1>
          <p className="page-subtitle">System administration and monitoring</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {tabs.map(tab => (
          <button key={tab.id} className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab(tab.id)}>
            <tab.icon size={18} />{tab.label}
          </button>
        ))}
      </div>

      {loading ? <div className="loading"><div className="spinner"></div></div> : (
        <>
          {/* Overview */}
          {activeTab === 'overview' && stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              {[
                { label: 'Total Users', value: stats.total_users, color: 'var(--primary)' },
                { label: 'Active (24h)', value: stats.active_users_24h, color: 'var(--success)' },
                { label: 'Bookmarks', value: stats.total_bookmarks, color: 'var(--primary)' },
                { label: 'Files', value: stats.total_files, color: 'var(--secondary)' },
                { label: 'Passwords', value: stats.total_passwords, color: 'var(--warning)' },
                { label: 'Focus Sessions', value: stats.total_sessions, color: 'var(--primary)' },
                { label: 'Pending Feedback', value: stats.pending_feedback, color: 'var(--warning)' },
                { label: 'New Messages', value: stats.new_messages, color: 'var(--danger)' },
                { label: 'Actions (24h)', value: stats.actions_24h, color: 'var(--text-muted)' }
              ].map((s, i) => (
                <div key={i} className="card" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Users */}
          {activeTab === 'users' && (
            <div className="card">
              <div className="table-container">
                <table>
                  <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Verified</th><th>Admin</th><th>Last Login</th><th>Joined</th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} onClick={() => handleRowClick(u, 'user')}>
                        <td>{u.id}</td>
                        <td style={{ fontWeight: 500 }}>{u.name}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                        <td><span className={`tag ${u.email_verified ? 'tag-success' : 'tag-warning'}`}>{u.email_verified ? 'Yes' : 'No'}</span></td>
                        <td>{u.is_admin ? <span className="tag tag-primary">Admin</span> : '-'}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {userTotalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '1rem' }}>
                  <button className="btn btn-secondary" disabled={userPage <= 1} onClick={() => setUserPage(p => p - 1)}>Previous</button>
                  <span style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Page {userPage} of {userTotalPages}</span>
                  <button className="btn btn-secondary" disabled={userPage >= userTotalPages} onClick={() => setUserPage(p => p + 1)}>Next</button>
                </div>
              )}
            </div>
          )}

          {/* Audit Logs */}
          {activeTab === 'audit' && (
            <div className="card">
              <div className="table-container">
                <table>
                  <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>IP</th></tr></thead>
                  <tbody>
                    {auditLogs.map(log => (
                      <tr key={log.id} onClick={() => handleRowClick(log, 'audit')}>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(log.created_at).toLocaleString()}</td>
                        <td style={{ fontWeight: 500 }}>{log.user_name || log.user_email || 'System'}</td>
                        <td><span className="tag tag-primary">{log.action}</span></td>
                        <td style={{ color: 'var(--text-muted)' }}>{log.entity_type} {log.entity_id ? `#${log.entity_id}` : ''}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{log.ip_address}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {logTotalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '1rem' }}>
                  <button className="btn btn-secondary" disabled={logPage <= 1} onClick={() => setLogPage(p => p - 1)}>Previous</button>
                  <span style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Page {logPage} of {logTotalPages}</span>
                  <button className="btn btn-secondary" disabled={logPage >= logTotalPages} onClick={() => setLogPage(p => p + 1)}>Next</button>
                </div>
              )}
            </div>
          )}

          {/* Feedback */}
          {activeTab === 'feedback' && (
            <div className="card">
              <div className="table-container">
                <table>
                  <thead><tr><th>Type</th><th>Subject</th><th>User</th><th>Rating</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>
                    {feedback.map(fb => (
                      <tr key={fb.id} onClick={() => handleRowClick(fb, 'feedback')}>
                        <td><span className="tag tag-primary">{fb.type}</span></td>
                        <td style={{ fontWeight: 500 }}>{fb.subject}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{fb.user_name || fb.user_email}</td>
                        <td>{fb.rating}/5</td>
                        <td><span className={`tag ${fb.status === 'pending' ? 'tag-warning' : 'tag-success'}`}>{fb.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem' }} onClick={(e) => e.stopPropagation()}>
                            <button className="btn btn-icon btn-secondary" onClick={() => handleUpdateFeedback(fb.id, 'reviewed')} title="Mark reviewed"><Eye size={14} /></button>
                            <button className="btn btn-icon btn-secondary" onClick={() => handleUpdateFeedback(fb.id, 'in_progress')} title="In progress"><Edit2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      <Modal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} title={`${selectedType === 'user' ? 'User' : selectedType === 'audit' ? 'Audit Log' : 'Feedback'} Details`}
        footer={<button className="btn btn-secondary" onClick={() => setSelectedItem(null)}>Close</button>}>
        {selectedItem && (
          <div className="detail-panel">
            {Object.entries(selectedItem).filter(([k]) => !['password', 'password_hash'].includes(k)).map(([key, val]) => (
              <div className="detail-row" key={key}>
                <span className="detail-label">{key.replace(/_/g, ' ')}</span>
                <span className="detail-value">{typeof val === 'boolean' ? (val ? 'Yes' : 'No') : val !== null ? String(val) : '-'}</span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default AdminPanel;
