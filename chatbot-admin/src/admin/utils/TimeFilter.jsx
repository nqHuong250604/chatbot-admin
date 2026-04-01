import React, { useRef } from "react";
import { Calendar, ArrowRight, ChevronDown, Clock } from "lucide-react";

const TimeFilter = ({
  filterMode,
  setFilterMode,
  selectedMonth,
  setSelectedMonth,
  range,
  setRange,
}) => {
  // Ref để điều khiển việc mở lịch chọn tháng
  const monthInputRef = useRef(null);

  // Format hiển thị: "2026-03" -> "Tháng 03/2026"
  const formatDisplayMonth = (value) => {
    if (!value) return "Chọn tháng";
    const [year, month] = value.split("-");
    return `Tháng ${month}/${year}`;
  };

  // Mở trình chọn tháng của hệ thống khi click vào bất kỳ đâu trong box
  const handleMonthClick = () => {
    if (monthInputRef.current) {
      monthInputRef.current.showPicker();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm">
      {/* 1. Nhóm Lọc Nhanh */}
      <div className="flex bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/50">
        {[
          { id: "all", label: "Tất cả", icon: Clock },
          { id: "today", label: "Hôm nay", icon: null },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setFilterMode(item.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-bold uppercase transition-all cursor-pointer ${
              filterMode === item.id
                ? "bg-white shadow-sm text-blue-600 ring-1 ring-slate-200"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {item.icon && <item.icon size={14} />}
            {item.label}
          </button>
        ))}
      </div>

      <div className="h-6 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

      {/* 2. Lọc theo Tháng - Đã fix lỗi Click và Con trỏ */}
      <div
        onClick={handleMonthClick}
        className={`group relative flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all cursor-pointer ${
          filterMode === "month"
            ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-100"
            : "border-slate-200 bg-slate-50/30 hover:border-slate-300"
        }`}
      >
        <div className="flex flex-col min-w-[90px] pointer-events-none">
          <span className="text-[9px] font-black text-slate-400 uppercase leading-none mb-0.5">
            Thời gian
          </span>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-bold text-slate-700">
              {filterMode === "month"
                ? formatDisplayMonth(selectedMonth)
                : "Chọn tháng"}
            </span>
            <ChevronDown
              size={14}
              className="text-slate-400 group-hover:text-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Input ẩn hoàn toàn nhưng vẫn hoạt động qua Ref */}
        <input
          ref={monthInputRef}
          type="month"
          value={selectedMonth || ""}
          className="absolute inset-0 w-0 h-0 opacity-0 pointer-events-none"
          onChange={(e) => {
            setSelectedMonth(e.target.value);
            setFilterMode("month");
          }}
        />
      </div>

      {/* 3. Lọc khoảng ngày */}
      <div
        className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all ${
          filterMode === "range"
            ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-100"
            : "border-slate-200 bg-slate-50/30 hover:border-slate-300"
        }`}
      >
        <Calendar
          size={15}
          className={
            filterMode === "range" ? "text-blue-500" : "text-slate-400"
          }
        />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={range.start || ""}
            className="bg-transparent border-none outline-none text-[11px] font-bold text-slate-700 cursor-pointer focus:text-blue-600"
            onChange={(e) => {
              setRange((prev) => ({ ...prev, start: e.target.value }));
              if (range.end || e.target.value) setFilterMode("range");
            }}
          />
          <ArrowRight size={14} className="text-slate-300" />
          <input
            type="date"
            value={range.end || ""}
            className="bg-transparent border-none outline-none text-[11px] font-bold text-slate-700 cursor-pointer focus:text-blue-600"
            onChange={(e) => {
              setRange((prev) => ({ ...prev, end: e.target.value }));
              if (range.start || e.target.value) setFilterMode("range");
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default TimeFilter;
