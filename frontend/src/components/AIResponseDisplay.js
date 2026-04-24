import React from 'react';
import { Sparkles, CheckCircle, AlertTriangle, Info, Target, Lightbulb, TrendingUp } from 'lucide-react';

function AIResponseDisplay({ response, title = "AI Analysis" }) {
  if (!response) return null;

  const { success, content, parsed, model, usage, error } = response;

  if (!success) {
    return (
      <div className="ai-response" style={{ borderColor: 'var(--danger)' }}>
        <div className="ai-response-header">
          <AlertTriangle size={20} color="var(--danger)" />
          <span style={{ color: 'var(--danger)' }}>AI Analysis Failed</span>
        </div>
        <div className="ai-content">
          <p>{error || 'Unable to get AI analysis. Please check your API key.'}</p>
        </div>
      </div>
    );
  }

  // Parse the content if it's a string that looks like JSON
  let displayData = parsed;
  if (!displayData && content) {
    try {
      displayData = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));
    } catch {
      displayData = null;
    }
  }

  return (
    <div className="ai-response">
      <div className="ai-response-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Sparkles size={20} color="var(--primary)" />
          <span className="ai-badge">AI Powered</span>
          <span style={{ fontWeight: 600 }}>{title}</span>
        </div>
        {model && (
          <span className="ai-model">Model: {model}</span>
        )}
      </div>

      <div className="ai-content">
        {displayData ? (
          <FormattedAIContent data={displayData} />
        ) : (
          <p>{content}</p>
        )}

        {usage && (
          <div style={{
            marginTop: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            display: 'flex',
            gap: '1rem'
          }}>
            <span>Tokens used: {usage.total_tokens || 0}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function FormattedAIContent({ data }) {
  if (!data || typeof data !== 'object') {
    return <p>{String(data)}</p>;
  }

  const renderValue = (key, value) => {
    if (Array.isArray(value)) {
      return (
        <div key={key} style={{ marginBottom: '1rem' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {getIconForKey(key)}
            {formatLabel(key)}
          </h4>
          <ul>
            {value.map((item, index) => (
              <li key={index}>{typeof item === 'object' ? JSON.stringify(item) : item}</li>
            ))}
          </ul>
        </div>
      );
    }

    if (typeof value === 'object' && value !== null) {
      return (
        <div key={key} style={{ marginBottom: '1rem' }}>
          <h4>{formatLabel(key)}</h4>
          <div style={{ paddingLeft: '1rem' }}>
            {Object.entries(value).map(([k, v]) => renderValue(k, v))}
          </div>
        </div>
      );
    }

    if (typeof value === 'number' && (key.toLowerCase().includes('score') || key.toLowerCase().includes('rating'))) {
      return (
        <div key={key} className="ai-score">
          <div className="score-circle" style={{
            borderColor: getScoreColor(value)
          }}>
            {value}
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{formatLabel(key)}</div>
            <div className="score-label">{getScoreLabel(value)}</div>
          </div>
        </div>
      );
    }

    if (typeof value === 'boolean') {
      return (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          {value ? (
            <CheckCircle size={16} color="var(--success)" />
          ) : (
            <AlertTriangle size={16} color="var(--warning)" />
          )}
          <span>{formatLabel(key)}: {value ? 'Yes' : 'No'}</span>
        </div>
      );
    }

    // String values
    const isLongText = typeof value === 'string' && value.length > 100;

    return (
      <div key={key} style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
          {getIconForKey(key)}
          <div>
            <span style={{ fontWeight: 500, color: 'var(--primary-light)' }}>{formatLabel(key)}: </span>
            {isLongText ? (
              <p style={{ marginTop: '0.25rem', color: 'var(--text)' }}>{value}</p>
            ) : (
              <span style={{ color: 'var(--text)' }}>{value}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {Object.entries(data).map(([key, value]) => renderValue(key, value))}
    </div>
  );
}

function formatLabel(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
    .trim();
}

function getIconForKey(key) {
  const lowerKey = key.toLowerCase();
  if (lowerKey.includes('recommendation') || lowerKey.includes('suggestion') || lowerKey.includes('tip')) {
    return <Lightbulb size={16} color="var(--warning)" />;
  }
  if (lowerKey.includes('insight')) {
    return <Info size={16} color="var(--primary)" />;
  }
  if (lowerKey.includes('goal') || lowerKey.includes('target')) {
    return <Target size={16} color="var(--success)" />;
  }
  if (lowerKey.includes('score') || lowerKey.includes('productivity')) {
    return <TrendingUp size={16} color="var(--primary)" />;
  }
  if (lowerKey.includes('risk') || lowerKey.includes('concern') || lowerKey.includes('warning')) {
    return <AlertTriangle size={16} color="var(--danger)" />;
  }
  return null;
}

function getScoreColor(score) {
  if (score >= 80) return 'var(--success)';
  if (score >= 60) return 'var(--primary)';
  if (score >= 40) return 'var(--warning)';
  return 'var(--danger)';
}

function getScoreLabel(score) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Fair';
  return 'Needs Improvement';
}

export default AIResponseDisplay;
