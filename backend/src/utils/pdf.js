// Generador de PDF mínimo, sin librería externa.
// Nota de diseño: el Documento de Visión pone la exportación PDF "linda" en el frontend (jsPDF).
// Este endpoint de backend produce un PDF simple de una página (resumen + primeras filas);
// para el detalle completo se usa la exportación CSV.
const MAX_LINES = 52;
const LEADING = 14;

function pdfEscape(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function buildSimplePdf(title, lines) {
  const all = [title, ""].concat(lines);
  let body = all;
  if (body.length > MAX_LINES) {
    body = body
      .slice(0, MAX_LINES)
      .concat(["", `... (${all.length - MAX_LINES} lineas mas - usar exportacion CSV)`]);
  }

  let content = `BT /F1 10 Tf ${LEADING} TL 54 750 Td\n`;
  body.forEach((line, i) => {
    const safe = pdfEscape(String(line).slice(0, 110));
    content += i === 0 ? `(${safe}) Tj\n` : `T* (${safe}) Tj\n`;
  });
  content += "ET";

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((obj, idx) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${idx + 1} 0 obj\n${obj}\nendobj\n`;
  });

  const xrefStart = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => {
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "latin1");
}

module.exports = { buildSimplePdf };
