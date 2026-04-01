import React from "react";
import { Calendar, ArrowRight, ChevronDown, Clock } from "lucide-react";

const TimeFilter = ({
  filterMode,
  setFilterMode,
  selectedMonth,
  setSelectedMonth,
  range,
  setRange,
}) => {
  const formatDisplayMonth = (value) => {
    if (!value) return "Chọn tháng";
    const [year, month] = value.split("-");
    return `Tháng ${month}/${year}`;
  };

  return (
    <div className="flex flex-wrap items-center gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm">
      {/* Tab Lọc Nhanh */}
      <div className="flex bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/50">
        <button
          onClick={() => {
            setFilterMode("all");
          }}
          className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase transition-all ${
            filterMode === "all"
              ? "bg-white shadow-sm text-blue-600"
              : "text-slate-500"
          }`}
        >
          {" "}
          Tất cả{" "}
        </button>
        <button
          onClick={() => {
            setFilterMode("today");
          }}
          className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase transition-all ${
            filterMode === "today"
              ? "bg-white shadow-sm text-blue-600"
              : "text-slate-500"
          }`}
        >
          {" "}
          Hôm nay{" "}
        </button>
      </div>

      {/* Lọc Tháng */}
      <div
        className={`group relative flex items-center gap-2.5 px-4 py-2 rounded-xl border transition-all ${
          filterMode === "month"
            ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-100"
            : "border-slate-200 bg-slate-50/30"
        }`}
      >
        <div className="flex flex-col min-w-[90px]">
          <span className="text-[9px] font-black text-slate-400 uppercase mb-0.5">
            Thời gian
          </span>
          <div className="relative">
            <input
              type="month"
              value={filterMode === "month" ? selectedMonth : ""}
              className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full"
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setFilterMode("month");
              }}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-bold text-slate-700">
                {filterMode === "month"
                  ? formatDisplayMonth(selectedMonth)
                  : "Chọn tháng"}
              </span>
              <ChevronDown size={14} className="text-slate-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Khoảng ngày */}
      <div
        className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all ${
          filterMode === "range"
            ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-100"
            : "border-slate-200 bg-slate-50/30"
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
            value={range.start}
            className="bg-transparent outline-none text-[11px] font-bold text-slate-700"
            onChange={(e) => {
              setRange((prev) => ({ ...prev, start: e.target.value }));
              if (range.end) setFilterMode("range");
            }}
          />
          <ArrowRight size={14} className="text-slate-300" />
          <input
            type="date"
            value={range.end}
            className="bg-transparent outline-none text-[11px] font-bold text-slate-700"
            onChange={(e) => {
              setRange((prev) => ({ ...prev, end: e.target.value }));
              if (range.start) setFilterMode("range");
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default TimeFilter;
