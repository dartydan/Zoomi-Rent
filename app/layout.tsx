import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { GetStartedProvider } from "@/components/GetStartedContext";
import { GetStartedModal } from "@/components/GetStartedModal";
import "./globals.css";

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito-sans",
  display: "swap",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Zoomi Rentals - Washer & Dryer Rental",
  description: "Manage your washer and dryer rental",
  openGraph: {
    images: ["/hero-laundry.png"],
  },
};

const hasClerkKey = !!(
  typeof process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY === "string" &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.trim()
);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gtmScript = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-WBTZNZL2');`;

  const content = (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: gtmScript }} />
      </head>
      <body className={`${nunitoSans.variable} antialiased font-sans`}>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-WBTZNZL2"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>
        <ThemeProvider>
          <GetStartedProvider>
            {children}
            <GetStartedModal />
          </GetStartedProvider>
        </ThemeProvider>
      </body>
    </html>
  );

  if (hasClerkKey) {
    return (
      <ClerkProvider
        signInUrl="/login"
        signUpUrl="/login"
        afterSignInUrl="/dashboard"
        afterSignUpUrl="/dashboard"
        afterSignOutUrl="/"
      >
        {content}
      </ClerkProvider>
    );
  }
  return content;
}
