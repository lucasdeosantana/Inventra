# Update

## 2026-09-11

- Criação do frontend `frontend1` com Vite + React + TypeScript.
- Implementação de interface operacional para seleção de produtos, posições, quantidades e confirmação de movimentações.
- Adição de processamento de códigos por meio da API de classificação (`/api/code/:code`).
- Inclusão de suporte a entrada por teclado como comportamento de leitor de código, com buffer global e processamento ao pressionar Enter fora do campo.
- Inclusão de leitura de QR/codebar por câmera do navegador usando `@zxing/browser`, com botão para abrir/parar a câmera e captura automática do resultado.
- Inclusão de PWA básica com `manifest.webmanifest` e `sw.js`.
- Criação dos arquivos `AGENTS.md` e `UPDATE.md` no diretório do frontend.
- Ajuste inicial do `index.html` para suporte a manifest e descrição da aplicação.
