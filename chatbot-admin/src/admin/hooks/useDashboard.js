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

  // Hàm helper để fetch từng phần dữ liệu
  const fetchSection = useCallback(
    async (key, fetchFn, transformFn) => {
      try {
        let res = await fetchFn(filter);

        // Logic Fallback: Nếu dữ liệu theo filter rỗng, lấy All-time
        const isEmpty =
          !res ||
          (res.kpis && res.kpis.total_sessions === 0) ||
          (Array.isArray(res) && res.length === 0);
        if (isEmpty && filter !== "all") {
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
    [filter],
  );

  useEffect(() => {
    isMounted.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    fetchSection("kpis", dashboardService.getSummary);
    fetchSection("faqAnalysis", dashboardService.getFAQAnalysis);
    fetchSection("keywords", dashboardService.getKeywords);

    fetchSection("userData", dashboardService.getUsers, (res) =>
      Array.isArray(res) ? res : res?.data || [],
    );

    fetchSection("sessions", dashboardService.getSessions, (res) =>
      Array.isArray(res) ? res : res?.data || [],
    );

    const timer = setTimeout(() => setLoading(false), 200);

    return () => {
      isMounted.current = false;
      clearTimeout(timer);
    };
  }, [filter, fetchSection]);

  return { data, loading };
};
