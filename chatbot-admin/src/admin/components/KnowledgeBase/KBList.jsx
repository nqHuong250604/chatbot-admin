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
  const [filterVersion, setFilterVersion] = useState("v2");
  const [deleteId, setDeleteId] = useState("");

  const [expandedId, setExpandedId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        version: filterVersion,
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

    const targetVersion = version || filterVersion;

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

  const toggleExpand = (id) => {
    setExpandedId((prevId) => (prevId === id ? null : id));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-left h-full">
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
              className="p-2.5 bg-white border border-slate-200 rounded-xl hover:text-blue-600 transition-all shadow-sm cursor-pointer"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* TABLE AREA - Đã thêm các class ẩn scrollbar */}
        <div className="relative overflow-y-auto max-h-[calc(100vh-200px)] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-400 align-top">
                      #{item.id}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase border border-blue-100">
                        {item.version || "v2"}
                      </span>
                    </td>

                    <td
                      className="px-6 py-4 text-slate-600 text-sm max-w-[500px] cursor-pointer align-top"
                      onClick={() => toggleExpand(item.id)}
                      title={item.content}
                    >
                      <div
                        className={`group-hover:text-slate-900 transition-all font-medium ${expandedId === item.id ? "whitespace-pre-wrap" : "line-clamp-2"
                          }`}
                      >
                        {item.content}
                      </div>
                      {expandedId !== item.id && item.content?.length > 100 && (
                        <span className="text-[10px] text-blue-500/70 mt-1 inline-block">
                          (Click để xem chi tiết)
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right align-top">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id, item.version);
                        }}
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
    </div>
  );
};

export default KBList;