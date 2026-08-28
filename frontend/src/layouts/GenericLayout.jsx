import { useContext, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';

const navItems = [
  { to: '/app', label: 'Panel Principal', icon: '', end: true },
  { to: '/app/history', label: 'Mi Historial', icon: '' },
];

export default function GenericLayout() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Ensure light theme
  useEffect(() => {
    document.documentElement.removeAttribute('data-theme');
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
            <h1>Turno Actual: Guardia</h1>
          </div>
          <div className="top-bar-actions">
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user?.username || 'Usuario'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Jefe de Piso</div>
            </div>
            <div className="avatar">
              {(user?.username || 'U').charAt(0).toUpperCase()}
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
