import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../App';

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

export default function AreasPage() {
  const { token, API_URL } = useContext(AuthContext);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const [manageArea, setManageArea] = useState(null);

  const fetchAreas = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/areas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAreas(Array.isArray(data) ? data : data.data || []);
        setListError('');
      } else {
        setListError(await readError(res, 'No se pudieron cargar las áreas'));
      }
    } catch (err) {
      console.error('Error fetching areas:', err);
      setListError('Error de conexión al cargar las áreas');
    } finally {
      setLoading(false);
    }
  }, [API_URL, token]);

  useEffect(() => { fetchAreas(); }, [fetchAreas]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      const res = await fetch(`${API_URL}/api/areas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: createName.trim() }),
      });
      if (!res.ok) {
        setCreateError(await readError(res, 'No se pudo crear el área'));
        return;
      }
      setCreateOpen(false);
      setCreateName('');
      fetchAreas();
    } catch (err) {
      console.error('Error creating area:', err);
      setCreateError('Error de conexión');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>Gestión de Áreas</h2>
        <button id="btn-create-area" className="btn btn-primary" onClick={() => { setCreateName(''); setCreateError(''); setCreateOpen(true); }}>
          + Nueva Área
        </button>
      </div>

      {listError && <div style={errorBoxStyle}>{listError}</div>}

      <div className="card-flat">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>Cargando...</td></tr>
              ) : areas.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>No hay áreas registradas</td></tr>
              ) : (
                areas.map((area) => (
                  <tr key={area.id}>
                    <td style={{ fontWeight: 600 }}>{area.name}</td>
                    <td>
                      <span className={`badge ${area.isActive ? 'badge-success' : 'badge-danger'}`}>
                        <span className={`status-dot ${area.isActive ? 'active' : 'inactive'}`}></span>
                        {area.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-secondary" onClick={() => setManageArea(area)}>
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

      {createOpen && (
        <div className="modal-overlay" onClick={() => setCreateOpen(false)}>
          <div className="modal slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nueva Área</h2>
              <button className="btn-icon" onClick={() => setCreateOpen(false)}>✕</button>
            </div>
            {createError && <div style={errorBoxStyle}>{createError}</div>}
            <form onSubmit={handleCreate}>
              <div className="input-group">
                <label htmlFor="area-name">Nombre del Área</label>
                <input
                  id="area-name"
                  className="input"
                  type="text"
                  placeholder="Ej. Terapia Intensiva"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)}>Cancelar</button>
                <button id="btn-save-area" type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? 'Creando...' : 'Crear área'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {manageArea && (
        <ManageAreaModal
          area={manageArea}
          token={token}
          API_URL={API_URL}
          onClose={() => setManageArea(null)}
          onChanged={fetchAreas}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Modal de gestión de un área: nombre, estado (activar/desactivar), eliminar,
// y gestión del stock (composición estándar) del carro de paro del área.
// ---------------------------------------------------------------------------
function ManageAreaModal({ area, token, API_URL, onClose, onChanged }) {
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const [name, setName] = useState(area.name);
  const [isActive, setIsActive] = useState(area.isActive);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const [carts, setCarts] = useState(null); // null = cargando
  const [qtyDraft, setQtyDraft] = useState({}); // { [itemId]: valorEditado } — se guarda todo junto

  const flash = (m) => { setMsg(m); setErr(''); };
  const fail = (m) => { setErr(m); setMsg(''); };

  const loadCarts = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/crash-carts?areaId=${area.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = res.ok ? await res.json() : [];
      // Traer el detalle (composición) de cada carro.
      const detailed = await Promise.all(
        (Array.isArray(list) ? list : []).map(async (c) => {
          const d = await fetch(`${API_URL}/api/crash-carts/${c.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          return d.ok ? d.json() : c;
        })
      );
      setCarts(detailed);
      setQtyDraft({}); // datos frescos → limpiar borradores
    } catch (e) {
      console.error(e);
      setCarts([]);
      fail('Error al cargar los carros del área');
    }
  }, [API_URL, token, area.id]);

  // Ítems cuya cantidad estándar fue editada y todavía no se guardó.
  const pendingQty = (carts || []).flatMap((cart) => cart.items || []).filter(
    (it) => qtyDraft[it.id] !== undefined && String(qtyDraft[it.id]) !== String(it.standardQuantity)
  );

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
      await loadCarts();
    } finally { setBusy(false); }
  };

  useEffect(() => { loadCarts(); }, [loadCarts]);

  const saveName = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/areas/${area.id}`, {
        method: 'PATCH', headers: authHeaders, body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) return fail(await readError(res, 'No se pudo guardar el nombre'));
      flash('Nombre actualizado');
      onChanged();
    } finally { setBusy(false); }
  };

  const toggleStatus = async () => {
    setBusy(true);
    try {
      let res;
      if (isActive) {
        res = await fetch(`${API_URL}/api/areas/${area.id}/deactivate`, { method: 'POST', headers: authHeaders });
      } else {
        res = await fetch(`${API_URL}/api/areas/${area.id}`, { method: 'PATCH', headers: authHeaders, body: JSON.stringify({ isActive: true }) });
      }
      if (!res.ok) return fail(await readError(res, 'No se pudo cambiar el estado'));
      setIsActive(!isActive);
      flash(isActive ? 'Área desactivada' : 'Área reactivada');
      onChanged();
    } finally { setBusy(false); }
  };

  const removeArea = async () => {
    if (!confirm(`¿Eliminar definitivamente el área "${area.name}"?\n\nSolo se puede si no tiene llamados ni carros de paro asociados. No se puede deshacer.`)) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/areas/${area.id}`, { method: 'DELETE', headers: authHeaders });
      if (!res.ok) return fail(await readError(res, 'No se pudo eliminar el área'));
      onChanged();
      onClose();
    } finally { setBusy(false); }
  };

  // Todo carro nace con la composición estándar (el backend la siembra siempre).
  // Solo se usa como recuperación si un área quedó sin carro.
  const createStandardCart = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/crash-carts`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ name: `Carro - ${area.name}`, areaId: area.id }),
      });
      if (!res.ok) return fail(await readError(res, 'No se pudo crear el carro'));
      flash('Carro creado con la composición estándar (28 medicamentos)');
      await loadCarts();
    } finally { setBusy(false); }
  };

  const loadDefault = async (cartId) => {
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/crash-carts/${cartId}/load-default-composition`, { method: 'POST', headers: authHeaders });
      if (!res.ok) return fail(await readError(res, 'No se pudo cargar la composición estándar'));
      flash('Composición estándar cargada (28 medicamentos)');
      await loadCarts();
    } finally { setBusy(false); }
  };

  const reactivateCart = async (cartId) => {
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/crash-carts/${cartId}/reactivate`, { method: 'POST', headers: authHeaders });
      if (!res.ok) return fail(await readError(res, 'No se pudo reactivar el carro'));
      flash('Carro reactivado (En operación)');
      await loadCarts();
    } finally { setBusy(false); }
  };

  const removeItem = async (itemId) => {
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/crash-cart-items/${itemId}`, { method: 'DELETE', headers: authHeaders });
      if (!res.ok) return fail(await readError(res, 'No se pudo quitar el ítem'));
      flash('Ítem quitado');
      await loadCarts();
    } finally { setBusy(false); }
  };

  const addItem = async (cartId, item) => {
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/crash-cart-items`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({
          crashCartId: cartId,
          name: item.name.trim(),
          standardQuantity: Number(item.standardQuantity) || 1,
          unit: item.unit.trim() || null,
        }),
      });
      if (!res.ok) return fail(await readError(res, 'No se pudo agregar el ítem'));
      flash('Ítem agregado');
      await loadCarts();
      return true;
    } finally { setBusy(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720, width: '95%' }}>
        <div className="modal-header">
          <h2>Gestionar área: {area.name}</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {msg && <div style={{ ...errorBoxStyle, background: 'rgba(34,197,94,0.12)', color: '#16A34A' }}>{msg}</div>}
        {err && <div style={errorBoxStyle}>{err}</div>}

        {/* --- Datos y estado --- */}
        <section style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 8 }}>Datos del área</h3>
          <div className="input-group">
            <label htmlFor="mng-area-name">Nombre</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input id="mng-area-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
              <button className="btn btn-secondary" onClick={saveName} disabled={busy || name.trim() === area.name}>Guardar</button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}>
              <span className={`status-dot ${isActive ? 'active' : 'inactive'}`}></span>
              {isActive ? 'Activa' : 'Inactiva'}
            </span>
            <button className={`btn btn-sm ${isActive ? 'btn-secondary' : 'btn-primary'}`} onClick={toggleStatus} disabled={busy}>
              {isActive ? 'Desactivar área' : 'Reactivar área'}
            </button>
            <button className="btn btn-sm btn-danger" onClick={removeArea} disabled={busy}>Eliminar área</button>
          </div>
        </section>

        {/* --- Stock del carro de paro --- */}
        <section>
          <h3 style={{ marginBottom: 8 }}>Carro de paro del área</h3>
          {carts === null ? (
            <p style={{ color: 'var(--text-tertiary)' }}>Cargando...</p>
          ) : carts.length === 0 ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>
                Esta área no tiene carro de paro (dato viejo: las áreas nuevas ya se crean con uno).
              </span>
              <button className="btn btn-primary" onClick={createStandardCart} disabled={busy}>
                Crear carro estándar (28 medicamentos)
              </button>
            </div>
          ) : (
            carts.map((cart) => (
              <CartStockEditor
                key={cart.id}
                cart={cart}
                busy={busy}
                qtyDraft={qtyDraft}
                onQtyChange={(itemId, value) => setQtyDraft((d) => ({ ...d, [itemId]: value }))}
                onLoadDefault={() => loadDefault(cart.id)}
                onReactivate={() => reactivateCart(cart.id)}
                onRemoveItem={removeItem}
                onAddItem={(item) => addItem(cart.id, item)}
              />
            ))
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
    </div>
  );
}

function CartStockEditor({ cart, busy, qtyDraft, onQtyChange, onLoadDefault, onReactivate, onRemoveItem, onAddItem }) {
  const items = cart.items || [];
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', standardQuantity: 1, unit: '' });

  const outOfService = cart.status === 'OUT_OF_SERVICE';

  return (
    <div style={{ border: '1px solid var(--border, #e5e7eb)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
        <strong>{cart.name}</strong>
        <span className={`badge ${outOfService ? 'badge-danger' : 'badge-success'}`}>
          {outOfService ? 'Fuera de servicio' : 'En operación'}
        </span>
        {outOfService && (
          <button className="btn btn-sm btn-primary" onClick={onReactivate} disabled={busy}>Reactivar carro</button>
        )}
      </div>

      {items.length === 0 ? (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: 'var(--text-tertiary)' }}>Sin composición cargada.</span>
          <button className="btn btn-sm btn-primary" onClick={onLoadDefault} disabled={busy}>
            Cargar composición estándar (28 medicamentos)
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: 'right' }}>#</th>
                <th>Ítem</th>
                <th style={{ width: 120 }}>Cant. estándar</th>
                <th>Unidad</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const draft = qtyDraft[it.id] ?? String(it.standardQuantity);
                const changed = draft !== String(it.standardQuantity);
                return (
                <tr key={it.id}>
                  <td style={{ textAlign: 'right', color: 'var(--text-tertiary)' }}>{i + 1}</td>
                  <td>{it.name}</td>
                  <td>
                    <input
                      className="input"
                      type="number"
                      min={0}
                      style={{ width: 70, ...(changed ? { borderColor: '#F59E0B' } : {}) }}
                      value={draft}
                      onChange={(e) => onQtyChange(it.id, e.target.value)}
                    />
                  </td>
                  <td>{it.unit || '—'}</td>
                  <td>
                    <button className="btn btn-sm btn-danger" onClick={() => onRemoveItem(it.id)} disabled={busy}>Quitar</button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
            <input className="input" type="number" min={0} style={{ width: 80 }} value={newItem.standardQuantity} onChange={(e) => setNewItem({ ...newItem, standardQuantity: e.target.value })} />
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
