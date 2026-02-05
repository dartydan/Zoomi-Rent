# Zoomi Rentals – Next Steps

Your credentials are configured. Here’s what to do next.

---

## 1. Configure Clerk for Magic Link Only

1. Go to [Clerk Dashboard](https://dashboard.clerk.com) → your application
2. **User & authentication** → **Email, Phone, Username**
3. Enable **Email address** and choose **Email verification link** (magic link)
4. Disable **Password** if you want passwordless-only login
5. Under **Paths**, ensure sign-in uses `/login` (or set `CLERK_SIGN_IN_URL=/login` in env)

---

## 2. Configure Stripe Customer Portal

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Settings** → **Billing** → **Customer portal**
2. Turn **off** subscription cancellation so customers can’t cancel in the portal
3. Turn **on** invoice history and payment method updates
4. Add your logo and branding if you want

---

## 3. Admin accounts

Admins can update install info (install date, address, notes, photo URLs) for any user.

1. **Make a user an admin or employee:** In [Clerk Dashboard](https://dashboard.clerk.com) → **Users** → select a user → **Public metadata** → add `"role": "admin"` or `"role": "employee"` (JSON). Both roles currently have the same permissions. Save.
2. **Access admin:** When signed in as that user, the dashboard sidebar shows **Admin**. Go to **Admin** to list users and click **Edit install** to set install date, address, notes, and photo URLs (one URL per line).
3. **Photo URLs:** Paste image URLs (e.g. from an image host or storage). For file uploads you’d add a separate upload flow (e.g. Vercel Blob) and then paste the resulting URLs here.

---

## 4. Test Locally

```bash
npm run dev
```

- Open http://localhost:3000
- **To use Customer Login and the dashboard locally:** add your Clerk and Stripe keys to `.env.local` (see the file for variable names). Without them, the marketing pages and checklist work, but login and `/dashboard` will not.
- Click **Customer Login** → enter your email → check for the magic link
- After login, you should see the dashboard (empty if no Stripe customer/subscription yet)

---

## 5. Deploy to Vercel

1. Push the project to GitHub (if not already)
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your repo
3. Add environment variables in **Settings** → **Environment Variables**:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `CLERK_SIGN_IN_URL` = `/login`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_SECRET_KEY`
4. Deploy

---

## 6. Configure Clerk for Production

1. In Clerk Dashboard, switch to your **production** instance (dropdown at top).
2. Go to **Domains** and add the exact domain your app runs on (e.g. `your-app.vercel.app` or your custom domain).
3. Clerk may require a **custom domain** for production; `*.vercel.app` is not always allowed. See [Clerk production deployment](https://clerk.com/docs/deployments/overview).
4. Add your custom domain when you have one.

---

## 7. Troubleshooting 500 Errors (Production)

If you see a 500 after switching to production Clerk keys:

1. **Check Vercel logs**  
   Vercel → your project → **Logs** (or **Deployments** → select deployment → **Functions**). Look for lines like `Stripe customer error:` or `Stripe invoices error:` — the message after the colon is the real error.

2. **Clerk domain**  
   Your deployment URL must be added in Clerk Dashboard → **Domains** for the **production** instance. Wrong or missing domain often causes auth to fail and APIs to return 500.

3. **Stripe keys**  
   In Vercel env vars, use Stripe **live** keys if you want live data, or **test** keys for testing. Missing or invalid `STRIPE_SECRET_KEY` will cause 500s from `/api/stripe/*`.

---

## 8. Link Existing Customers

If you already have Stripe customers:

- They can log in with the **same email** used in Stripe
- The app will find their Stripe customer record and show their invoices/subscription
- New emails will create a Stripe customer on first login

---

## 9. Google Address Autocomplete (optional)

Address autocomplete is used in the Get Started form and admin address forms (Add Customer, Install address, Add Installation). Without a key, the Street field works as a normal text input.

**Checklist:**

- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
- [ ] Enable **Maps JavaScript API** and **Places API** (APIs & Services → Library → search and enable both).
- [ ] Create an API key (APIs & Services → Credentials → Create credentials → API key).
- [ ] Restrict the key: **Application restrictions** → HTTP referrers → add `https://yourdomain.com/*` and `http://localhost:*` (or your dev URL).
- [ ] **API restrictions** → Restrict key → select “Maps JavaScript API” and “Places API”.
- [ ] Add to `.env.local`: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key_here`.
- [ ] Restart the dev server so the env var is picked up.

---

## Quick Reference

| What              | Where                                      |
|-------------------|--------------------------------------------|
| Clerk config      | https://dashboard.clerk.com                |
| Stripe portal     | https://dashboard.stripe.com/settings/billing/portal |
| Stripe API keys   | https://dashboard.stripe.com/apikeys      |
