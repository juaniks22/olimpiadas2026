import { useState, useContext } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import HeartPulseIcon from '../components/HeartPulseIcon';
import ProfileMenu from '../components/ProfileMenu';
import { useThemeToggle } from '../hooks/useThemeToggle';
import {
  DashboardIcon,
  CrashCartIcon,
  AreaIcon,
  UsersIcon,
  UserCheckIcon,
  ShieldIcon,
  ReportsIcon,
  MenuIcon,
} from '../components/SidebarIcons';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: <DashboardIcon />, end: true },
  { to: '/admin/crash-carts', label: 'Carros de Paro', icon: <CrashCartIcon /> },
  { to: '/admin/areas', label: 'Áreas', icon: <AreaIcon /> },
  { to: '/admin/users', label: 'Cuentas', icon: <UsersIcon /> },
  { to: '/admin/staff', label: 'Personal Certificado', icon: <UserCheckIcon /> },
  { to: '/admin/response-team-positions', label: 'Equipos de Respuesta', icon: <ShieldIcon /> },
  { to: '/admin/reports', label: 'Reportes', icon: <ReportsIcon /> },
];

export default function AdminLayout() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Tema del Administrador: oscuro por defecto, con opción de cambiar a claro.
  // La clave incluye el id de cuenta para que la preferencia sea propia de
  // esa sesión/usuario y no un estado compartido por rol.
  const { theme, toggleTheme } = useThemeToggle(`bc-theme-admin-${user?.id ?? 'anon'}`, 'dark');

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
        <Link to="/admin" className="sidebar-brand" aria-label="Ir al dashboard" onClick={() => setIsSidebarOpen(false)}>
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
            <h1>Hola, {user?.username || 'Administrador'}</h1>
          </div>
          <div className="top-bar-actions">
            <ProfileMenu
              username={user?.username}
              roleLabel="Administrador"
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