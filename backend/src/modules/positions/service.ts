import { queryMany, queryOne, runStatement } from '../../database/connection/index.js';
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

const hasCircularReference = async (positionId: number, parentId: number): Promise<boolean> => {
  let currentParentId = parentId;

  while (currentParentId) {
    if (currentParentId === positionId) {
      return true;
    }

    const row = await queryOne<{ parent_id: number | null }>('SELECT parent_id FROM positions WHERE id = ?', [currentParentId]);
    if (!row) {
      return false;
    }
    currentParentId = row.parent_id ?? 0;
  }

  return false;
};

export const positionsService = {
  async list() {
    const rows = await queryMany<PositionRecord>('SELECT * FROM positions ORDER BY created_at DESC');
    return rows.map(mapPosition);
  },

  async getByCode(code: string) {
    const row = await queryOne<PositionRecord>('SELECT * FROM positions WHERE code = ?', [code]);

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

    const existing = await queryOne<{ id: number }>('SELECT id FROM positions WHERE code = ?', [input.code.trim()]);
    if (existing) {
      throw new ValidationError(`Já existe uma posição com o código "${input.code.trim()}".`);
    }

    let parentId: number | null = null;

    if (input.parentCode) {
      const parent = await queryOne<PositionRecord>('SELECT * FROM positions WHERE code = ? AND active = 1', [input.parentCode.trim()]);
      if (!parent) {
        throw new NotFoundError(`Posição pai com código "${input.parentCode}" não encontrada.`);
      }
      parentId = parent.id;
    }

    const result = await runStatement(
      `
        INSERT INTO positions (code, name, parent_id, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      [input.code.trim(), input.name.trim(), parentId, input.active === undefined ? 1 : input.active ? 1 : 0],
    );

    return this.getById(Number(result.lastInsertRowid));
  },

  async getById(id: number) {
    const row = await queryOne<PositionRecord>('SELECT * FROM positions WHERE id = ?', [id]);

    if (!row) {
      throw new NotFoundError(`Posição com id "${id}" não encontrada.`);
    }

    return mapPosition(row);
  },

  async update(id: number, input: Partial<PositionInput>) {
    const current = await queryOne<PositionRecord>('SELECT * FROM positions WHERE id = ?', [id]);

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
        const parent = await queryOne<PositionRecord>('SELECT * FROM positions WHERE code = ? AND active = 1', [input.parentCode.trim()]);
        if (!parent) {
          throw new NotFoundError(`Posição pai com código "${input.parentCode}" não encontrada.`);
        }
        nextParentId = parent.id;
      }
    }

    if (nextParentId && (await hasCircularReference(id, nextParentId))) {
      throw new ValidationError('Não é permitido criar referência circular em posições.');
    }

    await runStatement(
      `
        UPDATE positions
        SET code = ?, name = ?, parent_id = ?, active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [nextCode, nextName, nextParentId, input.active === undefined ? current.active : input.active ? 1 : 0, id],
    );

    return this.getById(id);
  },

  async remove(id: number) {
    const current = await queryOne<PositionRecord>('SELECT * FROM positions WHERE id = ?', [id]);

    if (!current) {
      throw new NotFoundError(`Posição com id "${id}" não encontrada.`);
    }

    const children = await queryMany<{ id: number }>('SELECT id FROM positions WHERE parent_id = ?', [id]);
    if (children.length > 0) {
      throw new ValidationError('Não é possível remover uma posição que possui filhos ativos.');
    }

    const assignedProducts = await queryMany<{ id: number }>('SELECT id FROM product_positions WHERE position_id = ?', [id]);
    if (assignedProducts.length > 0) {
      throw new ValidationError('Não é possível remover uma posição que ainda possui produtos associados.');
    }

    await runStatement('UPDATE positions SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);

    return this.getById(id);
  },

  async getChildren(code: string) {
    const position = await queryOne<PositionRecord>('SELECT * FROM positions WHERE code = ?', [code]);

    if (!position) {
      throw new NotFoundError(`Posição com código "${code}" não encontrada.`);
    }

    const rows = await queryMany<PositionRecord>('SELECT * FROM positions WHERE parent_id = ? ORDER BY created_at ASC', [position.id]);
    return rows.map(mapPosition);
  },

  async getContents(code: string) {
    const position = await queryOne<PositionRecord>('SELECT * FROM positions WHERE code = ?', [code]);

    if (!position) {
      throw new NotFoundError(`Posição com código "${code}" não encontrada.`);
    }

    const rows = await queryMany<
      {
        id: number;
        product_id: number;
        position_id: number;
        quantity: string;
        product_code: string;
        product_name: string;
      }
    >(
      `
        SELECT pp.id, pp.product_id, pp.position_id, pp.quantity, p.code AS product_code, p.name AS product_name
        FROM product_positions pp
        INNER JOIN products p ON p.id = pp.product_id
        WHERE pp.position_id = ?
        ORDER BY p.name ASC
      `,
      [position.id],
    );

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
    const rows = await queryMany<PositionRecord>('SELECT * FROM positions WHERE active = 1 ORDER BY created_at ASC');

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
