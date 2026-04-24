import React, { useState, useEffect, useRef } from 'react';
import {
  Timer,
  Plus,
  Sparkles,
  Trash2,
  Edit2,
  Search,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Target,
  Coffee,
  Star,
  Database
} from 'lucide-react';
import Modal from '../components/Modal';
import AIResponseDisplay from '../components/AIResponseDisplay';
import {
  getFocusSessions,
  createFocusSession,
  updateFocusSession,
  deleteFocusSession,
  startFocusSession,
  completePomodoroSession,
  endFocusSession,
  getFocusTip,
  getFocusStats
} from '../services/api';

function FocusTimer() {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [aiResponse, setAiResponse] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Timer state
  const [activeSession, setActiveSession] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const timerRef = useRef(null);

  const [formData, setFormData] = useState({
    session_name: '',
    duration_minutes: 25,
    break_duration_minutes: 5,
    target_pomodoros: 4,
    blocked_sites: [],
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      handleTimerComplete();
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, timeLeft]);

  const fetchData = async () => {
    try {
      const [sessionsRes, statsRes] = await Promise.all([
        getFocusSessions(),
        getFocusStats()
      ]);
      setSessions(sessionsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTimerComplete = async () => {
    setIsRunning(false);
    clearInterval(timerRef.current);

    if (isBreak) {
      // Break ended, start new pomodoro
      setIsBreak(false);
      setTimeLeft(activeSession.duration_minutes * 60);
    } else {
      // Pomodoro ended
      try {
        await completePomodoroSession(activeSession.id);
        setIsBreak(true);
        setTimeLeft(activeSession.break_duration_minutes * 60);
        fetchData();
      } catch (error) {
        console.error('Error completing pomodoro:', error);
      }
    }
  };

  const handleCreate = () => {
    setSelectedSession(null);
    setFormData({
      session_name: '',
      duration_minutes: 25,
      break_duration_minutes: 5,
      target_pomodoros: 4,
      blocked_sites: [],
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleEdit = (session) => {
    setSelectedSession(session);
    setFormData({
      session_name: session.session_name,
      duration_minutes: session.duration_minutes || 25,
      break_duration_minutes: session.break_duration_minutes || 5,
      target_pomodoros: session.target_pomodoros || 4,
      blocked_sites: session.blocked_sites || [],
      notes: session.notes || ''
    });
    setIsDetailOpen(false);
    setIsModalOpen(true);
  };

  const handleRowClick = (session) => {
    setSelectedSession(session);
    setAiResponse(null);
    setIsDetailOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedSession) {
        await updateFocusSession(selectedSession.id, formData);
      } else {
        await createFocusSession(formData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this session?')) {
      try {
        await deleteFocusSession(id);
        setIsDetailOpen(false);
        if (activeSession?.id === id) {
          setActiveSession(null);
          setIsRunning(false);
          setTimeLeft(0);
        }
        fetchData();
      } catch (error) {
        console.error('Error deleting session:', error);
      }
    }
  };

  const handleStartSession = async (session) => {
    try {
      await startFocusSession(session.id);
      setActiveSession(session);
      setTimeLeft(session.duration_minutes * 60);
      setIsBreak(false);
      setIsRunning(true);
      setIsDetailOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  const handleEndSession = async (rating) => {
    try {
      await endFocusSession(activeSession.id, { productivity_rating: rating });
      setActiveSession(null);
      setIsRunning(false);
      setTimeLeft(0);
      setIsBreak(false);
      fetchData();
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  const handleGetFocusTip = async (session) => {
    setAiLoading(true);
    try {
      const response = await getFocusTip(session.id);
      setAiResponse(response.data.aiAnalysis);
    } catch (error) {
      console.error('Error getting tip:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLoadSampleData = async () => {
    const sampleSessions = [
      { session_name: 'Deep Work - React Project', duration_minutes: 25, break_duration_minutes: 5, target_pomodoros: 4, notes: 'Build new dashboard components' },
      { session_name: 'Code Review', duration_minutes: 15, break_duration_minutes: 3, target_pomodoros: 2, notes: 'Review pull requests from team' },
      { session_name: 'Algorithm Practice', duration_minutes: 30, break_duration_minutes: 5, target_pomodoros: 3, notes: 'LeetCode medium problems' },
      { session_name: 'Documentation Writing', duration_minutes: 25, break_duration_minutes: 5, target_pomodoros: 2, notes: 'Write API documentation for new endpoints' },
      { session_name: 'Bug Fixing Sprint', duration_minutes: 25, break_duration_minutes: 5, target_pomodoros: 6, notes: 'Fix critical bugs before release' },
    ];
    try {
      for (const session of sampleSessions) {
        await createFocusSession(session);
      }
      fetchData();
    } catch (error) {
      console.error('Error loading sample data:', error);
    }
  };

  const filteredSessions = sessions.filter(s =>
    s.session_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Timer size={28} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Focus Timer
          </h1>
          <p className="page-subtitle">Pomodoro timer with distraction blocking</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={handleLoadSampleData}>
            <Database size={18} />
            Load Sample Data
          </button>
          <button className="btn btn-primary" onClick={handleCreate}>
            <Plus size={18} />
            New Session
          </button>
        </div>
      </div>

      {/* Active Timer */}
      {activeSession && (
        <div className="card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, var(--dark-light), var(--dark-lighter))' }}>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--primary-light)' }}>
              {isBreak ? 'Break Time' : activeSession.session_name}
            </h3>
            <div className="timer-display">
              {formatTime(timeLeft)}
            </div>
            <div style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>
              {isBreak ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Coffee size={18} /> Take a break!
                </span>
              ) : (
                <span>
                  Pomodoro {activeSession.completed_pomodoros + 1} of {activeSession.target_pomodoros}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              <button
                className="btn btn-primary"
                onClick={() => setIsRunning(!isRunning)}
              >
                {isRunning ? <Pause size={18} /> : <Play size={18} />}
                {isRunning ? 'Pause' : 'Resume'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setTimeLeft(isBreak ? activeSession.break_duration_minutes * 60 : activeSession.duration_minutes * 60)}
              >
                <RotateCcw size={18} />
                Reset
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleEndSession(3)}
              >
                End Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <Target size={24} color="var(--primary)" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>
              {stats.total_sessions || 0}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sessions</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <CheckCircle size={24} color="var(--success)" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>
              {stats.total_pomodoros || 0}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Pomodoros</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <Timer size={24} color="var(--warning)" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--warning)' }}>
              {Math.round((stats.total_focus_minutes || 0) / 60)}h
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Focus Time</div>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <Star size={24} color="var(--secondary)" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--secondary)' }}>
              {parseFloat(stats.avg_productivity || 0).toFixed(1)}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Avg Rating</div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Search size={20} color="var(--text-muted)" />
          <input
            type="text"
            className="form-input"
            placeholder="Search sessions..."
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
                  <th>Session</th>
                  <th>Duration</th>
                  <th>Pomodoros</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session) => (
                  <tr key={session.id} onClick={() => handleRowClick(session)}>
                    <td style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Timer size={16} color="var(--primary)" />
                      {session.session_name}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{session.duration_minutes}m</td>
                    <td>
                      {session.completed_pomodoros}/{session.target_pomodoros}
                    </td>
                    <td style={{ width: '120px' }}>
                      <div className="progress-bar">
                        <div
                          className="progress-fill success"
                          style={{ width: `${(session.completed_pomodoros / session.target_pomodoros) * 100}%` }}
                        />
                      </div>
                    </td>
                    <td>
                      <span className={`tag ${
                        session.status === 'completed' ? 'tag-success' :
                        session.status === 'in_progress' ? 'tag-warning' : 'tag-primary'
                      }`}>
                        {session.status || 'pending'}
                      </span>
                    </td>
                    <td>
                      {session.productivity_rating ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Star size={14} color="var(--warning)" fill="var(--warning)" />
                          {session.productivity_rating}
                        </span>
                      ) : '-'}
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
        title={selectedSession ? 'Edit Session' : 'New Focus Session'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSubmit}>
              {selectedSession ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Session Name</label>
            <input
              type="text"
              className="form-input"
              value={formData.session_name}
              onChange={(e) => setFormData({ ...formData, session_name: e.target.value })}
              placeholder="Deep Work, Coding, etc."
              required
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Focus Duration (min)</label>
              <input
                type="number"
                className="form-input"
                min="1"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 25 })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Break Duration (min)</label>
              <input
                type="number"
                className="form-input"
                min="1"
                value={formData.break_duration_minutes}
                onChange={(e) => setFormData({ ...formData, break_duration_minutes: parseInt(e.target.value) || 5 })}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Target Pomodoros</label>
            <input
              type="number"
              className="form-input"
              min="1"
              value={formData.target_pomodoros}
              onChange={(e) => setFormData({ ...formData, target_pomodoros: parseInt(e.target.value) || 4 })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              className="form-input"
              rows="3"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="What will you focus on?"
            />
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Session Details"
        footer={
          <>
            <button className="btn btn-danger" onClick={() => handleDelete(selectedSession?.id)}>
              <Trash2 size={16} />
              Delete
            </button>
            <button className="btn btn-secondary" onClick={() => handleEdit(selectedSession)}>
              <Edit2 size={16} />
              Edit
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => handleGetFocusTip(selectedSession)}
              disabled={aiLoading}
            >
              <Sparkles size={16} />
              {aiLoading ? 'Loading...' : 'Get AI Tip'}
            </button>
            {selectedSession?.status === 'pending' && (
              <button
                className="btn btn-primary"
                onClick={() => handleStartSession(selectedSession)}
              >
                <Play size={16} />
                Start Session
              </button>
            )}
          </>
        }
      >
        {selectedSession && (
          <div>
            <div className="detail-panel">
              <div className="detail-row">
                <span className="detail-label">Session Name</span>
                <span className="detail-value">{selectedSession.session_name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Focus Duration</span>
                <span className="detail-value">{selectedSession.duration_minutes} minutes</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Break Duration</span>
                <span className="detail-value">{selectedSession.break_duration_minutes} minutes</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Pomodoros</span>
                <span className="detail-value">
                  {selectedSession.completed_pomodoros}/{selectedSession.target_pomodoros}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Progress</span>
                <span className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div className="progress-bar" style={{ width: '100px' }}>
                    <div
                      className="progress-fill success"
                      style={{ width: `${(selectedSession.completed_pomodoros / selectedSession.target_pomodoros) * 100}%` }}
                    />
                  </div>
                  <span>
                    {Math.round((selectedSession.completed_pomodoros / selectedSession.target_pomodoros) * 100)}%
                  </span>
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Status</span>
                <span className="detail-value">
                  <span className={`tag ${
                    selectedSession.status === 'completed' ? 'tag-success' :
                    selectedSession.status === 'in_progress' ? 'tag-warning' : 'tag-primary'
                  }`}>
                    {selectedSession.status || 'pending'}
                  </span>
                </span>
              </div>
              {selectedSession.productivity_rating && (
                <div className="detail-row">
                  <span className="detail-label">Rating</span>
                  <span className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={18}
                        color="var(--warning)"
                        fill={star <= selectedSession.productivity_rating ? 'var(--warning)' : 'transparent'}
                      />
                    ))}
                  </span>
                </div>
              )}
              {selectedSession.notes && (
                <div className="detail-row">
                  <span className="detail-label">Notes</span>
                  <span className="detail-value">{selectedSession.notes}</span>
                </div>
              )}
              {selectedSession.blocked_sites?.length > 0 && (
                <div className="detail-row">
                  <span className="detail-label">Blocked Sites</span>
                  <span className="detail-value">
                    {selectedSession.blocked_sites.map((site, i) => (
                      <span key={i} className="tag tag-danger">{site}</span>
                    ))}
                  </span>
                </div>
              )}
            </div>

            {selectedSession.ai_focus_tip && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--dark)', borderRadius: '0.5rem' }}>
                <h4 style={{ color: 'var(--primary-light)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={18} /> AI Focus Tip
                </h4>
                <p style={{ color: 'var(--text)' }}>{selectedSession.ai_focus_tip}</p>
              </div>
            )}

            {aiResponse && (
              <AIResponseDisplay response={aiResponse} title="Focus Session Tips" />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default FocusTimer;
