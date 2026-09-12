import { useEffect, useMemo, useState } from 'react';

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

type Position = {
  id: number;
  code: string;
  name: string;
  parentId: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

type PositionTreeNode = Position & {
  children: PositionTreeNode[];
};

type StockMovement = {
  id: number;
  productId: number;
  positionId: number | null;
  type: 'ENTRY' | 'EXIT';
  quantityRequested: string;
  quantityEffective: string;
  previousQuantity: string;
  newQuantity: string;
  operationId: string;
  source: string | null;
  createdAt: string;
};

type ProductForm = {
  code: string;
  name: string;
  description: string;
  unit: string;
  quantity: string;
};

type PositionForm = {
  code: string;
  name: string;
  parentCode: string;
};

const API_BASE = '';

const emptyProductForm: ProductForm = {
  code: '',
  name: '',
  description: '',
  unit: '',
  quantity: '0',
};

const emptyPositionForm: PositionForm = {
  code: '',
  name: '',
  parentCode: '',
};

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message ?? 'Falha ao carregar os dados.');
  }

  return response.json() as Promise<T>;
}

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [positionsTree, setPositionsTree] = useState<PositionTreeNode[]>([]);
  const [stockHistory, setStockHistory] = useState<StockMovement[]>([]);
  const [status, setStatus] = useState('Carregando dados...');
  const [error, setError] = useState<string | null>(null);

  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [productEditId, setProductEditId] = useState<number | null>(null);

  const [positionForm, setPositionForm] = useState<PositionForm>(emptyPositionForm);
  const [positionEditId, setPositionEditId] = useState<number | null>(null);

  const [productSearch, setProductSearch] = useState('');
  const [positionSearch, setPositionSearch] = useState('');

  const loadAll = async () => {
    try {
      const [productsResponse, positionsResponse, treeResponse, historyResponse] = await Promise.all([
        fetchJson<Product[]>('/api/products'),
        fetchJson<Position[]>('/api/positions'),
        fetchJson<PositionTreeNode[]>('/api/positions/tree'),
        fetchJson<StockMovement[]>('/api/stock/history'),
      ]);

      setProducts(productsResponse);
      setPositions(positionsResponse);
      setPositionsTree(treeResponse);
      setStockHistory(historyResponse);
      setError(null);
      setStatus('Dados carregados com sucesso.');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Erro ao carregar dados.');
      setStatus('Falha ao carregar os dados.');
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();

    if (!term) {
      return products;
    }

    return products.filter(
      (product) =>
        product.code.toLowerCase().includes(term) ||
        product.name.toLowerCase().includes(term) ||
        product.unit.toLowerCase().includes(term),
    );
  }, [productSearch, products]);

  const filteredPositions = useMemo(() => {
    const term = positionSearch.trim().toLowerCase();

    if (!term) {
      return positions;
    }

    return positions.filter(
      (position) => position.code.toLowerCase().includes(term) || position.name.toLowerCase().includes(term),
    );
  }, [positionSearch, positions]);

  const createProduct = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      await fetchJson<Product>('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          ...productForm,
          quantity: productForm.quantity || '0',
          description: productForm.description || null,
          active: true,
        }),
      });

      setProductForm(emptyProductForm);
      setStatus('Produto criado com sucesso.');
      setError(null);
      await loadAll();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Erro ao criar produto.');
    }
  };

  const updateProduct = async (event: React.FormEvent) => {
    event.preventDefault();

    if (productEditId === null) {
      return;
    }

    try {
      await fetchJson<Product>(`/api/products/${productEditId}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...productForm,
          description: productForm.description || null,
        }),
      });

      setProductEditId(null);
      setProductForm(emptyProductForm);
      setStatus('Produto atualizado com sucesso.');
      setError(null);
      await loadAll();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Erro ao atualizar produto.');
    }
  };

  const deleteProduct = async (id: number) => {
    try {
      await fetchJson<Product>(`/api/products/${id}`, {
        method: 'DELETE',
      });

      setStatus('Produto removido com sucesso.');
      setError(null);
      await loadAll();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Erro ao remover produto.');
    }
  };

  const createPosition = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      await fetchJson<Position>('/api/positions', {
        method: 'POST',
        body: JSON.stringify({
          code: positionForm.code,
          name: positionForm.name,
          parentCode: positionForm.parentCode || null,
          active: true,
        }),
      });

      setPositionForm(emptyPositionForm);
      setStatus('Posição criada com sucesso.');
      setError(null);
      await loadAll();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Erro ao criar posição.');
    }
  };

  const updatePosition = async (event: React.FormEvent) => {
    event.preventDefault();

    if (positionEditId === null) {
      return;
    }

    try {
      await fetchJson<Position>(`/api/positions/${positionEditId}`, {
        method: 'PUT',
        body: JSON.stringify({
          code: positionForm.code,
          name: positionForm.name,
          parentCode: positionForm.parentCode || null,
        }),
      });

      setPositionEditId(null);
      setPositionForm(emptyPositionForm);
      setStatus('Posição atualizada com sucesso.');
      setError(null);
      await loadAll();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Erro ao atualizar posição.');
    }
  };

  const deletePosition = async (id: number) => {
    try {
      await fetchJson<Position>(`/api/positions/${id}`, {
        method: 'DELETE',
      });

      setStatus('Posição removida com sucesso.');
      setError(null);
      await loadAll();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Erro ao remover posição.');
    }
  };

  const renderTree = (items: PositionTreeNode[], level = 0): JSX.Element[] =>
    items.flatMap((item) => [
      <div key={item.id} className="tree-node" style={{ marginLeft: level * 18 }}>
        <div className="tree-node-main">
          <strong>{item.name}</strong>
          <span>{item.code}</span>
        </div>
        <div className="tree-actions">
          <button
            type="button"
            className="mini-button"
            onClick={() => {
              setPositionEditId(item.id);
              setPositionForm({
                code: item.code,
                name: item.name,
                parentCode: item.parentId ? positions.find((position) => position.id === item.parentId)?.code ?? '' : '',
              });
            }}
          >
            Editar
          </button>
          <button type="button" className="mini-button danger" onClick={() => void deletePosition(item.id)}>
            Excluir
          </button>
        </div>
      </div>,
      ...(item.children.length > 0 ? renderTree(item.children, level + 1) : []),
    ]);

  return (
    <div className="crud-shell">
      <header className="crud-header">
        <div>
          <p className="eyebrow">Inventra</p>
          <h1>CRUD do banco de dados</h1>
        </div>
        <button type="button" className="primary-button" onClick={() => void loadAll()}>
          Atualizar dados
        </button>
      </header>

      <section className="status-bar">
        <div>
          <span className="label">Status</span>
          <strong>{status}</strong>
        </div>
        {error && <div className="error-banner">{error}</div>}
      </section>

      <main className="crud-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Produtos</h2>
          </div>

          <form className="form-panel" onSubmit={productEditId === null ? createProduct : updateProduct}>
            <div className="field-grid">
              <label>
                Código
                <input value={productForm.code} onChange={(event) => setProductForm({ ...productForm, code: event.target.value })} />
              </label>
              <label>
                Nome
                <input value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} />
              </label>
              <label>
                Unidade
                <input value={productForm.unit} onChange={(event) => setProductForm({ ...productForm, unit: event.target.value })} />
              </label>
              <label>
                Quantidade
                <input value={productForm.quantity} onChange={(event) => setProductForm({ ...productForm, quantity: event.target.value })} />
              </label>
            </div>
            <label>
              Descrição
              <textarea
                value={productForm.description}
                onChange={(event) => setProductForm({ ...productForm, description: event.target.value })}
              />
            </label>

            <div className="button-row">
              <button type="submit" className="primary-button">
                {productEditId === null ? 'Salvar produto' : 'Atualizar produto'}
              </button>
              {productEditId !== null && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setProductEditId(null);
                    setProductForm(emptyProductForm);
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <div className="search-wrap">
            <input
              value={productSearch}
              onChange={(event) => setProductSearch(event.target.value)}
              placeholder="Buscar produtos"
            />
          </div>

          <div className="list-box">
            {filteredProducts.map((product) => (
              <article key={product.id} className="record-card">
                <div>
                  <span className="record-code">{product.code}</span>
                  <h3>{product.name}</h3>
                  <p>{product.unit}</p>
                  <small>{product.quantity}</small>
                </div>
                <div className="record-actions">
                  <button
                    type="button"
                    className="mini-button"
                    onClick={() => {
                      setProductEditId(product.id);
                      setProductForm({
                        code: product.code,
                        name: product.name,
                        description: product.description ?? '',
                        unit: product.unit,
                        quantity: product.quantity,
                      });
                    }}
                  >
                    Editar
                  </button>
                  <button type="button" className="mini-button danger" onClick={() => void deleteProduct(product.id)}>
                    Excluir
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Posições</h2>
          </div>

          <form className="form-panel" onSubmit={positionEditId === null ? createPosition : updatePosition}>
            <div className="field-grid">
              <label>
                Código
                <input value={positionForm.code} onChange={(event) => setPositionForm({ ...positionForm, code: event.target.value })} />
              </label>
              <label>
                Nome
                <input value={positionForm.name} onChange={(event) => setPositionForm({ ...positionForm, name: event.target.value })} />
              </label>
              <label>
                Código da posição pai
                <input
                  value={positionForm.parentCode}
                  onChange={(event) => setPositionForm({ ...positionForm, parentCode: event.target.value })}
                />
              </label>
            </div>

            <div className="button-row">
              <button type="submit" className="primary-button">
                {positionEditId === null ? 'Salvar posição' : 'Atualizar posição'}
              </button>
              {positionEditId !== null && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setPositionEditId(null);
                    setPositionForm(emptyPositionForm);
                  }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <div className="search-wrap">
            <input
              value={positionSearch}
              onChange={(event) => setPositionSearch(event.target.value)}
              placeholder="Buscar posições"
            />
          </div>

          <div className="tree-box">{renderTree(filteredPositions.length > 0 ? positionsTree : [])}</div>
        </section>

        <section className="panel wide-panel">
          <div className="panel-header">
            <h2>Histórico de movimentações</h2>
          </div>

          <div className="history-list">
            {stockHistory.map((movement) => (
              <div key={movement.operationId} className="history-card">
                <div>
                  <span className={`chip ${movement.type === 'ENTRY' ? 'entry' : 'exit'}`}>{movement.type}</span>
                  <strong>{movement.operationId.slice(0, 8)}</strong>
                </div>
                <p>Solicitado: {movement.quantityRequested}</p>
                <p>Efetivo: {movement.quantityEffective}</p>
                <small>{new Date(movement.createdAt).toLocaleString('pt-BR')}</small>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
