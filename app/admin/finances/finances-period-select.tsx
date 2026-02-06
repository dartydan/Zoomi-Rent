"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  getFinancesPeriodLabel,
  type FinancesPeriod,
} from "@/lib/admin-revenue";

const PERIODS: FinancesPeriod[] = ["ytd", "this", "last"];

export function FinancesPeriodSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const period = searchParams.get("period") ?? "ytd";
  const value = PERIODS.includes(period as FinancesPeriod) ? period : "ytd";

  return (
    <CustomSelect
      options={PERIODS.map((p) => ({ value: p, label: getFinancesPeriodLabel(p) }))}
      value={value}
      onChange={(v) => router.push(`/admin/finances?period=${v}`)}
      placeholder="Select period"
    />
  );
}
