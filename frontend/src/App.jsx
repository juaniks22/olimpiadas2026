import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, createContext } from 'react';
import LoginPage from './pages/LoginPage';
import AdminLayout from './layouts/AdminLayout';
import GenericLayout from './layouts/GenericLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AreasPage from './pages/admin/AreasPage';
import UsersPage from './pages/admin/UsersPage';
import CrashCartsPage from './pages/admin/CrashCartsPage';
import ReportsPage from './pages/admin/ReportsPage';
import StaffPage from './pages/admin/StaffPage';
import ResponseTeamPositionsPage from './pages/admin/ResponseTeamPositionsPage';
import GenericDashboard from './pages/generic/GenericDashboard';
import GenericHistory from './pages/generic/GenericHistory';

export const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3000');

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('bc_token'));
  const [loading, setLoading] = useState(true);

  const login = (newToken, userData) => {
    localStorage.setItem('bc_token', newToken);
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('bc_token');
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    let timeoutId;
    if (token) {
      // Decode JWT payload to get user info
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ id: payload.sub || payload.id, username: payload.username, role: payload.role });
        
        if (payload.exp) {
          // La ventana se reinicia con cada request (ver interceptor: X-Session-Token),
          // así que este timeout salta solo tras 10 min SIN actividad de red.
          const timeUntilExp = (payload.exp * 1000) - Date.now();
          if (timeUntilExp <= 0) {
            logout();
          } else {
            timeoutId = setTimeout(() => {
              alert('Sesión cerrada por inactividad. Por favor, volvé a iniciar sesión.');
              logout();
            }, timeUntilExp);
          }
        }
      } catch {
        logout();
      }
    }
    setLoading(false);
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [token]);

  // Interceptor global:
  //  - Sesión DESLIZANTE: el backend manda un token nuevo en el header X-Session-Token en cada
  //    respuesta autenticada; lo guardamos y así se reinicia la ventana de 10 min. Si no hay
  //    ninguna request durante 10 min, el token vence y la sesión se cierra (inactividad).
  //  - Si llega un 401 (token vencido) en cualquier endpoint que no sea login, cerramos sesión.
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      // Renovar el token SOLO si sigue habiendo sesión. Si el usuario ya cerró sesión,
      // una respuesta autenticada que quedó en vuelo NO debe re-loguearlo.
      const current = localStorage.getItem('bc_token');
      const refreshed = response.headers.get('X-Session-Token');
      if (current && refreshed && refreshed !== current) {
        localStorage.setItem('bc_token', refreshed);
        setToken(refreshed); // re-arma el timeout de inactividad con el nuevo exp
      }

      if (response.status === 401 && !response.url.includes('/api/auth/login')) {
        const currentToken = localStorage.getItem('bc_token');
        if (currentToken) {
          alert('Sesión cerrada por inactividad. Por favor, volvé a iniciar sesión.');
          logout();
        }
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, API_URL }}>
      <BrowserRouter>
        <Routes>
          {/* Login */}
          <Route
            path="/login"
            element={user ? <Navigate to={user.role === 'ADMIN' ? '/admin' : '/app'} /> : <LoginPage />}
          />

          {/* Admin Routes (Dark Mode) */}
          <Route
            path="/admin"
            element={user?.role === 'ADMIN' ? <AdminLayout /> : <Navigate to="/login" />}
          >
            <Route index element={<AdminDashboard />} />
            <Route path="areas" element={<AreasPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="response-team-positions" element={<ResponseTeamPositionsPage />} />
            <Route path="crash-carts" element={<CrashCartsPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>

          {/* Generic / Jefe de Piso Routes (Light Mode) */}
          <Route
            path="/app"
            element={user?.role === 'GENERIC' ? <GenericLayout /> : <Navigate to="/login" />}
          >
            <Route index element={<GenericDashboard />} />
            <Route path="history" element={<GenericHistory />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;
