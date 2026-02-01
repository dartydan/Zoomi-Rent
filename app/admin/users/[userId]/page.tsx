"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, DollarSign, Mail, Phone, MapPin, X, Upload, FileText, ExternalLink } from "lucide-react";
import type { InstallInfo } from "@/lib/install";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

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

  const [installDate, setInstallDate] = useState("");
  const [installStreet, setInstallStreet] = useState("");
  const [installCity, setInstallCity] = useState("");
  const [installState, setInstallState] = useState("");
  const [installZip, setInstallZip] = useState("");
  const [installAddressStandardized, setInstallAddressStandardized] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);
  const [contracts, setContracts] = useState<File[]>([]);
  const [existingContractUrls, setExistingContractUrls] = useState<string[]>([]);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile>(null);
  const [lifetimeValue, setLifetimeValue] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/admin/users/${userId}/install`);
        if (!res.ok) throw new Error("Failed to load");
        const json = (await res.json()) as InstallInfo & { customerProfile?: CustomerProfile; lifetimeValue?: number };
        if (cancelled) return;
        setData(json);
        setCustomerProfile(json.customerProfile ?? null);
        setLifetimeValue(typeof json.lifetimeValue === "number" ? json.lifetimeValue : 0);
        setInstallDate(json.installDate ?? "");
        const parsed = parseInstallAddress(json.installAddress ?? "");
        setInstallStreet(parsed.street);
        setInstallCity(parsed.city);
        setInstallState(parsed.state);
        setInstallZip(parsed.zip);
        setNotes(json.notes ?? "");
        setExistingPhotoUrls(json.photoUrls ?? []);
        setExistingContractUrls(json.contractUrls ?? []);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const hasInstallAddress = [installStreet, installCity, installState, installZip].some((s) => s.trim() !== "");
    const useGoogleAutocomplete = process.env.NEXT_PUBLIC_USE_GOOGLE_ADDRESS_AUTOCOMPLETE === "true";
    if (editingAddress && hasInstallAddress && !installAddressStandardized && useGoogleAutocomplete) {
      setError("Please select an address from the suggestions to standardize it.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("installDate", installDate || "");
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
      
      // Add existing photo URLs
      existingPhotoUrls.forEach((url, index) => {
        formData.append(`existingPhotoUrls[${index}]`, url);
      });
      
      // Add existing contract URLs
      existingContractUrls.forEach((url, index) => {
        formData.append(`existingContractUrls[${index}]`, url);
      });
      
      // Add new photo files
      photos.forEach((file) => {
        formData.append("photos", file);
      });
      
      // Add new contract files
      contracts.forEach((file) => {
        formData.append("contracts", file);
      });

      const res = await fetch(`/api/admin/users/${userId}/install`, {
        method: "PATCH",
        body: formData,
      });
      
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "Failed to save");
      }
      
      const updated = (await res.json()) as InstallInfo;
      setData(updated);
      setInstallDate(updated.installDate ?? "");
      const parsed = parseInstallAddress(updated.installAddress ?? "");
      setInstallStreet(parsed.street);
      setInstallCity(parsed.city);
      setInstallState(parsed.state);
      setInstallZip(parsed.zip);
      setNotes(updated.notes ?? "");
      setExistingPhotoUrls(updated.photoUrls ?? []);
      setExistingContractUrls(updated.contractUrls ?? []);
      setPhotos([]);
      setContracts([]);
      setEditingAddress(false);
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

  const displayName =
    customerProfile?.firstName && customerProfile?.lastName
      ? `${customerProfile.firstName} ${customerProfile.lastName}`
      : "Customer Details";
  const displayAddress = combineInstallAddress({
    street: installStreet,
    city: installCity,
    state: installState,
    zip: installZip,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin/users")}
          className="text-primary w-fit"
        >
          ← Back to Customers
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">
            {loading ? "Customer Details" : displayName}
          </h1>
          {customerProfile?.selectedPlan && (
            <Badge variant="secondary" className="text-sm font-medium">
              {customerProfile.selectedPlan}
            </Badge>
          )}
        </div>
      </div>

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
                  .then((json: InstallInfo & { customerProfile?: CustomerProfile; lifetimeValue?: number }) => {
                    setData(json);
                    setCustomerProfile(json.customerProfile ?? null);
                    setLifetimeValue(typeof json.lifetimeValue === "number" ? json.lifetimeValue : 0);
                    setInstallDate(json.installDate ?? "");
                    const parsed = parseInstallAddress(json.installAddress ?? "");
                    setInstallStreet(parsed.street);
                    setInstallCity(parsed.city);
                    setInstallState(parsed.state);
                    setInstallZip(parsed.zip);
                    setNotes(json.notes ?? "");
                    setExistingPhotoUrls(json.photoUrls ?? []);
                    setExistingContractUrls(json.contractUrls ?? []);
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
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{customerProfile?.email ?? "—"}</span>
                </div>
                {customerProfile?.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{customerProfile.phone}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact & property (Get Started info) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact & property</CardTitle>
              <CardDescription>From Get Started form</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {customerProfile?.street ||
                customerProfile?.city ||
                customerProfile?.state ||
                customerProfile?.zip ||
                customerProfile?.address ||
                customerProfile?.desiredInstallTime ||
                customerProfile?.housingType ? (
                <div className="space-y-3">
                  {(customerProfile?.street ||
                    customerProfile?.city ||
                    customerProfile?.state ||
                    customerProfile?.zip ||
                    customerProfile?.address) && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span>
                        {[customerProfile?.street, customerProfile?.city, customerProfile?.state, customerProfile?.zip]
                          .filter(Boolean)
                          .join(", ") ||
                          customerProfile?.address}
                      </span>
                    </div>
                  )}
                  {customerProfile?.desiredInstallTime && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span>Desired install: {customerProfile.desiredInstallTime}</span>
                    </div>
                  )}
                  {customerProfile?.housingType && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Housing:</span>
                      <span>{customerProfile.housingType === "own" ? "I own my home" : "Renting"}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No Get Started info yet</p>
              )}
              {data?.propertyId && (
                <div className="flex items-center gap-2 text-sm pt-2 border-t border-border mt-2">
                  <span className="text-muted-foreground">Linked property:</span>
                  <Link
                    href="/admin/property"
                    className="text-primary font-mono text-xs hover:underline"
                  >
                    {data.propertyId}
                    <ExternalLink className="h-3 w-3 inline ml-0.5" />
                  </Link>
                </div>
              )}
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
                  ${lifetimeValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">Installation Details</CardTitle>
            <CardDescription>Update install date, address, notes, photos, and signed contracts. Files are stored in Google Drive.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <label htmlFor="installDate" className="text-sm font-medium text-foreground">
                Install date
              </label>
              <Input
                id="installDate"
                type="date"
                value={installDate}
                onChange={(e) => setInstallDate(e.target.value)}
                className="w-full max-w-xs"
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Address</span>
              {editingAddress ? (
                <div className="space-y-2">
                  <AddressAutocomplete
                    key="install-address"
                    id="installAddress"
                    value={displayAddress}
                    onChange={(v) => {
                      setInstallStreet(v);
                      setInstallCity("");
                      setInstallState("");
                      setInstallZip("");
                    }}
                    onPlaceSelect={({ street: s, city: c, state: st, zip: z }) => {
                      setInstallStreet(s);
                      setInstallCity(c);
                      setInstallState(st);
                      setInstallZip(z);
                    }}
                    onStandardizedChange={setInstallAddressStandardized}
                    placeholder="Start typing address..."
                    className="w-full"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingAddress(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-foreground">
                    {displayAddress || "—"}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingAddress(true)}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>
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
            {/* Two Column File Upload Section */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Installation Photos Column */}
              <div className="space-y-2">
                <label htmlFor="photos" className="text-sm font-medium text-foreground">
                  Installation Photos
                </label>
                
                {/* Existing Photos */}
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
                
                {/* New Photos Preview */}
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
                
                {/* Photo Upload */}
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

              {/* Signed Contract Column */}
              <div className="space-y-2">
                <label htmlFor="contracts" className="text-sm font-medium text-foreground">
                  Signed Contract
                </label>
                
                {/* Existing Contracts */}
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
                
                {/* New Contracts Preview */}
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
                
                {/* Contract Upload */}
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
            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving
                  ? photos.length > 0 || contracts.length > 0
                    ? "Uploading to Drive…"
                    : "Saving…"
                  : "Save"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.push("/admin/users")}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
      </>
      )}
    </div>
  );
}
