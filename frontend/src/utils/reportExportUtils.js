import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Exporta el listado y métricas de llamados a un archivo PDF estructurado con jsPDF.
 */
export function exportToPdf({ calls = [], summary = {}, filters = {}, areasList = [] }) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor = [37, 99, 235]; // #2563EB
  const darkTextColor = [30, 41, 59]; // #1E293B
  const mutedTextColor = [100, 116, 139]; // #64748B
  const accentRed = [244, 63, 94]; // #F43F5E
  const accentGreen = [16, 185, 129]; // #10B981

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // --- 1. Encabezado Institucional ---
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 18, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('BLUE CODE — AUDITORÍA CLÍNICA Y REGISTRO UTSTEIN', 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const nowStr = new Date().toLocaleString('es-AR');
  doc.text(`Emisión: ${nowStr}`, pageWidth - 14, 12, { align: 'right' });

  // --- 2. Parámetros de Filtro Aplicados ---
  doc.setTextColor(...darkTextColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Parámetros del Reporte', 14, 26);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...mutedTextColor);

  const fromText = filters.dateFrom ? filters.dateFrom : 'Inicio histórico';
  const toText = filters.dateTo ? filters.dateTo : 'Actualidad';
  const rangeText = `Rango: ${fromText}  hasta  ${toText}`;

  const selectedAreaObj = areasList.find((a) => a.id === filters.areaId);
  const areaText = `Área: ${selectedAreaObj ? selectedAreaObj.name : 'Todas'}`;

  const originText = `Origen: ${
    filters.origin === 'INTRA_HOSPITAL'
      ? 'Intrahospitalario'
      : filters.origin === 'EXTRA_HOSPITAL'
      ? 'Extrahospitalario'
      : 'Todos'
  }`;

  const typeText = `Urgencia: ${
    filters.type === 'EMERGENCY'
      ? 'Emergencia (Código Azul)'
      : filters.type === 'NORMAL'
      ? 'Normal'
      : 'Todos'
  }`;

  const searchParam = filters.search ? `Búsqueda: "${filters.search}"` : null;

  const filterSummary = [rangeText, areaText, originText, typeText, searchParam]
    .filter(Boolean)
    .join('  •  ');

  doc.text(filterSummary, 14, 31);

  // --- 3. Bloque de Métricas Resumen (KPIs) ---
  const totalCalls = summary.totalCalls ?? calls.length;
  const avgResp = summary.averageResponseTimeMinutes !== null && summary.averageResponseTimeMinutes !== undefined
    ? `${summary.averageResponseTimeMinutes} min`
    : 's/d';
  const survivalRate = summary.survivalRatePercent !== undefined ? `${summary.survivalRatePercent}%` : '0%';
  const emergencyCount = summary.callsByType?.EMERGENCY ?? calls.filter((c) => c.tipo === 'EMERGENCY').length;
  const normalCount = summary.callsByType?.NORMAL ?? calls.filter((c) => c.tipo === 'NORMAL').length;

  const kpis = [
    { label: 'TOTAL LLAMADOS', value: String(totalCalls) },
    { label: 'T. PROM. RESPUESTA', value: avgResp },
    { label: 'TASA RCE (ÉXITO)', value: survivalRate },
    { label: 'EMERGENCIA / NORMAL', value: `${emergencyCount} / ${normalCount}` },
  ];

  const kpiWidth = (pageWidth - 28 - (kpis.length - 1) * 6) / kpis.length;
  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (kpiWidth + 6);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, 36, kpiWidth, 16, 2, 2, 'FD');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...mutedTextColor);
    doc.text(kpi.label, x + 4, 42);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primaryColor);
    doc.text(kpi.value, x + 4, 49);
  });

  // --- 4. Tabla de Llamados con autoTable ---
  const tableData = calls.map((c, index) => {
    const formattedDate = c.fecha
      ? new Date(c.fecha).toLocaleString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 's/d';

    const respTimeStr = c.tiempoRespuestaMinutos !== null && c.tiempoRespuestaMinutos !== undefined
      ? `${c.tiempoRespuestaMinutos}m`
      : 's/d';

    return [
      `#${index + 1}`,
      formattedDate,
      c.tipo === 'EMERGENCY' ? 'Emergencia' : 'Normal',
      c.origen === 'INTRA_HOSPITAL' ? 'Intra' : 'Extra',
      c.area || '—',
      c.pacienteId || 'NN',
      respTimeStr,
      c.rce === 'si' ? 'Sí' : 'No',
      c.cargadoPor || '—',
    ];
  });

  autoTable(doc, {
    startY: 56,
    head: [
      ['N°', 'Fecha/Hora', 'Tipo', 'Origen', 'Área', 'Paciente', 'T. Resp.', 'RCE', 'Responsable'],
    ],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: darkTextColor,
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 32 },
      2: { cellWidth: 26 },
      3: { cellWidth: 22 },
      4: { cellWidth: 40, halign: 'left' },
      5: { cellWidth: 38, halign: 'left' },
      6: { cellWidth: 22 },
      7: { cellWidth: 18 },
      8: { cellWidth: 38, halign: 'left' },
    },
    didParseCell: (data) => {
      // Badges coloreados
      if (data.section === 'body') {
        if (data.column.index === 2) {
          data.cell.styles.textColor = data.cell.raw === 'Emergencia' ? accentRed : primaryColor;
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.column.index === 7) {
          data.cell.styles.textColor = data.cell.raw === 'Sí' ? accentGreen : accentRed;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: 14, right: 14, bottom: 18 },
  });

  // --- 5. Pie de Página con numeración ---
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedTextColor);
    doc.text(
      'Documento confidencial para uso exclusivo de auditoría médica — Blue Code E.E.S.T. N°2 • ONETP 2026',
      14,
      pageHeight - 8
    );
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
  }

  const dateSuffix = new Date().toISOString().slice(0, 10);
  doc.save(`reporte_codigo_azul_${dateSuffix}.pdf`);
}

/**
 * Exportación nativa a CSV (RFC 4180 + UTF-8 BOM para Excel) sin librerías externas.
 */
export function exportToCsv({ calls = [] }) {
  if (!calls.length) {
    alert('No hay llamados para exportar con los filtros actuales.');
    return;
  }

  const BOM = '\uFEFF';
  const headers = [
    'ID Llamado',
    'Fecha Creación',
    'Tipo',
    'Origen',
    'Área',
    'Paciente',
    'Tipo Paciente',
    'Edad',
    'Sexo',
    'Hora Recepción',
    'Hora Llegada Equipo',
    'Inicio RCP',
    'Hora RCE',
    'Fin Evento',
    'Tiempo Respuesta (min)',
    'Retorno Circulación (RCE)',
    'Manejo Vía Aérea',
    'Accesos Venosos',
    'Estado Post-Reanimación',
    'Causa Suspensión',
    'Carro Utilizado',
    'Cargado Por',
  ];

  const escapeCell = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows = calls.map((c) => [
    escapeCell(c.id),
    escapeCell(c.fecha ? new Date(c.fecha).toLocaleString('es-AR') : ''),
    escapeCell(c.tipo === 'EMERGENCY' ? 'Emergencia' : 'Normal'),
    escapeCell(c.origen === 'INTRA_HOSPITAL' ? 'Intrahospitalario' : 'Extrahospitalario'),
    escapeCell(c.area || ''),
    escapeCell(c.pacienteId || 'NN'),
    escapeCell(c.pacienteTipo || ''),
    escapeCell(c.pacienteEdad ?? ''),
    escapeCell(c.pacienteSexo || ''),
    escapeCell(c.recepcion ? new Date(c.recepcion).toLocaleTimeString('es-AR') : ''),
    escapeCell(c.llegadaEquipo ? new Date(c.llegadaEquipo).toLocaleTimeString('es-AR') : ''),
    escapeCell(c.inicioRcp ? new Date(c.inicioRcp).toLocaleTimeString('es-AR') : ''),
    escapeCell(c.rceHora ? new Date(c.rceHora).toLocaleTimeString('es-AR') : ''),
    escapeCell(c.finEvento ? new Date(c.finEvento).toLocaleTimeString('es-AR') : ''),
    escapeCell(c.tiempoRespuestaMinutos ?? ''),
    escapeCell(c.rce === 'si' ? 'Sí' : 'No'),
    escapeCell(c.viaAerea || ''),
    escapeCell(c.accesosVenosos || ''),
    escapeCell(c.estadoPostReanimacion || ''),
    escapeCell(c.causaSuspension || ''),
    escapeCell(c.carroUtilizado || ''),
    escapeCell(c.cargadoPor || ''),
  ]);

  const csvContent = BOM + [headers.map((h) => `"${h}"`).join(','), ...rows.map((r) => r.join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateSuffix = new Date().toISOString().slice(0, 10);
  a.download = `reporte_codigo_azul_${dateSuffix}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
