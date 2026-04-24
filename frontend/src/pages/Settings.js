import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Moon, Sun, Bell, Volume2, VolumeX, Keyboard, Sparkles, Monitor, Clock, Save } from 'lucide-react';
import { getSettings, updateSettings } from '../services/api';
import Toast from '../components/Toast';

function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const response = await getSettings();
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key) => {
    const newValue = !settings[key];
    setSettings({ ...settings, [key]: newValue });
    try {
      await updateSettings({ [key]: newValue });
      setToast({ message: 'Setting updated', type: 'success' });
    } catch (error) {
      setSettings({ ...settings, [key]: !newValue });
      setToast({ message: 'Failed to update setting', type: 'error' });
    }
  };

  const handleChange = async (key, value) => {
    setSettings({ ...settings, [key]: value });
    if (key === 'theme') {
      const resolved = value === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : value;
      localStorage.setItem('theme', resolved);
      document.documentElement.setAttribute('data-theme', resolved);
    }
    try {
      await updateSettings({ [key]: value });
      setToast({ message: 'Setting updated', type: 'success' });
    } catch (error) {
      setToast({ message: 'Failed to update setting', type: 'error' });
    }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  const ToggleSwitch = ({ checked, onChange }) => (
    <div onClick={onChange} style={{
      width: 48, height: 26, borderRadius: 13, cursor: 'pointer',
      background: checked ? 'var(--primary)' : 'var(--dark-lighter)',
      position: 'relative', transition: 'background 0.2s'
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%', background: 'white',
        position: 'absolute', top: 2, left: checked ? 24 : 2, transition: 'left 0.2s'
      }} />
    </div>
  );

  const SettingRow = ({ icon: Icon, label, description, children }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ width: 40, height: 40, borderRadius: '0.5rem', background: 'var(--dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color="var(--primary)" />
        </div>
        <div>
          <div style={{ fontWeight: 500 }}>{label}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{description}</div>
        </div>
      </div>
      {children}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title"><SettingsIcon size={28} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Settings</h1>
          <p className="page-subtitle">Customize your AI Productivity Hub experience</p>
        </div>
      </div>

      {/* Appearance */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Monitor size={20} /> Appearance
        </h3>
        <SettingRow icon={settings?.theme === 'dark' ? Moon : Sun} label="Theme" description="Choose your preferred color scheme">
          <select className="form-input" style={{ width: 150 }} value={settings?.theme} onChange={(e) => handleChange('theme', e.target.value)}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </SettingRow>
        <SettingRow icon={Monitor} label="Compact View" description="Use a more condensed layout">
          <ToggleSwitch checked={settings?.compact_view} onChange={() => handleToggle('compact_view')} />
        </SettingRow>
        <SettingRow icon={Monitor} label="Items Per Page" description="Number of items shown per page">
          <select className="form-input" style={{ width: 100 }} value={settings?.items_per_page} onChange={(e) => handleChange('items_per_page', parseInt(e.target.value))}>
            <option value="5">5</option>
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </SettingRow>
      </div>

      {/* Notifications */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bell size={20} /> Notifications
        </h3>
        <SettingRow icon={Bell} label="Push Notifications" description="Receive in-app notifications">
          <ToggleSwitch checked={settings?.notifications_enabled} onChange={() => handleToggle('notifications_enabled')} />
        </SettingRow>
        <SettingRow icon={Bell} label="Email Notifications" description="Receive email alerts for important events">
          <ToggleSwitch checked={settings?.email_notifications} onChange={() => handleToggle('email_notifications')} />
        </SettingRow>
        <SettingRow icon={settings?.sound_enabled ? Volume2 : VolumeX} label="Sound Effects" description="Play sound for notifications">
          <ToggleSwitch checked={settings?.sound_enabled} onChange={() => handleToggle('sound_enabled')} />
        </SettingRow>
      </div>

      {/* Features */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={20} /> Features
        </h3>
        <SettingRow icon={Keyboard} label="Keyboard Shortcuts" description="Enable keyboard shortcuts for quick actions">
          <ToggleSwitch checked={settings?.keyboard_shortcuts} onChange={() => handleToggle('keyboard_shortcuts')} />
        </SettingRow>
        <SettingRow icon={Sparkles} label="Auto AI Categorize" description="Automatically categorize new items with AI">
          <ToggleSwitch checked={settings?.auto_categorize} onChange={() => handleToggle('auto_categorize')} />
        </SettingRow>
      </div>

      {/* Focus Timer Defaults */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={20} /> Focus Timer Defaults
        </h3>
        <SettingRow icon={Clock} label="Focus Duration" description="Default focus duration in minutes">
          <select className="form-input" style={{ width: 100 }} value={settings?.default_focus_duration} onChange={(e) => handleChange('default_focus_duration', parseInt(e.target.value))}>
            {[15, 20, 25, 30, 45, 50, 60].map(v => <option key={v} value={v}>{v} min</option>)}
          </select>
        </SettingRow>
        <SettingRow icon={Clock} label="Break Duration" description="Default break duration in minutes">
          <select className="form-input" style={{ width: 100 }} value={settings?.default_break_duration} onChange={(e) => handleChange('default_break_duration', parseInt(e.target.value))}>
            {[3, 5, 10, 15].map(v => <option key={v} value={v}>{v} min</option>)}
          </select>
        </SettingRow>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default Settings;
