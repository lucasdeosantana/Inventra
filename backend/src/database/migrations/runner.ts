import fs from 'node:fs';
import path from 'node:path';

import { executeScript, queryMany, queryOne, runStatement } from '../connection/index.js';

const migrationDir = path.resolve(process.cwd(), 'src', 'database', 'migrations');

export async function runMigrations() {
  const files = fs
    .readdirSync(migrationDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const applied = await queryOne<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'");

  if (!applied) {
    await executeScript(`
      CREATE TABLE schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  const alreadyApplied = new Set(
    (await queryMany<{ version: string }>('SELECT version FROM schema_migrations')).map((row) => row.version),
  );

  for (const file of files) {
    const version = file.replace(/\.sql$/, '');
    if (alreadyApplied.has(version)) {
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
    await executeScript(sql);
    await runStatement('INSERT INTO schema_migrations(version) VALUES (?)', [version]);
  }
}
