"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
import { ChevronLeft, ChevronRight, User, Mail, Clock, Package, CheckCircle, Repeat, FileText } from "lucide-react";
import { LoadingAnimation } from "@/components/LoadingAnimation";
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
  units: string;
  status: "scheduled" | "pending";
};

type Customer = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

export function AdminPageClient({ revenue }: { revenue: AdminRevenueData }) {
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
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [selectedUnits, setSelectedUnits] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("pending");

  const [transactionsDialog, setTransactionsDialog] = useState<{
    month: "last" | "this" | "next";
    monthName: string;
  } | null>(null);
  const [transactions, setTransactions] = useState<RevenueTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

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

  // Fetch installs (from users with installDate)
  useEffect(() => {
    let cancelled = false;
    async function fetchInstalls() {
      setInstallsLoading(true);
      try {
        const res = await fetch("/api/admin/users");
        if (!res.ok) throw new Error("Failed to load");
        const data = (await res.json()) as { users: Array<{ id: string; firstName: string | null; lastName: string | null; installDate: string | null; installAddress?: string | null; address?: string | null }> };
        const users = data.users ?? [];
        const list: Install[] = users
          .filter((u) => u.installDate)
          .map((u) => ({
            id: u.id,
            userId: u.id,
            customerName: [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || "—",
            address: u.installAddress ?? u.address ?? "—",
            date: new Date(u.installDate!),
            time: "—",
            units: "—",
            status: "scheduled" as const,
          }));
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
      const res = await fetch("/api/admin/users");
      if (!res.ok) return;
      const data = (await res.json()) as { users: Array<{ id: string; firstName: string | null; lastName: string | null; installDate: string | null; installAddress?: string | null; address?: string | null }> };
      const users = data.users ?? [];
      const list: Install[] = users
        .filter((u) => u.installDate)
        .map((u) => ({
          id: u.id,
          userId: u.id,
          customerName: [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || "—",
          address: u.installAddress ?? u.address ?? "—",
          date: new Date(u.installDate!),
          time: "—",
          units: "—",
          status: "scheduled" as const,
        }));
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
  
  // Navigation functions for 2-week periods
  const goToPrevious2Weeks = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() - 14);
    setStartDate(newDate);
  };
  
  const goToNext2Weeks = () => {
    const newDate = new Date(startDate);
    newDate.setDate(newDate.getDate() + 14);
    setStartDate(newDate);
  };
  
  // Generate array of 14 days starting from startDate
  const getDaysInView = () => {
    const days = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  };
  
  const daysInView = getDaysInView();
  
  // Get date range for display
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 13);
  
  const EST = "America/New_York";
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
  
  // Parse time string (e.g. "10:00 AM", "2:30 PM") to minutes since midnight for sorting
  const timeToMinutes = (timeStr: string): number => {
    const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (match[3].toUpperCase() === "PM" && hours !== 12) hours += 12;
    if (match[3].toUpperCase() === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  // Get installs for a specific date, earliest time first
  const getInstallsForDate = (date: Date) => {
    return installs
      .filter((install) => isSameDay(install.date, date))
      .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
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

      {/* Inventory Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base font-medium">Units Rented</CardTitle>
            <CardDescription className="text-3xl font-bold text-foreground">
              {unitsRented}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {((unitsRented / totalInventory) * 100).toFixed(0)}% utilization
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base font-medium">Units Available</CardTitle>
            <CardDescription className="text-3xl font-bold text-foreground">
              {unitsAvailable}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Ready for rental</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base font-medium">Total Inventory</CardTitle>
            <CardDescription className="text-3xl font-bold text-foreground">
              {totalInventory}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Units in fleet</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue Overview</CardTitle>
          <CardDescription>Track income and forecasted growth • Click amounts to view transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {revenue.lastMonthName} Revenue
              </p>
              <button
                type="button"
                onClick={() =>
                  setTransactionsDialog({ month: "last", monthName: revenue.lastMonthName })
                }
                className="text-3xl font-bold text-foreground hover:opacity-80 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
              >
                ${revenue.lastMonthRevenue.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </button>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {revenue.thisMonthName} Revenue
              </p>
              <button
                type="button"
                onClick={() =>
                  setTransactionsDialog({ month: "this", monthName: revenue.thisMonthName })
                }
                className="text-3xl font-bold text-foreground hover:opacity-80 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
              >
                ${revenue.thisMonthRevenue.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </button>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                {revenue.nextMonthName} Forecast
              </p>
              <button
                type="button"
                onClick={() =>
                  setTransactionsDialog({ month: "next", monthName: revenue.nextMonthName })
                }
                className="text-3xl font-bold text-green-600 dark:text-green-500 hover:opacity-80 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
              >
                ${revenue.nextMonthForecast.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
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
                <LoadingAnimation size="lg" className="!h-32 !w-32" />
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Installation Schedule</CardTitle>
              <CardDescription>2-week view • Click on a date to view details</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={goToPrevious2Weeks}
                aria-label="Previous 2 weeks"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[200px] text-center">
                <span className="text-sm font-semibold">
                  {formatDateRange()}
                </span>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={goToNext2Weeks}
                aria-label="Next 2 weeks"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile: list view by date */}
          <div className="block md:hidden space-y-4">
            {daysInView.map((date, i) => {
              const installsForDay = getInstallsForDate(date);
              const isToday = isSameDay(date, new Date());
              const dayName = date.toLocaleDateString("en-US", { weekday: "short", timeZone: EST });
              const dayNum = date.getDate();
              const monthYear = date.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: EST });
              return (
                <div
                  key={i}
                  className={`rounded-lg border-2 p-3 ${
                    isToday ? "border-primary/60 bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-border">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase">
                        {dayName}, {monthYear}
                      </div>
                      <div className={`text-lg font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                        {dayNum}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDateForAdd(date);
                        setIsAddDialogOpen(true);
                      }}
                      className="flex items-center justify-center h-8 w-8 rounded-full border-2 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                      aria-label="Add installation"
                    >
                      <span className="text-sm font-bold">+</span>
                    </button>
                  </div>
                  <ul className="space-y-2">
                    {installsForDay.length > 0 ? (
                      installsForDay.map((install, idx) => (
                        <li key={idx}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInstall(install);
                              setIsDialogOpen(true);
                            }}
                            className="w-full text-left rounded-md p-3 bg-primary/10 hover:bg-primary/20 transition-all border border-transparent hover:border-primary"
                          >
                            <div className="font-semibold text-primary text-sm">
                              {install.time}
                            </div>
                            <div className="text-foreground text-sm">
                              {install.customerName}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {install.address}
                            </div>
                          </button>
                        </li>
                      ))
                    ) : (
                      <li className="text-sm text-muted-foreground py-2">
                        No installs
                      </li>
                    )}
                  </ul>
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
                  {/* Date header */}
                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-border">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground uppercase">
                        {dayName}
                      </div>
                      <div className={`text-lg font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                        {dayNum}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDateForAdd(date);
                        setIsAddDialogOpen(true);
                      }}
                      className="flex items-center justify-center h-6 w-6 rounded-full border-2 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all hover:border-primary"
                      aria-label="Add installation"
                    >
                      <span className="text-sm font-bold">+</span>
                    </button>
                  </div>
                  
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
                          <div className="text-muted-foreground text-[10px] truncate">
                            {install.units}
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
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                    <span className="text-sm text-foreground">
                      {selectedInstall.date.toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        timeZone: EST,
                      })}
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-medium text-muted-foreground min-w-[100px]">Time:</span>
                    <span className="text-sm text-foreground">{selectedInstall.time}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-medium text-muted-foreground min-w-[100px]">Units:</span>
                    <span className="text-sm text-foreground">{selectedInstall.units}</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-medium text-muted-foreground min-w-[100px]">Status:</span>
                    <Badge
                      variant={
                        selectedInstall.status === "scheduled" ? "secondary" : "outline"
                      }
                    >
                      {selectedInstall.status === "scheduled" ? "Scheduled" : "Pending"}
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
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Close
                  </Button>
                  {selectedInstall.userId ? (
                    <Button asChild>
                      <Link href={`/admin/users/${selectedInstall.userId}`} onClick={() => setIsDialogOpen(false)}>
                        Edit Installation
                      </Link>
                    </Button>
                  ) : (
                    <Button disabled>Edit Installation</Button>
                  )}
                </div>
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
            setSelectedTime("");
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
                  const installDateStr = dateVal ? new Date(dateVal).toISOString().split("T")[0] : "";
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
                setSelectedTime("");
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
                      defaultValue={selectedDateForAdd?.toISOString().split("T")[0]}
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
                  <CustomSelect
                    id="time"
                    name="time"
                    value={selectedTime}
                    onChange={setSelectedTime}
                    placeholder="Select time"
                    icon={<Clock className="h-4 w-4" />}
                    required
                    options={[
                      { value: "8:00 AM", label: "8:00 AM" },
                      { value: "9:00 AM", label: "9:00 AM" },
                      { value: "10:00 AM", label: "10:00 AM" },
                      { value: "11:00 AM", label: "11:00 AM" },
                      { value: "12:00 PM", label: "12:00 PM" },
                      { value: "1:00 PM", label: "1:00 PM" },
                      { value: "2:00 PM", label: "2:00 PM" },
                      { value: "3:00 PM", label: "3:00 PM" },
                      { value: "4:00 PM", label: "4:00 PM" },
                      { value: "5:00 PM", label: "5:00 PM" },
                      { value: "6:00 PM", label: "6:00 PM" },
                      { value: "7:00 PM", label: "7:00 PM" },
                      { value: "8:00 PM", label: "8:00 PM" },
                    ]}
                  />
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
              <Button type="submit">
                {isNewCustomer ? "Schedule Installation and Add Customer" : "Add Installation"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
