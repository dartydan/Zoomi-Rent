import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Zoomi Rentals <noreply@rent.zoomi.co>";
const TO_EMAIL = process.env.RESEND_TO_EMAIL ?? "signup@rent.zoomi.co";

export type NewCustomerData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  desiredInstallTime?: string;
  housingType?: string;
  selectedPlan?: string;
};

export async function sendNewCustomerEmail(data: NewCustomerData): Promise<void> {
  if (!resend) {
    console.warn("RESEND_API_KEY not set; skipping new customer email");
    return;
  }
  if (!process.env.RESEND_TO_EMAIL) {
    console.warn("RESEND_TO_EMAIL not set; using default signup@rent.zoomi.co. Set RESEND_TO_EMAIL in .env to override.");
  }

  const body = [
    `Name: ${data.firstName} ${data.lastName}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone}`,
    `Address: ${data.address}`,
    data.street ? `Street: ${data.street}` : null,
    data.city ? `City: ${data.city}` : null,
    data.state ? `State: ${data.state}` : null,
    data.zip ? `ZIP: ${data.zip}` : null,
    data.desiredInstallTime ? `Desired install time: ${data.desiredInstallTime}` : null,
    data.housingType ? `Housing: ${data.housingType}` : null,
    data.selectedPlan ? `Selected plan: ${data.selectedPlan}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  await resend.emails.send({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    subject: "New Customer",
    text: body,
  });
}
