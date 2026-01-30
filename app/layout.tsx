import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zoomi Rent - Washer & Dryer Rental",
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
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );

  if (hasClerkKey) {
    return <ClerkProvider>{content}</ClerkProvider>;
  }
  return content;
}
