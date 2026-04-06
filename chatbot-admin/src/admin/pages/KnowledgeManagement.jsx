import React from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const KnowledgeManagement = () => {
  const location = useLocation();

  const tabs = [
    {
      id: "single",
      label: "Nhập từng câu hỏi",
      path: "/admin/knowledge-base/insert",
    },
    { id: "file", label: "Import file", path: "/admin/knowledge-base/import" },
    {
      id: "list",
      label: "Xem và quản lý KB",
      path: "/admin/knowledge-base/list",
    },
    {
      id: "guide",
      label: "Hướng dẫn n8n",
      path: "/admin/knowledge-base/guide",
    },
  ];

  // Tìm tab hiện tại để làm breadcrumb (Source)
  const activeTab =
    tabs.find((tab) => location.pathname === tab.path) || tabs[0];

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-10 font-sans text-left">
      <div className="max-w-[1200px] mx-auto space-y-8">
        {/* SOURCE / BREADCRUMB - Giống yêu cầu của bạn */}
        <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
          <span>Quản lý tri thức</span>
          <ChevronRight size={12} />
          <span className="text-blue-600">{activeTab.label}</span>
        </nav>

        {/* HEADER SECTION (Giữ nguyên UI cũ) */}
        <header className="space-y-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Quản lý tri thức
            </h1>
            <p className="text-slate-500 mt-2 text-sm font-medium">
              Nhập từng cặp Q&A hoặc import nhiều câu hỏi để gửi sang n8n xử lý
              chunking và embedding.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex items-center gap-3">
              <span className="text-blue-700 text-[11px] font-bold uppercase tracking-wider">
                Bảng KB hiện dùng:{" "}
                <span className="text-blue-900 ml-1 font-black">DOCUMENTS</span>
              </span>
            </div>
            <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-700 text-[11px] font-bold uppercase tracking-wider">
                Webhook n8n đã cấu hình
              </span>
            </div>
          </div>
        </header>

        {/* TAB NAVIGATION (Giữ nguyên UI cũ, chỉ thay button bằng Link) */}
        <nav className="flex items-center gap-2 border-b border-slate-200">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <Link
                key={tab.id}
                to={tab.path}
                className={`px-6 py-3 text-[11px] font-black uppercase tracking-[0.15em] transition-all relative ${
                  isActive
                    ? "text-blue-600"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* DYNAMIC CONTENT */}
        <main className="transition-all duration-300">
          {/* Outlet sẽ tự động render SingleAdd, FileImport... dựa trên URL */}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default KnowledgeManagement;
