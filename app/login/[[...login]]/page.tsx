import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  // Redirect after sign-in: use path so Clerk uses current origin (works for localhost and production once domain is in Clerk Dashboard)
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
        forceRedirectUrl="/dashboard"
      />
    </div>
  );
}
