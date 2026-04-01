import axiosClient from "../api/axiosAdmin";

const dashboardService = {
  getDaysParam(filter) {
    const mapping = {
      today: 1,
      weekly: 7,
      monthly: 30,
      all: null,
    };
    return mapping[filter];
  },

  getSummary: (f) => {
    const days = dashboardService.getDaysParam(f);
    const params = days ? { days } : {};

    return axiosClient.get("/summary", { params });
  },

  getKPIs: (f) => {
    const days = dashboardService.getDaysParam(f);
    return axiosClient.get("/kpis", { params: days ? { days } : {} });
  },

  getFAQAnalysis: (f) => {
    const days = dashboardService.getDaysParam(f);
    const params = days ? { days } : {};
    return axiosClient.get("/faq", { params });
  },

  getSessions: (f) => {
    const days = dashboardService.getDaysParam(f);
    return axiosClient.get("/sessions", {
      params: { ...(days && { days }) },
    });
  },

  getUsers: (f) => {
    const days = dashboardService.getDaysParam(f);
    return axiosClient.get("/users", { params: days ? { days } : {} });
  },

  getKeywords: (f) => {
    const days = dashboardService.getDaysParam(f);
    return axiosClient.get("/keywords", { params: days ? { days } : {} });
  },
};

export default dashboardService;
