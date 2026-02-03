import { computeAdminRevenue } from "@/lib/admin-revenue";
import { AdminPageClient } from "./admin-page-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const revenue = await computeAdminRevenue();
  return <AdminPageClient revenue={revenue} />;
}
