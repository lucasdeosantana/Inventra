import { getDatabase } from '../../database/connection/index.js';
import { NotFoundError, ValidationError } from '../../shared/errors/http-errors.js';
import { normalizeDecimal, toDecimalString } from '../../shared/utils/decimal.js';

export interface ProductInput {
  code: string;
  name: string;
  description?: string | null;
  unit: string;
  quantity?: string | number;
  active?: boolean;
}

export interface ProductRecord {
  id: number;
  code: string;
  name: string;
  description: string | null;
  unit: string;
  quantity: string;
  active: number;
  created_at: string;
  updated_at: string;
}

const normalizeProductInput = (input: ProductInput) => {
  if (!input.code?.trim()) {
    throw new ValidationError('Código do produto é obrigatório.');
  }

  if (!input.name?.trim()) {
    throw new ValidationError('Nome do produto é obrigatório.');
  }

  if (!input.unit?.trim()) {
    throw new ValidationError('Unidade de medida é obrigatória.');
  }

  const quantityValue = input.quantity ?? 0;
  const normalizedQuantity = normalizeDecimal(quantityValue);

  if (normalizedQuantity.startsWith('-')) {
    throw new ValidationError('Quantidade inicial não pode ser negativa.');
  }

  return {
    code: input.code.trim(),
    name: input.name.trim(),
    description: input.description?.trim() ?? null,
    unit: input.unit.trim(),
    quantity: normalizedQuantity,
    active: input.active ?? true,
  };
};

const mapProduct = (row: ProductRecord) => ({
  id: row.id,
  code: row.code,
  name: row.name,
  description: row.description,
  unit: row.unit,
  quantity: toDecimalString(row.quantity),
  active: Boolean(row.active),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const productsService = {
  async list() {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all() as ProductRecord[];

    return rows.map(mapProduct);
  },

  async getByCode(code: string) {
    const normalizedCode = code.trim();
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM products WHERE code = ?').get(normalizedCode) as ProductRecord | undefined;

    if (!row) {
      throw new NotFoundError(`Produto com código "${normalizedCode}" não encontrado.`);
    }

    return mapProduct(row);
  },

  async create(input: ProductInput) {
    const normalizedInput = normalizeProductInput(input);
    const db = getDatabase();

    const existing = db.prepare('SELECT id FROM products WHERE code = ?').get(normalizedInput.code) as { id: number } | undefined;
    if (existing) {
      throw new ValidationError(`Já existe um produto com o código "${normalizedInput.code}".`);
    }

    const result = db
      .prepare(
        `
          INSERT INTO products (code, name, description, unit, quantity, active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `,
      )
      .run(
        normalizedInput.code,
        normalizedInput.name,
        normalizedInput.description,
        normalizedInput.unit,
        normalizedInput.quantity,
        normalizedInput.active ? 1 : 0,
      );

    return this.getById(Number(result.lastInsertRowid));
  },

  async getById(id: number) {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as ProductRecord | undefined;

    if (!row) {
      throw new NotFoundError(`Produto com id "${id}" não encontrado.`);
    }

    return mapProduct(row);
  },

  async update(id: number, input: Partial<ProductInput>) {
    const db = getDatabase();
    const current = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as ProductRecord | undefined;

    if (!current) {
      throw new NotFoundError(`Produto com id "${id}" não encontrado.`);
    }

    const nextCode = input.code?.trim() ?? current.code;
    const nextName = input.name?.trim() ?? current.name;
    const nextUnit = input.unit?.trim() ?? current.unit;
    const nextDescription = input.description === undefined ? current.description : input.description?.trim() ?? null;

    if (!nextCode) {
      throw new ValidationError('Código do produto é obrigatório.');
    }

    if (!nextName) {
      throw new ValidationError('Nome do produto é obrigatório.');
    }

    if (!nextUnit) {
      throw new ValidationError('Unidade de medida é obrigatória.');
    }

    if (nextCode !== current.code) {
      const existing = db.prepare('SELECT id FROM products WHERE code = ?').get(nextCode) as { id: number } | undefined;
      if (existing && existing.id !== id) {
        throw new ValidationError(`Já existe um produto com o código "${nextCode}".`);
      }
    }

    db.prepare(
      `
        UPDATE products
        SET
          code = ?,
          name = ?,
          description = ?,
          unit = ?,
          active = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
    ).run(nextCode, nextName, nextDescription, nextUnit, input.active === undefined ? current.active : input.active ? 1 : 0, id);

    return this.getById(id);
  },

  async remove(id: number) {
    const db = getDatabase();
    const current = db.prepare('SELECT id FROM products WHERE id = ?').get(id) as { id: number } | undefined;

    if (!current) {
      throw new NotFoundError(`Produto com id "${id}" não encontrado.`);
    }

    db.prepare('UPDATE products SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);

    return this.getById(id);
  },
};
