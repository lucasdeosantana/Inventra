import fs from 'node:fs';
import path from 'node:path';

import sqlite3 from 'sqlite3';

import { appConfig } from '../../config/index.js';

let db: sqlite3.Database | null = null;

function ensureDatabase() {
  if (!db) {
    const dataDir = path.dirname(appConfig.dbPath);

    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new sqlite3.Database(appConfig.dbPath);
    db.run('PRAGMA foreign_keys = ON');
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

export function queryOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  const database = getDatabase();

  return new Promise<T | undefined>((resolve, reject) => {
    database.get(sql, params, (error: Error | null, row?: T) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(row);
    });
  });
}

export function queryMany<T = Record<string, unknown>>(sql: string, params: unknown[] = []) {
  const database = getDatabase();

  return new Promise<T[]>((resolve, reject) => {
    database.all(sql, params, (error: Error | null, rows?: T[]) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows ?? []);
    });
  });
}

export function runStatement(sql: string, params: unknown[] = []) {
  const database = getDatabase();

  return new Promise<{ lastInsertRowid: number }>((resolve, reject) => {
    database.run(sql, params, function (this: { lastID?: number }, error: Error | null) {
      if (error) {
        reject(error);
        return;
      }

      resolve({ lastInsertRowid: this.lastID ?? 0 });
    });
  });
}

export function executeScript(sql: string) {
  const database = getDatabase();

  return new Promise<void>((resolve, reject) => {
    database.exec(sql, (error: Error | null) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

export async function runTransaction<T>(callback: () => Promise<T>) {
  await executeScript('BEGIN');

  try {
    const result = await callback();
    await executeScript('COMMIT');
    return result;
  } catch (error) {
    await executeScript('ROLLBACK');
    throw error;
  }
}
