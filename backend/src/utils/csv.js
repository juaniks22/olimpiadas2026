// Exportación CSV nativa sin dependencias externas (cumple con restricción del stack).
const BOM = "\uFEFF";

// Escapa el valor de una celda para CSV. 
// Convierte nulos en strings vacíos, fechas a ISO, y encierra textos con comillas o saltos de línea entre comillas dobles.
function escapeCell(value) {
  if (value === null || value === undefined) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

// Genera un string en formato CSV a partir de un arreglo de objetos planos.
// Utiliza las claves del primer objeto como encabezados. Agrega el BOM UTF-8 para compatibilidad con Excel.
function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCell(row[h])).join(","));
  }
  // BOM UTF-8 para que Excel abra bien los acentos.
  return BOM + lines.join("\r\n");
}

module.exports = { toCsv };
