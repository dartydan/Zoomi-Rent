"use client";

import { useState, useEffect, useRef } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CustomSelect } from "@/components/ui/custom-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, DollarSign, TrendingUp, User } from "lucide-react";
import type { Property, PropertyStatus } from "@/lib/property";

type EditableField = "model" | "purchaseCost" | "notes" | "assignedUserId";

type AdminUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  stripeCustomerId?: string | null;
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

/** Effective status for display: installed (green) is automatic when assigned + install date. */
type DotStatus = "installed" | "available" | "needs_repair" | "no_longer_owned";

function getDotStatus(item: Property, userById: (id: string) => AdminUser | undefined): DotStatus {
  if (item.status === "no_longer_owned") return "no_longer_owned";
  if (item.status === "needs_repair") return "needs_repair";
  if (item.assignedUserId) {
    const u = userById(item.assignedUserId);
    if (u?.installDate) return "installed";
  }
  return "available";
}

const DOT_COLORS: Record<DotStatus, string> = {
  installed: "bg-green-500",
  available: "bg-blue-500",
  needs_repair: "bg-yellow-500",
  no_longer_owned: "bg-red-500",
};

const DOT_LABELS: Record<DotStatus, string> = {
  installed: "Installed / generating revenue",
  available: "Available to install",
  needs_repair: "Needs repair",
  no_longer_owned: "No longer owned",
};

export default function PropertyPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [infoPropertyId, setInfoPropertyId] = useState<string | null>(null);
  const [infoEditingField, setInfoEditingField] = useState<EditableField | null>(null);
  const [editingCell, setEditingCell] = useState<{ propertyId: string; field: EditableField } | null>(null);
  const [formModel, setFormModel] = useState("");
  const [formPurchaseCost, setFormPurchaseCost] = useState("");
  const [formAssignedUserId, setFormAssignedUserId] = useState<string>("");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const inlineInputRef = useRef<HTMLInputElement | null>(null);

  const userById = (id: string) => users.find((u) => u.id === id);
  const infoProperty = infoPropertyId ? properties.find((p) => p.id === infoPropertyId) : null;

  async function updateStatus(propertyId: string, status: PropertyStatus) {
    try {
      const res = await fetch(`/api/admin/property/${propertyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const updated = (await res.json()) as Property;
      setProperties((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch {
      setError("Failed to update status");
    }
  }

  async function patchProperty(
    propertyId: string,
    payload: { model?: string; purchaseCost?: number; notes?: string; assignedUserId?: string | null }
  ): Promise<Property | null> {
    try {
      const res = await fetch(`/api/admin/property/${propertyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Failed to update");
      }
      const updated = (await res.json()) as Property;
      setProperties((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      return updated;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
      return null;
    }
  }

  async function load() {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const [propRes, usersRes] = await Promise.all([
        fetch("/api/admin/property", { signal: controller.signal }),
        fetch("/api/admin/users", { signal: controller.signal }),
      ]);
      if (!propRes.ok) {
        const msg = (await propRes.json().catch(() => ({})) as { error?: string }).error;
        throw new Error(msg || "Failed to load properties");
      }
      if (!usersRes.ok) {
        const msg = (await usersRes.json().catch(() => ({})) as { error?: string }).error;
        throw new Error(msg || "Failed to load users");
      }
      const propData = (await propRes.json()) as { properties: Property[] };
      const usersData = (await usersRes.json()) as { users: AdminUser[] };
      setProperties(propData.properties ?? []);
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

  function openCreate() {
    setEditingId(null);
    setFormModel("");
    setFormPurchaseCost("");
    setFormAssignedUserId("");
    setFormNotes("");
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(item: Property) {
    setEditingId(item.id);
    setFormModel(item.model);
    setFormPurchaseCost(String(item.purchaseCost));
    setFormAssignedUserId(item.assignedUserId ?? "");
    setFormNotes(item.notes ?? "");
    setFormError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const model = formModel.trim();
    const purchaseCost = parseFloat(formPurchaseCost);
    const assignedUserId = formAssignedUserId.trim() || null;

    if (!model) {
      setFormError("Model is required.");
      return;
    }
    if (Number.isNaN(purchaseCost) || purchaseCost < 0) {
      setFormError("Purchase cost must be a non-negative number.");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/property/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            purchaseCost,
            notes: formNotes.trim() || undefined,
            assignedUserId: assignedUserId ?? null,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "Failed to update");
        }
        const updated = (await res.json()) as Property;
        setProperties((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const res = await fetch("/api/admin/property", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            purchaseCost,
            notes: formNotes.trim() || undefined,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "Failed to create");
        }
        const created = (await res.json()) as Property;
        setProperties((prev) => [...prev, created]);
      }
      setDialogOpen(false);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Property</h1>
          <p className="text-sm text-muted-foreground">
            Track assets: purchase cost and revenue generated
          </p>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add property
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All properties</CardTitle>
          <CardDescription>
            Each item has a unique ID. Assign to a customer to compute revenue from Stripe.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Loading…
            </div>
          ) : (
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6 w-10" aria-label="Status" />
                  <TableHead className="w-[180px]">ID</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Purchase cost</TableHead>
                  <TableHead className="text-right">Revenue generated</TableHead>
                  <TableHead className="max-w-[200px]">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {properties.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8 pl-6 pr-6">
                      No properties yet. Add one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  properties.map((item) => {
                    const assignedUser = item.assignedUserId ? userById(item.assignedUserId) : null;
                    const dotStatus = getDotStatus(item, userById);
                    const isEditing = (field: EditableField) =>
                      editingCell?.propertyId === item.id && editingCell?.field === field;
                    return (
                      <TableRow key={item.id} className="hover:bg-muted/50">
                        <TableCell className="pl-6">
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
                                onClick={() => updateStatus(item.id, "available")}
                                disabled={dotStatus === "installed"}
                              >
                                <span className="inline-block h-2 w-2 rounded-full bg-blue-500 mr-2" />
                                Available to install
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus(item.id, "needs_repair")}>
                                <span className="inline-block h-2 w-2 rounded-full bg-yellow-500 mr-2" />
                                Needs repair
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus(item.id, "no_longer_owned")}>
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
                          <button
                            type="button"
                            onClick={() => { setEditingCell(null); setInfoPropertyId(item.id); }}
                            className="text-left text-primary hover:underline focus:outline-none focus:underline"
                          >
                            {item.id}
                          </button>
                        </TableCell>
                        <TableCell className="font-medium">
                          {isEditing("model") ? (
                            <Input
                              ref={inlineInputRef}
                              className="h-8 w-full"
                              defaultValue={item.model}
                              onBlur={(e) => {
                                const v = e.target.value.trim();
                                if (v) patchProperty(item.id, { model: v });
                                setEditingCell(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const v = (e.target as HTMLInputElement).value.trim();
                                  if (v) patchProperty(item.id, { model: v });
                                  setEditingCell(null);
                                }
                                if (e.key === "Escape") setEditingCell(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          ) : (
                            <button
                              type="button"
                              className="text-left hover:bg-muted rounded px-1 py-0.5 -mx-1 w-full"
                              onClick={() => setEditingCell({ propertyId: item.id, field: "model" })}
                            >
                              {item.model}
                            </button>
                          )}
                        </TableCell>
                        <TableCell>
                          <CustomSelect
                            options={[
                              { value: "", label: "None" },
                              ...users.map((u) => ({ value: u.id, label: userDisplay(u) })),
                            ]}
                            value={item.assignedUserId ?? ""}
                            onChange={async (value) => {
                              await patchProperty(item.id, { assignedUserId: value.trim() || null });
                            }}
                            placeholder="Customer"
                            icon={<User className="h-4 w-4" />}
                            className="min-w-[120px]"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing("purchaseCost") ? (
                            <Input
                              ref={inlineInputRef}
                              type="number"
                              min={0}
                              step={0.01}
                              className="h-8 w-24 ml-auto"
                              defaultValue={item.purchaseCost}
                              onBlur={(e) => {
                                const n = parseFloat(e.target.value);
                                if (!Number.isNaN(n) && n >= 0) patchProperty(item.id, { purchaseCost: n });
                                setEditingCell(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const n = parseFloat((e.target as HTMLInputElement).value);
                                  if (!Number.isNaN(n) && n >= 0) patchProperty(item.id, { purchaseCost: n });
                                  setEditingCell(null);
                                }
                                if (e.key === "Escape") setEditingCell(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          ) : (
                            <button
                              type="button"
                              className="text-right hover:bg-muted rounded px-1 py-0.5 -mx-1 ml-auto flex items-center justify-end gap-1 w-full"
                              onClick={() => setEditingCell({ propertyId: item.id, field: "purchaseCost" })}
                            >
                              <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
                              {formatCurrency(item.purchaseCost)}
                            </button>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="flex items-center justify-end gap-1">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            {formatCurrency(item.revenueGenerated)}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[200px] text-muted-foreground text-sm">
                          {isEditing("notes") ? (
                            <Input
                              ref={inlineInputRef}
                              className="h-8 w-full"
                              defaultValue={item.notes ?? ""}
                              placeholder="Notes"
                              onBlur={(e) => {
                                patchProperty(item.id, { notes: e.target.value.trim() || undefined });
                                setEditingCell(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  patchProperty(item.id, {
                                    notes: (e.target as HTMLInputElement).value.trim() || undefined,
                                  });
                                  setEditingCell(null);
                                }
                                if (e.key === "Escape") setEditingCell(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          ) : (
                            <button
                              type="button"
                              className="text-left truncate max-w-full hover:bg-muted rounded px-1 py-0.5 -mx-1 block w-full"
                              onClick={() => setEditingCell({ propertyId: item.id, field: "notes" })}
                            >
                              {item.notes ?? "—"}
                            </button>
                          )}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit property" : "Add property"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update model, purchase cost, assign to customer, or revenue (when not assigned)."
                : "A unique ID will be generated when you create the item."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="prop-model">Model</Label>
              <Input
                id="prop-model"
                value={formModel}
                onChange={(e) => setFormModel(e.target.value)}
                placeholder="e.g. Unit 101"
                required
              />
            </div>
            {editingId && (
              <div className="space-y-2">
                <Label>Assign to customer</Label>
                <CustomSelect
                  options={[
                    { value: "", label: "None (unassigned)" },
                    ...users.map((u) => ({ value: u.id, label: userDisplay(u) })),
                  ]}
                  value={formAssignedUserId}
                  onChange={setFormAssignedUserId}
                  placeholder="Select customer"
                  icon={<User className="h-4 w-4" />}
                />
                <p className="text-xs text-muted-foreground">
                  When assigned, revenue is computed from Stripe (install date to subscription end).
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="prop-cost">Purchase cost ($)</Label>
              <Input
                id="prop-cost"
                type="number"
                min={0}
                step={0.01}
                value={formPurchaseCost}
                onChange={(e) => setFormPurchaseCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
            {editingId && formAssignedUserId && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Revenue is computed from Stripe (install date to subscription end). When you unassign, that revenue is added to the property total and continues when you assign again.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="prop-notes">Notes (optional)</Label>
              <Input
                id="prop-notes"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Optional notes"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!infoPropertyId}
        onOpenChange={(open) => {
          if (!open) {
            setInfoPropertyId(null);
            setInfoEditingField(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          {infoProperty && (
            <>
              <DialogHeader>
                <DialogTitle>Property info</DialogTitle>
                <DialogDescription>{infoProperty.model}</DialogDescription>
              </DialogHeader>
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">ID</p>
                    <p className="font-mono text-sm break-all">{infoProperty.id}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Model</p>
                    {infoEditingField === "model" ? (
                      <Input
                        ref={inlineInputRef}
                        className="h-8"
                        defaultValue={infoProperty.model}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v) patchProperty(infoProperty.id, { model: v });
                          setInfoEditingField(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const v = (e.target as HTMLInputElement).value.trim();
                            if (v) patchProperty(infoProperty.id, { model: v });
                            setInfoEditingField(null);
                          }
                          if (e.key === "Escape") setInfoEditingField(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        className="text-sm text-left hover:bg-muted rounded px-2 py-1 -mx-2"
                        onClick={() => setInfoEditingField("model")}
                      >
                        {infoProperty.model}
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Status</p>
                    <span className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full border border-border shrink-0 ${DOT_COLORS[getDotStatus(infoProperty, userById)]}`}
                        aria-hidden
                      />
                      <span className="text-sm">{DOT_LABELS[getDotStatus(infoProperty, userById)]}</span>
                    </span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Customer</p>
                    <CustomSelect
                      options={[
                        { value: "", label: "None (unassigned)" },
                        ...users.map((u) => ({ value: u.id, label: userDisplay(u) })),
                      ]}
                      value={infoProperty.assignedUserId ?? ""}
                      onChange={async (value) => {
                        await patchProperty(infoProperty.id, {
                          assignedUserId: value.trim() || null,
                        });
                      }}
                      placeholder="Select customer"
                      icon={<User className="h-4 w-4" />}
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Purchase cost</p>
                    {infoEditingField === "purchaseCost" ? (
                      <Input
                        ref={inlineInputRef}
                        type="number"
                        min={0}
                        step={0.01}
                        className="h-8"
                        defaultValue={infoProperty.purchaseCost}
                        onBlur={(e) => {
                          const n = parseFloat(e.target.value);
                          if (!Number.isNaN(n) && n >= 0) patchProperty(infoProperty.id, { purchaseCost: n });
                          setInfoEditingField(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const n = parseFloat((e.target as HTMLInputElement).value);
                            if (!Number.isNaN(n) && n >= 0) patchProperty(infoProperty.id, { purchaseCost: n });
                            setInfoEditingField(null);
                          }
                          if (e.key === "Escape") setInfoEditingField(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        className="text-sm text-left hover:bg-muted rounded px-2 py-1 -mx-2"
                        onClick={() => setInfoEditingField("purchaseCost")}
                      >
                        {formatCurrency(infoProperty.purchaseCost)}
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Revenue generated</p>
                    <p className="text-sm">{formatCurrency(infoProperty.revenueGenerated)}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Notes</p>
                    {infoEditingField === "notes" ? (
                      <Input
                        ref={inlineInputRef}
                        className="h-8"
                        defaultValue={infoProperty.notes ?? ""}
                        placeholder="Optional notes"
                        onBlur={(e) => {
                          patchProperty(infoProperty.id, { notes: e.target.value.trim() || undefined });
                          setInfoEditingField(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            patchProperty(infoProperty.id, {
                              notes: (e.target as HTMLInputElement).value.trim() || undefined,
                            });
                            setInfoEditingField(null);
                          }
                          if (e.key === "Escape") setInfoEditingField(null);
                        }}
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        className="text-sm text-left hover:bg-muted rounded px-2 py-1 -mx-2 text-muted-foreground w-full"
                        onClick={() => setInfoEditingField("notes")}
                      >
                        {infoProperty.notes || "—"}
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={() => { setInfoPropertyId(null); setInfoEditingField(null); }}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
