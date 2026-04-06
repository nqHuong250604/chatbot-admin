import React from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const DashboardLoading = () => (
  <div className="min-h-screen bg-[#f8fafc] p-6 md:p-10 font-sans">
    <div className="max-w-[1600px] mx-auto space-y-10">
      {/* Header Skeleton */}
      <div className="flex justify-between items-end border-b border-slate-200 pb-8">
        <div className="space-y-3">
          <Skeleton width={250} height={40} />
          <Skeleton width={400} height={20} />
        </div>
        <Skeleton width={180} height={45} borderRadius={12} />
      </div>

      {/* KPI Row Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm"
          >
            <Skeleton circle width={32} height={32} className="mb-4" />
            <Skeleton height={15} width="60%" className="mb-2" />
            <Skeleton height={30} width="80%" />
          </div>
        ))}
      </div>

      {/* Charts Row Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl border border-slate-100 h-[400px]">
          <Skeleton height={25} width={200} className="mb-6" />
          <Skeleton height={280} />
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-100 h-[400px]">
          <Skeleton height={25} width={200} className="mb-6" />
          <Skeleton height={280} />
        </div>
      </div>

      {/* User Stats & Table Skeleton */}
      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
        <Skeleton height={30} width={300} className="mb-6" />
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Skeleton height={100} borderRadius={12} />
          <Skeleton height={100} borderRadius={12} />
          <Skeleton height={100} borderRadius={12} />
          <Skeleton height={100} borderRadius={12} />
        </div>
        <Skeleton count={5} height={50} className="mb-2" />
      </div>
    </div>
  </div>
);

export default DashboardLoading;
