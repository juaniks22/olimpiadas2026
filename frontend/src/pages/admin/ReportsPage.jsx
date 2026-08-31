import { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { AuthContext } from '../../App';
import useAutoRefresh from '../../hooks/useAutoRefresh';
import FlatpickrRangePicker from '../../components/FlatpickrRangePicker';
import ReportDetailModal from '../../components/ReportDetailModal';
import { exportToPdf, exportToCsv } from '../../utils/reportExportUtils';
import { axisTickFormatter } from '../../utils/chartFormat';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

// Total del gráfico de torta, mostrado en el centro del donut.
const donutTotal = (data) => data.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

// Iconos para el selector de tipo de gráfico
const CHART_TYPE_ICONS = {
  pie: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  ),
  bar: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  line: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
};

// 1. Tooltip Personalizado con fondo oscuro
const CustomTooltip = ({ active, payload, label, total, unitLabel = 'llamados' }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const name = data.payload?.name || label || (data.name !== 'value' ? data.name : '') || 'Item';
    const value = data.value ?? data.payload?.value ?? 0;
    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
    const color = data.payload?.fill || data.fill || data.color || data.stroke || 'var(--color-primary)';

    return (
      <div className="report-tooltip-card">
        <div className="report-tooltip-header">
          <span
            className="report-tooltip-dot"
            style={{ backgroundColor: color }}
          />
          <span className="report-tooltip-name">
            {name}
          </span>
        </div>
        <div className="report-tooltip-body">
          <span>Cantidad: <strong style={{ color: 'var(--text-primary)' }}>{value}</strong> {unitLabel}</span>
          <span>({percentage}%)</span>
        </div>
      </div>
    );
  }
  return null;
};

// 2. Leyenda Estilizada en lista vertical con alineación justificada
const CustomLegend = ({ data, colors, total, unitLabel = '' }) => {
  if (!data?.length) return null;

  return (
    <div className="report-custom-legend">
      {data.map((item, index) => {
        const color = item.color || (colors && colors[index % colors.length]) || 'var(--color-primary)';
        const percentage = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;

        return (
          <div
            key={item.name || index}
            className="report-custom-legend__item"
            title={`${item.name}: ${item.value}${unitLabel ? ` ${unitLabel}` : ''} (${percentage}%)`}
          >
            <div className="report-custom-legend__left">
              <span
                className="report-custom-legend__dot"
                style={{ backgroundColor: color }}
              />
              <span className="report-custom-legend__name">{item.name}</span>
            </div>
            <div className="report-custom-legend__right">
              <span className="report-custom-legend__val">{item.value}</span>
              <span className="report-custom-legend__pct">({percentage}%)</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Selector de tipo de gráfico (pastel / barras / líneas)
function ChartTypeToggle({ value, onChange }) {
  return (
    <div className="chart-type-toggle">
      {['pie', 'bar', 'line'].map((type) => (
        <button
          key={type}
          type="button"
          className={`chart-type-btn ${value === type ? 'chart-type-btn--active' : ''}`}
          onClick={() => onChange(type)}
          title={
            type === 'pie' ? 'Gráfico de pastel' : type === 'bar' ? 'Gráfico de barras' : 'Gráfico de líneas'
          }
        >
          {CHART_TYPE_ICONS[type]}
        </button>
      ))}
    </div>
  );
}

// Tarjeta de gráfico intercambiable (pastel / barras / líneas) para una distribución de conteos
function SwitchableDistributionChart({ title, subtitle, data, colors, chartType, onChangeChartType, unitLabel = 'llamados' }) {
  if (!data.length) return null;
  const total = donutTotal(data);

  return (
    <div className="card-flat report-chart-card">
      <div className="report-chart-header">
        <h3 className="report-chart-title">{title}</h3>
        <p className="report-chart-desc">{subtitle}</p>
      </div>

      {chartType === 'pie' ? (
        <div className="chart-donut-wrap">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Tooltip content={<CustomTooltip total={total} unitLabel={unitLabel} />} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={68}
                paddingAngle={4}
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          {/* Texto central superpuesto */}
          <div className="chart-donut-center-text">
            <span className="chart-donut-total__value">{total}</span>
            <span className="chart-donut-total__label">{unitLabel}</span>
          </div>
        </div>
      ) : chartType === 'bar' ? (
        <div style={{ width: '100%', height: 210 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-card)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--border-card)' }}
                tickLine={false}
                interval={0}
                angle={data.length > 4 ? -30 : 0}
                textAnchor={data.length > 4 ? 'end' : 'middle'}
                height={data.length > 4 ? 56 : 30}
                tickFormatter={axisTickFormatter(9)}
              />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                content={<CustomTooltip total={total} unitLabel={unitLabel} />}
                cursor={{ fill: 'var(--bg-input)' }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ width: '100%', height: 210 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-card)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--border-card)' }}
                tickLine={false}
                interval={0}
                angle={data.length > 4 ? -30 : 0}
                textAnchor={data.length > 4 ? 'end' : 'middle'}
                height={data.length > 4 ? 56 : 30}
                tickFormatter={axisTickFormatter(9)}
              />
              <YAxis allowDecimals={false} tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip total={total} unitLabel={unitLabel} />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={colors[0]}
                strokeWidth={2.5}
                dot={{ r: 4, fill: colors[0] }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Selector de gráfico: entre el gráfico y las categorías */}
      <div className="report-chart-middle-toolbar">
        <ChartTypeToggle value={chartType} onChange={onChangeChartType} />
      </div>

      {chartType === 'pie' && (
        <CustomLegend data={data} colors={colors} total={total} unitLabel={unitLabel} />
      )}
    </div>
  );
}

export default function ReportsPage() {
  const { token, API_URL } = useContext(AuthContext);

  // Filtros combinables (OLI-87, OLI-88)
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    areaId: '',
    origin: '',
    type: '',
    search: '',
    sortOrder: 'desc',
  });

  // Catálogos y Datos
  const [areas, setAreas] = useState([]);
  const [calls, setCalls] = useState([]);
  const [summary, setSummary] = useState({
    totalCalls: 0,
    averageResponseTimeMinutes: null,
    survivalRatePercent: 0,
    rceCount: 0,
    callsByType: { EMERGENCY: 0, NORMAL: 0 },
    callsByOrigin: { INTRA_HOSPITAL: 0, EXTRA_HOSPITAL: 0 },
  });

  // UI State
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [selectedCallForDetail, setSelectedCallForDetail] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 1. Cargar catálogo de áreas para el filtro
  useEffect(() => {
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
        console.error('Error al cargar áreas:', err);
      }
    };
    fetchAreas();
  }, [API_URL, token]);

  // 2. Cargar reportes y métricas según filtros activos.
  // `silent` = refresco automático: no muestra "cargando" ni resetea la paginación.
  const fetchReportsData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      if (filters.areaId) params.set('areaId', filters.areaId);
      if (filters.origin) params.set('origin', filters.origin);
      if (filters.type) params.set('type', filters.type);
      if (filters.search) params.set('search', filters.search);
      if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);

      const [summaryRes, callsRes] = await Promise.all([
        fetch(`${API_URL}/api/reports/summary?${params}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/reports/calls?${params}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (summaryRes.ok && callsRes.ok) {
        const summaryData = await summaryRes.json();
        const callsData = await callsRes.json();
        setSummary(summaryData);
        setCalls(Array.isArray(callsData) ? callsData : []);
        if (!silent) setCurrentPage(1); // Reiniciar paginación solo al cambiar filtros
      }
    } catch (err) {
      console.error('Error al cargar reportes:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [API_URL, token, filters]);

  useEffect(() => {
    fetchReportsData();
  }, [fetchReportsData, seeding]);

  useAutoRefresh(() => fetchReportsData({ silent: true }), 20000);

  // Manejo de cambios en filtros
  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleDateRangeChange = ({ dateFrom, dateTo }) => {
    setFilters((prev) => ({ ...prev, dateFrom, dateTo }));
  };

  const handleResetFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      areaId: '',
      origin: '',
      type: '',
      search: '',
      sortOrder: 'desc',
    });
  };

  const hasActiveFilters = Boolean(
    filters.dateFrom ||
    filters.dateTo ||
    filters.areaId ||
    filters.origin ||
    filters.type ||
    filters.search ||
    filters.sortOrder !== 'desc'
  );

  // Manejo de exportaciones (OLI-89)
  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      exportToPdf({
        calls,
        summary,
        filters,
        areasList: areas,
      });
    } catch (err) {
      console.error('Error exportando PDF:', err);
      alert('Ocurrió un error al generar el PDF.');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      exportToCsv({
        calls,
        filters,
      });
    } catch (err) {
      console.error('Error exportando CSV:', err);
      alert('Ocurrió un error al generar el CSV.');
    } finally {
      setExportingCsv(false);
    }
  };

  // Seed demo data
  const handleSeedDemo = async () => {
    if (!confirm('¿Crear datos de demostración? Se agregarán ~25 llamados de prueba.')) return;
    setSeeding(true);
    try {
      const res = await fetch(`${API_URL}/api/reports/seed-demo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message || `Se crearon ${data.created} registros.`);
      } else {
        alert('Error al crear datos demo.');
      }
    } catch (err) {
      console.error('Error seed demo:', err);
      alert('Error de conexión al crear datos demo.');
    } finally {
      setSeeding(false);
    }
  };

  // Datos para gráfico de torta Recharts
  const PIE_COLORS = ['#F43F5E', '#3B82F6', '#10B981'];
  const pieData = useMemo(() => {
    if (!calls.length) return [];

    let emergencia = 0;
    let normal = 0;
    let rce = 0;
    calls.forEach((c) => {
      if (c.tipo === 'EMERGENCY') emergencia += 1;
      else normal += 1;
      if (c.rce === 'si') rce += 1;
    });

    return [
      { name: 'Emergencia', value: emergencia },
      { name: 'Normal', value: normal },
      { name: 'RCE Logrado', value: rce },
    ].filter((d) => d.value > 0);
  }, [calls]);

  // Selector de tipo de gráfico para "Origen de Llamados" y "Área de Origen"
  const [originChartType, setOriginChartType] = useState('pie');
  const [areaChartType, setAreaChartType] = useState('pie');

  const ORIGIN_COLORS = ['#3B82F6', '#F59E0B'];
  const AREA_COLORS = [
    '#2563EB', '#F43F5E', '#10B981', '#8B5CF6', '#F59E0B',
    '#06B6D4', '#EC4899', '#84CC16', '#6366F1', '#14B8A6',
  ];

  // Datos: Origen del llamado (Intrahospitalario / Extrahospitalario)
  const originData = useMemo(() => {
    if (!calls.length) return [];
    let intra = 0;
    let extra = 0;
    calls.forEach((c) => {
      if (c.origen === 'INTRA_HOSPITAL') intra += 1;
      else extra += 1;
    });
    return [
      { name: 'Intrahospitalario', value: intra },
      { name: 'Extrahospitalario', value: extra },
    ].filter((d) => d.value > 0);
  }, [calls]);

  // Datos: Área de origen de los llamados
  const areaData = useMemo(() => {
    if (!calls.length) return [];
    const counts = {};
    calls.forEach((c) => {
      const areaName = c.area || 'Sin área';
      counts[areaName] = (counts[areaName] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [calls]);

  // Paginación de llamados
  const totalPages = Math.ceil(calls.length / pageSize) || 1;
  const paginatedCalls = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return calls.slice(start, start + pageSize);
  }, [calls, currentPage, pageSize]);

  return (
    <>
      {/* 1. Header de Página con Acciones */}
      <div className="reports-page-header">
        <div className="reports-page-header__title">
          <h2>Auditoría y Reportes Utstein</h2>
          <p className="reports-page-header__subtitle">
            Panel de supervisión clínica, tiempos de respuesta y análisis estadístico.
          </p>
        </div>

        <div className="reports-page-header__actions">
          <button
            id="btn-seed-demo"
            className="btn btn-sm btn-secondary"
            onClick={handleSeedDemo}
            disabled={loading || seeding || calls.length > 0}
            title="Crear datos de demostración"
          >
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
            {seeding ? 'Creando...' : 'Demo'}
          </button>

          <button
            id="btn-export-pdf"
            className="btn btn-sm btn-primary"
            onClick={handleExportPdf}
            disabled={loading || exportingPdf || calls.length === 0}
            title="Exportar reporte clínico en formato PDF"
          >
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            {exportingPdf ? 'Generando...' : 'PDF'}
          </button>

          <button
            id="btn-export-csv"
            className="btn btn-sm btn-secondary"
            onClick={handleExportCsv}
            disabled={loading || exportingCsv || calls.length === 0}
            title="Descargar datos en CSV para Excel"
          >
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {exportingCsv ? 'Generando...' : 'CSV'}
          </button>
        </div>
      </div>

      {/* 2. Barra de Filtros Colapsable */}
      <div className="card-flat report-filter-card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="filter-card-header">
          <button
            type="button"
            className="filter-toggle-btn"
            onClick={() => setFiltersOpen((v) => !v)}
          >
            <svg
              className="filter-toggle-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            <span>Filtros</span>
            {hasActiveFilters && (
              <span className="badge badge-info" style={{ fontSize: '0.6875rem' }}>
                Activos
              </span>
            )}
            <svg
              className={`filter-chevron ${filtersOpen ? 'filter-chevron--open' : ''}`}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={handleResetFilters}
              style={{ fontSize: '0.75rem', padding: '6px 12px' }}
            >
              Limpiar
            </button>
          )}
        </div>

        <div className={`filter-collapse ${filtersOpen ? 'filter-collapse--open' : ''}`}>
          <div className="filter-collapse__inner">
            {/* Fila 1: Fecha + Búsqueda + Área */}
            <div className="filter-grid report-filter-grid">
              <div className="filter-item filter-item--date">
                <label>Rango de Fechas</label>
                <FlatpickrRangePicker
                  dateFrom={filters.dateFrom}
                  dateTo={filters.dateTo}
                  onChange={handleDateRangeChange}
                  placeholder="Todas las fechas..."
                  showPresets={true}
                />
              </div>

              <div className="filter-item">
                <label htmlFor="filter-search">Búsqueda</label>
                <div className="search-input">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    id="filter-search"
                    type="text"
                    className="input"
                    placeholder="DNI, área, usuario..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
              </div>

              <div className="filter-item">
                <label htmlFor="filter-area">Área</label>
                <select
                  id="filter-area"
                  className="select"
                  value={filters.areaId}
                  onChange={(e) => handleFilterChange('areaId', e.target.value)}
                >
                  <option value="">Todas</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fila 2: Tipo + Origen + Orden */}
            <div className="filter-grid report-filter-grid" style={{ marginTop: 'var(--space-md)' }}>
              <div className="filter-item">
                <label htmlFor="filter-type">Tipo</label>
                <select
                  id="filter-type"
                  className="select"
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="EMERGENCY">Emergencia</option>
                  <option value="NORMAL">Normal</option>
                </select>
              </div>

              <div className="filter-item">
                <label htmlFor="filter-origin">Origen</label>
                <select
                  id="filter-origin"
                  className="select"
                  value={filters.origin}
                  onChange={(e) => handleFilterChange('origin', e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="INTRA_HOSPITAL">Intrahospitalario</option>
                  <option value="EXTRA_HOSPITAL">Extrahospitalario</option>
                </select>
              </div>

              <div className="filter-item">
                <label htmlFor="filter-order">Orden</label>
                <select
                  id="filter-order"
                  className="select"
                  value={filters.sortOrder}
                  onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                >
                  <option value="desc">Más recientes</option>
                  <option value="asc">Más antiguos</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Resumen de Métricas (KPI Cards) — SVG icons */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Total de Eventos</span>
            <div className="kpi-card-icon" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
          </div>
          <div className="kpi-card-value">{summary.totalCalls}</div>
          <div className="kpi-card-subtitle" style={{ color: 'var(--text-secondary)' }}>
            Llamados registrados con filtros actuales
          </div>
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
            {summary.averageResponseTimeMinutes !== null ? summary.averageResponseTimeMinutes : 's/d'}{' '}
            <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
              min
            </span>
          </div>
          <div className="kpi-card-subtitle" style={{ color: summary.averageResponseTimeMinutes && summary.averageResponseTimeMinutes <= 3 ? 'var(--color-success)' : 'var(--text-secondary)' }}>
            {summary.averageResponseTimeMinutes && summary.averageResponseTimeMinutes <= 3 ? 'Cumple objetivo (< 3m)' : 'Meta estándar: < 3 min'}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Tasa RCE (Éxito RCP)</span>
            <div className="kpi-card-icon" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10B981' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z" />
                <path d="M3.5 12h6l1-2 2 4 1.5-3 1.5 1h5" />
              </svg>
            </div>
          </div>
          <div className="kpi-card-value">{summary.survivalRatePercent}%</div>
          <div className="kpi-card-subtitle" style={{ color: 'var(--color-success)' }}>
            {summary.rceCount} pacientes con retorno de circulación
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Emergencias / Normal</span>
            <div className="kpi-card-icon" style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8B5CF6' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
          </div>
          <div className="kpi-card-value">
            {summary.callsByType?.EMERGENCY || 0}{' '}
            <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
              / {summary.callsByType?.NORMAL || 0}
            </span>
          </div>
          <div className="kpi-card-subtitle" style={{ color: 'var(--text-secondary)' }}>
            Intra: {summary.callsByOrigin?.INTRA_HOSPITAL || 0} • Extra: {summary.callsByOrigin?.EXTRA_HOSPITAL || 0}
          </div>
        </div>
      </div>

      {/* 4. Distribución de Llamados / Origen de Llamados / Área de Origen — una sola fila de 3 columnas */}
      <div className="reports-charts-row">
        {pieData.length > 0 && (
          <div className="card-flat report-chart-card">
            <div className="report-chart-header">
              <h3 className="report-chart-title">Distribución de Llamados</h3>
              <p className="report-chart-desc">
                Proporción de eventos de emergencia, normales y RCE en el período seleccionado.
              </p>
            </div>

            <div className="chart-donut-wrap">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Tooltip content={<CustomTooltip total={donutTotal(pieData)} unitLabel="llamados" />} />
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={68}
                    paddingAngle={4}
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Texto central superpuesto */}
              <div className="chart-donut-center-text">
                <span className="chart-donut-total__value">{donutTotal(pieData)}</span>
                <span className="chart-donut-total__label">llamados</span>
              </div>
            </div>

            {/* Espaciador invisible para alinear perfectamente con el selector de los otros 2 gráficos */}
            <div className="report-chart-middle-toolbar" style={{ visibility: 'hidden' }} aria-hidden="true">
              <div style={{ height: 26 }} />
            </div>

            <CustomLegend data={pieData} colors={PIE_COLORS} total={donutTotal(pieData)} unitLabel="llamados" />
          </div>
        )}

        <SwitchableDistributionChart
          title="Origen de Llamados"
          subtitle="Comparación entre llamados intrahospitalarios y extrahospitalarios."
          data={originData}
          colors={ORIGIN_COLORS}
          chartType={originChartType}
          onChangeChartType={setOriginChartType}
          unitLabel="llamados"
        />

        <SwitchableDistributionChart
          title="Área de Origen"
          subtitle="Distribución de llamados según el área hospitalaria de procedencia."
          data={areaData}
          colors={AREA_COLORS}
          chartType={areaChartType}
          onChangeChartType={setAreaChartType}
          unitLabel="llamados"
        />
      </div>

      {/* 5. Listado Completo de Reportes con Filtros Avanzados (OLI-90) */}
      <div className="card-flat">
        <div className="table-header-row">
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Listado de Reportes</h3>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
              Mostrando {calls.length} {calls.length === 1 ? 'registro encontrado' : 'registros encontrados'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Por página:</span>
            <select
              className="select"
              style={{ width: 'auto', minWidth: '68px', padding: '6px 32px 6px 12px', fontSize: '0.8125rem', backgroundSize: '14px', backgroundPosition: 'right 10px center' }}
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th className="text-center">N° / ID</th>
                <th>Fecha y Hora</th>
                <th className="text-center">Tipo</th>
                <th className="text-center">Origen</th>
                <th>Área</th>
                <th className="text-center">Paciente</th>
                <th className="text-center">T. Respuesta</th>
                <th className="text-center">RCE</th>
                <th>Cargado Por</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 'var(--space-2xl) 0', color: 'var(--text-tertiary)' }}>
                    Cargando reportes clínicos...
                  </td>
                </tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: 'var(--space-2xl) 0', color: 'var(--text-tertiary)' }}>
                    {hasActiveFilters
                      ? 'No se encontraron llamados que coincidan con los filtros aplicados.'
                      : 'No hay reportes registrados en el sistema.'}
                  </td>
                </tr>
              ) : (
                paginatedCalls.map((call, idx) => {
                  const itemNumber = (currentPage - 1) * pageSize + idx + 1;
                  const dateObj = call.fecha ? new Date(call.fecha) : null;
                  const formattedDate = dateObj
                    ? `${dateObj.toLocaleDateString('es-AR')} ${dateObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`
                    : '—';

                  return (
                    <tr
                      key={call.id}
                      className="table-row-clickable"
                      onClick={() => setSelectedCallForDetail(call)}
                      title="Haz clic para ver la ficha clínica completa"
                    >
                      <td className="text-center" style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                        #{itemNumber}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{formattedDate}</td>
                      <td className="text-center">
                        <span className={`badge ${call.tipo === 'EMERGENCY' ? 'badge-danger' : 'badge-info'}`}>
                          {call.tipo === 'EMERGENCY' ? 'Emergencia' : 'Normal'}
                        </span>
                      </td>
                      <td className="text-center">
                        <span style={{ fontSize: '0.8125rem' }}>
                          {call.origen === 'INTRA_HOSPITAL' ? 'Intrahospitalario' : 'Extrahospitalario'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{call.area || '—'}</td>
                      <td className="text-center">
                        <span className="badge badge-secondary" style={{ background: 'var(--bg-input)' }}>
                          {call.pacienteId || 'NN'}
                        </span>
                      </td>
                      <td className="text-center">
                        {call.tiempoRespuestaMinutos !== null ? (
                          <span
                            style={{
                              fontWeight: 600,
                              color: call.tiempoRespuestaMinutos <= 3 ? 'var(--color-success)' : 'var(--color-warning)',
                            }}
                          >
                            {call.tiempoRespuestaMinutos} min
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)' }}>s/d</span>
                        )}
                      </td>
                      <td className="text-center">
                        <span className={`badge ${call.rce === 'si' ? 'badge-success' : 'badge-danger'}`}>
                          {call.rce === 'si' ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{call.cargadoPor || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Controles de Paginación */}
        {calls.length > pageSize && (
          <div className="pagination-wrapper">
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Página {currentPage} de {totalPages}
            </span>

            <div className="pagination-buttons">
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalle Utstein */}
      {selectedCallForDetail && (
        <ReportDetailModal
          call={selectedCallForDetail}
          onClose={() => setSelectedCallForDetail(null)}
        />
      )}
    </>
  );
}