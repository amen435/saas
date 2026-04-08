import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@/services/authService';
import { clearLegacyAuthStorage, clearCsrfSession } from '@/utils/authStorage';

const AuthContext = createContext(null);

const ROLE_ROUTES = {
  SUPER_ADMIN: '/superadmin',
  SCHOOL_ADMIN: '/admin',
  HOMEROOM_TEACHER: '/homeroom',
  TEACHER: '/teacher',
  STUDENT: '/student',
  PARENT: '/parent',
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [activeRole, setActiveRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const normalizeRole = (role) => {
    const normalized = String(role || '').trim();
    return normalized ? normalized.toUpperCase() : null;
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        clearLegacyAuthStorage();
        const verifiedUser = await authService.verifySession();

        if (verifiedUser) {
          setUser(verifiedUser);
          setActiveRole(null);
        } else {
          setUser(null);
          setActiveRole(null);
          clearLegacyAuthStorage();
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setUser(null);
        clearLegacyAuthStorage();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (username, password, schoolId) => {
    try {
      clearLegacyAuthStorage();
      const result = await authService.login(username, password, schoolId);

      if (!result.success) {
        return { success: false, error: result.error };
      }

      const userData = result.user;
      setUser(userData);

      const roles =
        Array.isArray(userData.roles) && userData.roles.length > 0
          ? userData.roles
          : [userData.role].filter(Boolean);

      if (roles.length === 1) {
        const role = normalizeRole(roles[0]);
        setActiveRole(role);
        navigate(ROLE_ROUTES[role] || '/');
      } else {
        setActiveRole(null);
        navigate('/select-role');
      }

      return { success: true, user: userData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setActiveRole(null);
    clearCsrfSession();
    clearLegacyAuthStorage();
    navigate('/login');
  };

  const updateActiveRole = (role) => {
    const normalized = normalizeRole(role);
    setActiveRole(normalized);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        isAuthenticated: !!user,
        activeRole,
        setActiveRole: updateActiveRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
