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
import { TransactionDetailDialog } from "./transaction-detail-dialog";
import type { RevenueTransaction } from "@/lib/admin-revenue";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function IncomingTransactionsTable({
  transactions,
}: {
  transactions: RevenueTransaction[];
}) {
  const [selected, setSelected] = useState<RevenueTransaction | null>(null);
  const [open, setOpen] = useState(false);

  function handleRowClick(tx: RevenueTransaction) {
    setSelected(tx);
    setOpen(true);
  }

  return (
    <>
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
          {transactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No transactions in period
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((tx, i) => (
              <TableRow
                key={`${tx.date}-${tx.amount}-${i}`}
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
                aria-label={`View details for ${tx.customerName} transaction on ${tx.date}`}
              >
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
      <TransactionDetailDialog
        transaction={selected}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
