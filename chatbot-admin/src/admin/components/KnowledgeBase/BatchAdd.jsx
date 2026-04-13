import React, { useState } from "react";
import { kbService } from "../../services/kbService";
import { toast } from "react-hot-toast";
import { Send, PlusCircle, Trash2, ListPlus } from "lucide-react";

const BatchAdd = () => {
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState("v2");
  const [department, setDepartment] = useState("");
  const [items, setItems] = useState([{ question: "", answer: "" }]);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([...items, { question: "", answer: "" }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) return;
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (items.some((item) => !item.question.trim() || !item.answer.trim())) {
      return toast.error(
        "Vui lòng nhập đầy đủ câu hỏi và câu trả lời ở tất cả các mục!",
      );
    }

    setLoading(true);
    try {
      const payload = {
        version,
        department,
        items,
      };
      const res = await kbService.addBatch(payload);
      toast.success(res.message || "Đã gửi dữ liệu hàng loạt sang n8n!");
      setItems([{ question: "", answer: "" }]);
      setDepartment("");
    } catch (error) {
      console.error("BatchAdd Error:", error);
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
          <ListPlus size={24} />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Nhập hàng loạt Q&A
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-medium leading-relaxed">
            Thêm nhiều cặp câu hỏi - câu trả lời và gửi đi xử lý trong một lần.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-100">
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-1">
            Phiên bản (Bắt buộc)
          </label>
          <select
            className="w-full p-3.5 bg-white border border-slate-200 rounded-xl outline-none font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
          >
            <option value="v2">v2 (Sản phẩm)</option>
            <option value="v5">v5 (Toán)</option>
            <option value="v6">v6 (Tiếng Việt)</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest block mb-1">
            Phòng ban (Tuỳ chọn)
          </label>
          <input
            className="w-full p-3.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            placeholder="Ví dụ: Kinh doanh"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-6 mt-4">
        {items.map((item, index) => (
          <div
            key={index}
            className="p-5 bg-white border border-slate-200 rounded-xl relative space-y-4 shadow-sm hover:border-blue-200 transition-all group"
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">
                  {index + 1}
                </span>
                Cặp Q&A
              </h4>
              {items.length > 1 && (
                <button
                  onClick={() => handleRemoveItem(index)}
                  className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors opacity-50 group-hover:opacity-100"
                  title="Xoá"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Câu hỏi
                </label>
                <textarea
                  className="w-full p-3 bg-slate-50 border border-transparent rounded-lg h-28 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none text-sm text-slate-700 font-medium"
                  placeholder="Nhập nội dung câu hỏi..."
                  value={item.question}
                  onChange={(e) =>
                    handleItemChange(index, "question", e.target.value)
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Câu trả lời
                </label>
                <textarea
                  className="w-full p-3 bg-slate-50 border border-transparent rounded-lg h-28 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none text-sm text-slate-700 font-medium"
                  placeholder="Nhập nội dung câu trả lời..."
                  value={item.answer}
                  onChange={(e) =>
                    handleItemChange(index, "answer", e.target.value)
                  }
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleAddItem}
        className="w-full py-4 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all mt-6 text-[11px]"
      >
        <PlusCircle size={18} /> Thêm câu hỏi
      </button>

      <div className="pt-4">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`w-full py-4 rounded-xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-100 ${
            loading
              ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
              : "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.99]"
          }`}
        >
          <Send size={18} />
          {loading ? "Đang xử lý..." : `Gửi ${items.length} cặp Q&A sang n8n`}
        </button>
      </div>
    </div>
  );
};

export default BatchAdd;
