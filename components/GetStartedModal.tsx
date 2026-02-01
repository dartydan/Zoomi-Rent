"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useSignUp } from "@clerk/nextjs";
import { useGetStarted } from "./GetStartedContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

const HOUSING_OPTIONS = [
  { value: "rent", label: "Renting" },
  { value: "own", label: "I own my home" },
] as const;

type HousingType = "rent" | "own";

export function GetStartedModal() {
  const router = useRouter();
  const { isOpen, setIsOpen, selectedPlan } = useGetStarted();
  const { user, isLoaded: isUserLoaded } = useUser();
  const { signUp, setActive, isLoaded: isSignUpLoaded } = useSignUp();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [addressStandardized, setAddressStandardized] = useState(false);
  const [phone, setPhone] = useState("");
  const [desiredInstallTime, setDesiredInstallTime] = useState("");
  const [housingType, setHousingType] = useState<HousingType>("rent");

  const [step, setStep] = useState<"form" | "verify">("form");
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingProfile, setPendingProfile] = useState<{
    firstName: string;
    lastName: string;
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    phone: string;
    email: string;
    desiredInstallTime: string;
    housingType: HousingType;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignedIn = Boolean(user);

  useEffect(() => {
    if (!isOpen) return;
    if (user) {
      setEmail(user.primaryEmailAddress?.emailAddress ?? "");
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName ?? "");
      setPassword("");
    } else {
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
    }
    setStreet("");
    setCity("");
    setState("");
    setZip("");
    setAddressStandardized(false);
    setPhone("");
    setDesiredInstallTime("");
    setHousingType("rent");
    setStep("form");
    setVerificationCode("");
    setPendingProfile(null);
    setError(null);
  }, [isOpen, user]);

  const profilePayload = () => ({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    street: street.trim(),
    city: city.trim(),
    state: state.trim(),
    zip: zip.trim(),
    phone: phone.trim(),
    email: email.trim(),
    desiredInstallTime: desiredInstallTime.trim(),
    housingType,
    selectedPlan: selectedPlan ?? undefined,
  });

  const syncCustomer = async () => {
    const payload = profilePayload();
    const res = await fetch("/api/customer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? "Failed to save");
    }
  };

  const lookupByEmail = async () => {
    const e = email.trim();
    if (!e || !e.includes("@")) return;
    try {
      const res = await fetch(`/api/customer/lookup?email=${encodeURIComponent(e)}`);
      const data = (await res.json()) as {
        found?: boolean;
        firstName?: string;
        lastName?: string;
        address?: string;
        street?: string;
        city?: string;
        state?: string;
        zip?: string;
      };
      if (data.found && data.firstName != null) setFirstName(data.firstName);
      if (data.found && data.lastName != null) setLastName(data.lastName);
      if (data.found && data.street != null) setStreet(data.street);
      if (data.found && data.city != null) setCity(data.city);
      if (data.found && data.state != null) setState(data.state);
      if (data.found && data.zip != null) setZip(data.zip);
      if (data.found && data.address != null && !data.street && !data.city && !data.state && !data.zip)
        setStreet(data.address);
    } catch {
      // ignore lookup errors
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const hasAddress = [street, city, state, zip].some((s) => s.trim() !== "");
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !hasAddress || !phone.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!isSignedIn && !password.trim()) {
      setError("Please enter a password.");
      return;
    }

    if (!isSignedIn && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    setSubmitting(true);

    try {
      if (isSignedIn) {
        await syncCustomer();
        setIsOpen(false);
        router.push("/dashboard");
        return;
      }

      if (!signUp || !setActive) {
        setError("Sign-up is not available. Please try again.");
        setSubmitting(false);
        return;
      }

      await signUp.create({
        emailAddress: email.trim(),
        password: password.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      setPendingProfile(profilePayload());

      const verifications = signUp.verifications;
      const needsEmailVerification =
        verifications?.emailAddress?.status === "unverified" ||
        signUp.status === "missing_requirements";

      if (needsEmailVerification) {
        // Always use email code (OTP), not email link
        await signUp.prepareVerification({
          strategy: "email_code",
        });
        setStep("verify");
        setSubmitting(false);
        return;
      }

      if (signUp.createdSessionId) {
        await setActive({ session: signUp.createdSessionId });
        await syncCustomer();
        setIsOpen(false);
        router.push("/dashboard");
      } else {
        setError("Account created. Please check your email to verify.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUp || !setActive || !pendingProfile) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        await fetch("/api/customer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pendingProfile),
        });
        setIsOpen(false);
        router.push("/dashboard");
      } else {
        setError("Verification failed. Please check the code and try again.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Verification failed.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const loaded = isUserLoaded && (isSignedIn || isSignUpLoaded);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{selectedPlan ?? (isSignedIn ? "Update your info" : "Get started")}</DialogTitle>
          <DialogDescription>
            {step === "form"
              ? isSignedIn
                ? "Update your contact and install preferences."
                : "Create your account and tell us about your install."
              : "Enter the verification code sent to your email."}
          </DialogDescription>
        </DialogHeader>

        {!loaded ? (
          <p className="text-sm text-muted-foreground py-4">Loading…</p>
        ) : step === "verify" ? (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter code from email"
                autoComplete="one-time-code"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting || !verificationCode.trim()}>
                {submitting ? "Verifying…" : "Verify"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep("form");
                  setVerificationCode("");
                  setError(null);
                }}
              >
                Back
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmitForm} className="space-y-4">
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={lookupByEmail}
                placeholder="you@example.com"
                required
                disabled={isSignedIn}
              />
            </div>

            {!isSignedIn && (
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                />
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="street">Street *</Label>
                <AddressAutocomplete
                  id="street"
                  value={street}
                  onChange={setStreet}
                  onPlaceSelect={({ street: s, city: c, state: st, zip: z }) => {
                    setStreet(s);
                    setCity(c);
                    setState(st);
                    setZip(z);
                  }}
                  onStandardizedChange={setAddressStandardized}
                  placeholder="Street address"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP *</Label>
                <Input
                  id="zip"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="ZIP"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 555-5555"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="desiredInstallTime">Desired install time</Label>
              <Input
                id="desiredInstallTime"
                value={desiredInstallTime}
                onChange={(e) => setDesiredInstallTime(e.target.value)}
                placeholder="e.g. Next Saturday morning"
              />
            </div>

            <div className="space-y-2">
              <Label>Housing</Label>
              <div className="flex gap-4">
                {HOUSING_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="housingType"
                      value={opt.value}
                      checked={housingType === opt.value}
                      onChange={() => setHousingType(opt.value)}
                      className="rounded-full border-input"
                    />
                    <span className="text-sm">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : isSignedIn ? "Update" : "Create account"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
