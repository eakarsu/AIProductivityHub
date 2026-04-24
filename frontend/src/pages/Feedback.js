import React, { useState, useEffect } from 'react';
import { MessageCircle, Star, Send, ThumbsUp } from 'lucide-react';
import { submitFeedback, getFeedback } from '../services/api';
import Toast from '../components/Toast';
import Modal from '../components/Modal';

function Feedback() {
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [formData, setFormData] = useState({ type: 'general', subject: '', message: '', rating: 0 });

  useEffect(() => { fetchFeedback(); }, []);

  const fetchFeedback = async () => {
    try {
      const response = await getFeedback();
      setFeedbackList(response.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await submitFeedback(formData);
      setShowModal(false);
      setFormData({ type: 'general', subject: '', message: '', rating: 0 });
      fetchFeedback();
      setToast({ message: 'Feedback submitted!', type: 'success' });
    } catch (error) {
      setToast({ message: 'Failed to submit', type: 'error' });
    }
  };

  const handleRowClick = (item) => {
    setSelectedFeedback(item);
  };

  const statusColors = { pending: 'tag-warning', reviewed: 'tag-success', in_progress: 'tag-primary', resolved: 'tag-success' };
  const typeColors = { general: 'tag-primary', bug: 'tag-danger', feature: 'tag-success', improvement: 'tag-warning' };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title"><MessageCircle size={28} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Feedback</h1>
          <p className="page-subtitle">Help us improve AI Productivity Hub</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Send size={18} /> Submit Feedback
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr><th>Type</th><th>Subject</th><th>Rating</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              {feedbackList.map((item) => (
                <tr key={item.id} onClick={() => handleRowClick(item)}>
                  <td><span className={`tag ${typeColors[item.type]}`}>{item.type}</span></td>
                  <td style={{ fontWeight: 500 }}>{item.subject}</td>
                  <td>
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={14} fill={s <= item.rating ? 'var(--warning)' : 'none'} color={s <= item.rating ? 'var(--warning)' : 'var(--text-muted)'} />
                    ))}
                  </td>
                  <td><span className={`tag ${statusColors[item.status]}`}>{item.status}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{new Date(item.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal isOpen={!!selectedFeedback} onClose={() => setSelectedFeedback(null)} title="Feedback Details" footer={
        <button className="btn btn-secondary" onClick={() => setSelectedFeedback(null)}>Close</button>
      }>
        {selectedFeedback && (
          <div className="detail-panel">
            <div className="detail-row"><span className="detail-label">Type</span><span className={`tag ${typeColors[selectedFeedback.type]}`}>{selectedFeedback.type}</span></div>
            <div className="detail-row"><span className="detail-label">Subject</span><span className="detail-value">{selectedFeedback.subject}</span></div>
            <div className="detail-row"><span className="detail-label">Message</span><span className="detail-value">{selectedFeedback.message}</span></div>
            <div className="detail-row"><span className="detail-label">Rating</span><span>{[1,2,3,4,5].map(s => <Star key={s} size={16} fill={s <= selectedFeedback.rating ? 'var(--warning)' : 'none'} color={s <= selectedFeedback.rating ? 'var(--warning)' : 'var(--text-muted)'} />)}</span></div>
            <div className="detail-row"><span className="detail-label">Status</span><span className={`tag ${statusColors[selectedFeedback.status]}`}>{selectedFeedback.status}</span></div>
            <div className="detail-row"><span className="detail-label">Submitted</span><span className="detail-value">{new Date(selectedFeedback.created_at).toLocaleString()}</span></div>
            {selectedFeedback.admin_response && (
              <div className="detail-row"><span className="detail-label">Response</span><span className="detail-value">{selectedFeedback.admin_response}</span></div>
            )}
          </div>
        )}
      </Modal>

      {/* Submit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Submit Feedback" footer={
        <><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSubmit}><Send size={16} /> Submit</button></>
      }>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-input" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
              <option value="general">General</option>
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
              <option value="improvement">Improvement</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Subject</label>
            <input type="text" className="form-input" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Message</label>
            <textarea className="form-input" rows="4" value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Rating</label>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {[1,2,3,4,5].map(s => (
                <Star key={s} size={24} fill={s <= formData.rating ? 'var(--warning)' : 'none'} color={s <= formData.rating ? 'var(--warning)' : 'var(--text-muted)'}
                  style={{ cursor: 'pointer' }} onClick={() => setFormData({ ...formData, rating: s })} />
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default Feedback;
