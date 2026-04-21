import React, { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Trash2,
  Minus,
  Plus,
  Search,
  Database,
  AlertCircle,
} from "lucide-react";
import { kbService } from "../../services/kbService";
import { toast } from "react-hot-toast";

const KBList = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterVersion, setFilterVersion] = useState("Tất cả");
  const [deleteId, setDeleteId] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        version: filterVersion === "Tất cả" ? null : filterVersion,
        limit: 100,
      };
      const res = await kbService.getList(params);
      setData(res.data || []);
    } catch {
      toast.error("Lỗi tải dữ liệu!");
    } finally {
      setLoading(false);
    }
  }, [filterVersion]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id, version) => {
    const targetId = id || deleteId;
    if (!targetId) return toast.error("Vui lòng nhập hoặc chọn ID!");

    // Nếu không truyền version từ hàng (ví dụ dùng ô nhập nhanh), lấy từ bộ lọc hiện tại
    const targetVersion = version || (filterVersion === "Tất cả" ? "v2" : filterVersion);

    if (
      !window.confirm(
        `Hành động này không thể hoàn tác. Xóa bản ghi #${targetId} (${targetVersion})?`,
      )
    )
      return;

    try {
      const res = await kbService.delete(targetId, targetVersion);
      toast.success(res.message || "Đã xóa bản ghi thành công");
      if (!id) setDeleteId("");
      fetchData();
    } catch {
      toast.error("Xóa thất bại!");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-left">
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden">
        {/* HEADER */}
        <div className="p-6 md:p-8 border-b border-slate-100 bg-slate-50/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="text-blue-600 flex-none mt-1">
              <Database size={24} />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Cơ sở tri thức hiện có
              </h2>
              <p className="text-slate-500 text-sm mt-1 font-medium leading-relaxed">
                Danh sách các{" "}
                <span className="text-blue-600 font-bold">vector</span> đã lưu
                trữ trong hệ thống.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 text-sm focus:ring-4 focus:ring-blue-500/10 outline-none cursor-pointer shadow-sm"
                value={filterVersion}
                onChange={(e) => setFilterVersion(e.target.value)}
              >
                <option value="Tất cả">Tất cả phiên bản</option>
                <option value="v2">v2 (Product)</option>
                <option value="v5">v5 (Toán)</option>
                <option value="v6">v6 (Tiếng Việt)</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <Search size={14} />
              </div>
            </div>
            <button
              onClick={fetchData}
              className="p-2.5 bg-white border border-slate-200 rounded-xl hover:text-blue-600 transition-all shadow-sm"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* TABLE AREA VỚI SCROLL */}
        <div className="relative overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                  ID
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                  Phiên bản
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                  Nội dung
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 text-right">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.length > 0 ? (
                data.map((item) => (
                  <tr
                    key={item.id}
                    className="group hover:bg-blue-50/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-400">
                      #{item.id}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase border border-blue-100">
                        {item.version || "v2"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-sm max-w-[500px]">
                      <div className="line-clamp-2 group-hover:text-slate-900 transition-colors font-medium">
                        {item.content}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(item.id, item.version)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="4"
                    className="py-20 text-center text-slate-400 italic"
                  >
                    Không có dữ liệu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK DELETE */}
      {/* <div className="bg-white p-8 rounded-3xl border border-red-100 shadow-xl shadow-red-500/5 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
            <AlertCircle size={24} />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900">Xóa nhanh bản ghi</h3>
            <p className="text-sm text-slate-500 font-medium">
              Nhập ID để xóa trực tiếp
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center bg-slate-50 border rounded-2xl p-1 shadow-inner">
            <button
              onClick={() =>
                setDeleteId((prev) => Math.max(0, Number(prev) - 1))
              }
              className="p-2.5 text-slate-400 cursor-pointer"
            >
              <Minus size={16} />
            </button>
            <input
              type="number"
              value={deleteId}
              onChange={(e) => setDeleteId(e.target.value)}
              className="w-20 bg-transparent text-center font-black text-slate-800 outline-none"
              placeholder="ID"
            />
            <button
              onClick={() => setDeleteId((prev) => Number(prev) + 1)}
              className="p-2.5 text-slate-400 cursor-pointer"
            >
              <Plus size={16} />
            </button>
          </div>
          <button
            onClick={() => handleDelete()}
            className="px-8 py-3.5 bg-red-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-500/20 transition-all cursor-pointer"
          >
            Xác nhận xóa
          </button>
        </div>
      </div> */}
    </div>
  );
};

export default KBList;
