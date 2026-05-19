import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Bookmark, FolderOpen, Shield, Smartphone, Timer,
  LogOut, Sparkles, User, Settings, Bell, MessageCircle, ShieldCheck,
  Search, FileText, MessageSquare, Target, Flag, BookOpen, BarChart2, Layers, TrendingUp, Activity, Zap, Eye
} from 'lucide-react';
import NotificationBell from './NotificationBell';

function Sidebar({ user, setUser, onToggleSearch }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (_) {}
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    setUser(null);
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/bookmarks', icon: Bookmark, label: 'Bookmarks' },
    { path: '/file-organizer', icon: FolderOpen, label: 'File Organizer' },
    { path: '/password-auditor', icon: Shield, label: 'Password Auditor' },
    { path: '/digital-detox', icon: Smartphone, label: 'Digital Detox' },
    { path: '/focus-timer', icon: Timer, label: 'Focus Timer' },
    { path: '/habits', icon: Target, label: 'Habits', isNew: true },
    { path: '/goals', icon: Flag, label: 'Goals', isNew: true },
    { path: '/custom-views', icon: Eye, label: 'Productivity Views', isNew: true },
  // === Batch 06 Gaps & Frontend Mounts ===
  { path: '/cf-agentic-goal-orchestration', label: 'Agentic goal orchestration', icon: '✨' },
  { path: '/cf-distraction-detector', label: 'Distraction detector', icon: '✨' },
  { path: '/cf-digital-wellbeing-coach', label: 'Digital wellbeing coach', icon: '✨' },
  { path: '/cf-weekly-autopilot', label: 'Weekly autopilot', icon: '✨' },
  { path: '/cf-cross-tool-optimization', label: 'Cross-tool optimization', icon: '✨' },
  { path: '/gap-goals-without-goal', label: 'Goals without `/goal', icon: '✨' },
  { path: '/gap-habits-without-habit', label: 'Habits without `/habit', icon: '✨' },
  { path: '/gap-focus-without-focus', label: 'Focus without `/focus', icon: '✨' },
  { path: '/gap-usage-without-usage', label: 'Usage without `/usage', icon: '✨' },
  { path: '/gap-limited-calendar-integration-no-native-task-schedu', label: 'Limited calendar integration (no native task scheduling sync)', icon: '✨' },
  { path: '/gap-limited-integration-with-communication-tools-email', label: 'Limited integration with communication tools (email, Slack', icon: '✨' },
  { path: '/gap-no-ai', label: 'No AI', icon: '✨' },
  { path: '/gap-limited-team-collaboration-features', label: 'Limited team/collaboration features', icon: '✨' },
  { path: '/gap-no-integration-with-fitness-health-activity-sleep', label: 'No integration with fitness/health (activity, sleep)', icon: '✨' },
  { path: '/gap-webhook-scaffolding-exists-but-not-full-end', label: 'Webhook scaffolding exists but not full end', icon: '✨' }
];

  const accountItems = [
    { path: '/profile', icon: User, label: 'Profile' },
    { path: '/settings', icon: Settings, label: 'Settings' },
    { path: '/notifications', icon: Bell, label: 'Notifications' },
    { path: '/feedback', icon: MessageCircle, label: 'Feedback' },
  ];

  const infoItems = [
    { path: '/contact', icon: MessageSquare, label: 'Contact' },
    { path: '/privacy', icon: Shield, label: 'Privacy Policy' },
    { path: '/terms', icon: FileText, label: 'Terms of Service' },
  ];

  return (
    <aside className="sidebar" role="navigation" aria-label="Main navigation">
      <NavLink to="/" className="logo" aria-label="AI Productivity Hub Home">
        <Sparkles size={32} />
        <span>AI Productivity</span>
      </NavLink>

      {/* Search Button */}
      <button onClick={onToggleSearch} className="nav-link" style={{ width: '100%', border: '1px solid var(--border)', background: 'var(--dark)', cursor: 'pointer', textAlign: 'left', marginBottom: '1rem', borderRadius: '0.5rem' }}>
        <Search size={18} color="var(--text-muted)" />
        <span style={{ color: 'var(--text-muted)', flex: 1 }}>Search...</span>
        <kbd style={{ padding: '0.125rem 0.375rem', background: 'var(--dark-lighter)', borderRadius: '0.25rem', fontSize: '0.65rem', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>&#8984;K</kbd>
      </button>

      <nav className="nav-section">
        <h3>Features</h3>
        {navItems.map((item) => (
          <NavLink key={item.path} to={item.path} end={item.path === '/'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} aria-label={item.label}>
            <item.icon size={20} />
            <span>{item.label}</span>
            {item.isNew && <span style={{ fontSize: '0.6rem', background: 'var(--primary)', color: '#fff', padding: '0.1rem 0.3rem', borderRadius: '0.25rem', marginLeft: 'auto' }}>NEW</span>}
          </NavLink>
        ))}
      </nav>

      <nav className="nav-section">
        <h3>AI Tools</h3>
        <NavLink to="/weekly-digest" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <BookOpen size={20} /><span>Weekly Digest</span><span style={{ fontSize: '0.6rem', background: 'var(--primary)', color: '#fff', padding: '0.1rem 0.3rem', borderRadius: '0.25rem', marginLeft: 'auto' }}>NEW</span>
        </NavLink>
        <NavLink to="/cross-insights" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Layers size={20} /><span>Cross Insights</span><span style={{ fontSize: '0.6rem', background: 'var(--primary)', color: '#fff', padding: '0.1rem 0.3rem', borderRadius: '0.25rem', marginLeft: 'auto' }}>NEW</span>
        </NavLink>
        <NavLink to="/usage-stats" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <BarChart2 size={20} /><span>AI Usage Stats</span><span style={{ fontSize: '0.6rem', background: 'var(--primary)', color: '#fff', padding: '0.1rem 0.3rem', borderRadius: '0.25rem', marginLeft: 'auto' }}>NEW</span>
        </NavLink>
        <NavLink to="/goal-progress-predict" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <TrendingUp size={20} /><span>Goal Progress Predict</span><span style={{ fontSize: '0.6rem', background: 'var(--primary)', color: '#fff', padding: '0.1rem 0.3rem', borderRadius: '0.25rem', marginLeft: 'auto' }}>NEW</span>
        </NavLink>
        <NavLink to="/usage-anomaly-detect" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Activity size={20} /><span>Usage Anomaly Detect</span><span style={{ fontSize: '0.6rem', background: 'var(--primary)', color: '#fff', padding: '0.1rem 0.3rem', borderRadius: '0.25rem', marginLeft: 'auto' }}>NEW</span>
        </NavLink>
        <NavLink to="/focus-boost-recommend" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
          <Zap size={20} /><span>Focus Boost</span><span style={{ fontSize: '0.6rem', background: 'var(--primary)', color: '#fff', padding: '0.1rem 0.3rem', borderRadius: '0.25rem', marginLeft: 'auto' }}>NEW</span>
        </NavLink>
      </nav>

      <nav className="nav-section">
        <h3>Account</h3>
        {accountItems.map((item) => (
          <NavLink key={item.path} to={item.path}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} aria-label={item.label}>
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        {user?.is_admin && (
          <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} aria-label="Admin Panel">
            <ShieldCheck size={20} />
            <span>Admin Panel</span>
          </NavLink>
        )}
      </nav>

      <nav className="nav-section">
        <h3>Info</h3>
        {infoItems.map((item) => (
          <NavLink key={item.path} to={item.path}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} aria-label={item.label}>
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="nav-section" style={{ marginTop: 'auto' }}>
        <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{user?.name}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{user?.email}</div>
          </div>
          <NotificationBell />
        </div>
        <button onClick={handleLogout} className="nav-link" style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left' }} aria-label="Logout">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
