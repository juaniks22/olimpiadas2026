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
                <th>Estado</th>
                <th>Última Reactivación</th>
                <th>Acciones</th>
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
                    <td>
                      <span className={`badge ${cart.status === 'IN_SERVICE' ? 'badge-success' : 'badge-danger'}`}>
                        <span className={`status-dot ${cart.status === 'IN_SERVICE' ? 'active' : 'inactive'}`}></span>
                        {cart.status === 'IN_SERVICE' ? 'En Operación' : 'Fuera de Servicio'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {cart.reactivatedAt
                        ? new Date(cart.reactivatedAt).toLocaleString('es-AR')
                        : '—'}
                    </td>
                    <td>
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
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Un área puede tener varios carros: se listan todas las áreas activas.
    fetch(`${API_URL}/api/areas?isActive=true`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setAreas(Array.isArray(data) ? data : data.data || []))
      .catch(() => setError('Error al cargar las áreas'));
  }, [API_URL, token]);

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
            <select
              id="cart-area"
              className="input"
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              required
            >
              <option value="">Seleccionar área...</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem', marginTop: 8 }}>
            Hereda la composición estándar del área elegida (mismos ítems y cantidades). Un área puede tener varios carros.
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

  const flash = (m) => { setMsg(m); setErr(''); };
  const fail = (m) => { setErr(m); setMsg(''); };

  // Cargar detalle del carro y áreas
  const loadDetail = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/crash-carts/${initialCart.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setCart(await res.json());
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

  // OLI-69: Reactivar carro
  const reactivateCart = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/crash-carts/${initialCart.id}/reactivate`, {
        method: 'POST', headers: authHeaders,
      });
      if (!res.ok) return fail(await readError(res, 'No se pudo reactivar el carro'));
      flash('Carro reactivado — En operación');
      onChanged();
      await loadDetail();
    } finally { setBusy(false); }
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
              <button className="btn btn-sm btn-primary" onClick={reactivateCart} disabled={busy}>
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

        {/* --- Composición estándar: SOLO LECTURA. Se edita desde Áreas. --- */}
        <section>
          <h3 style={{ marginBottom: 8 }}>Composición estándar (stock)</h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem', marginBottom: 10 }}>
            Solo visualización. Para cambiar el contenido de un carro, editá la composición
            estándar del área en <strong>Áreas → Gestionar</strong>.
          </p>
          {cart === null ? (
            <p style={{ color: 'var(--text-tertiary)' }}>Cargando...</p>
          ) : items.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)' }}>Sin composición cargada.</p>
          ) : (
            <div style={{ border: '1px solid var(--border-subtle, #333947)', borderRadius: 8, padding: 12 }}>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 40, textAlign: 'right' }}>#</th>
                      <th>Ítem</th>
                      <th style={{ width: 120 }}>Cant. estándar</th>
                      <th>Unidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr key={it.id}>
                        <td style={{ textAlign: 'right', color: 'var(--text-tertiary)' }}>{i + 1}</td>
                        <td>{it.name}</td>
                        <td>{it.standardQuantity}</td>
                        <td>{it.unit || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
