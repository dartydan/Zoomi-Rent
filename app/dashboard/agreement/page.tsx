"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { isStaffRole } from "@/lib/staff-role";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AGREEMENT_VERSION, type AgreementEquipment } from "@/lib/agreement";
import {
  AgreementDocument,
  getContentVersionForDisplay,
} from "@/components/AgreementDocument";

type AgreementStatus = {
  signed: boolean;
  signedAt?: string;
  version?: string;
  method?: "digital" | "paper";
  equipment?: string;
  equipmentLabel?: string;
} | null;

export default function AgreementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const viewAsUserId = searchParams.get("viewAs") ?? "";
  const { user, isLoaded } = useUser();
  const isAdmin = isStaffRole(user?.publicMetadata?.role as string | undefined);
  const impersonating = isAdmin && viewAsUserId;
  const [agreementStatus, setAgreementStatus] = useState<AgreementStatus>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [equipment, setEquipment] = useState<AgreementEquipment | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !user) return;
    const first = user.firstName ?? "";
    const last = user.lastName ?? "";
    setFullName([first, last].filter(Boolean).join(" ").trim());
  }, [isLoaded, user]);

  useEffect(() => {
    if (!isLoaded || !user) return;
    let cancelled = false;
    setStatusLoading(true);
    const url = impersonating
      ? `/api/customer/agreement?userId=${encodeURIComponent(viewAsUserId)}`
      : "/api/customer/agreement";
    fetch(url, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AgreementStatus) => {
        if (!cancelled && data) setAgreementStatus(data);
      })
      .finally(() => {
        if (!cancelled) setStatusLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, user, impersonating, viewAsUserId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!equipment) {
      setError("Please select Standard or Premium equipment.");
      return;
    }
    if (!agreed) {
      setError("Please check the box to confirm you agree to the terms.");
      return;
    }
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError("Please enter your full name.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/customer/agreement/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agreedVersion: AGREEMENT_VERSION,
          fullName: trimmedName,
          equipmentSelection: equipment,
        }),
      });
      const text = await res.text();
      let data: { error?: string } = {};
      try {
        data = text ? (JSON.parse(text) as { error?: string }) : {};
      } catch {
        // non-JSON response (e.g. error page)
      }
      const message = typeof data.error === "string" && data.error.trim() ? data.error.trim() : null;
      if (!res.ok) {
        setError(message || `Signing failed (${res.status}). Please try again or contact support.`);
        setSubmitting(false);
        return;
      }
      router.push("/dashboard?agreementSigned=1");
    } catch (err) {
      console.error("Agreement sign error:", err);
      setError("Something went wrong. Please try again or contact support.");
      setSubmitting(false);
    }
  };

  if (!isLoaded || statusLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  const isSignedView = agreementStatus?.signed === true;
  // When viewing a signed agreement, show the exact version they signed (if we have content for it)
  const displayVersion = isSignedView && agreementStatus?.version
    ? getContentVersionForDisplay(agreementStatus.version)
    : getContentVersionForDisplay(AGREEMENT_VERSION);
  const signedAtFormatted =
    agreementStatus?.signedAt &&
    (() => {
      try {
        return new Date(agreementStatus.signedAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "America/New_York",
        });
      } catch {
        return agreementStatus.signedAt;
      }
    })();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={impersonating ? "/dashboard?viewAs=" + encodeURIComponent(viewAsUserId) : "/dashboard"}>
            ← Back to dashboard
          </Link>
        </Button>
      </div>

      {impersonating && (
        <p className="text-sm text-muted-foreground rounded-md border border-border bg-muted/30 p-3">
          You are viewing this page as a customer. You cannot sign the agreement on their behalf.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{impersonating ? "Customer agreement" : isSignedView ? "Your signed agreement" : "Rental agreement"}</CardTitle>
          <CardDescription>
            {impersonating
              ? "Agreement status and details for the customer you are viewing as."
              : isSignedView
                ? "Below is the agreement you signed and the options you selected."
                : `Version ${AGREEMENT_VERSION}. Please read the terms below, then sign at the bottom.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isSignedView && (
            <div className="rounded-md border border-border bg-muted/30 p-4 text-sm">
              <p className="font-medium mb-2">Signature details</p>
              <ul className="space-y-1 text-foreground">
                <li><strong>Signed on:</strong> {signedAtFormatted ?? agreementStatus.signedAt}</li>
                {agreementStatus.equipmentLabel && (
                  <li><strong>Equipment selected:</strong> {agreementStatus.equipmentLabel}</li>
                )}
                {agreementStatus.version && agreementStatus.version !== "paper" && (
                  <li><strong>Agreement version:</strong> {agreementStatus.version}</li>
                )}
              </ul>
            </div>
          )}

          <div
            className="max-h-[50vh] overflow-y-auto rounded-md border border-border bg-muted/30 p-4 text-sm text-foreground"
            role="document"
            aria-label="Rental agreement terms"
          >
            {isSignedView && (
              <p className="text-muted-foreground text-xs mb-3">
                Showing agreement as signed (version {agreementStatus?.version ?? displayVersion}).
              </p>
            )}
            <AgreementDocument
              version={displayVersion}
              isSignedView={isSignedView}
              equipmentLabel={agreementStatus?.equipmentLabel}
              equipment={equipment}
              setEquipment={setEquipment}
            />
          </div>

          {!isSignedView && !impersonating && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-start gap-3">
              <input
                id="agree"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-input accent-primary"
                aria-describedby="agree-desc"
              />
              <div className="grid gap-1">
                <Label htmlFor="agree" id="agree-desc" className="cursor-pointer font-normal">
                  I have read and agree to the rental agreement above.
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Full name (as signature)</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="First and last name"
                className="max-w-sm"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Signing…" : "Sign agreement"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard">Cancel</Link>
              </Button>
            </div>
          </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
