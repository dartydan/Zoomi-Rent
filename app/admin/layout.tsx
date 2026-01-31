import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { AdminLayoutClient } from "./layout-client";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ok = await isAdmin();
  if (!ok) redirect("/");
  
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
