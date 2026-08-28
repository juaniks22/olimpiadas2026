import { useState, useContext } from 'react';
import { AuthContext } from '../App';

export default function LoginPage() {
  const { login, API_URL } = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        // El backend responde { error: { message, details } }.
        // Hay que leer .error.message, no .error (que es un objeto → "[object Object]").
        const message =
          data?.error?.message || data?.message || 'Usuario o contraseña incorrectos';
        throw new Error(message);
      }

      login(data.token, data.user);
    } catch (err) {
      setError(err.message || 'Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container fade-in">
        {/* Hero Section */}
        <div className="login-hero">
          <div className="login-hero-icon">+</div>
          <h2>Gestión de Emergencias</h2>
          <p>Plataforma integral para auditoría y registro clínico Utstein.</p>
          <div className="login-hero-footer">
            E.E.S.T. N°2 • ONETP 2026
          </div>
        </div>

        {/* Form Section */}
        <div className="login-form-section">
          <h1>Iniciar Sesión</h1>
          <p className="login-subtitle">Ingresa tus credenciales para continuar.</p>

          {error && <div className="login-error">{error}</div>}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="login-username">Usuario institucional</label>
              <input
                id="login-username"
                className="input"
                type="text"
                placeholder="Ej. jpiso, guardia"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="login-password">Contraseña</label>
              <input
                id="login-password"
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Ingresando...' : 'Ingresar a Blue Code'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
