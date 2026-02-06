"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";
import type { ExpenseTransaction } from "@/lib/finances";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function ExpenseDetailDialog({
  transaction,
  open,
  onOpenChange,
}: {
  transaction: ExpenseTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Expense details</DialogTitle>
        </DialogHeader>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Date</dt>
            <dd>{transaction.date}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Description</dt>
            <dd>{transaction.description}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Amount</dt>
            <dd className="font-medium">{formatCurrency(transaction.amount)}</dd>
          </div>
          {transaction.store && (
            <div>
              <dt className="text-muted-foreground">Store</dt>
              <dd>{transaction.store}</dd>
            </div>
          )}
          {transaction.receiptUrl && (
            <div>
              <dt className="text-muted-foreground">Receipt</dt>
              <dd>
                <a
                  href={transaction.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                >
                  View receipt
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              </dd>
            </div>
          )}
          {transaction.receiptPhotoUrl && (
            <div>
              <dt className="text-muted-foreground">Photo of receipt</dt>
              <dd>
                <a
                  href={transaction.receiptPhotoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                >
                  View photo
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              </dd>
            </div>
          )}
          {transaction.unitId && (
            <div>
              <dt className="text-muted-foreground">Inventory connected</dt>
              <dd>
                <Link
                  href={`/admin/units/${transaction.unitId}`}
                  className="inline-flex items-center gap-1 text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                >
                  View unit
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </dd>
            </div>
          )}
          {transaction.acquisitionSource && (
            <div>
              <dt className="text-muted-foreground">Acquisition source</dt>
              <dd>{transaction.acquisitionSource}</dd>
            </div>
          )}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
