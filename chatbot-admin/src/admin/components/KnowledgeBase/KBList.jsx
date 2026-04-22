import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  RefreshCw,
  Trash2,
  Database,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { kbService } from "../../services/kbService";
import { toast } from "react-hot-toast";

const KBList = () => {
  // --- States ---
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterVersion, setFilterVersion] = useState("v2");
  const [deleteId, setDeleteId] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  // Logic Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // --- Fetch Data ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        version: filterVersion,
        limit: 1000, // Lấy tập dữ liệu đủ lớn để phân trang tại client
      };
      const res = await kbService.getList(params);
      setData(res.data || []);
      setCurrentPage(1); // Reset về trang 1 khi đổi filter hoặc tải lại
    } catch {
      toast.error("Lỗi tải dữ liệu!");
    } finally {
      setLoading(false);
    }
  }, [filterVersion]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Logic Phân Trang Thông Minh ---
  const totalPages = Math.ceil(data.length / pageSize);

  const currentTableData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return data.slice(startIndex, startIndex + pageSize);
  }, [currentPage, data]);

  const getPaginationGroup = () => {
    const pages = [];
    const showMax = 3; // Số lượng trang hiển thị quanh trang hiện tại

    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Luôn hiện trang đầu
    pages.push(1);

    let start = Math.max(currentPage - 1, 2);
    let end = Math.min(currentPage + 1, totalPages - 1);

    if (currentPage <= 2) end = 4;
    if (currentPage >= totalPages - 1) start = totalPages - 3;

    if (start > 2) pages.push("...");

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages - 1) pages.push("...");

    // Luôn hiện trang cuối
    pages.push(totalPages);

    return pages;
  };

  // --- Handlers ---
  const handleDelete = async (id, version) => {
    const targetId = id || deleteId;
    if (!targetId) return toast.error("Vui lòng nhập hoặc chọn ID!");
    const targetVersion = version || filterVersion;

    if (!window.confirm(`Hành động này không thể hoàn tác. Xóa bản ghi #${targetId} (${targetVersion})?`))
      return;

    try {
      const res = await kbService.delete(targetId, targetVersion);
      toast.success(res.message || "Đã xóa bản ghi thành công");
      fetchData();
    } catch {
      toast.error("Xóa thất bại!");
    }
  };

  const toggleExpand = (id) => {
    setExpandedId((prevId) => (prevId === id ? null : id));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-left">
      <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden">

        {/* HEADER - GIỮ NGUYÊN STYLE GỐC CỦA BẠN */}
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
                <span className="text-blue-600 font-bold">vector</span> đã lưu trữ trong hệ thống.
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

        {/* TABLE AREA */}
        <div className="relative w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">ID</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Phiên bản</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">Nội dung</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {currentTableData.length > 0 ? (
                currentTableData.map((item) => (
                  <tr key={item.id} className="group hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-400 align-top">#{item.id}</td>
                    <td className="px-6 py-4 align-top">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase border border-blue-100">
                        {item.version || "v2"}
                      </span>
                    </td>
                    <td
                      className="px-6 py-4 text-slate-600 text-sm max-w-[500px] cursor-pointer align-top"
                      onClick={() => toggleExpand(item.id)}
                    >
                      <div className={`group-hover:text-slate-900 transition-all font-medium leading-relaxed ${expandedId === item.id ? "whitespace-pre-wrap" : "line-clamp-2"}`}>
                        {item.content}
                      </div>
                      {expandedId !== item.id && item.content?.length > 150 && (
                        <span className="text-[10px] text-blue-500/70 mt-1 font-bold">Click để xem thêm</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right align-top">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item.version); }}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="py-20 text-center text-slate-400 italic">Không có dữ liệu.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER - XỬ LÝ NHIỀU TRANG GỌN GÀNG */}
        {data.length > pageSize && (
          <div className="p-6 border-t border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">
              Trang {currentPage} / {totalPages} ({data.length} bản ghi)
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-slate-200 bg-white disabled:opacity-30 transition-all cursor-pointer shadow-sm hover:text-blue-600 hover:border-blue-200"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1">
                {getPaginationGroup().map((page, i) => (
                  <React.Fragment key={i}>
                    {page === "..." ? (
                      <span className="w-8 h-8 flex items-center justify-center text-slate-400 text-xs">...</span>
                    ) : (
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-xl text-[11px] font-black transition-all cursor-pointer border ${currentPage === page
                            ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200"
                            : "bg-white border-slate-200 text-slate-500 hover:border-blue-300"
                          }`}
                      >
                        {page}
                      </button>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-slate-200 bg-white disabled:opacity-30 transition-all cursor-pointer shadow-sm hover:text-blue-600 hover:border-blue-200"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KBList;