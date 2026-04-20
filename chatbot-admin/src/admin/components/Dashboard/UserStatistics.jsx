import React, { memo, useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import { Users, UserCheck, Ghost, Award, HelpCircle } from "lucide-react";
import dayjs from "dayjs";
import EmptyState from "./EmptyState";
// --- BIỂU ĐỒ 1: PHIÊN CHAT THEO USER (NGANG) ---
const UserSessionsChart = memo(({ data = [] }) => {
  const series = useMemo(
    () => [
      {
        name: "Phiên chat",
        data: data.map((u) => Number(u.sessions || 0)),
      },
    ],
    [data],
  );

  const options = useMemo(
    () => ({
      chart: {
        id: "user-sessions-bar-chart",
        type: "bar",
        toolbar: { show: false },
        fontFamily: "Inter, sans-serif",
      },
      plotOptions: {
        bar: { horizontal: true, borderRadius: 6, barHeight: "60%" },
      },
      colors: ["#0ea5e9"],
      dataLabels: {
        enabled: false,
      },
      xaxis: {
        // GIỮ NGUYÊN HỌ TÊN ĐẦY ĐỦ
        categories: data.map((u) => u.full_name || "N/A"),
        labels: {
          style: { colors: "#94a3b8", fontSize: "10px", fontWeight: 600 },
        },
      },
      yaxis: {
        labels: {
          style: { colors: "#64748b", fontSize: "10px", fontWeight: 700 },
          maxWidth: 150, // Tăng độ rộng để hiển thị đủ họ tên
        },
      },
      grid: { borderColor: "#f1f5f9", strokeDashArray: 4 },
      tooltip: { theme: "light", y: { formatter: (val) => `${val} phiên` } },
      title: {
        text: "TOP NHÂN VIÊN GIAO TIẾP NHIỀU NHẤT",
        style: {
          fontSize: "11px",
          color: "#94a3b8",
          fontWeight: 800,
          fontFamily: "Inter, sans-serif",
        },
      },
    }),
    [data],
  );

  return (
    <ReactApexChart options={options} series={series} type="bar" height={280} />
  );
});

// --- BIỂU ĐỒ 2: CHI TIẾT HOẠT ĐỘNG (CỘT CHỒNG - SHARED TOOLTIP) ---
const UserActivityChart = memo(({ data = [] }) => {
  const series = useMemo(
    () => [
      {
        name: "Câu hỏi",
        data: data.map((u) => Number(u?.total_questions || 0)),
      },
      { name: "Gọi FAQ", data: data.map((u) => Number(u?.faq_calls || 0)) },
    ],
    [data],
  );

  const options = useMemo(
    () => ({
      chart: {
        id: "user-activity-stacked",
        type: "bar",
        stacked: false,
        toolbar: { show: false },
        fontFamily: "Inter, sans-serif",
      },
      colors: ["#334155", "#fb923c"],
      dataLabels: { enabled: false },
      plotOptions: { bar: { columnWidth: "40%", borderRadius: 4 } },
      xaxis: {
        // GIỮ NGUYÊN HỌ TÊN ĐẦY ĐỦ
        categories: data.map((u) => u.full_name || "N/A"),
        labels: {
          rotate: -45, // Xoay nhẹ nếu tên quá dài để tránh đè nhau
          style: { colors: "#94a3b8", fontSize: "10px", fontWeight: 600 },
        },
      },
      yaxis: {
        labels: {
          style: { colors: "#94a3b8", fontSize: "10px" },
          formatter: (val) => Math.floor(val),
        },
      },
      legend: {
        position: "top",
        horizontalAlign: "right",
        fontSize: "10px",
        fontWeight: 700,
      },
      grid: { borderColor: "#f1f5f9", strokeDashArray: 4 },
      tooltip: {
        theme: "light",
        shared: true, // Hiện cả 2 thông số cùng lúc
        intersect: false,
        y: { formatter: (val) => `${val} lượt` },
      },
      title: {
        text: "CHI TIẾT HOẠT ĐỘNG",
        style: {
          fontSize: "11px",
          color: "#94a3b8",
          fontWeight: 800,
          fontFamily: "Inter, sans-serif",
        },
      },
    }),
    [data],
  );

  return (
    <ReactApexChart options={options} series={series} type="bar" height={280} />
  );
});

// --- MINI STAT COMPONENT (Giữ nguyên UI) ---
const MiniStat = memo(
  ({
    label,
    value,
    unit,
    unitColor = "text-emerald-500",
    barColor,
    icon,
    description,
  }) => (
    <div className="group relative p-4 rounded-xl border border-slate-100 bg-slate-50/50 transition-all hover:bg-white hover:shadow-md">
      <div
        className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-sm ${barColor} transition-all group-hover:w-1.5`}
      ></div>
      <div className="flex flex-col gap-3 pl-1">
        <div className="flex justify-between items-start">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
            {icon}
          </div>
          <div className="relative group/tooltip">
            <HelpCircle size={12} className="text-slate-300 cursor-help" />
            <div className="absolute bottom-[140%] right-[-10px] w-40 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-xl opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-all z-[100]">
              {description}
              <div className="absolute top-full right-[14px] border-4 border-transparent border-t-slate-800"></div>
            </div>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-tight mb-1">
            {label}
          </p>
          <p className="text-lg font-black text-slate-800 leading-none mb-1">
            {value}
          </p>
          <span className={`text-[9px] font-bold ${unitColor} uppercase`}>
            {unit}
          </span>
        </div>
      </div>
    </div>
  ),
);

// --- MAIN COMPONENT ---
const UserStatistics = ({ userData = [] }) => {
  const { stats, chartData } = useMemo(() => {
    const rawData = Array.isArray(userData) ? userData : [];
    if (rawData.length === 0) return { stats: {}, chartData: [] };

    const total = rawData.length;
    const verified = rawData.reduce(
      (acc, curr) => acc + (Number(curr.sessions) || 0),
      0,
    );
    const sorted = [...rawData].sort(
      (a, b) => (Number(b.sessions) || 0) - (Number(a.sessions) || 0),
    );

    return {
      stats: { total, verified, top: sorted[0] },
      chartData: sorted.slice(0, 10),
    };
  }, [userData]);

  const renderFormattedDate = (dateStr) => {
    if (!dateStr) return <span className="text-slate-300">---</span>;
    const d = dayjs(dateStr);
    if (!d.isValid()) return dateStr;
    return (
      <div className="flex flex-col leading-tight">
        <span className="font-mono font-bold">{d.format("HH:mm:ss")}</span>
        <span className="text-[10px] text-slate-400">
          {d.format("DD/MM/YYYY")}
        </span>
      </div>
    );
  };

  return (
    <div className="flex flex-col space-y-8 bg-white p-6 rounded-xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] font-sans">
      <div className="flex items-center gap-3">
        <span className="text-xl">👥</span>
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            Thống kê người dùng
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Dữ liệu nhân sự xác thực hệ thống
          </p>
        </div>
      </div>

      {userData.length === 0 ? (
        <EmptyState message="Chưa có dữ liệu thống kê người dùng" className="h-[250px]" />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MiniStat
              label="USER ĐÃ XÁC THỰC"
              value={stats.total || 0}
              unit="người"
              barColor="bg-slate-400"
              icon={<Users size={14} className="text-slate-500" />}
              description="Tổng số nhân viên trong hệ thống đã đăng nhập và sử dụng Bot."
            />

            <MiniStat
              label="PHIÊN ĐỊNH DANH"
              value={stats.verified || 0}
              unit="phiên"
              barColor="bg-emerald-500"
              icon={<UserCheck size={14} className="text-emerald-600" />}
              description="Số cuộc trò chuyện từ người dùng đã đăng nhập tài khoản."
            />

            <MiniStat
              label="PHIÊN VÃNG LAI"
              value="0"
              unit="khách"
              barColor="bg-rose-500"
              icon={<Ghost size={14} className="text-rose-600" />}
              description="Số cuộc trò chuyện từ người dùng ẩn danh hoặc chưa đăng nhập."
            />

            <MiniStat
              label="USER DÙNG NHIỀU NHẤT"
              value={stats.top?.full_name || "N/A"}
              unit="Top 1"
              barColor="bg-blue-500"
              icon={<Award size={14} className="text-blue-600" />}
              description="Thành viên có tần suất tương tác và đặt câu hỏi nhiều nhất."
            />
          </div>

          <div className="grid grid-cols-1 gap-8 pt-4">
            <UserSessionsChart data={chartData} />
            <UserActivityChart data={chartData} />
          </div>

          <div className="pt-4 overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse border border-slate-100">
              <thead>
                <tr className="text-[10px] text-slate-400 uppercase bg-slate-50/80">
                  <th className="p-4 font-bold">Họ tên</th>
                  <th className="p-4 font-bold text-center">Email</th>
                  <th className="p-4 font-bold text-center">Mã bí mật</th>
                  <th className="p-4 font-bold text-center">Phòng ban</th>
                  <th className="p-4 font-bold text-center">Role</th>
                  <th className="p-4 font-bold text-center">Phiên chat</th>
                  <th className="p-4 font-bold text-center">Tổng câu hỏi</th>
                  <th className="p-4 font-bold text-center">Lượt gọi FAQ</th>
                  <th className="p-4 font-bold text-center">TB hỏi/phiên</th>
                  <th className="p-4 font-bold text-center">Số ngày sử dụng</th>
                  <th className="p-4 font-bold text-center">Lần đầu</th>
                  <th className="p-4 font-bold text-center">Lần cuối</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-medium text-slate-600">
                {userData.map((user, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                  >
                    <td className="p-4 font-bold text-slate-800">
                      {user.full_name}
                    </td>
                    <td className="p-4 text-center">{user.email || "N/A"}</td>
                    <td className="p-4 text-center font-mono text-indigo-500 font-bold">
                      {user.secret_code || "********"}
                    </td>
                    <td className="p-4">{user.department}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 uppercase">
                        {user.role || "guest"}
                      </span>
                    </td>
                    <td className="p-4 text-center">{user.sessions}</td>
                    <td className="p-4 text-center">{user.total_questions}</td>
                    <td className="p-4 text-center text-emerald-600 font-bold">
                      {user.faq_calls}
                    </td>
                    <td className="p-4 text-center">
                      {(
                        Number(user.total_questions) /
                        Math.max(1, Number(user.sessions))
                      ).toFixed(1)}
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 uppercase">
                        {user.days_active || 0} ngày
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {renderFormattedDate(user.first_seen)}
                    </td>
                    <td className="p-4 text-center">
                      {renderFormattedDate(user.last_seen)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default UserStatistics;
