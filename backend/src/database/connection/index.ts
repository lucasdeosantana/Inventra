import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

import { appConfig } from '../../config/index.js';

let db: ReturnType<typeof Database> | null = null;

function ensureDatabase() {
  if (!db) {
    const dataDir = path.dirname(appConfig.dbPath);

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(appConfig.dbPath);
    db.pragma('foreign_keys = ON');
  }

  return db;
}

export function getDatabase() {
  return ensureDatabase();
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}
