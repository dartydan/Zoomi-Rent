import Link from "next/link";

type MarketingHeaderProps = {
  variant?: "default" | "checklist";
};

export function MarketingHeader({ variant = "default" }: MarketingHeaderProps) {
  return (
    <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-xl font-bold text-white transition-colors hover:text-slate-200"
        >
          Zoomi Rent
        </Link>
        <nav className="flex items-center gap-6">
          {variant === "checklist" ? (
            <Link
              href="/"
              className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              Back
            </Link>
          ) : (
            <Link
              href="/checklist"
              className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              What to Expect
            </Link>
          )}
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100"
          >
            Customer Login
          </Link>
        </nav>
      </div>
    </header>
  );
}
