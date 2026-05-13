import axiosClient, { axiosPublic } from "../api/axiosAdmin";

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

  getClient: (mode) => (mode === "public" ? axiosPublic : axiosClient),

  getSummary: (f, mode) =>
    dashboardService
      .getClient(mode)
      .get("/summary", { params: dashboardService.formatParams(f) }),
  getKPIs: (f, mode) =>
    dashboardService
      .getClient(mode)
      .get("/kpis", { params: dashboardService.formatParams(f) }),
  getFAQAnalysis: (f, mode) =>
    dashboardService
      .getClient(mode)
      .get("/faq", { params: dashboardService.formatParams(f) }),
  getSessions: (f, mode) =>
    dashboardService
      .getClient(mode)
      .get("/sessions", { params: dashboardService.formatParams(f) }),
  getUsers: (f, mode) =>
    dashboardService
      .getClient(mode)
      .get("/users", { params: dashboardService.formatParams(f) }),
  getKeywords: (f, mode) =>
    dashboardService
      .getClient(mode)
      .get("/keywords", { params: dashboardService.formatParams(f) }),
};

export default dashboardService;
