"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";
import type { RevenueTransaction } from "@/lib/admin-revenue";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

const STRIPE_DASHBOARD_BASE = "https://dashboard.stripe.com";

export function TransactionDetailDialog({
  transaction,
  open,
  onOpenChange,
}: {
  transaction: RevenueTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!transaction) return null;

  const stripeTxUrl = transaction.stripeTxId.startsWith("txn_")
    ? `${STRIPE_DASHBOARD_BASE}/balance/transactions/${transaction.stripeTxId}`
    : `${STRIPE_DASHBOARD_BASE}/payments/${transaction.stripeTxId}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transaction details</DialogTitle>
        </DialogHeader>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Date</dt>
            <dd>{transaction.date}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Customer</dt>
            <dd>{transaction.customerName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Type</dt>
            <dd className="capitalize">{transaction.type}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Amount</dt>
            <dd className="font-medium">{formatCurrency(transaction.amount)}</dd>
          </div>
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
          <div>
            <dt className="text-muted-foreground">Stripe</dt>
            <dd>
              <a
                href={stripeTxUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
              >
                Open in Stripe dashboard
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </dd>
          </div>
        </dl>
      </DialogContent>
    </Dialog>
  );
}
