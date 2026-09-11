import { randomUUID } from 'node:crypto';

import { getDatabase } from '../../database/connection/index.js';
import { NotFoundError, ValidationError } from '../../shared/errors/http-errors.js';
import { DECIMAL_PLACES } from '../../shared/types/decimal.js';
import { decimal, normalizeDecimal, multiplyPercent, sumDecimals, toDecimalString } from '../../shared/utils/decimal.js';

export type MovementType = 'ENTRY' | 'EXIT';

export interface StockMovementInput {
  productCode: string;
  type: MovementType;
  quantity: string | number;
  isPercent?: boolean;
  operationId?: string;
  source?: string | null;
  positionCode?: string | null;
}

export interface MovementRecord {
  id: number;
  product_id: number;
  position_id: number | null;
  type: MovementType;
  quantity_requested: string;
  quantity_effective: string;
  previous_quantity: string;
  new_quantity: string;
  operation_id: string;
  source: string | null;
  created_at: string;
}

const getProductByCode = (code: string) => {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM products WHERE code = ?').get(code) as any;

  if (!row) {
    throw new NotFoundError(`Produto com código "${code}" não encontrado.`);
  }

  return row;
};

const getPositionByCode = (code: string) => {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM positions WHERE code = ? AND active = 1').get(code) as any;

  if (!row) {
    throw new NotFoundError(`Posição com código "${code}" não encontrada.`);
  }

  return row;
};

const computeRequestedQuantity = (currentQuantity: string, quantityInput: string | number, isPercent: boolean) => {
  const current = decimal(currentQuantity);
  const requested = decimal(quantityInput);

  if (isPercent) {
    return multiplyPercent(current, requested).toDecimalPlaces(DECIMAL_PLACES).toString();
  }

  return normalizeDecimal(requested);
};

const validateMovementInput = (input: StockMovementInput) => {
  if (!input.productCode?.trim()) {
    throw new ValidationError('Código do produto é obrigatório.');
  }

  if (input.type !== 'ENTRY' && input.type !== 'EXIT') {
    throw new ValidationError('Tipo de movimentação deve ser ENTRY ou EXIT.');
  }

  if (input.quantity === undefined || input.quantity === null || input.quantity === '') {
    throw new ValidationError('Quantidade é obrigatória.');
  }

  if (input.operationId && !input.operationId.trim()) {
    throw new ValidationError('Identificador da operação não pode ser vazio.');
  }

  const requested = decimal(input.quantity);
  if (!requested.isFinite()) {
    throw new ValidationError('Quantidade inválida.');
  }

  if (requested.isNegative()) {
    throw new ValidationError('Quantidade não pode ser negativa.');
  }

  if (input.isPercent && input.quantity === 0) {
    throw new ValidationError('Percentual zero não é válido para movimentação.');
  }
};

const mapMovement = (row: MovementRecord) => ({
  id: row.id,
  productId: row.product_id,
  positionId: row.position_id,
  type: row.type,
  quantityRequested: toDecimalString(row.quantity_requested),
  quantityEffective: toDecimalString(row.quantity_effective),
  previousQuantity: toDecimalString(row.previous_quantity),
  newQuantity: toDecimalString(row.new_quantity),
  operationId: row.operation_id,
  source: row.source,
  createdAt: row.created_at,
});

export const stockService = {
  async listHistory(productCode?: string) {
    const db = getDatabase();

    let query = 'SELECT * FROM stock_movements';
    const params: string[] = [];

    if (productCode) {
      const product = getProductByCode(productCode);
      query += ' WHERE product_id = ?';
      params.push(String(product.id));
    }

    query += ' ORDER BY created_at DESC';

    const rows = db.prepare(query).all(...params) as MovementRecord[];
    return rows.map(mapMovement);
  },

  async move(input: StockMovementInput) {
    validateMovementInput(input);

    const db = getDatabase();
    const product = getProductByCode(input.productCode.trim());

    let positionId: number | null = null;
    if (input.positionCode) {
      const position = getPositionByCode(input.positionCode.trim());
      positionId = position.id;
    }

    const operationId = input.operationId?.trim() ?? randomUUID();

    const existing = db.prepare('SELECT id FROM stock_movements WHERE operation_id = ?').get(operationId) as { id: number } | undefined;
    if (existing) {
      return this.getMovementByOperationId(operationId);
    }

    const currentQuantity = product.quantity;
    const currentDecimal = decimal(currentQuantity);

    let requestedQuantity = computeRequestedQuantity(currentQuantity, input.quantity, Boolean(input.isPercent));
    let effectiveQuantity = requestedQuantity;

    if (input.type === 'EXIT') {
      const requestedValue = decimal(requestedQuantity);
      if (requestedValue.greaterThan(currentDecimal)) {
        effectiveQuantity = currentDecimal.toDecimalPlaces(DECIMAL_PLACES).toString();
      }
    }

    const previousQuantity = currentQuantity;
    const nextQuantity =
      input.type === 'ENTRY'
        ? sumDecimals(previousQuantity, effectiveQuantity).toDecimalPlaces(DECIMAL_PLACES).toString()
        : sumDecimals(previousQuantity, `-${effectiveQuantity}`).toDecimalPlaces(DECIMAL_PLACES).toString();

    const transaction = db.transaction(() => {
      db.prepare(
        `
          UPDATE products
          SET quantity = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
      ).run(nextQuantity, product.id);

      db.prepare(
        `
          INSERT INTO stock_movements (
            product_id,
            position_id,
            type,
            quantity_requested,
            quantity_effective,
            previous_quantity,
            new_quantity,
            operation_id,
            source,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `,
      ).run(
        product.id,
        positionId,
        input.type,
        normalizeDecimal(requestedQuantity),
        normalizeDecimal(effectiveQuantity),
        normalizeDecimal(previousQuantity),
        normalizeDecimal(nextQuantity),
        operationId,
        input.source ?? null,
      );
    });

    transaction();

    return {
      productId: product.id,
      type: input.type,
      quantityRequested: normalizeDecimal(requestedQuantity),
      quantityEffective: normalizeDecimal(effectiveQuantity),
      previousQuantity: normalizeDecimal(previousQuantity),
      newQuantity: normalizeDecimal(nextQuantity),
      operationId,
      source: input.source ?? null,
    };
  },

  async getMovementByOperationId(operationId: string) {
    const db = getDatabase();

    const row = db.prepare('SELECT * FROM stock_movements WHERE operation_id = ?').get(operationId) as MovementRecord | undefined;
    if (!row) {
      throw new NotFoundError(`Movimentação com operação "${operationId}" não encontrada.`);
    }

    return mapMovement(row);
  },

  async getStock(productCode: string) {
    const product = getProductByCode(productCode);

    return {
      productCode: product.code,
      productId: product.id,
      quantity: normalizeDecimal(product.quantity),
    };
  },
};
