import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bookmark, FolderOpen, Shield, Smartphone, Timer, Sparkles, TrendingUp,
  AlertCircle, Download, Search, Bell, User, Settings, MessageCircle,
  FileText, ShieldCheck, HelpCircle, Keyboard, Upload, Globe
} from 'lucide-react';
import { getDashboardInsights, exportAllData } from '../services/api';
import AIResponseDisplay from '../components/AIResponseDisplay';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

function Dashboard({ user }) {
  const navigate = useNavigate();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { fetchInsights(); }, []);

  const fetchInsights = async () => {
    try {
      const response = await getDashboardInsights();
      setInsights(response.data);
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportAll = async () => {
    try {
      const response = await exportAllData();
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ai-productivity-hub-export.json';
      a.click();
      URL.revokeObjectURL(url);
      setToast({ message: 'Data exported successfully', type: 'success' });
    } catch (error) {
      setToast({ message: 'Export failed', type: 'error' });
    }
  };

  const features = [
    { id: 'bookmarks', title: 'Bookmark Organizer', description: 'Auto-categorize and organize your bookmarks with AI', icon: Bookmark, iconClass: 'bookmark', path: '/bookmarks', stat: insights?.stats?.bookmarks || 0, statLabel: 'Bookmarks', details: 'AI-powered bookmark categorization, smart summaries, tag suggestions, and CSV/JSON export.' },
    { id: 'files', title: 'File Organizer', description: 'Smart folder suggestions for your files', icon: FolderOpen, iconClass: 'file', path: '/file-organizer', stat: insights?.stats?.files || 0, statLabel: 'Files', details: 'Upload files, get AI folder suggestions, drag-and-drop organization, and bulk actions.' },
    { id: 'passwords', title: 'Password Auditor', description: 'Security recommendations for your passwords', icon: Shield, iconClass: 'password', path: '/password-auditor', stat: insights?.stats?.passwords?.count || 0, statLabel: 'Passwords', details: 'Password strength scoring, breach detection, 2FA tracking, and exportable security reports.' },
    { id: 'detox', title: 'Digital Detox Coach', description: 'Screen time management and insights', icon: Smartphone, iconClass: 'detox', path: '/digital-detox', stat: insights?.stats?.screenTime || 0, statLabel: 'Min Today', details: 'Track screen time by app, set daily limits, block distracting apps, and get AI wellness insights.' },
    { id: 'focus', title: 'Focus Timer', description: 'Pomodoro timer with distraction blocking', icon: Timer, iconClass: 'focus', path: '/focus-timer', stat: insights?.stats?.focusPomodoros || 0, statLabel: 'Pomodoros', details: 'Customizable focus sessions, AI-generated focus tips, productivity ratings, and streaks.' },
  ];

  const quickActions = [
    { icon: User, label: 'Profile', path: '/profile', color: 'var(--primary)' },
    { icon: Settings, label: 'Settings', path: '/settings', color: 'var(--text-muted)' },
    { icon: Bell, label: 'Notifications', path: '/notifications', color: 'var(--warning)' },
    { icon: MessageCircle, label: 'Feedback', path: '/feedback', color: 'var(--success)' },
    { icon: Download, label: 'Export Data', action: handleExportAll, color: 'var(--primary)' },
    { icon: HelpCircle, label: 'Contact', path: '/contact', color: 'var(--text-muted)' },
    { icon: Upload, label: 'Upload Files', path: '/file-organizer', color: 'var(--secondary)' },
    { icon: Keyboard, label: 'Shortcuts (?)', action: () => setToast({ message: 'Press ? to see keyboard shortcuts', type: 'success' }), color: 'var(--primary)' },
  ];

  const handleCardClick = (feature) => {
    setSelectedCard(feature);
  };

  const handleGoToFeature = (path) => {
    setSelectedCard(null);
    navigate(path);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back, {user?.name || 'User'}! Here's your AI Productivity Hub.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={handleExportAll}><Download size={18} />Export All</button>
          <button className="btn btn-primary" onClick={fetchInsights}><Sparkles size={18} />Refresh Insights</button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {quickActions.map((action, i) => (
            <button key={i} className="btn btn-secondary" onClick={() => action.action ? action.action() : navigate(action.path)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <action.icon size={16} color={action.color} />{action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feature Cards */}
      <div className="feature-grid">
        {features.map((feature) => (
          <div key={feature.id} className="card feature-card" onClick={() => handleCardClick(feature)} role="button" tabIndex={0} aria-label={`Open ${feature.title}`}
            onKeyDown={(e) => e.key === 'Enter' && handleCardClick(feature)}>
            <div className="card-header">
              <div className={`card-icon ${feature.iconClass}`}>
                <feature.icon size={24} color="white" />
              </div>
              <TrendingUp size={20} color="var(--success)" />
            </div>
            <h3 className="card-title">{feature.title}</h3>
            <p className="card-description">{feature.description}</p>
            <div className="card-stats">
              <div className="stat">
                <div className="stat-value">{feature.stat}</div>
                <div className="stat-label">{feature.statLabel}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Feature Detail Modal */}
      <Modal isOpen={!!selectedCard} onClose={() => setSelectedCard(null)} title={selectedCard?.title || ''} footer={
        <>
          <button className="btn btn-secondary" onClick={() => setSelectedCard(null)}>Close</button>
          <button className="btn btn-primary" onClick={() => handleGoToFeature(selectedCard?.path)}>
            Open {selectedCard?.title} <TrendingUp size={16} />
          </button>
        </>
      }>
        {selectedCard && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className={`card-icon ${selectedCard.iconClass}`}>
                <selectedCard.icon size={28} color="white" />
              </div>
              <div>
                <h3>{selectedCard.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{selectedCard.description}</p>
              </div>
            </div>
            <div className="detail-panel">
              <div className="detail-row">
                <span className="detail-label">Items</span>
                <span className="detail-value" style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '1.25rem' }}>{selectedCard.stat}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Details</span>
                <span className="detail-value">{selectedCard.details}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* AI Insights */}
      {loading ? (
        <div className="loading" style={{ marginTop: '2rem' }}><div className="spinner"></div></div>
      ) : insights?.aiInsights?.success && (
        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={24} color="var(--primary)" /> AI Insights
          </h2>
          <AIResponseDisplay response={insights.aiInsights} />
        </div>
      )}

      {!loading && insights?.aiInsights && !insights.aiInsights.success && (
        <div className="card" style={{ marginTop: '2rem', background: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--danger)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={24} color="var(--danger)" />
            <div>
              <h3 style={{ color: 'var(--danger)' }}>AI Service Unavailable</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Check your OpenRouter API key in the .env file</p>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default Dashboard;
