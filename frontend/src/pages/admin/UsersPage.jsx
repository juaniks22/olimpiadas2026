import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';

export default function UsersPage() {
  const { token, API_URL } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'GENERIC' });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        // El backend responde { error: { message, details } }: leer .error.message.
        setErrorMsg(errorData?.error?.message || 'Error al crear la cuenta');
        return;
      }

      setShowModal(false);
      setForm({ username: '', password: '', role: 'GENERIC' });
      fetchUsers();
    } catch (err) {
      console.error('Error creating user:', err);
      setErrorMsg('Error de conexión');
    }
  };

  const handleToggleActive = async (user) => {
    const action = user.isActive ? 'desactivar' : 'activar';
    if (!confirm(`¿${action} la cuenta de "${user.username}"?`)) return;
    try {
      const endpoint = user.isActive ? 'deactivate' : 'reactivate';
      await fetch(`${API_URL}/api/users/${user.id}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        }
      });
      fetchUsers();
    } catch (err) {
      console.error('Error toggling user:', err);
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>Gestión de Cuentas</h2>
        <button id="btn-create-user" className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Nueva Cuenta
        </button>
      </div>

      <div className="card-flat">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>Cargando...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>No hay cuentas registradas</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.username}</td>
                    <td>
                      <span className={`badge ${u.role === 'ADMIN' ? 'badge-info' : 'badge-warning'}`}>
                        {u.role === 'ADMIN' ? 'Administrador' : 'Genérico'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                        <span className={`status-dot ${u.isActive ? 'active' : 'inactive'}`}></span>
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm ${u.isActive ? 'btn-danger' : 'btn-primary'}`}
                        onClick={() => handleToggleActive(u)}
                      >
                        {u.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nueva Cuenta</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            {errorMsg && (
              <div style={{ padding: '12px', background: 'rgba(244, 63, 94, 0.1)', color: '#F43F5E', borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                <div className="input-group">
                  <label htmlFor="user-username">Nombre de usuario</label>
                  <input
                    id="user-username"
                    className="input"
                    type="text"
                    placeholder="Ej. jpiso"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    required
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="user-password">Contraseña</label>
                  <input
                    id="user-password"
                    className="input"
                    type="password"
                    placeholder="8-12 caract., mayús, minús, num, símbolo"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    minLength={8}
                    maxLength={12}
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="user-role">Rol</label>
                  <select
                    id="user-role"
                    className="input"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="GENERIC">Genérico (Jefe de Piso)</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button id="btn-save-user" type="submit" className="btn btn-primary">Crear cuenta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
