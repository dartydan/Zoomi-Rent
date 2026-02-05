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
import { Plus, TrendingUp, User, Home } from "lucide-react";
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
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6 w-10" aria-label="Status" />
                  <TableHead className="w-[180px]">ID</TableHead>
                  <TableHead className="w-[200px]">Location</TableHead>
                  <TableHead>Washer</TableHead>
                  <TableHead>Dryer</TableHead>
                  <TableHead className="text-right">Total cost</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8 pl-6 pr-6">
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
                        <TableCell className="pl-6" onClick={(e) => e.stopPropagation()}>
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
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {u.id}
                        </TableCell>
                        <TableCell className="text-sm w-[200px] max-w-[200px] overflow-hidden">
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
                        <TableCell className="text-sm max-w-[160px]">
                          <span className="truncate block" title={[u.washer.brand, u.washer.model].filter(Boolean).join(" ") || "—"}>
                            {[u.washer.brand, u.washer.model].filter(Boolean).join(" ") || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm max-w-[160px]">
                          <span className="truncate block" title={[u.dryer.brand, u.dryer.model].filter(Boolean).join(" ") || "—"}>
                            {[u.dryer.brand, u.dryer.model].filter(Boolean).join(" ") || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(totalCost(u))}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="flex items-center justify-end gap-1">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            {formatCurrency(totalRevenue(u))}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
