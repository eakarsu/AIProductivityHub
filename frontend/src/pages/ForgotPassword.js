import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Mail, ArrowLeft, Key } from 'lucide-react';
import { forgotPassword, resetPassword } from '../services/api';

function ForgotPassword() {
  const [step, setStep] = useState('email'); // email | token | done
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleForgot = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await forgotPassword(email);
      setMessage(response.data.message);
      if (response.data.resetToken) {
        setToken(response.data.resetToken);
      }
      setStep('token');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <Sparkles size={48} color="var(--primary)" />
          <h1>{step === 'done' ? 'Password Reset!' : 'Reset Password'}</h1>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', color: 'var(--danger)', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}
        {message && step === 'token' && (
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid var(--success)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1rem', color: 'var(--success)', fontSize: '0.875rem' }}>
            {message}
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={handleForgot}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Enter your email address and we'll send you a password reset link.
            </p>
            <div className="form-group">
              <label className="form-label"><Mail size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Email</label>
              <input type="email" className="form-input" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        {step === 'token' && (
          <form onSubmit={handleReset}>
            <div className="form-group">
              <label className="form-label"><Key size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Reset Token</label>
              <input type="text" className="form-input" placeholder="Paste reset token" value={token} onChange={(e) => setToken(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input type="password" className="form-input" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input type="password" className="form-input" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#10004;</div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Your password has been reset successfully.</p>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigate('/login')}>
              Back to Login
            </button>
          </div>
        )}

        <button onClick={() => navigate('/login')} className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }}>
          <ArrowLeft size={18} /> Back to Login
        </button>
      </div>
    </div>
  );
}

export default ForgotPassword;
