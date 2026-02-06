"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { CreditCard, Wrench, XCircle, Home, Phone, Truck } from "lucide-react";

const PHONE_NUMBER = "tel:765-280-0057";

type RequestType = "maintenance" | "end-service" | "return-property";

type MoveStep = "zip" | "move-out-date" | "success-moving" | "success-return";

export default function HelpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded } = useAuth();
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveStep, setMoveStep] = useState<MoveStep>("zip");
  const [zip, setZip] = useState("");
  const [moveOutDate, setMoveOutDate] = useState("");
  const [choseReturnDespiteInRange, setChoseReturnDespiteInRange] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestType, setRequestType] = useState<RequestType | null>(null);
  const [requestDescription, setRequestDescription] = useState("");
  const [requestNotes, setRequestNotes] = useState("");
  const [unitsOutBy, setUnitsOutBy] = useState("");
  const [propertyLocation, setPropertyLocation] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState(false);

  const handleImMovingClick = () => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push("/login?redirect_url=" + encodeURIComponent("/help?moving=1"));
      return;
    }
    setMoveDialogOpen(true);
    setMoveStep("zip");
    setZip("");
    setMoveOutDate("");
    setError(null);
  };

  // Auto-open move dialog when returning from login (moving=1 in URL)
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (searchParams.get("moving") === "1") {
      setMoveDialogOpen(true);
      setMoveStep("zip");
      setZip("");
      setMoveOutDate("");
      setChoseReturnDespiteInRange(false);
      setError(null);
      router.replace("/help");
    }
  }, [isLoaded, isSignedIn, searchParams, router]);

  // Auto-open request dialog when action param is set (e.g. from sidebar)
  useEffect(() => {
    const action = searchParams.get("action");
    if (action === "maintenance" || action === "end-service" || action === "return-property") {
      if (action === "maintenance" || action === "end-service") {
        if (!isLoaded) return;
        if (!isSignedIn) {
          router.push("/login?redirect_url=" + encodeURIComponent(`/help?action=${action}`));
          return;
        }
      }
      setRequestType(action);
      setRequestDescription("");
      setRequestNotes("");
      setUnitsOutBy("");
      setPropertyLocation("");
      setContactInfo("");
      setRequestError(null);
      setRequestSuccess(false);
      setRequestDialogOpen(true);
      router.replace("/help");
    }
  }, [isLoaded, isSignedIn, searchParams, router]);

  const openRequestDialog = (type: RequestType) => {
    if (type === "maintenance" || type === "end-service") {
      if (!isLoaded) return;
      if (!isSignedIn) {
        router.push("/login?redirect_url=" + encodeURIComponent(`/help?action=${type}`));
        return;
      }
    }
    setRequestType(type);
    setRequestDescription("");
    setRequestNotes("");
    setUnitsOutBy("");
    setPropertyLocation("");
    setContactInfo("");
    setRequestError(null);
    setRequestSuccess(false);
    setRequestDialogOpen(true);
  };

  const closeRequestDialog = () => {
    setRequestDialogOpen(false);
    setRequestType(null);
    setRequestDescription("");
    setRequestNotes("");
    setUnitsOutBy("");
    setPropertyLocation("");
    setContactInfo("");
    setRequestError(null);
    setRequestSuccess(false);
  };

  const handleRequestSubmit = async () => {
    if (!requestType) return;
    if (requestType === "maintenance") {
      if (!requestDescription.trim()) {
        setRequestError("Please describe the maintenance issue");
        return;
      }
    }
    if (requestType === "end-service") {
      if (!unitsOutBy.trim()) {
        setRequestError("Please enter when the units need to be removed by");
        return;
      }
      const minDate = new Date();
      minDate.setDate(minDate.getDate() + 6);
      const minStr = `${minDate.getFullYear()}-${String(minDate.getMonth() + 1).padStart(2, "0")}-${String(minDate.getDate()).padStart(2, "0")}`;
      if (unitsOutBy.trim() < minStr) {
        setRequestError("Please select a date at least 6 days from today");
        return;
      }
    }
    if (requestType === "return-property") {
      if (!propertyLocation.trim()) {
        setRequestError("Please enter where you found the property");
        return;
      }
      if (!contactInfo.trim()) {
        setRequestError("Please enter who we can contact");
        return;
      }
    }
    setRequestLoading(true);
    setRequestError(null);
    try {
      const res = await fetch("/api/help/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: requestType,
          description: requestType === "maintenance" ? requestDescription.trim() : undefined,
          notes: requestType === "end-service" ? requestNotes.trim() || undefined : undefined,
          unitsOutBy: requestType === "end-service" ? unitsOutBy.trim() : undefined,
          propertyLocation: requestType === "return-property" ? propertyLocation.trim() : undefined,
          contactInfo: requestType === "return-property" ? contactInfo.trim() : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRequestError((data as { error?: string }).error ?? "Something went wrong");
        setRequestLoading(false);
        return;
      }
      setRequestSuccess(true);
    } catch {
      setRequestError("Something went wrong. Please try again.");
    } finally {
      setRequestLoading(false);
    }
  };

  const handleZipSubmit = async () => {
    const trimmed = zip.trim();
    if (!trimmed || trimmed.length < 5) {
      setError("Please enter a valid 5-digit ZIP code");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/help/moving", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zip: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Something went wrong");
        setLoading(false);
        return;
      }
      const inRange = (data as { inRange?: boolean }).inRange ?? false;
      if (inRange) {
        setChoseReturnDespiteInRange(false);
        setMoveStep("success-moving");
      } else {
        setChoseReturnDespiteInRange(false);
        setMoveStep("move-out-date");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMoveOutDateSubmit = async () => {
    const trimmed = moveOutDate.trim();
    if (!trimmed) {
      setError("Please enter your move out date");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/help/moving", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zip: zip.trim(), moveOutDate: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Something went wrong");
        setLoading(false);
        return;
      }
      setMoveStep("success-return");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const closeMoveDialog = () => {
    setMoveDialogOpen(false);
    setMoveStep("zip");
    setZip("");
    setMoveOutDate("");
    setChoseReturnDespiteInRange(false);
    setError(null);
  };

  const handleConfirmMoving = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/help/moving", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zip: zip.trim(), confirmMoving: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Something went wrong");
      }
      closeMoveDialog();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToReturn = () => {
    setChoseReturnDespiteInRange(true);
    setMoveStep("move-out-date");
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="text-xl">Help</CardTitle>
            <CardDescription>Quick actions for your rental</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0 gap-2 h-9">
            <a href={PHONE_NUMBER}>
              <Phone className="h-4 w-4" />
              Call
            </a>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 h-11"
            onClick={handleImMovingClick}
          >
            <Truck className="h-4 w-4" />
            I&apos;m moving
          </Button>
          <Button asChild variant="outline" className="w-full justify-start gap-2 h-11">
            <Link href="/dashboard">
              <CreditCard className="h-4 w-4" />
              View Billing
            </Link>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 h-11"
            onClick={() => openRequestDialog("maintenance")}
          >
            <Wrench className="h-4 w-4" />
            Request Maintenance
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 h-11"
            onClick={() => openRequestDialog("end-service")}
          >
            <XCircle className="h-4 w-4" />
            End Service
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 h-11"
            onClick={() => openRequestDialog("return-property")}
          >
            <Home className="h-4 w-4" />
            Return Property
          </Button>
        </CardContent>
      </Card>

      <Dialog open={moveDialogOpen} onOpenChange={(open) => !open && closeMoveDialog()}>
        <DialogContent className="max-w-md">
          {moveStep === "zip" && (
            <>
              <DialogHeader>
                <DialogTitle>Where are you moving?</DialogTitle>
                <DialogDescription>
                  Enter the ZIP code of your new address.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="move-zip">ZIP code</Label>
                  <Input
                    id="move-zip"
                    placeholder="47304"
                    value={zip}
                    onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                    onKeyDown={(e) => e.key === "Enter" && handleZipSubmit()}
                    maxLength={5}
                    className="font-mono"
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeMoveDialog} disabled={loading}>
                  Cancel
                </Button>
                <Button onClick={handleZipSubmit} disabled={loading}>
                  {loading ? "Checking…" : "Continue"}
                </Button>
              </DialogFooter>
            </>
          )}

          {moveStep === "move-out-date" && (
            <>
              <DialogHeader>
                <DialogTitle>Move out date</DialogTitle>
                <DialogDescription>
                  We&apos;ll coordinate the return of your washer and dryer. When is your move out date?
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="move-out-date">Move out date</Label>
                  <Input
                    id="move-out-date"
                    type="date"
                    value={moveOutDate}
                    onChange={(e) => setMoveOutDate(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleMoveOutDateSubmit()}
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive" role="alert">
                    {error}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setMoveStep("zip")} disabled={loading}>
                  Back
                </Button>
                <Button onClick={handleMoveOutDateSubmit} disabled={loading}>
                  {loading ? "Submitting…" : "Submit"}
                </Button>
              </DialogFooter>
            </>
          )}

          {moveStep === "success-moving" && (
            <>
              <DialogHeader>
                <DialogTitle>Great news!</DialogTitle>
                <DialogDescription>
                  Your washer and dryer can move with you. We&apos;ll send your details to our team
                  and someone will be in touch to coordinate the move.
                </DialogDescription>
              </DialogHeader>
              <div className="py-2 flex justify-center">
                <button
                  type="button"
                  onClick={handleSwitchToReturn}
                  className="text-sm font-bold text-destructive hover:text-destructive/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                >
                  I&apos;d like to return my rental instead
                </button>
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <DialogFooter>
                <Button onClick={handleConfirmMoving} disabled={loading}>
                  {loading ? "Sending…" : "Done"}
                </Button>
              </DialogFooter>
            </>
          )}

          {moveStep === "success-return" && (
            <>
              <DialogHeader>
                <DialogTitle>Thanks for letting us know</DialogTitle>
                <DialogDescription>
                  Someone will be in touch to coordinate the return of your washer and dryer.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={closeMoveDialog}>Done</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={requestDialogOpen} onOpenChange={(open) => !open && closeRequestDialog()}>
        <DialogContent
          className="max-w-[min(28rem,calc(100vw-2rem))] min-w-0 overflow-hidden"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {requestSuccess ? (
            <>
              <DialogHeader>
                <DialogTitle>Request sent</DialogTitle>
                <DialogDescription>
                  Someone from our team will be in touch soon.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={closeRequestDialog}>Done</Button>
              </DialogFooter>
            </>
          ) : requestType === "maintenance" ? (
            <>
              <DialogHeader>
                <DialogTitle>Request Maintenance</DialogTitle>
                <DialogDescription>Describe the maintenance issue</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="request-description">Description</Label>
                  <textarea
                    id="request-description"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Describe the maintenance issue"
                    value={requestDescription}
                    onChange={(e) => setRequestDescription(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && e.preventDefault()}
                  />
                </div>
                {requestError && (
                  <p className="text-sm text-destructive" role="alert">
                    {requestError}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeRequestDialog} disabled={requestLoading}>
                  Cancel
                </Button>
                <Button onClick={handleRequestSubmit} disabled={requestLoading}>
                  {requestLoading ? "Sending…" : "Submit"}
                </Button>
              </DialogFooter>
            </>
          ) : requestType === "end-service" ? (
            <>
              <DialogHeader>
                <DialogTitle>End Service</DialogTitle>
                <DialogDescription>
                  You will be charged for the next 30 days at a prorated rate. Someone from our
                  team will reach out to coordinate the pickup of our machines.
                </DialogDescription>
              </DialogHeader>
              <div className="min-w-0 overflow-hidden space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="units-out-by">When do the units need to be removed by?</Label>
                  <div className="w-full min-w-0 overflow-hidden">
                    <Input
                      id="units-out-by"
                      type="date"
                      className="w-full min-w-0 max-w-full box-border"
                      min={(() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 6);
                        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                      })()}
                      value={unitsOutBy}
                      onChange={(e) => setUnitsOutBy(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRequestSubmit()}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="request-notes">Additional details (optional)</Label>
                  <textarea
                    id="request-notes"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Any additional details"
                    value={requestNotes}
                    onChange={(e) => setRequestNotes(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && e.preventDefault()}
                  />
                </div>
                {requestError && (
                  <p className="text-sm text-destructive" role="alert">
                    {requestError}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeRequestDialog} disabled={requestLoading}>
                  Cancel
                </Button>
                <Button onClick={handleRequestSubmit} disabled={requestLoading}>
                  {requestLoading ? "Sending…" : "Submit"}
                </Button>
              </DialogFooter>
            </>
          ) : requestType === "return-property" ? (
            <>
              <DialogHeader>
                <DialogTitle>Return Property</DialogTitle>
                <DialogDescription>
                  For non-customers (e.g. landlords). Help us coordinate the return of our property.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="property-location">Where did you find our property?</Label>
                  <Input
                    id="property-location"
                    placeholder="Address or location"
                    value={propertyLocation}
                    onChange={(e) => setPropertyLocation(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRequestSubmit()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-info">Who can we contact to coordinate the return?</Label>
                  <Input
                    id="contact-info"
                    placeholder="Name, email, phone"
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRequestSubmit()}
                  />
                </div>
                {requestError && (
                  <p className="text-sm text-destructive" role="alert">
                    {requestError}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeRequestDialog} disabled={requestLoading}>
                  Cancel
                </Button>
                <Button onClick={handleRequestSubmit} disabled={requestLoading}>
                  {requestLoading ? "Sending…" : "Submit"}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <p className="mt-4 text-sm text-muted-foreground">
        <a
          href={PHONE_NUMBER}
          className="text-muted-foreground no-underline hover:opacity-80 cursor-pointer"
        >
          765-280-0057
        </a>
        {" · "}
        <a
          href="mailto:help@zoomi.co"
          className="text-muted-foreground no-underline hover:opacity-80 cursor-pointer"
        >
          help@zoomi.co
        </a>
      </p>
      <a
        href="/"
        className="mt-4 text-sm font-bold text-primary hover:opacity-80"
      >
        rent.zoomi.co
      </a>
    </div>
  );
}
