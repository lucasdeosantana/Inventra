# AGENTS.md

## Objetivo do frontend

Este diretório implementa a interface administrativa do Inventra para gerenciamento completo dos dados persistidos no banco SQLite. A aplicação deve consumir a API REST do backend e disponibilizar operações de criação, leitura, atualização e exclusão para produtos e posições, além de consulta do histórico de movimentações.

## Regras da interface

1. O frontend deve manter foco em operações de manutenção e consulta, com estrutura clara para formularios e listagens.
2. Todas as operações devem seguir a API REST do backend já existente, sem duplicar regras de negócio.
3. A interface deve expor o mínimo necessário para que o usuário gerencie produtos, posições e acompanhe o histórico de estoque.
4. O processo deve funcionar localmente e manter feedback visual claro para erros e operações concluídas.

## Stack

- React + TypeScript + Vite
- CSS puro
- Fetch para integração com o backend local

## Convenções

- Sempre manter o frontend em sintaxe TypeScript.
- Atualizar o `README.md` e `UPDATE.md` quando a funcionalidade evoluir.
- Não duplicar regras de negócio já implementadas no backend.
- Após alterações relevantes, verificar `npm run build`.
