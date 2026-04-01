import axiosClient from "../api/axiosAdmin";

const dashboardService = {
  // Hàm chuẩn hóa mọi loại filter (String hoặc Object) thành Query Params
  formatParams: (filter) => {
    if (!filter || filter === "all") return {};
    if (typeof filter === "string") return { days: filter };

    // Nếu là Object (chứa start_date, month, year...), loại bỏ các field rỗng
    const params = {};
    Object.keys(filter).forEach((key) => {
      if (
        filter[key] !== null &&
        filter[key] !== undefined &&
        filter[key] !== ""
      ) {
        params[key] = filter[key];
      }
    });
    return params;
  },

  getSummary: (f) =>
    axiosClient.get("/summary", { params: dashboardService.formatParams(f) }),
  getKPIs: (f) =>
    axiosClient.get("/kpis", { params: dashboardService.formatParams(f) }),
  getFAQAnalysis: (f) =>
    axiosClient.get("/faq", { params: dashboardService.formatParams(f) }),
  getSessions: (f) =>
    axiosClient.get("/sessions", { params: dashboardService.formatParams(f) }),
  getUsers: (f) =>
    axiosClient.get("/users", { params: dashboardService.formatParams(f) }),
  getKeywords: (f) =>
    axiosClient.get("/keywords", { params: dashboardService.formatParams(f) }),
};

export default dashboardService;
