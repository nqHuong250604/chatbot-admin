import axiosClient, { axiosPublic } from "../api/axiosAdmin";

const KB_PREFIX = "/kb";

export const kbService = {
  getClient: (mode) => (mode === "public" ? axiosPublic : axiosClient),

  // Lấy danh sách tri thức (Hỗ trợ lọc version từ query)
  getList: (params, mode) => {
    const finalParams = mode === "public" ? { ...params, version: undefined } : params;
    return kbService.getClient(mode).get(`${KB_PREFIX}/list`, { params: finalParams });
  },

  // Thêm 1 cặp Q&A đơn lẻ
  addSingle: (payload, mode) => {
    const data = mode === "public" ? { ...payload, title: payload.version } : payload;
    return kbService.getClient(mode).post(`${KB_PREFIX}/single`, data);
  },

  // Thêm hàng loạt Q&A dạng JSON
  addBatch: (payload, mode) => {
    const data = mode === "public" ? { ...payload, title: payload.version } : payload;
    return kbService.getClient(mode).post(`${KB_PREFIX}/batch`, data);
  },

  // Upload file (TXT, DOCX, CSV, XLSX)
  uploadFile: (file, version, department, mode) => {
    const formData = new FormData();
    formData.append("file", file);
    const params = mode === "public" ? { title: version, department } : { version, department };
    return kbService.getClient(mode).post(`${KB_PREFIX}/upload`, formData, {
      params,
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Xóa bản ghi theo ID (Cần truyền thêm version để xác định đúng bảng)
  delete: (docId, version, mode) => {
    const params = mode === "public" ? {} : { version };
    return kbService.getClient(mode).delete(`${KB_PREFIX}/${docId}`, { params });
  },
};
