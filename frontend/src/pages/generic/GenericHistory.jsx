import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';
import ReportDetailModal from '../../components/ReportDetailModal';
import { mapCallToReportFormat } from '../../utils/callMappers';

export default function GenericHistory() {
  const { token, API_URL } = useContext(AuthContext);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCall, setSelectedCall] = useState(null);

  useEffect(() => {
    const fetchCalls = async () => {
      try {
        const res = await fetch(`${API_URL}/api/calls`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setCalls(Array.isArray(data) ? data : data.data || []);
        }
      } catch (err) {
        console.error('Error fetching calls:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCalls();
  }, []);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR') + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };

  const handleViewReport = (call) => {
    setSelectedCall(mapCallToReportFormat(call));
  };

  return (
    <>
      <div className="page-header">
        <h2>Mi Historial</h2>
      </div>

      <div className="card-flat">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th className="text-center">ID</th>
                <th className="text-center">Tipo</th>
                <th className="text-center">Origen</th>
                <th>Área</th>
                <th>Fecha</th>
                <th className="text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>Cargando...</td></tr>
              ) : calls.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>No tienes registros de llamados</td></tr>
              ) : (
                calls.map((call, i) => (
                  <tr key={call.id}>
                    <td className="text-center" style={{ fontWeight: 600, color: 'var(--color-primary)' }}>#{String(1000 + i + 1)}</td>
                    <td className="text-center">
                      <span className={`badge ${call.type === 'EMERGENCY' ? 'badge-danger' : 'badge-info'}`}>
                        {call.type === 'EMERGENCY' ? 'Emergencia' : 'Normal'}
                      </span>
                    </td>
                    <td className="text-center">{call.origin === 'INTRA_HOSPITAL' ? 'Intrahospitalario' : 'Extrahospitalario'}</td>
                    <td>{call.area?.name || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{formatDate(call.createdAt)}</td>
                    <td className="text-center">
                      <button
                        className="btn btn-sm btn-secondary"
                        style={{ color: 'var(--color-primary)' }}
                        onClick={() => handleViewReport(call)}
                      >
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

      {/* Modal de detalle Utstein */}
      {selectedCall && (
        <ReportDetailModal
          call={selectedCall}
          onClose={() => setSelectedCall(null)}
        />
      )}
    </>
  );
}
