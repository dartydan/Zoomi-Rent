import Link from "next/link";
import { MarketingHeader } from "@/components/MarketingHeader";
import { SplashHero } from "@/components/SplashHero";

function BenefitsSection() {
  const benefits = [
    {
      title: "Simple sign-up",
      description: "Book a time that works for you. We handle the rest.",
    },
    {
      title: "Professional install",
      description: "Delivery and setup by our team so you're ready to go.",
    },
    {
      title: "One monthly payment",
      description: "Rentals starting at $60/mo. No surprises.",
    },
    {
      title: "Easy account management",
      description: "View invoices and manage billing in your dashboard.",
    },
  ];

  return (
    <section className="border-t border-slate-700/50 px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-bold text-white sm:text-3xl">
          Why Zoomi Rent
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((item) => (
            <div
              key={item.title}
              className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-6"
            >
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-slate-300">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MarketingFooter() {
  return (
    <footer className="border-t border-slate-700/50 px-4 py-8">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <p className="text-sm text-slate-400">© Zoomi Rent</p>
        <Link
          href="/login"
          className="text-sm text-slate-400 transition-colors hover:text-white"
        >
          Customer Login
        </Link>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <MarketingHeader />
      <SplashHero />
      <BenefitsSection />
      <MarketingFooter />
    </div>
  );
}
