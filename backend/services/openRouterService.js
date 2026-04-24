const fetch = require('node-fetch');
require('dotenv').config({ path: '../.env' });

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function callOpenRouter(prompt, systemPrompt = '') {
  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
        'X-Title': 'AI Productivity Hub'
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        max_tokens: 10000,
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || 'OpenRouter API error');
    }

    return {
      success: true,
      content: data.choices?.[0]?.message?.content || '',
      model: data.model,
      usage: data.usage,
      raw: data
    };
  } catch (error) {
    console.error('OpenRouter API Error:', error);
    return {
      success: false,
      error: error.message,
      content: null
    };
  }
}

// AI Functions for each feature

async function categorizeBookmark(bookmark) {
  const systemPrompt = `You are an AI assistant that categorizes bookmarks.
  Respond with a JSON object containing:
  - category: one of [Technology, News, Social, Entertainment, Shopping, Education, Finance, Health, Travel, Food, Sports, Business, Other]
  - summary: a brief 1-2 sentence summary of what this site is about
  - tags: an array of 3-5 relevant tags`;

  const prompt = `Categorize this bookmark:
  Title: ${bookmark.title}
  URL: ${bookmark.url}
  Description: ${bookmark.description || 'No description'}`;

  const result = await callOpenRouter(prompt, systemPrompt);

  if (result.success) {
    try {
      const parsed = JSON.parse(result.content.replace(/```json\n?|\n?```/g, ''));
      return { ...result, parsed };
    } catch {
      return { ...result, parsed: { category: 'Other', summary: result.content, tags: [] } };
    }
  }
  return result;
}

async function suggestFileOrganization(file) {
  const systemPrompt = `You are an AI file organization expert.
  Respond with a JSON object containing:
  - suggestedFolder: the recommended folder path
  - category: the file category [Documents, Images, Videos, Music, Code, Archives, Spreadsheets, Presentations, Other]
  - reason: a brief explanation of why this organization makes sense`;

  const prompt = `Suggest organization for this file:
  Filename: ${file.filename}
  Extension: ${file.extension}
  Current Folder: ${file.current_folder}
  Size: ${file.size_bytes} bytes`;

  const result = await callOpenRouter(prompt, systemPrompt);

  if (result.success) {
    try {
      const parsed = JSON.parse(result.content.replace(/```json\n?|\n?```/g, ''));
      return { ...result, parsed };
    } catch {
      return { ...result, parsed: { suggestedFolder: file.current_folder, category: 'Other', reason: result.content } };
    }
  }
  return result;
}

async function auditPassword(passwordInfo) {
  const systemPrompt = `You are a cybersecurity expert analyzing password security.
  Respond with a JSON object containing:
  - strengthScore: number 1-100
  - strengthLabel: one of [Very Weak, Weak, Fair, Strong, Very Strong]
  - recommendations: array of specific security recommendations
  - riskFactors: array of identified security risks
  - priority: one of [Critical, High, Medium, Low]`;

  const prompt = `Analyze password security for:
  Site: ${passwordInfo.site_name}
  Has 2FA: ${passwordInfo.has_2fa ? 'Yes' : 'No'}
  Last Changed: ${passwordInfo.last_changed || 'Unknown'}
  Password Length: ${passwordInfo.password_length || 'Unknown'} characters
  Has Special Characters: ${passwordInfo.has_special ? 'Yes' : 'No'}
  Has Numbers: ${passwordInfo.has_numbers ? 'Yes' : 'No'}
  Has Uppercase: ${passwordInfo.has_uppercase ? 'Yes' : 'No'}`;

  const result = await callOpenRouter(prompt, systemPrompt);

  if (result.success) {
    try {
      const parsed = JSON.parse(result.content.replace(/```json\n?|\n?```/g, ''));
      return { ...result, parsed };
    } catch {
      return { ...result, parsed: { strengthScore: 50, strengthLabel: 'Fair', recommendations: [result.content], riskFactors: [], priority: 'Medium' } };
    }
  }
  return result;
}

async function analyzeScreenTime(screenTimeData) {
  const systemPrompt = `You are a digital wellness coach analyzing screen time patterns.
  Respond with a JSON object containing:
  - productivityScore: number 1-100
  - insights: array of 3-5 observations about usage patterns
  - recommendations: array of actionable tips to improve digital wellness
  - concernAreas: apps or categories that need attention
  - dailyGoal: recommended daily screen time limit in minutes`;

  const prompt = `Analyze this screen time data:
  ${JSON.stringify(screenTimeData, null, 2)}`;

  const result = await callOpenRouter(prompt, systemPrompt);

  if (result.success) {
    try {
      const parsed = JSON.parse(result.content.replace(/```json\n?|\n?```/g, ''));
      return { ...result, parsed };
    } catch {
      return { ...result, parsed: { productivityScore: 50, insights: [result.content], recommendations: [], concernAreas: [], dailyGoal: 120 } };
    }
  }
  return result;
}

async function generateFocusTip(sessionInfo) {
  const systemPrompt = `You are a productivity and focus coach.
  Respond with a JSON object containing:
  - focusTip: a motivational and practical tip for the current focus session
  - techniques: array of 2-3 focus techniques relevant to the task
  - breakSuggestion: what to do during the break
  - environmentTips: suggestions for optimal focus environment
  - motivationalQuote: an inspiring quote about focus or productivity`;

  const prompt = `Generate focus tips for this session:
  Session Name: ${sessionInfo.session_name}
  Duration: ${sessionInfo.duration_minutes} minutes
  Target Pomodoros: ${sessionInfo.target_pomodoros}
  Notes: ${sessionInfo.notes || 'None'}`;

  const result = await callOpenRouter(prompt, systemPrompt);

  if (result.success) {
    try {
      const parsed = JSON.parse(result.content.replace(/```json\n?|\n?```/g, ''));
      return { ...result, parsed };
    } catch {
      return { ...result, parsed: { focusTip: result.content, techniques: [], breakSuggestion: 'Take a short walk', environmentTips: [], motivationalQuote: '' } };
    }
  }
  return result;
}

module.exports = {
  callOpenRouter,
  categorizeBookmark,
  suggestFileOrganization,
  auditPassword,
  analyzeScreenTime,
  generateFocusTip
};
