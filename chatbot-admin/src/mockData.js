export const dashboardData = {
  kpis: [
    {
      label: "Tổng phiên chat",
      value: "0", // Sẽ được tính toán động
      delta: "Tổng 0 câu hỏi",
      type: "neutral",
      description:
        "Tổng số lượt kết nối hội thoại độc lập và tổng số câu hỏi đơn lẻ.",
    },
    {
      label: "Lượt trả lời",
      value: "0",
      delta: "Phản hồi thành công",
      type: "success",
      description: "Số lượng câu hỏi tìm thấy dữ liệu phù hợp.",
    },
    {
      label: "Lượt từ chối",
      value: "0",
      delta: "Cần cập nhật",
      type: "danger",
      description: "Số lượng câu hỏi chatbot không thể phản hồi.",
    },
    {
      label: "Tỉ lệ trả lời",
      value: "0%",
      delta: "+2.5% so với tuần trước",
      type: "success",
      description: "Hiệu suất phản hồi thành công.",
    },
    {
      label: "TB thời gian",
      value: "4.2m",
      delta: "TB 2.6 lượt trao đổi",
      type: "neutral",
      description: "Thời gian trung bình một phiên.",
    },
  ],
  dailyStats: [
    { name: "Mon", answered: 150, refused: 40, rate: 79 },
    { name: "Tue", answered: 130, refused: 35, rate: 78 },
    { name: "Wed", answered: 180, refused: 20, rate: 90 },
    { name: "Thu", answered: 140, refused: 25, rate: 84 },
    { name: "Fri", answered: 190, refused: 30, rate: 86 },
    { name: "Sat", answered: 145, refused: 28, rate: 83 },
    { name: "Sun", answered: 115, refused: 20, rate: 85 },
  ],
  peakHours: Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, "0")}h`,
    count:
      i >= 8 && i <= 22
        ? Math.floor(Math.random() * 60) + 40
        : Math.floor(Math.random() * 10),
  })),
  kbAnalysis: {
    total: 120,
    hasData: 85,
    missingData: 35,
    serviceError: 0,
    rate: 70.8,
    dailyChart: [
      { date: "01/03", hasData: 60, missingData: 10 },
      { date: "05/03", hasData: 95, missingData: 15 },
      { date: "15/03", hasData: 300, missingData: 25 },
      { date: "23/03", hasData: 85, missingData: 35 },
    ],
  },
  // DỮ LIỆU PHIÊN CHAT - Quan trọng để filter hoạt động
  sessions: [
    // --- TODAY (23/03/2026) ---
    {
      id: "SID-9921",
      time: "2026-03-23 10:20",
      messages: 5,
      answered: 4,
      refused: 1,
      duration: "2m 15s",
      result: "Thành công",
    },
    {
      id: "SID-9922",
      time: "2026-03-23 09:15",
      messages: 2,
      answered: 2,
      refused: 0,
      duration: "45s",
      result: "Thành công",
    },

    // --- WEEKLY (7 ngày qua) ---
    {
      id: "SID-9910",
      time: "2026-03-21 14:30",
      messages: 10,
      answered: 8,
      refused: 2,
      duration: "6m 10s",
      result: "Thành công",
    },
    {
      id: "SID-9905",
      time: "2026-03-19 16:45",
      messages: 4,
      answered: 3,
      refused: 1,
      duration: "3m 05s",
      result: "Thành công",
    },
    {
      id: "SID-9890",
      time: "2026-03-17 08:20",
      messages: 12,
      answered: 10,
      refused: 2,
      duration: "8m 45s",
      result: "Thành công",
    },

    // --- MONTHLY (Đầu tháng 3) ---
    {
      id: "SID-9800",
      time: "2026-03-10 11:00",
      messages: 6,
      answered: 4,
      refused: 2,
      duration: "4m 20s",
      result: "Cần cải thiện",
    },
    {
      id: "SID-9750",
      time: "2026-03-05 13:15",
      messages: 3,
      answered: 1,
      refused: 2,
      duration: "1m 50s",
      result: "Thất bại",
    },
    {
      id: "SID-9701",
      time: "2026-03-01 09:00",
      messages: 7,
      answered: 7,
      refused: 0,
      duration: "5m 30s",
      result: "Thành công",
    },
  ],
  refusedQuestions: [
    {
      date: "2026-03-23",
      question: "Làm sao để đăng ký thi lại?",
      tool: "faq_public",
      reason: "refused",
    },
    {
      date: "2026-03-22",
      question: "Quên mật khẩu cấp 2",
      tool: "faq",
      reason: "refused",
    },
  ],
  userData: [
    {
      name: "Nguyễn Văn Đạt",
      department: "Ban Công Nghệ",
      sessions: 45,
      totalQuestions: 156,
      lastActive: "23/03/2026",
    },
    {
      name: "Nguyễn Hồng Hạnh",
      department: "Ban Nội Dung",
      sessions: 32,
      totalQuestions: 98,
      lastActive: "22/03/2026",
    },
  ],
};
