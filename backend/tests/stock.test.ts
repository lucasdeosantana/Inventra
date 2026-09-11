import { beforeEach, describe, expect, it } from 'vitest';

import { appConfig } from '../src/config/index.js';
import { getDatabase, closeDatabase } from '../src/database/connection/index.js';
import { runMigrations } from '../src/database/migrations/runner.js';
import { productsService } from '../src/modules/products/service.js';
import { stockService } from '../src/modules/stock/service.js';

const resetState = () => {
  const db = getDatabase();
  db.exec(`
    DELETE FROM stock_movements;
    DELETE FROM product_positions;
    DELETE FROM positions;
    DELETE FROM products;
    DELETE FROM sqlite_sequence WHERE name IN ('products', 'positions', 'product_positions', 'stock_movements');
  `);
};

beforeEach(async () => {
  closeDatabase();
  process.env.DB_PATH = `${process.cwd()}/data/test-inventra.sqlite`;
  appConfig.dbPath;
  runMigrations();
  resetState();
});

describe('stock service', () => {
  it('creates a product and performs an entry', async () => {
    await productsService.create({ code: 'P-001', name: 'Produto 1', unit: 'un', quantity: '10' });

    const firstStock = await stockService.getStock('P-001');
    expect(firstStock.quantity).toBe('10');

    const movement = await stockService.move({ productCode: 'P-001', type: 'ENTRY', quantity: '2.5' });

    expect(movement.quantityEffective).toBe('2.5');
    expect(movement.newQuantity).toBe('12.5');

    const after = await stockService.getStock('P-001');
    expect(after.quantity).toBe('12.5');
  });

  it('caps exit when requested amount exceeds stock', async () => {
    await productsService.create({ code: 'P-002', name: 'Produto 2', unit: 'un', quantity: '7' });

    const movement = await stockService.move({ productCode: 'P-002', type: 'EXIT', quantity: '10' });

    expect(movement.quantityEffective).toBe('7');
    expect(movement.newQuantity).toBe('0');

    const stock = await stockService.getStock('P-002');
    expect(stock.quantity).toBe('0');
  });

  it('supports percentual exit based on current stock', async () => {
    await productsService.create({ code: 'P-003', name: 'Produto 3', unit: 'un', quantity: '80' });

    const result = await stockService.move({ productCode: 'P-003', type: 'EXIT', quantity: '10', isPercent: true });

    expect(result.quantityRequested).toBe('8');
    expect(result.quantityEffective).toBe('8');
    expect(result.newQuantity).toBe('72');
  });

  it('supports idempotency by operation id', async () => {
    await productsService.create({ code: 'P-004', name: 'Produto 4', unit: 'un', quantity: '1' });

    const first = await stockService.move({
      productCode: 'P-004',
      type: 'ENTRY',
      quantity: '1',
      operationId: 'op-1',
    });

    const second = await stockService.move({
      productCode: 'P-004',
      type: 'ENTRY',
      quantity: '1',
      operationId: 'op-1',
    });

    expect(first.operationId).toBe('op-1');
    expect(second.operationId).toBe('op-1');

    const history = await stockService.listHistory('P-004');
    expect(history).toHaveLength(1);
  });
});
