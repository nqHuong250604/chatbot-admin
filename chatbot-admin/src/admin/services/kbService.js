import axiosClient from "../api/axiosAdmin";

const KB_PREFIX = "/kb";

export const kbService = {
  // Lấy danh sách tri thức (Hỗ trợ lọc version từ query)
  getList: (params) => axiosClient.get(`${KB_PREFIX}/list`, { params }),

  // Thêm 1 cặp Q&A đơn lẻ
  addSingle: (payload) => axiosClient.post(`${KB_PREFIX}/single`, payload),

  // Thêm hàng loạt Q&A dạng JSON
  addBatch: (payload) => axiosClient.post(`${KB_PREFIX}/batch`, payload),

  // Upload file (TXT, DOCX, CSV, XLSX)
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return axiosClient.post(`${KB_PREFIX}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Xóa bản ghi theo ID
  delete: (docId) => axiosClient.delete(`${KB_PREFIX}/${docId}`),
};
