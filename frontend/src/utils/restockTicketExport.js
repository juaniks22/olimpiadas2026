import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function safeName(text) {
  return String(text || 'carro')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'carro';
}

function statusLabel(status) {
  return status === 'OUT_OF_SERVICE' ? 'Fuera de servicio' : 'En operación';
}

function buildRows(ticket, checked = {}) {
  return (ticket.lines || []).map((l, i) => ({
    n: i + 1,
    name: l.name,
    consumed: l.consumed,
    unit: l.unit || '—',
    standard: l.standardQuantity != null ? l.standardQuantity : '—',
    done: checked[l.itemId] ? 'Sí' : 'No',
  }));
}

// ---------------------------------------------------------------------------
// TXT — texto plano, sin librerías
// ---------------------------------------------------------------------------
export function exportRestockTxt(ticket, checked = {}) {
  const rows = buildRows(ticket, checked);
  const now = new Date().toLocaleString('es-AR');
  const react = ticket.lastReactivationAt
    ? new Date(ticket.lastReactivationAt).toLocaleString('es-AR')
    : '—';

  const L = [];
  L.push('BLUE CODE - TICKET DE REPOSICION DEL CARRO DE PARO');
  L.push('='.repeat(52));
  L.push('');
  L.push(`Carro:               ${ticket.cartName || '-'}`);
  L.push(`Area:                ${ticket.areaName || '-'}`);
  L.push(`Estado:              ${statusLabel(ticket.status)}`);
  L.push(`Ultima reactivacion: ${react}`);
  L.push(`Emitido:             ${now}`);
  L.push('');
  L.push('ITEMS A REPONER');
  L.push('-'.repeat(52));

  const head = `${'#'.padEnd(4)}${'Item'.padEnd(30)}${'A reponer'.padEnd(12)}${'Unidad'.padEnd(26)}${'Estandar'.padEnd(10)}Repuesto`;
  L.push(head);
  for (const r of rows) {
    L.push(
      `${String(r.n).padEnd(4)}${String(r.name).slice(0, 29).padEnd(30)}${String(r.consumed).padEnd(12)}${String(r.unit).slice(0, 25).padEnd(26)}${String(r.standard).padEnd(10)}${r.done}`
    );
  }

  L.push('');
  L.push(`Total a reponer: ${ticket.totalUnitsConsumed} unidad(es)`);
  L.push('');
  L.push('Revisar cada item, reponerlo hasta la cantidad estandar y tildar en el sistema');
  L.push('antes de reactivar el carro.');

  const blob = new Blob([L.join('\r\n')], { type: 'text/plain;charset=utf-8;' });
  triggerDownload(blob, `reposicion_${safeName(ticket.cartName)}_${dateSuffix()}.txt`);
}

// ---------------------------------------------------------------------------
// PDF — jsPDF + autoTable (mismo estilo que los reportes)
// ---------------------------------------------------------------------------
export function exportRestockPdf(ticket, checked = {}) {
  const rows = buildRows(ticket, checked);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const primary = [37, 99, 235];
  const dark = [30, 41, 59];
  const muted = [100, 116, 139];
  const green = [16, 185, 129];
  const red = [244, 63, 94];

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Encabezado
  doc.setFillColor(...primary);
  doc.rect(0, 0, pageWidth, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('BLUE CODE — TICKET DE REPOSICIÓN DE CARRO DE PARO', 14, 12);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Emitido: ${new Date().toLocaleString('es-AR')}`, pageWidth - 14, 12, { align: 'right' });

  // Datos del carro
  doc.setTextColor(...dark);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Carro de paro', 14, 27);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...muted);
  const react = ticket.lastReactivationAt
    ? new Date(ticket.lastReactivationAt).toLocaleString('es-AR')
    : '—';
  doc.text(
    [
      `Carro: ${ticket.cartName || '—'}`,
      `Área: ${ticket.areaName || '—'}`,
      `Estado: ${statusLabel(ticket.status)}`,
      `Última reactivación: ${react}`,
    ].join('    •    '),
    14,
    33
  );

  // Tabla
  autoTable(doc, {
    startY: 40,
    head: [['N°', 'Ítem', 'A reponer', 'Unidad', 'Estándar', 'Repuesto']],
    body: rows.map((r) => [`#${r.n}`, r.name, String(r.consumed), r.unit, String(r.standard), r.done]),
    theme: 'grid',
    headStyles: { fillColor: primary, textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 8, textColor: dark },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      1: { cellWidth: 58 },
      2: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 48 },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        data.cell.styles.textColor = data.cell.raw === 'Sí' ? green : red;
      }
    },
    margin: { left: 14, right: 14, bottom: 16 },
  });

  const endY = doc.lastAutoTable.finalY || 40;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...dark);
  doc.text(`Total a reponer: ${ticket.totalUnitsConsumed} unidad(es)`, 14, endY + 8);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...muted);
  doc.text(
    'Reponer cada ítem hasta la cantidad estándar y tildar en el sistema antes de reactivar el carro.',
    14,
    pageHeight - 8
  );

  doc.save(`reposicion_${safeName(ticket.cartName)}_${dateSuffix()}.pdf`);
}

function dateSuffix() {
  return new Date().toISOString().slice(0, 10);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
