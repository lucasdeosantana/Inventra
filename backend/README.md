# Inventra Backend

Backend em Node.js + TypeScript + Fastify + SQLite para controle de estoque local, com API REST, documentação OpenAPI/Swagger e suporte a produtos, estoques decimais, posições hierárquicas, comandos especiais e auditoria de movimentações.

## Visão geral

Este projeto foi estruturado para manter confiabilidade, simplicidade, legibilidade e evolução futura. O banco local em SQLite foi escolhido por facilitar cópia, backup e versionamento estrutural, além de preservar a possibilidade de migração posterior para outro banco.

## Arquitetura escolhida

- Node.js + TypeScript + Fastify
- SQLite com `sqlite3`
- `decimal.js` para quantidades decimais
- `Zod` nos próximos refinamentos de validação
- OpenAPI/Swagger para documentação
- módulos por domínio para separar regras de negócio da camada HTTP

## Principais decisões técnicas

- O banco é acessado por uma única conexão singleton cujas opções de inicialização são controladas pela configuração.
- Quantidades decimais são tratadas por `decimal.js` para evitar problemas de ponto flutuante.
- O histórico de movimentações é persistido junto com o saldo para permitir auditoria e reconstrução do estado.
- O sistema de idempotência usa `operationId`, persistido no histórico de movimentações.
- A API e as regras de negócio foram separadas em módulos (`products`, `stock`, `positions`, `commands`).

## Estrutura do projeto

- `src/app`: bootstrap da aplicação
- `src/config`: configuração do projeto
- `src/database`: conexão, migrations e runner
- `src/modules`: módulos por domínio
- `src/routes`: rotas da API
- `src/shared`: erros, utilidades e tipos compartilhados
- `src/server.ts`: inicialização do servidor
- `tests`: testes automatizados

## Requisitos

- Node.js LTS (20+ recomendado)
- npm 9+
- compilador C++ para `sqlite3` em alguns ambientes Windows

## Instalação

```bash
npm install
```

## Execução

```bash
npm run dev
```

Em desenvolvimento o servidor fica disponível em `http://localhost:3000`.

## Build

```bash
npm run build
```

## Testes

```bash
npm test
```

## API

Swagger está disponível em:

```text
http://localhost:3000/documentation
```

## Banco

O banco principal fica em `data/inventra.sqlite`.

### Migrations

A aplicação aplica automaticamente as migrations de forma versionada na inicialização.

## Termux

```bash
pkg update
pkg install nodejs
npm install
npm run dev
```

## Observações

- O banco principal está em `data/inventra.sqlite`.
- O sistema já expõe endpoints básicos para produtos, estoque, posições, comandos e classificação de código.
- O projeto foi estruturado para permitir evolução futura sem acoplar regras de negócio ao Fastify.
