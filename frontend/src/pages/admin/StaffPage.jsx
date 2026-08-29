import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';

export default function StaffPage() {
  const { token, API_URL } = useContext(AuthContext);
  const [staff, setStaff] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ dni: '', name: '', role: '', certifications: '' });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchStaff = async () => {
    try {
      const res = await fetch(`${API_URL}/api/staff-members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStaff(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err) {
      console.error('Error fetching staff:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    // Convert empty strings to null/undefined or simply pass them, backend accepts null for optional fields
    const body = {
      dni: form.dni,
      name: form.name,
      role: form.role || undefined,
      certifications: form.certifications || undefined
    };

    try {
      const method = editingId ? 'PATCH' : 'POST';
      const url = editingId 
        ? `${API_URL}/api/staff-members/${editingId}`
        : `${API_URL}/api/staff-members`;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        setErrorMsg(errorData.error?.message || 'Error al guardar el integrante');
        return;
      }

      closeModal();
      fetchStaff();
    } catch (err) {
      console.error('Error saving staff:', err);
      setErrorMsg('Error de conexión');
    }
  };

  const handleToggleActive = async (member) => {
    const action = member.isActive ? 'desactivar' : 'activar';
    if (!confirm(`¿Estás seguro de ${action} a "${member.name}"?`)) return;
    try {
      await fetch(`${API_URL}/api/staff-members/${member.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !member.isActive }),
      });
      fetchStaff();
    } catch (err) {
      console.error('Error toggling staff member:', err);
    }
  };

  const openEdit = (member) => {
    setEditingId(member.id);
    setForm({
      dni: member.dni,
      name: member.name,
      role: member.role || '',
      certifications: member.certifications || ''
    });
    setErrorMsg('');
    setShowModal(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ dni: '', name: '', role: '', certifications: '' });
    setErrorMsg('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm({ dni: '', name: '', role: '', certifications: '' });
    setErrorMsg('');
  };

  return (
    <>
      <div className="page-header">
        <h2>Personal Certificado</h2>
        <button className="btn btn-primary" onClick={openCreate}>
          + Nuevo Integrante
        </button>
      </div>

      <div className="card-flat">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>DNI</th>
                <th>Nombre</th>
                <th>Rol / Especialidad</th>
                <th>Certificaciones</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>Cargando...</td></tr>
              ) : staff.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>No hay personal registrado</td></tr>
              ) : (
                staff.map((u) => (
                  <tr key={u.id} className={!u.isActive ? 'inactive-row' : ''}>
                    <td style={{ fontWeight: 600 }}>{u.dni}</td>
                    <td>{u.name}</td>
                    <td>{u.role || <span style={{ color: 'var(--text-tertiary)' }}>No especificado</span>}</td>
                    <td>{u.certifications || <span style={{ color: 'var(--text-tertiary)' }}>No especificado</span>}</td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                        <span className={`status-dot ${u.isActive ? 'active' : 'inactive'}`}></span>
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(u)}>
                          Editar
                        </button>
                        <button
                          className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-primary'}`}
                          onClick={() => handleToggleActive(u)}
                        >
                          {u.isActive ? 'Desactivar' : 'Activar'}
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
              <h2>{editingId ? 'Editar Integrante' : 'Nuevo Integrante'}</h2>
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
                  <label htmlFor="staff-dni">DNI</label>
                  <input
                    id="staff-dni"
                    className="input"
                    type="text"
                    placeholder="Documento único"
                    value={form.dni}
                    onChange={(e) => setForm({ ...form, dni: e.target.value })}
                    required
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="staff-name">Nombre completo</label>
                  <input
                    id="staff-name"
                    className="input"
                    type="text"
                    placeholder="Ej. Juan Pérez"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="staff-role">Rol / Especialidad (Opcional)</label>
                  <input
                    id="staff-role"
                    className="input"
                    type="text"
                    placeholder="Ej. Cardiólogo"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="staff-cert">Certificaciones (Opcional)</label>
                  <input
                    id="staff-cert"
                    className="input"
                    type="text"
                    placeholder="Ej. ACLS, RCP Avanzado"
                    value={form.certifications}
                    onChange={(e) => setForm({ ...form, certifications: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Guardar cambios' : 'Crear integrante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
