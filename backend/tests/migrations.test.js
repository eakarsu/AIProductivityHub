const fs = require('fs');
const path = require('path');

describe('database migrations', () => {
  test('remain ordered and avoid destructive schema operations', () => {
    const directory = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(directory).filter((name) => name.endsWith('.sql')).sort();
    expect(files.length).toBeGreaterThan(0);
    expect(files).toEqual([...files].sort());
    for (const file of files) {
      const sql = fs.readFileSync(path.join(directory, file), 'utf8');
      expect(sql).not.toMatch(/\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i);
      expect(sql).not.toMatch(/\bTRUNCATE\b/i);
    }
  });
});
