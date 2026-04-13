import React, { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Settings,
  LogOut,
  X,
  Menu,
  MessageSquare,
  History,
  Database,
} from "lucide-react";
import logo from "../../assets/logo.svg";

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  // Theo dõi kích thước màn hình để quyết định xem có ẩn chữ hay không
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // CHỈ ẩn chữ khi: Đang ở Desktop VÀ đang chọn Thu nhỏ
  const shouldHideText = isCollapsed && isDesktop;

  const baseStyle =
    "flex items-center w-full gap-4 px-4 py-3.5 transition-all duration-300 font-bold text-sm rounded-2xl mb-1 whitespace-nowrap overflow-hidden";

  const activeStyle = ({ isActive }) =>
    isActive
      ? `${baseStyle} bg-blue-600 text-white shadow-lg shadow-blue-900/40`
      : `${baseStyle} text-slate-400 hover:text-black hover:bg-slate-50`;

  const handleToggleAction = () => {
    if (!isDesktop) toggleSidebar();
    else setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      {/* 1. LỚP NỀN MỜ CHO MOBILE */}
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[90] lg:hidden transition-all duration-300 ease-in-out ${
          isOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={toggleSidebar}
      />

      {/* 2. SIDEBAR CHÍNH */}
      <aside
        className={`fixed inset-y-0 left-0 z-[100] bg-white 
          transition-all duration-300 ease-in-out
          ${isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full shadow-none"} 
          ${shouldHideText ? "lg:w-20" : "lg:w-[280px]"} 
          lg:relative lg:translate-x-0 shrink-0 flex flex-col`}
      >
        {/* HEADER */}
        <div className="p-4 flex flex-col items-center shrink-0 relative min-h-[180px] transition-all duration-300">
          {(!shouldHideText || !isDesktop) && (
            <button
              onClick={handleToggleAction}
              className="absolute top-2 right-2 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all duration-300 cursor-pointer"
            >
              <X size={20} />
            </button>
          )}

          {/* LOGO */}
          <div
            className={`transition-all duration-300 ease-in-out flex items-center justify-center mb-4
              ${shouldHideText ? "w-12 h-12 mt-4" : "w-16 h-16 mt-6"}`}
          >
            <img
              src={logo}
              alt="logo"
              className="w-full h-full object-contain drop-shadow-sm"
            />
          </div>

          {/* NÚT MENU */}
          {shouldHideText && (
            <button
              onClick={handleToggleAction}
              className="p-3 text-slate-500 hover:bg-slate-100 rounded-2xl transition-all animate-in fade-in slide-in-from-bottom-2 duration-300 shrink-0 cursor-pointer"
            >
              <Menu size={28} />
            </button>
          )}
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 px-4 overflow-y-auto no-scrollbar overflow-x-hidden">
          <div className="space-y-1">
            <NavLink
              to="/admin/dashboard"
              className={activeStyle}
              onClick={() => !isDesktop && toggleSidebar()}
            >
              <LayoutDashboard size={22} className="shrink-0" />
              <span
                className={`transition-all duration-300 ${shouldHideText ? "opacity-0 invisible w-0" : "opacity-100 visible"}`}
              >
                Dashboard
              </span>
            </NavLink>
            <NavLink
              to="/admin/knowledge-base"
              className={activeStyle}
              onClick={() => !isDesktop && toggleSidebar()}
            >
              <Database size={22} className="shrink-0" />
              <span
                className={`transition-all duration-300 ${shouldHideText ? "opacity-0 invisible w-0" : "opacity-100 visible"}`}
              >
                Nhập liệu tri thức
              </span>
            </NavLink>
          </div>

          <hr className="my-4 border-slate-100 mx-2" />
          {/* 
          <p
            className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-4 transition-all duration-300 
            ${shouldHideText ? "opacity-0 invisible h-0" : "opacity-100 visible h-auto"}`}
          >
            Dịch vụ
          </p> */}

          {/* <div className="space-y-1">
            <NavLink
              to="/admin/history"
              className={activeStyle}
              onClick={() => !isDesktop && toggleSidebar()}
            >
              <History size={22} className="shrink-0" />
              <span
                className={`transition-all duration-300 ${shouldHideText ? "opacity-0 invisible w-0" : "opacity-100 visible"}`}
              >
                Lịch sử phiên
              </span>
            </NavLink>
            <NavLink
              to="/admin/qa"
              className={activeStyle}
              onClick={() => !isDesktop && toggleSidebar()}
            >
              <MessageSquare size={22} className="shrink-0" />
              <span
                className={`transition-all duration-300 ${shouldHideText ? "opacity-0 invisible w-0" : "opacity-100 visible"}`}
              >
                Hỏi đáp AI
              </span>
            </NavLink>
          </div> */}

          <hr className="my-4 border-slate-100 mx-2" />

          <div className="space-y-1 pb-6">
            <NavLink
              to="/admin/settings"
              className={activeStyle}
              onClick={() => !isDesktop && toggleSidebar()}
            >
              <Settings size={22} className="shrink-0" />
              <span
                className={`transition-all duration-300 ${shouldHideText ? "opacity-0 invisible w-0" : "opacity-100 visible"}`}
              >
                Cài đặt
              </span>
            </NavLink>

            <button
              onClick={() => console.log("Logout...")}
              className={`${baseStyle} text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer w-full`}
            >
              <LogOut size={22} className="shrink-0" />
              <span
                className={`transition-all duration-300 ${shouldHideText ? "opacity-0 invisible w-0" : "opacity-100 visible"}`}
              >
                Đăng xuất
              </span>
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
