"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, UserPlus, Mail, Phone, MapPin, Package, Calendar, Check, ChevronRight, Trash2 } from "lucide-react";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { LoadingAnimation } from "@/components/LoadingAnimation";

type Customer = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  address: string | null;
  createdAt: number;
  stripeCustomerId: string | null;
  hasDefaultPaymentMethod?: boolean;
  installDate: string | null;
  installAddress: string | null;
  selectedPlan: string | null;
  /** True when added by admin and not yet signed up (no Clerk user). */
  isPending?: boolean;
};

type PendingCustomer = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  address: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  createdAt: string;
};

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "installed" | "no_install">("all");

  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [addFirstName, setAddFirstName] = useState("");
  const [addLastName, setAddLastName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addStreet, setAddStreet] = useState("");
  const [addCity, setAddCity] = useState("");
  const [addState, setAddState] = useState("");
  const [addZip, setAddZip] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    Promise.all([
      fetch("/api/admin/users", { cache: "no-store", signal: controller.signal }).then((res) => {
        if (!res.ok) return res.json().then((data) => Promise.reject(new Error((data as { error?: string }).error ?? "Failed to load")));
        return res.json() as Promise<{ users: Customer[] }>;
      }),
      fetch("/api/admin/pending-customers", { signal: controller.signal }).then((res) => {
        if (!res.ok) return { pendingCustomers: [] as PendingCustomer[] };
        return res.json() as Promise<{ pendingCustomers: PendingCustomer[] }>;
      }),
    ])
      .then(([usersData, pendingData]) => {
        const clerkEmails = new Set((usersData.users ?? []).map((u) => (u.email ?? "").toLowerCase()));
        const clerkList = (usersData.users ?? []).map((u) => ({
          ...u,
          createdAt: typeof u.createdAt === "number" ? u.createdAt : new Date(String(u.createdAt)).getTime(),
          isPending: false as const,
        }));
        const pendingList = (pendingData.pendingCustomers ?? [])
          .filter((p) => !clerkEmails.has(p.email.toLowerCase()))
          .map((p): Customer => ({
            id: `pending_${p.id}`,
            email: p.email,
            firstName: p.firstName,
            lastName: p.lastName,
            phone: null,
            address: p.address,
            createdAt: new Date(p.createdAt).getTime(),
            stripeCustomerId: null,
            installDate: null,
            installAddress: null,
            selectedPlan: null,
            isPending: true,
          }));
        setCustomers([...clerkList, ...pendingList].sort((a, b) => b.createdAt - a.createdAt));
        setError(null);
      })
      .catch((e) => {
        if ((e as { name?: string }).name === "AbortError") {
          setError("Request timed out. Check your connection and try again.");
        } else {
          setError(e instanceof Error ? e.message : "Failed to load customers");
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const displayAddress = (c: Customer) => c.address ?? c.installAddress ?? null;

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.phone ?? "").includes(searchQuery);

    const hasInstall = !!customer.installDate;
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "installed" && hasInstall) ||
      (filterStatus === "no_install" && !hasInstall);

    return matchesSearch && matchesStatus;
  });

  const totalCustomers = customers.length;
  const withInstall = customers.filter((c) => c.installDate).length;
  const withStripe = customers.filter((c) => c.stripeCustomerId).length;

  function openAddCustomer() {
    setAddFirstName("");
    setAddLastName("");
    setAddEmail("");
    setAddStreet("");
    setAddCity("");
    setAddState("");
    setAddZip("");
    setAddError(null);
    setAddCustomerOpen(true);
  }

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    const firstName = addFirstName.trim();
    const lastName = addLastName.trim();
    const email = addEmail.trim();
    const hasAddress = [addStreet, addCity, addState, addZip].some((s) => s.trim() !== "");
    if (!firstName && !lastName && !email && !hasAddress) {
      setAddError("Enter at least one field (name, email, or address).");
      return;
    }
    setAddSaving(true);
    try {
      const res = await fetch("/api/admin/pending-customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          street: addStreet.trim() || undefined,
          city: addCity.trim() || undefined,
          state: addState.trim() || undefined,
          zip: addZip.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; pendingCustomer?: PendingCustomer };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to add customer");
      }
      setAddCustomerOpen(false);
      const created = data.pendingCustomer;
      if (created) {
        setCustomers((prev) => [
          {
            id: `pending_${created.id}`,
            email: created.email,
            firstName: created.firstName,
            lastName: created.lastName,
            phone: null,
            address: [created.street, created.city, created.state, created.zip].filter(Boolean).join(", ") || created.address,
            createdAt: new Date(created.createdAt).getTime(),
            stripeCustomerId: null,
            installDate: null,
            installAddress: null,
            selectedPlan: null,
            isPending: true,
          },
          ...prev,
        ]);
      }
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Failed to add customer");
    } finally {
      setAddSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customers</h1>
          <p className="text-sm text-muted-foreground">
            Manage customer accounts and subscriptions
          </p>
        </div>
        <Button type="button" onClick={openAddCustomer}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      <Dialog open={addCustomerOpen} onOpenChange={setAddCustomerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add customer</DialogTitle>
            <DialogDescription>
              Add as much info as you have. When they sign up with that email, name and address will pre-fill. At least one field is required.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddCustomer} className="space-y-4">
            {addError && (
              <p className="text-sm text-destructive" role="alert">
                {addError}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="add-first-name">First name</Label>
              <Input
                id="add-first-name"
                value={addFirstName}
                onChange={(e) => setAddFirstName(e.target.value)}
                placeholder="First name (optional)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-last-name">Last name</Label>
              <Input
                id="add-last-name"
                value={addLastName}
                onChange={(e) => setAddLastName(e.target.value)}
                placeholder="Last name (optional)"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-email">Email</Label>
              <Input
                id="add-email"
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="email@example.com (optional)"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="add-street">Street</Label>
                <AddressAutocomplete
                  id="add-street"
                  value={addStreet}
                  onChange={setAddStreet}
                  onPlaceSelect={({ street: s, city: c, state: st, zip: z }) => {
                    setAddStreet(s);
                    setAddCity(c);
                    setAddState(st);
                    setAddZip(z);
                  }}
                  placeholder="Street address (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-city">City</Label>
                <Input
                  id="add-city"
                  value={addCity}
                  onChange={(e) => setAddCity(e.target.value)}
                  placeholder="City (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-state">State</Label>
                <Input
                  id="add-state"
                  value={addState}
                  onChange={(e) => setAddState(e.target.value)}
                  placeholder="State (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-zip">ZIP</Label>
                <Input
                  id="add-zip"
                  value={addZip}
                  onChange={(e) => setAddZip(e.target.value)}
                  placeholder="ZIP (optional)"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddCustomerOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addSaving}>
                {addSaving ? "Adding…" : "Add customer"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!deleting) {
            if (!open) setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent className="max-w-md" onPointerDownOutside={(e) => deleting && e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Delete customer</DialogTitle>
            <DialogDescription>
              {deleteTarget && (
                <>
                  This will permanently delete{" "}
                  <span className="font-medium text-foreground">
                    {[deleteTarget.firstName, deleteTarget.lastName].filter(Boolean).join(" ") || deleteTarget.email || "this customer"}
                  </span>{" "}
                  and unassign any unit. This action cannot be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive" role="alert">
              {deleteError}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteError(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteTarget) return;
                setDeleting(true);
                setDeleteError(null);
                try {
                  const res = await fetch(`/api/admin/users/${deleteTarget.id}`, { method: "DELETE" });
                  const json = await res.json();
                  if (!res.ok) throw new Error(json.error ?? "Failed to delete");
                  setCustomers((prev) => prev.filter((c) => c.id !== deleteTarget.id));
                  setDeleteTarget(null);
                } catch (err) {
                  setDeleteError(err instanceof Error ? err.message : "Failed to delete");
                } finally {
                  setDeleting(false);
                }
              }}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "—" : totalCustomers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">With install date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{loading ? "—" : withInstall}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stripe linked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "—" : withStripe}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={filterStatus === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("all")}
              >
                All
              </Button>
              <Button
                type="button"
                variant={filterStatus === "installed" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("installed")}
              >
                Installed
              </Button>
              <Button
                type="button"
                variant={filterStatus === "no_install" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus("no_install")}
              >
                No install
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-8 flex justify-center">
              <LoadingAnimation size="md" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Install Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right pr-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8 pl-6 pr-6">
                      No customers found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className={`transition-colors ${!customer.isPending ? "cursor-pointer hover:bg-muted" : "hover:bg-muted/50"}`}
                      role={!customer.isPending ? "button" : undefined}
                      tabIndex={!customer.isPending ? 0 : undefined}
                      onClick={
                        !customer.isPending
                          ? () => router.push(`/admin/users/${customer.id}`)
                          : undefined
                      }
                      onKeyDown={
                        !customer.isPending
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                router.push(`/admin/users/${customer.id}`);
                              }
                            }
                          : undefined
                      }
                    >
                      <TableCell className="pl-6">
                        <div className="font-medium">
                          {[customer.firstName, customer.lastName].filter(Boolean).join(" ") || "—"}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {displayAddress(customer) || "No address"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                          {customer.email ?? "—"}
                        </div>
                        {customer.phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <Phone className="h-3 w-3 shrink-0" />
                            {customer.phone}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {customer.selectedPlan ?? "—"}
                      </TableCell>
                      <TableCell>
                        {customer.stripeCustomerId ? (
                          <div className="flex items-center gap-2">
                            {customer.hasDefaultPaymentMethod ? (
                              <Check className="h-4 w-4 text-green-600 shrink-0" aria-hidden />
                            ) : (
                              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <span className="text-sm">Linked</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.isPending ? (
                          <span className="text-muted-foreground text-sm">—</span>
                        ) : customer.installDate ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                            {new Date(customer.installDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not scheduled</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {customer.isPending ? (
                          <Badge variant="secondary">Pending sign-up</Badge>
                        ) : (
                          <Badge variant={customer.installDate ? "default" : "outline"}>
                            {customer.installDate ? "Installed" : "—"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              setDeleteError(null);
                              setDeleteTarget(customer);
                            }}
                            aria-label={`Delete ${[customer.firstName, customer.lastName].filter(Boolean).join(" ") || "customer"}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          {!customer.isPending && (
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
