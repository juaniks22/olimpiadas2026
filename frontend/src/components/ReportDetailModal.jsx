import React from 'react';

export default function ReportDetailModal({ call, onClose }) {
  if (!call) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR') + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatTimeOnly = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal report-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className={`badge ${call.tipo === 'EMERGENCY' ? 'badge-danger' : 'badge-info'}`}>
                {call.tipo === 'EMERGENCY' ? 'Código Azul — Emergencia' : 'Llamado Normal'}
              </span>
              <span className={`badge ${call.rce === 'si' ? 'badge-success' : 'badge-warning'}`}>
                {call.rce === 'si' ? 'RCE Logrado' : 'Sin RCE'}
              </span>
            </div>
            <h2>Ficha Clínica Utstein</h2>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem' }}>
              ID: {call.id} • Registrado el {formatDate(call.fecha)}
            </p>
          </div>
          <button className="btn-icon" onClick={onClose} title="Cerrar ventana">
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="report-detail-body">
          {/* Section: Paciente y Ubicación */}
          <div className="detail-section">
            <h4 className="detail-section-title">Datos del Paciente y Ubicación</h4>
            <div className="detail-grid">
              <div className="detail-field">
                <span className="detail-label">Área Hospitalaria</span>
                <span className="detail-value">{call.area || '—'}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Origen</span>
                <span className="detail-value">
                  {call.origen === 'INTRA_HOSPITAL' ? 'Intrahospitalario' : 'Extrahospitalario'}
                </span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Identificación</span>
                <span className="detail-value">{call.pacienteId || 'NN'}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Edad / Sexo</span>
                <span className="detail-value">
                  {call.pacienteEdad ? `${call.pacienteEdad} años` : 's/d'} • {call.pacienteSexo || 's/d'}
                </span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Fecha de Ingreso</span>
                <span className="detail-value">{formatDate(call.fechaIngreso)}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Tiempo desde Hallazgo</span>
                <span className="detail-value">
                  {call.tiempoHallazgoMinutos !== null ? `${call.tiempoHallazgoMinutos} min` : 's/d'}
                </span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Responsable de Carga</span>
                <span className="detail-value">{call.cargadoPor || '—'}</span>
              </div>
            </div>
          </div>

          {/* Section: Cronología Utstein */}
          <div className="detail-section">
            <h4 className="detail-section-title">Cronología de Tiempos Críticos (Utstein)</h4>
            <div className="timeline-horizontal">
              <div className="timeline-step">
                <span className="timeline-dot"></span>
                <span className="timeline-time">{formatTimeOnly(call.recepcion)}</span>
                <span className="timeline-name">Recepción / Activación</span>
              </div>
              <div className="timeline-step">
                <span className="timeline-dot" style={{ background: 'var(--color-primary)' }}></span>
                <span className="timeline-time">{formatTimeOnly(call.llegadaEquipo)}</span>
                <span className="timeline-name">Llegada Equipo</span>
                {call.tiempoRespuestaMinutos !== null && (
                  <span className="timeline-badge">{call.tiempoRespuestaMinutos} min</span>
                )}
              </div>
              <div className="timeline-step">
                <span className="timeline-dot"></span>
                <span className="timeline-time">{formatTimeOnly(call.inicioRcp)}</span>
                <span className="timeline-name">Inicio RCP</span>
              </div>
              {call.rceHora && (
                <div className="timeline-step">
                  <span className="timeline-dot" style={{ background: 'var(--color-success)' }}></span>
                  <span className="timeline-time">{formatTimeOnly(call.rceHora)}</span>
                  <span className="timeline-name">Retorno Circulación (RCE)</span>
                </div>
              )}
              <div className="timeline-step">
                <span className="timeline-dot"></span>
                <span className="timeline-time">{formatTimeOnly(call.finEvento)}</span>
                <span className="timeline-name">Fin / Suspensión</span>
              </div>
            </div>
          </div>

          {/* Section: Manejo Clínico */}
          <div className="detail-section">
            <h4 className="detail-section-title">Manejo Clínico y Vías</h4>
            <div className="detail-grid">
              <div className="detail-field">
                <span className="detail-label">Manejo de Vía Aérea</span>
                <span className="detail-value">{call.viaAerea || 'No registrado'}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Accesos Venosos</span>
                <span className="detail-value">{call.accesosVenosos || 'No registrado'}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Carro de Paro</span>
                <span className="detail-value">{call.carroUtilizado || 'Sin carro asignado'}</span>
              </div>
              <div className="detail-field">
                <span className="detail-label">Estado Post-Reanimación</span>
                <span className="detail-value">{call.estadoPostReanimacion || 'No especificado'}</span>
              </div>
              {call.causaSuspension && (
                <div className="detail-field" style={{ gridColumn: 'span 2' }}>
                  <span className="detail-label">Causa de Suspensión</span>
                  <span className="detail-value" style={{ color: 'var(--color-danger)' }}>
                    {call.causaSuspension}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section: Desfibrilaciones (si existen) */}
          {call.defibrillations && call.defibrillations.length > 0 && (
            <div className="detail-section">
              <h4 className="detail-section-title">
                Registro de Desfibrilaciones ({call.defibrillations.length})
              </h4>
              <div className="table-container">
                <table style={{ fontSize: '0.8125rem' }}>
                  <thead>
                    <tr>
                      <th>Secuencia</th>
                      <th>Hora</th>
                      <th>Energía</th>
                      <th>Ritmo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {call.defibrillations.map((def, idx) => (
                      <tr key={def.id || idx}>
                        <td>#{def.sequenceNumber || idx + 1}</td>
                        <td>{formatTimeOnly(def.performedAt)}</td>
                        <td>{def.energyDelivered ? `${def.energyDelivered} J` : 's/d'}</td>
                        <td>{def.rhythm || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section: Drogas Administradas (si existen) */}
          {call.drugsAdministered && call.drugsAdministered.length > 0 && (
            <div className="detail-section">
              <h4 className="detail-section-title">
                Fármacos Administrados ({call.drugsAdministered.length})
              </h4>
              <div className="table-container">
                <table style={{ fontSize: '0.8125rem' }}>
                  <thead>
                    <tr>
                      <th>Fármaco</th>
                      <th>Dosis</th>
                      <th>Vía</th>
                      <th>Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {call.drugsAdministered.map((dr, idx) => (
                      <tr key={dr.id || idx}>
                        <td style={{ fontWeight: 600 }}>{dr.drugName}</td>
                        <td>
                          {dr.dose} {dr.unit}
                        </td>
                        <td>{dr.route || '—'}</td>
                        <td>{formatTimeOnly(dr.administeredAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
