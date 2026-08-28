import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';

export default function AreasPage() {
  const { token, API_URL } = useContext(AuthContext);
  const [areas, setAreas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [formName, setFormName] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAreas = async () => {
    try {
      const res = await fetch(`${API_URL}/api/areas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAreas(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err) {
      console.error('Error fetching areas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAreas(); }, []);

  const openCreate = () => {
    setEditingArea(null);
    setFormName('');
    setShowModal(true);
  };

  const openEdit = (area) => {
    setEditingArea(area);
    setFormName(area.name);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const method = editingArea ? 'PUT' : 'POST';
    const url = editingArea
      ? `${API_URL}/api/areas/${editingArea.id}`
      : `${API_URL}/api/areas`;

    try {
      await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: formName }),
      });
      setShowModal(false);
      fetchAreas();
    } catch (err) {
      console.error('Error saving area:', err);
    }
  };

  const handleDeactivate = async (id) => {
    if (!confirm('¿Desactivar esta área?')) return;
    try {
      await fetch(`${API_URL}/api/areas/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAreas();
    } catch (err) {
      console.error('Error deactivating area:', err);
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>Gestión de Áreas</h2>
        <button id="btn-create-area" className="btn btn-primary" onClick={openCreate}>
          + Nueva Área
        </button>
      </div>

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
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(area)}>Editar</button>
                        {area.isActive && (
                          <button className="btn btn-sm btn-danger" onClick={() => handleDeactivate(area.id)}>Desactivar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingArea ? 'Editar Área' : 'Nueva Área'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label htmlFor="area-name">Nombre del Área</label>
                <input
                  id="area-name"
                  className="input"
                  type="text"
                  placeholder="Ej. Terapia Intensiva"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button id="btn-save-area" type="submit" className="btn btn-primary">
                  {editingArea ? 'Guardar cambios' : 'Crear área'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
