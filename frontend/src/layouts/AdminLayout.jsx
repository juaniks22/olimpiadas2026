import { useContext, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';

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
          <div className="sidebar-brand-icon">+</div>
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

        <button className="sidebar-link" onClick={handleLogout} style={{ marginTop: 'auto' }}>
          <span className="icon"></span>
          Cerrar sesión
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

        <div className="slide-up">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
