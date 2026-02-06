import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  computeRevenueForDateRange,
  computeRevenueTransactionsForDateRange,
  getFinancesPeriodBounds,
  getFinancesPeriodDateStrings,
  getFinancesPeriodLabel,
  type FinancesPeriod,
} from "@/lib/admin-revenue";
import {
  computeMoneyOutForPeriod,
  getExpenseTransactions,
} from "@/lib/finances";
import { readManualExpenses } from "@/lib/manual-expenses-store";
import { readUnits } from "@/lib/unit-store";
import { AddExpenseButton } from "./add-expense-button";
import { ExpensesTable } from "./expenses-table";
import { FinancesPeriodSelect } from "./finances-period-select";
import { IncomingTransactionsTable } from "./incoming-transactions-table";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

const PERIODS: FinancesPeriod[] = ["ytd", "this", "last"];

export default async function FinancesPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period = PERIODS.includes(params.period as FinancesPeriod)
    ? (params.period as FinancesPeriod)
    : "ytd";

  const bounds = getFinancesPeriodBounds(period);
  const { startDate, endDate } = getFinancesPeriodDateStrings(period);
  const [moneyIn, units, manualExpenses, incomingTransactions] = await Promise.all([
    computeRevenueForDateRange(bounds.start, bounds.end),
    readUnits(),
    readManualExpenses(),
    computeRevenueTransactionsForDateRange(bounds.start, bounds.end),
  ]);
  const moneyOut = computeMoneyOutForPeriod(units, manualExpenses, startDate, endDate);
  const expenseTransactions = getExpenseTransactions(units, manualExpenses, startDate, endDate);
  const net = moneyIn - moneyOut;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Finances</h1>
          <p className="text-sm text-muted-foreground">
            Revenue, expenses, and cash flow overview
          </p>
        </div>
        <Suspense fallback={<div className="h-10 w-[180px] rounded-md border bg-muted/50" />}>
          <div className="w-[180px]">
            <FinancesPeriodSelect />
          </div>
        </Suspense>
      </div>

      <section>
        <h2 className="sr-only">Summary</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Money In
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(moneyIn)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Stripe revenue · {getFinancesPeriodLabel(period)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Money Out
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(moneyOut)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Unit acquisition + repair costs · {getFinancesPeriodLabel(period)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Net
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-bold ${net >= 0 ? "" : "text-destructive"}`}
              >
                {formatCurrency(net)}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Incoming Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <IncomingTransactionsTable transactions={incomingTransactions} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Expenses</CardTitle>
            <AddExpenseButton />
          </CardHeader>
          <CardContent>
            <ExpensesTable transactions={expenseTransactions} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
