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
import FileImport from "./admin/components/KnowledgeBase/FileImport";
import KBList from "./admin/components/KnowledgeBase/KBList";
import N8nGuide from "./admin/components/KnowledgeBase/N8nGuide";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

        {/* Cấu trúc Route Admin */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="knowledge-base" element={<KnowledgeManagement />}>
            <Route index element={<Navigate to="insert" replace />} />
            <Route path="insert" element={<SingleAdd />} />
            <Route path="import" element={<FileImport />} />
            <Route path="list" element={<KBList />} />
            <Route path="guide" element={<N8nGuide />} />
          </Route>
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
