import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  Bell,
  Menu,
  User,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../components/Auth/AuthContext";

const Header = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Xử lý khi click ra ngoài thì đóng dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-8 shrink-0 z-40">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 bg-slate-100 rounded-lg text-slate-600"
        >
          <Menu size={20} />
        </button>
        <div className="hidden md:flex items-center gap-4 bg-slate-100/50 px-4 py-2.5 rounded-2xl w-80 border border-transparent focus-within:border-blue-200 transition-all">
          <Search size={18} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search analytics..."
            className="bg-transparent border-none outline-none text-sm w-full font-medium"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Thông báo */}
        {/* <div className="relative cursor-pointer text-slate-400 hover:text-blue-600 transition-colors">
          <Bell size={22} />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white">
            2
          </span>
        </div> */}

        {/* Cụm User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 border-l pl-6 border-slate-100 hover:opacity-80 transition-all outline-none"
          >
            <div className="text-right hidden sm:block cursor-pointer">
              <p className="text-sm font-bold text-slate-900 leading-none">
                {user?.full_name || "Admin"}
              </p>
              <p className="text-[11px] text-slate-400 font-bold uppercase mt-1 italic">
                {user?.department || "Trạng Nguyên"}
              </p>
            </div>
            <div className="relative">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || "Admin")}&background=6366f1&color=fff`}
                className="w-10 h-10 rounded-xl shadow-md border-2 border-white cursor-pointer"
                alt="Avatar"
              />
              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
            </div>
            <ChevronDown
              size={14}
              className={`text-slate-400 transition-transform cursor-pointer ${isDropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Menu sổ xuống */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in duration-200">
              <div className="px-4 py-3 border-b border-slate-50 mb-1">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                  Tài khoản
                </p>
                <p className="text-sm font-medium text-slate-600 truncate">
                  {user?.email || "admin@trangnguyen.edu.vn"}
                </p>
              </div>

              <DropdownItem icon={<User size={16} />} label="Hồ sơ của tôi" />
              <DropdownItem
                icon={<Settings size={16} />}
                label="Cài đặt hệ thống"
              />

              <div className="h-[1px] bg-slate-50 my-1"></div>

              <button
                onClick={logout}
                className="cursor-pointer w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-rose-500 hover:bg-rose-50 transition-colors"
              >
                <LogOut size={16} /> Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// Component con cho item trong dropdown
const DropdownItem = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-all cursor-pointer"
  >
    <span className="text-slate-400">{icon}</span>
    {label}
  </button>
);

export default Header;
