import React, { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useDashboard } from "../hooks/useDashboard";
import DashboardLoading from "../components/DashboardLoading";
import StatCard from "../components/StatCard";
import ChartCard from "../components/ChartCard";
import UserStatistics from "../components/UserStatistics";
import KBAnalysis from "../components/KBAnalysis";
import RefusedQuestions from "../components/RefusedQuestions";
import ChatSessionHistory from "../components/ChatSessionHistory";
import KeywordAnalytics from "../components/KeywordAnalytics";
import TimeFilter from "../utils/TimeFilter";
import Skeleton from "react-loading-skeleton";
import { MessageSquare, UserCheck, AlertCircle, Zap, Menu } from "lucide-react";
import {
  DailyTrendChart,
  RateLineChart,
  PeakHourApexChart,
  ResponseRateDonut,
  PeakHourChart,
} from "../chart/ChartSection";

const Dashboard = () => {
  const { toggleSidebar } = useOutletContext();

  // Quản lý đồng thời Tab nhanh và Ngày chỉ định
  const [timeFilter, setTimeFilter] = useState("all");
  const [customDate, setCustomDate] = useState("");

  // Logic: Nếu có ngày chỉ định thì ưu tiên dùng ngày đó làm filter, ngược lại dùng Tab
  const activeFilter = customDate || timeFilter;
  const { data, loading } = useDashboard(activeFilter);

  // Memoize KPI cards
  const kpiCards = useMemo(() => {
    const k = data.kpis?.kpis || {};
    return [
      {
        label: "Tổng phiên chat",
        value: k.total_sessions?.toLocaleString() || "0",
        delta: `Tổng ${k.total_qa || 0} tin`,
        deltaIcon: <MessageSquare size={10} />,
        type: "default",
        description:
          "Quy mô tương tác thực tế: Tổng hợp tất cả các cuộc hội thoại.",
      },
      {
        label: "Lượt trả lời",
        value: k.bot_answered?.toLocaleString() || "0",
        delta: "Thành công",
        deltaIcon: <UserCheck size={10} />,
        type: "success",
        description:
          "Hiệu quả giải đáp: Số lượng câu hỏi Bot đã nhận diện chính xác.",
      },
      {
        label: "Lượt từ chối",
        value: k.bot_refused?.toLocaleString() || "0",
        delta: "Cần cập nhật",
        deltaIcon: <AlertCircle size={10} />,
        type: "danger",
        description:
          "Lỗ hổng kiến thức: Các trường hợp Bot chưa có dữ liệu trả lời.",
      },
      {
        label: "Tỉ lệ trả lời",
        value: `${k.answer_rate || 0}%`,
        delta: `${k.trend_rate || 0}%`,
        type: k.answer_rate >= 80 ? "success" : "warning",
        description: "Chỉ số năng lực: Đánh giá mức độ bao phủ của Bot.",
      },
      {
        label: "Thời gian TB",
        value: `${k.avg_duration || 0}m`,
        delta: `TB ${k.avg_turns || 0} lượt`,
        deltaIcon: <Zap size={10} />,
        type: "default",
        description:
          "Chất lượng trải nghiệm: Đo lường độ sâu của cuộc hội thoại.",
      },
    ];
  }, [data.kpis]);

  if (loading && !data.kpis) return <DashboardLoading />;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-10 transition-all duration-300">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* MOBILE HEADER */}
        <div className="lg:hidden flex items-center gap-4 mb-2">
          <button
            onClick={toggleSidebar}
            className="p-2 bg-white border border-slate-200 rounded-xl shadow-sm"
          >
            <Menu size={24} />
          </button>
          <span className="font-bold text-slate-700 uppercase text-xs tracking-widest">
            Trạng Nguyên AI
          </span>
        </div>

        {/* HEADER & FILTER SECTION */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end pb-8 gap-4 border-b border-slate-100">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 uppercase tracking-tighter">
              DASHBOARD
            </h1>
            <p className="text-slate-500 mt-2 font-medium">
              {customDate
                ? `Đang xem dữ liệu ngày: ${new Date(customDate).toLocaleDateString("vi-VN")}`
                : "Hệ thống phân tích Trạng Nguyên AI"}
            </p>
          </div>

          {/* Tích hợp TimeFilter mới */}
          <TimeFilter
            activeTab={timeFilter}
            onTabChange={(tab) => {
              setTimeFilter(tab);
              setCustomDate(""); // Reset ngày khi chọn tab nhanh
            }}
            customDate={customDate}
            onDateChange={(date) => {
              setCustomDate(date);
              if (date) setTimeFilter(""); // Bỏ active tab nếu đang chọn ngày
            }}
          />
        </header>

        {/* Cấu trúc các Section bên dưới giữ nguyên 100% UI cũ */}
        <div className="space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {!data.kpis
              ? Array(5)
                  .fill(0)
                  .map((_, i) => <StatCard key={i} loading={true} />)
              : kpiCards.map((kpi, idx) => (
                  <StatCard key={idx} {...kpi} loading={false} />
                ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ChartCard title="Xu hướng hỏi đáp" iconColor="bg-blue-500">
              {!data.kpis ? (
                <Skeleton height={300} borderRadius={12} />
              ) : (
                <DailyTrendChart data={data.kpis.daily || []} />
              )}
            </ChartCard>
            <ChartCard title="Hiệu suất trả lời" iconColor="bg-indigo-500">
              {!data.kpis ? (
                <Skeleton height={300} borderRadius={12} />
              ) : (
                <RateLineChart data={data.kpis.daily || []} />
              )}
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <ChartCard title="Giờ cao điểm (VN)" iconColor="bg-orange-500">
                {!data.kpis ? (
                  <Skeleton height={300} borderRadius={12} />
                ) : (
                  <PeakHourApexChart data={data.kpis.hours || []} />
                )}
              </ChartCard>
            </div>
            <ChartCard title="Tỉ lệ phản hồi" iconColor="bg-emerald-500">
              {!data.kpis ? (
                <div className="flex justify-center items-center h-[300px]">
                  <Skeleton circle height={200} width={200} />
                </div>
              ) : (
                <ResponseRateDonut
                  answered={data.kpis.kpis?.bot_answered || 0}
                  refused={data.kpis.kpis?.bot_refused || 0}
                />
              )}
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {!data.faqAnalysis ? (
              <div className="col-span-3">
                <Skeleton height={350} borderRadius={16} />
              </div>
            ) : (
              <>
                <KBAnalysis data={data.faqAnalysis} />
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-100">
                  <PeakHourChart data={data.faqAnalysis.daily || []} />
                </div>
              </>
            )}
          </div>

          <div className="space-y-10">
            {!data.userData ? (
              <div className="bg-white p-6 rounded-xl border">
                <Skeleton height={250} />
              </div>
            ) : (
              <UserStatistics
                userData={data.userData}
                totalSessionsAll={data.kpis?.kpis?.total_sessions || 0}
              />
            )}
            {!data.keywords ? (
              <div className="bg-white p-6 rounded-xl border">
                <Skeleton height={200} />
              </div>
            ) : (
              <KeywordAnalytics keywords={data.keywords} />
            )}
          </div>

          <div className="space-y-10">
            {!data.faqAnalysis ? (
              <div className="bg-white p-6 rounded-xl border">
                <Skeleton height={200} />
              </div>
            ) : (
              <RefusedQuestions questions={data.faqAnalysis.missing || []} />
            )}
            {!data.sessions ? (
              <div className="bg-white p-6 rounded-xl border">
                <Skeleton height={400} />
              </div>
            ) : (
              <ChatSessionHistory sessions={data.sessions} />
            )}
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
};

const Footer = () => (
  <footer className="flex justify-between items-center text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] pt-8">
    <span>Trạng Nguyên AI System © 2026</span>
    <span className="bg-slate-100 px-4 py-1.5 rounded-full shadow-inner">
      v2.4.0
    </span>
  </footer>
);

export default Dashboard;
