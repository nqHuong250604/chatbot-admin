import React, { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../../services/authService";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Kiểm tra session khi khởi tạo hoặc khi token thay đổi
  const validateSession = async () => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await authService.checkSession();
      if (response && response.ok) {
        setUser(response.user);
      } else {
        localStorage.removeItem("admin_token");
        setUser(null);
      }
    } catch (error) {
      console.error("Session validation failed:", error);
      localStorage.removeItem("admin_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    validateSession();
  }, []);

  const login = (userData, token) => {
    localStorage.setItem("admin_token", token);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("admin_token");
      setUser(null);
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, validateSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
