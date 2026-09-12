import { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserCodeReader, BrowserMultiFormatReader } from '@zxing/browser';
import './App.css';

type Product = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  unit: string;
  quantity: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type PositionNode = {
  id: number;
  code: string;
  name: string;
  parentId: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  children: PositionNode[];
};

type PositionContentItem = {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  positionId: number;
  quantity: string;
};

type CommandAction = 'INCREMENT_QUANTITY' | 'DECREMENT_QUANTITY' | 'CONFIRM' | 'CANCEL';

type CommandDefinition = {
  action: CommandAction;
  value?: number;
};

type CommandsMap = Record<string, CommandDefinition>;

type ClassificationResult = {
  type: 'PRODUCT' | 'POSITION' | 'COMMAND' | 'UNKNOWN';
  code: string;
  command?: CommandDefinition;
};

type MovementResult = {
  productId: number;
  type: 'ENTRY' | 'EXIT';
  quantityRequested: string;
  quantityEffective: string;
  previousQuantity: string;
  newQuantity: string;
  operationId: string;
  source: string | null;
};

const API_BASE = '';

const jsonHeaders = {
  'Content-Type': 'application/json',
};

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...jsonHeaders,
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message = payload?.message ?? 'Não foi possível completar a operação.';
    throw new Error(message);
  }

  return (await response.json()) as T;
}

const percentagePresets = [
  { label: '-10%', value: 10 },
  { label: '-50%', value: 50 },
  { label: '-1/3', value: 33.333333 },
  { label: '-1/4', value: 25 },
];

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [positionsTree, setPositionsTree] = useState<PositionNode[]>([]);
  const [positionContents, setPositionContents] = useState<PositionContentItem[]>([]);
  const [commands, setCommands] = useState<CommandsMap>({});
  const [selectedProductCode, setSelectedProductCode] = useState<string | null>(null);
  const [currentPositionCode, setCurrentPositionCode] = useState<string | null>(null);
  const [scanCode, setScanCode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [quantityMode, setQuantityMode] = useState<'ABSOLUTE' | 'PERCENT'>('ABSOLUTE');
  const [movementType, setMovementType] = useState<'ENTRY' | 'EXIT'>('EXIT');
  const [status, setStatus] = useState('Pronto para operar.');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastMovement, setLastMovement] = useState<MovementResult | null>(null);
  const [searchText, setSearchText] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStatus, setCameraStatus] = useState('Câmera desligada.');

  const scanInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerBufferRef = useRef('');
  const scannerTimerRef = useRef<number | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const selectedProduct = useMemo(
    () => products.find((product) => product.code === selectedProductCode) ?? null,
    [products, selectedProductCode],
  );

  const activePositionName = useMemo(() => {
    const visit = (items: PositionNode[]): string | null => {
      for (const item of items) {
        if (item.code === currentPositionCode) {
          return item.name;
        }

        const nestedName = visit(item.children);
        if (nestedName) {
          return nestedName;
        }
      }

      return null;
    };

    return visit(positionsTree);
  }, [currentPositionCode, positionsTree]);

  const filteredProducts = useMemo(() => {
    const term = searchText.trim().toLowerCase();

    if (!term) {
      return products;
    }

    return products.filter(
      (product) =>
        product.code.toLowerCase().includes(term) ||
        product.name.toLowerCase().includes(term) ||
        product.unit.toLowerCase().includes(term),
    );
  }, [products, searchText]);

  useEffect(() => {
    void loadInitialData();
  }, []);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
      });
    }
  }, []);

  useEffect(() => {
    scanInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditableTarget = target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(target.tagName);

      if (isEditableTarget) {
        return;
      }

      if (event.key === 'Enter') {
        const pendingCode = scannerBufferRef.current.trim();

        if (!pendingCode) {
          return;
        }

        event.preventDefault();
        scannerBufferRef.current = '';
        void processCode(pendingCode);
        return;
      }

      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        scannerBufferRef.current += event.key;

        if (scannerTimerRef.current) {
          window.clearTimeout(scannerTimerRef.current);
        }

        scannerTimerRef.current = window.setTimeout(() => {
          scannerBufferRef.current = '';
        }, 250);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);

      if (scannerTimerRef.current) {
        window.clearTimeout(scannerTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!currentPositionCode) {
      setPositionContents([]);
      return;
    }

    void loadPositionContents(currentPositionCode);
  }, [currentPositionCode]);

  const loadInitialData = async () => {
    setIsLoading(true);

    try {
      const [productsResponse, positionsResponse, commandsResponse] = await Promise.all([
        fetchJson<Product[]>(`/api/products`),
        fetchJson<PositionNode[]>(`/api/positions/tree`),
        fetchJson<CommandsMap>(`/api/commands`),
      ]);

      setProducts(productsResponse);
      setPositionsTree(positionsResponse);
      setCommands(commandsResponse);
      setError(null);
      setStatus('Dados carregados.');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Erro ao carregar os dados do sistema.');
      setStatus('Não foi possível carregar o sistema.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPositionContents = async (positionCode: string) => {
    try {
      const response = await fetchJson<PositionContentItem[]>(`/api/positions/${encodeURIComponent(positionCode)}/contents`);
      setPositionContents(response);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Erro ao carregar itens da posição.');
      setPositionContents([]);
    }
  };

  const refreshInventory = async () => {
    try {
      const productsResponse = await fetchJson<Product[]>(`/api/products`);
      setProducts(productsResponse);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Erro ao atualizar o inventário.');
    }
  };

  const processCode = async (codeValue: string) => {
    const cleanedCode = codeValue.trim();

    if (!cleanedCode) {
      setError('Informe um código para processar.');
      return;
    }

    setScanCode(cleanedCode);

    try {
      setError(null);
      const result = await fetchJson<ClassificationResult>(`/api/code/${encodeURIComponent(cleanedCode)}`);

      if (result.type === 'PRODUCT') {
        setSelectedProductCode(result.code);
        setMovementType('EXIT');
        setQuantity(1);
        setQuantityMode('ABSOLUTE');
        setStatus(`Produto selecionado: ${result.code}. Saída priorizada.`);
        return;
      }

      if (result.type === 'POSITION') {
        setCurrentPositionCode(result.code);
        setStatus(`Posição ativa: ${result.code}`);
        return;
      }

      if (result.type === 'COMMAND' && result.command) {
        await applyCommand(cleanedCode, result.command);
        return;
      }

      setStatus(`Código desconhecido: ${cleanedCode}`);
      setError('Código não cadastrado como produto, posição ou comando.');
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : 'Código inválido.');
      setStatus('Falha ao processar o código informado.');
    }
  };

  const handleCodeSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    await processCode(scanCode);
  };

  const stopCamera = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;

    BrowserCodeReader.releaseAllStreams();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setIsCameraOpen(false);
    setCameraStatus('Câmera desligada.');
  };

  const startCamera = async () => {
    try {
      setError(null);
      setCameraStatus('Solicitando acesso à câmera...');

      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        throw new Error(
          'A câmera não está disponível neste navegador. Abra a aplicação em http://localhost:5173 ou http://127.0.0.1:5173 e permita o uso da câmera.',
        );
      }

      const video = videoRef.current;

      if (!video) {
        setError('A pré-visualização da câmera ainda não foi inicializada.');
        setCameraStatus('Pré-visualização indisponível.');
        return;
      }

      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: 'environment' },
          },
        },
        video,
        async (result, _error, _controls) => {
          if (result) {
            const scannedCode = result.getText();
            stopCamera();
            await processCode(scannedCode);
          }
        },
      );

      controlsRef.current = controls;
      setIsCameraOpen(true);
      setCameraStatus('Câmera ativa. Aponte para o QR/codebar.');
    } catch (cameraError) {
      const message = cameraError instanceof Error ? cameraError.message : 'Não foi possível abrir a câmera.';
      setError(message);
      setCameraStatus('Erro ao abrir a câmera.');
      stopCamera();
    }
  };

  const applyCommand = async (code: string, command: CommandDefinition) => {
    const normalizedValue = command.value ?? 1;

    switch (command.action) {
      case 'INCREMENT_QUANTITY': {
        setQuantityMode('ABSOLUTE');
        setQuantity((current) => {
          const next = Math.max(1, current + normalizedValue);
          setStatus(`Quantidade ajustada para ${next}.`);
          return next;
        });
        break;
      }
      case 'DECREMENT_QUANTITY': {
        setQuantityMode('ABSOLUTE');
        setQuantity((current) => {
          const next = Math.max(1, current - normalizedValue);
          setStatus(`Quantidade ajustada para ${next}.`);
          return next;
        });
        break;
      }
      case 'CONFIRM': {
        if (!selectedProduct) {
          setError('Selecione um produto antes de confirmar a movimentação.');
          return;
        }

        try {
          const payload = {
            productCode: selectedProduct.code,
            type: movementType,
            quantity,
            isPercent: quantityMode === 'PERCENT',
            positionCode: currentPositionCode ?? undefined,
            source: 'frontend1',
          };

          const response = await fetchJson<MovementResult>(`/api/stock/movement`, {
            method: 'POST',
            body: JSON.stringify(payload),
          });

          setLastMovement(response);
          setStatus(
            `${movementType === 'ENTRY' ? 'Entrada' : 'Saída'} confirmada para ${selectedProduct.code}.`,
          );
          setQuantity(1);
          setQuantityMode('ABSOLUTE');
          setError(null);
          await refreshInventory();
        } catch (movementError) {
          setError(movementError instanceof Error ? movementError.message : 'Erro ao confirmar movimentação.');
          setStatus('Erro ao confirmar movimentação.');
        }
        break;
      }
      case 'CANCEL':
        setQuantity(1);
        setQuantityMode('ABSOLUTE');
        setMovementType('EXIT');
        setStatus(`Operação cancelada para o código ${code}.`);
        break;
      default:
        setStatus(`Comando ${code} executado.`);
    }
  };

  const applyPreset = (value: number, label: string) => {
    setQuantity(value);
    setQuantityMode('PERCENT');
    setStatus(`Quantidade definida em ${label} sobre o produto atual.`);
  };

  const renderPositionTree = (items: PositionNode[]) =>
    items.map((position) => (
      <div className="position-node" key={position.id}>
        <button
          className={`position-button ${currentPositionCode === position.code ? 'active' : ''}`}
          type="button"
          onClick={() => {
            setCurrentPositionCode(position.code);
            setStatus(`Posição ativa: ${position.code}`);
          }}
        >
          <span>{position.name}</span>
          <small>{position.code}</small>
        </button>
        {position.children.length > 0 && (
          <div className="position-children">{renderPositionTree(position.children)}</div>
        )}
      </div>
    ));

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Inventra</p>
          <h1>Operação de estoque</h1>
        </div>

        <div className="topbar-badges">
          <span className={`pill ${movementType === 'ENTRY' ? 'entry' : 'exit'}`}>
            {movementType === 'ENTRY' ? 'Entrada' : 'Saída'}
          </span>
          <span className="pill neutral">{currentPositionCode ?? 'Sem posição'}</span>
        </div>
      </header>

      <section className="status-row">
        <div>
          <span className="label">Status</span>
          <strong>{status}</strong>
        </div>
        <div>
          <span className="label">Produto</span>
          <strong>{selectedProduct ? `${selectedProduct.code} · ${selectedProduct.name}` : 'Nenhum produto'}</strong>
        </div>
      </section>

      {error && <div className="error-banner">{error}</div>}

      <main className="single-screen">
        <section className="panel primary-panel">
          <div className="scan-toolbar">
            <form className="scan-form" onSubmit={handleCodeSubmit}>
              <label htmlFor="scanCode">Código do scanner</label>
              <div className="scan-input-group">
                <input
                  id="scanCode"
                  ref={scanInputRef}
                  value={scanCode}
                  onChange={(event) => setScanCode(event.target.value)}
                  placeholder="Escaneie ou digite um código"
                />
                <button type="submit" className="primary-button">
                  Processar
                </button>
              </div>
            </form>

            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                if (isCameraOpen) {
                  stopCamera();
                  return;
                }

                void startCamera();
              }}
            >
              {isCameraOpen ? 'Parar câmera' : 'Ler com câmera'}
            </button>
          </div>

          <small className="camera-status">{cameraStatus}</small>

          <div className={`camera-panel ${isCameraOpen ? 'visible' : 'hidden'}`}>
            <video ref={videoRef} className="camera-video" muted playsInline autoPlay />
          </div>

          <div className="operation-header">
            <div>
              <span className="label">Seleção atual</span>
              <strong className="selected-product-name">
                {selectedProduct ? `${selectedProduct.code} · ${selectedProduct.name}` : 'Produto ainda não selecionado'}
              </strong>
            </div>

            <div className="header-meta">
              <span className="pill neutral">{currentPositionCode ?? 'Nenhuma posição'}</span>
              <span className="pill neutral">{selectedProduct ? `${selectedProduct.quantity} ${selectedProduct.unit}` : '0 itens'}</span>
            </div>
          </div>

          <div className="movement-selector">
            <button
              type="button"
              className={movementType === 'EXIT' ? 'active' : ''}
              onClick={() => setMovementType('EXIT')}
            >
              Saída
            </button>
            <button
              type="button"
              className={movementType === 'ENTRY' ? 'active' : ''}
              onClick={() => setMovementType('ENTRY')}
            >
              Entrada
            </button>
          </div>

          <div className="quantity-panel">
            <div className="quantity-header">
              <span>Quantidade</span>
              <strong>{quantityMode === 'PERCENT' ? `${quantity}%` : quantity}</strong>
            </div>

            <div className="preset-grid">
              {percentagePresets.map((preset) => (
                <button key={preset.label} type="button" onClick={() => applyPreset(preset.value, preset.label)}>
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="quick-actions">
              <button
                type="button"
                onClick={() => {
                  setQuantityMode('ABSOLUTE');
                  setQuantity((current) => Math.max(1, current - 1));
                }}
              >
                -1
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuantityMode('ABSOLUTE');
                  setQuantity((current) => current + 1);
                }}
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuantityMode('ABSOLUTE');
                  setQuantity(10);
                }}
              >
                10
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuantityMode('ABSOLUTE');
                  setQuantity(100);
                }}
              >
                100
              </button>
            </div>
          </div>

          <div className="action-row">
            <button type="button" className="primary-button" onClick={() => void applyCommand('confirm', { action: 'CONFIRM' })}>
              Confirmar
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setQuantity(1);
                setQuantityMode('ABSOLUTE');
                setMovementType('EXIT');
                setStatus('Operação reiniciada.');
              }}
            >
              Reiniciar
            </button>
          </div>

          <div className="panel-header compact-header">
            <h2>Produtos</h2>
            <button type="button" className="ghost-button" onClick={() => void loadInitialData()}>
              Atualizar
            </button>
          </div>

          <input
            className="search-input"
            type="text"
            placeholder="Buscar produto, código ou unidade"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />

          <div className="product-list">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                className={`product-card ${selectedProductCode === product.code ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedProductCode(product.code);
                  setQuantity(1);
                  setQuantityMode('ABSOLUTE');
                  setMovementType('EXIT');
                  setStatus(`Produto selecionado: ${product.code}. Saída priorizada.`);
                }}
              >
                <span className="product-code">{product.code}</span>
                <strong>{product.name}</strong>
                <span>
                  {product.quantity} {product.unit}
                </span>
              </button>
            ))}
          </div>
        </section>

        <aside className="panel sidebar-panel">
          <div className="info-block">
            <div className="panel-header compact-header">
              <h2>Posição atual</h2>
            </div>

            <div className="position-summary">
              <strong>{currentPositionCode ?? 'Nenhuma posição ativa'}</strong>
              <small>{activePositionName ?? 'Selecione uma posição'}</small>
            </div>

            <div className="content-list">
              {positionContents.length > 0 ? (
                positionContents.map((item) => (
                  <div key={item.id} className="position-item">
                    <span className="product-code">{item.productCode}</span>
                    <strong>{item.productName}</strong>
                    <small>{item.quantity}</small>
                  </div>
                ))
              ) : (
                <div className="empty-state">Nenhum item cadastrado nesta posição.</div>
              )}
            </div>
          </div>

          <div className="info-block">
            <div className="panel-header compact-header">
              <h2>Posições</h2>
            </div>
            <div className="tree-wrapper">{renderPositionTree(positionsTree)}</div>
          </div>

          <div className="info-block">
            <div className="panel-header compact-header">
              <h2>Comandos</h2>
            </div>
            <div className="command-grid">
              {Object.entries(commands).map(([code, command]) => (
                <button
                  key={code}
                  type="button"
                  className="command-button"
                  onClick={() => {
                    void applyCommand(code, command);
                  }}
                >
                  <span>{code}</span>
                  <small>{command.action}</small>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </main>

      {lastMovement && (
        <section className="panel movement-card">
          <div className="panel-header compact-header">
            <h2>Última movimentação</h2>
          </div>
          <div className="movement-result">
            <span>{lastMovement.type}</span>
            <strong>{lastMovement.quantityEffective}</strong>
            <small>Operação {lastMovement.operationId.slice(0, 8)}</small>
          </div>
        </section>
      )}

      {isLoading && <div className="loading-overlay">Carregando...</div>}
    </div>
  );
}

export default App;
