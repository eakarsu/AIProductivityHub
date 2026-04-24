import React, { useState } from 'react';
import { MessageSquare, Send, Mail, User, FileText } from 'lucide-react';
import { submitContact } from '../services/api';
import Toast from '../components/Toast';

function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await submitContact(formData);
      setSubmitted(true);
      setToast({ message: 'Message sent successfully!', type: 'success' });
    } catch (error) {
      setToast({ message: error.response?.data?.error || 'Failed to send message', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title"><MessageSquare size={28} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Contact & Support</h1>
          <p className="page-subtitle">Get help or send us a message</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Contact Form */}
        <div className="card">
          <h3 style={{ marginBottom: '1.5rem' }}>Send a Message</h3>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--success)' }}>&#10004;</div>
              <h3>Message Sent!</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>We'll get back to you within 24 hours.</p>
              <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => { setSubmitted(false); setFormData({ name: '', email: '', subject: '', message: '' }); }}>
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label"><User size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Name</label>
                <input type="text" className="form-input" placeholder="Your name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label"><Mail size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Email</label>
                <input type="email" className="form-input" placeholder="your@email.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label"><FileText size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Subject</label>
                <select className="form-input" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} required>
                  <option value="">Select a topic</option>
                  <option value="General Inquiry">General Inquiry</option>
                  <option value="Bug Report">Bug Report</option>
                  <option value="Feature Request">Feature Request</option>
                  <option value="Account Issue">Account Issue</option>
                  <option value="Privacy Concern">Privacy Concern</option>
                  <option value="Technical Support">Technical Support</option>
                  <option value="Billing">Billing</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label"><MessageSquare size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Message</label>
                <textarea className="form-input" rows="5" placeholder="Describe your question or issue..." value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                <Send size={18} />{loading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>

        {/* Support Info */}
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Quick Help</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { q: 'How do I reset my password?', a: 'Click "Forgot Password" on the login page and follow the instructions.' },
                { q: 'How is my data protected?', a: 'All passwords are hashed with bcrypt. Data is stored in encrypted databases with JWT authentication.' },
                { q: 'Can I export my data?', a: 'Yes! Go to any feature page and use the export button, or visit Settings > Data Export.' },
                { q: 'How does AI categorization work?', a: 'We use Claude AI to analyze your content and suggest categories, summaries, and tags.' },
                { q: 'Is there a mobile app?', a: 'The web app is fully responsive and works on mobile browsers. A native app is planned.' }
              ].map((faq, i) => (
                <div key={i} style={{ padding: '1rem', background: 'var(--dark)', borderRadius: '0.5rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{faq.q}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{faq.a}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Other Ways to Reach Us</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', color: 'var(--text-muted)' }}>
              <div><Mail size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} /> support@aiproductivityhub.com</div>
              <div><MessageSquare size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} /> Response time: within 24 hours</div>
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default Contact;
