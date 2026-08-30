import { useState, useContext } from 'react';
import { AuthContext } from '../App';
import HeartPulseIcon from '../components/HeartPulseIcon';
import PasswordInput from '../components/PasswordInput';

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
          <div className="login-hero-icon">
            <HeartPulseIcon size={24} color="white" />
          </div>
          <h2>Gestión de Emergencias</h2>
          <p>Plataforma para registro clinico especializado.</p>
        </div>

        {/* Form Section */}
        <div className="login-form-section">
          <h1>Iniciar Sesión</h1>
          <p className="login-subtitle">Ingresa tus credenciales para continuar.</p>

          {error && <div className="login-error">{error}</div>}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="login-username">Usuario</label>
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
              <PasswordInput
                id="login-password"
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
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
