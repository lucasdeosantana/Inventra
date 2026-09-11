import fs from 'node:fs';

import { appConfig } from '../../config/index.js';
import { getDatabase } from '../../database/connection/index.js';
import { NotFoundError } from '../../shared/errors/http-errors.js';

export type CommandAction = 'INCREMENT_QUANTITY' | 'DECREMENT_QUANTITY' | 'CONFIRM' | 'CANCEL';

export interface CommandDefinition {
  action: CommandAction;
  value?: number;
}

const loadCommands = (): Record<string, CommandDefinition> => {
  const raw = fs.readFileSync(appConfig.defaultCommandsPath, 'utf8');
  const parsed = JSON.parse(raw) as { commands?: Record<string, CommandDefinition> };

  return parsed.commands ?? {};
};

export const commandsService = {
  list() {
    return loadCommands();
  },

  getByCode(code: string) {
    const commands = loadCommands();
    const command = commands[code];

    if (!command) {
      throw new NotFoundError(`Comando com código "${code}" não encontrado.`);
    }

    return { code, command };
  },

  classify(code: string) {
    const db = getDatabase();
    const product = db.prepare('SELECT code FROM products WHERE code = ?').get(code) as { code: string } | undefined;

    if (product) {
      return { type: 'PRODUCT', code };
    }

    const position = db.prepare('SELECT code FROM positions WHERE code = ? AND active = 1').get(code) as { code: string } | undefined;

    if (position) {
      return { type: 'POSITION', code };
    }

    const command = loadCommands()[code];
    if (command) {
      return { type: 'COMMAND', code, command };
    }

    return { type: 'UNKNOWN', code };
  },
};
