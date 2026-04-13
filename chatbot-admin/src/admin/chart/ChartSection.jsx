import React, { memo, useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import dayjs from "dayjs";
import EmptyState from "../components/Dashboard/EmptyState";

const commonTooltip = {
  theme: "light",
  shared: true,
  intersect: false,
};

// 1. Biểu đồ Xu hướng (DailyTrendChart)
export const DailyTrendChart = memo(({ data }) => {
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
        stacked: true,
        toolbar: { show: false },
        fontFamily: "Inter, sans-serif",
        animations: { enabled: true, easing: "easeinout", speed: 800 },
      },
      colors: ["#10b981", "#f43f5e"], // Xanh cho thành công, Đỏ cho từ chối
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
          style: { colors: "#94a3b8", fontSize: "10px", fontWeight: 600 },
        },
      },
      yaxis: {
        labels: {
          style: { colors: "#94a3b8", fontSize: "10px" },
          formatter: (val) => Math.floor(val),
        },
      },
      grid: { borderColor: "#f1f5f9", strokeDashArray: 4 },
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

  // Tự động tính toán chiều rộng để biểu đồ không bị dồn cục
  const minChartWidth = chartData.length > 7 ? chartData.length * 45 : "100%";

  return (
    <div className="w-full h-full min-h-[300px] overflow-x-auto overflow-y-hidden">
      <div style={{ minWidth: "100%", width: minChartWidth, height: "100%" }}>
        <ReactApexChart
          options={options}
          series={series}
          type="bar"
          height="100%"
          width="100%"
        />
      </div>
    </div>
  );
});

// 2. Biểu đồ Tỉ lệ (RateLineChart)
export const RateLineChart = memo(({ data }) => {
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
      colors: ["#6366f1"],
      stroke: { curve: "smooth", width: 3, lineCap: "round" },
      markers: {
        size: 5,
        colors: ["#fff"],
        strokeColors: "#6366f1",
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

  const minChartWidth = chartData.length > 7 ? chartData.length * 50 : "100%";

  return (
    <div className="w-full h-full min-h-[300px] overflow-x-auto overflow-y-hidden">
      <div style={{ minWidth: "100%", width: minChartWidth, height: "100%" }}>
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
      // Màu sắc: Cột cao nhất là Cam (Amber), còn lại là Xanh (Blue)
      colors: chartData.map((item) =>
        item.count === maxCount && maxCount > 0 ? "#f59e0b" : "#3b82f6",
      ),
      dataLabels: {
        enabled: true,
        offsetY: -20,
        style: { fontSize: "10px", fontWeight: 700, colors: ["#64748b"] },
        formatter: (val) => (val > 0 ? val : ""),
      },
      xaxis: {
        categories: chartData.map((item) => item.hour),
        labels: {
          style: { fontSize: "9px", colors: "#94a3b8", fontWeight: 600 },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: { show: false },
      legend: { show: false },
      grid: { show: false },
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
    <div className="w-full h-full min-h-[300px] overflow-x-auto overflow-y-hidden">
      <div style={{ minWidth: "500px", height: "100%" }}>
        <ReactApexChart
          options={options}
          series={series}
          type="bar"
          height={300}
          width="100%"
        />
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
      colors: ["#10b981", "#f43f5e"],
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

// 5. Biểu đồ FAQ (PeakHourChart)
export const PeakHourChart = memo(({ data = [] }) => {
  // 1. Clean Series Mapping
  const series = useMemo(
    () => [
      {
        name: "KB có dữ liệu",
        data: data.map(({ answered }) => Number(answered || 0)),
      },
      {
        name: "KB thiếu",
        data: data.map(({ not_answered }) => Number(not_answered || 0)),
      },
    ],
    [data],
  );

  // 2. Clean Options Configuration
  const options = useMemo(
    () => ({
      chart: {
        id: "faq-daily-trend-chart",
        stacked: true, // Giữ stacked để gộp cột
        toolbar: { show: false },
        fontFamily: "Inter, sans-serif",
        sparkline: { enabled: false },
      },
      // Thêm tiêu đề đồng bộ với các biểu đồ khác
      title: {
        text: "XU HƯỚNG CÂU HỎI THEO NGÀY",
        align: "left",
        style: {
          fontSize: "11px",
          color: "#94a3b8",
          fontWeight: 800,
          fontFamily: "Inter, sans-serif",
        },
      },
      colors: ["#10b981", "#f43f5e"],
      plotOptions: {
        bar: {
          columnWidth: "50%",
          // Chỉnh borderRadiusApplication thành 'end' để chỉ bo góc trên cùng của cột tổng
          borderRadius: 4,
          borderRadiusApplication: "end",
        },
      },
      // Loại bỏ đường viền giữa các phần trong cùng 1 cột để nhìn "liền" hơn
      stroke: {
        show: true,
        width: 0,
        colors: ["transparent"],
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: data.map(({ date_vn }) => {
          if (!date_vn) return "N/A";
          const parts = date_vn.split("-");
          // Trả về định dạng DD/MM
          return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : date_vn;
        }),
        labels: {
          style: { colors: "#94a3b8", fontSize: "10px", fontWeight: 600 },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { colors: "#94a3b8", fontSize: "10px" },
          formatter: (val) => Math.floor(val),
        },
      },
      grid: {
        borderColor: "#f1f5f9",
        strokeDashArray: 4,
        padding: { top: 10, bottom: 0 },
      },
      legend: {
        show: true,
        position: "top",
        horizontalAlign: "right",
        fontSize: "11px",
        fontWeight: 700,
        labels: { colors: "#64748b" },
        markers: { radius: 12 },
      },
      tooltip: {
        shared: true, // Gộp dữ liệu khi hover
        intersect: false,
        theme: "light",
        y: { formatter: (val) => `${val} câu hỏi` },
      },
    }),
    [data],
  );

  if (!data?.length) {
    return <EmptyState message="Không có dữ liệu xu hướng câu hỏi hàng ngày" />;
  }

  const minChartWidth = data.length > 7 ? data.length * 45 : "100%";

  return (
    <div className="w-full h-full min-h-[300px] overflow-x-auto overflow-y-hidden">
      <div style={{ minWidth: "100%", width: minChartWidth, height: "100%" }}>
        <ReactApexChart
          options={options}
          series={series}
          type="bar"
          height="100%"
          width="100%"
        />
      </div>
    </div>
  );
});
