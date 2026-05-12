import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

/**
 * AuthProvider
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const savedToken = localStorage.getItem('sto_token');
      const savedUser = localStorage.getItem('sto_user');

      if (savedToken && savedUser) {
        try {
          const { data } = await authAPI.getMe();
          setToken(savedToken);
          setUser(data.user);
        } catch {
          localStorage.removeItem('sto_token');
          localStorage.removeItem('sto_user');
        }
      }
      setLoading(false);
    };

    restoreSession();
  }, []);

  /**
   * login — зберігає токен і дані користувача після успішного входу
   * @param {string} newToken JWT токен з API
   * @param {object} userData об'єкт користувача { id, fullName, email, role }
   */
  const login = useCallback((newToken, userData) => {
    localStorage.setItem('sto_token', newToken);
    localStorage.setItem('sto_user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  }, []);

  /**
   * logout — очищає сесію та перенаправляє на /login
   */
  const logout = useCallback(() => {
    localStorage.removeItem('sto_token');
    localStorage.removeItem('sto_user');
    setToken(null);
    setUser(null);
  }, []);

  const isAuthenticated = !!user && !!token;
  const isAdmin = user?.role === 'admin';
  const isMechanic = user?.role === 'mechanic';

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    isAdmin,
    isMechanic,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth повинен використовуватись всередині <AuthProvider>');
  }
  return context;
}

export default AuthContext;