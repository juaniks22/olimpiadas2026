import { useState, useContext } from 'react';
import { AuthContext } from '../../App';

export default function ReportsPage() {
  const { token, API_URL } = useContext(AuthContext);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportType, setReportType] = useState('summary');
  const [loading, setLoading] = useState(false);

  const handleExport = async (format) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      params.set('type', reportType);
      params.set('format', format);

      const res = await fetch(`${API_URL}/api/reports/export/${format}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_${reportType}_${new Date().toISOString().slice(0, 10)}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error exporting report:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>Reportes</h2>
      </div>

      <div className="card-flat" style={{ marginBottom: 'var(--space-xl)' }}>
        <h3 style={{ marginBottom: 'var(--space-lg)' }}>Generar Reporte</h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
          <div className="input-group">
            <label htmlFor="report-from">Desde</label>
            <input
              id="report-from"
              className="input"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="report-to">Hasta</label>
            <input
              id="report-to"
              className="input"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="report-type">Tipo de Reporte</label>
            <select
              id="report-type"
              className="input"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="summary">Resumen General</option>
              <option value="response_times">Tiempos de Respuesta</option>
              <option value="crash_cart_usage">Uso de Carros de Paro</option>
              <option value="survival">Tasa de Supervivencia</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
          <button
            id="btn-export-pdf"
            className="btn btn-primary"
            onClick={() => handleExport('pdf')}
            disabled={loading}
          >
            Exportar PDF
          </button>
          <button
            id="btn-export-csv"
            className="btn btn-secondary"
            onClick={() => handleExport('csv')}
            disabled={loading}
          >
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="card-flat">
        <h3 style={{ marginBottom: 'var(--space-md)' }}>Reportes Recientes</h3>
        <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
          Selecciona las fechas y el tipo de reporte, luego haz clic en exportar.
        </p>
      </div>
    </>
  );
}
