"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExpenseDetailDialog } from "./expense-detail-dialog";
import type { ExpenseTransaction } from "@/lib/finances";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function ExpensesTable({
  transactions,
}: {
  transactions: ExpenseTransaction[];
}) {
  const [selected, setSelected] = useState<ExpenseTransaction | null>(null);
  const [open, setOpen] = useState(false);

  function handleRowClick(tx: ExpenseTransaction) {
    setSelected(tx);
    setOpen(true);
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                No expenses in period
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((tx, i) => (
              <TableRow
                key={`${tx.date}-${tx.unitId}-${tx.amount}-${i}`}
                className="cursor-pointer hover:bg-muted/50 focus-within:bg-muted/50"
                onClick={() => handleRowClick(tx)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleRowClick(tx);
                  }
                }}
                role="button"
                aria-label={`View details for ${tx.description} expense on ${tx.date}`}
              >
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
      <ExpenseDetailDialog
        transaction={selected}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
