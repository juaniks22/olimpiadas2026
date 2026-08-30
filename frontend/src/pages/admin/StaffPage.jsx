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
  padding: '12px', background: 'rgba(244, 63, 94, 0.1)', color: '#F43F5E',
  borderRadius: '8px', marginBottom: '16px', fontSize: '0.875rem', whiteSpace: 'pre-line',
};
const okBoxStyle = { ...errorBoxStyle, background: 'rgba(34,197,94,0.12)', color: '#16A34A' };

const DNI_RE = /^\d{6,8}$/;

function validateStaff({ dni, name }) {
  if (!DNI_RE.test(dni.trim())) return 'El DNI debe tener entre 6 y 8 dígitos numéricos.';
  if (name.trim().length === 0 || name.trim().length > 30) return 'El nombre debe tener entre 1 y 30 caracteres.';
  return '';
}

export default function StaffPage() {
  const { token, API_URL } = useContext(AuthContext);
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [manageMember, setManageMember] = useState(null);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/staff-members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStaff(Array.isArray(data) ? data : data.data || []);
        setListError('');
      } else {
        setListError(await readError(res, 'No se pudo cargar el personal'));
      }
    } catch (err) {
      console.error('Error fetching staff:', err);
      setListError('Error de conexión al cargar el personal');
    } finally {
      setLoading(false);
    }
  }, [API_URL, token]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  return (
    <>
      <div className="page-header">
        <h2>Personal Certificado</h2>
        <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          + Nuevo Integrante
        </button>
      </div>

      {listError && <div style={errorBoxStyle}>{listError}</div>}

      <div className="card-flat">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>DNI</th>
                <th>Nombre</th>
                <th>Rol / Especialidad</th>
                <th>Certificaciones</th>
                <th className="text-center">Estado</th>
                <th className="text-center">Acciones</th>
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
                    <td className="text-center">
                      <span className={`badge ${u.isActive ? 'badge-success' : 'badge-danger'}`}>
                        <span className={`status-dot ${u.isActive ? 'active' : 'inactive'}`}></span>
                        {u.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="text-center">
                      <button className="btn btn-sm btn-secondary" onClick={() => setManageMember(u)}>
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
        <CreateStaffModal
          API_URL={API_URL}
          authHeaders={authHeaders}
          onClose={() => setCreateOpen(false)}
          onCreated={fetchStaff}
        />
      )}

      {manageMember && (
        <ManageStaffModal
          member={manageMember}
          API_URL={API_URL}
          authHeaders={authHeaders}
          onClose={() => setManageMember(null)}
          onChanged={fetchStaff}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Alta de integrante
// ---------------------------------------------------------------------------
function CreateStaffModal({ API_URL, authHeaders, onClose, onCreated }) {
  const [form, setForm] = useState({ dni: '', name: '', role: '', certifications: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const v = validateStaff(form);
    if (v) return setError(v);
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/staff-members`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({
          dni: form.dni,
          name: form.name,
          role: form.role || undefined,
          certifications: form.certifications || undefined,
        }),
      });
      if (!res.ok) {
        setError(await readError(res, 'No se pudo crear el integrante'));
        return;
      }
      onCreated();
      onClose();
    } catch (err) {
      console.error('Error creating staff:', err);
      setError('Error de conexión');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Nuevo Integrante</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        {error && <div style={errorBoxStyle}>{error}</div>}
        <form onSubmit={submit}>
          <StaffFields form={form} setForm={setForm} />
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Creando...' : 'Crear integrante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gestión de un integrante: editar datos, activar/desactivar, eliminar.
// ---------------------------------------------------------------------------
function ManageStaffModal({ member, API_URL, authHeaders, onClose, onChanged }) {
  const [form, setForm] = useState({
    dni: member.dni,
    name: member.name,
    role: member.role || '',
    certifications: member.certifications || '',
  });
  const [isActive, setIsActive] = useState(member.isActive);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const flash = (m) => { setMsg(m); setErr(''); };
  const fail = (m) => { setErr(m); setMsg(''); };

  const dirty =
    form.dni.trim() !== member.dni ||
    form.name.trim() !== member.name ||
    (form.role || '') !== (member.role || '') ||
    (form.certifications || '') !== (member.certifications || '');

  const handleSave = async () => {
    if (!dirty) return;
    const v = validateStaff(form);
    if (v) return fail(v);
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/staff-members/${member.id}`, {
        method: 'PATCH', headers: authHeaders,
        body: JSON.stringify({
          dni: form.dni,
          name: form.name,
          role: form.role || null,
          certifications: form.certifications || null,
        }),
      });
      if (!res.ok) return fail(await readError(res, 'No se pudieron guardar los cambios'));
      flash('Datos actualizados');
      onChanged();
    } catch (e) {
      console.error(e);
      fail('Error de conexión');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/staff-members/${member.id}`, {
        method: 'PATCH', headers: authHeaders,
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) return fail(await readError(res, 'No se pudo cambiar el estado'));
      setIsActive(!isActive);
      flash(isActive ? 'Integrante desactivado' : 'Integrante activado');
      onChanged();
    } catch (e) {
      console.error(e);
      fail('Error de conexión');
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/api/staff-members/${member.id}`, {
        method: 'DELETE', headers: authHeaders,
      });
      if (!res.ok) {
        setConfirmDelete(false);
        return fail(await readError(res, 'No se pudo eliminar el integrante'));
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
          <h2>Gestionar: {member.name}</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        {msg && <div style={okBoxStyle}>{msg}</div>}
        {err && <div style={errorBoxStyle}>{err}</div>}

        <section style={{ marginBottom: 18 }}>
          <h3 style={{ marginBottom: 8 }}>Datos del integrante</h3>
          <StaffFields form={form} setForm={setForm} />
        </section>

        <section>
          <h3 style={{ marginBottom: 8 }}>Estado</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}>
              <span className={`status-dot ${isActive ? 'active' : 'inactive'}`}></span>
              {isActive ? 'Activo' : 'Inactivo'}
            </span>
            <button className={`btn btn-sm ${isActive ? 'btn-secondary' : 'btn-primary'}`} onClick={toggleActive} disabled={busy}>
              {isActive ? 'Desactivar' : 'Activar'}
            </button>

            {!confirmDelete ? (
              <button className="btn btn-sm btn-danger" onClick={() => setConfirmDelete(true)} disabled={busy}>
                Eliminar
              </button>
            ) : (
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem' }}>¿Seguro? No se puede deshacer.</span>
                <button className="btn btn-sm btn-danger" onClick={removeMember} disabled={busy}>Sí, eliminar</button>
                <button className="btn btn-sm btn-secondary" onClick={() => setConfirmDelete(false)} disabled={busy}>Cancelar</button>
              </span>
            )}
          </div>
        </section>

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

// Campos compartidos entre alta y edición.
function StaffFields({ form, setForm }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div className="input-group">
        <label htmlFor="staff-dni">DNI (6 a 8 dígitos)</label>
        <input
          id="staff-dni" className="input" type="text" inputMode="numeric" maxLength={8}
          placeholder="Documento único"
          value={form.dni}
          onChange={(e) => setForm({ ...form, dni: e.target.value.replace(/\D/g, '').slice(0, 8) })}
          required
        />
      </div>
      <div className="input-group">
        <label htmlFor="staff-name">Nombre completo (máx. 30 caracteres)</label>
        <input
          id="staff-name" className="input" type="text" maxLength={30}
          placeholder="Ej. Juan Pérez"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value.slice(0, 30) })}
          required
        />
      </div>
      <div className="input-group">
        <label htmlFor="staff-role">Rol / Especialidad (Opcional)</label>
        <input
          id="staff-role" className="input" type="text" placeholder="Ej. Cardiólogo"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        />
      </div>
      <div className="input-group">
        <label htmlFor="staff-cert">Certificaciones (Opcional)</label>
        <input
          id="staff-cert" className="input" type="text" placeholder="Ej. ACLS, RCP Avanzado"
          value={form.certifications}
          onChange={(e) => setForm({ ...form, certifications: e.target.value })}
        />
      </div>
    </div>
  );
}
