"use client";

import { createContext, useContext, useState, useCallback } from "react";

type GetStartedContextValue = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selectedPlan: string | null;
  openGetStarted: (planName?: string) => void;
};

const GetStartedContext = createContext<GetStartedContextValue | null>(null);

export function GetStartedProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const openGetStarted = useCallback((planName?: string) => {
    setSelectedPlan(planName ?? null);
    setIsOpen(true);
  }, []);

  return (
    <GetStartedContext.Provider value={{ isOpen, setIsOpen, selectedPlan, openGetStarted }}>
      {children}
    </GetStartedContext.Provider>
  );
}

export function useGetStarted() {
  const ctx = useContext(GetStartedContext);
  if (!ctx) {
    throw new Error("useGetStarted must be used within GetStartedProvider");
  }
  return ctx;
}
