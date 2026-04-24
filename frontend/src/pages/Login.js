import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, Mail, Lock, Zap, UserPlus, User } from 'lucide-react';
import { login, register } from '../services/api';

function Login({ setUser }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAutoFill = () => {
    setEmail('demo@example.com');
    setPassword('demo123');
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!name) { setError('Name is required'); setLoading(false); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters'); setLoading(false); return; }
        const response = await register(email, password, name);
        localStorage.setItem('token', response.data.token);
        if (response.data.refreshToken) localStorage.setItem('refreshToken', response.data.refreshToken);
        setUser(response.data.user);
        navigate('/onboarding');
      } else {
        const response = await login(email, password);
        localStorage.setItem('token', response.data.token);
        if (response.data.refreshToken) localStorage.setItem('refreshToken', response.data.refreshToken);
        setUser(response.data.user);
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || (isRegister ? 'Registration failed' : 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <Sparkles size={48} color="var(--primary)" />
          <h1>AI Productivity Hub</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Smart tools for organizing your digital life
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1rem', color: 'var(--danger)', fontSize: '0.875rem' }} role="alert">
              {error}
            </div>
          )}

          {isRegister && (
            <div className="form-group">
              <label className="form-label" htmlFor="name"><User size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Name</label>
              <input id="name" type="text" className="form-input" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} required aria-required="true" />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email"><Mail size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Email</label>
            <input id="email" type="email" className="form-input" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required aria-required="true" />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><Lock size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Password</span>
              {!isRegister && (
                <Link to="/forgot-password" style={{ color: 'var(--primary)', fontSize: '0.8rem', textDecoration: 'none' }}>Forgot Password?</Link>
              )}
            </label>
            <input id="password" type="password" className="form-input" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required aria-required="true" minLength={isRegister ? 6 : undefined} />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
            {loading ? (isRegister ? 'Creating account...' : 'Signing in...') : (isRegister ? 'Create Account' : 'Sign In')}
          </button>

          {!isRegister && (
            <button type="button" className="btn auto-fill-btn" onClick={handleAutoFill}>
              <Zap size={18} /> Auto-Fill Demo Credentials
            </button>
          )}
        </form>

        {/* Toggle Register / Login */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button onClick={() => { setIsRegister(!isRegister); setError(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.875rem' }}>
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
          </button>
        </div>

        {!isRegister && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--dark)', borderRadius: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text)' }}>Demo Account:</strong><br />
            Email: demo@example.com<br />
            Password: demo123
          </div>
        )}

        {/* Footer Links */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem', fontSize: '0.75rem' }}>
          <Link to="/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Privacy Policy</Link>
          <Link to="/terms" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Terms of Service</Link>
          <Link to="/contact" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Contact</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
