import { queryMany, queryOne, runStatement } from '../../database/connection/index.js';
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
    const rows = await queryMany<ProductRecord>('SELECT * FROM products ORDER BY created_at DESC');

    return rows.map(mapProduct);
  },

  async getByCode(code: string) {
    const normalizedCode = code.trim();
    const row = await queryOne<ProductRecord>('SELECT * FROM products WHERE code = ?', [normalizedCode]);

    if (!row) {
      throw new NotFoundError(`Produto com código "${normalizedCode}" não encontrado.`);
    }

    return mapProduct(row);
  },

  async create(input: ProductInput) {
    const normalizedInput = normalizeProductInput(input);

    const existing = await queryOne<{ id: number }>('SELECT id FROM products WHERE code = ?', [normalizedInput.code]);
    if (existing) {
      throw new ValidationError(`Já existe um produto com o código "${normalizedInput.code}".`);
    }

    const result = await runStatement(
      `
        INSERT INTO products (code, name, description, unit, quantity, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `,
      [normalizedInput.code, normalizedInput.name, normalizedInput.description, normalizedInput.unit, normalizedInput.quantity, normalizedInput.active ? 1 : 0],
    );

    return this.getById(Number(result.lastInsertRowid));
  },

  async getById(id: number) {
    const row = await queryOne<ProductRecord>('SELECT * FROM products WHERE id = ?', [id]);

    if (!row) {
      throw new NotFoundError(`Produto com id "${id}" não encontrado.`);
    }

    return mapProduct(row);
  },

  async update(id: number, input: Partial<ProductInput>) {
    const current = await queryOne<ProductRecord>('SELECT * FROM products WHERE id = ?', [id]);

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
      const existing = await queryOne<{ id: number }>('SELECT id FROM products WHERE code = ?', [nextCode]);
      if (existing && existing.id !== id) {
        throw new ValidationError(`Já existe um produto com o código "${nextCode}".`);
      }
    }

    await runStatement(
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
      [nextCode, nextName, nextDescription, nextUnit, input.active === undefined ? current.active : input.active ? 1 : 0, id],
    );

    return this.getById(id);
  },

  async remove(id: number) {
    const current = await queryOne<{ id: number }>('SELECT id FROM products WHERE id = ?', [id]);

    if (!current) {
      throw new NotFoundError(`Produto com id "${id}" não encontrado.`);
    }

    await runStatement('UPDATE products SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);

    return this.getById(id);
  },
};
