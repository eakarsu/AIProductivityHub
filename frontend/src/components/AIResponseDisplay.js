import React from 'react';
import AIReport from './AIReport';

function AIResponseDisplay({ response, title = 'AI Analysis' }) {
  if (response === null || response === undefined) return null;
  if (response?.success === false || response?.ok === false) {
    return <AIReport error={response.error || 'Unable to get AI analysis.'} />;
  }
  return <AIReport response={response} title={title} />;
}

export default AIResponseDisplay;
