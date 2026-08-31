// Utilidades de formato de etiquetas para los gráficos de Reportes.
// Los nombres de área/carro/categoría pueden ser largos y rompen el layout
// de ejes, leyendas y etiquetas de torta. Acá se truncan solo para lo visual;
// el nombre completo siempre queda disponible vía tooltip/title.

export function truncateLabel(value, maxLength = 14) {
  const text = value == null ? '' : String(value).trim();
  if (!text) return 'Sin nombre';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

// Formatter para el tickFormatter de los ejes X de Recharts.
export function axisTickFormatter(maxLength = 10) {
  return (value) => truncateLabel(value, maxLength);
}