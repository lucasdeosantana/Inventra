import { getDatabase } from '../../database/connection/index.js';
import { NotFoundError, ValidationError } from '../../shared/errors/http-errors.js';

export interface PositionInput {
  code: string;
  name: string;
  parentCode?: string | null;
  active?: boolean;
}

export interface PositionRecord {
  id: number;
  code: string;
  name: string;
  parent_id: number | null;
  active: number;
  created_at: string;
  updated_at: string;
}

const mapPosition = (row: PositionRecord) => ({
  id: row.id,
  code: row.code,
  name: row.name,
  parentId: row.parent_id,
  active: Boolean(row.active),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const hasCircularReference = (positionId: number, parentId: number): boolean => {
  let currentParentId = parentId;
  const db = getDatabase();

  while (currentParentId) {
    if (currentParentId === positionId) {
      return true;
    }

    const row = db.prepare('SELECT parent_id FROM positions WHERE id = ?').get(currentParentId) as { parent_id: number | null } | undefined;
    if (!row) {
      return false;
    }
    currentParentId = row.parent_id ?? 0;
  }

  return false;
};

export const positionsService = {
  async list() {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM positions ORDER BY created_at DESC').all() as PositionRecord[];
    return rows.map(mapPosition);
  },

  async getByCode(code: string) {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM positions WHERE code = ?').get(code) as PositionRecord | undefined;

    if (!row) {
      throw new NotFoundError(`Posição com código "${code}" não encontrada.`);
    }

    return mapPosition(row);
  },

  async create(input: PositionInput) {
    if (!input.code?.trim()) {
      throw new ValidationError('Código da posição é obrigatório.');
    }

    if (!input.name?.trim()) {
      throw new ValidationError('Nome da posição é obrigatório.');
    }

    const db = getDatabase();

    const existing = db.prepare('SELECT id FROM positions WHERE code = ?').get(input.code.trim()) as { id: number } | undefined;
    if (existing) {
      throw new ValidationError(`Já existe uma posição com o código "${input.code.trim()}".`);
    }

    let parentId: number | null = null;

    if (input.parentCode) {
      const parent = db.prepare('SELECT * FROM positions WHERE code = ? AND active = 1').get(input.parentCode.trim()) as PositionRecord | undefined;
      if (!parent) {
        throw new NotFoundError(`Posição pai com código "${input.parentCode}" não encontrada.`);
      }
      parentId = parent.id;
    }

    const result = db
      .prepare(
        `
          INSERT INTO positions (code, name, parent_id, active, created_at, updated_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `,
      )
      .run(input.code.trim(), input.name.trim(), parentId, input.active === undefined ? 1 : input.active ? 1 : 0);

    return this.getById(Number(result.lastInsertRowid));
  },

  async getById(id: number) {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM positions WHERE id = ?').get(id) as PositionRecord | undefined;

    if (!row) {
      throw new NotFoundError(`Posição com id "${id}" não encontrada.`);
    }

    return mapPosition(row);
  },

  async update(id: number, input: Partial<PositionInput>) {
    const db = getDatabase();
    const current = db.prepare('SELECT * FROM positions WHERE id = ?').get(id) as PositionRecord | undefined;

    if (!current) {
      throw new NotFoundError(`Posição com id "${id}" não encontrada.`);
    }

    const nextCode = input.code?.trim() ?? current.code;
    const nextName = input.name?.trim() ?? current.name;

    if (!nextCode) {
      throw new ValidationError('Código da posição é obrigatório.');
    }

    if (!nextName) {
      throw new ValidationError('Nome da posição é obrigatório.');
    }

    let nextParentId = current.parent_id;
    if (input.parentCode !== undefined) {
      if (!input.parentCode) {
        nextParentId = null;
      } else {
        const parent = db.prepare('SELECT * FROM positions WHERE code = ? AND active = 1').get(input.parentCode.trim()) as PositionRecord | undefined;
        if (!parent) {
          throw new NotFoundError(`Posição pai com código "${input.parentCode}" não encontrada.`);
        }
        nextParentId = parent.id;
      }
    }

    if (nextParentId && hasCircularReference(id, nextParentId)) {
      throw new ValidationError('Não é permitido criar referência circular em posições.');
    }

    db.prepare(
      `
        UPDATE positions
        SET code = ?, name = ?, parent_id = ?, active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    ).run(nextCode, nextName, nextParentId, input.active === undefined ? current.active : input.active ? 1 : 0, id);

    return this.getById(id);
  },

  async remove(id: number) {
    const db = getDatabase();
    const current = db.prepare('SELECT * FROM positions WHERE id = ?').get(id) as PositionRecord | undefined;

    if (!current) {
      throw new NotFoundError(`Posição com id "${id}" não encontrada.`);
    }

    const children = db.prepare('SELECT id FROM positions WHERE parent_id = ?').all(id) as { id: number }[];
    if (children.length > 0) {
      throw new ValidationError('Não é possível remover uma posição que possui filhos ativos.');
    }

    const assignedProducts = db.prepare('SELECT id FROM product_positions WHERE position_id = ?').all(id) as { id: number }[];
    if (assignedProducts.length > 0) {
      throw new ValidationError('Não é possível remover uma posição que ainda possui produtos associados.');
    }

    db.prepare('UPDATE positions SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

    return this.getById(id);
  },

  async getChildren(code: string) {
    const db = getDatabase();
    const position = db.prepare('SELECT * FROM positions WHERE code = ?').get(code) as PositionRecord | undefined;

    if (!position) {
      throw new NotFoundError(`Posição com código "${code}" não encontrada.`);
    }

    const rows = db.prepare('SELECT * FROM positions WHERE parent_id = ? ORDER BY created_at ASC').all(position.id) as PositionRecord[];
    return rows.map(mapPosition);
  },

  async getContents(code: string) {
    const db = getDatabase();
    const position = db.prepare('SELECT * FROM positions WHERE code = ?').get(code) as PositionRecord | undefined;

    if (!position) {
      throw new NotFoundError(`Posição com código "${code}" não encontrada.`);
    }

    const rows = db
      .prepare(
        `
          SELECT pp.id, pp.product_id, pp.position_id, pp.quantity, p.code AS product_code, p.name AS product_name
          FROM product_positions pp
          INNER JOIN products p ON p.id = pp.product_id
          WHERE pp.position_id = ?
          ORDER BY p.name ASC
        `,
      )
      .all(position.id) as Array<{ id: number; product_id: number; position_id: number; quantity: string; product_code: string; product_name: string }>;

    return rows.map((row) => ({
      id: row.id,
      productId: row.product_id,
      productCode: row.product_code,
      productName: row.product_name,
      positionId: row.position_id,
      quantity: row.quantity,
    }));
  },

  async getTree() {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM positions WHERE active = 1 ORDER BY created_at ASC').all() as PositionRecord[];

    type TreeNode = PositionRecord & {
      children: TreeNode[];
    };

    const byId = new Map<number, TreeNode>();
    rows.forEach((row) => {
      byId.set(row.id, { ...row, children: [] });
    });

    rows.forEach((row) => {
      if (row.parent_id) {
        const parent = byId.get(row.parent_id);
        const current = byId.get(row.id);

        if (parent && current) {
          parent.children.push(current);
        }
      }
    });

    return rows
      .filter((row) => !row.parent_id)
      .map((row) => {
        const node = byId.get(row.id)!;

        const buildTree = (current: TreeNode): any => ({
          ...mapPosition(current),
          children: current.children.map((child) => buildTree(child)),
        });

        return buildTree(node);
      });
  },
};
