"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { PaymentHistory } from "./PaymentHistory";
import { EndServicesButton } from "./EndServicesButton";

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

interface DashboardData {
  customerId: string | null;
  invoices: Invoice[];
  nextPaymentDate: string | null;
  hasActiveSubscription: boolean;
}

export function DashboardContent() {
  const { user } = useUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const customerRes = await fetch("/api/stripe/customer");
        const customerData = await customerRes.json();

        if (!customerRes.ok) {
          setError(customerData.error || "Failed to load customer");
          setLoading(false);
          return;
        }

        const customerId = customerData.customerId;
        if (!customerId) {
          setData({
            customerId: null,
            invoices: [],
            nextPaymentDate: null,
            hasActiveSubscription: false,
          });
          setLoading(false);
          return;
        }

        const [invoicesRes, subscriptionRes] = await Promise.all([
          fetch(`/api/stripe/invoices?customerId=${customerId}`),
          fetch(`/api/stripe/subscription?customerId=${customerId}`),
        ]);

        const invoicesData = await invoicesRes.json();
        const subscriptionData = await subscriptionRes.json();

        setData({
          customerId,
          invoices: invoicesData.invoices || [],
          nextPaymentDate: subscriptionData.nextPaymentDate,
          hasActiveSubscription: subscriptionData.hasActiveSubscription,
        });
      } catch (err) {
        setError("Failed to load dashboard");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleManageBilling = async () => {
    if (!data?.customerId) return;
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: data.customerId }),
      });
      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        setError("Failed to open billing portal");
      }
    } catch (err) {
      setError("Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-pulse text-slate-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        {error}
      </div>
    );
  }

  const formatNextPayment = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome{user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="mt-1 text-slate-600">
            Manage your washer and dryer rental billing.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleManageBilling}
            disabled={portalLoading}
            className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {portalLoading ? "Opening..." : "Manage Billing"}
          </button>
          <EndServicesButton />
        </div>
      </div>

      {data?.nextPaymentDate && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-medium text-slate-700">
            Next Payment Date
          </h2>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {formatNextPayment(data.nextPaymentDate)}
          </p>
        </div>
      )}

      {data && !data.nextPaymentDate && (
        <div className="rounded-lg border border-slate-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            No active subscription. Contact us to set up your rental.
          </p>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">
          Payment History
        </h2>
        <PaymentHistory invoices={data?.invoices || []} />
      </div>
    </div>
  );
}
