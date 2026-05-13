import axiosClient, { axiosPublic } from "../api/axiosAdmin";

const KB_PREFIX = "/kb";

export const kbService = {
  getClient: (mode) => (mode === "public" ? axiosPublic : axiosClient),

  // Lấy danh sách tri thức (Hỗ trợ lọc version từ query)
  getList: (params, mode) =>
    kbService.getClient(mode).get(`${KB_PREFIX}/list`, { params }),

  // Thêm 1 cặp Q&A đơn lẻ
  addSingle: (payload, mode) =>
    kbService.getClient(mode).post(`${KB_PREFIX}/single`, payload),

  // Thêm hàng loạt Q&A dạng JSON
  addBatch: (payload, mode) =>
    kbService.getClient(mode).post(`${KB_PREFIX}/batch`, payload),

  // Upload file (TXT, DOCX, CSV, XLSX)
  uploadFile: (file, version, department, mode) => {
    const formData = new FormData();
    formData.append("file", file);
    return kbService.getClient(mode).post(`${KB_PREFIX}/upload`, formData, {
      params: { version, department },
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Xóa bản ghi theo ID (Cần truyền thêm version để xác định đúng bảng)
  delete: (docId, version, mode) =>
    kbService.getClient(mode).delete(`${KB_PREFIX}/${docId}`, {
      params: { version },
    }),
};
