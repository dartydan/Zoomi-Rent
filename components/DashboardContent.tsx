"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { PaymentHistory } from "./PaymentHistory";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

interface Invoice {
  id: string;
  number: string | null;
  amountPaid: number;
  currency: string;
  created: number;
  status: string;
  refunded?: boolean;
  invoicePdf: string | null;
  hostedInvoiceUrl: string | null;
}

interface DashboardData {
  customerId: string | null;
  invoices: Invoice[];
  nextPaymentDate: string | null;
  nextPaymentAmount: { amount: number; currency: string } | null;
  hasActiveSubscription: boolean;
  subscriptionLabel: string | null;
  activeCouponLabel: string | null;
  activeCouponSavings: { amount: number; currency: string } | null;
}

type AdminUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

const CUSTOMER_PORTAL_VIEW_COOKIE = "customer_portal_view";

export function DashboardContent() {
  const { user, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const impersonateUserId = searchParams.get("viewAs") ?? "";
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const isAdmin = (user?.publicMetadata?.role as string | undefined) === "admin";
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);

  useEffect(() => {
    document.cookie = `${CUSTOMER_PORTAL_VIEW_COOKIE}=; path=/; max-age=0`;
  }, []);

  useEffect(() => {
    if (!isLoaded || !isAdmin) return;
    let cancelled = false;
    fetch("/api/admin/users")
      .then((res) => (res.ok ? res.json() : Promise.resolve({ users: [] })))
      .then((body: { users?: AdminUser[] }) => {
        if (!cancelled && body.users?.length) setAdminUsers(body.users);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isLoaded, isAdmin]);

  useEffect(() => {
    if (!isLoaded) return;
    setLoading(true);
    async function fetchData() {
      const isDevelopment = process.env.NODE_ENV === "development";
      if (isDevelopment && !user && !isAdmin) {
        // Mock data for demo purposes
        const mockData: DashboardData = {
          customerId: "demo_customer",
          invoices: [
            {
              id: "in_demo_1",
              number: "INV-001",
              amountPaid: 6000, // $60.00 in cents
              currency: "usd",
              created: Date.now() / 1000 - 30 * 24 * 60 * 60, // 30 days ago
              status: "paid",
              invoicePdf: null,
              hostedInvoiceUrl: null,
            },
            {
              id: "in_demo_2",
              number: "INV-002",
              amountPaid: 6000,
              currency: "usd",
              created: Date.now() / 1000 - 60 * 24 * 60 * 60, // 60 days ago
              status: "paid",
              invoicePdf: null,
              hostedInvoiceUrl: null,
            },
          ],
          nextPaymentDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
          nextPaymentAmount: { amount: 6000, currency: "usd" },
          hasActiveSubscription: true,
          subscriptionLabel: "Washer & Dryer Rental",
          activeCouponLabel: null,
          activeCouponSavings: null,
        };
        setData(mockData);
        setLoading(false);
        return;
      }

      setError(null);
      try {
        const customerUrl = isAdmin && impersonateUserId
          ? `/api/stripe/customer?userId=${encodeURIComponent(impersonateUserId)}`
          : "/api/stripe/customer";
        const customerRes = await fetch(customerUrl, { cache: "no-store" });
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
            nextPaymentAmount: null,
            hasActiveSubscription: false,
            subscriptionLabel: null,
            activeCouponLabel: null,
            activeCouponSavings: null,
          });
          setLoading(false);
          return;
        }

        const [invoicesRes, subscriptionRes] = await Promise.all([
          fetch(`/api/stripe/invoices?customerId=${customerId}`, { cache: "no-store" }),
          fetch(`/api/stripe/subscription?customerId=${customerId}`, { cache: "no-store" }),
        ]);

        const invoicesData = await invoicesRes.json();
        const subscriptionData = await subscriptionRes.json();

        if (!subscriptionRes.ok) {
          const detail = subscriptionData.details ? ` — ${subscriptionData.details}` : "";
          setError((subscriptionData.error || "Failed to load subscription") + detail);
          setLoading(false);
          return;
        }

        setData({
          customerId,
          invoices: invoicesData.invoices || [],
          nextPaymentDate: subscriptionData.nextPaymentDate ?? null,
          nextPaymentAmount: subscriptionData.nextPaymentAmount ?? null,
          activeCouponLabel: subscriptionData.activeCouponLabel ?? null,
          activeCouponSavings: subscriptionData.activeCouponSavings ?? null,
          hasActiveSubscription: subscriptionData.hasActiveSubscription ?? false,
          subscriptionLabel: subscriptionData.subscriptionLabel ?? null,
        });
      } catch (err) {
        setError("Failed to load dashboard");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, isLoaded, isAdmin, impersonateUserId]);

  const handleManageBilling = async () => {
    if (!data?.customerId) return;
    
    // In demo mode, show alert instead of redirecting
    const isDevelopment = process.env.NODE_ENV === "development";
    if (isDevelopment && data.customerId === "demo_customer") {
      alert("Demo Mode: In production, this would open the Stripe billing portal.");
      return;
    }
    
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
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
          <CardDescription className="text-destructive/90">
            {error}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const formatNextPaymentDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const formatNextPaymentAmount = (amount: number, currency: string) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);

  const impersonating = isAdmin && impersonateUserId;
  const impersonateUser = impersonating ? adminUsers.find((u) => u.id === impersonateUserId) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold text-foreground">
            Welcome{!impersonating && user?.firstName ? `, ${user.firstName}` : impersonating && impersonateUser ? ` — viewing ${[impersonateUser.firstName, impersonateUser.lastName].filter(Boolean).join(" ").trim() || impersonateUser.email}` : !user && process.env.NODE_ENV === "development" ? ", Demo User" : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your washer and dryer rental billing.
          </p>
        </div>
        {!impersonating && (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={handleManageBilling}
              disabled={portalLoading}
              size="lg"
            >
              {portalLoading ? "Opening..." : "Manage Billing"}
            </Button>
          </div>
        )}
      </div>

      {data?.nextPaymentDate && (
        <div className="grid min-w-0 gap-4 sm:grid-cols-[1fr_1fr]">
          <Card className="min-w-0 overflow-hidden border-2 bg-gradient-to-br from-background to-muted/30">
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
              <CardTitle className="text-base font-medium text-muted-foreground">Next payment</CardTitle>
              {data.activeCouponLabel && (
                <Badge variant="secondary" className="shrink-0 items-center gap-1.5 text-xs font-normal">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" aria-hidden />
                  {data.activeCouponLabel}
                  {data.activeCouponSavings && data.activeCouponSavings.amount > 0 && (
                    <>
                      {" · "}
                      Save {formatNextPaymentAmount(data.activeCouponSavings.amount, data.activeCouponSavings.currency)}
                    </>
                  )}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-2 overflow-hidden">
              {data.nextPaymentAmount && (
                <p className="min-w-0 break-words text-4xl font-bold text-foreground tracking-tight">
                  {formatNextPaymentAmount(data.nextPaymentAmount.amount, data.nextPaymentAmount.currency)}
                </p>
              )}
              <p className="min-w-0 break-words text-sm text-muted-foreground">
                Due {formatNextPaymentDate(data.nextPaymentDate)}
              </p>
            </CardContent>
          </Card>
          <Card className="min-w-0 overflow-hidden border bg-muted/30">
            <CardHeader className="space-y-1">
              <CardTitle className="text-base font-medium text-muted-foreground">Current Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 overflow-hidden">
              <p className="min-w-0 break-words text-4xl font-bold text-foreground tracking-tight">
                {data.subscriptionLabel || "Active"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {data && !data.nextPaymentDate && (
        <Card className="border-2 border-amber-500/50 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/20 dark:to-amber-900/20">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base font-medium text-amber-900 dark:text-amber-200">
              No active subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Contact us to set up your rental.
            </p>
          </CardContent>
        </Card>
      )}

      <PaymentHistory invoices={data?.invoices || []} />
    </div>
  );
}
