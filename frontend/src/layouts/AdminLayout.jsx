import { useContext, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import HeartPulseIcon from '../components/HeartPulseIcon';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: '', end: true },
  { to: '/admin/crash-carts', label: 'Carros de Paro', icon: '' },
  { to: '/admin/areas', label: 'Áreas', icon: '' },
  { to: '/admin/users', label: 'Cuentas', icon: '' },
  { to: '/admin/reports', label: 'Reportes', icon: '' },
];

export default function AdminLayout() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Apply dark theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    return () => document.documentElement.removeAttribute('data-theme');
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <HeartPulseIcon size={20} color="white" />
          </div>
          <span className="sidebar-brand-text">BlueCode</span>
        </div>

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

        <button className="sidebar-link sidebar-logout" onClick={handleLogout}>
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span>Cerrar sesión</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <div className="top-bar">
          <div className="top-bar-title">
            <h1>Hola, {user?.username || 'Administrador'}</h1>
            <p>Métricas de Código Azul — {new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="top-bar-actions">
            <div className="avatar">
              {(user?.username || 'A').charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        <div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
