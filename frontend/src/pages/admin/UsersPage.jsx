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

// Caja para mostrar una contraseña recién generada: se ve una sola vez, así que
// se resalta bien y se puede copiar directo.
function GeneratedPasswordBox({ password }) {
  const [copied, setCopied] = useState(false);
  if (!password) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Si el navegador no permite clipboard, el usuario igual puede seleccionar el texto a mano.
    }
  };
  return (
    <div style={successBoxStyle}>
      <div style={{ marginBottom: 6 }}>Contraseña generada — guardala ahora, no se vuelve a mostrar:</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <code style={{ fontSize: '1rem', fontWeight: 700, userSelect: 'all' }}>{password}</code>
        <button type="button" className="btn btn-sm btn-secondary" onClick={copy}>
          {copied ? 'Copiado ✓' : 'Copiar'}
        </button>
      </div>
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
// Modal de creación. El rol siempre queda GENERIC (el backend lo fuerza igual,
// no existe forma de crear otro Administrador desde acá).
// ---------------------------------------------------------------------------
function CreateUserModal({ API_URL, authHeaders, onClose, onCreated }) {
  const [username, setUsername] = useState('');
  const [autoPassword, setAutoPassword] = useState(true);
  const [manualPassword, setManualPassword] = useState('');
  const [showManualPassword, setShowManualPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [createdUsername, setCreatedUsername] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const body = autoPassword
        ? { username: username.trim(), generatePassword: true }
        : { username: username.trim(), password: manualPassword };

      const res = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError(await readError(res, 'No se pudo crear la cuenta'));
        return;
      }
      const data = await res.json();
      setCreatedUsername(data.username);
      if (data.generatedPassword) setGeneratedPassword(data.generatedPassword);
      onCreated();
      if (!data.generatedPassword) onClose();
    } catch (err) {
      console.error('Error creating user:', err);
      setError('Error de conexión');
    } finally {
      setCreating(false);
    }
  };

  // Si ya se creó la cuenta y hubo contraseña generada, mostramos el resultado
  // en vez del formulario, para que se pueda copiar antes de cerrar.
  if (generatedPassword) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal slide-up" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Cuenta creada</h2>
            <button className="btn-icon" onClick={onClose}>✕</button>
          </div>
          <p>Usuario: <strong>{createdUsername}</strong></p>
          <GeneratedPasswordBox password={generatedPassword} />
          <div className="modal-actions">
            <button className="btn btn-primary" onClick={onClose}>Listo</button>
          </div>
        </div>
      </div>
    );
  }

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
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoPassword}
                onChange={(e) => setAutoPassword(e.target.checked)}
              />
              Generar contraseña segura automáticamente (recomendado)
            </label>
          </div>

          {!autoPassword && (
            <div className="input-group">
              <label htmlFor="new-user-password">Contraseña</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  id="new-user-password"
                  className="input"
                  type={showManualPassword ? 'text' : 'password'}
                  placeholder="8-12 caracteres, mayúscula, minúscula, número y símbolo"
                  value={manualPassword}
                  onChange={(e) => setManualPassword(e.target.value)}
                  required={!autoPassword}
                />
                <button type="button" className="btn btn-secondary" onClick={() => setShowManualPassword((s) => !s)}>
                  {showManualPassword ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button id="btn-save-user" type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? 'Creando...' : 'Crear cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal de gestión de una cuenta existente: cambiar nombre/contraseña,
// activar/desactivar, eliminar. Si es la cuenta ADMIN, se bloquean acciones
// que el backend igual rechazaría (username, desactivar, eliminar) para no
// mostrar un error al pedo: solo queda habilitado el cambio de contraseña.
// ---------------------------------------------------------------------------
function ManageUserModal({ user, API_URL, authHeaders, onClose, onChanged }) {
  const isAdmin = user.role === 'ADMIN';

  const [username, setUsername] = useState(user.username);
  const [isActive, setIsActive] = useState(user.isActive);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const [autoPassword, setAutoPassword] = useState(true);
  const [manualPassword, setManualPassword] = useState('');
  const [showManualPassword, setShowManualPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');

  const [confirmDelete, setConfirmDelete] = useState(false);

  const flash = (m) => { setMsg(m); setErr(''); };
  const fail = (m) => { setErr(m); setMsg(''); };

  const saveUsername = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/users/${user.id}`, {
        method: 'PATCH', headers: authHeaders,
        body: JSON.stringify({ username: username.trim() }),
      });
      if (!res.ok) return fail(await readError(res, 'No se pudo actualizar el usuario'));
      flash('Nombre de usuario actualizado');
      onChanged();
    } catch (e) {
      console.error(e);
      fail('Error de conexión');
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
    setErr(''); setMsg(''); setGeneratedPassword('');
    setBusy(true);
    try {
      const body = autoPassword ? { generatePassword: true } : { password: manualPassword };
      const res = await fetch(`${API_URL}/api/users/${user.id}/reset-password`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify(body),
      });
      if (!res.ok) return fail(await readError(res, 'No se pudo cambiar la contraseña'));
      const data = await res.json();
      if (data.generatedPassword) {
        setGeneratedPassword(data.generatedPassword);
      } else {
        flash('Contraseña actualizada');
      }
      setManualPassword('');
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
        // Si tiene llamados cargados, el backend devuelve 409 y sugiere desactivar en su lugar.
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

        {/* --- Nombre de usuario --- */}
        <section style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 8 }}>Nombre de usuario</h3>
          <div className="input-group">
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="input"
                value={username}
                disabled={isAdmin}
                onChange={(e) => setUsername(e.target.value)}
              />
              <button
                className="btn btn-secondary"
                onClick={saveUsername}
                disabled={busy || isAdmin || username.trim() === user.username || !username.trim()}
              >
                Guardar
              </button>
            </div>
          </div>
        </section>

        {/* --- Contraseña --- */}
        <section style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 8 }}>Cambiar contraseña</h3>

          <GeneratedPasswordBox password={generatedPassword} />

          <div className="input-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoPassword}
                onChange={(e) => setAutoPassword(e.target.checked)}
              />
              Generar contraseña segura automáticamente
            </label>
          </div>

          {!autoPassword && (
            <div className="input-group">
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input"
                  type={showManualPassword ? 'text' : 'password'}
                  placeholder="8-12 caracteres, mayúscula, minúscula, número y símbolo"
                  value={manualPassword}
                  onChange={(e) => setManualPassword(e.target.value)}
                />
                <button type="button" className="btn btn-secondary" onClick={() => setShowManualPassword((s) => !s)}>
                  {showManualPassword ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={savePassword}
            disabled={busy || (!autoPassword && !manualPassword)}
          >
            Guardar contraseña
          </button>
        </section>

        {/* --- Estado y eliminación --- */}
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
        </div>
      </div>
    </div>
  );
}
