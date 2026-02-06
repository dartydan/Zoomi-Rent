"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useCanEdit } from "./can-edit-context";
import type { AdminRevenueData, RevenueTransaction } from "@/lib/admin-revenue";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, User, Mail, Clock, Package, CheckCircle, Repeat, FileText, ExternalLink, Pencil } from "lucide-react";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { estDateTimeToISO } from "@/lib/utils";
import { TimeSelect, timeToNearestOption } from "@/components/TimeSelect";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Install = {
  id: string;
  userId?: string; // Link to customer detail page
  customerName: string;
  address: string;
  date: Date;
  time: string;
  unitId: string | null; // Connected unit ID
  status: "scheduled" | "installed";
};

type Customer = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function AdminPageClient({ revenue: initialRevenue }: { revenue: AdminRevenueData }) {
  const canEdit = useCanEdit();
  const [revenue, setRevenue] = useState<AdminRevenueData>(initialRevenue);
  const [installs, setInstalls] = useState<Install[]>([]);
  const [installsLoading, setInstallsLoading] = useState(true);
  const [selectedInstall, setSelectedInstall] = useState<Install | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDateForAdd, setSelectedDateForAdd] = useState<Date | null>(null);
  const [startDate, setStartDate] = useState(new Date());
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string>("08:00");
  const [selectedUnits, setSelectedUnits] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("pending");

  const [transactionsDialog, setTransactionsDialog] = useState<{
    month: "last" | "this" | "next";
    monthName: string;
  } | null>(null);
  const [transactions, setTransactions] = useState<RevenueTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  const [editingInstallDate, setEditingInstallDate] = useState(false);
  const [editingInstallTime, setEditingInstallTime] = useState(false);
  const [editDateValue, setEditDateValue] = useState("");
  const [editTimeValue, setEditTimeValue] = useState("");
  const [installDateSaving, setInstallDateSaving] = useState(false);
  const editDateValueRef = useRef(editDateValue);
  const editTimeValueRef = useRef(editTimeValue);
  editDateValueRef.current = editDateValue;
  editTimeValueRef.current = editTimeValue;

  useEffect(() => {
    if (!selectedInstall) {
      setEditingInstallDate(false);
      setEditingInstallTime(false);
    }
  }, [selectedInstall]);

  // Fetch revenue on mount and periodically
  useEffect(() => {
    function fetchRevenue() {
      fetch("/api/admin/revenue", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: AdminRevenueData | null) => {
          if (data) setRevenue(data);
        })
        .catch(() => {});
    }
    fetchRevenue();
    const interval = setInterval(fetchRevenue, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Fetch transactions when dialog opens
  useEffect(() => {
    if (!transactionsDialog) return;
    setTransactionsLoading(true);
    fetch(`/api/admin/revenue/transactions?month=${transactionsDialog.month}`)
      .then((res) => (res.ok ? res.json() : { transactions: [] }))
      .then((data: { transactions?: RevenueTransaction[] }) => {
        setTransactions(data.transactions ?? []);
      })
      .catch(() => setTransactions([]))
      .finally(() => setTransactionsLoading(false));
  }, [transactionsDialog]);

  // Fetch installs (from users with installDate) and units (for assigned unit IDs)
  useEffect(() => {
    let cancelled = false;
    async function fetchInstalls() {
      setInstallsLoading(true);
      try {
        const [usersRes, unitsRes] = await Promise.all([
          fetch("/api/admin/users"),
          fetch("/api/admin/units"),
        ]);
        if (!usersRes.ok) throw new Error("Failed to load");
        const usersData = (await usersRes.json()) as { users: Array<{ id: string; firstName: string | null; lastName: string | null; installDate: string | null; installAddress?: string | null; address?: string | null }> };
        const unitsData = (await unitsRes.json()) as { units?: Array<{ id: string; assignedUserId?: string | null }> };
        const users = usersData.users ?? [];
        const units = unitsData.units ?? [];
        const userIdToUnitId = new Map<string, string>();
        for (const u of units) {
          if (u.assignedUserId) userIdToUnitId.set(u.assignedUserId, u.id);
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const list: Install[] = users
          .filter((u) => u.installDate)
          .map((u) => {
            const date = parseDateForDisplay(u.installDate!);
            const isPast = date < today;
            return {
              id: u.id,
              userId: u.id,
              customerName: [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || "—",
              address: u.installAddress ?? u.address ?? "—",
              date,
              time: formatInstallTime(u.installDate!),
              unitId: userIdToUnitId.get(u.id) ?? null,
              status: isPast ? "installed" : "scheduled",
            };
          });
        if (!cancelled) setInstalls(list);
      } catch {
        if (!cancelled) setInstalls([]);
      } finally {
        if (!cancelled) setInstallsLoading(false);
      }
    }
    fetchInstalls();
    return () => { cancelled = true; };
  }, []);

  const refetchInstalls = async () => {
    try {
      const [usersRes, unitsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/units"),
      ]);
      if (!usersRes.ok) return;
      const usersData = (await usersRes.json()) as { users: Array<{ id: string; firstName: string | null; lastName: string | null; installDate: string | null; installAddress?: string | null; address?: string | null }> };
      const unitsData = (await unitsRes.json()) as { units?: Array<{ id: string; assignedUserId?: string | null }> };
      const users = usersData.users ?? [];
      const units = unitsData.units ?? [];
      const userIdToUnitId = new Map<string, string>();
      for (const u of units) {
        if (u.assignedUserId) userIdToUnitId.set(u.assignedUserId, u.id);
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const list: Install[] = users
        .filter((u) => u.installDate)
        .map((u) => {
          const date = parseDateForDisplay(u.installDate!);
          const isPast = date < today;
          return {
            id: u.id,
            userId: u.id,
            customerName: [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || "—",
            address: u.installAddress ?? u.address ?? "—",
            date,
            time: formatInstallTime(u.installDate!),
            unitId: userIdToUnitId.get(u.id) ?? null,
            status: isPast ? "installed" : "scheduled",
          };
        });
      setInstalls(list);
    } catch {
      // ignore
    }
  };

  // Inventory from units API
  const [inventory, setInventory] = useState<{ total: number; assigned: number }>({ total: 0, assigned: 0 });
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/units")
      .then((res) => res.ok ? res.json() : { units: [] })
      .then((data: { units?: Array<{ assignedUserId?: string | null }> }) => {
        const units = data.units ?? [];
        if (!cancelled) setInventory({ total: units.length, assigned: units.filter((u) => u.assignedUserId).length });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const totalInventory = inventory.total;
  const unitsRented = inventory.assigned;
  const unitsAvailable = Math.max(0, inventory.total - inventory.assigned);
  
  // Fetch customers when add dialog opens
  useEffect(() => {
    if (isAddDialogOpen) {
      fetch("/api/admin/users")
        .then((res) => res.ok ? res.json() : { users: [] })
        .then((data: { users?: Customer[] }) => setCustomers(data.users ?? []))
        .catch(() => setCustomers([]));
    }
  }, [isAddDialogOpen]);
  
  // Navigation functions for 1-week periods
  const goToPreviousWeek = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() - 7);
    setStartDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + 7);
    setStartDate(newDate);
  };

  // Generate array of 7 days starting from startDate
  const getDaysInView = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const daysInView = getDaysInView();

  // Get date range for display
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  
  const EST = "America/New_York";
  const parseDateForDisplay = (iso: string): Date => {
    const t = iso.trim();
    if (!t) return new Date(NaN);
    if (/^\d{4}-\d{2}-\d{2}(T00:00:00(\.000)?Z)?$/.test(t)) {
      return new Date(t.slice(0, 10) + "T12:00:00.000Z");
    }
    if (t.endsWith("Z") || (t.includes("-") && t.lastIndexOf("-") > 10)) return new Date(t);
    if (t.includes("T") && t.length >= 16) return new Date(t.length >= 19 ? t.slice(0, 19) : t.slice(0, 16) + ":00");
    return new Date(iso);
  };
  const formatInstallTime = (iso: string): string => {
    const t = iso.trim();
    if (!t || !t.includes("T") || t.length < 16) return "—";
    if (/^\d{4}-\d{2}-\d{2}T12:00:00(\.000)?Z$/.test(t)) return "—";
    const d = parseDateForDisplay(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: EST });
  };
  const formatDateRange = () => {
    const start = startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: EST });
    const end = endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: EST });
    return `${start} - ${end}`;
  };
  
  // Helper function to check if two dates are the same day
  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };
  
  // Get installs for a specific date, earliest time first (sort by date.getTime())
  const getInstallsForDate = (date: Date) => {
    return installs
      .filter((install) => isSameDay(install.date, date))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold text-foreground">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Business performance and operations at a glance
          </p>
        </div>
      </div>

      {/* Units Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Units Overview</CardTitle>
          <CardDescription>Inventory status and fleet utilization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Rented
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
                {unitsRented}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {totalInventory > 0 ? `${((unitsRented / totalInventory) * 100).toFixed(0)}% utilization` : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Available
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
                {unitsAvailable}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Ready for rental
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                All
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">
                {totalInventory}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Units in fleet
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue Overview</CardTitle>
          <CardDescription>Track income and forecasted growth • Click amounts to view transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 min-w-0 overflow-hidden">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {revenue.lastMonthName}
              </p>
              <button
                type="button"
                onClick={() =>
                  setTransactionsDialog({ month: "last", monthName: revenue.lastMonthName })
                }
                className="block w-full text-left text-2xl sm:text-3xl font-bold text-foreground hover:opacity-80 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded tabular-nums"
              >
                {formatCurrency(revenue.lastMonthRevenue)}
              </button>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 min-w-0 overflow-hidden">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {revenue.thisMonthName}
              </p>
              <button
                type="button"
                onClick={() =>
                  setTransactionsDialog({ month: "this", monthName: revenue.thisMonthName })
                }
                className="block w-full text-left text-2xl sm:text-3xl font-bold text-foreground hover:opacity-80 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded tabular-nums"
              >
                {formatCurrency(revenue.thisMonthRevenue)}
              </button>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 min-w-0 overflow-hidden">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {revenue.nextMonthName}
              </p>
              <button
                type="button"
                onClick={() =>
                  setTransactionsDialog({ month: "next", monthName: revenue.nextMonthName })
                }
                className="block w-full text-left text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-500 hover:opacity-80 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded tabular-nums"
              >
                {formatCurrency(revenue.nextMonthForecast)}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Dialog */}
      <Dialog
        open={!!transactionsDialog}
        onOpenChange={(open) => !open && setTransactionsDialog(null)}
      >
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {transactionsDialog?.monthName ?? ""} Transactions
            </DialogTitle>
            <DialogDescription>
              Incoming transactions that account for the total displayed
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto -mx-6 px-6">
            {transactionsLoading ? (
              <div className="flex justify-center py-2">
                <LoadingAnimation />
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">No transactions</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-9">Type</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t, i) => (
                    <TableRow key={`${t.date}-${t.customerName}-${t.amount}-${i}`}>
                      <TableCell>
                        {t.type === "subscription" ? (
                          <span title="Subscription">
                            <Repeat
                              className="h-4 w-4 text-muted-foreground"
                              aria-label="Subscription"
                            />
                          </span>
                        ) : (
                          <span title="One-off invoice">
                            <FileText
                              className="h-4 w-4 text-muted-foreground"
                              aria-label="One-off invoice"
                            />
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{t.customerName}</TableCell>
                      <TableCell>
                        {new Date((t.dateTimestamp ?? 0) * 1000).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          timeZone: EST,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        ${t.amount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Install Calendar */}
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Installation Schedule</CardTitle>
              <CardDescription className="md:hidden">Tap to view details</CardDescription>
              <CardDescription className="hidden md:block">1-week view • Tap a date to view details</CardDescription>
            </div>
            <div className="flex items-center justify-between w-full min-w-0 gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={goToPreviousWeek}
                aria-label="Previous week"
                className="shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex-1 min-w-0 flex justify-center">
                <span className="text-sm font-semibold truncate">
                  {formatDateRange()}
                </span>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={goToNextWeek}
                aria-label="Next week"
                className="shrink-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile: list view of week (7 days) */}
          <div className="block md:hidden space-y-3">
            {daysInView.map((date, i) => {
              const installsForDay = getInstallsForDate(date);
              const isToday = isSameDay(date, new Date());
              const dayLabel = date.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                timeZone: EST,
              });
              return (
                <div
                  key={i}
                  className={`rounded-lg border-2 overflow-hidden ${
                    isToday ? "border-primary/60 bg-primary/5" : "border-border"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!canEdit) return;
                      setSelectedDateForAdd(date);
                      setIsAddDialogOpen(true);
                    }}
                    disabled={!canEdit}
                    className="w-full px-3 py-2 border-b border-border bg-muted/30 text-left hover:bg-muted/50 transition-colors disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:bg-muted/30"
                  >
                    <span className={`text-sm font-semibold ${isToday ? "text-primary" : "text-foreground"}`}>
                      {dayLabel}
                    </span>
                  </button>
                  <div className="divide-y divide-border">
                    {installsForDay.length > 0 ? (
                      installsForDay.map((install, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setSelectedInstall(install);
                            setIsDialogOpen(true);
                          }}
                          className="w-full text-left px-3 py-3 min-h-[48px] bg-background active:bg-muted transition-colors touch-manipulation flex flex-col gap-0.5"
                        >
                          <span className="font-semibold text-primary text-sm">{install.time}</span>
                          <span className="text-foreground text-sm">{install.customerName}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-sm text-muted-foreground">
                        No installs
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: 7-day calendar grid */}
          <div className="hidden md:grid grid-cols-7 gap-3">
            {daysInView.map((date, i) => {
              const installsForDay = getInstallsForDate(date);
              const hasInstalls = installsForDay.length > 0;
              const isToday = isSameDay(date, new Date());
              
              const dayName = date.toLocaleDateString("en-US", { weekday: "short", timeZone: EST });
              const dayNum = date.getDate();
              
              return (
                <div
                  key={i}
                  className={`relative flex flex-col rounded-lg border-2 p-3 transition-all min-h-[140px] ${
                    isToday
                      ? "border-primary/60 bg-primary/5"
                      : hasInstalls
                      ? "border-primary/30"
                      : "border-border"
                  }`}
                >
                  {/* Date header - click to add installation */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!canEdit) return;
                      setSelectedDateForAdd(date);
                      setIsAddDialogOpen(true);
                    }}
                    disabled={!canEdit}
                    className="flex items-center justify-between mb-2 pb-2 border-b border-border w-full text-left hover:bg-muted/50 rounded-t transition-colors -m-3 p-3 mb-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase">
                        {dayName}
                      </div>
                      <div className={`text-lg font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                        {dayNum}
                      </div>
                    </div>
                  </button>
                  
                  {/* Installations list */}
                  <div className="flex-1 space-y-1.5 overflow-y-auto">
                    {installsForDay.length > 0 ? (
                      installsForDay.slice(0, 3).map((install, idx) => (
                        <div
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInstall(install);
                            setIsDialogOpen(true);
                          }}
                          className="bg-primary/10 rounded-md p-2 text-xs cursor-pointer hover:bg-primary/20 transition-all border-2 border-transparent hover:border-primary hover:shadow-sm"
                        >
                          <div className="font-semibold text-primary mb-0.5">
                            {install.time}
                          </div>
                          <div className="text-foreground truncate">
                            {install.customerName}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                        No installs
                      </div>
                    )}
                    {installsForDay.length > 3 && (
                      <div 
                        className="text-xs text-center text-primary font-medium pt-1 cursor-pointer hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (installsForDay.length > 0) {
                            setSelectedInstall(installsForDay[0]);
                            setIsDialogOpen(true);
                          }
                        }}
                      >
                        +{installsForDay.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      
      {/* Installation Details Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditingInstallDate(false);
            setEditingInstallTime(false);
          }
          setIsDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Installation Details</DialogTitle>
            <DialogDescription>
              {selectedInstall?.date.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
                timeZone: EST,
              })} at {selectedInstall?.time}
            </DialogDescription>
          </DialogHeader>
          {selectedInstall && (
            <div className="space-y-6 mt-4">
              {/* Customer Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Customer Information</h3>
                <div className="grid gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-medium text-muted-foreground min-w-[100px]">Name:</span>
                    <span className="text-sm text-foreground">{selectedInstall.customerName}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-medium text-muted-foreground min-w-[100px]">Address:</span>
                    <span className="text-sm text-foreground">{selectedInstall.address}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Installation Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Installation Details</h3>
                <div className="grid gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-medium text-muted-foreground min-w-[100px]">Date:</span>
                    <span className="text-sm text-foreground flex items-center gap-1">
                      {editingInstallDate ? (
                        <>
                          <Input
                            type="date"
                            value={editDateValue}
                            onChange={(e) => setEditDateValue(e.target.value)}
                            className="h-8 w-40"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                setEditingInstallDate(false);
                                if (canEdit && selectedInstall?.userId) {
                                  setInstallDateSaving(true);
                                  const installDateStr = estDateTimeToISO(editDateValue, editTimeValue || "08:00");
                                  fetch(`/api/admin/users/${selectedInstall.userId}/install-date`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ installDate: installDateStr }),
                                  })
                                    .then((r) => (r.ok ? refetchInstalls() : Promise.reject()))
                                    .then(() => {
                                      const updated = { ...selectedInstall, date: new Date(installDateStr), time: formatInstallTime(installDateStr) };
                                      setSelectedInstall(updated);
                                    })
                                    .catch(() => {})
                                    .finally(() => setInstallDateSaving(false));
                                }
                              }
                              if (e.key === "Escape") setEditingInstallDate(false);
                            }}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            disabled={!canEdit || installDateSaving}
                            onClick={() => {
                              if (!canEdit) return;
                              setEditingInstallDate(false);
                              const dateVal = editDateValueRef.current;
                              const timeVal = editTimeValueRef.current || "08:00";
                              if (selectedInstall?.userId && dateVal) {
                                setInstallDateSaving(true);
                                const installDateStr = estDateTimeToISO(dateVal, timeVal);
                                fetch(`/api/admin/users/${selectedInstall.userId}/install-date`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ installDate: installDateStr }),
                                })
                                  .then((r) => (r.ok ? refetchInstalls() : Promise.reject()))
                                  .then(() => {
                                    const updated = { ...selectedInstall, date: new Date(installDateStr), time: formatInstallTime(installDateStr) };
                                    setSelectedInstall(updated);
                                  })
                                  .catch(() => {})
                                  .finally(() => setInstallDateSaving(false));
                              }
                            }}
                          >
                            {installDateSaving ? "…" : "Save"}
                          </Button>
                        </>
                      ) : (
                        <>
                          {selectedInstall.date.toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                            timeZone: EST,
                          })}
                          {selectedInstall.userId && canEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditDateValue(selectedInstall.date.toLocaleDateString("sv-SE", { timeZone: EST }));
                                setEditTimeValue(selectedInstall.date.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: EST }));
                                setEditingInstallDate(true);
                              }}
                              className="text-muted-foreground hover:text-foreground"
                              aria-label="Edit date"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-medium text-muted-foreground min-w-[100px]">Time:</span>
                    <span className="text-sm text-foreground flex items-center gap-1">
                      {editingInstallTime ? (
                        <>
                          <TimeSelect
                            value={editTimeValue}
                            onChange={setEditTimeValue}
                            className="h-8 min-w-[8.5rem] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            disabled={!canEdit || installDateSaving}
                            onClick={() => {
                              if (!canEdit) return;
                              setEditingInstallTime(false);
                              const datePart = editDateValueRef.current || selectedInstall.date.toLocaleDateString("sv-SE", { timeZone: EST });
                              const timeVal = editTimeValueRef.current;
                              if (selectedInstall?.userId && timeVal) {
                                setInstallDateSaving(true);
                                const installDateStr = estDateTimeToISO(datePart, timeVal);
                                fetch(`/api/admin/users/${selectedInstall.userId}/install-date`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ installDate: installDateStr }),
                                })
                                  .then((r) => (r.ok ? refetchInstalls() : Promise.reject()))
                                  .then(() => {
                                    const updated = { ...selectedInstall, date: new Date(installDateStr), time: formatInstallTime(installDateStr) };
                                    setSelectedInstall(updated);
                                  })
                                  .catch(() => {})
                                  .finally(() => setInstallDateSaving(false));
                              }
                            }}
                          >
                            {installDateSaving ? "…" : "Save"}
                          </Button>
                        </>
                      ) : (
                        <>
                          {selectedInstall.time}
                          {selectedInstall.userId && canEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditDateValue(selectedInstall.date.toLocaleDateString("sv-SE", { timeZone: EST }));
                                const parts = new Intl.DateTimeFormat("en-CA", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: false,
                                  timeZone: EST,
                                }).formatToParts(selectedInstall.date);
                                const hour = parts.find((p) => p.type === "hour")?.value ?? "09";
                                const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
                                setEditTimeValue(timeToNearestOption(`${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`));
                                setEditingInstallTime(true);
                              }}
                              className="text-muted-foreground hover:text-foreground"
                              aria-label="Edit time"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-medium text-muted-foreground min-w-[100px]">Unit ID:</span>
                    <span className="text-sm text-foreground flex items-center gap-1">
                      {selectedInstall.unitId ? (
                        <Link
                          href={`/admin/units/${selectedInstall.unitId}`}
                          className="flex items-center gap-1 text-foreground"
                          aria-label={`Go to unit ${selectedInstall.unitId}`}
                        >
                          {selectedInstall.unitId}
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      ) : (
                        "—"
                      )}
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-medium text-muted-foreground min-w-[100px]">Status:</span>
                    <Badge
                      variant={
                        selectedInstall.status === "installed" ? "default" : "secondary"
                      }
                    >
                      {selectedInstall.status === "installed" ? "Installed" : "Scheduled"}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex justify-between items-center gap-2 flex-wrap">
                <div className="flex gap-2">
                  {selectedInstall.userId && (
                    <Button variant="outline" asChild>
                      <Link href={`/admin/users/${selectedInstall.userId}`}>
                        <User className="h-4 w-4 mr-2" />
                        View customer
                      </Link>
                    </Button>
                  )}
                </div>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Installation Dialog */}
      <Dialog 
        open={isAddDialogOpen} 
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) {
            setSelectedCustomerId("");
            setIsNewCustomer(false);
            setSelectedTime("08:00");
            setSelectedUnits("");
            setSelectedStatus("pending");
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Installation</DialogTitle>
            <DialogDescription>
              Schedule an installation for{" "}
              {selectedDateForAdd?.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
                timeZone: EST,
              })}
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const dateVal = formData.get("date") as string;

              try {
                if (isNewCustomer) {
                  const customerName = (formData.get("customerName") as string)?.trim() ?? "";
                  const customerEmail = (formData.get("customerEmail") as string)?.trim() ?? "";
                  const [firstName, ...lastParts] = customerName.split(/\s+/);
                  const lastName = lastParts.join(" ") || "";
                  if (!firstName || !customerEmail) {
                    alert("Please enter name and email.");
                    return;
                  }
                  const res = await fetch("/api/admin/pending-customers", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      firstName,
                      lastName,
                      email: customerEmail,
                    }),
                  });
                  if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error((data as { error?: string }).error ?? "Failed to add customer");
                  }
                  alert("Customer added. They will appear in the calendar once they sign up and have an install date set.");
                } else {
                  if (!selectedCustomerId) {
                    alert("Please select a customer.");
                    return;
                  }
                  const timeVal = (formData.get("time") as string) || "08:00";
                  const hhmmMatch = timeVal.match(/^(\d{1,2}):(\d{2})$/);
                  let hour = 8, min = 0;
                  if (hhmmMatch) {
                    hour = parseInt(hhmmMatch[1], 10);
                    min = parseInt(hhmmMatch[2], 10);
                  } else {
                    const ampmMatch = timeVal.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
                    if (ampmMatch) {
                      hour = parseInt(ampmMatch[1], 10);
                      min = parseInt(ampmMatch[2], 10);
                      if (ampmMatch[3].toUpperCase() === "PM" && hour !== 12) hour += 12;
                      if (ampmMatch[3].toUpperCase() === "AM" && hour === 12) hour = 0;
                    }
                  }
                  const datePart = (dateVal as string)?.trim().slice(0, 10) ?? "";
                  const installDateStr = datePart
                    ? estDateTimeToISO(datePart, `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`)
                    : "";
                  const patchForm = new FormData();
                  patchForm.append("installDate", installDateStr);
                  patchForm.append("installAddress", "");
                  patchForm.append("notes", "");
                  const patchRes = await fetch(`/api/admin/users/${selectedCustomerId}/install`, {
                    method: "PATCH",
                    body: patchForm,
                  });
                  if (!patchRes.ok) {
                    const data = await patchRes.json().catch(() => ({}));
                    throw new Error((data as { error?: string }).error ?? "Failed to update installation");
                  }
                  await refetchInstalls();
                  alert("Installation scheduled!");
                }
                setIsAddDialogOpen(false);
                setSelectedCustomerId("");
                setIsNewCustomer(false);
                setSelectedTime("08:00");
                setSelectedUnits("");
                setSelectedStatus("pending");
              } catch (error) {
                console.error("Error:", error);
                alert(error instanceof Error ? error.message : "An error occurred. Please try again.");
              }
            }}
            className="space-y-6 mt-4"
          >
            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Customer Information</h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <label htmlFor="customer" className="text-sm font-medium text-foreground">
                    Customer <span className="text-destructive">*</span>
                  </label>
                  <CustomSelect
                    id="customer"
                    name="customer"
                    value={selectedCustomerId}
                    onChange={(value) => {
                      setSelectedCustomerId(value);
                      setIsNewCustomer(value === "new");
                    }}
                    placeholder="Select a customer"
                    icon={<User className="h-4 w-4" />}
                    required
                    options={[
                      ...customers.map((customer) => ({
                        value: customer.id,
                        label: `${customer.firstName} ${customer.lastName} (${customer.email})`,
                      })),
                      { value: "new", label: "+ Add New Customer" },
                    ]}
                  />
                </div>
                
                {/* Show these fields only when adding a new customer */}
                {isNewCustomer && (
                  <>
                    <div className="space-y-2">
                      <label htmlFor="customerName" className="text-sm font-medium text-foreground">
                        Customer Name <span className="text-destructive">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="customerName"
                          name="customerName"
                          placeholder="Enter customer name"
                          required={isNewCustomer}
                          className="pl-10 h-10 rounded-xl border-2 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 hover:border-primary/50 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="customerEmail" className="text-sm font-medium text-foreground">
                        Email <span className="text-destructive">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          id="customerEmail"
                          name="customerEmail"
                          type="email"
                          placeholder="customer@example.com"
                          required={isNewCustomer}
                          className="pl-10 h-10 rounded-xl border-2 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 hover:border-primary/50 transition-all"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <Separator />

            {/* Installation Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Installation Details</h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <label htmlFor="date" className="text-sm font-medium text-foreground">
                    Date <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      defaultValue={(selectedDateForAdd ?? new Date()).toISOString().split("T")[0]}
                      required
                      className="pr-28 h-10 rounded-xl border-2 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 hover:border-primary/50 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => (document.getElementById('date') as HTMLInputElement | null)?.showPicker?.()}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      Choose Date
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="time" className="text-sm font-medium text-foreground">
                    Time <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <TimeSelect
                      id="time"
                      name="time"
                      value={selectedTime}
                      onChange={setSelectedTime}
                      required
                      className="h-10 w-full rounded-xl border-2 border-input bg-background pl-10 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 hover:border-primary/50"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="units" className="text-sm font-medium text-foreground">
                    Units <span className="text-destructive">*</span>
                  </label>
                  <CustomSelect
                    id="units"
                    name="units"
                    value={selectedUnits}
                    onChange={setSelectedUnits}
                    placeholder="Select unit type"
                    icon={<Package className="h-4 w-4" />}
                    required
                    options={[
                      { value: "Standard", label: "Standard" },
                      { value: "Plus", label: "Plus" },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="status" className="text-sm font-medium text-foreground">
                    Status <span className="text-destructive">*</span>
                  </label>
                  <CustomSelect
                    id="status"
                    name="status"
                    value={selectedStatus}
                    onChange={setSelectedStatus}
                    placeholder="Select status"
                    icon={<CheckCircle className="h-4 w-4" />}
                    required
                    options={[
                      { value: "pending", label: "Pending" },
                      { value: "scheduled", label: "Scheduled" },
                    ]}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!canEdit}>
                {isNewCustomer ? "Schedule Installation and Add Customer" : "Add Installation"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
