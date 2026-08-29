import { useContext, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import HeartPulseIcon from '../components/HeartPulseIcon';

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

        <div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
