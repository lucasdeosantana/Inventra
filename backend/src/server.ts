import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';

import { appConfig } from './config/index.js';
import { runMigrations } from './database/migrations/runner.js';
import { registerRoutes } from './routes/index.js';

const app = Fastify({
  logger: true,
});

await app.register(swagger, {
  openapi: {
    info: {
      title: 'Inventra API',
      version: '1.0.0',
      description: 'Backend para controle de estoque com posições, comandos e auditoria.',
    },
    servers: [{ url: `http://localhost:${appConfig.port}` }],
  },
});

await runMigrations();
await app.register(registerRoutes);
await app.register(swaggerUi, {
  routePrefix: '/documentation',
  uiConfig: {
    docExpansion: 'full',
    deepLinking: false,
  },
});

await app.listen({ port: appConfig.port, host: appConfig.host });
