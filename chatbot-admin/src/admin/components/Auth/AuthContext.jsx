import React, { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../../services/authService";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Load initial state from localStorage for immediate UI feedback
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("admin_user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Kiểm tra session khi khởi tạo hoặc khi token thay đổi
  const validateSession = async () => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setUser(null);
      localStorage.removeItem("admin_user");
      setLoading(false);
      return;
    }

    try {
      const response = await authService.checkSession();
      if (response && response.ok) {
        // Cập nhật thông tin user mới nhất từ server
        setUser(response.user);
        localStorage.setItem("admin_user", JSON.stringify(response.user));
      } else {
        throw new Error("Invalid session");
      }
    } catch (error) {
      console.error("Session validation failed:", error);
      // Chỉ xóa user nếu backend trả về lỗi xác thực rõ rệt
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
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
    localStorage.setItem("admin_user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_user");
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
