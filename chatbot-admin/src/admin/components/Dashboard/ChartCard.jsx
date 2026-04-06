import React from "react";

const ChartCard = ({
  title,
  children,
  iconColor,
  className = "",
  subtitle = "",
}) => (
  <div
    className={`bg-white p-6 rounded-xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 ${className}`}
  >
    <div className="flex justify-between items-start mb-6">
      <h3 className="font-bold flex items-center text-slate-800">
        <span
          className={`w-1.5 h-6 ${iconColor} rounded-full mr-4 shadow-sm`}
        ></span>
        <div>
          <span className="block text-lg tracking-tight">{title}</span>
          {subtitle && (
            <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              {subtitle}
            </span>
          )}
        </div>
      </h3>
    </div>
    <div className="h-80 w-full">{children}</div>
  </div>
);

export default ChartCard;
