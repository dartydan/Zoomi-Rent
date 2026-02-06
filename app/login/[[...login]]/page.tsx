import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  // Redirect after sign-in: use path so Clerk uses current origin (works for localhost and production once domain is in Clerk Dashboard)
  // fallbackRedirectUrl used when no redirect_url query param (e.g. from "I'm moving" flow)
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
          },
        }}
        routing="path"
        path="/login"
        signUpUrl={undefined}
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  );
}
