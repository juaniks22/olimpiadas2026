import { truncateLabel } from '../utils/chartFormat';

// Leyenda propia para los gráficos de Reportes: el <Legend> por defecto de
// Recharts amontona los ítems en una sola línea sin wrap real cuando hay
// varias categorías. Esta versión envuelve en grilla, trunca nombres largos
// y muestra el nombre completo + valor en el title nativo al pasar el mouse.
export default function ChartLegend({ data, colors, unitLabel = '' }) {
  if (!data?.length) return null;

  return (
    <ul className="chart-legend">
      {data.map((entry, index) => (
        <li
          key={entry.name}
          className="chart-legend__item"
          title={`${entry.name}: ${entry.value}${unitLabel ? ` ${unitLabel}` : ''}`}
        >
          <span
            className="chart-legend__swatch"
            style={{ background: colors[index % colors.length] }}
          />
          <span className="chart-legend__label">{truncateLabel(entry.name, 20)}</span>
          <span className="chart-legend__value">{entry.value}</span>
        </li>
      ))}
    </ul>
  );
}