import type { Metadata } from "next";
import Link from "next/link";
import { GoogleCalendarSchedulingButton } from "@/components/GoogleCalendarSchedulingButton";
import { MarketingHeader } from "@/components/MarketingHeader";

export const metadata: Metadata = {
  title: "What to Expect | Zoomi Rent",
  description:
    "See how easy it is to get started with Zoomi Rent: book your install, we deliver and set up, then you manage everything in one place.",
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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <MarketingHeader variant="checklist" />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">
          What to Expect
        </h1>
        <p className="mt-4 text-lg text-slate-300">
          Here’s how the process works from booking to billing.
        </p>

        <ol className="mt-12 space-y-10">
          {steps.map((step) => (
            <li key={step.number} className="relative pl-10">
              <span className="absolute left-0 flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-sm font-bold text-white">
                {step.number}
              </span>
              <h2 className="text-xl font-semibold text-white">{step.title}</h2>
              <p className="mt-2 text-slate-300">{step.description}</p>
              {step.number === 1 && (
                <div className="mt-4">
                  <GoogleCalendarSchedulingButton />
                </div>
              )}
            </li>
          ))}
        </ol>

        <div className="mt-14 rounded-lg border border-slate-700/50 bg-slate-800/50 p-6">
          <h2 className="text-lg font-semibold text-white">
            Ready to schedule your install?
          </h2>
          <p className="mt-2 text-slate-300">
            Book an appointment below. Questions? We’re happy to help when we
            connect.
          </p>
          <div className="mt-4">
            <GoogleCalendarSchedulingButton />
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-slate-400">
          Already a customer?{" "}
          <Link href="/login" className="text-white underline hover:no-underline">
            Customer Login
          </Link>
        </p>
      </main>
    </div>
  );
}
