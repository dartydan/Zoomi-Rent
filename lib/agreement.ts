/**
 * Rental agreement version. Bump when terms change.
 * Stored with each signature so admin can see which version the user agreed to.
 */
export const AGREEMENT_VERSION = "2025-02-v1";

/** Sentinel value for paper-signed agreements (admin-set). */
export const AGREEMENT_VERSION_PAPER = "paper";

/** Clerk publicMetadata keys for rental agreement. */
export const AGREEMENT_SIGNED_AT_KEY = "rentalAgreementSignedAt";
export const AGREEMENT_VERSION_KEY = "rentalAgreementVersion";
export const AGREEMENT_EQUIPMENT_KEY = "rentalAgreementEquipment";

/** Valid equipment choices when signing the agreement. */
export type AgreementEquipment = "standard" | "premium";

export const AGREEMENT_EQUIPMENT_OPTIONS: Record<
  AgreementEquipment,
  { label: string; price: string }
> = {
  standard: { label: "Standard Washer/Dryer Combo", price: "$70/mo" },
  premium: { label: "Premium Washer/Dryer Combo", price: "$90/mo" },
};

export function isPaperAgreement(version: string | undefined): boolean {
  return version === AGREEMENT_VERSION_PAPER;
}
