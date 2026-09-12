# Histórico de atualizações

## 2026-09-12 — migração para sqlite3 e atualização da runtime

### Resumo

O backend foi atualizado para usar `sqlite3` em vez de `better-sqlite3`, mantendo o mesmo comportamento funcional da API e dos testes. Também foi aplicada a atualização do ambiente local para a versão LTS do Node.js, com validação da compilação e dos testes após a mudança.

### Alterações

- Substituído `better-sqlite3` por `sqlite3` em `package.json`.
- Ajustada a conexão SQLite para trabalhar com `sqlite3` e manter o encapsulamento do banco.
- Reescrita a camada de acesso ao banco nos módulos de produtos, posições, estoque e migrations para usar helper assíncronos compatíveis com `sqlite3`.
- Atualizado o ambiente local para Node.js LTS (`v24.19.0`) e revalidado `npm install`, `npm run build` e `npm test`.
- Sincronizada a documentação do projeto para refletir a nova dependência e a runtime adotada.

### Validação

- `npm install` concluído com sucesso na nova configuração.
- `npm run build` concluído com sucesso.
- `npm test` concluído com sucesso: 4 testes passaram.

## 2026-09-11 — implementação inicial funcional

### Resumo

Foi implementada a base funcional do backend do Inventra, incluindo estrutura de módulos, API REST básica, migrations, documentação OpenAPI/Swagger e testes iniciais de regras críticas do estoque.

### Alterações

- Criado módulo de produtos com listagem, criação, consulta por código, atualização e desativação.
- Criado módulo de estoque com entrada, saída, percentuais, idempotência por `operationId` e histórico de movimentações.
- Criado módulo de posições com árvore hierárquica, prevenção de ciclos, consulta de filhos e conteúdo.
- Criado módulo de comandos para carregamento de configurações JSON e classificação de códigos.
- Implementada API REST para produtos, estoque, posições, comandos e classificação de código.
- Adicionado suporte inicial de Swagger/OpenAPI no servidor.
- Ajustada conexão SQLite para inicialização segura por demanda.
- Ajustada configuração de ambiente e dependências para compatibilidade com o ambiente atual.
- Criado teste inicial cobrindo entrada, saída superior ao estoque, percentual e idempotência.

### Banco

- `001_initial_schema.sql` mantém a estrutura inicial de produtos, posições, relacionamento produto/posição e histórico de movimentações.
- `runMigrations` aplica as migrations automaticamente na inicialização.

### API

- `GET /api/products`
- `GET /api/products/:code`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `GET /api/stock/:productCode`
- `POST /api/stock/movement`
- `GET /api/stock/history`
- `GET /api/positions`
- `GET /api/positions/:code`
- `GET /api/positions/:code/contents`
- `POST /api/positions`
- `PUT /api/positions/:id`
- `DELETE /api/positions/:id`
- `GET /api/commands`
- `GET /api/code/:code`

### Testes

- Teste de entrada com quantidade decimal.
- Teste de saída com estoque insuficiente.
- Teste de percentual.
- Teste de idempotência por `operationId`.

### Impactos

- O backend já está executável e compila com TypeScript.
- A documentação Swagger passa a estar disponível em `/documentation`.

### Pendências

- Refinar validações com Zod e enriquecer a camada de rotas com schemas OpenAPI.
- Implementar testes completos de posições, comandos e integridade referencial.
- Completar documentação e scripts de backup/restauração específicos para Termux.
