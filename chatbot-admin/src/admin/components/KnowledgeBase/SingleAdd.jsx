import React, { useState } from "react";
import { kbService } from "../../services/kbService";
import { toast } from "react-hot-toast";
import { Send, PlusCircle } from "lucide-react";

const SingleAdd = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    version: "v2",
    category: "",
    question: "",
    answer: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    // Validation cơ bản
    if (!formData.question.trim() || !formData.answer.trim()) {
      return toast.error("Vui lòng nhập đầy đủ câu hỏi và câu trả lời!");
    }

    if (!formData.category.trim()) {
      return toast.error("Vui lòng nhập chủ đề (category) để n8n phân loại!");
    }

    setLoading(true);
    try {
      const res = await kbService.addSingle(formData);

      // AxiosClient đã return data, nên res ở đây chính là object kết quả
      toast.success(res.message || "Đã gửi dữ liệu sang n8n xử lý!");

      // Reset form nhưng giữ lại Version và Category để nhập tiếp cho nhanh
      setFormData((prev) => ({
        ...prev,
        question: "",
        answer: "",
      }));
    } catch (error) {
      console.error("SingleAdd Error:", error);
      toast.error(
        error.response?.data?.message ||
          "Gửi dữ liệu thất bại, vui lòng thử lại!",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6 text-left animate-in fade-in">
      <div className="flex items-start gap-4">
        <div className="text-blue-600 flex-none mt-1">
          <PlusCircle size={24} />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Nhập tri thức đơn lẻ
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium leading-relaxed">
            Dữ liệu sẽ được gửi trực tiếp qua{" "}
            <span className="text-blue-600 font-bold">n8n</span> để cập nhật vào{" "}
            <span className="text-slate-700 font-bold">Vector Database</span>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
            Phiên bản (Metadata)
          </label>
          <select
            name="version"
            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
            value={formData.version}
            onChange={handleChange}
          >
            <option value="v2">v2 (Sản phẩm)</option>
            <option value="v5">v5 (Toán)</option>
            <option value="v6">v6 (Tiếng Việt)</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
            Chủ đề (Category)
          </label>
          <input
            name="category"
            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
            placeholder="Ví dụ: FAQ_Chinh_Sach"
            value={formData.category}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
          Câu hỏi (Question)
        </label>
        <textarea
          name="question"
          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl h-24 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
          placeholder="Nhập nội dung câu hỏi..."
          value={formData.question}
          onChange={handleChange}
        />
      </div>

      <div className="space-y-2">
        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
          Nội dung tri thức (Answer/Content)
        </label>
        <textarea
          name="answer"
          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl h-40 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
          placeholder="Nhập câu trả lời hoặc đoạn văn bản tri thức..."
          value={formData.answer}
          onChange={handleChange}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className={`w-full py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg ${
          loading
            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
            : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100 active:scale-[0.98]"
        }`}
      >
        <Send size={18} />
        {loading ? "Đang xử lý..." : "Gửi sang n8n xử lý"}
      </button>
    </div>
  );
};

export default SingleAdd;
