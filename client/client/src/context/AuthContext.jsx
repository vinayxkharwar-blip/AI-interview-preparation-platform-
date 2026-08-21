import React, { createContext, useState, useEffect } from 'react';
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
    const res = await axiosClient.post('/auth/login', { email, password });
    const { token: newToken, user: userData } = res.data;
    const norm = normalizeUser(userData);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(norm));
    setToken(newToken);
    setUser(norm);
    return norm;
  };

  const register = async (name, email, password, targetRole) => {
    const res = await axiosClient.post('/auth/register', { name, email, password, targetRole });
    const { token: newToken, user: userData } = res.data;
    const norm = normalizeUser(userData);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(norm));
    setToken(newToken);
    setUser(norm);
    return norm;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

