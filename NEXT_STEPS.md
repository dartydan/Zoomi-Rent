# Zoomi Rent – Next Steps

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

## 3. Test Locally

```bash
npm run dev
```

- Open http://localhost:3000
- Click **Customer Login** → enter your email → check for the magic link
- After login, you should see the dashboard (empty if no Stripe customer/subscription yet)

---

## 4. Deploy to Vercel

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

## 5. Configure Clerk for Production

1. In Clerk Dashboard → **Domains**, add your Vercel domain (e.g. `zoomi-rent.vercel.app`)
2. Add your custom domain when you have one

---

## 6. Link Existing Customers (Optional)

If you already have Stripe customers:

- They can log in with the **same email** used in Stripe
- The app will find their Stripe customer record and show their invoices/subscription
- New emails will create a Stripe customer on first login

---

## Quick Reference

| What              | Where                                      |
|-------------------|--------------------------------------------|
| Clerk config      | https://dashboard.clerk.com                |
| Stripe portal     | https://dashboard.stripe.com/settings/billing/portal |
| Stripe API keys   | https://dashboard.stripe.com/apikeys      |
