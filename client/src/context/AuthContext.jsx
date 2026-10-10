import React, { createContext, useState, useEffect, useCallback } from 'react';
import axiosClient from '../api/axiosClient';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          id: parsed.id || parsed._id,
          _id: parsed._id || parsed.id,
        };
      }
    } catch (e) {
      console.warn('Failed to parse saved user from localStorage');
    }
    return null;
  });
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  const normalizeUser = (userData) => {
    if (!userData) return null;
    const userId = userData.id || userData._id;
    return {
      ...userData,
      id: userId,
      _id: userId,
    };
  };

  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const response = await axiosClient.get('/auth/me');
        const norm = normalizeUser(response.data.user);
        if (norm) {
          setUser(norm);
          localStorage.setItem('user', JSON.stringify(norm));
        }
      } catch (err) {
        console.error('Failed to authenticate stored token:', err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;
    const res = await axiosClient.post('/auth/login', { email: cleanEmail, password });
    const { token: newToken, user: userData } = res.data;
    const norm = normalizeUser(userData);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(norm));
    setToken(newToken);
    setUser(norm);
    return norm;
  };

  const register = async (name, email, password, targetRole) => {
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : email;
    const cleanName = typeof name === 'string' ? name.trim() : name;
    const cleanRole = typeof targetRole === 'string' ? targetRole.trim() : targetRole;
    const res = await axiosClient.post('/auth/register', { name: cleanName, email: cleanEmail, password, targetRole: cleanRole });
    const { token: newToken, user: userData } = res.data;
    const norm = normalizeUser(userData);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(norm));
    setToken(newToken);
    setUser(norm);
    return norm;
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    try {
      sessionStorage.clear();
    } catch (e) {}
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

