// src/context/AuthContext.jsx

import { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_BASE = 'http://127.0.0.1:8000';

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);   // { full_name, role }
  const [tokens, setTokens] = useState(null); // { access_token, refresh_token }
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      // OAuth2 expects form data, not JSON
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);

      const res = await axios.post(`${API_BASE}/auth/login`, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      setTokens({
        access_token : res.data.access_token,
        refresh_token: res.data.refresh_token
      });
      setUser({
        full_name: res.data.full_name,
        role     : res.data.role
      });
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setTokens(null);
    setError(null);
  }, []);

  // Axios instance with auth header — use this for all API calls
  const authAxios = useCallback(() => {
    const instance = axios.create({
      baseURL: API_BASE,
      headers: {
        Authorization: `Bearer ${tokens?.access_token}`
      }
    });
    return instance;
  }, [tokens]);

  return (
    <AuthContext.Provider value={{
      user,
      tokens,
      loading,
      error,
      login,
      logout,
      authAxios,
      isAuthenticated: !!user,
      isHOD          : user?.role === 'HOD'
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}