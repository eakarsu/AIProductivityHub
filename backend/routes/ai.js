const express = require('express');
const pool = require('../db');
const authMiddleware = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/cache');
const { callOpenRouter, parseAIJson } = require('../services/openRouterService');
const { aiRateLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

// Helper: persist AI result
async function persistAIResult(userId, endpoint, inputData, result) {
  try {
    await pool.query(
      `INSERT INTO ai_results (user_id, endpoint, input_data, result, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [userId, endpoint, JSON.stringify(inputData), JSON.stringify(result)]
    );
  } catch (e) { /* non-blocking */ }
}

// Helper: log AI usage
async function logAIUsage(userId, endpoint, result) {
  try {
    const usage = result?.usage || {};
    const tokensInput = usage.prompt_tokens || 0;
    const tokensOutput = usage.completion_tokens || 0;
    const costUsd = (tokensInput * 3 / 1_000_000) + (tokensOutput * 15 / 1_000_000);
    await pool.query(
      `INSERT INTO ai_usage (user_id, endpoint, tokens_used, cost_estimate, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [userId, endpoint, tokensInput + tokensOutput, costUsd]
    );
  } catch (e) { /* non-blocking */ }
}

// General AI query
router.post('/query', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const { prompt, systemPrompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const aiResult = await callOpenRouter(prompt, systemPrompt);

    // Store in history + ai_results
    await pool.query(
      `INSERT INTO ai_analysis_history (user_id, feature_type, input_data, output_data, model_used)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, 'general', JSON.stringify({ prompt, systemPrompt }), JSON.stringify(aiResult), aiResult.model]
    );
    await persistAIResult(req.user.id, '/ai/query', { prompt, systemPrompt }, aiResult);
    await logAIUsage(req.user.id, '/ai/query', aiResult);

    res.json(aiResult);
  } catch (error) {
    console.error('AI query error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get AI history (with pagination)
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { feature_type } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM ai_analysis_history WHERE user_id = $1';
    const params = [req.user.id];

    if (feature_type) {
      query += ' AND feature_type = $2';
      params.push(feature_type);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Get AI history error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Dashboard insights (cached 2 minutes)
router.get('/dashboard-insights', authMiddleware, cacheMiddleware(120), async (req, res) => {
  try {
    const [bookmarks, files, passwords, screenTime, focusSessions] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM bookmarks WHERE user_id = $1', [req.user.id]),
      pool.query('SELECT COUNT(*) as count FROM files WHERE user_id = $1', [req.user.id]),
      pool.query('SELECT COUNT(*) as count, AVG(strength_score) as avg_strength FROM passwords WHERE user_id = $1', [req.user.id]),
      pool.query('SELECT SUM(actual_usage_minutes) as total FROM screen_time WHERE user_id = $1 AND date = CURRENT_DATE', [req.user.id]),
      pool.query('SELECT SUM(completed_pomodoros) as total FROM focus_sessions WHERE user_id = $1 AND status = \'completed\'', [req.user.id])
    ]);

    const stats = {
      bookmarks: parseInt(bookmarks.rows[0].count),
      files: parseInt(files.rows[0].count),
      passwords: { count: parseInt(passwords.rows[0].count), avgStrength: parseFloat(passwords.rows[0].avg_strength) || 0 },
      screenTime: parseInt(screenTime.rows[0].total) || 0,
      focusPomodoros: parseInt(focusSessions.rows[0].total) || 0
    };

    const prompt = `Based on these user productivity stats, provide 3-5 brief, actionable insights.
Stats: bookmarks=${stats.bookmarks}, files=${stats.files}, passwords=${stats.passwords.count} (avg score: ${stats.passwords.avgStrength.toFixed(0)}), screen_time_today=${stats.screenTime}min, focus_pomodoros=${stats.focusPomodoros}

Respond ONLY with JSON:
{ "insights": ["<insight 1>", "<insight 2>", "<insight 3>"], "overallScore": <1-100>, "topRecommendation": "<single most important action>" }`;

    const aiResult = await callOpenRouter(prompt, 'You are a productivity coach.');
    const parsed = parseAIJson(aiResult.content || aiResult);
    await persistAIResult(req.user.id, '/ai/dashboard-insights', stats, parsed || aiResult);
    await logAIUsage(req.user.id, '/ai/dashboard-insights', aiResult);

    res.json({ stats, aiInsights: parsed || aiResult });
  } catch (error) {
    console.error('Dashboard insights error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cross-tool insights
router.post('/cross-insights', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    const [tasks, notes, habits, timeLogs] = await Promise.all([
      pool.query('SELECT session_name, status, completed_pomodoros, target_pomodoros FROM focus_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10', [userId]),
      pool.query('SELECT title, category FROM bookmarks WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10', [userId]).catch(() => ({ rows: [] })),
      pool.query('SELECT name, frequency, target_count FROM habits WHERE user_id = $1', [userId]).catch(() => ({ rows: [] })),
      pool.query('SELECT app_name, actual_usage_minutes, date FROM screen_time WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL \'7 days\'', [userId]).catch(() => ({ rows: [] }))
    ]);

    const prompt = `Analyze this user's cross-tool productivity data and synthesize actionable recommendations.

FOCUS SESSIONS (recent):
${tasks.rows.map(t => `- ${t.session_name}: ${t.completed_pomodoros}/${t.target_pomodoros} pomodoros (${t.status})`).join('\n') || 'None'}

BOOKMARKS (recent topics):
${notes.rows.map(n => `- ${n.title} [${n.category || 'uncategorized'}]`).join('\n') || 'None'}

HABITS:
${habits.rows.map(h => `- ${h.name}: ${h.frequency}, target ${h.target_count}/day`).join('\n') || 'None tracked'}

SCREEN TIME (7 days):
${timeLogs.rows.map(t => `- ${t.app_name}: ${t.actual_usage_minutes}min on ${t.date}`).join('\n') || 'None'}

Respond ONLY with JSON:
{
  "productivity_score": <1-100>,
  "key_observations": ["<obs 1>", "<obs 2>", "<obs 3>"],
  "cross_tool_patterns": "<pattern you see across tasks/habits/screen time>",
  "priority_recommendations": [
    { "area": "<focus|habits|screen_time|bookmarks>", "action": "<specific action>", "impact": "high|medium|low" }
  ],
  "weekly_goal": "<one specific measurable goal for this week>"
}`;

    const aiResult = await callOpenRouter(prompt, 'You are an expert productivity coach who analyzes cross-domain behavioral patterns.');
    const parsed = parseAIJson(aiResult.content || aiResult);
    await persistAIResult(userId, '/ai/cross-insights', { user_id: userId }, parsed || aiResult);
    await logAIUsage(userId, '/ai/cross-insights', aiResult);

    res.json({ insights: parsed || aiResult, raw: aiResult.content || aiResult });
  } catch (error) {
    console.error('Cross-insights error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Weekly digest
router.post('/weekly-digest', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    const [completedTasks, timeLogs, habitLogs, goals] = await Promise.all([
      pool.query(`SELECT session_name, completed_pomodoros, target_pomodoros, productivity_rating, ended_at
        FROM focus_sessions WHERE user_id = $1 AND status = 'completed' AND ended_at >= NOW() - INTERVAL '7 days'`, [userId]),
      pool.query(`SELECT app_name, SUM(actual_usage_minutes) as total_minutes FROM screen_time
        WHERE user_id = $1 AND date >= CURRENT_DATE - 7 GROUP BY app_name ORDER BY total_minutes DESC LIMIT 10`, [userId]),
      pool.query(`SELECT h.name, COUNT(hl.id) as completions FROM habits h
        LEFT JOIN habit_logs hl ON h.id = hl.habit_id AND hl.logged_at >= NOW() - INTERVAL '7 days'
        WHERE h.user_id = $1 GROUP BY h.id, h.name`, [userId]).catch(() => ({ rows: [] })),
      pool.query(`SELECT title, target_date, progress_pct, status FROM goals WHERE user_id = $1`, [userId]).catch(() => ({ rows: [] }))
    ]);

    const prompt = `Generate a personalized weekly productivity digest and next week priorities.

COMPLETED FOCUS SESSIONS this week:
${completedTasks.rows.map(t => `- "${t.session_name}": ${t.completed_pomodoros} pomodoros, rating: ${t.productivity_rating || 'N/A'}/5`).join('\n') || 'None'}

SCREEN TIME breakdown:
${timeLogs.rows.map(t => `- ${t.app_name}: ${t.total_minutes} min`).join('\n') || 'No data'}

HABIT COMPLETIONS this week:
${habitLogs.rows.map(h => `- ${h.name}: ${h.completions} times`).join('\n') || 'No habits tracked'}

ACTIVE GOALS:
${goals.rows.map(g => `- ${g.title}: ${g.progress_pct}% (${g.status}, due ${g.target_date || 'no date'})`).join('\n') || 'No goals'}

Respond ONLY with JSON:
{
  "week_summary": "<2-3 sentence summary of how the week went>",
  "wins": ["<win 1>", "<win 2>"],
  "areas_to_improve": ["<area 1>", "<area 2>"],
  "productivity_score": <1-100>,
  "next_week_priorities": [
    { "priority": 1, "task": "<specific task>", "reasoning": "<why this matters>" }
  ],
  "habit_insights": "<observation about habit consistency>",
  "focus_insights": "<observation about focus session quality>",
  "motivational_message": "<personalized encouragement>"
}`;

    const aiResult = await callOpenRouter(prompt, 'You are a personal productivity coach creating a weekly review.');
    const parsed = parseAIJson(aiResult.content || aiResult);
    await persistAIResult(userId, '/ai/weekly-digest', { user_id: userId }, parsed || aiResult);
    await logAIUsage(userId, '/ai/weekly-digest', aiResult);

    res.json({ digest: parsed || aiResult, raw: aiResult.content || aiResult });
  } catch (error) {
    console.error('Weekly digest error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Focus session analysis
router.post('/focus-analysis', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    const sessions = await pool.query(
      `SELECT session_name, duration_minutes, completed_pomodoros, target_pomodoros, productivity_rating, started_at, ended_at, notes
       FROM focus_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [userId]
    );

    if (sessions.rows.length === 0) {
      return res.status(400).json({ error: 'No focus sessions found to analyze' });
    }

    const prompt = `Analyze these focus session patterns and provide deep productivity insights.

FOCUS SESSIONS:
${sessions.rows.map(s => `- "${s.session_name}": ${s.completed_pomodoros}/${s.target_pomodoros} pomodoros, ${s.duration_minutes}min, rating: ${s.productivity_rating || 'N/A'}/5`).join('\n')}

Respond ONLY with JSON:
{
  "overall_focus_score": <1-100>,
  "completion_rate": "<percentage of sessions where target pomodoros were met>",
  "best_performing_sessions": ["<session name>"],
  "patterns": {
    "optimal_session_length": "<in minutes>",
    "best_time_of_day": "<morning|afternoon|evening or unknown>",
    "average_productivity_rating": <number>
  },
  "insights": ["<insight 1>", "<insight 2>", "<insight 3>"],
  "recommendations": [
    { "recommendation": "<specific change>", "expected_benefit": "<what improves>" }
  ]
}`;

    const aiResult = await callOpenRouter(prompt, 'You are a focus and deep work expert analyzing productivity patterns.');
    const parsed = parseAIJson(aiResult.content || aiResult);
    await persistAIResult(userId, '/ai/focus-analysis', { session_count: sessions.rows.length }, parsed || aiResult);
    await logAIUsage(userId, '/ai/focus-analysis', aiResult);

    res.json({ analysis: parsed || aiResult, raw: aiResult.content || aiResult });
  } catch (error) {
    console.error('Focus analysis error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Goal progress predictor
router.post('/goal-progress-predict', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    const { goal_id } = req.body;

    let goals = [];
    try {
      const params = goal_id ? [userId, goal_id] : [userId];
      const where = goal_id ? 'WHERE user_id = $1 AND id = $2' : 'WHERE user_id = $1';
      const r = await pool.query(
        `SELECT id, title, description, target_value, current_value, unit, due_date, status, created_at
         FROM goals ${where}
         ORDER BY created_at DESC
         LIMIT 50`,
        params
      );
      goals = r.rows;
    } catch (_) {}

    let recentSessions = [];
    try {
      const r = await pool.query(
        `SELECT session_name, status, completed_pomodoros, target_pomodoros, created_at
         FROM focus_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
        [userId]
      );
      recentSessions = r.rows;
    } catch (_) {}

    const goalsBlock = goals.map(g =>
      `id=${g.id} title="${g.title}" target=${g.target_value || '?'}${g.unit || ''} current=${g.current_value || 0} due=${g.due_date || 'n/a'} status=${g.status || 'active'}`
    ).join('\n');

    const prompt = `Analyze these goals and recent focus sessions; predict completion likelihood and recommend interventions.

GOALS:
${goalsBlock || 'None'}

RECENT FOCUS SESSIONS:
${recentSessions.map(s => `- ${s.session_name}: ${s.completed_pomodoros}/${s.target_pomodoros} (${s.status})`).join('\n') || 'None'}

Respond ONLY with JSON:
{
  "predictions": [
    {"goal_id": 0, "completion_probability": 0, "predicted_completion_date": "YYYY-MM-DD", "confidence": "low|medium|high", "blockers": ["string"], "recommended_actions": ["string"]}
  ],
  "off_track_goals": [0],
  "summary": "string"
}`;

    const aiResult = await callOpenRouter(prompt, 'You are a productivity coach who predicts goal-completion likelihood.');
    const parsed = parseAIJson(aiResult.content || aiResult);
    await persistAIResult(userId, '/ai/goal-progress-predict', { goal_id }, parsed || aiResult);
    await logAIUsage(userId, '/ai/goal-progress-predict', aiResult);

    res.json({ predictions: parsed || aiResult, raw: aiResult.content || aiResult });
  } catch (err) {
    console.error('goal-progress-predict error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Usage anomaly detector
router.post('/usage-anomaly-detect', authMiddleware, aiRateLimiter, async (req, res) => {
  try {
    const userId = req.user.id;
    let usage = [];
    try {
      const r = await pool.query(
        `SELECT app_name, actual_usage_minutes, date
         FROM screen_time
         WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '30 days'
         ORDER BY date DESC, actual_usage_minutes DESC`,
        [userId]
      );
      usage = r.rows;
    } catch (_) {}

    const summary = usage.map(u => `${u.date}: ${u.app_name} ${u.actual_usage_minutes}min`).join('\n');

    const prompt = `Analyze 30-day screen-time data for unusual usage patterns (sudden spikes, drops, distraction days, late-night creep).

USAGE:
${summary || 'No data'}

Respond ONLY with JSON:
{
  "anomalies": [{"date": "YYYY-MM-DD", "app_name": "string", "type": "spike|drop|night_creep|new_app", "severity": "low|medium|high", "evidence": "string"}],
  "behavioral_trends": ["string"],
  "wellness_recommendations": ["string"],
  "summary": "string"
}`;

    const aiResult = await callOpenRouter(prompt, 'You are a digital wellbeing analyst.');
    const parsed = parseAIJson(aiResult.content || aiResult);
    await persistAIResult(userId, '/ai/usage-anomaly-detect', { user_id: userId }, parsed || aiResult);
    await logAIUsage(userId, '/ai/usage-anomaly-detect', aiResult);

    res.json({ anomalies: parsed || aiResult, raw: aiResult.content || aiResult });
  } catch (err) {
    console.error('usage-anomaly-detect error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Focus boost recommender — mechanical addition (apply pass 4)
// Recommends 3 quick interventions given recent focus sessions, screen-time and current
// time-of-day. Uses existing callOpenRouter + parseAIJson; 503 on missing OPENROUTER_API_KEY.
router.post('/focus-boost-recommend', authMiddleware, aiRateLimiter, async (req, res) => {
  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(503).json({ error: 'AI provider not configured (OPENROUTER_API_KEY missing).' });
  }
  try {
    const userId = req.user.id;
    const { current_task, energy_level, time_of_day } = req.body || {};

    let recentSessions = [];
    try {
      const r = await pool.query(
        `SELECT session_name, status, completed_pomodoros, target_pomodoros, productivity_rating, duration_minutes, created_at
         FROM focus_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
        [userId]
      );
      recentSessions = r.rows;
    } catch (_) {}

    let recentUsage = [];
    try {
      const r = await pool.query(
        `SELECT app_name, actual_usage_minutes, date
         FROM screen_time
         WHERE user_id = $1 AND date >= CURRENT_DATE - INTERVAL '7 days'
         ORDER BY date DESC, actual_usage_minutes DESC
         LIMIT 30`,
        [userId]
      );
      recentUsage = r.rows;
    } catch (_) {}

    const sessionsBlock = recentSessions
      .map(s => `- "${s.session_name}": ${s.completed_pomodoros}/${s.target_pomodoros} pomodoros, ${s.duration_minutes}min, rating ${s.productivity_rating || 'N/A'}/5, status=${s.status}`)
      .join('\n') || 'None';
    const usageBlock = recentUsage
      .map(u => `${u.date}: ${u.app_name} ${u.actual_usage_minutes}min`)
      .join('\n') || 'No data';

    const prompt = `Recommend 3 immediate, evidence-backed interventions to boost focus right now.

CURRENT TASK: ${current_task || 'unspecified'}
SELF-REPORTED ENERGY (1-10): ${energy_level || 'unknown'}
TIME OF DAY: ${time_of_day || 'unknown'}

RECENT FOCUS SESSIONS:
${sessionsBlock}

LAST 7 DAYS SCREEN TIME (top apps):
${usageBlock}

Respond ONLY with JSON:
{
  "boosts": [
    {"name": "string", "why": "string", "how": "string", "duration_minutes": 0, "expected_uplift": "low|medium|high"}
  ],
  "recommended_session_length_minutes": 0,
  "distraction_apps_to_silence": ["string"],
  "energy_strategy": "string",
  "summary": "string"
}`;

    const aiResult = await callOpenRouter(prompt, 'You are a focus coach who delivers immediately actionable productivity boosts.');
    const parsed = parseAIJson(aiResult.content || aiResult);
    await persistAIResult(userId, '/ai/focus-boost-recommend', { current_task, energy_level, time_of_day }, parsed || aiResult);
    await logAIUsage(userId, '/ai/focus-boost-recommend', aiResult);

    res.json({ boosts: parsed || aiResult, raw: aiResult.content || aiResult });
  } catch (err) {
    console.error('focus-boost-recommend error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
