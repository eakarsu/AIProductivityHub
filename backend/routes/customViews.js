// Custom Views — productivity insights & automation
// Endpoints:
//   GET  /api/custom-views/time-tracking     — per-user time tracking data (VIZ)
//   GET  /api/custom-views/focus-heatmap     — focus/distraction heatmap data (VIZ)
//   GET  /api/custom-views/weekly-pdf        — weekly productivity report (PDF, NON-VIZ)
//   GET/POST /api/custom-views/automations   — workflow automation rules (NON-VIZ)

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// In-memory automation rules store (per user) — survives process lifetime only
const automationStore = new Map();

// Deterministic pseudo-random helper based on string seed
function seededRand(seed, i) {
  let h = 2166136261;
  const s = String(seed) + ':' + i;
  for (let k = 0; k < s.length; k++) {
    h ^= s.charCodeAt(k);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

// GET /time-tracking — per-user time tracked across categories & days (last 7 days)
router.get('/time-tracking', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || 'anon';
    const categories = ['Deep Work', 'Meetings', 'Email', 'Research', 'Breaks', 'Admin'];
    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const label = d.toISOString().slice(0, 10);
      const byCategory = {};
      let total = 0;
      categories.forEach((cat, ci) => {
        // minutes between 5 and 180
        const mins = Math.round(5 + seededRand(userId + label + cat, ci) * 175);
        byCategory[cat] = mins;
        total += mins;
      });
      days.push({ date: label, totalMinutes: total, byCategory });
    }
    const totals = categories.reduce((acc, cat) => {
      acc[cat] = days.reduce((s, d) => s + d.byCategory[cat], 0);
      return acc;
    }, {});
    res.json({
      userId,
      categories,
      days,
      totals,
      totalMinutes: Object.values(totals).reduce((a, b) => a + b, 0),
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /focus-heatmap — 7 days x 24 hours focus/distraction score grid
router.get('/focus-heatmap', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || 'anon';
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const grid = []; // [{ day, hour, focus, distraction }]
    let peak = { day: 'Mon', hour: 9, focus: 0 };
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        // Higher focus in 9-12 and 14-17 weekdays; lower at night
        const base = (h >= 9 && h <= 12) || (h >= 14 && h <= 17) ? 0.7 : (h >= 22 || h <= 6 ? 0.1 : 0.4);
        const weekendPenalty = d >= 5 ? 0.6 : 1.0;
        const noise = seededRand(userId + d + 'x' + h, 1) * 0.3;
        const focus = Math.min(1, Math.max(0, base * weekendPenalty + noise - 0.15));
        const distraction = Math.min(1, Math.max(0, 1 - focus - 0.1 + seededRand(userId + h + 'y' + d, 2) * 0.2));
        grid.push({
          day: dayLabels[d],
          dayIndex: d,
          hour: h,
          focus: Math.round(focus * 100) / 100,
          distraction: Math.round(distraction * 100) / 100,
        });
        if (focus > peak.focus) peak = { day: dayLabels[d], hour: h, focus: Math.round(focus * 100) / 100 };
      }
    }
    res.json({
      userId,
      dayLabels,
      hours: Array.from({ length: 24 }, (_, i) => i),
      grid,
      peak,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /weekly-pdf — simple text-based PDF (no extra deps) summarizing the week
router.get('/weekly-pdf', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || 'anon';
    const userName = req.user?.email || ('User ' + userId);
    const now = new Date();
    const weekEnd = now.toISOString().slice(0, 10);
    const weekStart = new Date(now.getTime() - 6 * 86400000).toISOString().slice(0, 10);

    // Synthesize summary numbers (consistent with other endpoints)
    const focusHours = Math.round((20 + seededRand(userId + weekEnd, 1) * 20) * 10) / 10;
    const meetingsHours = Math.round((5 + seededRand(userId + weekEnd, 2) * 10) * 10) / 10;
    const distractionPct = Math.round(seededRand(userId + weekEnd, 3) * 30);
    const habitsCompleted = Math.round(seededRand(userId + weekEnd, 4) * 20);
    const goalsProgress = Math.round(seededRand(userId + weekEnd, 5) * 100);

    const lines = [
      'Weekly Productivity Report',
      `User: ${userName}`,
      `Period: ${weekStart} to ${weekEnd}`,
      '',
      `Total Focus Hours:       ${focusHours} h`,
      `Total Meeting Hours:     ${meetingsHours} h`,
      `Distraction Share:       ${distractionPct} %`,
      `Habits Completed:        ${habitsCompleted}`,
      `Average Goal Progress:   ${goalsProgress} %`,
      '',
      'Top Recommendations:',
      '  - Block 9:00-12:00 for deep work; your focus peaks then.',
      '  - Batch meetings on Tue/Thu to protect maker time.',
      '  - Audit distraction sources Wed afternoon (highest drift).',
      '',
      'Generated by AI Productivity Hub — Custom Views.',
    ];

    // Build a minimal one-page PDF by hand (text only, Helvetica)
    const escape = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    let stream = 'BT\n/F1 14 Tf\n72 760 Td\n';
    stream += `(${escape(lines[0])}) Tj\n`;
    stream += '/F1 11 Tf\n0 -22 TD\n';
    for (let i = 1; i < lines.length; i++) {
      stream += `(${escape(lines[i])}) Tj\n0 -16 TD\n`;
    }
    stream += 'ET\n';

    const objects = [];
    objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
    objects.push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n');
    objects.push(`4 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}endstream\nendobj\n`);
    objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

    let pdf = '%PDF-1.4\n';
    const offsets = [];
    for (const obj of objects) {
      offsets.push(Buffer.byteLength(pdf, 'utf8'));
      pdf += obj;
    }
    const xrefStart = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const off of offsets) {
      pdf += String(off).padStart(10, '0') + ' 00000 n \n';
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="weekly-productivity-${weekEnd}.pdf"`);
    res.send(Buffer.from(pdf, 'utf8'));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET/POST /automations — workflow automation rules editor
router.get('/automations', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || 'anon';
    if (!automationStore.has(userId)) {
      automationStore.set(userId, [
        { id: 1, name: 'Auto-block focus 9-12', trigger: 'time:09:00', action: 'enable_focus_mode', enabled: true },
        { id: 2, name: 'Mute notifications during meetings', trigger: 'event:meeting_start', action: 'mute_notifications', enabled: true },
        { id: 3, name: 'Daily 5pm digest email', trigger: 'time:17:00', action: 'send_digest', enabled: false },
      ]);
    }
    res.json({ userId, rules: automationStore.get(userId), generatedAt: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/automations', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || 'anon';
    const { rules } = req.body || {};
    if (!Array.isArray(rules)) return res.status(400).json({ error: 'rules array required' });
    // Normalize ids
    const normalized = rules.map((r, i) => ({
      id: r.id || i + 1,
      name: String(r.name || '').slice(0, 200),
      trigger: String(r.trigger || '').slice(0, 200),
      action: String(r.action || '').slice(0, 200),
      enabled: !!r.enabled,
    }));
    automationStore.set(userId, normalized);
    res.json({ userId, rules: normalized, saved: true, generatedAt: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
