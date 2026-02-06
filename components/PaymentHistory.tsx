"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, ExternalLink, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Invoice {
  id: string;
  number: string | null;
  amountPaid: number;
  currency: string;
  created: number;
  status: string;
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
  refunded?: boolean;
}

interface PaymentHistoryProps {
  invoices: Invoice[];
}

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

function StatusIcon({ status }: { status: string }) {
  if (status === "succeeded" || status === "paid") {
    return <Check className="h-4 w-4 text-green-600 dark:text-green-500" aria-label="Successful payment" />;
  }
  if (status === "failed") {
    return <X className="h-4 w-4 text-destructive" aria-label="Failed payment" />;
  }
  return <span className="text-muted-foreground">—</span>;
}

export function PaymentHistory({ invoices }: PaymentHistoryProps) {
  return (
    <Card className="border-2">
      <CardHeader className="space-y-1 bg-muted/30">
        <CardTitle className="text-lg">Payment history</CardTitle>
        <CardDescription>Past payments and receipt downloads.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {invoices.length === 0 ? (
          <p className="px-6 py-8 text-sm text-center text-muted-foreground">
            Your invoices will appear here once you have made payments.
          </p>
        ) : (
          <>
            {/* Mobile: grid with labels */}
            <div className="block sm:hidden border-t">
              <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 px-4 py-3 border-b bg-muted/30 text-sm font-semibold text-muted-foreground">
                <span className="w-6" aria-label="Status" />
                <span>Date</span>
                <span>Invoice</span>
                <span>Amount</span>
                <span className="text-center">Receipt</span>
              </div>
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 px-4 py-3 items-center border-b last:border-b-0 hover:bg-muted/50 transition-colors text-sm min-w-0"
                >
                  <span className="w-6 flex items-center justify-center">
                    <StatusIcon status={invoice.status} />
                  </span>
                  <span className="font-medium truncate" title={formatDate(invoice.created)}>
                    {formatDate(invoice.created)}
                  </span>
                  <span className="min-w-0">
                    {invoice.hostedInvoiceUrl ? (
                      <a
                        href={invoice.hostedInvoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline underline-offset-4 font-medium truncate block"
                        aria-label={`View invoice ${invoice.number || invoice.id}`}
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-muted-foreground truncate block">
                        {invoice.number || invoice.id}
                      </span>
                    )}
                  </span>
                  <span className="font-semibold truncate min-w-0">
                    {formatAmount(Math.abs(invoice.amountPaid), invoice.currency)}
                    {invoice.refunded && (
                      <Badge variant="secondary" className="ml-1 text-xs shrink-0">
                        Refunded
                      </Badge>
                    )}
                  </span>
                  <span className="flex justify-center min-w-0">
                    {invoice.invoicePdf ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="h-8 w-8 p-0 hover:bg-primary/10 shrink-0"
                      >
                        <a
                          href={invoice.invoicePdf}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Download receipt"
                        >
                          <Download className="h-4 w-4 text-primary" />
                        </a>
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
            {/* Desktop: table */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b-2">
                    <TableHead className="font-semibold pl-6 w-10" aria-label="Status" />
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Invoice</TableHead>
                    <TableHead className="font-semibold">Amount</TableHead>
                    <TableHead className="text-center font-semibold pr-6">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="pl-6 w-10">
                        <StatusIcon status={invoice.status} />
                      </TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        {formatDate(invoice.created)}
                      </TableCell>
                      <TableCell>
                        {invoice.hostedInvoiceUrl ? (
                          <a
                            href={invoice.hostedInvoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-primary hover:underline underline-offset-4 font-medium"
                            aria-label={`View invoice ${invoice.number || invoice.id}`}
                          >
                            View
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : (
                          <span className="font-medium">{invoice.number || invoice.id}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">
                        <span>{formatAmount(Math.abs(invoice.amountPaid), invoice.currency)}</span>
                        {invoice.refunded && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Refunded
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center pr-6">
                        {invoice.invoicePdf ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-8 w-8 p-0 hover:bg-primary/10"
                          >
                            <a
                              href={invoice.invoicePdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Download receipt"
                            >
                              <Download className="h-4 w-4 text-primary" />
                            </a>
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
