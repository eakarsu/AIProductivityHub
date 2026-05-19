import React, { useState, useEffect } from 'react';
import { Target, Plus, Trash2, CheckCircle, Flame, Edit2, BarChart2 } from 'lucide-react';
import Modal from '../components/Modal';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

function Habits() {
  const [habits, setHabits] = useState([]);
  const [streaks, setStreaks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState(null);
  const [activeTab, setActiveTab] = useState('habits');
  const [formData, setFormData] = useState({ name: '', frequency: 'daily', target_count: 1, description: '' });
  const [toast, setToast] = useState('');

  const getToken = () => localStorage.getItem('token');
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [habitsRes, streaksRes] = await Promise.all([
        fetch(`${API_URL}/habits?page=1&limit=50`, { headers: headers() }),
        fetch(`${API_URL}/habits/streaks/summary`, { headers: headers() })
      ]);
      const habitsData = await habitsRes.json();
      const streaksData = await streaksRes.json();
      setHabits(habitsData.data || habitsData || []);
      setStreaks(Array.isArray(streaksData) ? streaksData : []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleLog = async (habitId) => {
    try {
      await fetch(`${API_URL}/habits/${habitId}/log`, { method: 'POST', headers: headers(), body: JSON.stringify({ count: 1 }) });
      showToast('Habit logged!');
      fetchData();
    } catch (e) { showToast('Error logging habit'); }
  };

  const handleCreate = () => {
    setSelectedHabit(null);
    setFormData({ name: '', frequency: 'daily', target_count: 1, description: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (habit) => {
    setSelectedHabit(habit);
    setFormData({ name: habit.name, frequency: habit.frequency, target_count: habit.target_count, description: habit.description || '' });
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const url = selectedHabit ? `${API_URL}/habits/${selectedHabit.id}` : `${API_URL}/habits`;
      const method = selectedHabit ? 'PUT' : 'POST';
      await fetch(url, { method, headers: headers(), body: JSON.stringify(formData) });
      setIsModalOpen(false);
      showToast(selectedHabit ? 'Habit updated!' : 'Habit created!');
      fetchData();
    } catch (e) { showToast('Error saving habit'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this habit?')) return;
    try {
      await fetch(`${API_URL}/habits/${id}`, { method: 'DELETE', headers: headers() });
      showToast('Habit deleted');
      fetchData();
    } catch (e) { showToast('Error deleting'); }
  };

  const getStreakForHabit = (id) => streaks.find(s => s.habit_id === id);

  return (
    <div>
      {toast && <div style={{ position: 'fixed', top: '1rem', right: '1rem', background: 'var(--primary)', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: '0.5rem', zIndex: 9999 }}>{toast}</div>}

      <div className="page-header">
        <div>
          <h1 className="page-title"><Target size={28} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Habit Tracker</h1>
          <p className="page-subtitle">Track daily habits and build streaks</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreate}><Plus size={18} /> New Habit</button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {['habits', 'streaks'].map(tab => (
          <button key={tab} className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab(tab)}>
            {tab === 'habits' ? <Target size={16} /> : <Flame size={16} />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {loading ? <div className="loading"><div className="spinner" /></div> : (
        activeTab === 'habits' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {habits.map(habit => {
              const streak = getStreakForHabit(habit.id);
              return (
                <div key={habit.id} className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1rem' }}>{habit.name}</h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{habit.frequency} · target: {habit.target_count}x</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button className="btn btn-icon" onClick={() => handleEdit(habit)} title="Edit"><Edit2 size={14} /></button>
                      <button className="btn btn-icon btn-danger" onClick={() => handleDelete(habit.id)} title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  {habit.description && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 0.75rem' }}>{habit.description}</p>}
                  {streak && (
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#ff6b35' }}>
                        <Flame size={14} /> {streak.current_streak} day streak
                      </span>
                      <span style={{ color: 'var(--text-muted)' }}>Best: {streak.longest_streak} days</span>
                      <span style={{ color: 'var(--text-muted)' }}>Total: {streak.total_completions}</span>
                    </div>
                  )}
                  <button className="btn btn-success" style={{ width: '100%' }} onClick={() => handleLog(habit.id)}>
                    <CheckCircle size={16} /> Log Completion
                  </button>
                </div>
              );
            })}
            {habits.length === 0 && (
              <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>
                <Target size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
                <p>No habits yet. Create your first habit to start tracking!</p>
              </div>
            )}
          </div>
        ) : (
          <div className="card">
            <h3><BarChart2 size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Streak Dashboard</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Habit</th><th>Frequency</th><th>Current Streak</th><th>Longest Streak</th><th>Total Completions</th><th>Last Logged</th></tr>
                </thead>
                <tbody>
                  {streaks.map(s => (
                    <tr key={s.habit_id}>
                      <td style={{ fontWeight: 500 }}>{s.habit_name}</td>
                      <td>{s.frequency}</td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#ff6b35' }}>
                          <Flame size={14} fill="currentColor" /> {s.current_streak} days
                        </span>
                      </td>
                      <td>{s.longest_streak} days</td>
                      <td>{s.total_completions}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {s.last_logged ? new Date(s.last_logged).toLocaleDateString() : 'Never'}
                      </td>
                    </tr>
                  ))}
                  {streaks.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No habit data yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedHabit ? 'Edit Habit' : 'New Habit'}
        footer={<><button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit}>{selectedHabit ? 'Update' : 'Create'}</button></>}>
        <div className="form-group">
          <label className="form-label">Habit Name *</label>
          <input className="form-input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Morning meditation" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Frequency</label>
            <select className="form-input" value={formData.frequency} onChange={e => setFormData({ ...formData, frequency: e.target.value })}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Target Count</label>
            <input type="number" min="1" className="form-input" value={formData.target_count} onChange={e => setFormData({ ...formData, target_count: parseInt(e.target.value) || 1 })} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-input" rows={2} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="What is this habit for?" />
        </div>
      </Modal>
    </div>
  );
}

export default Habits;
