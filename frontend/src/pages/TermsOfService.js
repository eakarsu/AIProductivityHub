import React from 'react';
import { FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title"><FileText size={28} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Terms of Service</h1>
          <p className="page-subtitle">Last updated: February 2026</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}><ArrowLeft size={18} /> Back</button>
      </div>

      <div className="card" style={{ maxWidth: 800 }}>
        <div style={{ lineHeight: 1.8, color: 'var(--text)' }}>
          <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>1. Acceptance of Terms</h2>
          <p style={{ marginBottom: '1.5rem' }}>By accessing and using AI Productivity Hub ("Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>

          <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>2. Description of Service</h2>
          <p style={{ marginBottom: '1.5rem' }}>AI Productivity Hub provides AI-powered productivity tools including bookmark organization, file management suggestions, password security auditing, digital wellness coaching, and focus timer functionality.</p>

          <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>3. User Accounts</h2>
          <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
            <li>You must provide accurate and complete registration information.</li>
            <li>You are responsible for maintaining the security of your account credentials.</li>
            <li>You must notify us immediately of any unauthorized access to your account.</li>
            <li>One person or legal entity may maintain no more than one account.</li>
          </ul>

          <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
            <li>Use the Service for any illegal purpose or in violation of any laws</li>
            <li>Attempt to gain unauthorized access to the Service or its systems</li>
            <li>Upload malicious files or content</li>
            <li>Interfere with or disrupt the Service or servers</li>
            <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
            <li>Use automated tools to scrape or collect data from the Service</li>
          </ul>

          <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>5. AI Features Disclaimer</h2>
          <p style={{ marginBottom: '1.5rem' }}>AI-powered features provide suggestions and analysis based on machine learning models. These suggestions are not guaranteed to be accurate or complete. Password security audits are informational only and should not replace professional cybersecurity advice. Users should exercise their own judgment when acting on AI recommendations.</p>

          <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>6. Data and Content</h2>
          <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
            <li>You retain ownership of all content you create or upload.</li>
            <li>You grant us a limited license to process your data to provide the Service.</li>
            <li>We do not claim ownership of your bookmarks, files, or other user content.</li>
            <li>You can export or delete your data at any time.</li>
          </ul>

          <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>7. Limitation of Liability</h2>
          <p style={{ marginBottom: '1.5rem' }}>The Service is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service.</p>

          <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>8. Termination</h2>
          <p style={{ marginBottom: '1.5rem' }}>We may terminate or suspend your account at any time for violation of these Terms. You may terminate your account at any time by requesting account deletion through the settings page.</p>

          <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>9. Changes to Terms</h2>
          <p style={{ marginBottom: '1.5rem' }}>We reserve the right to modify these Terms at any time. We will notify users of significant changes via email or in-app notifications.</p>

          <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>10. Contact</h2>
          <p>For questions about these Terms, please contact us through the <a href="/contact" style={{ color: 'var(--primary)' }}>Contact page</a>.</p>
        </div>
      </div>
    </div>
  );
}

export default TermsOfService;
