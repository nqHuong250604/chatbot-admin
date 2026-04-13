import React, { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import EmptyState from "./EmptyState";

const KeywordChart = ({ title, data = [], color }) => {
  const series = [
    {
      name: "Số lần xuất hiện",
      data: data.map((item) => item.count),
    },
  ];

  const options = {
    chart: {
      type: "bar",
      toolbar: { show: false },
      fontFamily: "Inter, sans-serif",
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        barHeight: "65%",
        distributed: true,
      },
    },
    colors: [color],
    fill: {
      type: "gradient",
      gradient: {
        shade: "light",
        type: "horizontal",
        shadeIntensity: 0.25,
        gradientToColors: [color + "88"],
        inverseColors: true,
        opacityFrom: 1,
        opacityTo: 0.6,
      },
    },
    dataLabels: {
      enabled: true,
      textAnchor: "start",
      style: { fontSize: "11px", fontWeight: 800, colors: ["#475569"] },
      offsetX: 10,
      formatter: (val) => val.toLocaleString(),
    },
    xaxis: {
      categories: data.map((item) => item.keyword),
      labels: { show: false },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: {
        style: { colors: "#1e293b", fontSize: "11px", fontWeight: 700 },
      },
    },
    grid: { show: false },
    tooltip: { theme: "light" },
    legend: { show: false },
  };

  return (
    <div className="flex-1 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
      <div className="flex items-center gap-2 mb-4">
        <div
          className={`w-1 h-4 rounded-full`}
          style={{ backgroundColor: color }}
        ></div>
        <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
          {title}
        </h4>
      </div>
      <ReactApexChart
        options={options}
        series={series}
        type="bar"
        height={380}
      />
    </div>
  );
};

const KeywordAnalytics = ({ keywords }) => {
  const words = useMemo(() => keywords?.words?.slice(0, 15) || [], [keywords]);
  const bigrams = useMemo(
    () => keywords?.bigrams?.slice(0, 15) || [],
    [keywords],
  );

  return (
    // Bọc toàn bộ vào một Box trắng lớn để UI không bị trống rỗng
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
      {/* Header section nằm trong Box */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-xl">
          📊
        </div>
        <div className="flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 leading-tight">
            Phân tích từ khóa phổ biến
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mt-1">
            Dữ liệu xu hướng từ câu hỏi của người dùng
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {words.length === 0 && bigrams.length === 0 ? (
          <div className="col-span-1 lg:col-span-2">
            <EmptyState message="Chưa có dữ liệu phân tích từ khóa" className="h-[250px]" />
          </div>
        ) : (
          <>
            {/* Top từ đơn */}
            <KeywordChart title="Phân tích từ đơn" data={words} color="#6366f1" />

            {/* Top cụm 2 từ */}
            <KeywordChart title="Phân tích cụm từ" data={bigrams} color="#10b981" />
          </>
        )}
      </div>

      {/* Footer nhỏ để lấp đầy không gian nếu cần */}
      <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end">
        <span className="text-[10px] text-slate-300 font-medium">
          Dữ liệu cập nhật thời gian thực từ hệ thống
        </span>
      </div>
    </div>
  );
};

export default KeywordAnalytics;
