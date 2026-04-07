import {
  computeAdminRevenue,
  computeMRR,
  computeRevenuePast12Months,
} from "@/lib/admin-revenue";
import { AdminPageClient } from "./admin-page-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [revenue, mrr, revenuePast12Months] = await Promise.all([
    computeAdminRevenue(),
    computeMRR(),
    computeRevenuePast12Months(),
  ]);

  // Build an explicit plain object for the client boundary.
  const plainRevenue = {
    lastMonthRevenue: Number(revenue?.lastMonthRevenue ?? 0),
    lastMonthName: String(revenue?.lastMonthName ?? ""),
    thisMonthRevenue: Number(revenue?.thisMonthRevenue ?? 0),
    thisMonthName: String(revenue?.thisMonthName ?? ""),
    nextMonthForecast: Number(revenue?.nextMonthForecast ?? 0),
    nextMonthName: String(revenue?.nextMonthName ?? ""),
    mrr: Number(mrr ?? 0),
    revenuePast12Months: Number(revenuePast12Months ?? 0),
  };

  return <AdminPageClient revenue={plainRevenue} />;
}
