import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../App';
import RestockTicketModal from '../../components/RestockTicketModal';

// El backend responde los errores como { error: { message, details } }.
async function readError(res, fallback) {
  try {
    const data = await res.json();
    return data?.error?.message || fallback;
  } catch {
    return fallback;
  }
}

const errorBoxStyle = {
  padding: '12px',
  background: 'rgba(244, 63, 94, 0.1)',
  color: '#F43F5E',
  borderRadius: '8px',
  marginBottom: '16px',
  fontSize: '0.875rem',
  whiteSpace: 'pre-line',
};

const successBoxStyle = {
  ...errorBoxStyle,
  background: 'rgba(34,197,94,0.12)',
  color: '#16A34A',
};

export default function CrashCartsPage() {
  const { token, API_URL } = useContext(AuthContext);
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [manageCart, setManageCart] = useState(null);

  const fetchCarts = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/crash-carts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCarts(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err) {
      console.error('Error fetching crash carts:', err);
    } finally {
      setLoading(false);
    }
  }, [API_URL, token]);

  useEffect(() => { fetchCarts(); }, [fetchCarts]);

  return (
    <>
      <div className="page-header">
        <h2>Carros de Paro</h2>
        <button id="btn-create-cart" className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
          + Nuevo Carro
        </button>
      </div>

      <div className="card-flat">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Área</th>
                <th className="text-center">Estado</th>
                <th className="text-center">Última Reactivación</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>Cargando...</td></tr>
              ) : carts.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>No hay carros registrados</td></tr>
              ) : (
                carts.map((cart) => (
                  <tr key={cart.id}>
                    <td style={{ fontWeight: 600 }}>{cart.name}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {cart.area?.name || '—'}
                    </td>
                    <td className="text-center">
                      <span className={`badge ${cart.status === 'IN_SERVICE' ? 'badge-success' : 'badge-danger'}`}>
                        <span className={`status-dot ${cart.status === 'IN_SERVICE' ? 'active' : 'inactive'}`}></span>
                        {cart.status === 'IN_SERVICE' ? 'En Operación' : 'Fuera de Servicio'}
                      </span>
                    </td>
                    <td className="text-center" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {cart.reactivatedAt
                        ? new Date(cart.reactivatedAt).toLocaleString('es-AR')
                        : '—'}
                    </td>
                    <td className="text-center">
                      <button className="btn btn-sm btn-secondary" onClick={() => setManageCart(cart)}>
                        Gestionar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* OLI-74: Modal de creación con área obligatoria */}
      {showCreateModal && (
        <CreateCartModal
          token={token}
          API_URL={API_URL}
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchCarts}
        />
      )}

      {/* OLI-68: Modal de gestión */}
      {manageCart && (
        <ManageCartModal
          cart={manageCart}
          token={token}
          API_URL={API_URL}
          onClose={() => setManageCart(null)}
          onChanged={fetchCarts}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// OLI-74: Modal para crear nuevo carro con área obligatoria
// ---------------------------------------------------------------------------
function CreateCartModal({ token, API_URL, onClose, onCreated }) {
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const [name, setName] = useState('');
  const [areaId, setAreaId] = useState('');
  const [areas, setAreas] = useState([]);
  const [existingCarts, setExistingCarts] = useState([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Cargar áreas activas y carros existentes para filtrar
    Promise.all([
      fetch(`${API_URL}/api/areas?isActive=true`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API_URL}/api/crash-carts`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([areasData, cartsData]) => {
      setAreas(Array.isArray(areasData) ? areasData : areasData.data || []);
      setExistingCarts(Array.isArray(cartsData) ? cartsData : cartsData.data || []);
    }).catch(() => setError('Error al cargar datos'));
  }, [API_URL, token]);

  // Áreas que aún no tienen carro de paro
  const areasWithoutCart = areas.filter(a => !existingCarts.some(c => c.areaId === a.id || c.area?.id === a.id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const res = await fetch(`${API_URL}/api/crash-carts`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ name: name.trim(), areaId }),
      });
      if (!res.ok) {
        setError(await readError(res, 'No se pudo crear el carro'));
        return;
      }
      onCreated();
      onClose();
    } catch {
      setError('Error de conexión');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nuevo Carro de Paro</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        {error && <div style={errorBoxStyle}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="input-group" style={{ marginBottom: 16 }}>
            <label htmlFor="cart-name">Nombre del Carro</label>
            <input
              id="cart-name"
              className="input"
              type="text"
              placeholder="Ej. Carro UTI Piso 3"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="cart-area">Área *</label>
            {areasWithoutCart.length === 0 && areas.length > 0 ? (
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                Todas las áreas activas ya tienen un carro de paro asignado.
              </p>
            ) : (
              <select
                id="cart-area"
                className="input"
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                required
              >
                <option value="">Seleccionar área...</option>
                {areasWithoutCart.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}
          </div>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem', marginTop: 8 }}>
            Se creará con la composición estándar (28 medicamentos).
          </p>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button
              id="btn-save-cart"
              type="submit"
              className="btn btn-primary"
              disabled={creating || !areaId}
            >
              {creating ? 'Creando...' : 'Crear Carro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// OLI-68: Modal de gestión completo
// Incluye: OLI-69 (activar/desactivar), OLI-70 (eliminar), OLI-71 (stock),
//          OLI-72 (select de área), OLI-73 (última reactivación)
// ---------------------------------------------------------------------------
function ManageCartModal({ cart: initialCart, token, API_URL, onClose, onChanged }) {
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const [cart, setCart] = useState(null); // detalle completo (con items, consumptions, reactivatedBy)
  const [name, setName] = useState(initialCart.name);
  const [areaId, setAreaId] = useState(initialCart.areaId || initialCart.area?.id || '');
  const [areas, setAreas] = useState([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [qtyDraft, setQtyDraft] = useState({});
  const [showRestock, setShowRestock] = useState(false);

  // Secciones desplegables (colapsadas al abrir el modal).
  const [showStock, setShowStock] = useState(false);
  const [showConsumptions, setShowConsumptions] = useState(false);
  const [consumptions, setConsumptions] = useState(null);

  const flash = (m) => { setMsg(m); setErr(''); };
  const fail = (m) => { setErr(m); setMsg(''); };

  const loadConsumptions = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/crash-carts/${initialCart.id}/consumptions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setConsumptions(res.ok ? await res.json() : []);
    } catch {
      setConsumptions([]);
    }
  }, [API_URL, token, initialCart.id]);

  // Cargar detalle del carro y áreas
  const loadDetail = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/crash-carts/${initialCart.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCart(data);
        setQtyDraft({});
      } else {
        fail('Error al cargar el detalle del carro');
      }
    } catch {
      fail('Error de conexión');
    }
  }, [API_URL, token, initialCart.id]);

  useEffect(() => {
    loadDetail();
    fetch(`${API_URL}/api/areas?isActive=true`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setAreas(Array.isArray(data) ? data : data.data || []))
      .catch(() => {});
  }, [loadDetail, API_URL, token]);

  const items = cart?.items || [];
  const outOfService = (cart || initialCart).status === 'OUT_OF_SERVICE';

  // Ítems cuya cantidad fue editada
  const pendingQty = items.filter(
    (it) => qtyDraft[it.id] !== undefined && String(qtyDraft[it.id]) !== String(it.standardQuantity)
  );

  // --- Acciones ---

  const saveName = async () => {
    if (name.trim() === initialCart.name) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/crash-carts/${initialCart.id}`, {
        method: 'PATCH', headers: authHeaders, body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) return fail(await readError(res, 'No se pudo guardar el nombre'));
      flash('Nombre actualizado');
      onChanged();
    } finally { setBusy(false); }
  };

  // OLI-72: Cambiar de área
  const changeArea = async (newAreaId) => {
    setAreaId(newAreaId);
    if (!newAreaId || newAreaId === (cart?.areaId || initialCart.areaId)) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/crash-carts/${initialCart.id}`, {
        method: 'PATCH', headers: authHeaders, body: JSON.stringify({ areaId: newAreaId }),
      });
      if (!res.ok) {
        setAreaId(cart?.areaId || initialCart.areaId || '');
        return fail(await readError(res, 'No se pudo cambiar de área'));
      }
      flash('Área actualizada');
      onChanged();
      await loadDetail();
    } finally { setBusy(false); }
  };

  // Reactivar carro: pasa por el ticket de reposición (RestockTicketModal).
  const onReactivated = async () => {
    flash('Carro reactivado — En operación');
    onChanged();
    await loadDetail();
  };

  // OLI-70: Eliminar carro
  const deleteCart = async () => {
    if (!confirm(`¿Eliminar definitivamente el carro "${initialCart.name}"?\n\nSolo se puede si no tiene consumos ni eventos asociados. No se puede deshacer.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/crash-carts/${initialCart.id}`, {
        method: 'DELETE', headers: authHeaders,
      });
      if (!res.ok) return fail(await readError(res, 'No se pudo eliminar el carro'));
      onChanged();
      onClose();
    } finally { setBusy(false); }
  };

  // Stock: guardar cantidades editadas
  const saveAllQty = async () => {
    if (!pendingQty.length) return;
    setBusy(true);
    try {
      for (const it of pendingQty) {
        const res = await fetch(`${API_URL}/api/crash-cart-items/${it.id}`, {
          method: 'PATCH', headers: authHeaders,
          body: JSON.stringify({ standardQuantity: Number(qtyDraft[it.id]) }),
        });
        if (!res.ok) return fail(await readError(res, `No se pudo guardar "${it.name}"`));
      }
      flash(`${pendingQty.length} cantidad(es) actualizada(s)`);
      await loadDetail();
    } finally { setBusy(false); }
  };

  // Stock: quitar ítem
  const removeItem = async (itemId) => {
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/crash-cart-items/${itemId}`, {
        method: 'DELETE', headers: authHeaders,
      });
      if (!res.ok) return fail(await readError(res, 'No se pudo quitar el ítem'));
      flash('Ítem quitado');
      await loadDetail();
    } finally { setBusy(false); }
  };

  // Stock: agregar ítem
  const addItem = async (item) => {
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/crash-cart-items`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({
          crashCartId: initialCart.id,
          name: item.name.trim(),
          standardQuantity: Number(item.standardQuantity) || 1,
          unit: item.unit.trim() || null,
        }),
      });
      if (!res.ok) return fail(await readError(res, 'No se pudo agregar el ítem'));
      flash('Ítem agregado');
      await loadDetail();
      return true;
    } finally { setBusy(false); }
  };

  // Stock: cargar composición estándar en carro vacío
  const loadDefault = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/crash-carts/${initialCart.id}/load-default-composition`, {
        method: 'POST', headers: authHeaders,
      });
      if (!res.ok) return fail(await readError(res, 'No se pudo cargar la composición estándar'));
      flash('Composición estándar cargada (28 medicamentos)');
      await loadDetail();
    } finally { setBusy(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720, width: '95%' }}>
        <div className="modal-header">
          <h2>Gestionar carro: {initialCart.name}</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {msg && <div style={successBoxStyle}>{msg}</div>}
        {err && <div style={errorBoxStyle}>{err}</div>}

        {/* --- Datos del carro --- */}
        <section style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 8 }}>Datos del carro</h3>
          <div className="input-group" style={{ marginBottom: 12 }}>
            <label htmlFor="mng-cart-name">Nombre</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input id="mng-cart-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
              <button className="btn btn-secondary" onClick={saveName} disabled={busy || name.trim() === initialCart.name}>Guardar</button>
            </div>
          </div>

          {/* OLI-72: Select de área */}
          <div className="input-group" style={{ marginBottom: 12 }}>
            <label htmlFor="mng-cart-area">Área</label>
            <select
              id="mng-cart-area"
              className="input"
              value={areaId}
              onChange={(e) => changeArea(e.target.value)}
              disabled={busy}
            >
              <option value="">Sin área</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* OLI-69: Estado + Reactivar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
            <span className={`badge ${outOfService ? 'badge-danger' : 'badge-success'}`}>
              <span className={`status-dot ${outOfService ? 'inactive' : 'active'}`}></span>
              {outOfService ? 'Fuera de Servicio' : 'En Operación'}
            </span>
            {outOfService && (
              <button className="btn btn-sm btn-primary" onClick={() => setShowRestock(true)} disabled={busy}>
                Reactivar carro
              </button>
            )}
            {/* OLI-70: Eliminar */}
            <button className="btn btn-sm btn-danger" onClick={deleteCart} disabled={busy}>Eliminar carro</button>
          </div>

          {/* OLI-73: Última reactivación con fecha + usuario */}
          {cart?.reactivatedAt && (
            <div style={{ marginTop: 10, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Última reactivación:{' '}
              <strong>{new Date(cart.reactivatedAt).toLocaleString('es-AR')}</strong>
              {cart.reactivatedBy?.username && (
                <> por <strong>{cart.reactivatedBy.username}</strong></>
              )}
            </div>
          )}
        </section>

        {/* --- Secciones desplegables --- */}
        <section>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setShowStock((s) => !s)}>
              {showStock ? '▾ Ocultar composición estándar (stock)' : '▸ Ver composición estándar (stock)'}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => {
                const next = !showConsumptions;
                setShowConsumptions(next);
                if (next && consumptions === null) loadConsumptions();
              }}
            >
              {showConsumptions ? '▾ Ocultar historial de consumos' : '▸ Ver historial de consumos'}
            </button>
          </div>

          {showStock && (
            <div style={{ marginTop: 14 }}>
              <h3 style={{ marginBottom: 8 }}>Composición estándar (stock)</h3>
              {cart === null ? (
                <p style={{ color: 'var(--text-tertiary)' }}>Cargando...</p>
              ) : (
                <CartStockEditor
                  items={items}
                  busy={busy}
                  qtyDraft={qtyDraft}
                  onQtyChange={(itemId, value) => setQtyDraft((d) => ({ ...d, [itemId]: value }))}
                  onLoadDefault={loadDefault}
                  onRemoveItem={removeItem}
                  onAddItem={addItem}
                />
              )}
            </div>
          )}

          {showConsumptions && (
            <div style={{ marginTop: 14 }}>
              <h3 style={{ marginBottom: 8 }}>Historial de consumos</h3>
              <ConsumptionHistory consumptions={consumptions} />
            </div>
          )}
        </section>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={saveAllQty}
            disabled={busy || pendingQty.length === 0}
          >
            {pendingQty.length ? `Guardar (${pendingQty.length})` : 'Guardar'}
          </button>
        </div>
      </div>

      {showRestock && (
        <RestockTicketModal
          cartId={initialCart.id}
          token={token}
          API_URL={API_URL}
          onClose={() => setShowRestock(false)}
          onReactivated={onReactivated}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// OLI-71: Editor de stock del carro (tabla de ítems con edición inline)
// ---------------------------------------------------------------------------
function CartStockEditor({ items, busy, qtyDraft, onQtyChange, onLoadDefault, onRemoveItem, onAddItem }) {
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', standardQuantity: 1, unit: '' });

  if (items.length === 0) {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ color: 'var(--text-tertiary)' }}>Sin composición cargada.</span>
        <button className="btn btn-sm btn-primary" onClick={onLoadDefault} disabled={busy}>
          Cargar composición estándar (28 medicamentos)
        </button>
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid var(--border-subtle, #333947)', borderRadius: 8, padding: 12 }}>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Ítem</th>
              <th className="text-center" style={{ width: 120 }}>Cant. estándar</th>
              <th className="text-center">Unidad</th>
              <th className="text-center" style={{ width: 100 }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const draft = qtyDraft[it.id] ?? String(it.standardQuantity);
              const changed = draft !== String(it.standardQuantity);
              return (
                <tr key={it.id}>
                  <td>{it.name}</td>
                  <td className="text-center">
                    <input
                      className="input"
                      type="number"
                      min={0} max={9999}
                      style={{ width: 88, textAlign: 'right', paddingRight: 6, ...(changed ? { borderColor: '#F59E0B' } : {}) }}
                      value={draft}
                      onChange={(e) => onQtyChange(it.id, e.target.value)}
                    />
                  </td>
                  <td className="text-center">{it.unit || '—'}</td>
                  <td className="text-center">
                    <button className="btn btn-sm btn-danger" onClick={() => onRemoveItem(it.id)} disabled={busy}>Quitar</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {adding ? (
        <form
          style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, alignItems: 'flex-end' }}
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await onAddItem(newItem);
            if (ok) { setNewItem({ name: '', standardQuantity: 1, unit: '' }); setAdding(false); }
          }}
        >
          <div className="input-group" style={{ margin: 0 }}>
            <label>Ítem</label>
            <input className="input" required value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="Ej. Adrenalina" />
          </div>
          <div className="input-group" style={{ margin: 0 }}>
            <label>Cantidad</label>
            <input className="input" type="number" min={0} max={9999} style={{ width: 96, textAlign: 'right', paddingRight: 6 }} value={newItem.standardQuantity} onChange={(e) => setNewItem({ ...newItem, standardQuantity: e.target.value })} />
          </div>
          <div className="input-group" style={{ margin: 0 }}>
            <label>Unidad</label>
            <input className="input" style={{ width: 110 }} value={newItem.unit} onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })} placeholder="ampolla" />
          </div>
          <button type="submit" className="btn btn-sm btn-primary" disabled={busy}>Agregar</button>
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => setAdding(false)}>Cancelar</button>
        </form>
      ) : (
        <button className="btn btn-sm btn-secondary" style={{ marginTop: 10 }} onClick={() => setAdding(true)}>+ Agregar ítem</button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Historial de consumos del carro (todos los consumos a lo largo del tiempo)
// con filtros por fecha, ítem y tipo de llamado.
// ---------------------------------------------------------------------------
function ConsumptionHistory({ consumptions }) {
  const [filter, setFilter] = useState({ from: '', to: '', item: 'ALL', type: 'ALL' });

  if (consumptions === null) {
    return <p style={{ color: 'var(--text-tertiary)' }}>Cargando...</p>;
  }
  if (consumptions.length === 0) {
    return <p style={{ color: 'var(--text-tertiary)' }}>Este carro no registra consumos.</p>;
  }

  const itemNames = [...new Set(consumptions.map((c) => c.crashCartItem?.name).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es'));

  const rows = consumptions.filter((c) => {
    const d = new Date(c.consumedAt);
    if (filter.from && d < new Date(`${filter.from}T00:00:00`)) return false;
    if (filter.to && d > new Date(`${filter.to}T23:59:59`)) return false;
    if (filter.item !== 'ALL' && c.crashCartItem?.name !== filter.item) return false;
    if (filter.type !== 'ALL' && c.call?.type !== filter.type) return false;
    return true;
  });

  const totalUnits = rows.reduce((s, c) => s + c.quantity, 0);
  const filtered = filter.from || filter.to || filter.item !== 'ALL' || filter.type !== 'ALL';
  const set = (patch) => setFilter((f) => ({ ...f, ...patch }));

  return (
    <>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 10 }}>
        <div className="input-group" style={{ margin: 0 }}>
          <label>Desde</label>
          <input type="date" className="input" value={filter.from} onChange={(e) => set({ from: e.target.value })} />
        </div>
        <div className="input-group" style={{ margin: 0 }}>
          <label>Hasta</label>
          <input type="date" className="input" value={filter.to} onChange={(e) => set({ to: e.target.value })} />
        </div>
        <div className="input-group" style={{ margin: 0 }}>
          <label>Ítem</label>
          <select className="input" value={filter.item} onChange={(e) => set({ item: e.target.value })}>
            <option value="ALL">Todos</option>
            {itemNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div className="input-group" style={{ margin: 0 }}>
          <label>Tipo de llamado</label>
          <select className="input" value={filter.type} onChange={(e) => set({ type: e.target.value })}>
            <option value="ALL">Todos</option>
            <option value="EMERGENCY">Emergencia</option>
            <option value="NORMAL">Normal</option>
          </select>
        </div>
        {filtered && (
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setFilter({ from: '', to: '', item: 'ALL', type: 'ALL' })}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
        {rows.length} consumo(s) · {totalUnits} unidad(es) en total
      </p>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: 40, textAlign: 'right' }}>#</th>
              <th>Fecha y hora</th>
              <th>Ítem</th>
              <th style={{ width: 90 }}>Cantidad</th>
              <th>Unidad</th>
              <th>Llamado</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>Sin consumos para los filtros elegidos</td></tr>
            ) : (
              rows.map((c, i) => (
                <tr key={c.id}>
                  <td style={{ textAlign: 'right', color: 'var(--text-tertiary)' }}>{i + 1}</td>
                  <td>{new Date(c.consumedAt).toLocaleString('es-AR')}</td>
                  <td>{c.crashCartItem?.name || '(ítem eliminado)'}</td>
                  <td>{c.quantity}</td>
                  <td>{c.crashCartItem?.unit || '—'}</td>
                  <td>
                    {c.call ? (
                      <span className={`badge ${c.call.type === 'EMERGENCY' ? 'badge-danger' : 'badge-info'}`}>
                        {c.call.type === 'EMERGENCY' ? 'Emergencia' : 'Normal'}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
