import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../App';

export default function GenericDashboard() {
  const { token, API_URL, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [callsToday, setCallsToday] = useState(0);
  const [recentCalls, setRecentCalls] = useState([]);
  const [cartStatus, setCartStatus] = useState({ name: '—', status: 'IN_SERVICE' });
  const [loading, setLoading] = useState(true);
  const [areas, setAreas] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCall, setNewCall] = useState({ areaId: '', type: 'EMERGENCY', origin: 'INTRA_HOSPITAL' });
  const [submitting, setSubmitting] = useState(false);

  const fetchCalls = async () => {
    try {
      const callsRes = await fetch(`${API_URL}/api/calls?limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (callsRes.ok) {
        const callsData = await callsRes.json();
        const calls = Array.isArray(callsData) ? callsData : callsData.data || [];
        setRecentCalls(calls);

        const today = new Date().toDateString();
        setCallsToday(calls.filter(c => new Date(c.createdAt).toDateString() === today).length);
      }
    } catch (err) {
      console.error('Error fetching calls:', err);
    }
  };

  const fetchAreas = async () => {
    try {
      const res = await fetch(`${API_URL}/api/areas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAreas(data);
        if (data.length > 0) setNewCall(prev => ({ ...prev, areaId: data[0].id }));
      }
    } catch (err) {
      console.error('Error fetching areas:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchCalls(), fetchAreas()]);
      setLoading(false);
    };
    init();
  }, []);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const time = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Hoy, ${time} hs`;
    if (isYesterday) return `Ayer, ${time} hs`;
    return d.toLocaleDateString('es-AR') + `, ${time} hs`;
  };

  const getPatientLabel = (call) => {
    const ef = call.eventForm;
    if (!ef) return '—';
    if (ef.patientIdentificationType === 'NN') return 'Paciente NN';
    if (ef.patientDni) {
      const sex = ef.patientSex === 'F' ? 'Fem' : ef.patientSex === 'M' ? 'Masc' : '';
      const age = ef.patientAge ? `, ${ef.patientAge}a` : '';
      return `DNI ${ef.patientDni} (${sex}${age})`;
    }
    return 'Sin datos';
  };

  const handleCreateCall = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        areaId: newCall.areaId,
        type: newCall.type,
        origin: newCall.origin,
        eventForm: {
          patientIdentificationType: 'NN' // Default for a new quick call
        }
      };

      const res = await fetch(`${API_URL}/api/calls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsModalOpen(false);
        await fetchCalls();
      } else {
        alert('Error al crear el llamado');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Top Cards */}
      <div className="generic-cards-grid">
        {/* New Call CTA */}
        <div className="new-call-card">
          <div className="new-call-icon">+</div>
          <h3>Nuevo Llamado</h3>
          <p>Inicia un nuevo registro de Código Azul para tu área asignada.</p>
          <button className="btn" id="btn-new-call" onClick={() => setIsModalOpen(true)}>
            Registrar Evento
          </button>
        </div>

        {/* My Calls Today */}
        <div className="stat-card">
          <span className="stat-card-label">Mis Llamados (Hoy)</span>
          <span className="stat-card-value">{loading ? '...' : callsToday}</span>
        </div>

        {/* Cart Status */}
        <div className="stat-card">
          <span className="stat-card-label">Estado del Carro</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`status-dot ${cartStatus.status === 'IN_SERVICE' ? 'active' : 'inactive'}`}></span>
            <span className="stat-card-value" style={{ fontSize: '1.25rem' }}>
              {cartStatus.status === 'IN_SERVICE' ? 'En Operación' : 'Fuera de Servicio'}
            </span>
          </div>
          <span className="stat-card-sub">Asignado a: {cartStatus.name}</span>
        </div>
      </div>

      {/* Recent Records Table */}
      <div className="card-flat">
        <h3 style={{ marginBottom: 'var(--space-lg)' }}>Mis Registros Recientes</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID Llamado</th>
                <th>Paciente</th>
                <th>Hora / Fecha</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>Cargando...</td></tr>
              ) : recentCalls.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>Sin registros aún</td></tr>
              ) : (
                recentCalls.map((call, i) => (
                  <tr key={call.id}>
                    <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                      #{String(1000 + i + 1)}
                    </td>
                    <td>{getPatientLabel(call)}</td>
                    <td style={{ color: 'var(--color-primary)' }}>{formatDate(call.createdAt)}</td>
                    <td>
                      <button className="btn btn-sm btn-secondary" style={{ color: 'var(--color-primary)' }}>
                        Ver Ficha
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Call Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !submitting && setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Registrar Nuevo Evento</h3>
              <button className="btn-close" onClick={() => !submitting && setIsModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleCreateCall}>
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <label className="input-group label">Área del Evento</label>
                <select 
                  className="input" 
                  value={newCall.areaId}
                  onChange={(e) => setNewCall({...newCall, areaId: e.target.value})}
                  required
                >
                  <option value="" disabled>Seleccione un área...</option>
                  {areas.map(area => (
                    <option key={area.id} value={area.id}>{area.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 'var(--space-md)' }}>
                <label className="input-group label">Gravedad</label>
                <select 
                  className="input" 
                  value={newCall.type}
                  onChange={(e) => setNewCall({...newCall, type: e.target.value})}
                >
                  <option value="EMERGENCY">Emergencia (Código Azul)</option>
                  <option value="NORMAL">Normal</option>
                </select>
              </div>

              <div style={{ marginBottom: 'var(--space-xl)' }}>
                <label className="input-group label">Origen</label>
                <select 
                  className="input" 
                  value={newCall.origin}
                  onChange={(e) => setNewCall({...newCall, origin: e.target.value})}
                >
                  <option value="INTRA_HOSPITAL">Intrahospitalario</option>
                  <option value="EXTRA_HOSPITAL">Extrahospitalario</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={submitting}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !newCall.areaId}>
                  {submitting ? 'Creando...' : 'Crear Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
