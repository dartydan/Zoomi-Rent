"use client";

import { createContext, useContext } from "react";

const AdminCanEditContext = createContext<boolean>(false);

export function AdminCanEditProvider({
  children,
  canEdit: value,
}: {
  children: React.ReactNode;
  canEdit: boolean;
}) {
  return (
    <AdminCanEditContext.Provider value={value}>
      {children}
    </AdminCanEditContext.Provider>
  );
}

export function useCanEdit(): boolean {
  return useContext(AdminCanEditContext);
}
