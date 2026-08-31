import { useContext } from 'react';
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
} from '../components/SidebarIcons';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: <DashboardIcon />, end: true },
  { to: '/admin/crash-carts', label: 'Carros de Paro', icon: <CrashCartIcon /> },
  { to: '/admin/areas', label: 'Áreas', icon: <AreaIcon /> },
  { to: '/admin/users', label: 'Cuentas', icon: <UsersIcon /> },
  { to: '/admin/staff', label: 'Personal Certificado', icon: <UserCheckIcon /> },
  { to: '/admin/response-team-positions', label: 'Roles', icon: <ShieldIcon /> },
  { to: '/admin/reports', label: 'Reportes', icon: <ReportsIcon /> },
];

export default function AdminLayout() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Tema del Administrador: oscuro por defecto, con opción de cambiar a claro.
  const { theme, toggleTheme } = useThemeToggle('bc-theme-admin', 'dark');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <Link to="/admin" className="sidebar-brand" aria-label="Ir al dashboard">
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
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="top-bar">
          <div className="top-bar-title">
            <h1>Hola, {user?.username || 'Administrador'}</h1>
            <p>Métricas de Código Azul — {new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}</p>
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