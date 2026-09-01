export default function ProfileBadge({ username, roleLabel }) {
  const initial = (username || '?').charAt(0).toUpperCase();

  return (
    <div className="profile-badge">
      <div className="profile-badge__avatar">{initial}</div>
      <div className="profile-badge__info">
        <span className="profile-badge__name" title={username || ''}>
          {username || 'Usuario'}
        </span>
        {roleLabel && <span className="profile-badge__role">{roleLabel}</span>}
      </div>
    </div>
  );
}
