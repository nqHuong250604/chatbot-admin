import React, { memo } from "react";
import Skeleton from "react-loading-skeleton";
import {
  MessageSquare,
  UserCheck,
  XCircle,
  Zap,
  HelpCircle,
  TrendingUp,
} from "lucide-react";

const StatCard = memo(
  ({ label, value, delta, type, description, deltaIcon, loading }) => {
    const themes = {
      success: {
        bar: "bg-emerald-500",
        text: "text-emerald-600",
        bgTag: "bg-emerald-50",
        mainIcon: <UserCheck size={14} />,
      },
      danger: {
        bar: "bg-rose-500",
        text: "text-rose-600",
        bgTag: "bg-rose-50",
        mainIcon: <XCircle size={14} />,
      },
      warning: {
        bar: "bg-amber-500",
        text: "text-amber-600",
        bgTag: "bg-amber-50",
        mainIcon: <Zap size={14} />,
      },
      default: {
        bar: "bg-blue-600",
        text: "text-blue-600",
        bgTag: "bg-blue-50",
        mainIcon: <MessageSquare size={14} />,
      },
    };

    const theme = themes[type] || themes.default;

    return (
      <div className="group relative bg-white p-5 rounded-lg border border-slate-100 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1 cursor-default min-h-[120px] flex flex-col justify-center">
        {/* Thanh màu bên trái - Chỉ hiện khi không loading */}
        {!loading && (
          <div
            className={`absolute left-0 top-5 bottom-5 w-1 rounded-r-sm ${theme.bar} opacity-90`}
          />
        )}

        <div className="flex flex-col space-y-3 pl-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {loading ? (
                <Skeleton circle width={16} height={16} />
              ) : (
                <span className={theme.text}>{theme.mainIcon}</span>
              )}

              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {loading ? <Skeleton width={80} /> : label}
              </p>
            </div>

            {/* TOOLTIP DESCRIPTION */}
            {!loading && (
              <div className="relative flex items-center group/tooltip">
                <HelpCircle
                  size={14}
                  className="text-slate-300 cursor-help hover:text-slate-500 transition-colors"
                />
                <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] font-medium rounded shadow-lg opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity z-[100] leading-relaxed">
                  {description || "Thông tin chi tiết về chỉ số này."}
                  <div className="absolute top-full right-1 border-4 border-transparent border-t-slate-800" />
                </div>
              </div>
            )}
          </div>

          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            {loading ? <Skeleton width={100} height={28} /> : value}
          </h2>

          {(delta || loading) && (
            <div className="flex items-center">
              {loading ? (
                <Skeleton width={60} height={16} borderRadius={6} />
              ) : (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1 w-fit ${theme.bgTag} ${theme.text}`}
                >
                  {deltaIcon || <TrendingUp size={12} />}
                  {delta}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
);

export default StatCard;
