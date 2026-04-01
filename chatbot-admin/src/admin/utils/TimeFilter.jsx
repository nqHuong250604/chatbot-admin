import React, { useRef } from "react";
import { Calendar, ArrowRight, ChevronDown } from "lucide-react";

const TimeFilter = ({
  filterMode,
  setFilterMode,
  selectedMonth,
  setSelectedMonth,
  range,
  setRange,
}) => {
  const monthInputRef = useRef(null);
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);

  const formatDisplayMonth = (value) => {
    if (!value) return "Chọn tháng";
    const [year, month] = value.split("-");
    return `Tháng ${month}/${year}`;
  };

  const formatDateShort = (dateStr) => {
    if (!dateStr) return "";
    const [, m, d] = dateStr.split("-");
    return `${d}/${m}`;
  };

  const triggerPicker = (ref) => {
    if (ref.current && ref.current.showPicker) {
      ref.current.showPicker();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm">
      {/* 1. Lọc Nhanh (Tất cả / Hôm nay) */}
      <div className="flex bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/50">
        {["all", "today"].map((mode) => (
          <button
            key={mode}
            onClick={() => {
              setFilterMode(mode);
              setRange({ start: "", end: "" }); // Reset range khi chọn nhanh
            }}
            className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase transition-all duration-200 cursor-pointer ${
              filterMode === mode
                ? "bg-white shadow-sm text-blue-600 ring-1 ring-slate-200"
                : "text-slate-500 hover:text-blue-500"
            }`}
          >
            {mode === "all" ? "Tất cả" : "Hôm nay"}
          </button>
        ))}
      </div>

      <div className="h-6 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

      {/* 2. Lọc theo Tháng */}
      <div
        onClick={() => triggerPicker(monthInputRef)}
        className={`group relative flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all duration-200 cursor-pointer ${
          filterMode === "month"
            ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-100"
            : "border-slate-200 bg-slate-50/30 hover:border-blue-300 hover:bg-white"
        }`}
      >
        <div className="flex flex-col min-w-[80px] pointer-events-none">
          <span className="text-[9px] font-black text-slate-400 uppercase leading-none mb-0.5">
            Tháng
          </span>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-bold text-slate-700">
              {filterMode === "month"
                ? formatDisplayMonth(selectedMonth)
                : "Chọn tháng"}
            </span>
            <ChevronDown
              size={14}
              className="text-slate-400 group-hover:text-blue-500"
            />
          </div>
        </div>
        <input
          ref={monthInputRef}
          type="month"
          value={selectedMonth || ""}
          className="absolute w-0 h-0 opacity-0 pointer-events-none"
          onChange={(e) => {
            setSelectedMonth(e.target.value);
            setFilterMode("month");
            setRange({ start: "", end: "" }); // Reset range
          }}
        />
      </div>

      {/* 3. Gộp Logic: Lọc Ngày Duy Nhất HOẶC Theo Khoảng */}
      <div
        className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all duration-200 ${
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
          {/* Ngày Bắt Đầu (Nếu chỉ chọn cái này -> Lọc theo 1 ngày) */}
          <div
            onClick={() => triggerPicker(startDateRef)}
            className="px-2 py-1 rounded-md hover:bg-blue-100/50 transition-colors cursor-pointer group/date"
          >
            <span
              className={`text-[11px] font-bold ${range.start ? "text-slate-700" : "text-slate-400"}`}
            >
              {range.start ? formatDateShort(range.start) : "Chọn ngày"}
            </span>
            <input
              ref={startDateRef}
              type="date"
              value={range.start || ""}
              className="absolute w-0 h-0 opacity-0 pointer-events-none"
              onChange={(e) => {
                const newStart = e.target.value;
                setRange((prev) => ({ ...prev, start: newStart }));
                setFilterMode("range"); // Chuyển sang mode range ngay khi chọn ngày
              }}
            />
          </div>

          <ArrowRight
            size={14}
            className={`${range.start && range.end ? "text-blue-400" : "text-slate-300"}`}
          />

          {/* Ngày Kết Thúc */}
          <div
            onClick={() => triggerPicker(endDateRef)}
            className="px-2 py-1 rounded-md hover:bg-blue-100/50 transition-colors cursor-pointer"
          >
            <span
              className={`text-[11px] font-bold ${range.end ? "text-slate-700" : "text-slate-400"}`}
            >
              {range.end ? formatDateShort(range.end) : "Đến ngày"}
            </span>
            <input
              ref={endDateRef}
              type="date"
              value={range.end || ""}
              className="absolute w-0 h-0 opacity-0 pointer-events-none"
              onChange={(e) => {
                const newEnd = e.target.value;
                setRange((prev) => ({ ...prev, end: newEnd }));
                if (range.start) setFilterMode("range");
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeFilter;
