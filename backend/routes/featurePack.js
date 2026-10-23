'use strict';
const express = require('express');
const { filterRecords, exportRecords, resolveAi } = require('../services/featurePack');
const AI_DEFS = [
  { key: 'task-prioritization', title: 'Task prioritization', compute: (r) => { const open=r.filter(x=>x.status!=='completed'); return {label:'Task prioritization', openRecords:open.length, urgentOpen:open.filter(x=>x.priority==='urgent').length, highOpen:open.filter(x=>x.priority==='high').length, completedRecords:r.length-open.length}; } },
  { key: 'overdue-focus', title: 'Overdue focus', compute: (r) => { const now=new Date().toISOString(); const overdue=r.filter(x=>x.due_at&&String(x.due_at)<now&&x.status!=='completed'); return {label:'Overdue focus', overdueRecords:overdue.length, overdueTitles:overdue.map(x=>x.title||x.name||''), hasOverdue:overdue.length>0}; } },
  { key: 'workload-balance', title: 'Workload balance', compute: (r) => { return {label:'Workload balance', blockedRecords:r.filter(x=>x.status==='blocked').length, inProgressRecords:r.filter(x=>x.status==='in_progress').length, completionPct:r.length?Math.round(r.filter(x=>x.status==='completed').length/r.length*100):0}; } },
];
module.exports = function createFeaturePackRouter(authenticate, options = {}) {
  const router = express.Router();
  if (authenticate) router.use(authenticate);
  const load = options.loadRecords || (async () => []);
  router.get('/records', async (req, res) => res.json({ items: filterRecords(await load(req), req.query) }));
  router.get('/export', async (req, res) => { const out = exportRecords(filterRecords(await load(req), req.query), req.query.format); res.setHeader('Content-Type', out.contentType); res.setHeader('Content-Disposition', `attachment; filename="${out.filename}"`); return res.send(out.body); });
  router.get('/tasks/export', async (req, res) => { const out = exportRecords(filterRecords(await load(req), req.query), req.query.format); res.setHeader('Content-Type', out.contentType); return res.send(out.body); });
  router.post('/ai/:kind', async (req, res) => { const records = Array.isArray(req.body?.records) ? req.body.records : await load(req); const result = await resolveAi(req.params.kind, AI_DEFS, records); return result ? res.json(result) : res.status(404).json({ error: 'Unknown AI feature' }); });
  return router;
};
module.exports.AI_DEFS = AI_DEFS;
