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
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Payment History</CardTitle>
        <CardDescription>Manage your payments.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {invoices.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">
            Your invoices will appear here once you have made payments.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>{formatDate(invoice.created)}</TableCell>
                  <TableCell>{invoice.number || invoice.id}</TableCell>
                  <TableCell>
                    {formatAmount(invoice.amountPaid, invoice.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {invoice.invoicePdf ? (
                      <a
                        href={invoice.invoicePdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                      >
                        Download PDF
                      </a>
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
