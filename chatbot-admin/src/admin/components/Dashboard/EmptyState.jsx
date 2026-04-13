import React from "react";

const EmptyState = ({
  message = "Chưa có dữ liệu",
  className = "h-[300px]",
  icon,
}) => (
  <div
    className={`flex flex-col items-center justify-center w-full bg-slate-50/50 rounded-xl border border-dashed border-slate-200 ${className}`}
  >
    <div className="text-slate-300 mb-2">
      {icon || (
        <svg
          className="w-8 h-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      )}
    </div>
    <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest text-center px-4">
      {message}
    </p>
  </div>
);

export default EmptyState;
