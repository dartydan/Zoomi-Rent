"use client";

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
  if (invoices.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center text-slate-600">
        <p>No payment history yet.</p>
        <p className="mt-1 text-sm">Your invoices will appear here once you have made payments.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
              Date
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
              Invoice
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700">
              Amount
            </th>
            <th className="px-4 py-3 text-right text-sm font-medium text-slate-700">
              PDF
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-sm text-slate-900">
                {formatDate(invoice.created)}
              </td>
              <td className="px-4 py-3 text-sm text-slate-900">
                {invoice.number || invoice.id}
              </td>
              <td className="px-4 py-3 text-sm text-slate-900">
                {formatAmount(invoice.amountPaid, invoice.currency)}
              </td>
              <td className="px-4 py-3 text-right">
                {invoice.invoicePdf ? (
                  <a
                    href={invoice.invoicePdf}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                  >
                    Download PDF
                  </a>
                ) : (
                  <span className="text-sm text-slate-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
