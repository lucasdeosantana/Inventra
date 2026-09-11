import fs from 'node:fs';
import path from 'node:path';

import { getDatabase } from '../connection/index.js';

const migrationDir = path.resolve(process.cwd(), 'src', 'database', 'migrations');

export function runMigrations() {
  const db = getDatabase();
  const files = fs
    .readdirSync(migrationDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const applied = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'").get();

  if (!applied) {
    db.exec(`
      CREATE TABLE schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  const alreadyApplied = new Set(
    (db.prepare('SELECT version FROM schema_migrations').all() as Array<{ version: string }>).map((row) => row.version),
  );

  for (const file of files) {
    const version = file.replace(/\.sql$/, '');
    if (alreadyApplied.has(version)) {
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
    db.exec(sql);
    db.prepare('INSERT INTO schema_migrations(version) VALUES (?)').run(version);
  }
}
