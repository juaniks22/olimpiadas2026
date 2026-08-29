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

  useEffect(() => {
    if (token) {
      // Decode JWT payload to get user info
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ id: payload.id, username: payload.username, role: payload.role });
      } catch {
        localStorage.removeItem('bc_token');
        setToken(null);
      }
    }
    setLoading(false);
  }, [token]);

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

  // Interceptor global para cerrar sesión cuando el token expira (backend retorna 401)
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      // Si recibimos 401 en cualquier endpoint que no sea el de login, la sesión expiró.
      if (response.status === 401 && !response.url.includes('/api/auth/login')) {
        const currentToken = localStorage.getItem('bc_token');
        if (currentToken) {
          alert('Sesión expirada por inactividad. Por favor, vuelva a iniciar sesión.');
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
