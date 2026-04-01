import { useState, useEffect, useCallback, useRef } from "react";
import dashboardService from "../services/dashboardService";

export const useDashboard = (filter = "all") => {
  const [data, setData] = useState({
    kpis: null,
    faqAnalysis: null,
    userData: null,
    sessions: null,
    keywords: null,
  });

  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  // Stringify filter để useEffect/useCallback có thể theo dõi sự thay đổi của Object
  const filterKey =
    typeof filter === "object" ? JSON.stringify(filter) : filter;

  const fetchSection = useCallback(
    async (key, fetchFn, transformFn) => {
      try {
        let res = await fetchFn(filter);

        // Logic Fallback: Nếu dữ liệu theo filter rỗng, lấy All-time
        // Lưu ý: filter !== "all" giờ bao gồm cả check Object rỗng
        const isEmpty =
          !res ||
          (res.kpis && res.kpis.total_sessions === 0) ||
          (Array.isArray(res) && res.length === 0);

        if (isEmpty && filter !== "all" && filterKey !== "{}") {
          res = await fetchFn("all");
        }

        if (isMounted.current) {
          setData((prev) => ({
            ...prev,
            [key]: transformFn ? transformFn(res) : res,
          }));
        }
      } catch (err) {
        console.error(`Lỗi load ${key}:`, err);
      }
    },
    [filter, filterKey], // Theo dõi cả giá trị filter và key string của nó
  );

  useEffect(() => {
    isMounted.current = true;
    setLoading(true);

    // Thực hiện fetch đồng thời các section
    const loadAllData = async () => {
      await Promise.all([
        fetchSection("kpis", dashboardService.getSummary),
        fetchSection("faqAnalysis", dashboardService.getFAQAnalysis),
        fetchSection("keywords", dashboardService.getKeywords),
        fetchSection("userData", dashboardService.getUsers, (res) =>
          Array.isArray(res) ? res : res?.data || [],
        ),
        fetchSection("sessions", dashboardService.getSessions, (res) =>
          Array.isArray(res) ? res : res?.data || [],
        ),
      ]);

      if (isMounted.current) {
        setLoading(false);
      }
    };

    loadAllData();

    return () => {
      isMounted.current = false;
    };
  }, [filterKey, fetchSection]); // Chỉ trigger lại khi filter thay đổi thực sự

  return { data, loading };
};
