# Zoomi Rentals Customer Portal

A customer portal for Zoomi Rentals washer and dryer rentals. Customers can view payment history, download PDF invoices, see their next payment date, manage billing via Stripe, and request to end services via email.

## Setup

### 1. Environment Variables

Copy `.env.example` to `.env.local` and fill in your keys:

```bash
cp .env.example .env.local
```

- **Clerk**: Create an account at [clerk.com](https://clerk.com), create an application, and add your keys. In the Clerk Dashboard, configure **User & authentication** to use **Email verification link** (magic link) only.
- **Stripe**: Add your publishable key (client-side) and secret key (server-side). Get both from [Stripe Dashboard → Developers → API keys](https://dashboard.stripe.com/apikeys).
- **Google Maps (optional, for address autocomplete)**: Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to enable address autocomplete in the Get Started form. In [Google Cloud Console](https://console.cloud.google.com/), enable **Maps JavaScript API** and **Places API**, create an API key, and restrict it to **HTTP referrers** (e.g. `https://yourdomain.com/*`, `http://localhost:*`) and to those two APIs. Without the key, the address field works as a normal text input.

### 2. Stripe Customer Portal

Configure the [Stripe Customer Portal](https://dashboard.stripe.com/settings/billing/portal) to disable subscription cancellation so customers can only update payment methods and view invoices. Cancellation requests go through the "End Services" button (email to help@zoomi.co).

### 3. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Deploy to Vercel

1. Push to GitHub and connect the repo in Vercel.
2. Add environment variables in Vercel project settings.
3. Deploy.

## Features

- **Splash page**: Brief landing with "Customer Login" CTA
- **Magic link login**: Passwordless auth via Clerk
- **Dashboard**: Payment history with PDF links, next payment date, Manage Billing (Stripe Portal), End Services (mailto)
- **Stripe**: Autopay, invoices, and billing managed through Stripe Customer Portal
