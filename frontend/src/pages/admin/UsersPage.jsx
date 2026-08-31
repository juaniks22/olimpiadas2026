import { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../../App';
import useAutoRefresh from '../../hooks/useAutoRefresh';

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

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);

// Campo de contraseña con el ojito de ver/ocultar DENTRO del input.
function PasswordField({ id, value, onChange, placeholder, show, onToggle, required }) {
  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <input
        id={id}
        className="input"
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        minLength={8}
        maxLength={12}
        style={{ width: '100%', paddingRight: 40 }}
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={show ? 'Ocultar contraseña' : 'Ver contraseña'}
        title={show ? 'Ocultar contraseña' : 'Ver contraseña'}
        style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          background: 'none', border: 'none', cursor: 'pointer', padding: 2,
          display: 'flex', alignItems: 'center', color: 'var(--text-tertiary)',
        }}
      >
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

export default function UsersPage() {
  const { token, API_URL } = useContext(AuthContext);
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [manageUser, setManageUser] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : data.data || []);
        setListError('');
      } else {
        setListError(await readError(res, 'No se pudieron cargar las cuentas'));
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setListError('Error de conexión al cargar las cuentas');
    } finally {
      setLoading(false);
    }
  }, [API_URL, token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useAutoRefresh(fetchUsers); // refresco silencioso periódico

  return (
    <>
      <div className="page-header">
        <h2>Gestión de Cuentas</h2>
        <button id="btn-create-user" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          + Nueva Cuenta
        </button>
      </div>

      {listError && <div style={errorBoxStyle}>{listError}</div>}

      <div className="card-flat">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th className="text-center">Rol</th>
                <th className="text-center">Estado</th>
                <th className="text-center">Acciones</th>
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
                    <td className="text-center">
                      <span className={`badge ${u.role === 'ADMIN' ? 'badge-info' : 'badge-warning'}`}>
                        {u.role === 'ADMIN' ? 'Administrador' : 'Genérico (Jefe de Piso)'}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                        <span className={`status-dot ${u.isActive ? 'active' : 'inactive'}`}></span>
                        {u.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="text-center">
                      <button className="btn btn-sm btn-secondary" onClick={() => setManageUser(u)}>
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
        <CreateUserModal
          token={token}
          API_URL={API_URL}
          authHeaders={authHeaders}
          onClose={() => setCreateOpen(false)}
          onCreated={fetchUsers}
        />
      )}

      {manageUser && (
        <ManageUserModal
          user={manageUser}
          API_URL={API_URL}
          authHeaders={authHeaders}
          onClose={() => setManageUser(null)}
          onChanged={fetchUsers}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Alta de cuenta (siempre rol GENERIC). Clave manual o generada con "Generar".
// ---------------------------------------------------------------------------
function CreateUserModal({ API_URL, authHeaders, onClose, onCreated }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/users/generate-password`, { method: 'POST', headers: authHeaders });
      if (!res.ok) return setError(await readError(res, 'No se pudo generar la clave'));
      const data = await res.json();
      setPassword(data.password || '');
      setShowPassword(true); // mostrarla para que el Admin la copie
    } catch {
      setError('Error de conexión');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/users`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (!res.ok) {
        setError(await readError(res, 'No se pudo crear la cuenta'));
        return;
      }
      onCreated();
      onClose();
    } catch (err) {
      console.error('Error creating user:', err);
      setError('Error de conexión');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nueva Cuenta (Jefe de Piso)</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        {error && <div style={errorBoxStyle}>{error}</div>}
        <form onSubmit={handleCreate}>
          <div className="input-group">
            <label htmlFor="new-user-username">Nombre de usuario</label>
            <input
              id="new-user-username"
              className="input"
              type="text"
              placeholder="Ej. jperez"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="new-user-password">Contraseña</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <PasswordField
                id="new-user-password"
                placeholder="8-12 caract.: mayús, minús, número y símbolo"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                show={showPassword}
                onToggle={() => setShowPassword((s) => !s)}
                required
              />
              <button type="button" className="btn btn-secondary" onClick={generate}>Generar</button>
            </div>
            <small style={{ color: 'var(--text-tertiary)' }}>
              "Generar" crea una clave segura automáticamente. Copiala antes de guardar.
            </small>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button id="btn-save-user" type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Creando...' : 'Crear cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gestión de una cuenta existente. Un solo "Guardar" abajo a la derecha aplica
// el cambio de nombre y/o contraseña juntos. La cuenta ADMIN solo permite
// cambiar la contraseña.
// ---------------------------------------------------------------------------
function ManageUserModal({ user, API_URL, authHeaders, onClose, onChanged }) {
  const isAdmin = user.role === 'ADMIN';

  const [username, setUsername] = useState(user.username);
  const [isActive, setIsActive] = useState(user.isActive);
  const [newPass, setNewPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const flash = (m) => { setMsg(m); setErr(''); };
  const fail = (m) => { setErr(m); setMsg(''); };

  const usernameChanged = !isAdmin && username.trim() && username.trim() !== user.username;
  const hasNewPass = newPass.length > 0;
  const dirty = usernameChanged || hasNewPass;

  const generatePass = async () => {
    setErr('');
    try {
      const res = await fetch(`${API_URL}/api/users/generate-password`, { method: 'POST', headers: authHeaders });
      if (!res.ok) return fail(await readError(res, 'No se pudo generar la clave'));
      const data = await res.json();
      setNewPass(data.password || '');
      setShowPass(true);
    } catch {
      fail('Error de conexión');
    }
  };

  // Un solo Guardar: aplica lo que haya cambiado (nombre y/o contraseña).
  const handleSave = async () => {
    if (!dirty) return;
    if (hasNewPass && (newPass.length < 8 || newPass.length > 12)) {
      return fail('La contraseña debe tener entre 8 y 12 caracteres');
    }
    setBusy(true);
    try {
      const done = [];
      if (usernameChanged) {
        const res = await fetch(`${API_URL}/api/users/${user.id}`, {
          method: 'PATCH', headers: authHeaders,
          body: JSON.stringify({ username: username.trim() }),
        });
        if (!res.ok) return fail(await readError(res, 'No se pudo cambiar el nombre de usuario'));
        done.push('nombre de usuario');
      }
      if (hasNewPass) {
        const res = await fetch(`${API_URL}/api/users/${user.id}/reset-password`, {
          method: 'POST', headers: authHeaders,
          body: JSON.stringify({ password: newPass }),
        });
        if (!res.ok) return fail(await readError(res, 'No se pudo cambiar la contraseña'));
        done.push('contraseña');
        setNewPass('');
        setShowPass(false);
      }
      flash(`Actualizado: ${done.join(' y ')}.`);
      onChanged();
    } catch (e) {
      console.error(e);
      fail('Error de conexión');
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async () => {
    setBusy(true);
    try {
      const action = isActive ? 'deactivate' : 'reactivate';
      const res = await fetch(`${API_URL}/api/users/${user.id}/${action}`, {
        method: 'POST', headers: authHeaders,
      });
      if (!res.ok) return fail(await readError(res, 'No se pudo cambiar el estado de la cuenta'));
      setIsActive(!isActive);
      flash(isActive ? 'Cuenta desactivada' : 'Cuenta reactivada');
      onChanged();
    } catch (e) {
      console.error(e);
      fail('Error de conexión');
    } finally {
      setBusy(false);
    }
  };

  const removeUser = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/users/${user.id}`, {
        method: 'DELETE', headers: authHeaders,
      });
      if (!res.ok) {
        setConfirmDelete(false);
        return fail(await readError(res, 'No se pudo eliminar la cuenta'));
      }
      onChanged();
      onClose();
    } catch (e) {
      console.error(e);
      fail('Error de conexión');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560, width: '95%' }}>
        <div className="modal-header">
          <h2>Gestionar cuenta: {user.username}</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {msg && <div style={successBoxStyle}>{msg}</div>}
        {err && <div style={errorBoxStyle}>{err}</div>}

        {isAdmin && (
          <div style={{ ...successBoxStyle, background: 'rgba(59,130,246,0.1)', color: '#3B82F6' }}>
            Esta es la cuenta Administradora: no se puede eliminar, desactivar ni renombrar. Solo se le puede cambiar la contraseña.
          </div>
        )}

        {!isAdmin && (
          <section style={{ marginBottom: 18 }}>
            <h3 style={{ marginBottom: 8 }}>Nombre de usuario</h3>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={usernameChanged ? { borderColor: '#F59E0B' } : undefined}
            />
          </section>
        )}

        <section style={{ marginBottom: 18 }}>
          <h3 style={{ marginBottom: 8 }}>Cambiar contraseña</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <PasswordField
              placeholder="Dejar vacío para no cambiarla"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              show={showPass}
              onToggle={() => setShowPass((s) => !s)}
            />
            <button className="btn btn-secondary" onClick={generatePass} disabled={busy}>Generar</button>
          </div>
        </section>

        {!isAdmin && (
          <section>
            <h3 style={{ marginBottom: 8 }}>Estado de la cuenta</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}>
                <span className={`status-dot ${isActive ? 'active' : 'inactive'}`}></span>
                {isActive ? 'Activa' : 'Inactiva'}
              </span>
              <button className={`btn btn-sm ${isActive ? 'btn-secondary' : 'btn-primary'}`} onClick={toggleStatus} disabled={busy}>
                {isActive ? 'Desactivar cuenta' : 'Reactivar cuenta'}
              </button>

              {!confirmDelete ? (
                <button className="btn btn-sm btn-danger" onClick={() => setConfirmDelete(true)} disabled={busy}>
                  Eliminar cuenta
                </button>
              ) : (
                <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: '0.875rem' }}>¿Seguro? No se puede deshacer.</span>
                  <button className="btn btn-sm btn-danger" onClick={removeUser} disabled={busy}>Sí, eliminar</button>
                  <button className="btn btn-sm btn-secondary" onClick={() => setConfirmDelete(false)} disabled={busy}>Cancelar</button>
                </span>
              )}
            </div>
          </section>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={busy || !dirty}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
