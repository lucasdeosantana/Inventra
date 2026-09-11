# Inventra Frontend

Frontend operacional do Inventra, construído com React + TypeScript + Vite para apoio de operações rápidas de estoque em ambientes touchscreen.

## Visão geral

- Listagem de produtos com busca por código, nome ou unidade.
- Seleção de posições em árvore para referência de armazenamento.
- Processamento de códigos lidos por scanner ou digitados manualmente.
- Ajuste de quantidade e execução de movimentos de entrada/saída.
- Feedback de status e última movimentação para operação imediata.
- Estrutura básica de PWA com manifest e service worker.

## Requisitos

- Node.js 18+ (compatível com o ambiente atual do projeto)
- Backend Inventra em execução em `http://localhost:3000`

## Execução

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Observações

- A aplicação usa a API REST do backend para produtos, posições, comandos e movimentações.
- O serviço de classificação de código (`/api/code/:code`) permite reutilizar o mesmo processamento para códigos de scanner e botões.
- O manifest e o service worker permitem uso como PWA local.
