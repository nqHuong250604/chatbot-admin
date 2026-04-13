import React, { useState, memo } from "react";
import {
  ChevronDown,
  ChevronUp,
  Search,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import EmptyState from "./EmptyState";

const ChatSessionHistory = memo(({ sessions }) => {
  const [isOpen, setIsOpen] = useState(true);
  const sessionList = Array.isArray(sessions) ? sessions : sessions?.data || [];

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 font-sans">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <h3 className="font-bold flex items-center text-slate-800">
          <span className="w-1.5 h-6 bg-indigo-500 rounded-full mr-4 shadow-sm"></span>
          <div>
            <span className="block text-lg tracking-tight">
              Lịch sử phiên tương tác
            </span>
            <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              Chi tiết dữ liệu vận hành từ Agent
            </span>
          </div>
        </h3>

        <div className="flex gap-2">
          <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
            <Search size={16} />
          </button>
          <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
            <Download size={16} />
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors"
          >
            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="rounded-lg border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <div className="inline-block min-w-full align-middle">
              <div className="max-h-[450px] overflow-y-auto overflow-x-hidden custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-4 py-3">Mã phiên (ID)</th>
                      <th className="px-4 py-3 text-center">Thời gian tạo</th>
                      <th className="px-2 py-3 text-center">Tổng tin nhắn</th>
                      <th className="px-2 py-3 text-center">Thành công</th>
                      <th className="px-2 py-3 text-center">Bị từ chối</th>
                      <th className="px-2 py-3 text-center">Thời lượng</th>
                      <th className="px-4 py-3 text-right">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-[13px] bg-white">
                    {sessionList.length > 0 ? (
                      sessionList.map((s, idx) => {
                        const sId = s.session_id || "N/A";
                        const sTime = s.date_vn || new Date();
                        const sMessages = Number(s.n_human || 0);
                        const sRefused = Number(s.n_refused || 0);
                        const sAnswered = Math.max(0, sMessages - sRefused);
                        const sDuration = s.duration_min || "---";

                        return (
                          <tr
                            key={`${sId}-${idx}`}
                            className="hover:bg-indigo-50/30 transition-colors group cursor-default"
                          >
                            <td className="px-4 py-4 font-mono text-[11px] text-slate-400 truncate max-w-[120px]">
                              {sId.length > 12
                                ? `${sId.substring(0, 12)}...`
                                : sId}
                            </td>
                            <td className="px-4 py-4 text-center text-slate-600 font-medium">
                              <span className="text-[12px]">
                                {new Date(sTime).toLocaleDateString("vi-VN", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                })}
                              </span>
                            </td>
                            <td className="px-2 py-4 text-center font-bold text-slate-800">
                              {sMessages}
                            </td>
                            <td className="px-2 py-4 text-center font-bold text-emerald-600">
                              {sAnswered}
                            </td>
                            <td className="px-2 py-4 text-center font-bold text-red-500">
                              {sRefused}
                            </td>
                            <td className="px-2 py-4 text-center text-slate-500">
                              <div className="flex items-center justify-center gap-1 text-[11px]">
                                <Clock size={12} className="text-slate-300" />
                                {sDuration} phút
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right">
                              {sRefused > 0 ? (
                                <span className="inline-flex items-center gap-1 text-red-500 bg-red-50 px-2 py-0.5 rounded-full text-[10px] font-black border border-red-100/50">
                                  <XCircle size={12} /> CÓ LỖI/TỪ CHỐI
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-black border border-emerald-100/50">
                                  <CheckCircle2 size={12} /> HOÀN THÀNH
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="7" className="p-0">
                          <EmptyState
                            message="Chưa ghi nhận dữ liệu phiên chat nào"
                            className="h-[250px] w-full border-none"
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default ChatSessionHistory;
