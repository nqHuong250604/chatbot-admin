import React, { useState } from "react";
import {
  Terminal,
  Copy,
  Check,
  ExternalLink,
  Cpu,
  Database,
  Share2,
  Info,
} from "lucide-react";
import { toast } from "react-hot-toast";

const N8nGuide = () => {
  const [copied, setCopied] = useState(false);

  const webhookUrl =
    "https://tne-ai.trangnguyen.edu.vn/webhook/nhap-lieu-du-lieu-tu-thong-ke";
  const codeSnippet = `N8N_WEBHOOK_URL="${webhookUrl}"\nKB_TABLE_NAME="documents"`;

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    toast.success("Đã sao chép cấu hình!");
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    {
      step: 1,
      text: "Trong n8n, tạo workflow mới và thêm node",
      badge: "Webhook",
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      step: 2,
      text: "Thiết lập Method là POST, sau đó copy",
      badge: "Production URL",
      color: "bg-blue-50 text-blue-600",
      extra: "để kết nối.",
    },
    {
      step: 3,
      text: "Dán URL vào file cấu hình hệ thống",
      code: ".env",
      color: "bg-amber-50 text-amber-600",
    },
  ];

  const processingNodes = [
    { icon: <Cpu size={14} />, text: "Code/Set: Đọc version & metadata" },
    { icon: <Share2 size={14} />, text: "Node: Text Splitter (Chunking)" },
    { icon: <Database size={14} />, text: "Node: Vector Store (Supabase)" },
  ];

  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/20 space-y-8 text-left animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-start justify-between w-full">
        <div className="flex items-start gap-4">
          <div className="text-blue-600 flex-none mt-1">
            <Terminal size={24} />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Hướng dẫn kết nối n8n
            </h2>
            <p className="text-slate-500 text-sm mt-1 font-medium leading-relaxed">
              Quy trình xử lý dữ liệu tự động (ETL Pipeline)
            </p>
          </div>
        </div>

        <a
          href="https://n8n.io"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors pt-2"
        >
          Tài liệu n8n <ExternalLink size={12} />
        </a>
      </div>

      {/* Các bước thực hiện */}
      <div className="space-y-6">
        {steps.map((item, idx) => (
          <div key={idx} className="flex gap-4 items-start group">
            <span className="flex-none w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-black group-hover:bg-blue-600 group-hover:text-white transition-all">
              {item.step}
            </span>
            <div className="pt-0.5">
              <p className="text-slate-600 font-bold text-sm leading-relaxed">
                {item.text}
                <span
                  className={`${item.color} px-2 py-0.5 rounded text-[10px] font-black uppercase mx-1.5 border border-current opacity-80`}
                >
                  {item.badge}
                </span>
                {item.extra}
                {item.code && (
                  <code className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded mx-1 text-xs font-mono">
                    {item.code}
                  </code>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Code Block */}
      <div className="relative group">
        <div className="absolute -top-3 left-6 px-3 py-1 bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-full z-10 border border-slate-700">
          Environment Config
        </div>
        <pre className="bg-slate-900 text-emerald-400 p-8 rounded-3xl font-mono text-sm leading-relaxed shadow-2xl overflow-x-auto border border-slate-800">
          <code className="block whitespace-pre-wrap">{codeSnippet}</code>
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-6 right-6 p-2.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all"
        >
          {copied ? (
            <Check size={18} className="text-emerald-400" />
          ) : (
            <Copy size={18} />
          )}
        </button>
      </div>

      {/* Luồng xử lý */}
      <div className="space-y-4 pt-4">
        <div className="text-slate-900 text-sm font-black uppercase tracking-widest flex items-center gap-2">
          <div className="w-1 h-4 bg-emerald-500 rounded-full" />
          4. Sau Webhook, hãy thêm các Node:
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {processingNodes.map((node, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-blue-200 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-white text-blue-500 flex items-center justify-center shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                {node.icon}
              </div>
              <span className="text-[11px] font-bold text-slate-500 group-hover:text-slate-900">
                {node.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="flex gap-3 p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
        <Info className="text-amber-500 flex-none" size={18} />
        <p className="text-[12px] text-amber-700 font-medium leading-relaxed">
          <b>Mẹo:</b> Luôn sử dụng <b>Production URL</b> để đảm bảo webhook hoạt
          động ổn định khi bạn không mở tab n8n.
        </p>
      </div>
    </div>
  );
};

export default N8nGuide;
