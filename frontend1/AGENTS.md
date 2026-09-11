# AGENTS.md

## Objetivo do frontend

Este diretório implementa o frontend operacional do Inventra, voltado para operações rápidas de estoque em ambiente de tablet ou terminal de operação. A aplicação deve consumir a API REST do backend e manter fluxos simples para seleção de produtos, posições, comandos e confirmação de movimentações.

## Regras da interface

1. A interface deve priorizar operação por toque, com botões grandes e leitura clara de status.
2. Todo código lido por scanner deve ser processado pela mesma rota de classificação do backend (`/api/code/:code`).
3. O fluxo principal deve permitir selecionar produto, escolher posição, ajustar quantidade e confirmar movimentação.
4. O frontend deve oferecer feedback claro para erros, operações concluídas e fallback visual para ausência de dados.
5. O sistema deve funcionar como PWA local, com manifest e service worker básicos.

## Stack

- React + TypeScript + Vite
- CSS puro para manter leveza e previsibilidade
- Fetch para integração HTTP direta com o backend local

## Convenções

- Sempre manter o frontend em sintaxe TypeScript e evitar `any` quando a informação é conhecida.
- Atualizar o `README.md` e `UPDATE.md` quando a funcionalidade evoluir.
- Não duplicar regras de negócio que já existem no backend; o frontend deve orquestrar o fluxo.
- Após alterações relevantes, verificar `npm run build`.
