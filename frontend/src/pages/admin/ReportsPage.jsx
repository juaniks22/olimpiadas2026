import { useState, useEffect, useContext, useMemo } from 'react';
import { AuthContext } from '../../App';
import FlatpickrRangePicker from '../../components/FlatpickrRangePicker';
import ReportDetailModal from '../../components/ReportDetailModal';
import { exportToPdf, exportToCsv } from '../../utils/reportExportUtils';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

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

  // 2. Cargar reportes y métricas según filtros activos
  useEffect(() => {
    const fetchReportsData = async () => {
      setLoading(true);
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
          fetch(`${API_URL}/api/reports/summary?${params}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/reports/calls?${params}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (summaryRes.ok && callsRes.ok) {
          const summaryData = await summaryRes.json();
          const callsData = await callsRes.json();
          setSummary(summaryData);
          setCalls(Array.isArray(callsData) ? callsData : []);
          setCurrentPage(1); // Reiniciar paginación al cambiar filtros
        }
      } catch (err) {
        console.error('Error al cargar reportes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReportsData();
  }, [API_URL, token, filters, seeding]);

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

      {/* 4. Gráfico de Torta Recharts */}
      {pieData.length > 0 && (
        <div className="card-flat report-chart-card" style={{ marginBottom: 'var(--space-xl)' }}>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Distribución de Llamados</h3>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
              Proporción de eventos de emergencia, normales y RCE en el período seleccionado.
            </p>
          </div>

          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={{ stroke: 'var(--text-tertiary)', strokeWidth: 1 }}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    borderColor: 'var(--border-card)',
                    borderRadius: '12px',
                    color: 'var(--text-primary)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    fontSize: '0.8125rem',
                  }}
                  formatter={(value, name) => [`${value} llamados`, name]}
                />
                <Legend
                  wrapperStyle={{ fontSize: '0.8125rem', paddingTop: '12px' }}
                  iconType="circle"
                  iconSize={8}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

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
                <th>N° / ID</th>
                <th>Fecha y Hora</th>
                <th>Tipo</th>
                <th>Origen</th>
                <th>Área</th>
                <th>Paciente</th>
                <th>T. Respuesta</th>
                <th>RCE</th>
                <th>Cargado Por</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: 'var(--space-2xl) 0', color: 'var(--text-tertiary)' }}>
                    Cargando reportes clínicos...
                  </td>
                </tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: 'var(--space-2xl) 0', color: 'var(--text-tertiary)' }}>
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
                    <tr key={call.id}>
                      <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                        #{itemNumber}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{formattedDate}</td>
                      <td>
                        <span className={`badge ${call.tipo === 'EMERGENCY' ? 'badge-danger' : 'badge-info'}`}>
                          {call.tipo === 'EMERGENCY' ? 'Emergencia' : 'Normal'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8125rem' }}>
                          {call.origen === 'INTRA_HOSPITAL' ? 'Intrahospitalario' : 'Extrahospitalario'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{call.area || '—'}</td>
                      <td>
                        <span className="badge badge-secondary" style={{ background: 'var(--bg-input)' }}>
                          {call.pacienteId || 'NN'}
                        </span>
                      </td>
                      <td>
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
                      <td>
                        <span className={`badge ${call.rce === 'si' ? 'badge-success' : 'badge-danger'}`}>
                          {call.rce === 'si' ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{call.cargadoPor || '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => setSelectedCallForDetail(call)}
                          style={{ color: 'var(--color-primary)' }}
                        >
                          Ver Ficha
                        </button>
                      </td>
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