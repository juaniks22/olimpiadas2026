import { useState, useContext } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import HeartPulseIcon from '../components/HeartPulseIcon';
import ProfileMenu from '../components/ProfileMenu';
import { useThemeToggle } from '../hooks/useThemeToggle';
import { HomeIcon, HistoryIcon, MenuIcon } from '../components/SidebarIcons';

const navItems = [
  { to: '/app', label: 'Panel Principal', icon: <HomeIcon />, end: true },
  { to: '/app/history', label: 'Mi Historial', icon: <HistoryIcon /> },
];

export default function GenericLayout() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Tema del Genérico (Jefe de Piso): claro por defecto, con opción de cambiar a oscuro.
  const { theme, toggleTheme } = useThemeToggle('bc-theme-generic', 'light');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      {/* Overlay mobile */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} 
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <Link to="/app" className="sidebar-brand" aria-label="Ir al panel principal" onClick={() => setIsSidebarOpen(false)}>
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
              onClick={() => setIsSidebarOpen(false)}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="top-bar">
          <div className="top-bar-title">
            <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
              <MenuIcon />
            </button>
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