// Solo ícono (avatar con inicial) + nombre de la cuenta, sin menú desplegable.
// El tema claro/oscuro y "Cerrar sesión" viven en el ProfileMenu del top-bar.
export default function ProfileBadge({ username, roleLabel }) {
  const initial = (username || '?').charAt(0).toUpperCase();

  return (
    <div className="profile-badge">
      <span className="profile-badge__avatar">{initial}</span>
      <span className="profile-badge__info">
        <span className="profile-badge__name">{username || 'Cuenta'}</span>
        {roleLabel && <span className="profile-badge__role">{roleLabel}</span>}
      </span>
    </div>
  );
}