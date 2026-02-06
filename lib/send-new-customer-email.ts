import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Zoomi Rentals <noreply@rent.zoomi.co>";
const TO_EMAIL = process.env.RESEND_TO_EMAIL ?? "business@zoomi.co";

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

function sanitizeForEmail(s: string): string {
  return s.replace(/\r?\n/g, " ").trim();
}

export async function sendNewCustomerEmail(data: NewCustomerData): Promise<void> {
  if (!resend) {
    console.warn("RESEND_API_KEY not set; skipping new customer email");
    return;
  }

  const body = [
    `Name: ${sanitizeForEmail(data.firstName)} ${sanitizeForEmail(data.lastName)}`,
    `Email: ${sanitizeForEmail(data.email)}`,
    `Phone: ${sanitizeForEmail(data.phone)}`,
    `Address: ${sanitizeForEmail(data.address)}`,
    data.street ? `Street: ${sanitizeForEmail(data.street)}` : null,
    data.city ? `City: ${sanitizeForEmail(data.city)}` : null,
    data.state ? `State: ${sanitizeForEmail(data.state)}` : null,
    data.zip ? `ZIP: ${sanitizeForEmail(data.zip)}` : null,
    data.desiredInstallTime ? `Desired install time: ${sanitizeForEmail(data.desiredInstallTime)}` : null,
    data.housingType ? `Housing: ${data.housingType}` : null,
    data.selectedPlan ? `Selected plan: ${sanitizeForEmail(data.selectedPlan)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: TO_EMAIL,
    subject: "New Customer",
    text: body,
  });

  if (error) {
    throw new Error(`Resend: ${error.message ?? JSON.stringify(error)}`);
  }
}
