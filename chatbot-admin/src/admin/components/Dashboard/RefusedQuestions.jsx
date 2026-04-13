import React, { memo } from "react";
import {
  Calendar,
  Wrench,
  AlertCircle,
  MessageSquare,
  Copy,
  CheckCircle2,
} from "lucide-react";
import EmptyState from "./EmptyState";

const RefusedQuestions = memo(({ questions = [] }) => {
  const today = new Date().toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      {/* Header UI của bạn */}
      <div className="flex justify-between items-start mb-6">
        <h3 className="font-bold flex items-center text-slate-800">
          <span className="w-1.5 h-6 bg-red-500 rounded-full mr-4 shadow-sm"></span>
          <div>
            <span className="block text-lg">Câu hỏi cần bổ sung dữ liệu</span>
            <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              Danh sách Chatbot từ chối trả lời
            </span>
          </div>
        </h3>
        <div className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
          {questions?.length || 0} yêu cầu
        </div>
      </div>

      {questions.length === 0 ? (
        <EmptyState message="Không có câu hỏi nào bị từ chối" className="h-[250px] mt-4" />
      ) : (
        <div className="rounded-lg border border-slate-50 overflow-hidden">
          <div className="grid grid-cols-12 bg-slate-50/50 border-b border-slate-100 px-4 py-3">
            <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Calendar size={12} /> Ngày
            </div>
            <div className="col-span-6 text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare size={12} /> Câu hỏi
            </div>
            <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">
              Công cụ
            </div>
            <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">
              Trạng thái
            </div>
          </div>

          <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
            {questions.map((item, idx) => {
              const qText = typeof item === "string" ? item : item.question;
              const qDate = item.date || today;
              return (
                <div
                  key={idx}
                  className="grid grid-cols-12 px-4 py-4 items-center hover:bg-slate-50/50 transition-colors group"
                >
                  <div className="col-span-2 text-xs text-slate-400 font-medium">
                    {qDate}
                  </div>
                  <div className="col-span-6 pr-6 text-sm font-semibold text-slate-700 line-clamp-2">
                    {qText}
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                      {item.tool || "n8n_agent"}
                    </span>
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <span className="text-red-500 bg-red-50 px-2 py-1 rounded-full text-[10px] font-black border border-red-100/50 uppercase">
                      BỊ TỪ CHỐI
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

export default RefusedQuestions;
