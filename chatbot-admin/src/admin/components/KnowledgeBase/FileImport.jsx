import React, { useState } from "react";
import { Upload, HelpCircle, ChevronDown, FileUp } from "lucide-react";
import { kbService } from "../../services/kbService";
import { toast } from "react-hot-toast";

const FileImport = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return toast.error("Vui lòng chọn file!");
    setUploading(true);
    try {
      const res = await kbService.uploadFile(file);
      toast.success(res.data.message || "File đã được gửi sang n8n!");
      setFile(null);
    } catch {
      toast.error("Lỗi khi tải file lên hệ thống!");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-8 text-left animate-in fade-in">
      <div className="flex items-start gap-4">
        <div className="text-blue-600 flex-none mt-1">
          <FileUp size={24} />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Import dữ liệu hàng loạt
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium leading-relaxed ml-0">
            Hỗ trợ <span className="text-emerald-500 font-bold">CSV, XLSX</span>{" "}
            (có cột question/answer) hoặc{" "}
            <span className="text-blue-500 font-bold">TXT, DOCX</span> (cặp Q&A
            cách nhau dòng).
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
          Chọn file để upload{" "}
          <HelpCircle size={14} className="text-slate-300" />
        </label>
        <div
          className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-all cursor-pointer ${
            file
              ? "border-blue-400 bg-blue-50/30"
              : "border-slate-200 bg-slate-50/50 hover:bg-blue-50/30 hover:border-blue-300"
          }`}
          onClick={() => document.getElementById("file-input").click()}
        >
          <input
            id="file-input"
            type="file"
            hidden
            onChange={(e) => setFile(e.target.files[0])}
            accept=".txt,.docx,.csv,.xlsx"
          />
          <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-blue-500 mb-4">
            <Upload size={24} />
          </div>
          <p className="font-bold text-slate-700">
            {file ? file.name : "Kéo thả hoặc click để chọn file"}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 uppercase font-black tracking-tighter">
            Giới hạn 200MB • Tự động xử lý chunking
          </p>

          {file && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUpload();
              }}
              disabled={uploading}
              className="mt-6 px-10 py-3 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-100 active:scale-95 disabled:opacity-50 transition-all"
            >
              {uploading ? "Đang xử lý..." : "Bắt đầu Import ngay"}
            </button>
          )}
        </div>
      </div>

      <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
        <button className="w-full p-4 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors">
          <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">
            Xem quy định định dạng file
          </span>
          <ChevronDown size={16} className="text-slate-400" />
        </button>
      </div>
    </div>
  );
};

export default FileImport;
