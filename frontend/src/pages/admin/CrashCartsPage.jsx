import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';

export default function CrashCartsPage() {
  const { token, API_URL } = useContext(AuthContext);
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCartName, setNewCartName] = useState('');

  const fetchCarts = async () => {
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
  };

  useEffect(() => { fetchCarts(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${API_URL}/api/crash-carts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newCartName }),
      });
      setShowCreateModal(false);
      setNewCartName('');
      fetchCarts();
    } catch (err) {
      console.error('Error creating crash cart:', err);
    }
  };

  const handleReactivate = async (cartId) => {
    if (!confirm('¿Reactivar este carro? Se restablecerá su stock al estándar.')) return;
    try {
      await fetch(`${API_URL}/api/crash-carts/${cartId}/reactivate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCarts();
    } catch (err) {
      console.error('Error reactivating crash cart:', err);
    }
  };

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
                <th>Estado</th>
                <th>Última Reactivación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>Cargando...</td></tr>
              ) : carts.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>No hay carros registrados</td></tr>
              ) : (
                carts.map((cart) => (
                  <tr key={cart.id}>
                    <td style={{ fontWeight: 600 }}>{cart.name}</td>
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
                      <div style={{ display: 'flex', gap: 8 }}>
                        {cart.status === 'OUT_OF_SERVICE' && (
                          <button className="btn btn-sm btn-primary" onClick={() => handleReactivate(cart.id)}>
                            Reactivar
                          </button>
                        )}
                        <button className="btn btn-sm btn-secondary">Ver Stock</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Cart Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nuevo Carro de Paro</h2>
              <button className="btn-icon" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="input-group">
                <label htmlFor="cart-name">Nombre del Carro</label>
                <input
                  id="cart-name"
                  className="input"
                  type="text"
                  placeholder="Ej. Carro UTI Piso 3"
                  value={newCartName}
                  onChange={(e) => setNewCartName(e.target.value)}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancelar</button>
                <button id="btn-save-cart" type="submit" className="btn btn-primary">Crear Carro</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
