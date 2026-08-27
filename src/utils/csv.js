// Exportación CSV sin librería externa (restricción del stack).
const BOM = "﻿";

function escapeCell(value) {
  if (value === null || value === undefined) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

// rows: array de objetos planos con las mismas claves. La primera fila define los encabezados.
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
