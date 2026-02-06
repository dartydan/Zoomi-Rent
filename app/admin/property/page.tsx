"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, User, Home, ChevronRight, MoreVertical, Trash2 } from "lucide-react";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import type { Unit, MachineStatus } from "@/lib/unit";

type AdminUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  stripeCustomerId?: string | null;
  installDate?: string | null;
  installAddress?: string | null;
  address?: string | null;
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

function userDisplay(u: AdminUser) {
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return name || u.email || u.id;
}

type DotStatus = "installed" | "available" | "needs_repair" | "no_longer_owned";

function getUnitDotStatus(u: Unit, userById: (id: string) => AdminUser | undefined): DotStatus {
  const washerStatus = u.washer.status;
  const dryerStatus = u.dryer.status;
  if (washerStatus === "no_longer_owned" || dryerStatus === "no_longer_owned") return "no_longer_owned";
  if (washerStatus === "needs_repair" || dryerStatus === "needs_repair") return "needs_repair";
  if (u.assignedUserId) {
    const usr = userById(u.assignedUserId);
    if (usr?.installDate) return "installed";
  }
  return "available";
}

const DOT_COLORS: Record<DotStatus, string> = {
  installed: "bg-green-500",
  available: "bg-blue-500",
  needs_repair: "bg-amber-500",
  no_longer_owned: "bg-red-500",
};

const DOT_LABELS: Record<DotStatus, string> = {
  installed: "Installed / generating revenue",
  available: "Available to install",
  needs_repair: "Needs repair",
  no_longer_owned: "No longer owned",
};

export default function PropertyPage() {
  const router = useRouter();
  const [units, setUnits] = useState<Unit[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const userById = (id: string) => users.find((u) => u.id === id);

  async function patchUnit(
    unitId: string,
    payload: {
      assignedUserId?: string | null;
      washer?: Partial<Unit["washer"]>;
      dryer?: Partial<Unit["dryer"]>;
    }
  ): Promise<Unit | null> {
    try {
      const res = await fetch(`/api/admin/units/${unitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Failed to update");
      }
      const updated = (await res.json()) as Unit;
      setUnits((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      return updated;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
      return null;
    }
  }

  async function updateMachineStatus(
    unitId: string,
    slot: "washer" | "dryer",
    status: MachineStatus
  ) {
    const unit = units.find((u) => u.id === unitId);
    if (!unit) return;
    await patchUnit(unitId, {
      [slot]: { ...unit[slot], status },
    });
  }

  async function load() {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const [unitsRes, usersRes] = await Promise.all([
        fetch("/api/admin/units", { signal: controller.signal }),
        fetch("/api/admin/users", { signal: controller.signal }),
      ]);
      if (!unitsRes.ok) {
        const msg = (await unitsRes.json().catch(() => ({})) as { error?: string }).error;
        throw new Error(msg || "Failed to load units");
      }
      if (!usersRes.ok) {
        const msg = (await usersRes.json().catch(() => ({})) as { error?: string }).error;
        throw new Error(msg || "Failed to load users");
      }
      const unitsData = (await unitsRes.json()) as { units?: Unit[] };
      const usersData = (await usersRes.json()) as { users: AdminUser[] };
      setUnits(unitsData.units ?? []);
      setUsers(usersData.users ?? []);
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") {
        setError("Request timed out. Check your connection and try again.");
      } else {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function totalRevenue(u: Unit) {
    return (u.washer.revenueGenerated ?? 0) + (u.dryer.revenueGenerated ?? 0);
  }

  function totalCost(u: Unit) {
    const additionalTotal =
      u.washer.additionalCosts && u.washer.additionalCosts.length > 0
        ? u.washer.additionalCosts.reduce((s, e) => s + (e.amount ?? 0), 0)
        : (u.washer.repairCosts ?? 0) + (u.dryer.repairCosts ?? 0);
    return (u.washer.purchaseCost ?? 0) + (u.dryer.purchaseCost ?? 0) + additionalTotal;
  }

  function roi(u: Unit) {
    return totalRevenue(u) - totalCost(u);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Units</h1>
          <p className="text-sm text-muted-foreground">
            Track washer/dryer pairs: location, costs, and revenue
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={creating}
          onClick={async () => {
            setCreating(true);
            setError(null);
            try {
              const res = await fetch("/api/admin/units", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ assignedUserId: null }),
              });
              const data = (await res.json().catch(() => ({}))) as { error?: string };
              if (res.ok) {
                await load();
              } else {
                setError(data.error ?? "Failed to create unit");
              }
            } catch (e) {
              setError(e instanceof Error ? e.message : "Failed to create unit");
            } finally {
              setCreating(false);
            }
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          {creating ? "Creating…" : "Add unit"}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All units</CardTitle>
          <CardDescription>
            Each unit is a washer/dryer pair. Assign to a customer or leave at warehouse.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-8 flex justify-center">
              <LoadingAnimation />
            </div>
          ) : (
            <>
              {/* Mobile: location, status, ROI, action */}
              <div className="block md:hidden divide-y divide-border">
                {units.length > 0 && (
                  <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/30">
                    <div className="w-3 shrink-0" aria-hidden />
                    <span className="text-xs font-medium text-muted-foreground uppercase flex-1 min-w-0">Location</span>
                    <span className="text-xs font-medium text-muted-foreground uppercase shrink-0 w-16 text-right">ROI</span>
                    <div className="w-4 shrink-0" aria-hidden />
                  </div>
                )}
                {units.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No units yet. Add one to get started.
                  </div>
                ) : (
                  units.map((u) => {
                    const dotStatus = getUnitDotStatus(u, userById);
                    const location = u.assignedUserId
                      ? userDisplay(userById(u.assignedUserId) ?? { id: u.assignedUserId, email: null, firstName: null, lastName: null })
                      : "Warehouse";
                    return (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted active:bg-muted transition-colors"
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(`/admin/units/${u.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            router.push(`/admin/units/${u.id}`);
                          }
                        }}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <div onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  title={DOT_LABELS[dotStatus]}
                                  aria-label={`Status: ${DOT_LABELS[dotStatus]}. Change status.`}
                                  className={`h-3 w-3 shrink-0 rounded-full border border-border ${DOT_COLORS[dotStatus]} focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer`}
                                />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem
                                  onClick={() => {
                                    updateMachineStatus(u.id, "washer", "available");
                                    updateMachineStatus(u.id, "dryer", "available");
                                  }}
                                  disabled={dotStatus === "installed"}
                                >
                                  <span className="inline-block h-2 w-2 rounded-full bg-blue-500 mr-2" />
                                  Available to install
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    updateMachineStatus(u.id, "washer", "needs_repair");
                                    updateMachineStatus(u.id, "dryer", "needs_repair");
                                  }}
                                >
                                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500 mr-2" />
                                  Needs repair
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    updateMachineStatus(u.id, "washer", "no_longer_owned");
                                    updateMachineStatus(u.id, "dryer", "no_longer_owned");
                                  }}
                                >
                                  <span className="inline-block h-2 w-2 rounded-full bg-red-500 mr-2" />
                                  No longer owned
                                </DropdownMenuItem>
                                {dotStatus === "installed" && (
                                  <DropdownMenuItem disabled>
                                    <span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-2" />
                                    Installed (automatic when assigned + install date)
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <span className="text-sm font-medium truncate min-w-0">{location}</span>
                          <span className="text-sm text-muted-foreground shrink-0 ml-auto text-right tabular-nums">
                            {formatCurrency(roi(u))}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                aria-label={`Actions for unit ${u.id}`}
                                className="p-1 rounded hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <MoreVertical className="h-4 w-4 text-muted-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget(u)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete unit
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Desktop: full table */}
              <Table className="hidden md:table w-full table-auto">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 pl-6 pr-4 py-4" aria-label="Status" />
                  <TableHead className="min-w-[140px] py-4">ID</TableHead>
                  <TableHead className="min-w-[160px] w-auto py-4">Location</TableHead>
                  <TableHead className="text-right min-w-[100px] py-4">ROI</TableHead>
                  <TableHead className="w-10 pr-6" aria-label="Actions" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8 pl-6 pr-6">
                      No units yet. Add one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  units.map((u) => {
                    const dotStatus = getUnitDotStatus(u, userById);
                    return (
                      <TableRow
                        key={u.id}
                        className="transition-colors cursor-pointer hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        role="button"
                        tabIndex={0}
                        onClick={() => router.push(`/admin/units/${u.id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            router.push(`/admin/units/${u.id}`);
                          }
                        }}
                      >
                        <TableCell className="w-10 pl-6 pr-4 py-4" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                title={`${DOT_LABELS[dotStatus]} (click to change)`}
                                aria-label={`Status: ${DOT_LABELS[dotStatus]}. Click to change.`}
                                className={`h-2.5 w-2.5 shrink-0 rounded-full border border-border ${DOT_COLORS[dotStatus]} focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer`}
                              />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem
                                onClick={() => {
                                  updateMachineStatus(u.id, "washer", "available");
                                  updateMachineStatus(u.id, "dryer", "available");
                                }}
                                disabled={dotStatus === "installed"}
                              >
                                <span className="inline-block h-2 w-2 rounded-full bg-blue-500 mr-2" />
                                Available to install
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  updateMachineStatus(u.id, "washer", "needs_repair");
                                  updateMachineStatus(u.id, "dryer", "needs_repair");
                                }}
                              >
                                <span className="inline-block h-2 w-2 rounded-full bg-amber-500 mr-2" />
                                Needs repair
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  updateMachineStatus(u.id, "washer", "no_longer_owned");
                                  updateMachineStatus(u.id, "dryer", "no_longer_owned");
                                }}
                              >
                                <span className="inline-block h-2 w-2 rounded-full bg-red-500 mr-2" />
                                No longer owned
                              </DropdownMenuItem>
                              {dotStatus === "installed" && (
                                <DropdownMenuItem disabled>
                                  <span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-2" />
                                  Installed (automatic when assigned + install date)
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground min-w-[140px] py-4">
                          {u.id}
                        </TableCell>
                        <TableCell className="text-sm min-w-[160px] py-4">
                          <span className="flex min-w-0 items-center gap-2 truncate" title={u.assignedUserId ? userDisplay(userById(u.assignedUserId) ?? { id: u.assignedUserId, email: null, firstName: null, lastName: null }) : "Warehouse"}>
                            {u.assignedUserId ? (
                              <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                            ) : (
                              <Home className="h-4 w-4 shrink-0 text-muted-foreground" />
                            )}
                            <span className="truncate">
                              {u.assignedUserId ? userDisplay(userById(u.assignedUserId) ?? { id: u.assignedUserId, email: null, firstName: null, lastName: null }) : "Warehouse"}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums min-w-[100px] py-4">
                          {formatCurrency(roi(u))}
                        </TableCell>
                        <TableCell className="w-10 pr-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                aria-label={`Actions for unit ${u.id}`}
                                className="p-1 rounded hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <MoreVertical className="h-4 w-4 text-muted-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget(u)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete unit
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            </>
          )}
        </CardContent>
      </Card>

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
            <DialogTitle>Delete unit</DialogTitle>
            <DialogDescription>
              {deleteTarget && (
                <>
                  This will permanently delete unit{" "}
                  <span className="font-mono text-foreground">{deleteTarget.id}</span>
                  {deleteTarget.assignedUserId ? (
                    <> and unassign it from the customer. </>
                  ) : null}
                  This action cannot be undone.
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
                  const res = await fetch(`/api/admin/units/${deleteTarget.id}`, { method: "DELETE" });
                  if (!res.ok) {
                    const json = await res.json().catch(() => ({}));
                    throw new Error((json as { error?: string }).error ?? "Failed to delete");
                  }
                  setUnits((prev) => prev.filter((u) => u.id !== deleteTarget.id));
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
    </div>
  );
}
