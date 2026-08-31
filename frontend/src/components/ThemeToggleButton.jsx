import { SunIcon, MoonIcon } from './SidebarIcons';

// Botón de alternancia de tema, usado en el top-bar de ambos layouts
// (Admin y Genérico). Muestra el ícono de la acción disponible: sol para
// pasar a claro, luna para pasar a oscuro.
export default function ThemeToggleButton({ theme, onToggle }) {
  const isDark = theme === 'dark';
  const label = isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={onToggle}
      title={label}
      aria-label={label}
    >
      {isDark ? <SunIcon width={18} height={18} /> : <MoonIcon width={18} height={18} />}
    </button>
  );
}