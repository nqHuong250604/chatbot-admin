import React, { useState, useMemo, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useDashboard } from "../hooks/useDashboard";
import TimeFilter from "../utils/TimeFilter";
import DashboardLoading from "../components/Dashboard/DashboardLoading";
import StatCard from "../components/Dashboard/StatCard";
import ChartCard from "../components/Dashboard/ChartCard";
import UserStatistics from "../components/Dashboard/UserStatistics";
import KBAnalysis from "../components/Dashboard/KBAnalysis";
import RefusedQuestions from "../components/Dashboard/RefusedQuestions";
import ChatSessionHistory from "../components/Dashboard/ChatSessionHistory";
import KeywordAnalytics from "../components/Dashboard/KeywordAnalytics";
import Skeleton from "react-loading-skeleton";
import { MessageSquare, UserCheck, AlertCircle, Zap } from "lucide-react";
import {
  DailyTrendChart,
  RateLineChart,
  PeakHourApexChart,
  ResponseRateDonut,
  PeakHourChart,
} from "../chart/ChartSection";

const Dashboard = () => {
  // eslint-disable-next-line no-unused-vars
  const { toggleSidebar } = useOutletContext();

  // States quản lý lọc
  const [filterMode, setFilterMode] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [range, setRange] = useState({ start: "", end: "" });
  const [isFilterChanging, setIsFilterChanging] = useState(false);

  // Gộp lọc 1 ngày và lọc khoảng ngày vào chung Object gửi API
  const activeFilter = useMemo(() => {
    if (filterMode === "all") return "all";
    if (filterMode === "today") return { days: 1 };

    if (filterMode === "month" && selectedMonth) {
      const [year, month] = selectedMonth.split("-");
      return { year: parseInt(year), month: parseInt(month) };
    }

    if (filterMode === "range" && range.start) {
      // Nếu chỉ có ngày bắt đầu -> Lọc cho đúng 1 ngày đó
      // Nếu có cả hai -> Lọc theo khoảng
      return {
        start_date: range.start,
        end_date: range.end || range.start,
      };
    }

    return "all";
  }, [filterMode, selectedMonth, range]);

  const { data, loading } = useDashboard(activeFilter);

  // Quản lý trạng thái loading khi chuyển đổi filter
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsFilterChanging(true);
  }, [activeFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!loading) setIsFilterChanging(false);
  }, [loading]);

  const showSkeleton = loading || isFilterChanging || !data.kpis;

  // Tối ưu KPI Cards với Description
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
          "Tổng số cuộc hội thoại và tin nhắn Bot đã xử lý với người dùng.",
      },
      {
        label: "Lượt trả lời",
        value: k.bot_answered?.toLocaleString() || "0",
        delta: "Thành công",
        deltaIcon: <UserCheck size={10} />,
        type: "success",
        description:
          "Số câu hỏi Bot đã tìm thấy thông tin và trả lời khớp với ý định người dùng.",
      },
      {
        label: "Lượt từ chối",
        value: k.bot_refused?.toLocaleString() || "0",
        delta: "Cần cập nhật",
        deltaIcon: <AlertCircle size={10} />,
        type: "danger",
        description:
          "Số câu hỏi Bot từ chối trả lời do thông tin chưa được cập nhật vào kho tri thức.",
      },
      {
        label: "Tỉ lệ trả lời",
        value: `${k.answer_rate || 0}%`,
        delta: `${k.trend_rate || 0}%`,
        type: k.answer_rate >= 80 ? "success" : "warning",
        description:
          "Chỉ số đánh giá mức độ bao phủ của dữ liệu tri thức so với nhu cầu thực tế.",
      },
      {
        label: "Thời gian TB",
        value: `${k.avg_duration || 0}m`,
        delta: `TB ${k.avg_turns || 0} lượt`,
        deltaIcon: <Zap size={10} />,
        type: "default",
        description:
          "Thời gian trung bình của một phiên tư vấn giữa Bot và khách hàng.",
      },
    ];
  }, [data.kpis]);

  if (loading && !data.kpis) return <DashboardLoading />;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-10 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-8">
        <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end pb-8 gap-6 border-b border-slate-100">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 uppercase tracking-tighter">
              DASHBOARD
            </h1>
            <p className="text-slate-500 mt-2 font-medium uppercase text-xs tracking-wider">
              {filterMode === "range" && range.start
                ? !range.end
                  ? `Ngày: ${range.start}`
                  : `Khoảng: ${range.start} ➔ ${range.end}`
                : "Hệ thống phân tích dữ liệu Trạng Nguyên AI"}
            </p>
          </div>

          <TimeFilter
            filterMode={filterMode}
            setFilterMode={setFilterMode}
            selectedMonth={selectedMonth}
            setSelectedMonth={setSelectedMonth}
            range={range}
            setRange={setRange}
          />
        </header>

        <div className="space-y-10">
          {/* STAT CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {showSkeleton
              ? Array(5)
                .fill(0)
                .map((_, i) => <StatCard key={i} loading={true} />)
              : kpiCards.map((kpi, idx) => (
                <StatCard key={idx} {...kpi} loading={false} />
              ))}
          </div>

          {/* CHARTS SECTION 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ChartCard title="Lưu lượng truy vấn hàng ngày" iconColor="bg-emerald-500">
              {showSkeleton ? (
                <Skeleton height={300} borderRadius={12} />
              ) : (
                <DailyTrendChart data={data.kpis.daily || []} />
              )}
            </ChartCard>
            <ChartCard title="Tỉ lệ hiểu ý định người dùng (%)" iconColor="bg-violet-500">
              {showSkeleton ? (
                <Skeleton height={300} borderRadius={12} />
              ) : (
                <RateLineChart data={data.kpis.daily || []} />
              )}
            </ChartCard>
          </div>

          {/* CHARTS SECTION 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <ChartCard title="Thống kê thời gian tương tác (24h)" iconColor="bg-amber-500">
                {showSkeleton ? (
                  <Skeleton height={300} borderRadius={12} />
                ) : (
                  <PeakHourApexChart data={data.kpis.hours || []} />
                )}
              </ChartCard>
            </div>
            <ChartCard title="Thống kê mức độ hoàn thành" iconColor="bg-indigo-600">
              {showSkeleton ? (
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

          {/* KB & FAQ ANALYSIS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {showSkeleton ? (
              <div className="col-span-3">
                <Skeleton height={350} borderRadius={16} />
              </div>
            ) : (
              <>
                <KBAnalysis data={data.faqAnalysis} />
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                  <PeakHourChart data={data.faqAnalysis.daily || []} />
                </div>
              </>
            )}
          </div>

          {/* STATISTICS & KEYWORDS */}
          <div className="space-y-10">
            {showSkeleton ? (
              <div className="bg-white p-6 rounded-xl border">
                <Skeleton height={250} />
              </div>
            ) : (
              <UserStatistics
                userData={data.userData}
                totalSessionsAll={data.kpis?.kpis?.total_sessions || 0}
              />
            )}
            {showSkeleton ? (
              <div className="bg-white p-6 rounded-xl border">
                <Skeleton height={200} />
              </div>
            ) : (
              <KeywordAnalytics keywords={data.keywords} />
            )}
          </div>

          {/* HISTORY & REFUSED */}
          <div className="space-y-10">
            {showSkeleton ? (
              <div className="bg-white p-6 rounded-xl border">
                <Skeleton height={200} />
              </div>
            ) : (
              <RefusedQuestions questions={data.faqAnalysis.missing || []} />
            )}
            {/* {showSkeleton ? (
              <div className="bg-white p-6 rounded-xl border">
                <Skeleton height={400} />
              </div>
            ) : (
              <ChatSessionHistory sessions={data.sessions} />
            )} */}
          </div>
        </div>

        <footer className="flex justify-between items-center text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] pt-8">
          <span>Trạng Nguyên AI System © 2026</span>
          <span className="bg-slate-100 px-4 py-1.5 rounded-full shadow-inner">
            v2.5.0
          </span>
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;
