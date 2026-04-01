import React from "react";
import { Calendar } from "lucide-react";

const TimeFilter = ({ activeTab, onTabChange, customDate, onDateChange }) => {
  const tabs = [
    { id: "all", label: "Tất cả" },
    { id: "today", label: "Hôm nay" },
    { id: "weekly", label: "Tuần" },
    { id: "monthly", label: "Tháng" },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-end gap-3">
      {/* Tabs nhanh */}
      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-1.5 text-[11px] font-black uppercase rounded-lg transition-all ${
              activeTab === tab.id && !customDate
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chọn ngày cụ thể */}
      <div className="relative group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
          <Calendar size={14} />
        </div>
        <input
          type="date"
          value={customDate || ""}
          onChange={(e) => onDateChange(e.target.value)}
          className={`pl-9 pr-3 py-1.5 text-[11px] font-black uppercase rounded-xl border transition-all outline-none h-[34px]
            ${
              customDate
                ? "border-blue-200 bg-blue-50/50 text-blue-600 ring-2 ring-blue-100"
                : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 focus:border-blue-400"
            }`}
        />
      </div>
    </div>
  );
};

export default TimeFilter;
