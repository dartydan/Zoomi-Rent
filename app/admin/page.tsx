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
  const serialized = JSON.parse(
    JSON.stringify({ ...revenue, mrr, revenuePast12Months })
  );
  return <AdminPageClient revenue={serialized} />;
}
