import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import GlobalSearch from './components/GlobalSearch';
import KeyboardShortcuts from './components/KeyboardShortcuts';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Bookmarks from './pages/Bookmarks';
import FileOrganizer from './pages/FileOrganizer';
import PasswordAuditor from './pages/PasswordAuditor';
import DigitalDetox from './pages/DigitalDetox';
import FocusTimer from './pages/FocusTimer';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Contact from './pages/Contact';
import Feedback from './pages/Feedback';
import AdminPanel from './pages/AdminPanel';
import Onboarding from './pages/Onboarding';
import { getMe } from './services/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await getMe();
          setUser(response.data);
        } catch (error) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleSearch = () => setSearchOpen(!searchOpen);

  if (loading) {
    return (
      <div className="loading" style={{ height: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  // Public routes
  const publicPaths = ['/login', '/forgot-password', '/onboarding'];
  if (!user && !publicPaths.includes(location.pathname)) {
    return <Navigate to="/login" />;
  }

  if (location.pathname === '/login') {
    return <Login setUser={setUser} />;
  }

  if (location.pathname === '/forgot-password') {
    return <ForgotPassword />;
  }

  if (location.pathname === '/onboarding') {
    return <Onboarding />;
  }

  return (
    <div className="app" data-theme={theme}>
      <Sidebar user={user} setUser={setUser} onToggleSearch={toggleSearch} />
      <main className="main-content" role="main">
        <Routes>
          <Route path="/" element={<Dashboard user={user} />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/file-organizer" element={<FileOrganizer />} />
          <Route path="/password-auditor" element={<PasswordAuditor />} />
          <Route path="/digital-detox" element={<DigitalDetox />} />
          <Route path="/focus-timer" element={<FocusTimer />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <KeyboardShortcuts onToggleSearch={toggleSearch} />
    </div>
  );
}

export default App;
