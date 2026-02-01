import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { isAdmin } from "@/lib/admin";
import { DashboardLayoutClient } from "./layout-client";

export const dynamic = "force-dynamic";

const CUSTOMER_PORTAL_VIEW_COOKIE = "customer_portal_view";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ok = await isAdmin();
  if (ok) {
    const cookieStore = await cookies();
    const viewCustomer = cookieStore.get(CUSTOMER_PORTAL_VIEW_COOKIE)?.value === "true";
    if (!viewCustomer) redirect("/admin");
  }

  return <DashboardLayoutClient>{children}</DashboardLayoutClient>;
}
