import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

const AdminLayout = () => {
  // 1. Tạo state quản lý đóng/mở sidebar
  const [isOpen, setIsOpen] = useState(false);

  // 2. Hàm để toggle (đảo ngược trạng thái)
  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* 3. Truyền isOpen và toggleSidebar vào Sidebar */}
      <Sidebar
        isOpen={isOpen}
        toggleSidebar={toggleSidebar}
        className="flex-shrink-0"
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* 4. Truyền toggleSidebar vào Header (nếu Header có nút menu) */}
        <Header toggleSidebar={toggleSidebar} />

        <main className="flex-1 overflow-y-auto p-0 md:p-8 bg-[#f8fafc]">
          <div className="max-w-[1600px] mx-auto">
            {/* 5. Quan trọng: Truyền context để các trang con (như Dashboard) có thể dùng toggleSidebar */}
            <Outlet context={{ toggleSidebar }} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
