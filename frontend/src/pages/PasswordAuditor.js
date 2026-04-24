import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Sparkles,
  Trash2,
  Edit2,
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Lock,
  Key,
  Database
} from 'lucide-react';
import Modal from '../components/Modal';
import AIResponseDisplay from '../components/AIResponseDisplay';
import {
  getPasswords,
  createPassword,
  updatePassword,
  deletePassword,
  auditPassword,
  getPasswordSummary
} from '../services/api';

function PasswordAuditor() {
  const [passwords, setPasswords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPassword, setSelectedPassword] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    site_name: '',
    site_url: '',
    username: '',
    password_strength: 'Medium',
    strength_score: 50,
    last_changed: '',
    has_2fa: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [passwordsRes, summaryRes] = await Promise.all([
        getPasswords(),
        getPasswordSummary()
      ]);
      setPasswords(passwordsRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedPassword(null);
    setFormData({
      site_name: '',
      site_url: '',
      username: '',
      password_strength: 'Medium',
      strength_score: 50,
      last_changed: '',
      has_2fa: false
    });
    setIsModalOpen(true);
  };

  const handleEdit = (password) => {
    setSelectedPassword(password);
    setFormData({
      site_name: password.site_name,
      site_url: password.site_url || '',
      username: password.username || '',
      password_strength: password.password_strength || 'Medium',
      strength_score: password.strength_score || 50,
      last_changed: password.last_changed?.split('T')[0] || '',
      has_2fa: password.has_2fa || false
    });
    setIsDetailOpen(false);
    setIsModalOpen(true);
  };

  const handleRowClick = (password) => {
    setSelectedPassword(password);
    setAiResponse(null);
    setIsDetailOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedPassword) {
        await updatePassword(selectedPassword.id, formData);
      } else {
        await createPassword(formData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving password:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this password entry?')) {
      try {
        await deletePassword(id);
        setIsDetailOpen(false);
        fetchData();
      } catch (error) {
        console.error('Error deleting password:', error);
      }
    }
  };

  const handleAIAudit = async (password) => {
    setAiLoading(true);
    try {
      const response = await auditPassword(password.id, {
        password_length: 12,
        has_special: true,
        has_numbers: true,
        has_uppercase: true
      });
      setAiResponse(response.data.aiAnalysis);
      fetchData();
    } catch (error) {
      console.error('Error auditing:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const getStrengthColor = (score) => {
    if (score >= 80) return 'var(--success)';
    if (score >= 50) return 'var(--warning)';
    return 'var(--danger)';
  };

  const getStrengthIcon = (score) => {
    if (score >= 80) return <CheckCircle size={16} color="var(--success)" />;
    if (score >= 50) return <AlertTriangle size={16} color="var(--warning)" />;
    return <XCircle size={16} color="var(--danger)" />;
  };

  const handleLoadSampleData = async () => {
    const samplePasswords = [
      { site_name: 'Google', site_url: 'https://google.com', username: 'user@gmail.com', password_strength: 'Strong', strength_score: 85, last_changed: '2025-01-15', has_2fa: true },
      { site_name: 'Facebook', site_url: 'https://facebook.com', username: 'john.doe@email.com', password_strength: 'Weak', strength_score: 30, last_changed: '2023-06-10', has_2fa: false },
      { site_name: 'Amazon', site_url: 'https://amazon.com', username: 'shopper@email.com', password_strength: 'Medium', strength_score: 55, last_changed: '2024-09-20', has_2fa: true },
      { site_name: 'Netflix', site_url: 'https://netflix.com', username: 'viewer@email.com', password_strength: 'Very Weak', strength_score: 15, last_changed: '2022-03-01', has_2fa: false },
      { site_name: 'GitHub', site_url: 'https://github.com', username: 'developer@email.com', password_strength: 'Very Strong', strength_score: 95, last_changed: '2025-12-01', has_2fa: true },
      { site_name: 'Twitter', site_url: 'https://x.com', username: 'tweeter@email.com', password_strength: 'Medium', strength_score: 50, last_changed: '2024-04-15', has_2fa: false },
    ];
    try {
      for (const pw of samplePasswords) {
        await createPassword(pw);
      }
      fetchData();
    } catch (error) {
      console.error('Error loading sample data:', error);
    }
  };

  const filteredPasswords = passwords.filter(p =>
    p.site_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Shield size={28} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Password Auditor
          </h1>
          <p className="page-subtitle">Security recommendations powered by AI</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={handleLoadSampleData}>
            <Database size={18} />
            Load Sample Data
          </button>
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={18} />
            Add Password
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>{summary.total}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total Passwords</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>{summary.strong}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Strong</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)' }}>{summary.medium}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Medium</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--danger)' }}>{summary.weak}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Weak</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--secondary)' }}>{summary.with_2fa}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>With 2FA</div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Search size={20} color="var(--text-muted)" />
          <input
            type="text"
            className="form-input"
            placeholder="Search passwords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ border: 'none', background: 'transparent' }}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Username</th>
                  <th>Strength</th>
                  <th>Score</th>
                  <th>2FA</th>
                  <th>Last Changed</th>
                </tr>
              </thead>
              <tbody>
                {filteredPasswords.map((password) => (
                  <tr key={password.id} onClick={() => handleRowClick(password)}>
                    <td style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Key size={16} color="var(--primary)" />
                      {password.site_name}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{password.username}</td>
                    <td>
                      <span className={`tag ${
                        password.strength_score >= 80 ? 'tag-success' :
                        password.strength_score >= 50 ? 'tag-warning' : 'tag-danger'
                      }`}>
                        {password.password_strength || 'Unknown'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {getStrengthIcon(password.strength_score)}
                        <span style={{ color: getStrengthColor(password.strength_score) }}>
                          {password.strength_score || 0}
                        </span>
                      </div>
                    </td>
                    <td>
                      {password.has_2fa ? (
                        <CheckCircle size={18} color="var(--success)" />
                      ) : (
                        <XCircle size={18} color="var(--text-muted)" />
                      )}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {password.last_changed ? new Date(password.last_changed).toLocaleDateString() : 'Unknown'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedPassword ? 'Edit Password Entry' : 'Add Password Entry'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSubmit}>
              {selectedPassword ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Site Name</label>
            <input
              type="text"
              className="form-input"
              value={formData.site_name}
              onChange={(e) => setFormData({ ...formData, site_name: e.target.value })}
              placeholder="Google, Facebook, etc."
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Site URL</label>
            <input
              type="url"
              className="form-input"
              value={formData.site_url}
              onChange={(e) => setFormData({ ...formData, site_url: e.target.value })}
              placeholder="https://example.com"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Username/Email</label>
            <input
              type="text"
              className="form-input"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="user@example.com"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password Strength</label>
            <select
              className="form-input"
              value={formData.password_strength}
              onChange={(e) => setFormData({ ...formData, password_strength: e.target.value })}
            >
              <option value="Very Weak">Very Weak</option>
              <option value="Weak">Weak</option>
              <option value="Medium">Medium</option>
              <option value="Strong">Strong</option>
              <option value="Very Strong">Very Strong</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Strength Score (0-100)</label>
            <input
              type="number"
              className="form-input"
              min="0"
              max="100"
              value={formData.strength_score}
              onChange={(e) => setFormData({ ...formData, strength_score: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Last Changed</label>
            <input
              type="date"
              className="form-input"
              value={formData.last_changed}
              onChange={(e) => setFormData({ ...formData, last_changed: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.has_2fa}
                onChange={(e) => setFormData({ ...formData, has_2fa: e.target.checked })}
              />
              <span>Has 2FA Enabled</span>
            </label>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Password Entry Details"
        footer={
          <>
            <button className="btn btn-danger" onClick={() => handleDelete(selectedPassword?.id)}>
              <Trash2 size={16} />
              Delete
            </button>
            <button className="btn btn-secondary" onClick={() => handleEdit(selectedPassword)}>
              <Edit2 size={16} />
              Edit
            </button>
            <button
              className="btn btn-primary"
              onClick={() => handleAIAudit(selectedPassword)}
              disabled={aiLoading}
            >
              <Sparkles size={16} />
              {aiLoading ? 'Auditing...' : 'AI Audit'}
            </button>
          </>
        }
      >
        {selectedPassword && (
          <div>
            <div className="detail-panel">
              <div className="detail-row">
                <span className="detail-label">Site Name</span>
                <span className="detail-value">{selectedPassword.site_name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Site URL</span>
                <span className="detail-value">{selectedPassword.site_url || 'Not set'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Username</span>
                <span className="detail-value">{selectedPassword.username || 'Not set'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Strength</span>
                <span className="detail-value">
                  <span className={`tag ${
                    selectedPassword.strength_score >= 80 ? 'tag-success' :
                    selectedPassword.strength_score >= 50 ? 'tag-warning' : 'tag-danger'
                  }`}>
                    {selectedPassword.password_strength || 'Unknown'}
                  </span>
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Score</span>
                <span className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="progress-bar" style={{ width: '100px' }}>
                    <div
                      className={`progress-fill ${
                        selectedPassword.strength_score >= 80 ? 'success' :
                        selectedPassword.strength_score >= 50 ? 'warning' : 'danger'
                      }`}
                      style={{ width: `${selectedPassword.strength_score || 0}%` }}
                    />
                  </div>
                  <span>{selectedPassword.strength_score || 0}/100</span>
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">2FA Enabled</span>
                <span className="detail-value">
                  {selectedPassword.has_2fa ? (
                    <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <CheckCircle size={16} /> Yes
                    </span>
                  ) : (
                    <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <XCircle size={16} /> No
                    </span>
                  )}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Last Changed</span>
                <span className="detail-value">
                  {selectedPassword.last_changed ? new Date(selectedPassword.last_changed).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
            </div>

            {selectedPassword.ai_recommendation && (
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ marginBottom: '0.5rem', color: 'var(--primary-light)' }}>AI Recommendations</h4>
                <div style={{ color: 'var(--text)', fontSize: '0.875rem' }}>
                  {JSON.parse(selectedPassword.ai_recommendation).map((rec, i) => (
                    <div key={i} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                      → {rec}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aiResponse && (
              <AIResponseDisplay response={aiResponse} title="Password Security Audit" />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default PasswordAuditor;
