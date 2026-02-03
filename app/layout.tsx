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
  const content = (
    <html lang="en" suppressHydrationWarning>
      <body className={`${nunitoSans.variable} antialiased font-sans`}>
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
