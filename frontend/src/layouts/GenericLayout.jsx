import { useContext } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import HeartPulseIcon from '../components/HeartPulseIcon';
import ProfileMenu from '../components/ProfileMenu';
import ProfileBadge from '../components/ProfileBadge';
import { useThemeToggle } from '../hooks/useThemeToggle';
import { HomeIcon, HistoryIcon } from '../components/SidebarIcons';

const navItems = [
  { to: '/app', label: 'Panel Principal', icon: <HomeIcon />, end: true },
  { to: '/app/history', label: 'Mi Historial', icon: <HistoryIcon /> },
];

export default function GenericLayout() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Tema del Genérico (Jefe de Piso): claro por defecto, con opción de cambiar a oscuro.
  // La clave incluye el id de cuenta: cada Jefe de Piso tiene su propia
  // preferencia, sin pisar la de otros usuarios Genérico ni la del Admin.
  const { theme, toggleTheme } = useThemeToggle(`bc-theme-generic-${user?.id ?? 'anon'}`, 'light');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <Link to="/app" className="sidebar-brand" aria-label="Ir al panel principal">
          <div className="sidebar-brand-icon">
            <HeartPulseIcon size={20} color="white" />
          </div>
          <span className="sidebar-brand-text">BlueCode</span>
        </Link>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <ProfileBadge username={user?.username} roleLabel="Jefe de Piso" />
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="top-bar">
          <div className="top-bar-title">
            <h1>Turno Actual: Guardia</h1>
          </div>
          <div className="top-bar-actions">
            <ProfileMenu
              username={user?.username}
              roleLabel="Jefe de Piso"
              theme={theme}
              onToggleTheme={toggleTheme}
              onLogout={handleLogout}
            />
          </div>
        </div>

        <div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}