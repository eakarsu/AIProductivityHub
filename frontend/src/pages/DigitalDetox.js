import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Plus,
  Sparkles,
  Trash2,
  Edit2,
  Search,
  Ban,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  Database
} from 'lucide-react';
import Modal from '../components/Modal';
import AIResponseDisplay from '../components/AIResponseDisplay';
import {
  getScreenTime,
  createScreenTimeEntry,
  updateScreenTimeEntry,
  deleteScreenTimeEntry,
  toggleAppBlock,
  analyzeScreenTime,
  getTodaySummary
} from '../services/api';

function DigitalDetox() {
  const [screenTime, setScreenTime] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    app_name: '',
    category: '',
    daily_limit_minutes: 60,
    actual_usage_minutes: 0,
    is_blocked: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [screenTimeRes, summaryRes] = await Promise.all([
        getScreenTime(),
        getTodaySummary()
      ]);
      setScreenTime(screenTimeRes.data);
      setSummary(summaryRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedEntry(null);
    setFormData({
      app_name: '',
      category: '',
      daily_limit_minutes: 60,
      actual_usage_minutes: 0,
      is_blocked: false
    });
    setIsModalOpen(true);
  };

  const handleEdit = (entry) => {
    setSelectedEntry(entry);
    setFormData({
      app_name: entry.app_name,
      category: entry.category || '',
      daily_limit_minutes: entry.daily_limit_minutes || 60,
      actual_usage_minutes: entry.actual_usage_minutes || 0,
      is_blocked: entry.is_blocked || false
    });
    setIsDetailOpen(false);
    setIsModalOpen(true);
  };

  const handleRowClick = (entry) => {
    setSelectedEntry(entry);
    setIsDetailOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedEntry) {
        await updateScreenTimeEntry(selectedEntry.id, formData);
      } else {
        await createScreenTimeEntry(formData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving entry:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        await deleteScreenTimeEntry(id);
        setIsDetailOpen(false);
        fetchData();
      } catch (error) {
        console.error('Error deleting entry:', error);
      }
    }
  };

  const handleToggleBlock = async (entry) => {
    try {
      await toggleAppBlock(entry.id);
      fetchData();
      if (selectedEntry?.id === entry.id) {
        setSelectedEntry({ ...selectedEntry, is_blocked: !selectedEntry.is_blocked });
      }
    } catch (error) {
      console.error('Error toggling block:', error);
    }
  };

  const handleAIAnalyze = async () => {
    setAiLoading(true);
    try {
      const response = await analyzeScreenTime();
      setAiResponse(response.data.aiAnalysis);
    } catch (error) {
      console.error('Error analyzing:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const formatMinutes = (minutes) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getUsageColor = (actual, limit) => {
    if (!limit) return 'var(--primary)';
    const percentage = (actual / limit) * 100;
    if (percentage >= 100) return 'var(--danger)';
    if (percentage >= 75) return 'var(--warning)';
    return 'var(--success)';
  };

  const handleLoadSampleData = async () => {
    const sampleApps = [
      { app_name: 'Instagram', category: 'Social Media', daily_limit_minutes: 30, actual_usage_minutes: 75, is_blocked: false },
      { app_name: 'YouTube', category: 'Entertainment', daily_limit_minutes: 60, actual_usage_minutes: 95, is_blocked: false },
      { app_name: 'VS Code', category: 'Development', daily_limit_minutes: 480, actual_usage_minutes: 320, is_blocked: false },
      { app_name: 'Twitter/X', category: 'Social Media', daily_limit_minutes: 20, actual_usage_minutes: 45, is_blocked: false },
      { app_name: 'Slack', category: 'Communication', daily_limit_minutes: 120, actual_usage_minutes: 90, is_blocked: false },
      { app_name: 'TikTok', category: 'Entertainment', daily_limit_minutes: 15, actual_usage_minutes: 60, is_blocked: true },
      { app_name: 'Figma', category: 'Design', daily_limit_minutes: 240, actual_usage_minutes: 110, is_blocked: false },
      { app_name: 'Reddit', category: 'Social Media', daily_limit_minutes: 30, actual_usage_minutes: 55, is_blocked: false },
    ];
    try {
      for (const app of sampleApps) {
        await createScreenTimeEntry(app);
      }
      fetchData();
    } catch (error) {
      console.error('Error loading sample data:', error);
    }
  };

  const filteredScreenTime = screenTime.filter(s =>
    s.app_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = ['Productivity', 'Work', 'Development', 'Social Media', 'Entertainment', 'Music', 'Social', 'Design', 'Communication', 'Other'];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Smartphone size={28} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Digital Detox Coach
          </h1>
          <p className="page-subtitle">Screen time management and AI insights</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={handleLoadSampleData}>
            <Database size={18} />
            Load Sample Data
          </button>
          <button className="btn btn-secondary" onClick={handleAIAnalyze} disabled={aiLoading}>
            <Sparkles size={18} />
            {aiLoading ? 'Analyzing...' : 'AI Analyze'}
          </button>
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={18} />
            Add App
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <Clock size={24} color="var(--primary)" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>
              {formatMinutes(summary.total_usage)}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Today's Usage</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <TrendingUp size={24} color="var(--success)" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>
              {formatMinutes(summary.total_limit)}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Total Limit</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <Smartphone size={24} color="var(--warning)" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)' }}>
              {summary.app_count || 0}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Apps Tracked</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <AlertTriangle size={24} color="var(--danger)" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--danger)' }}>
              {summary.over_limit_count || 0}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Over Limit</div>
          </div>
        </div>
      )}

      {aiResponse && (
        <div style={{ marginBottom: '1.5rem' }}>
          <AIResponseDisplay response={aiResponse} title="Screen Time Analysis" />
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Search size={20} color="var(--text-muted)" />
          <input
            type="text"
            className="form-input"
            placeholder="Search apps..."
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
                  <th>App</th>
                  <th>Category</th>
                  <th>Usage</th>
                  <th>Limit</th>
                  <th>Progress</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredScreenTime.map((entry) => (
                  <tr key={entry.id} onClick={() => handleRowClick(entry)}>
                    <td style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {entry.is_blocked && <Ban size={16} color="var(--danger)" />}
                      {entry.app_name}
                    </td>
                    <td>
                      <span className="tag tag-primary">{entry.category || 'Other'}</span>
                    </td>
                    <td style={{ color: getUsageColor(entry.actual_usage_minutes, entry.daily_limit_minutes) }}>
                      {formatMinutes(entry.actual_usage_minutes)}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{formatMinutes(entry.daily_limit_minutes)}</td>
                    <td style={{ width: '150px' }}>
                      <div className="progress-bar">
                        <div
                          className={`progress-fill ${
                            (entry.actual_usage_minutes / entry.daily_limit_minutes) >= 1 ? 'danger' :
                            (entry.actual_usage_minutes / entry.daily_limit_minutes) >= 0.75 ? 'warning' : 'success'
                          }`}
                          style={{ width: `${Math.min((entry.actual_usage_minutes / entry.daily_limit_minutes) * 100, 100)}%` }}
                        />
                      </div>
                    </td>
                    <td>
                      {entry.is_blocked ? (
                        <span className="tag tag-danger">Blocked</span>
                      ) : entry.actual_usage_minutes > entry.daily_limit_minutes ? (
                        <span className="tag tag-warning">Over Limit</span>
                      ) : (
                        <span className="tag tag-success">Active</span>
                      )}
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
        title={selectedEntry ? 'Edit App Entry' : 'Add App Entry'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSubmit}>
              {selectedEntry ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">App Name</label>
            <input
              type="text"
              className="form-input"
              value={formData.app_name}
              onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
              placeholder="Twitter, YouTube, etc."
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select
              className="form-input"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Daily Limit (minutes)</label>
            <input
              type="number"
              className="form-input"
              min="0"
              value={formData.daily_limit_minutes}
              onChange={(e) => setFormData({ ...formData, daily_limit_minutes: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Today's Usage (minutes)</label>
            <input
              type="number"
              className="form-input"
              min="0"
              value={formData.actual_usage_minutes}
              onChange={(e) => setFormData({ ...formData, actual_usage_minutes: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.is_blocked}
                onChange={(e) => setFormData({ ...formData, is_blocked: e.target.checked })}
              />
              <span>Block this app</span>
            </label>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="App Details"
        footer={
          <>
            <button className="btn btn-danger" onClick={() => handleDelete(selectedEntry?.id)}>
              <Trash2 size={16} />
              Delete
            </button>
            <button className="btn btn-secondary" onClick={() => handleEdit(selectedEntry)}>
              <Edit2 size={16} />
              Edit
            </button>
            <button
              className={`btn ${selectedEntry?.is_blocked ? 'btn-success' : 'btn-danger'}`}
              onClick={() => handleToggleBlock(selectedEntry)}
            >
              {selectedEntry?.is_blocked ? <CheckCircle size={16} /> : <Ban size={16} />}
              {selectedEntry?.is_blocked ? 'Unblock' : 'Block'}
            </button>
          </>
        }
      >
        {selectedEntry && (
          <div>
            <div className="detail-panel">
              <div className="detail-row">
                <span className="detail-label">App Name</span>
                <span className="detail-value">{selectedEntry.app_name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Category</span>
                <span className="detail-value">
                  <span className="tag tag-primary">{selectedEntry.category || 'Other'}</span>
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Today's Usage</span>
                <span className="detail-value" style={{ color: getUsageColor(selectedEntry.actual_usage_minutes, selectedEntry.daily_limit_minutes) }}>
                  {formatMinutes(selectedEntry.actual_usage_minutes)}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Daily Limit</span>
                <span className="detail-value">{formatMinutes(selectedEntry.daily_limit_minutes)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Progress</span>
                <span className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="progress-bar" style={{ width: '100px' }}>
                    <div
                      className={`progress-fill ${
                        (selectedEntry.actual_usage_minutes / selectedEntry.daily_limit_minutes) >= 1 ? 'danger' :
                        (selectedEntry.actual_usage_minutes / selectedEntry.daily_limit_minutes) >= 0.75 ? 'warning' : 'success'
                      }`}
                      style={{ width: `${Math.min((selectedEntry.actual_usage_minutes / selectedEntry.daily_limit_minutes) * 100, 100)}%` }}
                    />
                  </div>
                  <span>
                    {Math.round((selectedEntry.actual_usage_minutes / selectedEntry.daily_limit_minutes) * 100)}%
                  </span>
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className="detail-value">
                  {selectedEntry.is_blocked ? (
                    <span className="tag tag-danger">Blocked</span>
                  ) : (
                    <span className="tag tag-success">Active</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default DigitalDetox;
