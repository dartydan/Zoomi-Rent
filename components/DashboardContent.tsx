"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { PaymentHistory } from "./PaymentHistory";
import { EndServicesButton } from "./EndServicesButton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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
      // In development mode without auth, show mock data
      const isDevelopment = process.env.NODE_ENV === "development";
      if (isDevelopment && !user) {
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
          hasActiveSubscription: true,
        };
        setData(mockData);
        setLoading(false);
        return;
      }

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
  }, [user]);

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

  const formatNextPayment = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold text-foreground">
            Welcome{user?.firstName ? `, ${user.firstName}` : !user && process.env.NODE_ENV === "development" ? ", Demo User" : ""}
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your washer and dryer rental billing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={handleManageBilling}
            disabled={portalLoading}
            size="lg"
          >
            {portalLoading ? "Opening..." : "Manage Billing"}
          </Button>
          <EndServicesButton />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {data?.nextPaymentDate && (
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-base font-medium">
                Next Payment Date
              </CardTitle>
              <CardDescription className="text-lg font-semibold text-foreground">
                {formatNextPayment(data.nextPaymentDate)}
              </CardDescription>
            </CardHeader>
          </Card>
        )}
        {data && !data.nextPaymentDate && (
          <Card className="border-amber-500/30 bg-amber-500/10 dark:border-amber-500/30 dark:bg-amber-500/10">
            <CardHeader className="space-y-1">
              <CardTitle className="text-base font-medium text-amber-800 dark:text-amber-200">
                No active subscription
              </CardTitle>
              <CardDescription className="text-amber-700 dark:text-amber-300">
                Contact us to set up your rental.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>

      <PaymentHistory invoices={data?.invoices || []} />

      <Separator className="my-6" />

      <section aria-labelledby="recent-activity-heading">
        <h2 id="recent-activity-heading" className="mb-4 text-lg font-semibold text-foreground">
          Recent activity
        </h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Jan 28, 2026</TableCell>
                  <TableCell>Payment received</TableCell>
                  <TableCell><Badge variant="secondary">Complete</Badge></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Jan 15, 2026</TableCell>
                  <TableCell>Invoice sent</TableCell>
                  <TableCell><Badge variant="outline">Sent</Badge></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Jan 1, 2026</TableCell>
                  <TableCell>Subscription renewed</TableCell>
                  <TableCell><Badge variant="secondary">Complete</Badge></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base font-medium">Monthly total</CardTitle>
            <CardDescription className="text-xl font-semibold text-foreground">$60.00</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base font-medium">Rental period</CardTitle>
            <CardDescription>Current month</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base font-medium">Units</CardTitle>
            <CardDescription>1 washer, 1 dryer</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base font-medium">Account</CardTitle>
            <CardDescription>Active</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">Notices</CardTitle>
          <CardDescription>Important updates and tips.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Your next billing date is shown in the Next Payment card above.</p>
          <p>Use Manage Billing to update payment method or view past invoices.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">Support</CardTitle>
          <CardDescription>Get help with your rental.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Questions? Use End Services to contact us by email, or visit the Help section from the sidebar.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
