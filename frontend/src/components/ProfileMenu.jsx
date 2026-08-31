import { useEffect, useRef, useState } from 'react';
import ThemeToggleButton from './ThemeToggleButton';
import { LogoutIcon, ChevronUpIcon } from './SidebarIcons';

// Botón de perfil del top-bar: avatar + nombre de cuenta que, al tocarlo,
// despliega hacia abajo un panel con el switch de tema claro/oscuro y la
// opción de cerrar sesión, todo agrupado en un solo lugar.
export default function ProfileMenu({ username, roleLabel, theme, onToggleTheme, onLogout }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const initial = (username || '?').charAt(0).toUpperCase();

  return (
    <div className={`profile-menu${open ? ' profile-menu--open' : ''}`} ref={containerRef}>
      {open && (
        <div className="profile-menu__panel">
          <div className="profile-menu__row">
            <span>Tema</span>
            <ThemeToggleButton theme={theme} onToggle={onToggleTheme} />
          </div>
          <button type="button" className="profile-menu__logout" onClick={onLogout}>
            <LogoutIcon width={16} height={16} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      )}

      <button
        type="button"
        className="profile-menu__trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="profile-menu__avatar">{initial}</span>
        <span className="profile-menu__info">
          <span className="profile-menu__name">{username || 'Cuenta'}</span>
          {roleLabel && <span className="profile-menu__role">{roleLabel}</span>}
        </span>
        <ChevronUpIcon className="profile-menu__chevron" width={14} height={14} />
      </button>
    </div>
  );
}