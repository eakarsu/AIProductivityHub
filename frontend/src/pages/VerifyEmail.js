import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { verifyEmail } from '../services/api';

function VerifyEmail() {
  const [status, setStatus] = useState('Verifying your email address…');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setStatus('The verification link is missing its token.');
      return;
    }
    verifyEmail(token)
      .then(() => { setSuccess(true); setStatus('Your email address is verified.'); })
      .catch((error) => setStatus(error.response?.data?.error || 'The verification link is invalid or expired.'));
  }, []);

  return (
    <div className="login-container">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <MailCheck size={48} color={success ? 'var(--success)' : 'var(--primary)'} />
        <h1>Email verification</h1>
        <p style={{ color: 'var(--text-muted)' }} role="status">{status}</p>
        <Link className="btn btn-primary" to="/login">Continue to sign in</Link>
      </div>
    </div>
  );
}

export default VerifyEmail;
