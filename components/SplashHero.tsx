import Link from "next/link";
import { GoogleCalendarSchedulingButton } from "./GoogleCalendarSchedulingButton";

export function SplashHero() {
  return (
    <section className="relative px-4 py-16 sm:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
          Washer & Dryer Rental Made Simple
        </h1>
        <p className="mt-6 text-xl text-slate-300">
          Professional units, one monthly payment. Manage your account and
          billing in one place.
        </p>
        <p className="mt-4 text-2xl font-semibold text-white">
          Rentals starting at $60/mo
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <GoogleCalendarSchedulingButton />
          <Link
            href="/checklist"
            className="inline-flex items-center justify-center rounded-lg border-2 border-white/30 bg-white/10 px-8 py-4 text-lg font-medium text-white transition-colors hover:bg-white/20"
          >
            Get Started
          </Link>
        </div>
      </div>
    </section>
  );
}
