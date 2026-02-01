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
import { Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Invoice {
  id: string;
  number: string | null;
  amountPaid: number;
  currency: string;
  created: number;
  status: string;
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
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
  });
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
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b-2">
                <TableHead className="font-semibold pl-6">Date</TableHead>
                <TableHead className="font-semibold">Invoice</TableHead>
                <TableHead className="font-semibold">Amount</TableHead>
                <TableHead className="text-center font-semibold pr-6">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium pl-6">
                    {formatDate(invoice.created)}
                  </TableCell>
                  <TableCell>
                    {invoice.hostedInvoiceUrl ? (
                      <a
                        href={invoice.hostedInvoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-primary hover:underline underline-offset-4 font-medium"
                      >
                        {invoice.number || invoice.id}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <span className="font-medium">{invoice.number || invoice.id}</span>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatAmount(invoice.amountPaid, invoice.currency)}
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
        )}
      </CardContent>
    </Card>
  );
}
