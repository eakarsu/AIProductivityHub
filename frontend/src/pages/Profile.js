import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Globe, MapPin, Edit2, Save, Camera, Shield, Bookmark, FolderOpen, Timer } from 'lucide-react';
import { getProfile, updateProfile, changePassword } from '../services/api';
import Toast from '../components/Toast';
import Modal from '../components/Modal';

function Profile() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', bio: '', phone: '', timezone: '', language: '' });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const response = await getProfile();
      setProfile(response.data.profile);
      setStats(response.data.stats);
      setFormData({
        name: response.data.profile.name || '',
        bio: response.data.profile.bio || '',
        phone: response.data.profile.phone || '',
        timezone: response.data.profile.timezone || 'UTC',
        language: response.data.profile.language || 'en'
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateProfile(formData);
      setEditing(false);
      fetchProfile();
      setToast({ message: 'Profile updated successfully', type: 'success' });
    } catch (error) {
      setToast({ message: 'Failed to update profile', type: 'error' });
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setToast({ message: 'Passwords do not match', type: 'error' });
      return;
    }
    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setToast({ message: 'Password changed successfully', type: 'success' });
    } catch (error) {
      setToast({ message: error.response?.data?.error || 'Failed to change password', type: 'error' });
    }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title"><User size={28} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />My Profile</h1>
          <p className="page-subtitle">Manage your personal information and account settings</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowPasswordModal(true)}>
            <Shield size={18} /> Change Password
          </button>
          {editing ? (
            <button className="btn btn-primary" onClick={handleSave}><Save size={18} /> Save</button>
          ) : (
            <button className="btn btn-primary" onClick={() => setEditing(true)}><Edit2 size={18} /> Edit Profile</button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
        {/* Profile Card */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-block', margin: '0 auto' }}>
            <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: '3rem', color: 'white' }}>
              {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <button className="btn btn-icon" style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--primary)', borderRadius: '50%', width: 36, height: 36 }}>
              <Camera size={16} color="white" />
            </button>
          </div>
          <h2 style={{ marginTop: '1rem' }}>{profile?.name}</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{profile?.email}</p>
          {profile?.bio && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem' }}>{profile.bio}</p>}
          <div style={{ marginTop: '1rem' }}>
            {profile?.email_verified ? (
              <span className="tag tag-success">Email Verified</span>
            ) : (
              <span className="tag tag-warning">Email Not Verified</span>
            )}
            {profile?.is_admin && <span className="tag tag-primary">Admin</span>}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '1rem' }}>
            Member since {new Date(profile?.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Info & Stats */}
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Personal Information</h3>
            <div className="detail-panel">
              <div className="detail-row">
                <span className="detail-label"><Mail size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Name</span>
                {editing ? (
                  <input className="form-input" style={{ maxWidth: 300 }} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                ) : (
                  <span className="detail-value">{profile?.name}</span>
                )}
              </div>
              <div className="detail-row">
                <span className="detail-label"><Mail size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Email</span>
                <span className="detail-value">{profile?.email}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label"><Phone size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Phone</span>
                {editing ? (
                  <input className="form-input" style={{ maxWidth: 300 }} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                ) : (
                  <span className="detail-value">{profile?.phone || 'Not set'}</span>
                )}
              </div>
              <div className="detail-row">
                <span className="detail-label"><Globe size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Timezone</span>
                {editing ? (
                  <select className="form-input" style={{ maxWidth: 300 }} value={formData.timezone} onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                    <option value="Europe/London">London</option>
                    <option value="Europe/Berlin">Berlin</option>
                    <option value="Asia/Tokyo">Tokyo</option>
                  </select>
                ) : (
                  <span className="detail-value">{profile?.timezone}</span>
                )}
              </div>
              <div className="detail-row">
                <span className="detail-label"><MapPin size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Bio</span>
                {editing ? (
                  <textarea className="form-input" style={{ maxWidth: 300 }} rows="3" value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} />
                ) : (
                  <span className="detail-value">{profile?.bio || 'Not set'}</span>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Activity Statistics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--dark)', borderRadius: '0.75rem' }}>
                <Bookmark size={24} color="var(--primary)" />
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.5rem' }}>{stats?.bookmarks_count || 0}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bookmarks</div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--dark)', borderRadius: '0.75rem' }}>
                <FolderOpen size={24} color="var(--secondary)" />
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--secondary)', marginTop: '0.5rem' }}>{stats?.files_count || 0}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Files</div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--dark)', borderRadius: '0.75rem' }}>
                <Shield size={24} color="var(--warning)" />
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)', marginTop: '0.5rem' }}>{stats?.passwords_count || 0}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Passwords</div>
              </div>
              <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--dark)', borderRadius: '0.75rem' }}>
                <Timer size={24} color="var(--success)" />
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)', marginTop: '0.5rem' }}>{stats?.sessions_completed || 0}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sessions Done</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Change Password" footer={
        <><button className="btn btn-secondary" onClick={() => setShowPasswordModal(false)}>Cancel</button>
        <button className="btn btn-primary" onClick={handleChangePassword}>Change Password</button></>
      }>
        <div className="form-group">
          <label className="form-label">Current Password</label>
          <input type="password" className="form-input" value={passwordData.currentPassword} onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">New Password</label>
          <input type="password" className="form-input" value={passwordData.newPassword} onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Confirm New Password</label>
          <input type="password" className="form-input" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })} />
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default Profile;
