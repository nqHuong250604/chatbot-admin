import React, { useMemo, memo } from "react";
import ReactApexChart from "react-apexcharts";
import {
  ListOrdered,
  FileCheck,
  FileX,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import EmptyState from "./EmptyState";

// Tách MiniStat ra ngoài và sử dụng memo để tối ưu hiệu năng render
const MiniStat = memo(({ label, value, barColor, icon, description }) => (
  <div className="group relative p-4 rounded-xl border border-slate-100 bg-slate-50/50 transition-all duration-300 hover:bg-white hover:shadow-lg hover:-translate-y-1 hover:z-50">
    <div
      className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-sm ${barColor} transition-all group-hover:w-1.5`}
    />
    <div className="flex flex-col gap-3 pl-1">
      <div className="flex justify-between items-start">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div className="relative flex items-center group/tooltip">
          <HelpCircle
            size={12}
            className="text-slate-300 cursor-help hover:text-slate-400"
          />
          <div className="absolute bottom-[140%] right-[-10px] w-40 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-xl opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-all z-[100] leading-relaxed">
            {description}
            <div className="absolute top-full right-[14px] border-4 border-transparent border-t-slate-800" />
          </div>
        </div>
      </div>
      <div>
        <p className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
          {label}
        </p>
        <p className="text-xl font-black text-slate-800 tracking-tight">{value}</p>
      </div>
    </div>
  </div>
));

const KBAnalysis = ({ data }) => {
  // 1. Clean Data Mapping bằng Destructuring
  const { total, answered, refused, error, answer_rate } = data?.summary || {};

  const summary = useMemo(
    () => ({
      total: total || 0,
      has_data: answered || 0,
      missing_data: refused || 0,
      err: error || 0,
      rate: answer_rate || 0,
    }),
    [total, answered, refused, error, answer_rate],
  );

  // 2. Logic Series ngắn gọn
  const series = useMemo(
    () => [
      Number(summary.has_data),
      Math.max(0, Number(summary.total) - Number(summary.has_data)),
    ],
    [summary],
  );

  // 3. Đưa chartOptions vào useMemo để tránh việc ApexCharts khởi tạo lại liên tục
  const chartOptions = useMemo(
    () => ({
      chart: { id: "kb-donut-analysis", fontFamily: "'Be Vietnam Pro', sans-serif" },
      labels: ["KB có dữ liệu", "KB thiếu / lỗi"],
      colors: ["#10b981", "#f43f5e"],
      stroke: { show: false },
      dataLabels: { enabled: false },
      plotOptions: {
        pie: {
          donut: {
            size: "75%",
            labels: {
              show: true,
              total: {
                show: true,
                label: "KB Đầy đủ",
                fontSize: "10px",
                fontWeight: "bold",
                color: "#94a3b8",
                formatter: () => `${summary.rate}%`,
              },
              value: {
                show: true,
                fontSize: "24px",
                fontWeight: "900",
                color: "#1e293b",
                offsetY: 5,
              },
            },
          },
        },
      },
      legend: { show: false },
      tooltip: { enabled: true, theme: "light" },
    }),
    [summary.rate],
  );

  return (
    <div className="flex flex-col h-full space-y-8">
      <header className="flex items-center gap-3">
        <span className="text-xl">🔬</span>
        <h2 className="text-lg font-bold tracking-tight text-slate-800">
          Tổng quan FAQ & Kho tri thức
        </h2>
      </header>

      <section className="grid grid-cols-2 gap-4">
        <MiniStat
          label="Tổng lượt gọi FAQ"
          value={summary.total}
          barColor="bg-slate-400"
          icon={<ListOrdered size={14} className="text-slate-500" />}
          description="Tổng số lần Bot thực hiện tìm kiếm câu trả lời trong kho tri thức FAQ."
        />

        <MiniStat
          label="KB có dữ liệu"
          value={summary.has_data}
          barColor="bg-emerald-500"
          icon={<FileCheck size={14} className="text-emerald-600" />}
          description="Số câu hỏi đã tìm thấy nội dung phản hồi sẵn có trong kho dữ liệu."
        />

        <MiniStat
          label="KB thiếu dữ liệu"
          value={summary.missing_data}
          barColor="bg-rose-500"
          icon={<FileX size={14} className="text-rose-600" />}
          description="Số câu hỏi chưa được biên soạn nội dung, cần bổ sung thêm tri thức."
        />
        <MiniStat
          label="Lỗi kết nối"
          value={`${summary.err}`}
          barColor="bg-amber-500"
          icon={<AlertTriangle size={14} className="text-amber-600" />}
          description="Số phiên hội thoại bị gián đoạn hoặc gặp sự cố kỹ thuật từ hệ thống."
        />
      </section>

      <footer className="relative flex-1 flex flex-col items-center justify-center min-h-[250px]">
        <h3 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest absolute top-0 left-0">
          Tỷ lệ câu hỏi được trả lời thành công (%)
        </h3>
        <div className="w-full pt-6">
          {data ? (
            summary.total === 0 ? (
              <EmptyState message="Chưa có dữ liệu phân tích KB" className="h-[250px] mt-4" />
            ) : (
              <ReactApexChart
                options={chartOptions}
                series={series}
                type="donut"
                height={280}
              />
            )
          ) : (
            <div className="text-slate-300 text-sm animate-pulse italic">
              Đang tải biểu đồ tri thức...
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};

export default memo(KBAnalysis);
