# Clerk production sign-in setup

If users see **"Use another method"** / **"Facing issues? You can use any of these methods to sign in."** on the production site, Clerk is falling back to alternative sign-in options because the primary method (e.g. email verification code) is not working in production. Fix it in the **Clerk Dashboard**.

## 1. Add your production domain

1. Go to [Clerk Dashboard](https://dashboard.clerk.com) → your application.
2. Open **Configure** → **Domains** (or **Paths** / **Settings** depending on UI).
3. Add your production domain, e.g. **`rent.zoomi.co`**.
4. Save.

Without this, redirects may use the wrong host and Clerk will show the fallback screen.

## 2. Set redirect URLs for production

1. In Clerk Dashboard, go to **Configure** → **Paths** (or **Redirect URLs**).
2. Add allowed redirect URLs that include your production origin, for example:
   - `https://rent.zoomi.co/dashboard`
   - `https://rent.zoomi.co/login`
   - `https://rent.zoomi.co` (if you use a root redirect)
3. Set **Sign-in URL** (or equivalent) to `/login` so it matches your app.
4. Set **After sign-in redirect** (or **Home URL**) to `/dashboard` (or your desired landing path).

This ensures after signing in on production, users are sent to your live site, not localhost.

## 3. Email verification code for production

1. Go to **User & authentication** → **Email, phone, username** (or **Authentication strategies**).
2. Enable **Email** and **Email verification code** (one-time code sent to email) as the sign-in method—*not* "Email verification link".
3. If you only want email codes, disable other sign-in methods (e.g. password, social, magic link) so users are not shown "use another method" as the main option.
4. Under **Email** settings, ensure the "From" address is valid for production (no localhost-only config).

## 4. Paths configured in code (not Dashboard)

Sign-in, sign-up, and sign-out URLs are set **in the app code** (Clerk Dashboard "Setting component paths" is deprecated). In `app/layout.tsx`, `ClerkProvider` sets:

- `signInUrl="/login"` – sign-in page on your app (e.g. rent.zoomi.co/login).
- `signUpUrl="/login"` – sign-up uses the same page.
- `afterSignInUrl="/dashboard"` – redirect after sign-in.
- `afterSignUpUrl="/dashboard"` – redirect after sign-up.
- `afterSignOutUrl="/"` – redirect after sign-out.

You can override these with env vars if needed: `CLERK_SIGN_IN_URL`, `CLERK_AFTER_SIGN_IN_URL`, `CLERK_AFTER_SIGN_OUT_URL`, etc.

## 5. Environment variables in production (Vercel etc.)

In your hosting provider (e.g. Vercel), set:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` – from Clerk Dashboard (use the **production** key if you have separate dev/prod apps).
- `CLERK_SECRET_KEY` – production secret key.
- `CLERK_SIGN_IN_URL=/login` – so Clerk uses your app’s login path.

Optional but recommended:

- `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=https://rent.zoomi.co/dashboard`  
  or, if you prefer path-only: ensure Clerk Dashboard “After sign-in redirect” is `/dashboard` and your domain is set as above.

## 6. Quick checklist

- [ ] Production domain (e.g. `rent.zoomi.co`) added in Clerk Dashboard.
- [ ] Redirect URLs include `https://rent.zoomi.co/dashboard` and `https://rent.zoomi.co/login`.
- [ ] Email verification code is enabled; other methods disabled if you want email-code only.
- [ ] Paths are configured in code (`ClerkProvider` in `app/layout.tsx`); no need to set "Setting component paths" in Dashboard.
- [ ] Production env vars set in Vercel: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.

After saving domain/redirect/email settings in the Clerk Dashboard and redeploying (if needed), sign-in on the production site should use the email code flow and your app’s `/login` page.
