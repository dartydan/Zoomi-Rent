"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { Plus, X, Wrench, PackageX, CreditCard, CalendarClock, Package, DollarSign, Home, User, Copy, Check, FileText } from "lucide-react";
import type { Unit, MachineInfo, MachineStatus, AdditionalCostEntry, NoteEntry } from "@/lib/unit";

type EditableField = "washer" | "dryer" | "unit";
type MachineField = keyof MachineInfo;

type AdminUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  installDate?: string | null;
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

export default function UnitDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [unit, setUnit] = useState<Unit | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [infoEditingField, setInfoEditingField] = useState<{
    slot: EditableField;
    field: MachineField | "acquisition" | "additional";
  } | null>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const machineDialogBrandRef = useRef<HTMLInputElement>(null);
  const machineDialogModelRef = useRef<HTMLInputElement>(null);
  const machineDialogNotesRef = useRef<HTMLTextAreaElement>(null);

  type TimelineData = {
    installDate: string | null;
    uninstallDate: string | null;
    payments: { date: string; amount: number; currency: string }[];
    nextPaymentDate: string | null;
    nextPaymentAmount: number | null;
    nextPaymentCurrency: string;
    logins: { date: string }[];
    paymentMethodChanges: { date: string; type: "payment_method_added" | "payment_method_removed" | "payment_settings_updated" }[];
  };
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [sendToWarehouseLoading, setSendToWarehouseLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedAt, setCopiedAt] = useState<{ x: number; y: number } | null>(null);
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [addNoteText, setAddNoteText] = useState("");
  const [machineDialogSlot, setMachineDialogSlot] = useState<"washer" | "dryer" | null>(null);

  const userById = (uid: string) => users.find((u) => u.id === uid);

  async function copyUnitUrl(e: React.MouseEvent) {
    const url = typeof window !== "undefined" ? `${window.location.origin}/admin/units/${unit!.id}` : "";
    try {
      await navigator.clipboard.writeText(url);
      setCopiedAt({ x: e.clientX, y: e.clientY });
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setCopiedAt(null);
      }, 2000);
    } catch {
      setError("Failed to copy");
    }
  }

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const [unitRes, usersRes] = await Promise.all([
        fetch(`/api/admin/units/${id}`, { signal: controller.signal }),
        fetch("/api/admin/users", { signal: controller.signal }),
      ]);
      if (!unitRes.ok) {
        if (unitRes.status === 404) {
          setError("Unit not found");
          setUnit(null);
        } else {
          const msg = (await unitRes.json().catch(() => ({})) as { error?: string }).error;
          throw new Error(msg || "Failed to load unit");
        }
      } else {
        const unitData = (await unitRes.json()) as Unit;
        setUnit(unitData);
      }
      if (!usersRes.ok) {
        const msg = (await usersRes.json().catch(() => ({})) as { error?: string }).error;
        throw new Error(msg || "Failed to load users");
      }
      const usersData = (await usersRes.json()) as { users: AdminUser[] };
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
  }, [id]);

  useEffect(() => {
    if (!unit) return;
    const empty: TimelineData = {
      installDate: null,
      uninstallDate: null,
      payments: [],
      nextPaymentDate: null,
      nextPaymentAmount: null,
      nextPaymentCurrency: "usd",
      logins: [],
      paymentMethodChanges: [],
    };
    if (!unit.assignedUserId) {
      setTimeline(empty);
      return;
    }
    let cancelled = false;
    fetch(`/api/admin/users/${unit.assignedUserId}/timeline`)
      .then((res) => {
        if (!res.ok) return empty;
        return res.json() as Promise<TimelineData>;
      })
      .then((json) => {
        if (cancelled) return;
        setTimeline({
          installDate: json.installDate ?? null,
          uninstallDate: json.uninstallDate ?? null,
          payments: Array.isArray(json.payments) ? json.payments : [],
          nextPaymentDate: json.nextPaymentDate ?? null,
          nextPaymentAmount: json.nextPaymentAmount ?? null,
          nextPaymentCurrency: json.nextPaymentCurrency ?? "usd",
          logins: Array.isArray(json.logins) ? json.logins : [],
          paymentMethodChanges: Array.isArray(json.paymentMethodChanges) ? json.paymentMethodChanges : [],
        });
      })
      .catch(() => {
        if (!cancelled) setTimeline(empty);
      });
    return () => {
      cancelled = true;
    };
  }, [unit?.id, unit?.assignedUserId]);

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
      setUnit(updated);
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
    if (!unit) return;
    await patchUnit(unitId, {
      [slot]: { ...unit[slot], status },
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingAnimation />
      </div>
    );
  }

  if (error && !unit) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/property">← Back to Units</Link>
        </Button>
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      </div>
    );
  }

  if (!unit) {
    return null;
  }

  const dotStatus = getUnitDotStatus(unit, userById);

  const locationDisplay = unit.assignedUserId
    ? userDisplay(userById(unit.assignedUserId) ?? { id: unit.assignedUserId, email: null, firstName: null, lastName: null })
    : "Warehouse";

  async function handleSendToWarehouse() {
    if (!unit || !unit.assignedUserId) return;
    setSendToWarehouseLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/units/${unit.id}/send-to-warehouse`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Failed to send to warehouse");
      }
      const updated = (await res.json()) as Unit;
      setUnit(updated);
      setTimeline(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send to warehouse");
    } finally {
      setSendToWarehouseLoading(false);
    }
  }

  async function handleAddNote() {
    const text = addNoteText.trim();
    if (!text || !unit) return;
    const existing = unit.washer.notesFeed ?? [];
    const newNote: NoteEntry = { text, date: new Date().toISOString() };
    const updated = await patchUnit(unit.id, {
      washer: { notesFeed: [...existing, newNote] },
    });
    if (updated) {
      setAddNoteOpen(false);
      setAddNoteText("");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/property" className="text-primary w-fit">
              ← Back to Units
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title={`${DOT_LABELS[dotStatus]} (click to change)`}
                aria-label={`Status: ${DOT_LABELS[dotStatus]}. Click to change.`}
                className={`h-3 w-3 shrink-0 rounded-full border border-border ${DOT_COLORS[dotStatus]} focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer`}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => {
                  updateMachineStatus(unit.id, "washer", "available");
                  updateMachineStatus(unit.id, "dryer", "available");
                }}
                disabled={dotStatus === "installed"}
              >
                <span className="inline-block h-2 w-2 rounded-full bg-blue-500 mr-2" />
                Available to install
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  updateMachineStatus(unit.id, "washer", "needs_repair");
                  updateMachineStatus(unit.id, "dryer", "needs_repair");
                }}
              >
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500 mr-2" />
                Needs repair
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  updateMachineStatus(unit.id, "washer", "no_longer_owned");
                  updateMachineStatus(unit.id, "dryer", "no_longer_owned");
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
            <div className="relative flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">{unit.id}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  copyUnitUrl(e);
                }}
                className="text-muted-foreground hover:text-foreground p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Copy unit URL"
                title="Copy unit URL"
              >
                <Copy className="h-4 w-4" />
              </button>
              {copied && copiedAt && (
                <span
                  className="fixed z-50 flex items-center gap-1.5 rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm animate-copied-notification"
                  style={{
                    left: copiedAt.x,
                    top: copiedAt.y - 36,
                    transform: "translate(-50%, 0)",
                  }}
                  role="status"
                  aria-live="polite"
                >
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  Copied
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            {unit.assignedUserId ? (
              <User className="h-4 w-4 shrink-0" />
            ) : (
              <Home className="h-4 w-4 shrink-0" />
            )}
            {unit.assignedUserId ? (
              <Link href={`/admin/users/${unit.assignedUserId}`} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded">
                {locationDisplay}
              </Link>
            ) : (
              locationDisplay
            )}
          </span>
          {!unit.assignedUserId ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/users">
                <Plus className="h-4 w-4 mr-1" />
                Assign customer
              </Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendToWarehouse}
              disabled={sendToWarehouseLoading}
            >
              {sendToWarehouseLoading ? "Sending…" : "Send to warehouse"}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr_320px]">
        <div className="space-y-6 min-w-0">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 justify-start h-auto py-3 px-4"
              onClick={() => setMachineDialogSlot("washer")}
            >
              <span className="text-lg font-semibold">Washer</span>
              <span className="ml-2 text-muted-foreground truncate">
                {[unit.washer.brand, unit.washer.model].filter(Boolean).join(" ") || "—"}
              </span>
            </Button>
            <Button
              variant="outline"
              className="flex-1 justify-start h-auto py-3 px-4"
              onClick={() => setMachineDialogSlot("dryer")}
            >
              <span className="text-lg font-semibold">Dryer</span>
              <span className="ml-2 text-muted-foreground truncate">
                {[unit.dryer.brand, unit.dryer.model].filter(Boolean).join(" ") || "—"}
              </span>
            </Button>
          </div>

          <Dialog open={machineDialogSlot !== null} onOpenChange={(open) => !open && setMachineDialogSlot(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{machineDialogSlot === "washer" ? "Washer" : "Dryer"} details</DialogTitle>
              </DialogHeader>
              {machineDialogSlot && (
                <>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground capitalize">Brand</label>
                      <Input
                        ref={machineDialogBrandRef}
                        key={`brand-${unit.id}-${machineDialogSlot}-${unit[machineDialogSlot].brand ?? ""}`}
                        className="h-8"
                        defaultValue={unit[machineDialogSlot].brand ?? ""}
                        placeholder="Brand"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground capitalize">Model</label>
                      <Input
                        ref={machineDialogModelRef}
                        key={`model-${unit.id}-${machineDialogSlot}-${unit[machineDialogSlot].model ?? ""}`}
                        className="h-8"
                        defaultValue={unit[machineDialogSlot].model ?? ""}
                        placeholder="Model"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground capitalize">Notes</label>
                      <textarea
                        ref={machineDialogNotesRef}
                        key={`notes-${unit.id}-${machineDialogSlot}-${unit[machineDialogSlot].notes ?? ""}`}
                        rows={3}
                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Machine notes, repair history, etc."
                        defaultValue={unit[machineDialogSlot].notes ?? ""}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => {
                        if (!machineDialogSlot) return;
                        const brand = machineDialogBrandRef.current?.value.trim() || undefined;
                        const model = machineDialogModelRef.current?.value.trim() || undefined;
                        const notes = machineDialogNotesRef.current?.value.trim() || undefined;
                        patchUnit(unit.id, {
                          [machineDialogSlot]: {
                            brand,
                            model,
                            notes,
                          },
                        });
                        setMachineDialogSlot(null);
                      }}
                    >
                      Save
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <div>
                <CardTitle className="text-lg font-semibold">Notes</CardTitle>
                <CardDescription>Unit notes, repair history, etc.</CardDescription>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 h-8 w-8"
                onClick={() => setAddNoteOpen(true)}
                aria-label="Add note"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {(() => {
                const feed = unit.washer.notesFeed ?? [];
                const items: { text: string; date: string }[] =
                  feed.length > 0
                    ? [...feed].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    : [];
                if (items.length === 0) {
                  return (
                    <p className="text-sm text-muted-foreground">No notes yet. Click + to add one.</p>
                  );
                }
                return (
                  <div className="space-y-3">
                    {items.map((n, i) => (
                      <div key={i} className="text-sm">
                        <p className="text-muted-foreground text-xs">
                          {new Date(n.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            timeZone: "America/New_York",
                          })}
                        </p>
                        <p className="text-foreground whitespace-pre-wrap">{n.text}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <Dialog open={addNoteOpen} onOpenChange={setAddNoteOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add note</DialogTitle>
                <DialogDescription>Add a note to this unit. It will appear in the feed and timeline.</DialogDescription>
              </DialogHeader>
              <textarea
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Note text…"
                value={addNoteText}
                onChange={(e) => setAddNoteText(e.target.value)}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddNoteOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddNote} disabled={!addNoteText.trim()}>
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-6 min-w-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <CardTitle className="text-lg font-semibold">Finances</CardTitle>
              {(() => {
                const revenue = (unit.washer.revenueGenerated ?? 0) + (unit.dryer.revenueGenerated ?? 0);
                const additionalTotal =
                  unit.washer.additionalCosts && unit.washer.additionalCosts.length > 0
                    ? unit.washer.additionalCosts.reduce((s, e) => s + (e.amount ?? 0), 0)
                    : (unit.washer.repairCosts ?? 0) + (unit.dryer.repairCosts ?? 0);
                const cost = (unit.washer.purchaseCost ?? 0) + (unit.dryer.purchaseCost ?? 0) + additionalTotal;
                const roi = revenue - cost;
                const roiColor = roi < 0 ? "text-destructive" : roi > 0 ? "text-green-600" : "";
                return (
                  <span className={`text-lg font-semibold tabular-nums ${roiColor}`}>
                    {formatCurrency(roi)}
                  </span>
                );
              })()}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">Acquisition</p>
                <div className="flex flex-nowrap items-start justify-between">
                  <div className="shrink-0">
                    <EditableUnitCostField
                      unit={unit}
                      field="acquisition"
                      formatCurrency={formatCurrency}
                      patchUnit={patchUnit}
                      infoEditingField={infoEditingField}
                      setInfoEditingField={setInfoEditingField}
                      inlineInputRef={inlineInputRef}
                      label="Cost"
                    />
                  </div>
                  <div className="shrink-0">
                    <EditableMachineField
                      unit={unit}
                      slot="washer"
                      field="acquisitionDate"
                      label="Date"
                      formatCurrency={formatCurrency}
                      patchUnit={patchUnit}
                      infoEditingField={infoEditingField}
                      setInfoEditingField={setInfoEditingField}
                      inlineInputRef={inlineInputRef}
                      format="date"
                    />
                  </div>
                  <div className="shrink-0 min-w-0">
                    <EditableMachineField
                      unit={unit}
                      slot="washer"
                      field="acquisitionSource"
                      label="Location"
                    formatCurrency={formatCurrency}
                    patchUnit={patchUnit}
                    infoEditingField={infoEditingField}
                    setInfoEditingField={setInfoEditingField}
                    inlineInputRef={inlineInputRef}
                  />
                  </div>
                </div>
              </div>
              <AdditionalCostsField
                unit={unit}
                formatCurrency={formatCurrency}
                patchUnit={patchUnit}
                load={load}
              />
            </CardContent>
          </Card>
        </div>

        <aside className="w-full lg:w-[320px] lg:min-w-[320px] shrink-0">
          <Card className="h-full lg:min-h-[calc(100vh-8rem)] lg:sticky lg:top-6 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-0 pt-2">
              {unit.assignedUserId && timeline ? (
                <UnitTimelineContent
                  timeline={timeline}
                  unitAcquiredAt={unit.washer.acquisitionDate ? unit.washer.acquisitionDate.slice(0, 10) : unit.createdAt}
                  acquisitionCost={unit.washer.purchaseCost ?? 0}
                  acquisitionLocation={unit.washer.acquisitionSource}
                  customerName={userDisplay(userById(unit.assignedUserId) ?? { id: unit.assignedUserId, email: null, firstName: null, lastName: null })}
                  additionalCosts={(() => {
                    const ac = unit.washer.additionalCosts;
                    if (ac && ac.length > 0) return ac;
                    const rc = unit.washer.repairCosts ?? 0;
                    return rc > 0 ? [{ amount: rc, description: "Legacy", date: undefined }] : [];
                  })()}
                  notesFeed={unit.washer.notesFeed ?? []}
                />
              ) : !unit.assignedUserId ? (
                <UnitTimelineContent
                  timeline={null}
                  unitAcquiredAt={unit.washer.acquisitionDate ? unit.washer.acquisitionDate.slice(0, 10) : unit.createdAt}
                  acquisitionCost={unit.washer.purchaseCost ?? 0}
                  acquisitionLocation={unit.washer.acquisitionSource}
                  customerName={null}
                  additionalCosts={(() => {
                    const ac = unit.washer.additionalCosts;
                    if (ac && ac.length > 0) return ac;
                    const rc = unit.washer.repairCosts ?? 0;
                    return rc > 0 ? [{ amount: rc, description: "Legacy", date: undefined }] : [];
                  })()}
                  notesFeed={unit.washer.notesFeed ?? []}
                />
              ) : (
                <div className="flex justify-center py-4">
                  <LoadingAnimation />
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

const EST = "America/New_York";

function parseDateForDisplay(iso: string): Date {
  if (/^\d{4}-\d{2}-\d{2}(T00:00:00(\.000)?Z)?$/.test(iso.trim())) {
    return new Date(iso.slice(0, 10) + "T12:00:00.000Z");
  }
  return new Date(iso);
}

function formatTimelineDate(iso: string) {
  return parseDateForDisplay(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: EST,
  });
}

function formatTimelineDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: EST,
  });
}

function formatTimelineAmount(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
  }).format(amount);
}

type TimelineData = {
  installDate: string | null;
  uninstallDate: string | null;
  payments: { date: string; amount: number; currency: string }[];
  nextPaymentDate: string | null;
  nextPaymentAmount: number | null;
  nextPaymentCurrency: string;
  logins: { date: string }[];
  paymentMethodChanges: { date: string; type: "payment_method_added" | "payment_method_removed" | "payment_settings_updated" }[];
};

function UnitTimelineContent({
  timeline,
  unitAcquiredAt,
  acquisitionCost,
  acquisitionLocation,
  customerName,
  additionalCosts,
  notesFeed,
}: {
  timeline: TimelineData | null;
  unitAcquiredAt: string;
  acquisitionCost: number;
  acquisitionLocation?: string;
  customerName: string | null;
  additionalCosts: { amount: number; description: string; date?: string }[];
  notesFeed: { text: string; date: string }[];
}) {
  type Event = {
    date: string;
    kind: "unit_acquired" | "install" | "uninstall" | "payment" | "next" | "additional_cost" | "note_added";
    payload: unknown;
  };
  const events: Event[] = [];
  events.push({
    date: unitAcquiredAt,
    kind: "unit_acquired",
    payload: { cost: acquisitionCost, location: acquisitionLocation },
  });
  if (timeline) {
    if (timeline.installDate) events.push({ date: timeline.installDate, kind: "install", payload: null });
    if (timeline.uninstallDate) events.push({ date: timeline.uninstallDate, kind: "uninstall", payload: null });
    timeline.payments.forEach((p) => events.push({ date: p.date, kind: "payment", payload: p }));
    if (timeline.nextPaymentDate && timeline.nextPaymentAmount != null)
      events.push({
        date: timeline.nextPaymentDate,
        kind: "next",
        payload: { amount: timeline.nextPaymentAmount, currency: timeline.nextPaymentCurrency },
      });
  }
  additionalCosts.forEach((c, i) =>
    events.push({
      date: c.date ?? unitAcquiredAt,
      kind: "additional_cost",
      payload: { amount: c.amount, description: c.description },
    })
  );
  notesFeed.forEach((n) =>
    events.push({ date: n.date, kind: "note_added", payload: null })
  );
  events.sort((a, b) => {
    const tA = new Date(a.date).getTime();
    const tB = new Date(b.date).getTime();
    if (tA !== tB) return tB - tA;
    return 0;
  });

  return (
    <div className="relative space-y-4">
      <span className="absolute left-[11px] top-2 bottom-2 w-px bg-border" aria-hidden />
      {events.map((ev, idx) => {
        if (ev.kind === "unit_acquired") {
          const p = ev.payload as { cost: number; location?: string };
          const parts: string[] = [formatTimelineDate(ev.date)];
          if (p?.cost != null && p.cost > 0) parts.push(formatTimelineAmount(p.cost, "usd"));
          if (p?.location?.trim()) parts.push(p.location.trim());
          return (
            <div key="unit_acquired" className="relative flex gap-3">
              <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border bg-background" aria-hidden>
                <Package className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-sm font-medium text-foreground">Unit acquired</p>
                <p className="text-xs text-muted-foreground">{parts.join(" · ")}</p>
              </div>
            </div>
          );
        }
        if (ev.kind === "install")
          return (
            <div key="install" className="relative flex gap-3">
              <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border bg-background" aria-hidden>
                <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-sm font-medium text-foreground">
                  Date installed{customerName ? ` @ ${customerName}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">{formatTimelineDate(ev.date)}</p>
              </div>
            </div>
          );
        if (ev.kind === "uninstall")
          return (
            <div key="uninstall" className="relative flex gap-3">
              <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border bg-background" aria-hidden>
                <PackageX className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-sm font-medium text-foreground">
                  Date uninstalled{customerName ? ` @ ${customerName}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">{formatTimelineDate(ev.date)}</p>
              </div>
            </div>
          );
        if (ev.kind === "payment") {
          const p = ev.payload as { date: string; amount: number; currency: string };
          return (
            <div key={`payment-${p.date}-${p.amount}`} className="relative flex gap-3">
              <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border bg-background" aria-hidden>
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-sm font-medium text-foreground">
                  Payment received{customerName ? ` from ${customerName}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatTimelineDate(p.date)} · {formatTimelineAmount(p.amount, p.currency)}
                </p>
              </div>
            </div>
          );
        }
        if (ev.kind === "additional_cost") {
          const c = ev.payload as { amount: number; description: string };
          return (
            <div key={`additional-${idx}-${ev.date}-${c.description}`} className="relative flex gap-3">
              <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border bg-background" aria-hidden>
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-sm font-medium text-foreground">
                  {c.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatTimelineDate(ev.date)} · {formatTimelineAmount(c.amount, "usd")}
                </p>
              </div>
            </div>
          );
        }
        if (ev.kind === "note_added")
          return (
            <div key={`note-${idx}-${ev.date}`} className="relative flex gap-3">
              <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border bg-background" aria-hidden>
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-sm font-medium text-foreground">Note added</p>
                <p className="text-xs text-muted-foreground">{formatTimelineDate(ev.date)}</p>
              </div>
            </div>
          );
        const n = ev.payload as { amount: number; currency: string };
        return (
          <div key="next" className="relative flex gap-3">
            <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border bg-background" aria-hidden>
              <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-medium text-foreground">Next payment scheduled</p>
              <p className="text-xs text-muted-foreground">
                {formatTimelineDate(ev.date)} · {formatTimelineAmount(n.amount, n.currency)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AdditionalCostsField({
  unit,
  formatCurrency,
  patchUnit,
  load,
}: {
  unit: Unit;
  formatCurrency: (n: number) => string;
  patchUnit: (id: string, p: { washer?: Partial<MachineInfo>; dryer?: Partial<MachineInfo> }) => Promise<Unit | null>;
  load: () => Promise<void>;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [addAmount, setAddAmount] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addDate, setAddDate] = useState(() => new Date().toISOString().slice(0, 10));

  const entries: AdditionalCostEntry[] =
    unit.washer.additionalCosts && unit.washer.additionalCosts.length > 0
      ? unit.washer.additionalCosts
      : (unit.washer.repairCosts ?? 0) > 0
        ? [{ amount: unit.washer.repairCosts ?? 0, description: "Legacy" }]
        : [];

  async function handleAdd() {
    const amount = parseFloat(addAmount);
    if (Number.isNaN(amount) || amount < 0) return;
    const description = addDescription.trim() || "Additional cost";
    const date = addDate ? `${addDate}T00:00:00.000Z` : undefined;
    const nextEntries: AdditionalCostEntry[] = [...entries, { amount, description, date }];
    await patchUnit(unit.id, {
      washer: {
        additionalCosts: nextEntries,
        repairCosts: 0,
      },
      dryer: { repairCosts: 0 },
    });
    setAddOpen(false);
    setAddAmount("");
    setAddDescription("");
    setAddDate(new Date().toISOString().slice(0, 10));
    load();
  }

  async function handleRemove(index: number) {
    const next = entries.filter((_, i) => i !== index);
    await patchUnit(unit.id, {
      washer: {
        additionalCosts: next,
        repairCosts: 0,
      },
      dryer: { repairCosts: 0 },
    });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">Additional costs</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 shrink-0"
          onClick={() => {
            setAddDate(new Date().toISOString().slice(0, 10));
            setAddOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
      <div className="space-y-1.5">
        {entries.map((e, i) => (
          <div key={i} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded border border-border bg-muted/30 text-sm">
            <span className="truncate min-w-0 flex-1">{e.description || "—"}</span>
            <span className="shrink-0 whitespace-nowrap">{formatCurrency(e.amount ?? 0)}</span>
            {e.date ? (
              <span className="text-muted-foreground shrink-0 text-xs whitespace-nowrap">
                {new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" })}
              </span>
            ) : (
              <span className="shrink-0 w-16" />
            )}
            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="text-muted-foreground hover:text-destructive p-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Remove ${e.description}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add cost</DialogTitle>
            <DialogDescription>Enter the description, cost, and date for this additional cost.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="add-cost-desc" className="text-sm font-medium">
                Description
              </label>
              <Input
                id="add-cost-desc"
                placeholder="e.g. Repair, parts, labor"
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="add-cost-amount" className="text-sm font-medium">
                Cost
              </label>
              <Input
                id="add-cost-amount"
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="add-cost-date" className="text-sm font-medium">
                Date
              </label>
              <Input
                id="add-cost-date"
                type="date"
                value={addDate}
                onChange={(e) => setAddDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAdd}
              disabled={Number.isNaN(parseFloat(addAmount)) || parseFloat(addAmount) < 0}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditableUnitCostField({
  unit,
  field,
  formatCurrency,
  patchUnit,
  infoEditingField,
  setInfoEditingField,
  inlineInputRef,
  compact,
  label: labelProp,
}: {
  unit: Unit;
  field: "acquisition" | "additional";
  formatCurrency: (n: number) => string;
  patchUnit: (id: string, p: { washer?: Partial<MachineInfo>; dryer?: Partial<MachineInfo> }) => Promise<Unit | null>;
  infoEditingField: { slot: EditableField; field: MachineField | "acquisition" | "additional" } | null;
  setInfoEditingField: (f: { slot: EditableField; field: MachineField | "acquisition" | "additional" } | null) => void;
  inlineInputRef: React.RefObject<HTMLInputElement>;
  compact?: boolean;
  label?: string;
}) {
  const value = field === "acquisition" ? (unit.washer.purchaseCost ?? 0) : (unit.washer.repairCosts ?? 0);
  const isEditing = infoEditingField?.slot === "unit" && infoEditingField?.field === field;

  const handleSave = (n: number) => {
    if (!Number.isNaN(n) && n >= 0) {
      if (field === "acquisition") {
        patchUnit(unit.id, { washer: { purchaseCost: n }, dryer: { purchaseCost: 0 } });
      } else {
        patchUnit(unit.id, { washer: { repairCosts: n }, dryer: { repairCosts: 0 } });
      }
    }
    setInfoEditingField(null);
  };

  const label = labelProp ?? (field === "acquisition" ? "Acquisition cost" : "Additional costs");
  const inputOrButton = isEditing ? (
    <Input
      ref={inlineInputRef}
      type="number"
      min={0}
      step={0.01}
      className={compact ? "h-7 w-20" : "h-8 mt-0.5"}
      defaultValue={value}
      onBlur={(e) => handleSave(parseFloat(e.target.value))}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleSave(parseFloat((e.target as HTMLInputElement).value));
        if (e.key === "Escape") setInfoEditingField(null);
      }}
      autoFocus
    />
  ) : (
        <button
          type="button"
          className="text-sm text-left hover:bg-muted rounded px-2 py-1 -mx-2 block w-full whitespace-nowrap"
          onClick={() => setInfoEditingField({ slot: "unit", field })}
        >
          {formatCurrency(value)}
        </button>
  );

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground shrink-0 whitespace-nowrap">{label}</span>
        {inputOrButton}
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground whitespace-nowrap">{label}</p>
      {inputOrButton}
    </div>
  );
}

function EditableMachineField({
  unit,
  slot,
  field,
  label,
  formatCurrency,
  patchUnit,
  infoEditingField,
  setInfoEditingField,
  inlineInputRef,
  format,
  compact,
}: {
  unit: Unit;
  slot: "washer" | "dryer";
  field: MachineField;
  label?: string;
  formatCurrency: (n: number) => string;
  patchUnit: (id: string, p: { washer?: Partial<MachineInfo>; dryer?: Partial<MachineInfo> }) => Promise<Unit | null>;
  infoEditingField: { slot: EditableField; field: MachineField | "acquisition" | "additional" } | null;
  setInfoEditingField: (f: { slot: EditableField; field: MachineField | "acquisition" | "additional" } | null) => void;
  inlineInputRef: React.RefObject<HTMLInputElement>;
  format?: "currency" | "date";
  compact?: boolean;
}) {
  const machine = unit[slot];
  const value = machine[field];
  const isEditing = infoEditingField?.slot === slot && infoEditingField?.field === field;

  const displayValue =
    field === "purchaseCost" || field === "repairCosts"
      ? formatCurrency((value as number) ?? 0)
      : format === "date"
        ? (value as string | undefined)
          ? (() => {
              const s = (value as string).slice(0, 10);
              const [y, m, d] = s.split("-").map(Number);
              return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" });
            })()
          : "—"
        : (value as string | undefined) ?? "—";

  const handleSave = (v: string | number) => {
    if (field === "purchaseCost" || field === "repairCosts") {
      const n = typeof v === "string" ? parseFloat(v) : v;
      if (!Number.isNaN(n) && n >= 0) {
        patchUnit(unit.id, { [slot]: { [field]: n } });
      }
    } else {
      const s = typeof v === "string" ? v.trim() : String(v).trim();
      patchUnit(unit.id, { [slot]: { [field]: s || undefined } });
    }
    setInfoEditingField(null);
  };

  const displayLabel = label ?? field.replace(/([A-Z])/g, " $1").trim();

  const dateValue = format === "date" && value ? (value as string).slice(0, 10) : "";
  const inputDefaultValue =
    format === "currency" || field === "purchaseCost" || field === "repairCosts"
      ? (value as number) ?? 0
      : format === "date"
        ? dateValue
        : (value as string) ?? "";

  const inputOrButton = isEditing ? (
    <Input
      ref={inlineInputRef}
      type={format === "currency" ? "number" : format === "date" ? "date" : "text"}
      min={format === "currency" ? 0 : undefined}
      step={format === "currency" ? 0.01 : undefined}
      className={compact ? "h-7 min-w-[6rem] flex-1" : "h-8 mt-0.5"}
      defaultValue={inputDefaultValue}
      onBlur={(e) => {
        if (format === "currency") handleSave(parseFloat(e.target.value));
        else handleSave(e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          if (format === "currency") handleSave(parseFloat((e.target as HTMLInputElement).value));
          else handleSave((e.target as HTMLInputElement).value);
        }
        if (e.key === "Escape") setInfoEditingField(null);
      }}
      autoFocus
    />
  ) : (
    <button
      type="button"
      className={`text-sm text-left hover:bg-muted rounded px-2 py-1 -mx-2 whitespace-nowrap ${compact ? "block" : "block w-full"}`}
      onClick={() => setInfoEditingField({ slot, field })}
    >
      {displayValue}
    </button>
  );

  if (compact) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground shrink-0 capitalize w-12 whitespace-nowrap">{displayLabel}</span>
        {inputOrButton}
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground capitalize whitespace-nowrap">{displayLabel}</p>
      {inputOrButton}
    </div>
  );
}
