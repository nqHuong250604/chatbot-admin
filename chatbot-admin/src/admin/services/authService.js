import axiosClient from "../api/axiosAdmin";

const AUTH_PREFIX = "/auth";

export const authService = {
  /**
   * Yêu cầu gửi OTP đến email
   * @param {string} email
   * @returns {Promise<{ ok: boolean, message: string, ttl_minutes: number }>}
   */
  requestOtp: (email) => axiosClient.post(`${AUTH_PREFIX}/request-otp`, { email }),

  /**
   * Xác thực mã OTP
   * @param {string} email
   * @param {string} otp_code
   * @returns {Promise<{ ok: boolean, access_token: string, user: any }>}
   */
  verifyOtp: (email, otp_code) => axiosClient.post(`${AUTH_PREFIX}/verify-otp`, { email, otp_code }),

  /**
   * Kiểm tra session hiện tại
   * @returns {Promise<{ ok: boolean, user: any }>}
   */
  checkSession: () => axiosClient.get(`${AUTH_PREFIX}/session`),

  /**
   * Đăng xuất
   */
  logout: () => axiosClient.post(`${AUTH_PREFIX}/logout`),
};
