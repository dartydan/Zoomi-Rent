"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DollarSign, Calendar, Package, Mail, Phone, MapPin, X, Upload, FileText, ExternalLink } from "lucide-react";
import type { InstallInfo } from "@/lib/install";

type CustomerData = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  subscription?: {
    plan: "Basic" | "Premium";
    status: "active" | "cancelled" | "pending";
    startDate: string;
    monthlyRate: number;
  };
  lifetimeValue: number;
  totalPayments: number;
  accountAge: number; // in days
};

export default function AdminUserInstallPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const [data, setData] = useState<InstallInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [installDate, setInstallDate] = useState("");
  const [installAddress, setInstallAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);
  const [contracts, setContracts] = useState<File[]>([]);
  const [existingContractUrls, setExistingContractUrls] = useState<string[]>([]);
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // In development mode, return mock data for demo users
        const isDevelopment = process.env.NODE_ENV === "development";
        if (isDevelopment && userId.startsWith("demo_user_")) {
          const mockInstall: InstallInfo = {
            installDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            installAddress: "123 Main St, Muncie, IN 47302",
            notes: "Demo user - units installed successfully. Customer requested second floor installation.",
            photoUrls: [
              "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400",
              "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400",
            ],
            contractUrls: [],
          };
          
          // Mock customer data based on userId
          const mockCustomers: Record<string, CustomerData> = {
            demo_user_1: {
              firstName: "John",
              lastName: "Smith",
              email: "john.smith@example.com",
              phone: "(765) 555-0123",
              subscription: {
                plan: "Premium",
                status: "active",
                startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                monthlyRate: 80,
              },
              lifetimeValue: 240, // 3 months at $80/month
              totalPayments: 3,
              accountAge: 90,
            },
            demo_user_2: {
              firstName: "Sarah",
              lastName: "Johnson",
              email: "sarah.johnson@example.com",
              phone: "(765) 555-0456",
              subscription: {
                plan: "Basic",
                status: "active",
                startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                monthlyRate: 60,
              },
              lifetimeValue: 120, // 2 months at $60/month
              totalPayments: 2,
              accountAge: 60,
            },
            demo_user_3: {
              firstName: "Michael",
              lastName: "Brown",
              email: "michael.brown@example.com",
              phone: "(765) 555-0789",
              subscription: {
                plan: "Premium",
                status: "active",
                startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                monthlyRate: 80,
              },
              lifetimeValue: 80, // 1 month at $80/month
              totalPayments: 1,
              accountAge: 30,
            },
            demo_user_4: {
              firstName: "Emily",
              lastName: "Davis",
              email: "emily.davis@example.com",
              phone: "(765) 555-0321",
              subscription: {
                plan: "Basic",
                status: "pending",
                startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                monthlyRate: 60,
              },
              lifetimeValue: 0, // No payments yet
              totalPayments: 0,
              accountAge: 15,
            },
            demo_user_5: {
              firstName: "Robert",
              lastName: "Wilson",
              email: "robert.wilson@example.com",
              phone: "(765) 555-0654",
              subscription: {
                plan: "Premium",
                status: "cancelled",
                startDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                monthlyRate: 80,
              },
              lifetimeValue: 320, // 4 months at $80/month
              totalPayments: 4,
              accountAge: 120,
            },
          };
          
          if (cancelled) return;
          setData(mockInstall);
          setCustomerData(mockCustomers[userId] || null);
          setInstallDate(mockInstall.installDate ?? "");
          setInstallAddress(mockInstall.installAddress ?? "");
          setNotes(mockInstall.notes ?? "");
          setExistingPhotoUrls(mockInstall.photoUrls ?? []);
          setExistingContractUrls(mockInstall.contractUrls ?? []);
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/admin/users/${userId}/install`);
        if (!res.ok) throw new Error("Failed to load");
        const install = (await res.json()) as InstallInfo;
        if (cancelled) return;
        setData(install);
        setInstallDate(install.installDate ?? "");
        setInstallAddress(install.installAddress ?? "");
        setNotes(install.notes ?? "");
        setExistingPhotoUrls(install.photoUrls ?? []);
        setExistingContractUrls(install.contractUrls ?? []);
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
    setSaving(true);
    setError(null);
    try {
      // In demo mode, simulate save without API call
      const isDevelopment = process.env.NODE_ENV === "development";
      if (isDevelopment && userId.startsWith("demo_user_")) {
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay
        
        // Simulate file upload by converting files to object URLs
        const newPhotoUrls = photos.map(file => URL.createObjectURL(file));
        const allPhotoUrls = [...existingPhotoUrls, ...newPhotoUrls];
        
        const newContractUrls = contracts.map(file => URL.createObjectURL(file));
        const allContractUrls = [...existingContractUrls, ...newContractUrls];
        
        const updated: InstallInfo = {
          installDate: installDate || undefined,
          installAddress: installAddress || undefined,
          notes: notes || undefined,
          photoUrls: allPhotoUrls.length ? allPhotoUrls : undefined,
          contractUrls: allContractUrls.length ? allContractUrls : undefined,
        };
        setData(updated);
        setExistingPhotoUrls(allPhotoUrls);
        setExistingContractUrls(allContractUrls);
        setPhotos([]);
        setContracts([]);
        alert("Demo Mode: Changes saved locally (not persisted)");
        setSaving(false);
        return;
      }

      // Production: Upload files to server
      const formData = new FormData();
      formData.append("installDate", installDate || "");
      formData.append("installAddress", installAddress || "");
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
      setInstallAddress(updated.installAddress ?? "");
      setNotes(updated.notes ?? "");
      setExistingPhotoUrls(updated.photoUrls ?? []);
      setExistingContractUrls(updated.contractUrls ?? []);
      setPhotos([]);
      setContracts([]);
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

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin/users")}
          className="text-primary"
        >
          ← Back to Customers
        </Button>
        <h1 className="text-2xl font-bold text-foreground">
          {customerData ? `${customerData.firstName} ${customerData.lastName}` : "Customer Details"}
        </h1>
      </div>

      {/* Customer Overview */}
      {customerData && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Customer Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{customerData.email}</span>
                </div>
                {customerData.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{customerData.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Customer for {Math.floor(customerData.accountAge / 30)} months</span>
                </div>
              </div>
              
              <Separator />
              
              {customerData.subscription && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Subscription</span>
                    </div>
                    <Badge
                      variant={
                        customerData.subscription.status === "active"
                          ? "default"
                          : customerData.subscription.status === "pending"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {customerData.subscription.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {customerData.subscription.plan} - ${customerData.subscription.monthlyRate}/month
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Started: {new Date(customerData.subscription.startDate).toLocaleDateString()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lifetime Value Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lifetime Value</CardTitle>
              <CardDescription>Total revenue from this customer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <span className="text-3xl font-bold text-green-600">
                  ${customerData.lifetimeValue.toFixed(2)}
                </span>
              </div>
              
              <Separator />
              
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Total Payments:</span>
                  <span className="font-medium text-foreground">{customerData.totalPayments}</span>
                </div>
                {customerData.subscription && (
                  <>
                    <div className="flex justify-between">
                      <span>Monthly Rate:</span>
                      <span className="font-medium text-foreground">
                        ${customerData.subscription.monthlyRate}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average per Month:</span>
                      <span className="font-medium text-foreground">
                        ${customerData.accountAge > 0 
                          ? ((customerData.lifetimeValue / customerData.accountAge) * 30).toFixed(2)
                          : "0.00"
                        }
                      </span>
                    </div>
                  </>
                )}
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
              <label htmlFor="installAddress" className="text-sm font-medium text-foreground">
                Install address
              </label>
              <Input
                id="installAddress"
                type="text"
                value={installAddress}
                onChange={(e) => setInstallAddress(e.target.value)}
                placeholder="Street, city, state, ZIP"
                className="w-full"
              />
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
    </div>
  );
}
