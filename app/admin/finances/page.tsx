import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { FinancesPeriodSelect } from "./finances-period-select";

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomingTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No transactions in period
                    </TableCell>
                  </TableRow>
                ) : (
                  incomingTransactions.map((tx, i) => (
                    <TableRow key={`${tx.date}-${tx.amount}-${i}`}>
                      <TableCell>{tx.date}</TableCell>
                      <TableCell>{tx.customerName}</TableCell>
                      <TableCell>{tx.type}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(tx.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Expenses</CardTitle>
            <AddExpenseButton />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenseTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No expenses in period
                    </TableCell>
                  </TableRow>
                ) : (
                  expenseTransactions.map((tx, i) => (
                    <TableRow key={`${tx.date}-${tx.unitId}-${tx.amount}-${i}`}>
                      <TableCell>{tx.date}</TableCell>
                      <TableCell>{tx.description}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(tx.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
