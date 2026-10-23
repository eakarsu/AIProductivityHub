const express = require('express');
const { filterRecords, exportRecords } = require('../services/featurePack');
const createRouter = require('../routes/featurePack');
describe('FP42C feature pack', () => {
  test('filter/csv preserve false/0/empty', () => {
    const rows = [{ title: 'Alpha task', status: 'backlog', flagged: false, score: 0, description: '' }];
    expect(filterRecords(rows, { search: 'alpha' })[0].flagged).toBe(false);
    expect(exportRecords(rows, 'csv').body).toContain('false');
  });
  test('AI fallback over injected tasks and csv export', async () => {
    delete process.env.OPENROUTER_API_KEY; delete process.env.OPENAI_API_KEY;
    const app = express(); app.use(express.json());
    app.use((req, res, next) => { req.user = { id: 1 }; next(); });
    app.use('/fp', createRouter(null, { loadRecords: async () => [{ title: 'Urgent fix', status: 'in_progress', priority: 'urgent' }, { title: 'Done thing', status: 'completed', priority: 'low' }] }));
    const s = app.listen(0); const base = `http://127.0.0.1:${s.address().port}`;
    try {
      const csv = await fetch(`${base}/fp/tasks/export?format=csv`); expect(csv.headers.get('content-type')).toMatch(/text\/csv/);
      const ai = await (await fetch(`${base}/fp/ai/task-prioritization`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).json();
      expect(ai.aiGenerated).toBe(false); expect(ai.sections['Task prioritization'].urgentOpen).toBe(1);
    } finally { s.close(); }
  });
});
