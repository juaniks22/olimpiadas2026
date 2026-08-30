import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';

export default function ResponseTeamPositionsPage() {
  const { token, API_URL } = useContext(AuthContext);
  const [positions, setPositions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '' });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchPositions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/response-team-positions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPositions(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err) {
      console.error('Error fetching positions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPositions(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (form.name.trim().length === 0 || form.name.trim().length > 30) {
      setErrorMsg('El nombre de la posición debe tener entre 1 y 30 caracteres.');
      return;
    }

    try {
      const method = editingId ? 'PATCH' : 'POST';
      const url = editingId 
        ? `${API_URL}/api/response-team-positions/${editingId}`
        : `${API_URL}/api/response-team-positions`;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        setErrorMsg(errorData.error?.message || 'Error al guardar la posición');
        return;
      }

      closeModal();
      fetchPositions();
    } catch (err) {
      console.error('Error saving position:', err);
      setErrorMsg('Error de conexión');
    }
  };

  const handleToggleActive = async (pos) => {
    const action = pos.isActive ? 'desactivar' : 'activar';
    if (!confirm(`¿Estás seguro de ${action} la posición "${pos.name}"?`)) return;
    try {
      await fetch(`${API_URL}/api/response-team-positions/${pos.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !pos.isActive }),
      });
      fetchPositions();
    } catch (err) {
      console.error('Error toggling position:', err);
    }
  };

  const openEdit = (pos) => {
    setEditingId(pos.id);
    setForm({ name: pos.name });
    setErrorMsg('');
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '' });
    setErrorMsg('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm({ name: '' });
    setErrorMsg('');
  };

  return (
    <>
      <div className="page-header">
        <h2>Posiciones de Respuesta</h2>
        <button className="btn btn-primary" onClick={openCreate}>
          + Nueva Posición
        </button>
      </div>

      <div className="card-flat">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nombre de la Posición</th>
                <th className="text-center">Estado</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>Cargando...</td></tr>
              ) : positions.length === 0 ? (
                <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>No hay posiciones registradas</td></tr>
              ) : (
                positions.map((pos) => (
                  <tr key={pos.id} className={!pos.isActive ? 'inactive-row' : ''}>
                    <td style={{ fontWeight: 600 }}>{pos.name}</td>
                    <td className="text-center">
                      <span className={`badge ${pos.isActive ? 'badge-success' : 'badge-danger'}`}>
                        <span className={`status-dot ${pos.isActive ? 'active' : 'inactive'}`}></span>
                        {pos.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="text-center">
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(pos)}>
                          Editar
                        </button>
                        <button
                          className={`btn btn-sm ${pos.isActive ? 'btn-danger' : 'btn-primary'}`}
                          onClick={() => handleToggleActive(pos)}
                        >
                          {pos.isActive ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Editar Posición' : 'Nueva Posición'}</h2>
              <button className="btn-icon" onClick={closeModal}>✕</button>
            </div>
            
            {errorMsg && (
              <div style={{ padding: '12px', background: 'rgba(244, 63, 94, 0.1)', color: '#F43F5E', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                <div className="input-group">
                  <label htmlFor="pos-name">Nombre de la Posición (máx. 30 caracteres)</label>
                  <input
                    id="pos-name"
                    className="input"
                    type="text"
                    maxLength={30}
                    placeholder="Ej. Vía Aérea, Líder"
                    value={form.name}
                    onChange={(e) => setForm({ name: e.target.value.slice(0, 30) })}
                    required
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Guardar cambios' : 'Crear posición'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
