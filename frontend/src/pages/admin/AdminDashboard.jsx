import { useState, useEffect, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../App';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import RestockTicketModal from '../../components/RestockTicketModal';
import useAutoRefresh from '../../hooks/useAutoRefresh';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-card)',
        borderRadius: 12,
        padding: '10px 14px',
        fontSize: '0.8125rem',
        color: 'var(--text-primary)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      }}>
        <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>
            {p.name === 'intra' ? 'Intrahospitalario' : 'Extrahospitalario'}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// ---- Helpers de rango de fechas (para que el selector de período funcione de verdad) ----
const RANGE_LABELS = {
  week: 'Esta semana',
  month: 'Este mes',
  quarter: 'Último trimestre',
};

function pad(n) {
  return String(n).padStart(2, '0');
}

function toISODate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Devuelve el período actual seleccionado y el período anterior de igual duración,
// para poder calcular variaciones reales (en vez de textos fijos como "+12%").
function getPeriodRanges(rangeKey) {
  const now = new Date();
  let from, prevFrom, prevTo;

  if (rangeKey === 'week') {
    const day = now.getDay(); // 0 = domingo
    const diffToMonday = day === 0 ? 6 : day - 1;
    from = new Date(now);
    from.setDate(now.getDate() - diffToMonday);
    from.setHours(0, 0, 0, 0);

    prevTo = new Date(from);
    prevTo.setDate(from.getDate() - 1);
    prevFrom = new Date(prevTo);
    prevFrom.setDate(prevTo.getDate() - 6);
  } else if (rangeKey === 'quarter') {
    from = new Date(now);
    from.setMonth(now.getMonth() - 3);

    prevTo = new Date(from);
    prevTo.setDate(prevTo.getDate() - 1);
    prevFrom = new Date(prevTo);
    prevFrom.setMonth(prevTo.getMonth() - 3);
  } else {
    // month (default)
    from = new Date(now.getFullYear(), now.getMonth(), 1);
    prevFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    prevTo = new Date(now.getFullYear(), now.getMonth(), 0); // último día del mes anterior
  }

  return {
    from: toISODate(from),
    to: toISODate(now),
    prevFrom: toISODate(prevFrom),
    prevTo: toISODate(prevTo),
  };
}

function formatDelta(value, { suffix = '%', decimals = 0 } = {}) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}${suffix} vs período anterior`;
}

export default function AdminDashboard() {
  const { token, API_URL } = useContext(AuthContext);
  const [range, setRange] = useState('month');
  const [kpis, setKpis] = useState({
    totalCalls: 0,
    avgResponseTime: null,
    survivalRate: 0,
    blockedCarts: 0,
    totalCarts: 0,
  });
  const [deltas, setDeltas] = useState({ calls: null, avgResponseTime: null });
  const [originData, setOriginData] = useState([]);
  const [blockedCarts, setBlockedCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentReports, setRecentReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [restockCartId, setRestockCartId] = useState(null);

  const authHeaders = { Authorization: `Bearer ${token}` };

  const fetchDashboardData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const { from, to, prevFrom, prevTo } = getPeriodRanges(range);

      const [summaryRes, prevSummaryRes, cartsRes] = await Promise.all([
        fetch(`${API_URL}/api/reports/summary?dateFrom=${from}&dateTo=${to}`, { headers: authHeaders }),
        fetch(`${API_URL}/api/reports/summary?dateFrom=${prevFrom}&dateTo=${prevTo}`, { headers: authHeaders }),
        fetch(`${API_URL}/api/reports/crash-carts`, { headers: authHeaders }),
      ]);

      if (summaryRes.ok && prevSummaryRes.ok && cartsRes.ok) {
        const summary = await summaryRes.json();
        const prevSummary = await prevSummaryRes.json();
        const cartsData = await cartsRes.json();

        const totalCarts = cartsData.carts.length;
        const blocked = cartsData.carts.filter((c) => c.estado === 'OUT_OF_SERVICE');

        // Fecha real de bloqueo: el consumo más reciente registrado para ESE carro
        // (reactivadoEl es la última REACTIVACIÓN, no cuándo se bloqueó — no sirve para esto).
        const lastConsumptionByCart = new Map();
        for (const c of cartsData.consumptions) {
          const prev = lastConsumptionByCart.get(c.carroId);
          if (!prev || new Date(c.fecha) > new Date(prev)) {
            lastConsumptionByCart.set(c.carroId, c.fecha);
          }
        }
        const blockedWithDate = blocked.map((c) => ({
          ...c,
          bloqueadoDesde: lastConsumptionByCart.get(c.id) || null,
        }));

        setKpis({
          totalCalls: summary.totalCalls,
          avgResponseTime: summary.averageResponseTimeMinutes,
          // Tasa de supervivencia real: % de llamados con retorno de circulación espontánea (RCE).
          // Antes se mostraba por error el % de llamados de tipo "Emergencia".
          survivalRate: summary.survivalRatePercent,
          blockedCarts: blocked.length,
          totalCarts,
        });

        const callsDelta = prevSummary.totalCalls
          ? ((summary.totalCalls - prevSummary.totalCalls) / prevSummary.totalCalls) * 100
          : summary.totalCalls > 0 ? 100 : null;

        const avgDelta =
          summary.averageResponseTimeMinutes != null && prevSummary.averageResponseTimeMinutes != null
            ? summary.averageResponseTimeMinutes - prevSummary.averageResponseTimeMinutes
            : null;

        setDeltas({ calls: callsDelta, avgResponseTime: avgDelta });

        setOriginData([
          {
            day: RANGE_LABELS[range],
            intra: summary.callsByOrigin?.INTRA_HOSPITAL || 0,
            extra: summary.callsByOrigin?.EXTRA_HOSPITAL || 0,
          },
        ]);
        setBlockedCarts(blockedWithDate);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [API_URL, token, range]);

  const fetchRecentReports = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoadingReports(true);
    try {
      const res = await fetch(`${API_URL}/api/reports/calls?sortOrder=desc&limit=5`, { headers: authHeaders });
      if (res.ok) {
        const data = await res.json();
        setRecentReports(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching recent reports:', err);
    } finally {
      setLoadingReports(false);
    }
  }, [API_URL, token]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    fetchRecentReports();
  }, [fetchRecentReports]);

  // Auto-refresh silencioso de todo el tablero.
  useAutoRefresh(() => Promise.all([
    fetchDashboardData({ silent: true }),
    fetchRecentReports({ silent: true }),
  ]));

  // Reactivar carro desde "Atención Requerida": abre el ticket de reposición.

  const callsDeltaText = formatDelta(deltas.calls);
  const avgDeltaText = formatDelta(deltas.avgResponseTime, { suffix: 'm', decimals: 1 });

  const formatReportDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('es-AR')} ${d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs`;
  };

  const getReportPatientLabel = (r) => {
    if (r.pacienteTipo === 'NN') return 'Paciente NN';
    return r.pacienteId || 'Sin datos';
  };

  return (
    <>
      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Llamados ({RANGE_LABELS[range]})</span>
            <div className="kpi-card-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
          </div>
          <div className="kpi-card-value">{kpis.totalCalls}</div>
          {callsDeltaText && (
            <div
              className="kpi-card-subtitle"
              style={{ color: deltas.calls >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}
            >
              {callsDeltaText}
            </div>
          )}
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">T. Promedio Respuesta</span>
            <div className="kpi-card-icon" style={{ background: 'rgba(244, 63, 94, 0.12)', color: '#F43F5E' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>
          <div className="kpi-card-value">
            {kpis.avgResponseTime ?? 's/d'}{' '}
            {kpis.avgResponseTime != null && (
              <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>min</span>
            )}
          </div>
          {avgDeltaText && (
            <div
              className="kpi-card-subtitle"
              style={{ color: deltas.avgResponseTime <= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}
            >
              {avgDeltaText}
            </div>
          )}
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Tasa de Supervivencia</span>
            <div className="kpi-card-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10B981' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z" />
                <path d="M3.5 12h6l1-2 2 4 1.5-3 1.5 1h5" />
              </svg>
            </div>
          </div>
          <div className="kpi-card-value">{kpis.survivalRate}%</div>
          <div className="kpi-card-subtitle" style={{ color: 'var(--text-secondary)' }}>Pacientes con retorno a circulación</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Carros Bloqueados</span>
            <div className="kpi-card-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="17" rx="2" />
                <line x1="5" y1="6.5" x2="19" y2="6.5" />
                <line x1="5" y1="11" x2="19" y2="11" />
                <line x1="5" y1="15.5" x2="19" y2="15.5" />
                <line x1="10" y1="4.25" x2="14" y2="4.25" />
                <line x1="10" y1="8.75" x2="14" y2="8.75" />
                <line x1="10" y1="13.25" x2="14" y2="13.25" />
                <path d="M7 19v2.5h2.5V19" />
                <path d="M14.5 19v2.5H17V19" />
              </svg>
            </div>
          </div>
          <div className="kpi-card-value">
            {kpis.blockedCarts} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ {kpis.totalCarts}</span>
          </div>
          <div className="kpi-card-subtitle" style={{ color: 'var(--color-danger)' }}>Requieren reactivación urgente</div>
        </div>
      </div>

      {/* Content Grid: Attention + Chart */}
      <div className="content-grid">
        {/* Attention Required */}
        <div className="card-flat">
          <div className="attention-header">
            <h3>Atención Requerida</h3>
            <Link to="/admin/crash-carts" className="btn btn-sm btn-secondary">
              Ver todos
            </Link>
          </div>

          {blockedCarts.map((cart) => (
            <div key={cart.id} className="attention-item">
              <div className="attention-item-info">
                <div className="attention-item-icon" style={{ background: 'rgba(244, 63, 94, 0.12)', color: '#F43F5E' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div className="attention-item-text">
                  <h4>{cart.nombre}</h4>
                  <p>
                    Inhabilitado desde:{' '}
                    {cart.bloqueadoDesde ? new Date(cart.bloqueadoDesde).toLocaleDateString() : 'sin registro de consumo'}
                  </p>
                </div>
              </div>
              <button className="btn btn-sm btn-primary" onClick={() => setRestockCartId(cart.id)}>
                Reactivar
              </button>
            </div>
          ))}

          {blockedCarts.length === 0 && (
            <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 'var(--space-xl) 0' }}>
              Sin carros bloqueados. ¡Todo en orden!
            </p>
          )}
        </div>

        {/* Origin Chart */}
        <div className="card-flat">
          <div className="attention-header">
            <div>
              <h3>Origen de Llamados</h3>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>Intrahospitalario vs Vía Pública</p>
            </div>
            <select
              className="input"
              style={{ width: 'auto', padding: '8px 32px 8px 12px', fontSize: '0.8125rem' }}
              value={range}
              onChange={(e) => setRange(e.target.value)}
            >
              <option value="week">Esta semana</option>
              <option value="month">Este mes</option>
              <option value="quarter">Último trimestre</option>
            </select>
          </div>

          <div style={{ width: '100%', height: 220, marginTop: 'var(--space-md)' }}>
            <ResponsiveContainer>
              <BarChart data={originData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333947" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--border-subtle)', fillOpacity: 0.25 }} />
                <Bar dataKey="intra" name="intra" radius={[6, 6, 0, 0]} fill="#3B82F6" />
                <Bar dataKey="extra" name="extra" radius={[6, 6, 0, 0]} fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Últimos Reportes Cargados */}
      <div className="card-flat" style={{ marginTop: 'var(--space-lg)' }}>
        <div className="attention-header">
          <h3>Últimos Reportes Cargados</h3>
          <Link to="/admin/reports" className="btn btn-sm btn-secondary">
            Ver todos
          </Link>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Área</th>
                <th>Paciente</th>
                <th className="text-center">Tipo</th>
                <th className="text-center">Origen</th>
                <th className="text-center">T. Respuesta</th>
                <th>Cargado por</th>
              </tr>
            </thead>
            <tbody>
              {loadingReports ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>Cargando...</td></tr>
              ) : recentReports.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>Sin reportes cargados aún</td></tr>
              ) : (
                recentReports.map((r) => (
                  <tr key={r.id}>
                    <td style={{ color: 'var(--text-secondary)' }}>{formatReportDate(r.fecha)}</td>
                    <td>{r.area || 's/d'}</td>
                    <td>{getReportPatientLabel(r)}</td>
                    <td className="text-center">
                      <span className={`badge ${r.tipo === 'EMERGENCY' ? 'badge-danger' : 'badge-info'}`}>
                        {r.tipo === 'EMERGENCY' ? 'Emergencia' : 'Normal'}
                      </span>
                    </td>
                    <td className="text-center">{r.origen === 'INTRA_HOSPITAL' ? 'Intrahospitalario' : 'Extrahospitalario'}</td>
                    <td className="text-center">{r.tiempoRespuestaMinutos != null ? `${r.tiempoRespuestaMinutos} min` : 's/d'}</td>
                    <td>{r.cargadoPor || 's/d'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {restockCartId && (
        <RestockTicketModal
          cartId={restockCartId}
          token={token}
          API_URL={API_URL}
          onClose={() => setRestockCartId(null)}
          onReactivated={fetchDashboardData}
        />
      )}
    </>
  );
}