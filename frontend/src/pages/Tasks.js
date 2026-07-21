import React, { useCallback, useEffect, useState } from 'react';
import { CheckSquare, Plus, RefreshCw } from 'lucide-react';
import { createTask, getTasks, transitionTask } from '../services/api';

const nextStatuses = {
  backlog: ['planned', 'in_progress', 'cancelled'],
  planned: ['backlog', 'in_progress', 'blocked', 'cancelled'],
  in_progress: ['planned', 'blocked', 'completed', 'cancelled'],
  blocked: ['planned', 'in_progress', 'cancelled'],
  completed: ['in_progress'],
  cancelled: ['backlog']
};

function errorMessage(error) {
  return error.response?.data?.error || error.message || 'Request failed';
}

function Tasks() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', due_at: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await getTasks(status ? { status } : {});
      setItems(response.data.items || []);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await createTask({ ...form, due_at: form.due_at || null });
      setForm({ title: '', description: '', priority: 'medium', due_at: '' });
      await load();
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  const transition = async (task, nextStatus) => {
    if (!nextStatus) return;
    setError('');
    try {
      await transitionTask(task.id, { status: nextStatus, version: task.version });
      await load();
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title"><CheckSquare size={28} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Tasks</h1>
          <p className="page-subtitle">Durable work tracking with controlled state transitions and an audit history.</p>
        </div>
        <button className="btn btn-secondary" onClick={load} disabled={loading}><RefreshCw size={16} /> Refresh</button>
      </div>

      {error && <div className="card" role="alert" style={{ borderLeft: '4px solid var(--danger)', marginBottom: '1rem' }}>{error}</div>}

      <form className="card" onSubmit={submit} style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Create a task</h3>
        <div className="form-group">
          <label className="form-label" htmlFor="task-title">Title</label>
          <input id="task-title" className="form-input" maxLength={500} required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="task-description">Description</label>
          <textarea id="task-description" className="form-input" rows={2} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="task-priority">Priority</label>
            <select id="task-priority" className="form-input" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
              {['low', 'medium', 'high', 'urgent'].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="task-due">Due date</label>
            <input id="task-due" type="datetime-local" className="form-input" value={form.due_at} onChange={(event) => setForm({ ...form, due_at: event.target.value })} />
          </div>
        </div>
        <button className="btn btn-primary" type="submit"><Plus size={16} /> Add task</button>
      </form>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
        <label className="form-label" htmlFor="task-filter" style={{ margin: 0 }}>Status</label>
        <select id="task-filter" className="form-input" style={{ width: 'auto' }} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All</option>
          {Object.keys(nextStatuses).map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>

      {loading ? <div className="loading"><div className="spinner" /></div> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {items.map((task) => (
            <article className="card" key={task.id} style={{ borderLeft: `4px solid ${task.priority === 'urgent' ? 'var(--danger)' : task.priority === 'high' ? 'var(--warning)' : 'var(--primary)'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <h3 style={{ margin: 0 }}>{task.title}</h3>
                <span className="tag tag-primary">{task.status}</span>
              </div>
              {task.description && <p style={{ color: 'var(--text-muted)' }}>{task.description}</p>}
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Priority: {task.priority}{task.due_at ? ` · Due ${new Date(task.due_at).toLocaleString()}` : ''}
              </p>
              <label className="form-label" htmlFor={`transition-${task.id}`}>Move task</label>
              <select id={`transition-${task.id}`} className="form-input" defaultValue="" onChange={(event) => transition(task, event.target.value)}>
                <option value="" disabled>Choose next status</option>
                {(nextStatuses[task.status] || []).map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </article>
          ))}
          {!items.length && <div className="card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>No tasks match this filter.</div>}
        </div>
      )}
    </div>
  );
}

export default Tasks;
