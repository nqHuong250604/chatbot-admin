import React, { createContext, useContext, useState, useEffect } from "react";

const DashboardModeContext = createContext();

export const DashboardModeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem("dashboard_mode") || "internal";
  });

  useEffect(() => {
    localStorage.setItem("dashboard_mode", mode);
  }, [mode]);

  return (
    <DashboardModeContext.Provider value={{ mode, setMode }}>
      {children}
    </DashboardModeContext.Provider>
  );
};

export const useDashboardMode = () => {
  const context = useContext(DashboardModeContext);
  if (!context) {
    throw new Error("useDashboardMode must be used within a DashboardModeProvider");
  }
  return context;
};
