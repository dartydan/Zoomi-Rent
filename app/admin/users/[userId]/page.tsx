"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calendar, DollarSign, Mail, Phone, MapPin, X, Upload, FileText, ExternalLink, Wrench, CreditCard, CalendarClock, Plus, LogIn } from "lucide-react";
import type { InstallInfo, InstallRecord } from "@/lib/install";
import type { Unit } from "@/lib/unit";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CustomerProfile = {
  firstName?: string;
  lastName?: string;
  address?: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  desiredInstallTime?: string;
  housingType?: string;
  selectedPlan?: string;
} | null;

function parseInstallAddress(s: string | undefined): { street: string; city: string; state: string; zip: string } {
  if (!s || !s.trim()) return { street: "", city: "", state: "", zip: "" };
  const parts = s.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { street: "", city: "", state: "", zip: "" };
  if (parts.length === 1) return { street: parts[0], city: "", state: "", zip: "" };
  if (parts.length === 2) return { street: parts[0], city: parts[1], state: "", zip: "" };
  const last = parts[parts.length - 1];
  const spaceIdx = last.lastIndexOf(" ");
  const state = spaceIdx > 0 ? last.slice(0, spaceIdx).trim() : last;
  const zip = spaceIdx > 0 ? last.slice(spaceIdx + 1).trim() : "";
  if (parts.length === 3) return { street: parts[0], city: parts[1], state, zip };
  return {
    street: parts.slice(0, -2).join(", "),
    city: parts[parts.length - 2],
    state,
    zip,
  };
}

function combineInstallAddress(parts: { street: string; city: string; state: string; zip: string }): string {
  const { street, city, state, zip } = parts;
  const arr = [street.trim(), city.trim(), state.trim(), zip.trim()].filter(Boolean);
  if (arr.length === 0) return "";
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return `${arr[0]}, ${arr[1]}`;
  if (arr.length === 3) return `${arr[0]}, ${arr[1]}, ${arr[2]}`;
  return `${arr[0]}, ${arr[1]}, ${arr[2]} ${arr[3]}`;
}

export default function AdminUserInstallPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const [data, setData] = useState<InstallInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [installs, setInstalls] = useState<InstallRecord[]>([]);
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const [installDialogEditId, setInstallDialogEditId] = useState<string | null>(null);
  const [installDate, setInstallDate] = useState("");
  const [uninstallDate, setUninstallDate] = useState("");
  const [installStreet, setInstallStreet] = useState("");
  const [installCity, setInstallCity] = useState("");
  const [installState, setInstallState] = useState("");
  const [installZip, setInstallZip] = useState("");
  const [editingAddress, setEditingAddress] = useState(false);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);
  const [contracts, setContracts] = useState<File[]>([]);
  const [existingContractUrls, setExistingContractUrls] = useState<string[]>([]);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile>(null);
  const [lifetimeValue, setLifetimeValue] = useState<number>(0);
  type TimelineData = {
    installDate: string | null;
    payments: { date: string; amount: number; currency: string }[];
    nextPaymentDate: string | null;
    nextPaymentAmount: number | null;
    nextPaymentCurrency: string;
    logins: { date: string }[];
    paymentMethodChanges: { date: string; type: "payment_method_added" | "payment_method_removed" | "payment_settings_updated" }[];
  };
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [assignedUnit, setAssignedUnit] = useState<Unit | null>(null);
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [uninstallLoading, setUninstallLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editedNameValue, setEditedNameValue] = useState("");
  const [nameClickCaretIndex, setNameClickCaretIndex] = useState(0);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [savingName, setSavingName] = useState(false);
  const [editingContactField, setEditingContactField] = useState<"email" | "phone" | "address" | null>(null);
  const [editingContactValue, setEditingContactValue] = useState("");
  const [contactClickCaretIndex, setContactClickCaretIndex] = useState(0);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const prevInstallDialogOpen = useRef(false);

  useEffect(() => {
    if (prevInstallDialogOpen.current && !installDialogOpen && installs.length > 0) {
      const first = installs[0];
      setNotes(first.notes ?? "");
      setExistingPhotoUrls(first.photoUrls ?? []);
      setExistingContractUrls(first.contractUrls ?? []);
      const parsed = parseInstallAddress(first.installAddress ?? "");
      setInstallStreet(parsed.street);
      setInstallCity(parsed.city);
      setInstallState(parsed.state);
      setInstallZip(parsed.zip);
    }
    prevInstallDialogOpen.current = installDialogOpen;
  }, [installDialogOpen, installs]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/admin/users/${userId}/install`);
        if (!res.ok) throw new Error("Failed to load");
        const json = (await res.json()) as InstallInfo & { customerProfile?: CustomerProfile; lifetimeValue?: number; installs?: InstallRecord[] };
        if (cancelled) return;
        setData(json);
        setCustomerProfile(json.customerProfile ?? null);
        setLifetimeValue(typeof json.lifetimeValue === "number" ? json.lifetimeValue : 0);
        const list = Array.isArray(json.installs) ? json.installs : [];
        setInstalls(list);
        const first = list[0];
        if (first) {
          setNotes(first.notes ?? "");
          setExistingPhotoUrls(first.photoUrls ?? []);
          setExistingContractUrls(first.contractUrls ?? []);
          const parsed = parseInstallAddress(first.installAddress ?? "");
          setInstallStreet(parsed.street);
          setInstallCity(parsed.city);
          setInstallState(parsed.state);
          setInstallZip(parsed.zip);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const empty: TimelineData = {
      installDate: null,
      payments: [],
      nextPaymentDate: null,
      nextPaymentAmount: null,
      nextPaymentCurrency: "usd",
      logins: [],
      paymentMethodChanges: [],
    };
    fetch(`/api/admin/users/${userId}/timeline`)
      .then((res) => {
        if (!res.ok) return empty;
        return res.json() as Promise<TimelineData>;
      })
      .then((json) => {
        if (cancelled) return;
        setTimeline({
          installDate: json.installDate ?? null,
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
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetch(`/api/admin/units?userId=${encodeURIComponent(userId)}`)
      .then((res) => (res.ok ? res.json() : Promise.resolve(null)))
      .then((json: Unit | null) => {
        if (!cancelled) setAssignedUnit(json);
      })
      .catch(() => {
        if (!cancelled) setAssignedUnit(null);
      });
    return () => { cancelled = true; };
  }, [userId]);

  // Unit dialog uses embedded washer/dryer from assignedUnit directly

  async function refetchAssignedUnit() {
    const res = await fetch(`/api/admin/units?userId=${encodeURIComponent(userId)}`);
    const json = await res.json();
    setAssignedUnit(res.ok ? json : null);
  }

  async function handleSendToWarehouse() {
    if (!assignedUnit) return;
    setUninstallLoading(true);
    try {
      const res = await fetch(`/api/admin/units/${assignedUnit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedUserId: null }),
      });
      if (!res.ok) throw new Error("Failed to send to warehouse");
      setUnitDialogOpen(false);
      await refetchAssignedUnit();
    } catch {
      setUninstallLoading(false);
    } finally {
      setUninstallLoading(false);
    }
  }

  useEffect(() => {
    if (!editingName || !nameInputRef.current) return;
    const input = nameInputRef.current;
    const idx = nameClickCaretIndex;
    const id = requestAnimationFrame(() => {
      input.setSelectionRange(idx, idx);
    });
    return () => cancelAnimationFrame(id);
  }, [editingName, nameClickCaretIndex]);

  useEffect(() => {
    const ref =
      editingContactField === "email"
        ? emailInputRef.current
        : editingContactField === "phone"
          ? phoneInputRef.current
          : null;
    if (!editingContactField || !ref) return;
    const idx = contactClickCaretIndex;
    const id = requestAnimationFrame(() => {
      ref.setSelectionRange(idx, idx);
    });
    return () => cancelAnimationFrame(id);
  }, [editingContactField, contactClickCaretIndex]);

  function openInstallDialog(editId: string | null) {
    setInstallDialogEditId(editId);
    setInstallDialogOpen(true);
    if (editId !== null) {
      const rec = installs.find((r) => r.id === editId);
      if (rec) {
        setInstallDate(rec.installDate ?? "");
        setUninstallDate(rec.uninstallDate ?? "");
        const parsed = parseInstallAddress(rec.installAddress ?? "");
        setInstallStreet(parsed.street);
        setInstallCity(parsed.city);
        setInstallState(parsed.state);
        setInstallZip(parsed.zip);
        setNotes(rec.notes ?? "");
        setExistingPhotoUrls(rec.photoUrls ?? []);
        setExistingContractUrls(rec.contractUrls ?? []);
        setPhotos([]);
        setContracts([]);
        setEditingAddress(false);
      }
    } else {
      setInstallDate("");
      setUninstallDate("");
      setInstallStreet("");
      setInstallCity("");
      setInstallState("");
      setInstallZip("");
      setNotes("");
      setExistingPhotoUrls([]);
      setExistingContractUrls([]);
      setPhotos([]);
      setContracts([]);
      setEditingAddress(false);
    }
    setError(null);
  }

  function closeInstallDialog() {
    setInstallDialogOpen(false);
    setInstallDialogEditId(null);
  }

  async function handleCardSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const first = installs[0];
      const formData = new FormData();
      formData.append("installId", first?.id ?? "new");
      formData.append("installDate", first?.installDate ?? "");
      formData.append("uninstallDate", first?.uninstallDate ?? "");
      formData.append(
        "installAddress",
        combineInstallAddress({
          street: installStreet,
          city: installCity,
          state: installState,
          zip: installZip,
        })
      );
      formData.append("notes", notes || "");
      existingPhotoUrls.forEach((url, index) => {
        formData.append(`existingPhotoUrls[${index}]`, url);
      });
      existingContractUrls.forEach((url, index) => {
        formData.append(`existingContractUrls[${index}]`, url);
      });
      photos.forEach((file) => formData.append("photos", file));
      contracts.forEach((file) => formData.append("contracts", file));

      const res = await fetch(`/api/admin/users/${userId}/install`, {
        method: "PATCH",
        body: formData,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Failed to save");
      }
      const updated = (await res.json()) as { installs?: InstallRecord[] };
      setInstalls(Array.isArray(updated.installs) ? updated.installs : []);
      const refetch = await fetch(`/api/admin/users/${userId}/install`);
      if (refetch.ok) {
        const json = (await refetch.json()) as InstallInfo & { installs?: InstallRecord[] };
        setData(json);
        const list = Array.isArray(json.installs) ? json.installs : [];
        setInstalls(list);
        const first = list[0];
        if (first) {
          setNotes(first.notes ?? "");
          setExistingPhotoUrls(first.photoUrls ?? []);
          setExistingContractUrls(first.contractUrls ?? []);
          const parsed = parseInstallAddress(first.installAddress ?? "");
          setInstallStreet(parsed.street);
          setInstallCity(parsed.city);
          setInstallState(parsed.state);
          setInstallZip(parsed.zip);
        }
      }
      setPhotos([]);
      setContracts([]);
      setEditingAddress(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleInstallSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("installId", installDialogEditId ?? "new");
      formData.append("installDate", installDate || "");
      formData.append("uninstallDate", uninstallDate || "");
      formData.append(
        "installAddress",
        combineInstallAddress({
          street: installStreet,
          city: installCity,
          state: installState,
          zip: installZip,
        })
      );
      formData.append("notes", notes || "");
      existingPhotoUrls.forEach((url, index) => {
        formData.append(`existingPhotoUrls[${index}]`, url);
      });
      existingContractUrls.forEach((url, index) => {
        formData.append(`existingContractUrls[${index}]`, url);
      });
      photos.forEach((file) => formData.append("photos", file));
      contracts.forEach((file) => formData.append("contracts", file));

      const res = await fetch(`/api/admin/users/${userId}/install`, {
        method: "PATCH",
        body: formData,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Failed to save");
      }
      const updated = (await res.json()) as { installs?: InstallRecord[] };
      setInstalls(Array.isArray(updated.installs) ? updated.installs : []);
      const refetch = await fetch(`/api/admin/users/${userId}/install`);
      if (refetch.ok) {
        const json = (await refetch.json()) as InstallInfo & { installs?: InstallRecord[] };
        setData(json);
        setInstalls(Array.isArray(json.installs) ? json.installs : []);
      }
      fetch(`/api/admin/users/${userId}/timeline`)
        .then((r) => (r.ok ? r.json() : null))
        .then((timelineJson) => {
          if (timelineJson) setTimeline(timelineJson);
        })
        .catch(() => {});
      closeInstallDialog();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos((prev) => [...prev, ...files]);
  };
  
  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };
  
  const removeExistingPhoto = (index: number) => {
    setExistingPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };
  
  const handleContractChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setContracts((prev) => [...prev, ...files]);
  };
  
  const removeContract = (index: number) => {
    setContracts((prev) => prev.filter((_, i) => i !== index));
  };
  
  const removeExistingContract = (index: number) => {
    setExistingContractUrls((prev) => prev.filter((_, i) => i !== index));
  };

  function formatFirstNameLastName(first: string | undefined, last: string | undefined): string {
    const parts = [first, last].filter(Boolean).map((s) => (s ?? "").trim()).filter(Boolean);
    if (parts.length === 0) return "Customer";
    return parts
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  }
  const displayName = formatFirstNameLastName(customerProfile?.firstName, customerProfile?.lastName);

  function getCaretIndexFromClick(e: React.MouseEvent, maxIndex: number): number {
    let index = maxIndex;
    if (typeof document.caretPositionFromPoint === "function") {
      const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
      if (pos?.offsetNode && typeof pos.offset === "number") index = pos.offset;
    } else if ((document as unknown as { caretRangeFromPoint?(x: number, y: number): { startOffset: number } | null }).caretRangeFromPoint) {
      const range = (document as unknown as { caretRangeFromPoint(x: number, y: number): { startOffset: number } | null }).caretRangeFromPoint(e.clientX, e.clientY);
      if (range) index = range.startOffset;
    }
    return Math.max(0, Math.min(index, maxIndex));
  }

  function formatTimelineDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
  function formatTimelineDateTime(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  function formatTimelineAmount(amount: number, currency: string) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
    }).format(amount);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 lg:col-span-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin/users")}
          className="text-primary w-fit"
        >
          ← Back to Customers
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {editingName ? (
            <input
              ref={nameInputRef}
              type="text"
              className="w-full min-w-[120px] max-w-full bg-transparent text-left text-2xl font-bold text-foreground rounded px-1 -mx-1 border-0 outline-none focus:outline-none focus:ring-0 cursor-text"
              value={editedNameValue}
              onChange={(e) => setEditedNameValue(e.target.value)}
              onBlur={() => {
                const trimmed = editedNameValue.trim();
                if (!trimmed) {
                  setEditingName(false);
                  setEditedNameValue(displayName);
                  return;
                }
                setSavingName(true);
                const spaceIdx = trimmed.indexOf(" ");
                const firstName = spaceIdx > 0 ? trimmed.slice(0, spaceIdx).trim() : trimmed;
                const lastName = spaceIdx > 0 ? trimmed.slice(spaceIdx).trim() : "";
                fetch(`/api/admin/users/${userId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ firstName, lastName: lastName || undefined }),
                })
                  .then((res) => {
                    if (res.ok) {
                      setCustomerProfile((prev) => (prev ? { ...prev, firstName, lastName: lastName || prev.lastName } : { firstName, lastName }));
                    }
                  })
                  .finally(() => {
                    setEditingName(false);
                    setSavingName(false);
                    setEditedNameValue(trimmed);
                  });
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setEditingName(false);
                  setEditedNameValue(displayName);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              autoFocus
            />
          ) : (
            <button
              type="button"
              onClick={(e) => {
                const display = loading ? "Customer" : displayName;
                setEditedNameValue(display);
                let index = display.length;
                if (display && typeof document.caretPositionFromPoint === "function") {
                  const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
                  if (pos?.offsetNode && typeof pos.offset === "number") index = pos.offset;
                } else if (display && (document as unknown as { caretRangeFromPoint?(x: number, y: number): { startOffset: number } | null }).caretRangeFromPoint) {
                  const range = (document as unknown as { caretRangeFromPoint(x: number, y: number): { startOffset: number } | null }).caretRangeFromPoint(e.clientX, e.clientY);
                  if (range) index = range.startOffset;
                }
                setNameClickCaretIndex(Math.max(0, Math.min(index, display.length)));
                setEditingName(true);
              }}
              className="text-left text-2xl font-bold text-foreground rounded px-1 -mx-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-text"
              style={{ appearance: "none", background: "none" }}
            >
              {loading ? "Customer" : displayName}
            </button>
          )}
          {customerProfile?.selectedPlan && (
            <Badge variant="secondary" className="text-sm font-medium">
              {customerProfile.selectedPlan}
            </Badge>
          )}
        </div>
      </div>

      <div className="min-w-0 space-y-6">
      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-border bg-muted/30 p-8">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      ) : error && !data && !customerProfile ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                setError(null);
                setLoading(true);
                fetch(`/api/admin/users/${userId}/install`)
                  .then((res) => {
                    if (!res.ok) throw new Error("Failed to load");
                    return res.json();
                  })
                  .then((json: InstallInfo & { customerProfile?: CustomerProfile; lifetimeValue?: number; installs?: InstallRecord[] }) => {
                    setData(json);
                    setCustomerProfile(json.customerProfile ?? null);
                    setLifetimeValue(typeof json.lifetimeValue === "number" ? json.lifetimeValue : 0);
                    setInstalls(Array.isArray(json.installs) ? json.installs : []);
                  })
                  .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
                  .finally(() => setLoading(false));
              }}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
      {/* Customer Overview: show when we have profile (from API) or install data */}
      {(customerProfile || data) && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Customer Info Card (from Get Started / Clerk) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  {editingContactField === "email" ? (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <input
                        ref={emailInputRef}
                        type="text"
                        className="flex-1 min-w-0 h-9 text-sm bg-transparent border-0 outline-none focus:outline-none focus:ring-0 cursor-text rounded px-1 -mx-1"
                        value={editingContactValue}
                        onChange={(e) => setEditingContactValue(e.target.value)}
                        onBlur={() => {
                          fetch(`/api/admin/users/${userId}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ email: editingContactValue.trim() || undefined }),
                          })
                            .then((res) => res.ok && res.json())
                            .then((json: { email?: string } | undefined) => {
                              if (json != null)
                                setCustomerProfile((p) => ({ ...(p ?? {}), email: json?.email ?? p?.email } as CustomerProfile));
                            })
                            .finally(() => setEditingContactField(null));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                          if (e.key === "Escape") {
                            setEditingContactValue(customerProfile?.email ?? "");
                            setEditingContactField(null);
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        placeholder="Add email"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        const value = customerProfile?.email ?? "";
                        const display = customerProfile?.email || "Add email";
                        setEditingContactValue(value);
                        setContactClickCaretIndex(getCaretIndexFromClick(e, value.length));
                        setEditingContactField("email");
                      }}
                      className="flex items-center gap-2 text-sm text-left w-full rounded px-2 py-1.5 -mx-2 hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-text"
                      style={{ appearance: "none", background: "none" }}
                    >
                      <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className={customerProfile?.email ? "text-foreground" : "text-muted-foreground"}>{customerProfile?.email || "Add email"}</span>
                    </button>
                  )}
                </div>
                <div>
                  {editingContactField === "phone" ? (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <input
                        ref={phoneInputRef}
                        type="tel"
                        className="flex-1 min-w-0 h-9 text-sm bg-transparent border-0 outline-none focus:outline-none focus:ring-0 cursor-text rounded px-1 -mx-1"
                        value={editingContactValue}
                        onChange={(e) => setEditingContactValue(e.target.value)}
                        onBlur={() => {
                          fetch(`/api/admin/users/${userId}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ phone: editingContactValue.trim() || undefined }),
                          })
                            .then((res) => res.ok && res.json())
                            .then((json: { phone?: string } | undefined) => {
                              if (json != null)
                                setCustomerProfile((p) => ({ ...(p ?? {}), phone: json?.phone ?? p?.phone } as CustomerProfile));
                            })
                            .finally(() => setEditingContactField(null));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                          if (e.key === "Escape") {
                            setEditingContactValue(customerProfile?.phone ?? "");
                            setEditingContactField(null);
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        placeholder="Add phone"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        const value = customerProfile?.phone ?? "";
                        setEditingContactValue(value);
                        setContactClickCaretIndex(getCaretIndexFromClick(e, value.length));
                        setEditingContactField("phone");
                      }}
                      className="flex items-center gap-2 text-sm text-left w-full rounded px-2 py-1.5 -mx-2 hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-text"
                      style={{ appearance: "none", background: "none" }}
                    >
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className={customerProfile?.phone ? "text-foreground" : "text-muted-foreground"}>{customerProfile?.phone || "Add phone"}</span>
                    </button>
                  )}
                </div>
                <div>
                  {editingContactField === "address" ? (
                    <div
                      className="flex items-center gap-2"
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setEditingContactValue(customerProfile?.address ?? [customerProfile?.street, customerProfile?.city, customerProfile?.state, customerProfile?.zip].filter(Boolean).join(", ") ?? "");
                          setEditingContactField(null);
                        }
                      }}
                    >
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <AddressAutocomplete
                          id="contact-address"
                          value={editingContactValue}
                          onChange={setEditingContactValue}
                          onPlaceSelect={({ street, city, state, zip }) => {
                            setEditingContactValue([street, city, state, zip].filter(Boolean).join(", "));
                          }}
                          placeholder="Add address"
                          className="h-9 text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="shrink-0 h-9 px-2"
                          onClick={() => {
                            setError(null);
                            fetch(`/api/admin/users/${userId}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ address: editingContactValue.trim() || undefined }),
                            })
                              .then((res) => res.ok && res.json())
                              .then((json: { address?: string } | undefined) => {
                                if (json != null)
                                  setCustomerProfile((p) => ({ ...(p ?? {}), address: json?.address ?? p?.address } as CustomerProfile));
                              })
                              .finally(() => setEditingContactField(null));
                          }}
                        >
                          Done
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        const value = customerProfile?.address ?? [customerProfile?.street, customerProfile?.city, customerProfile?.state, customerProfile?.zip].filter(Boolean).join(", ") ?? "";
                        setEditingContactValue(value);
                        setContactClickCaretIndex(getCaretIndexFromClick(e, value.length));
                        setEditingContactField("address");
                      }}
                      className="flex items-center gap-2 text-sm text-left w-full rounded px-2 py-1.5 -mx-2 hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-text"
                      style={{ appearance: "none", background: "none" }}
                    >
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className={customerProfile?.address || customerProfile?.street ? "text-foreground" : "text-muted-foreground"}>
                        {customerProfile?.address || [customerProfile?.street, customerProfile?.city, customerProfile?.state, customerProfile?.zip].filter(Boolean).join(", ") || "Add address"}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Unit installed */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Unit</CardTitle>
              <CardDescription>Washer and dryer pair assigned to this customer</CardDescription>
            </CardHeader>
            <CardContent>
              <button
                type="button"
                onClick={() => assignedUnit && setUnitDialogOpen(true)}
                disabled={!assignedUnit}
                className={
                  assignedUnit
                    ? "flex w-full min-h-[72px] items-center justify-center gap-2 rounded-md border border-green-600 dark:border-green-500 bg-green-50 dark:bg-green-950/40 px-4 py-3 text-sm font-medium text-green-800 dark:text-green-200 hover:bg-green-100 dark:hover:bg-green-900/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 cursor-pointer"
                    : "flex w-full min-h-[72px] items-center justify-center gap-2 rounded-md border border-border bg-muted/30 px-4 py-3 text-sm font-medium text-muted-foreground cursor-default border-dashed"
                }
              >
                {!assignedUnit && <Plus className="h-4 w-4" />}
                {assignedUnit ? "View unit" : "No unit assigned"}
              </button>
            </CardContent>
          </Card>

          {/* Lifetime Value */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lifetime Value</CardTitle>
              <CardDescription>Total revenue from this customer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold text-foreground">
                  {lifetimeValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <form onSubmit={handleCardSubmit}>
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">Details</CardTitle>
            <CardDescription>Install and uninstall dates, notes, photos, and signed contracts. Files are stored in Google Drive.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Installs</span>
              <div className="flex flex-wrap items-center gap-2">
                {installs.length > 0 && (
                  <>
                    {installs.map((rec) => (
                      <button
                        key={rec.id}
                        type="button"
                        onClick={() => openInstallDialog(rec.id)}
                        className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        {new Date(rec.installDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        <span className="text-muted-foreground">–</span>
                        {rec.uninstallDate
                          ? new Date(rec.uninstallDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : "—"}
                      </button>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 shrink-0"
                      onClick={() => openInstallDialog(null)}
                      aria-label="Add install"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {installs.length === 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openInstallDialog(null)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add install
                  </Button>
                )}
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium text-foreground">
                Notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Install notes, issues, etc."
                rows={4}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="photos" className="text-sm font-medium text-foreground">
                  Installation Photos
                </label>
                {existingPhotoUrls.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {existingPhotoUrls.map((url, index) => (
                      <div key={`existing-photo-${index}`} className="relative group">
                        <img
                          src={url}
                          alt={`Installation photo ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border-2 border-border"
                        />
                        {url.includes("drive.google.com") && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute bottom-1 left-1 text-primary text-xs flex items-center gap-0.5 bg-background/90 px-1.5 py-0.5 rounded"
                          >
                            View in Drive
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => removeExistingPhoto(index)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {photos.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    {photos.map((file, index) => (
                      <div key={`new-photo-${index}`} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`New photo ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border-2 border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded">
                          New
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="photos"
                    className="flex flex-col items-center justify-center w-full h-28 border-2 border-border border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center py-4">
                      <Upload className="w-6 h-6 mb-1.5 text-muted-foreground" />
                      <p className="mb-1 text-xs text-muted-foreground">
                        <span className="font-semibold">Click to upload</span>
                      </p>
                      <p className="text-xs text-muted-foreground">Images only</p>
                    </div>
                    <input
                      id="photos"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="contracts" className="text-sm font-medium text-foreground">
                  Signed Contract
                </label>
                {existingContractUrls.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {existingContractUrls.map((url, index) => (
                      <div key={`existing-contract-${index}`} className="flex items-center justify-between p-3 border-2 border-border rounded-lg bg-background group">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-sm truncate">contract-{index + 1}.pdf</span>
                          {url.includes("drive.google.com") && (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary text-xs flex items-center gap-1 flex-shrink-0"
                            >
                              View in Drive
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeExistingContract(index)}
                          className="bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {contracts.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {contracts.map((file, index) => (
                      <div key={`new-contract-${index}`} className="flex items-center justify-between p-3 border-2 border-primary rounded-lg bg-background group">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-sm truncate">{file.name}</span>
                          <Badge variant="default" className="text-xs">New</Badge>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeContract(index)}
                          className="bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="contracts"
                    className="flex flex-col items-center justify-center w-full h-28 border-2 border-border border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center py-4">
                      <FileText className="w-6 h-6 mb-1.5 text-muted-foreground" />
                      <p className="mb-1 text-xs text-muted-foreground">
                        <span className="font-semibold">Click to upload</span>
                      </p>
                      <p className="text-xs text-muted-foreground">PDF documents</p>
                    </div>
                    <input
                      id="contracts"
                      type="file"
                      multiple
                      accept="application/pdf,.pdf"
                      onChange={handleContractChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </CardContent>
        </Card>
      </form>

      <Dialog open={installDialogOpen} onOpenChange={(open) => !open && closeInstallDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{installDialogEditId === null ? "Add install" : "Edit install"}</DialogTitle>
            <DialogDescription>Install and uninstall dates, address, notes, photos, and contracts. Files are stored in Google Drive.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInstallSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="install-dialog-install-date">Install date</Label>
                <Input
                  id="install-dialog-install-date"
                  type="date"
                  value={installDate ? installDate.slice(0, 10) : ""}
                  onChange={(e) => setInstallDate(e.target.value ? `${e.target.value}T00:00:00.000Z` : "")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="install-dialog-uninstall-date">Uninstall date</Label>
                <Input
                  id="install-dialog-uninstall-date"
                  type="date"
                  value={uninstallDate ? uninstallDate.slice(0, 10) : ""}
                  onChange={(e) => setUninstallDate(e.target.value ? `${e.target.value}T00:00:00.000Z` : "")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="install-dialog-address">Address</Label>
              <AddressAutocomplete
                id="install-dialog-address"
                value={combineInstallAddress({ street: installStreet, city: installCity, state: installState, zip: installZip })}
                onChange={(v) => {
                  const parsed = parseInstallAddress(v);
                  setInstallStreet(parsed.street);
                  setInstallCity(parsed.city);
                  setInstallState(parsed.state);
                  setInstallZip(parsed.zip);
                }}
                onPlaceSelect={(parts) => {
                  setInstallStreet(parts.street);
                  setInstallCity(parts.city);
                  setInstallState(parts.state);
                  setInstallZip(parts.zip);
                }}
                placeholder="Street address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="install-dialog-notes">Notes</Label>
              <textarea
                id="install-dialog-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Install notes, issues, etc."
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Installation photos</Label>
                {existingPhotoUrls.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {existingPhotoUrls.map((url, index) => (
                      <div key={`dl-photo-${index}`} className="relative group">
                        <img src={url} alt="" className="w-full h-20 object-cover rounded border border-border" />
                        <button type="button" onClick={() => removeExistingPhoto(index)} className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {photos.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {photos.map((file, index) => (
                      <div key={`dl-new-${index}`} className="relative group">
                        <img src={URL.createObjectURL(file)} alt="" className="w-full h-20 object-cover rounded border border-primary" />
                        <button type="button" onClick={() => removePhoto(index)} className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-border border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors">
                  <Upload className="w-5 h-5 mb-1 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Click to upload</span>
                  <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              </div>
              <div className="space-y-2">
                <Label>Signed contract</Label>
                {existingContractUrls.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {existingContractUrls.map((url, index) => (
                      <div key={`dl-contract-${index}`} className="flex items-center justify-between p-2 border border-border rounded text-sm">
                        <span className="truncate">contract-{index + 1}.pdf</span>
                        <button type="button" onClick={() => removeExistingContract(index)} className="shrink-0 text-destructive">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {contracts.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {contracts.map((file, index) => (
                      <div key={`dl-new-c-${index}`} className="flex items-center justify-between p-2 border border-primary rounded text-sm">
                        <span className="truncate">{file.name}</span>
                        <button type="button" onClick={() => removeContract(index)} className="shrink-0 text-destructive">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-border border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors">
                  <FileText className="w-5 h-5 mb-1 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Click to upload PDF</span>
                  <input type="file" multiple accept="application/pdf,.pdf" onChange={handleContractChange} className="hidden" />
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeInstallDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      </>
      )}
      </div>

      {/* Timeline column - full height */}
      <aside className="w-full lg:w-[320px] lg:min-w-[320px] lg:self-stretch shrink-0">
        <Card className="h-full lg:min-h-[calc(100vh-8rem)] lg:sticky lg:top-6 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 space-y-0 pt-2">
            {timeline ? (
              <div className="relative space-y-4">
                {/* vertical line */}
                <span className="absolute left-[11px] top-2 bottom-2 w-px bg-border" aria-hidden />
                {(() => {
                  type Event = { date: string; kind: "install" | "payment" | "next" | "login" | "payment_method"; payload: unknown };
                  const events: Event[] = [];
                  if (timeline.installDate) events.push({ date: timeline.installDate, kind: "install", payload: null });
                  timeline.payments.forEach((p) => events.push({ date: p.date, kind: "payment", payload: p }));
                  if (timeline.nextPaymentDate && timeline.nextPaymentAmount != null)
                    events.push({
                      date: timeline.nextPaymentDate,
                      kind: "next",
                      payload: { amount: timeline.nextPaymentAmount, currency: timeline.nextPaymentCurrency },
                    });
                  timeline.logins.forEach((l) => events.push({ date: l.date, kind: "login", payload: null }));
                  timeline.paymentMethodChanges.forEach((pm) =>
                    events.push({ date: pm.date, kind: "payment_method", payload: pm })
                  );
                  events.sort((a, b) => {
                    const tA = new Date(a.date).getTime();
                    const tB = new Date(b.date).getTime();
                    if (tA !== tB) return tB - tA;
                    return 0;
                  });
                  if (events.length === 0) return <p className="text-sm text-muted-foreground pl-9">No timeline events yet.</p>;
                  return events.map((ev) => {
                    if (ev.kind === "login")
                      return (
                        <div key={`login-${ev.date}`} className="relative flex gap-3">
                          <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border bg-background" aria-hidden>
                            <LogIn className="h-3.5 w-3.5 text-muted-foreground" />
                          </span>
                          <div className="min-w-0 pt-0.5">
                            <p className="text-sm font-medium text-foreground">Logged in</p>
                            <p className="text-xs text-muted-foreground">{formatTimelineDateTime(ev.date)}</p>
                          </div>
                        </div>
                      );
                    if (ev.kind === "install")
                      return (
                        <div key="install" className="relative flex gap-3">
                          <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border bg-background" aria-hidden>
                            <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                          </span>
                          <div className="min-w-0 pt-0.5">
                            <p className="text-sm font-medium text-foreground">Date installed</p>
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
                            <p className="text-sm font-medium text-foreground">Payment received</p>
                            <p className="text-xs text-muted-foreground">
                              {formatTimelineDate(p.date)} · {formatTimelineAmount(p.amount, p.currency)}
                            </p>
                          </div>
                        </div>
                      );
                    }
                    if (ev.kind === "payment_method") {
                      const pm = ev.payload as { date: string; type: "payment_method_added" | "payment_method_removed" | "payment_settings_updated" };
                      const label =
                        pm.type === "payment_method_added"
                          ? "Payment method added"
                          : pm.type === "payment_method_removed"
                            ? "Payment method removed"
                            : "Default payment method updated";
                      return (
                        <div key={`payment-method-${ev.date}-${pm.type}`} className="relative flex gap-3">
                          <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-border bg-background" aria-hidden>
                            <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                          </span>
                          <div className="min-w-0 pt-0.5">
                            <p className="text-sm font-medium text-foreground">{label}</p>
                            <p className="text-xs text-muted-foreground">{formatTimelineDateTime(ev.date)}</p>
                          </div>
                        </div>
                      );
                    }
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
                  });
                })()}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading timeline…</p>
            )}
          </CardContent>
        </Card>
      </aside>

      {/* Unit info popup */}
      <Dialog open={unitDialogOpen} onOpenChange={(open) => !open && setUnitDialogOpen(false)}>
        <DialogContent className="max-w-md">
          {assignedUnit ? (
            <>
              <DialogHeader>
                <DialogTitle>Unit</DialogTitle>
                <DialogDescription className="font-mono text-xs break-all">{assignedUnit.id}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Unit cost:</span>{" "}
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(
                    (assignedUnit.washer.purchaseCost ?? 0) + (assignedUnit.washer.repairCosts ?? 0)
                  )}
                  {assignedUnit.washer.acquisitionSource && (
                    <> · From: {assignedUnit.washer.acquisitionSource}</>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Unit revenue:</span>{" "}
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(
                    (assignedUnit.washer.revenueGenerated ?? 0) + (assignedUnit.dryer.revenueGenerated ?? 0)
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Card className="border-green-600 dark:border-green-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Washer</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm font-medium">{[assignedUnit.washer.brand, assignedUnit.washer.model].filter(Boolean).join(" ") || "—"}</p>
                  </CardContent>
                </Card>
                <Card className="border-green-600 dark:border-green-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Dryer</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm font-medium">{[assignedUnit.dryer.brand, assignedUnit.dryer.model].filter(Boolean).join(" ") || "—"}</p>
                  </CardContent>
                </Card>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/admin/property">
                    View in Property tab
                    <ExternalLink className="h-3 w-3 ml-1 inline" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendToWarehouse}
                  disabled={uninstallLoading}
                >
                  {uninstallLoading ? "Sending…" : "Send to warehouse"}
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
