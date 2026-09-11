import type { FastifyInstance } from 'fastify';

import { commandsService } from '../modules/commands/service.js';
import { productsService } from '../modules/products/service.js';
import { positionsService } from '../modules/positions/service.js';
import { stockService } from '../modules/stock/service.js';
import { NotFoundError, ValidationError } from '../shared/errors/http-errors.js';

export async function registerRoutes(app: FastifyInstance) {
  app.get('/health', async () => ({ ok: true }));

  app.get('/api/products', async () => {
    return productsService.list();
  });

  app.get('/api/products/:code', async (request) => {
    const { code } = request.params as { code: string };
    return productsService.getByCode(code);
  });

  app.post('/api/products', async (request) => {
    const payload = request.body as any;
    return productsService.create(payload);
  });

  app.put('/api/products/:id', async (request) => {
    const { id } = request.params as { id: string };
    const payload = request.body as any;
    return productsService.update(Number(id), payload);
  });

  app.delete('/api/products/:id', async (request) => {
    const { id } = request.params as { id: string };
    return productsService.remove(Number(id));
  });

  app.get('/api/stock/:productCode', async (request) => {
    const { productCode } = request.params as { productCode: string };
    return stockService.getStock(productCode);
  });

  app.post('/api/stock/movement', async (request) => {
    const payload = request.body as any;
    return stockService.move(payload);
  });

  app.get('/api/stock/history', async (request) => {
    const query = request.query as { productCode?: string };
    return stockService.listHistory(query.productCode);
  });

  app.get('/api/positions', async () => {
    return positionsService.list();
  });

  app.get('/api/positions/tree', async () => {
    return positionsService.getTree();
  });

  app.get('/api/positions/:code', async (request) => {
    const { code } = request.params as { code: string };
    return positionsService.getByCode(code);
  });

  app.get('/api/positions/:code/contents', async (request) => {
    const { code } = request.params as { code: string };
    return positionsService.getContents(code);
  });

  app.post('/api/positions', async (request) => {
    const payload = request.body as any;
    return positionsService.create(payload);
  });

  app.put('/api/positions/:id', async (request) => {
    const { id } = request.params as { id: string };
    const payload = request.body as any;
    return positionsService.update(Number(id), payload);
  });

  app.delete('/api/positions/:id', async (request) => {
    const { id } = request.params as { id: string };
    return positionsService.remove(Number(id));
  });

  app.get('/api/commands', async () => {
    return commandsService.list();
  });

  app.get('/api/code/:code', async (request) => {
    const { code } = request.params as { code: string };
    return commandsService.classify(code);
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      reply.status(error.statusCode).send({
        error: error.code ?? 'ERROR',
        message: error.message,
      });
      return;
    }

    request.log.error(error);
    reply.status(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Erro interno do servidor.',
    });
  });
}
