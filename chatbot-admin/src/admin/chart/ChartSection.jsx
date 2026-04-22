import React, { memo, useMemo, useRef, useCallback } from "react";
import ReactApexChart from "react-apexcharts";
import dayjs from "dayjs";
import EmptyState from "../components/Dashboard/EmptyState";

// Hook xử lý tooltip bị tràn/cắt khi cuộn tới mép phải cục bộ
const useTooltipFix = () => {
  const chartRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const tooltips = chartRef.current.querySelectorAll(".apexcharts-tooltip");
    tooltips.forEach((t) => {
      // Nếu vị trí chuột cách mép phải của khung hiển thị dưới 180px, ta ép lật tooltip sang trái
      if (rect.right - e.clientX < 180) {
        t.style.setProperty("transform", "translateX(calc(-100% - 40px))", "important");
      } else {
        t.style.setProperty("transform", "none", "important");
      }
    });
  }, []);

  return { chartRef, handleMouseMove };
};

const commonTooltip = {
  theme: "light",
  shared: true,
  intersect: false,
};

// 1. Biểu đồ Xu hướng (DailyTrendChart)
export const DailyTrendChart = memo(({ data }) => {
  const { chartRef, handleMouseMove } = useTooltipFix();

  // FIX: Dữ liệu JSON bạn gửi là một mảng trực tiếp [{}, {}, ...]
  // Không dùng data?.data nữa mà dùng trực tiếp data
  const chartData = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const series = useMemo(
    () => [
      {
        name: "Trả lời được",
        // Map đúng trường 'answered' từ JSON
        data: chartData.map((d) => d.answered || 0),
      },
      {
        name: "Từ chối",
        // Map đúng trường 'refused' từ JSON
        data: chartData.map((d) => d.refused || 0),
      },
    ],
    [chartData],
  );

  const options = useMemo(
    () => ({
      chart: {
        id: "daily-trend-main",
        type: "bar",
        stacked: false, // Chuyển thành biểu đồ cột đứng (Basic Column)
        toolbar: { show: false },
        fontFamily: "'Be Vietnam Pro', sans-serif",
        animations: { enabled: true, easing: "easeinout", speed: 800 },
      },
      colors: ["#10b981", "#e11d48"], // Xanh cho thành công, Đỏ Ruby cho từ chối
      plotOptions: {
        bar: { columnWidth: "45%", borderRadius: 4 },
      },
      dataLabels: { enabled: false },
      xaxis: {
        // Map date_vn (2026-02-06 -> 06/02)
        categories: chartData.map((d) =>
          d.date_vn ? dayjs(d.date_vn).format("DD/MM") : "",
        ),
        labels: {
          style: { colors: "#64748b", fontSize: "10px", fontWeight: 600 },
        },
      },
      yaxis: {
        labels: {
          style: { colors: "#64748b", fontSize: "10px" },
          formatter: (val) => Math.floor(val),
        },
      },
      grid: { borderColor: "#f1f5f9", strokeDashArray: 4 },
      legend: { show: false }, // Đặt mốc cố định html thay vì của canvas
      tooltip: {
        ...commonTooltip,
        y: { formatter: (val) => val + " câu hỏi" },
      },
    }),
    [chartData],
  );

  if (chartData.length === 0) {
    return <EmptyState message="Không có dữ liệu xu hướng hàng ngày" />;
  }

  const minChartWidth = chartData.length > 7 ? chartData.length * 45 + 80 : "100%";

  return (
    <div className="w-full h-full flex flex-col">
      {/* Cố định phần Ghi chú (Legend) ở trên để khi cuộn ngang biểu đồ sẽ không bị trượt mất */}
      <div className="flex justify-end gap-4 mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#10b981]"></span>
          <span className="text-xs font-semibold text-slate-600">Trả lời được</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#e11d48]"></span>
          <span className="text-xs font-semibold text-slate-600">Từ chối</span>
        </div>
      </div>
      <div
        ref={chartRef}
        onMouseMove={handleMouseMove}
        className="w-full flex-1 overflow-x-auto min-h-[300px]"
      >
        <div style={{ minWidth: "100%", width: minChartWidth, height: "100%" }} className="pr-16 pb-4 pt-2">
          <ReactApexChart
            options={options}
            series={series}
            type="bar"
            height="100%"
            width="100%"
          />
        </div>
      </div>
    </div>
  );
});

// 2. Biểu đồ Tỉ lệ (RateLineChart)
export const RateLineChart = memo(({ data }) => {
  const { chartRef, handleMouseMove } = useTooltipFix();
  const chartData = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const series = useMemo(
    () => [
      {
        name: "Tỉ lệ phản hồi",
        data: chartData.map((d) => parseFloat(d.answer_rate) || 0),
      },
    ],
    [chartData],
  );

  const options = useMemo(
    () => ({
      chart: {
        id: "rate-line-main",
        type: "line",
        toolbar: { show: false },
        fontFamily: "Inter, sans-serif",
      },
      colors: ["#8b5cf6"],
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 3, lineCap: "round" },
      markers: {
        size: 5,
        colors: ["#fff"],
        strokeColors: "#8b5cf6",
        strokeWidth: 3,
        hover: { size: 7 },
      },
      xaxis: {
        categories: chartData.map((d) =>
          d.date_vn ? dayjs(d.date_vn).format("DD/MM") : "",
        ),
        labels: {
          style: { colors: "#94a3b8", fontSize: "10px", fontWeight: 600 },
        },
        axisBorder: { show: false },
      },
      yaxis: {
        max: 100,
        min: 0,
        tickAmount: 5,
        labels: {
          style: { colors: "#94a3b8", fontSize: "10px" },
          formatter: (val) => `${val}%`,
        },
      },
      annotations: {
        yaxis: [
          {
            y: 80,
            borderColor: "#10b981",
            strokeDashArray: 5,
            borderWidth: 2,
            label: {
              text: "MỤC TIÊU 80%",
              position: "left",
              textAnchor: "start",
              offsetY: -10,
              offsetX: 10,
              style: {
                color: "#fff",
                background: "#10b981",
                fontSize: "10px",
                fontWeight: 700,
                padding: { left: 6, right: 6, top: 4, bottom: 4 },
              },
            },
          },
        ],
      },
      grid: { borderColor: "#f1f5f9", strokeDashArray: 4 },
      tooltip: {
        theme: "light",
        y: { formatter: (val) => `${val}% thành công` },
      },
    }),
    [chartData],
  );

  if (chartData.length === 0) {
    return <EmptyState message="Không có dữ liệu tỉ lệ phản hồi" />;
  }

  const minChartWidth = chartData.length > 7 ? chartData.length * 50 + 80 : "100%";

  return (
    <div
      ref={chartRef}
      onMouseMove={handleMouseMove}
      className="w-full h-full min-h-[300px] overflow-x-auto"
    >
      <div style={{ minWidth: "100%", width: minChartWidth, height: "100%" }} className="pr-16 pb-4 pt-2">
        <ReactApexChart
          options={options}
          series={series}
          type="line"
          height="100%"
          width="100%"
        />
      </div>
    </div>
  );
});

// 3. Biểu đồ Giờ cao điểm (PeakHourApexChart)
export const PeakHourApexChart = memo(({ data }) => {
  const { chartRef, handleMouseMove } = useTooltipFix();
  const chartData = useMemo(() => {
    // FIX: JSON của bạn trả về data là mảng hours trực tiếp [ {hour_vn: 0, count: 0}, ... ]
    const raw = Array.isArray(data) ? data : [];

    // Tạo danh sách 24 giờ để đảm bảo biểu đồ luôn đủ từ 00h - 23h
    return Array.from({ length: 24 }, (_, i) => {
      const found = raw.find((item) => item.hour_vn === i);
      return {
        hour: `${i.toString().padStart(2, "0")}h`,
        count: found ? found.count : 0,
      };
    });
  }, [data]);

  const series = useMemo(
    () => [
      { name: "Số phiên chat", data: chartData.map((item) => item.count) },
    ],
    [chartData],
  );

  const options = useMemo(() => {
    const counts = chartData.map((item) => item.count);
    const maxCount = Math.max(...counts);

    return {
      chart: {
        id: "peak-hour-usage",
        type: "bar",
        toolbar: { show: false },
        fontFamily: "Inter, sans-serif",
        animations: { enabled: true, speed: 600 },
      },
      plotOptions: {
        bar: {
          borderRadius: 4,
          columnWidth: "70%",
          distributed: true,
          dataLabels: { position: "top" },
        },
      },
      // Màu sắc: Cột cao nhất là Cam (Amber), còn lại là Xanh Cyan (Cyan)
      colors: chartData.map((item) =>
        item.count === maxCount && maxCount > 0 ? "#f59e0b" : "#06b6d4",
      ),
      dataLabels: {
        enabled: false
      },
      xaxis: {
        categories: chartData.map((item) => item.hour),
        labels: {
          style: { fontSize: "9px", colors: "#94a3b8", fontWeight: 600 },
        },
        axisBorder: { show: true, color: "#e2e8f0" },
        axisTicks: { show: true, color: "#e2e8f0" },
      },
      yaxis: {
        show: true,
        labels: {
          style: { colors: "#94a3b8", fontSize: "10px" },
          formatter: (val) => Math.floor(val),
        },
      },
      legend: { show: false }, // Dùng custom HTML legend
      grid: { borderColor: "#f1f5f9", strokeDashArray: 4 },
      tooltip: {
        theme: "light",
        y: { formatter: (val) => `${val} phiên chat` },
      },
    };
  }, [chartData]);

  // Peak hour chart có 24 giờ nên có thể chứa vừa độ rộng, chỉ cần hiển thị empty nếu không có phiên nào
  const totalCounts = chartData.reduce((acc, curr) => acc + curr.count, 0);

  if (totalCounts === 0) {
    return (
      <EmptyState message="Chưa có phiên chat nào để phân tích giờ cao điểm" />
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-end gap-4 mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#f59e0b]"></span>
          <span className="text-xs font-semibold text-slate-600">Giờ cao điểm (nhiều nhất)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#06b6d4]"></span>
          <span className="text-xs font-semibold text-slate-600">Bình thường</span>
        </div>
      </div>
      <div
        ref={chartRef}
        onMouseMove={handleMouseMove}
        className="w-full flex-1 min-h-[300px] overflow-x-auto"
      >
        <div style={{ minWidth: "580px", height: "100%" }} className="pr-16 pb-4 pt-2">
          <ReactApexChart
            options={options}
            series={series}
            type="bar"
            height="100%"
            width="100%"
          />
        </div>
      </div>
    </div>
  );
});

// 4. Biểu đồ Donut Tỉ lệ Phản hồi (ResponseRateDonut)
export const ResponseRateDonut = memo(({ answered = 0, refused = 0 }) => {
  // Đảm bảo dữ liệu truyền vào là số
  const sAnswered = Number(answered);
  const sRefused = Number(refused);

  const series = useMemo(() => [sAnswered, sRefused], [sAnswered, sRefused]);

  const options = useMemo(() => {
    const total = sAnswered + sRefused;
    const rate = total > 0 ? ((sAnswered / total) * 100).toFixed(1) : 0;

    return {
      chart: {
        id: "response-donut",
        type: "donut",
        fontFamily: "Inter, sans-serif",
      },
      labels: ["Trả lời được", "Từ chối"],
      colors: ["#4f46e5", "#ec4899"],
      plotOptions: {
        pie: {
          donut: {
            size: "75%",
            labels: {
              show: true,
              total: {
                show: true,
                label: "THÀNH CÔNG", // Chữ nhỏ ở dưới hoặc trên
                fontSize: "10px",
                fontWeight: 800,
                color: "#94a3b8",
                // Chuyển rate thành giá trị chính hiển thị ở giữa
                formatter: () => `${rate}%`,
              },
              value: {
                show: true,
                fontSize: "24px", // Chỉnh size số % to lên
                fontWeight: 900,
                color: "#1e293b",
                offsetY: 4, // Căn chỉnh vị trí số
                formatter: () => `${rate}%`,
              },
            },
          },
        },
      },
      dataLabels: { enabled: false },
      legend: {
        position: "bottom",
        fontSize: "12px",
        fontWeight: 600,
        markers: { radius: 12 },
      },
      stroke: { show: false },
    };
  }, [sAnswered, sRefused]);

  if (sAnswered === 0 && sRefused === 0) {
    return <EmptyState message="Chưa có dữ liệu phản hồi" />;
  }

  return (
    <ReactApexChart
      options={options}
      series={series}
      type="donut"
      height="100%"
    />
  );
});

// 5. Biểu đồ FAQ (PeakHourChart) - Đã sửa theo phiên bản v2, v5, v6
export const PeakHourChart = memo(({ data = [] }) => {
  const processedData = useMemo(() => {
    if (!data.length) return { categories: [], series: [] };

    const uniqueDates = [...new Set(data.map((item) => item.date_vn))].sort();
    const getVal = (date, version) => {
      const entry = data.find((d) => d.date_vn === date && d.version === version);
      return entry ? Number(entry.total_faq || 0) : 0;
    };

    return {
      categories: uniqueDates.map((date) => {
        const parts = date.split("-");
        return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : date;
      }),
      series: [
        { name: "Version v2", data: uniqueDates.map((date) => getVal(date, "v2")) },
        { name: "Version v5", data: uniqueDates.map((date) => getVal(date, "v5")) },
        { name: "Version v6", data: uniqueDates.map((date) => getVal(date, "v6")) },
      ],
    };
  }, [data]);

  const options = useMemo(
    () => ({
      chart: {
        id: "faq-daily-trend-chart",
        toolbar: { show: false },
        fontFamily: "'Be Vietnam Pro', sans-serif",
      },
      title: {
        text: "Thống kê câu hỏi theo phiên bản",
        align: "left",
        style: { fontSize: "12px", color: "#334155", fontWeight: 800 },
      },
      colors: ["#3b82f6", "#f59e0b", "#10b981"],
      plotOptions: {
        bar: {
          columnWidth: "50%", // Tăng độ rộng cột để trông không bị gầy
          borderRadius: 4,
          dataLabels: {
            position: 'top',
          },
        },
      },
      stroke: { show: true, width: 2, colors: ["transparent"] },
      dataLabels: {
        enabled: true, // Bật để thấy số lượng kể cả khi cột thấp
        offsetY: -20,
        style: {
          fontSize: "10px",
          fontWeight: "bold",
          colors: ["#64748b"]
        },
        formatter: (val) => val > 0 ? val : "" // Chỉ hiện số nếu > 0
      },
      xaxis: {
        categories: processedData.categories,
        labels: { style: { colors: "#94a3b8", fontSize: "10px", fontWeight: 600 } },
      },
      yaxis: {
        labels: {
          style: { colors: "#94a3b8", fontSize: "10px" },
          formatter: (val) => Math.floor(val),
        },
      },
      grid: { borderColor: "#f1f5f9", strokeDashArray: 4 },
      legend: { show: false },
      tooltip: {
        enabled: true,
        shared: true,
        intersect: false,
        theme: "light",
      },
    }),
    [processedData]
  );

  if (!data?.length) {
    return <EmptyState message="Không có dữ liệu xu hướng câu hỏi hàng ngày" />;
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-end gap-4 mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#3b82f6]"></span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">V2 (Product)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#f59e0b]"></span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">V5 (Toán)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#10b981]"></span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">V6 (Tiếng Việt)</span>
        </div>
      </div>

      <div className="w-full flex-1">
        <div className="w-full h-full pb-4">
          <ReactApexChart options={options} series={processedData.series} type="bar" height="100%" />
        </div>
      </div>
    </div>
  );
});