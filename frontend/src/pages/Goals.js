import React, { useState, useEffect } from 'react';
import { Flag, Plus, Trash2, Edit2, Sparkles, CheckCircle } from 'lucide-react';
import Modal from '../components/Modal';
import AIResponseDisplay from '../components/AIResponseDisplay';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [aiPlan, setAiPlan] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [formData, setFormData] = useState({ title: '', description: '', target_date: '', progress_pct: 0, status: 'active' });

  const getToken = () => localStorage.getItem('token');
  const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` });
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/goals?page=1&limit=50`, { headers: headers() });
      const data = await res.json();
      setGoals(data.data || data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchGoals(); }, []);

  const handleCreate = () => {
    setSelectedGoal(null);
    setFormData({ title: '', description: '', target_date: '', progress_pct: 0, status: 'active' });
    setIsModalOpen(true);
  };

  const handleEdit = (goal) => {
    setSelectedGoal(goal);
    setFormData({ title: goal.title, description: goal.description || '', target_date: goal.target_date || '', progress_pct: goal.progress_pct || 0, status: goal.status });
    setIsDetailOpen(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const url = selectedGoal ? `${API_URL}/goals/${selectedGoal.id}` : `${API_URL}/goals`;
      const method = selectedGoal ? 'PUT' : 'POST';
      await fetch(url, { method, headers: headers(), body: JSON.stringify(formData) });
      setIsModalOpen(false);
      showToast(selectedGoal ? 'Goal updated!' : 'Goal created!');
      fetchGoals();
    } catch (e) { showToast('Error saving goal'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this goal?')) return;
    await fetch(`${API_URL}/goals/${id}`, { method: 'DELETE', headers: headers() });
    setIsDetailOpen(false);
    showToast('Goal deleted');
    fetchGoals();
  };

  const handleGeneratePlan = async (goal) => {
    setAiLoading(true); setAiPlan(null);
    try {
      const res = await fetch(`${API_URL}/goals/${goal.id}/ai-plan`, { method: 'POST', headers: headers() });
      const data = await res.json();
      setAiPlan(data.plan);
      showToast('AI plan generated!');
      fetchGoals();
    } catch (e) { showToast('Error generating plan'); }
    setAiLoading(false);
  };

  const getStatusColor = (status) => ({ active: 'var(--primary)', completed: 'var(--success)', paused: 'var(--warning)', abandoned: 'var(--danger)' }[status] || 'var(--text-muted)');

  return (
    <div>
      {toast && <div style={{ position: 'fixed', top: '1rem', right: '1rem', background: 'var(--primary)', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: '0.5rem', zIndex: 9999 }}>{toast}</div>}

      <div className="page-header">
        <div>
          <h1 className="page-title"><Flag size={28} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Goals</h1>
          <p className="page-subtitle">Set goals and get AI-powered action plans</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreate}><Plus size={18} /> New Goal</button>
      </div>

      {loading ? <div className="loading"><div className="spinner" /></div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {goals.map(goal => (
            <div key={goal.id} className="card" style={{ cursor: 'pointer', borderLeft: `4px solid ${getStatusColor(goal.status)}` }}
              onClick={() => { setSelectedGoal(goal); setAiPlan(goal.ai_plan || null); setIsDetailOpen(true); }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem' }}>{goal.title}</h3>
                <span className={`tag tag-${goal.status === 'active' ? 'primary' : goal.status === 'completed' ? 'success' : 'warning'}`}>{goal.status}</span>
              </div>
              {goal.description && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{goal.description}</p>}
              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.8rem' }}>
                  <span>Progress</span><span>{goal.progress_pct}%</span>
                </div>
                <div style={{ height: '6px', background: 'var(--dark-lighter)', borderRadius: '3px' }}>
                  <div style={{ height: '100%', width: `${goal.progress_pct}%`, background: getStatusColor(goal.status), borderRadius: '3px', transition: 'width 0.3s' }} />
                </div>
              </div>
              {goal.target_date && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Due: {new Date(goal.target_date).toLocaleDateString()}
                </div>
              )}
              {goal.ai_plan && <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--primary)' }}><Sparkles size={12} /> AI plan available</div>}
            </div>
          ))}
          {goals.length === 0 && (
            <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>
              <Flag size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
              <p>No goals yet. Create your first goal to get started!</p>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedGoal ? 'Edit Goal' : 'New Goal'}
        footer={<><button className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit}>{selectedGoal ? 'Update' : 'Create'}</button></>}>
        <div className="form-group">
          <label className="form-label">Goal Title *</label>
          <input className="form-input" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Launch side project" />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-input" rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="What does success look like?" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Target Date</label>
            <input type="date" className="form-input" value={formData.target_date} onChange={e => setFormData({ ...formData, target_date: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Progress (%)</label>
            <input type="number" min="0" max="100" className="form-input" value={formData.progress_pct} onChange={e => setFormData({ ...formData, progress_pct: parseInt(e.target.value) || 0 })} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-input" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="paused">Paused</option>
            <option value="abandoned">Abandoned</option>
          </select>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} title="Goal Details" size="large"
        footer={
          <>
            <button className="btn btn-danger" onClick={() => handleDelete(selectedGoal?.id)}><Trash2 size={16} /> Delete</button>
            <button className="btn btn-secondary" onClick={() => handleEdit(selectedGoal)}><Edit2 size={16} /> Edit</button>
            <button className="btn btn-primary" onClick={() => handleGeneratePlan(selectedGoal)} disabled={aiLoading}>
              <Sparkles size={16} /> {aiLoading ? 'Generating...' : 'Generate AI Plan'}
            </button>
          </>
        }>
        {selectedGoal && (
          <div>
            <div className="detail-panel">
              <div className="detail-row"><span className="detail-label">Title</span><span className="detail-value">{selectedGoal.title}</span></div>
              {selectedGoal.description && <div className="detail-row"><span className="detail-label">Description</span><span className="detail-value">{selectedGoal.description}</span></div>}
              <div className="detail-row"><span className="detail-label">Progress</span>
                <span className="detail-value">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ flex: 1, height: '8px', background: 'var(--dark-lighter)', borderRadius: '4px' }}>
                      <div style={{ height: '100%', width: `${selectedGoal.progress_pct}%`, background: 'var(--primary)', borderRadius: '4px' }} />
                    </div>
                    <span>{selectedGoal.progress_pct}%</span>
                  </div>
                </span>
              </div>
              <div className="detail-row"><span className="detail-label">Status</span><span className={`tag tag-${selectedGoal.status === 'active' ? 'primary' : 'success'}`}>{selectedGoal.status}</span></div>
              {selectedGoal.target_date && <div className="detail-row"><span className="detail-label">Target Date</span><span className="detail-value">{new Date(selectedGoal.target_date).toLocaleDateString()}</span></div>}
            </div>

            {aiPlan && (
              <div style={{ marginTop: '1.5rem' }}>
                <h4 style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={18} /> AI Action Plan
                </h4>
                {typeof aiPlan === 'object' ? (
                  <div>
                    {aiPlan.milestones?.length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <strong>Milestones:</strong>
                        {aiPlan.milestones.map((m, i) => (
                          <div key={i} style={{ padding: '0.5rem', background: 'var(--dark)', borderRadius: '0.375rem', marginTop: '0.5rem' }}>
                            <strong>Week {m.week}:</strong> {m.milestone}
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Success: {m.success_criteria}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {aiPlan.daily_actions?.length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <strong>Daily Actions:</strong>
                        <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
                          {aiPlan.daily_actions.map((a, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{a}</li>)}
                        </ul>
                      </div>
                    )}
                    {aiPlan.motivational_tip && (
                      <div style={{ padding: '0.75rem', background: 'var(--dark)', borderRadius: '0.375rem', fontStyle: 'italic', color: 'var(--primary-light)' }}>
                        {aiPlan.motivational_tip}
                      </div>
                    )}
                    {aiPlan.estimated_completion_probability !== undefined && (
                      <div style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>
                        <strong>Estimated completion probability:</strong> {aiPlan.estimated_completion_probability}%
                      </div>
                    )}
                  </div>
                ) : <AIResponseDisplay response={{ content: String(aiPlan) }} title="AI Plan" />}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default Goals;
