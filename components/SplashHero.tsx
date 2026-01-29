import Link from "next/link";

export function SplashHero() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-4">
          Zoomi Rent
        </h1>
        <p className="text-xl text-slate-300 mb-8">
          Washer & dryer rental made simple. Manage your account and billing in
          one place.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-slate-900 bg-white rounded-lg hover:bg-slate-100 transition-colors"
        >
          Customer Login
        </Link>
      </div>
    </div>
  );
}
