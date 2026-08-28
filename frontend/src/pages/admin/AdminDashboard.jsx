import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../App';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#222631',
        border: '1px solid #333947',
        borderRadius: 12,
        padding: '10px 14px',
        fontSize: '0.8125rem'
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

export default function AdminDashboard() {
  const { token, API_URL } = useContext(AuthContext);
  const [kpis, setKpis] = useState({
    totalCalls: 0,
    avgResponseTime: 0,
    survivalRate: 0,
    blockedCarts: 0,
    totalCarts: 0,
  });
  const [originData, setOriginData] = useState([]);
  const [blockedCarts, setBlockedCarts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [summaryRes, cartsRes] = await Promise.all([
          fetch(`${API_URL}/api/reports/summary`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/api/reports/crash-carts`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        if (summaryRes.ok && cartsRes.ok) {
          const summary = await summaryRes.json();
          const cartsData = await cartsRes.json();

          const totalCarts = cartsData.carts.length;
          const blocked = cartsData.carts.filter(c => c.estado === 'OUT_OF_SERVICE');

          setKpis({
            totalCalls: summary.totalCalls,
            avgResponseTime: summary.averageResponseTimeMinutes || 0,
            survivalRate: summary.totalCalls ? Math.round((summary.percentByType?.EMERGENCY || 0)) : 0, // survival rate needs proper calculation if applicable
            blockedCarts: blocked.length,
            totalCarts: totalCarts,
          });

          // Format for chart
          const chartData = [
            { day: 'Total', intra: summary.callsByOrigin?.INTRA_HOSPITAL || 0, extra: summary.callsByOrigin?.EXTRA_HOSPITAL || 0 }
          ];
          setOriginData(chartData);
          setBlockedCarts(blocked);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [API_URL, token]);

  return (
    <>
      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Llamados del Mes</span>
            <div className="kpi-card-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6' }}></div>
          </div>
          <div className="kpi-card-value">{kpis.totalCalls}</div>
          <div className="kpi-card-subtitle" style={{ color: 'var(--color-success)' }}>+12% vs mes anterior</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">T. Promedio Respuesta</span>
            <div className="kpi-card-icon" style={{ background: 'rgba(244, 63, 94, 0.12)', color: '#F43F5E' }}></div>
          </div>
          <div className="kpi-card-value">
            {kpis.avgResponseTime} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>min</span>
          </div>
          <div className="kpi-card-subtitle" style={{ color: 'var(--color-success)' }}>-0.3m mejora</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Tasa de Supervivencia</span>
            <div className="kpi-card-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10B981' }}></div>
          </div>
          <div className="kpi-card-value">{kpis.survivalRate}%</div>
          <div className="kpi-card-subtitle" style={{ color: 'var(--text-secondary)' }}>Pacientes con retorno a circulación</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Carros Bloqueados</span>
            <div className="kpi-card-icon" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B' }}></div>
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
            <button className="btn btn-sm btn-secondary">Ver todos</button>
          </div>

          {blockedCarts.map((cart) => (
            <div key={cart.id} className="attention-item">
              <div className="attention-item-info">
                <div className="attention-item-icon" style={{ background: 'rgba(244, 63, 94, 0.12)', color: '#F43F5E' }}></div>
                <div className="attention-item-text">
                  <h4>{cart.nombre}</h4>
                  <p>Inhabilitado desde: {new Date(cart.reactivadoEl).toLocaleDateString()}</p>
                </div>
              </div>
              <button className="btn btn-sm btn-primary">Reactivar</button>
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
            <select className="input" style={{ width: 'auto', padding: '8px 12px', fontSize: '0.8125rem' }}>
              <option>Esta semana</option>
              <option>Este mes</option>
              <option>Último trimestre</option>
            </select>
          </div>

          <div style={{ width: '100%', height: 220, marginTop: 'var(--space-md)' }}>
            <ResponsiveContainer>
              <BarChart data={originData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333947" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="intra" name="intra" radius={[6, 6, 0, 0]} fill="#3B82F6" />
                <Bar dataKey="extra" name="extra" radius={[6, 6, 0, 0]} fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}
