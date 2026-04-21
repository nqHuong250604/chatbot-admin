import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import AdminLayout from "./admin/layouts/AdminLayout";
import Dashboard from "./admin/pages/Dashboard";
import KnowledgeManagement from "./admin/pages/KnowledgeManagement";
import Settings from "./admin/pages/Settings";
import SingleAdd from "./admin/components/KnowledgeBase/SingleAdd";
import BatchAdd from "./admin/components/KnowledgeBase/BatchAdd";
import FileImport from "./admin/components/KnowledgeBase/FileImport";
import KBList from "./admin/components/KnowledgeBase/KBList";
import Login from "./admin/pages/Login";
import { AuthProvider, useAuth } from "./admin/components/Auth/AuthContext";
import { Toaster } from "react-hot-toast";

// Thành phần bảo vệ Route
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a]">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          {/* Route công khai */}
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

          {/* Cấu trúc Route Admin - Được bảo vệ */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="knowledge-base" element={<KnowledgeManagement />}>
              <Route index element={<Navigate to="insert" replace />} />
              <Route path="insert" element={<SingleAdd />} />
              <Route path="batch" element={<BatchAdd />} />
              <Route path="import" element={<FileImport />} />
              <Route path="list" element={<KBList />} />
            </Route>
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
