import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Bookmark, FolderOpen, Shield, Smartphone, Timer, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { completeOnboarding } from '../services/api';

function Onboarding() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const steps = [
    {
      icon: Sparkles,
      color: 'var(--primary)',
      title: 'Welcome to AI Productivity Hub!',
      description: 'Your all-in-one AI-powered productivity suite. Let us show you around.',
      details: [
        'AI-powered tools for organizing your digital life',
        'Smart categorization and recommendations',
        'Track your habits and improve productivity',
        'All your data is private and secure'
      ]
    },
    {
      icon: Bookmark,
      color: '#6366f1',
      title: 'Bookmark Organizer',
      description: 'Never lose a bookmark again. AI automatically categorizes and summarizes your saved links.',
      details: [
        'Auto-categorize bookmarks with AI',
        'Get smart summaries of saved pages',
        'Search and filter your collection',
        'Export bookmarks in multiple formats'
      ]
    },
    {
      icon: FolderOpen,
      color: '#10b981',
      title: 'File Organizer',
      description: 'AI suggests the perfect folder structure for your files. Upload and organize effortlessly.',
      details: [
        'AI-powered folder suggestions',
        'Drag and drop file uploads',
        'Track file locations and status',
        'Batch organization tools'
      ]
    },
    {
      icon: Shield,
      color: '#f59e0b',
      title: 'Password Auditor',
      description: 'Keep your accounts safe. AI audits password strength and flags security risks.',
      details: [
        'Password strength scoring',
        'Breach detection alerts',
        'Reuse and 2FA tracking',
        'Actionable security recommendations'
      ]
    },
    {
      icon: Smartphone,
      color: '#ec4899',
      title: 'Digital Detox Coach',
      description: 'Take control of your screen time. Track, limit, and block distracting apps.',
      details: [
        'Track screen time by app',
        'Set daily usage limits',
        'Block distracting apps',
        'AI wellness insights'
      ]
    },
    {
      icon: Timer,
      color: '#3b82f6',
      title: 'Focus Timer',
      description: 'Boost your productivity with AI-enhanced Pomodoro technique.',
      details: [
        'Customizable focus sessions',
        'AI-generated focus tips',
        'Track completed pomodoros',
        'Productivity ratings and stats'
      ]
    }
  ];

  const handleComplete = async () => {
    try {
      await completeOnboarding();
      navigate('/');
    } catch (error) {
      navigate('/');
    }
  };

  const currentStep = steps[step];
  const Icon = currentStep.icon;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--dark)', padding: '2rem' }}>
      <div style={{ maxWidth: 600, width: '100%' }}>
        {/* Progress */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', justifyContent: 'center' }}>
          {steps.map((_, i) => (
            <div key={i} style={{ width: 40, height: 4, borderRadius: 2, background: i <= step ? 'var(--primary)' : 'var(--dark-lighter)', transition: 'background 0.3s' }} />
          ))}
        </div>

        {/* Card */}
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: `${currentStep.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <Icon size={40} color={currentStep.color} />
          </div>

          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>{currentStep.title}</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '1rem' }}>{currentStep.description}</p>

          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
            {currentStep.details.map((detail, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${currentStep.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={14} color={currentStep.color} />
                </div>
                <span style={{ color: 'var(--text)' }}>{detail}</span>
              </div>
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/')} style={{ flex: 1 }}>
              <ArrowLeft size={18} />{step > 0 ? 'Previous' : 'Skip'}
            </button>
            {step < steps.length - 1 ? (
              <button className="btn btn-primary" onClick={() => setStep(s => s + 1)} style={{ flex: 1 }}>
                Next <ArrowRight size={18} />
              </button>
            ) : (
              <button className="btn btn-success" onClick={handleComplete} style={{ flex: 1 }}>
                Get Started <Sparkles size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Skip button */}
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button onClick={handleComplete} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.875rem' }}>
            Skip tutorial
          </button>
        </div>
      </div>
    </div>
  );
}

export default Onboarding;
