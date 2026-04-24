import React from 'react';
import { Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title"><Shield size={28} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Privacy Policy</h1>
          <p className="page-subtitle">Last updated: February 2026</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}><ArrowLeft size={18} /> Back</button>
      </div>

      <div className="card" style={{ maxWidth: 800 }}>
        <div style={{ lineHeight: 1.8, color: 'var(--text)' }}>
          <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>1. Information We Collect</h2>
          <p>AI Productivity Hub collects the following types of information:</p>
          <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
            <li><strong>Account Information:</strong> Email address, name, and encrypted password when you register.</li>
            <li><strong>Profile Data:</strong> Optional information like phone number, bio, timezone, and language preferences.</li>
            <li><strong>Usage Data:</strong> Bookmarks, files metadata, password audit entries, screen time data, and focus sessions you create.</li>
            <li><strong>AI Analysis Data:</strong> Inputs and outputs from AI-powered features are stored to improve your experience.</li>
            <li><strong>Log Data:</strong> IP address, browser type, and access times for security and analytics.</li>
          </ul>

          <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>2. How We Use Your Information</h2>
          <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
            <li>To provide, maintain, and improve our services</li>
            <li>To personalize your experience with AI-powered recommendations</li>
            <li>To send notifications about your account and productivity insights</li>
            <li>To protect against unauthorized access and ensure security</li>
            <li>To analyze usage patterns and improve our features</li>
          </ul>

          <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>3. Data Storage and Security</h2>
          <p style={{ marginBottom: '1.5rem' }}>Your data is stored in encrypted PostgreSQL databases. Passwords are hashed using bcrypt with salt rounds. All API communications are secured with JWT tokens. We implement rate limiting, input validation, and security headers to protect your data.</p>

          <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>4. AI Processing</h2>
          <p style={{ marginBottom: '1.5rem' }}>We use OpenRouter AI services to power features like bookmark categorization, file organization suggestions, password security audits, screen time analysis, and focus tips. Your data is sent to AI services only when you explicitly request analysis. We do not use your data to train AI models.</p>

          <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>5. Data Sharing</h2>
          <p style={{ marginBottom: '1.5rem' }}>We do not sell, trade, or rent your personal information. Data may be shared only with AI service providers (OpenRouter) for feature functionality, and with law enforcement if required by law.</p>

          <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>6. Your Rights</h2>
          <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
            <li><strong>Access:</strong> You can view all your data through your profile and export features.</li>
            <li><strong>Export:</strong> Export all your data in JSON or CSV format at any time.</li>
            <li><strong>Delete:</strong> Request complete deletion of your account and all associated data.</li>
            <li><strong>Update:</strong> Modify your personal information through your profile settings.</li>
          </ul>

          <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>7. Cookies and Local Storage</h2>
          <p style={{ marginBottom: '1.5rem' }}>We use localStorage to store your authentication token and user preferences. No third-party tracking cookies are used.</p>

          <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>8. Contact Us</h2>
          <p>If you have questions about this Privacy Policy, please contact us through the <a href="/contact" style={{ color: 'var(--primary)' }}>Contact page</a> or email privacy@aiproductivityhub.com.</p>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
