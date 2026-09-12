# Inventra Frontend

Frontend operacional do Inventra, construído com React + TypeScript + Vite para apoio de operações rápidas de estoque em ambientes touchscreen.

## Visão geral

- Operação em uma única tela central, com foco em leitura rápida por scanner e uso em tablet/terminal.
- Listagem de produtos com busca por código, nome ou unidade.
- Seleção de posições em árvore para referência de armazenamento e visualização dos itens da posição atual.
- Processamento de códigos lidos por scanner, digitados manualmente ou via câmera do navegador.
- Fluxo de operação com saída priorizada ao escanear um produto, enquanto entrada continua disponível.
- Ajuste rápido de quantidade com presets de porcentagem (`-10%`, `-50%`, `-1/3`, `-1/4`) e ações de +/- 1, 10 e 100.
- Feedback de status, erros e última movimentação para operação imediata.
- Atualização automática periódica dos dados em segundo plano, sem necessidade de recarregar a tela.
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
- O serviço de classificação de código (`/api/code/:code`) permite reutilizar o mesmo processamento para códigos de scanner, botões e câmeras.
- A interface foi reestruturada para operação em uma única tela, com foco em velocidade e leitura clara em dispositivos operacionais.
- O manifest e o service worker permitem uso como PWA local.
