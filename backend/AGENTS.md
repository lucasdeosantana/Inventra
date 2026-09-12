# AGENTS.md

## Objetivo do sistema

Este repositório implementa um backend de controle de estoque orientado a confiabilidade, simplicidade e evolução. O projeto deve funcionar localmente com SQLite, expor uma API REST e permitir operação por frontends simples e futuros clientes externos.

## Arquitetura

- Node.js + TypeScript + Fastify
- SQLite para persistência local
- `sqlite3` para acesso ao banco com compatibilidade moderna do Node.js
- `Decimal.js` para quantidades decimais
- `Zod` para validação
- `Vitest` para testes automatizados
- OpenAPI/Swagger para documentação

## Principais regras de negócio

1. Quantidades decimais devem ser tratadas com precisão explícita. Não usar operações de ponto flutuante simples.
2. O estoque nunca pode ficar negativo. Saídas maiores que o disponível devem registrar a quantidade efetiva limitada pelo saldo atual.
3. Percentuais sempre são calculados sobre o estoque disponível no momento da operação.
4. Toda movimentação deve ser atômica: saldo e histórico devem ser persistidos na mesma transação.
5. O histórico nunca deve ser apagado automaticamente.
6. A mesma operação deve ser protegida por idempotência usando um identificador único da operação.
7. Posições são hierárquicas e devem impedir ciclos.
8. Produtos podem existir em múltiplas posições, e a soma das quantidades por posição deve ser coerente com o total do produto.
9. Códigos físicos e ações do sistema devem ser separados. Comandos especiais configuráveis devem ser descobertos via API.

## Banco

- O banco deve ficar em `data/inventra.sqlite`.
- Foreign keys devem ficar ativos.
- Migrations devem ser versionadas e aplicadas automaticamente na inicialização.
- O acesso ao banco deve permanecer encapsulado para facilitar migrações futuras.

## API

A API REST deve manter endpoints organizados por domínio: produtos, estoque, posições, comandos e classificação de código.

## Comandos especiais

Comandos configuráveis podem representar ações como incremento/decremento, confirmação e cancelamento. Eles devem ser carregados de configuração e expostos pela API de comandos.

## Posições

Posições representam nós de uma árvore hierárquica. O sistema deve permitir criar, mover, consultar conteúdos, listar filhos e impedir referências circulares.

## Testes

Testes críticos devem cobrir estoque, idempotência, posições, comandos e integridade do banco.

## Convenções

- Não usar `any` sem necessidade.
- Não misturar regras de negócio com código de rota.
- Comentários devem explicar decisões técnicas, regras de negócio e limitações relevantes.
- Toda alteração deve ser refletida em `UPDATE.md`.

## Regras de modificação

Antes de modificar qualquer parte do projeto, o agente deve ler este arquivo e `UPDATE.md`.

O agente nunca deve modificar uma regra de negócio existente apenas para facilitar sua implementação.

Toda alteração deve ser refletida em `UPDATE.md`.
