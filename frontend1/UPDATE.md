# Update

## 2026-09-12

- Reestruturação da interface do frontend para uma tela única e ocupando 100% da área disponível.
- Ajuste do fluxo de operação para priorizar saída ao escanear produto e manter entrada como alternativa.
- Adição dos botões de percentual `-10%`, `-50%`, `-1/3` e `-1/4` para movimentações rápidas sobre um produto.
- Inclusão da visualização do conteúdo da posição atual após o scan de uma posição.
- Atualização do comportamento de leitura por scanner para manter o mesmo processamento da API (`/api/code/:code`).
- Revisão do layout para melhor leitura em tablet/terminal e para reduzir a necessidade de navegação entre telas.

## 2026-09-11

- Criação do frontend `frontend1` com Vite + React + TypeScript.
- Implementação de interface operacional para seleção de produtos, posições, quantidades e confirmação de movimentações.
- Adição de processamento de códigos por meio da API de classificação (`/api/code/:code`).
- Inclusão de suporte a entrada por teclado como comportamento de leitor de código, com buffer global e processamento ao pressionar Enter fora do campo.
- Inclusão de leitura de QR/codebar por câmera do navegador usando `@zxing/browser`, com botão para abrir/parar a câmera e captura automática do resultado.
- Inclusão de PWA básica com `manifest.webmanifest` e `sw.js`.
- Criação dos arquivos `AGENTS.md` e `UPDATE.md` no diretório do frontend.
- Ajuste inicial do `index.html` para suporte a manifest e descrição da aplicação.
