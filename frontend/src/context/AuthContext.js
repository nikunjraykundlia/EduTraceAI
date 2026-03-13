'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUserLoggedIn = async () => {
      // Check both cookie and localStorage for robustness
      const token = Cookies.get('token') || localStorage.getItem('accessToken');

      if (token) {
        // Ensure both are in sync
        if (!Cookies.get('token')) Cookies.set('token', token, { expires: 7, path: '/' });
        if (!localStorage.getItem('accessToken')) localStorage.setItem('accessToken', token);

        try {
          const res = await api.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.user);
          } else {
            handleClearAuth();
          }
        } catch (error) {
          console.error("Auth check failed:", error);
          handleClearAuth();
        }
      }
      setLoading(false);
    };

    checkUserLoggedIn();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data.success) {
        const token = res.data.token;
        // Set both for redundancy and to satisfy user requirement
        Cookies.set('token', token, { expires: 7, path: '/' });
        localStorage.setItem('accessToken', token);
        setUser(res.data.user);
        router.push('/dashboard');
        return true;
      }
    } catch (error) {
      console.error(error);
      throw error.response?.data?.message || 'Login failed';
    }
  };

  const signup = async (userData) => {
    try {
      const res = await api.post('/auth/signup', userData);
      if (res.data.success) {
        const token = res.data.token;
        Cookies.set('token', token, { expires: 7, path: '/' });
        localStorage.setItem('accessToken', token);
        setUser(res.data.user);
        router.push('/dashboard');
        return true;
      }
    } catch (error) {
      console.error(error);
      throw error.response?.data?.message || 'Signup failed';
    }
  };

  const handleClearAuth = () => {
    Cookies.remove('token', { path: '/' });
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  const logout = () => {
    handleClearAuth();
    router.push('/auth/login');
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
