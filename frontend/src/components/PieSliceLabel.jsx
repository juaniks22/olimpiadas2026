import { truncateLabel } from '../utils/chartFormat';

// Devuelve un renderer de etiqueta para <Pie label={...}> que:
// - dibuja el texto DENTRO de la porción (sin línea guía hacia afuera),
//   que es la causa principal de la superposición cuando hay muchas
//   categorías chicas apiladas en la parte inferior del gráfico.
// - oculta el texto en porciones demasiado finas (no entraría igual),
//   dejando que su nombre y valor se consulten en la leyenda/tooltip.
export function makePieSliceLabel({ minPercent = 0.08, maxLength = 10 } = {}) {
  return (props) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props;
    if (percent < minPercent) return null;

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: 11, fontWeight: 600, fill: '#fff', pointerEvents: 'none' }}
      >
        {`${truncateLabel(name, maxLength)} ${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };
}