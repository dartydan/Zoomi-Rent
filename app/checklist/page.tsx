import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "What to Expect | Zoomi Rentals",
  description:
    "See how easy it is to get started with Zoomi Rentals: book your install, we deliver and set up, then you manage everything in one place.",
};

const steps = [
  {
    number: 1,
    title: "Book a time",
    description:
      "Schedule your install at a time that works for you. We'll confirm and prepare your units.",
  },
  {
    number: 2,
    title: "We confirm and prepare",
    description:
      "We confirm your appointment and get your washer and dryer ready for delivery.",
  },
  {
    number: 3,
    title: "Professional delivery and install",
    description:
      "Our team delivers, installs, and makes sure everything is working.",
  },
  {
    number: 4,
    title: "You're set",
    description:
      "Manage your billing, view invoices, and update payment methods anytime in your dashboard.",
  },
];

export default function ChecklistPage() {
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader variant="checklist" />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            What to Expect
          </h1>
          <p className="text-base text-muted-foreground">
            How the process works from booking to billing.
          </p>
        </div>

        <ol className="mt-10 space-y-8" aria-label="Process steps">
          {steps.map((step) => (
            <li key={step.number} className="relative pl-10">
              <span className="absolute left-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground" aria-hidden>
                {step.number}
              </span>
              <h2 className="text-base font-semibold text-foreground">
                {step.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
            </li>
          ))}
        </ol>

        <p className="mt-12 flex flex-wrap items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <span>Already a customer?</span>
          <Button variant="link" size="default" className="min-h-[44px] shrink-0" asChild>
            <Link href="/login">Customer Login</Link>
          </Button>
        </p>
      </main>
    </div>
  );
}
