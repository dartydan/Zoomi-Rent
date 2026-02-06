#!/usr/bin/env node
/**
 * Sends a test "New Customer" email. Run from project root:
 *   node --env-file=.env.local scripts/send-test-email.mjs
 *
 * Requires Node 20.6+ for --env-file. Or set RESEND_API_KEY in your shell.
 */
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error("RESEND_API_KEY not set. Set it in .env.local or run with --env-file=.env.local");
  process.exit(1);
}

const from = process.env.RESEND_FROM_EMAIL ?? "Zoomi Rentals <noreply@rent.zoomi.co>";
const to = process.env.RESEND_TO_EMAIL ?? "business@zoomi.co";

const resend = new Resend(apiKey);

const body = [
  "Name: Test Customer",
  "Email: test@example.com",
  "Phone: (555) 123-4567",
  "Address: 123 Test St, Test City, TS 12345",
  "Street: 123 Test St",
  "City: Test City",
  "State: TS",
  "ZIP: 12345",
  "Desired install time: Morning",
  "Housing: rent",
  "Selected plan: Basic",
].join("\n");

try {
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: "New Customer (Test)",
    text: body,
  });
  if (error) {
    console.error("Failed:", error);
    process.exit(1);
  }
  console.log("Test email sent to", to);
  console.log("Resend id:", data?.id);
} catch (err) {
  console.error(err);
  process.exit(1);
}
