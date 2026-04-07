"use client";

import {
  AGREEMENT_VERSION,
  AGREEMENT_EQUIPMENT_OPTIONS,
  type AgreementEquipment,
} from "@/lib/agreement";

/**
 * Versions for which we have stored agreement content.
 * When updating terms, add a new version and keep previous versions here
 * so users who signed an older version still see exactly what they signed.
 */
export const AGREEMENT_CONTENT_VERSIONS = ["2025-02-v1"] as const;

export type AgreementContentVersion = (typeof AGREEMENT_CONTENT_VERSIONS)[number];

export function getContentVersionForDisplay(
  signedVersion: string | undefined
): AgreementContentVersion {
  if (
    signedVersion &&
    AGREEMENT_CONTENT_VERSIONS.includes(signedVersion as AgreementContentVersion)
  ) {
    return signedVersion as AgreementContentVersion;
  }
  return AGREEMENT_VERSION as AgreementContentVersion;
}

type AgreementDocumentProps = {
  /** Version of the agreement to display (e.g. the version the user signed). */
  version: AgreementContentVersion;
  isSignedView: boolean;
  equipmentLabel?: string;
  equipment?: AgreementEquipment | null;
  setEquipment?: (value: AgreementEquipment) => void;
};

/**
 * Renders the agreement body for a given version.
 * Add new version branches when terms change; keep old content unchanged.
 */
function AgreementBody202502V1({
  isSignedView,
  equipmentLabel,
  equipment,
  setEquipment,
}: Omit<AgreementDocumentProps, "version">) {
  return (
    <>
      <p className="mb-2 font-semibold">ZOOMI, LLC - State of Indiana</p>
      <p className="mb-3 font-semibold">WASHER &amp; DRYER RENTAL AGREEMENT (MONTH-TO-MONTH)</p>
      <p className="mb-4">
        This Agreement is between <strong>Zoomi, LLC</strong> (&quot;Owner&quot;) and the undersigned customer (&quot;Customer&quot;).
      </p>

      <hr className="border-border my-4" />

      <section className="mb-4">
        <h4 className="font-semibold mb-2">1. EQUIPMENT SELECTION (CHECK ONE)</h4>
        {isSignedView ? (
          <>
            <ul className="list-disc list-inside space-y-1 mb-2">
              <li>Standard Washer/Dryer Combo: <strong>$70/month</strong></li>
              <li>Premium Washer/Dryer Combo: <strong>$90/month</strong></li>
              <li>Other: _________________________________________________</li>
            </ul>
            {equipmentLabel && (
              <p className="text-foreground"><strong>Your selection:</strong> {equipmentLabel}</p>
            )}
          </>
        ) : (
          <>
            <ul className="list-disc list-inside space-y-1 mb-3">
              <li>Standard Washer/Dryer Combo: <strong>$70/month</strong></li>
              <li>Premium Washer/Dryer Combo: <strong>$90/month</strong></li>
              <li>Other: _________________________________________________</li>
            </ul>
            <div className="space-y-2" role="group" aria-labelledby="equipment-label">
              <p id="equipment-label" className="sr-only">Select Standard or Premium equipment</p>
              {(Object.keys(AGREEMENT_EQUIPMENT_OPTIONS) as AgreementEquipment[]).map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-3 cursor-pointer rounded border border-border bg-background px-3 py-2 has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-ring has-[:checked]:ring-offset-2"
                >
                  <input
                    type="radio"
                    name="equipment"
                    value={key}
                    checked={equipment === key}
                    onChange={() => setEquipment?.(key)}
                    className="h-4 w-4 accent-primary"
                  />
                  <span className="text-sm">
                    {AGREEMENT_EQUIPMENT_OPTIONS[key].label} — {AGREEMENT_EQUIPMENT_OPTIONS[key].price}
                  </span>
                </label>
              ))}
            </div>
          </>
        )}
      </section>

      <hr className="border-border my-4" />

      <section className="mb-4">
        <h4 className="font-semibold mb-2">2. TERM</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>This Agreement is month-to-month.</li>
          <li>Either party may terminate with 30 days written notice.</li>
        </ul>
      </section>

      <hr className="border-border my-4" />

      <section className="mb-4">
        <h4 className="font-semibold mb-2">3. PAYMENT &amp; AUTOPAY</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>Monthly rent is billed in advance.</li>
          <li>Customer authorizes automatic recurring payments to the payment method on file.</li>
          <li>Customers enrolled in automatic recurring payments receive a <strong>$10 per month discount</strong>.</li>
          <li>Cancellation of the rental before completing six (6) months may be charged a <strong>$40 cancellation, removal, and redeployment fee</strong>.</li>
        </ul>
      </section>

      <hr className="border-border my-4" />

      <section className="mb-4">
        <h4 className="font-semibold mb-2">4. NO SECURITY DEPOSIT / DAMAGE CAPS</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>No security deposit is required.</li>
          <li>Customer authorizes Zoomi, LLC to charge the payment method on file only for egregious damage, abuse, theft, or non-return of the equipment, excluding normal wear and tear.</li>
          <li>Damage charges shall not exceed:
            <ul className="list-disc list-inside ml-4 mt-1 space-y-0.5">
              <li><strong>$400 maximum</strong> if the rental period is less than six (6) months</li>
              <li><strong>$100 maximum</strong> if the rental period is six (6) months or longer</li>
            </ul>
          </li>
          <li>These caps do not apply in cases of theft or intentional non-return, in which case Zoomi, LLC may pursue the full replacement value through lawful means.</li>
        </ul>
      </section>

      <hr className="border-border my-4" />

      <section className="mb-4">
        <h4 className="font-semibold mb-2">5. MAINTENANCE &amp; PROPER USE REQUIREMENTS</h4>
        <p>Customer agrees to operate, maintain, and care for the equipment in a reasonable and responsible manner consistent with normal household use and manufacturer guidelines. Any misuse, neglect, <strong>unauthorized movement</strong>, modification, repair, obstruction of airflow or ventilation, failure to promptly report issues, or use that results in damage beyond normal wear and tear constitutes a breach of this Agreement and may result in charges, service termination, or equipment retrieval at Owner&apos;s discretion.</p>
      </section>

      <hr className="border-border my-4" />

      <section className="mb-4">
        <h4 className="font-semibold mb-2">6. NOT A RENT-TO-OWN AGREEMENT</h4>
        <p>This is strictly a rental agreement. No ownership or purchase rights are granted. All equipment remains property of Zoomi, LLC.</p>
      </section>

      <hr className="border-border my-4" />

      <section className="mb-4">
        <h4 className="font-semibold mb-2">7. LIABILITY WAIVER</h4>
        <p className="font-semibold mb-1">Customer Acknowledgment of Risk and Indemnification</p>
        <p className="mb-3">The Customer, by accepting and using the rental equipment, explicitly acknowledges and agrees to assume all risks associated with the equipment&apos;s possession, use, and operation. This assumption of risk extends to, but is not limited to, the possibility of property damage, personal injury, and loss.</p>
        <p className="font-semibold mb-1">Zoomi, LLC Disclaimer of Liability</p>
        <p className="mb-2">Zoomi, LLC, its officers, agents, employees, and affiliates, shall not be liable for any direct, indirect, incidental, consequential, special, or exemplary damages or losses of any kind, whether arising in contract, tort, or otherwise, in connection with the rental, use, or failure of the equipment. This includes, but is not limited to:</p>
        <ol className="list-decimal list-inside space-y-1 ml-2">
          <li><strong>Property Damage:</strong> Damage to the Customer&apos;s, or any third party&apos;s, real or personal property. Including Fire, water damage, flooding, or leaks</li>
          <li><strong>Personal Injury:</strong> Bodily harm, illness, or death to the Customer, their agents, employees, or any third party.</li>
          <li><strong>Specific Causes of Loss:</strong> Losses or damages caused directly or indirectly by events such as fire, water damage (including leaks or flooding), electrical issues (including surges, shorts, or failures), or any other unforeseen or negligent event related to the equipment.</li>
          <li><strong>Consequential Loss:</strong> Loss of business, revenue, profits, anticipated savings, data, or goodwill.</li>
        </ol>
      </section>

      <hr className="border-border my-4" />

      <section className="mb-4">
        <h4 className="font-semibold mb-2">8. INDEMNIFICATION</h4>
        <p>The Customer agrees to indemnify, defend, and hold harmless Zoomi, LLC from and against any and all claims, liabilities, damages, losses, and expenses (including reasonable attorneys&apos; fees) arising out of or related to the Customer&apos;s possession, use, or misuse of the equipment, regardless of the cause. The Customer&apos;s responsibility hereunder shall survive the termination of this agreement.</p>
      </section>

      <hr className="border-border my-4" />

      <section className="mb-4">
        <h4 className="font-semibold mb-2">9. AS-IS CONDITION &amp; PHOTO ACKNOWLEDGMENT</h4>
        <p>Equipment is rented as-is. Customer acknowledges photos may be taken at install and removal to document condition.</p>
      </section>

      <hr className="border-border my-4" />

      <section className="mb-4">
        <h4 className="font-semibold mb-2">10. ID &amp; PAYMENT INFORMATION CONSENT</h4>
        <p>The Customer agrees to permit Zoomi, LLC to retain a copy of the government-issued identification and payment method information for the purposes of fraud and theft protection.</p>
      </section>

      <hr className="border-border my-4" />

      <section className="mb-4">
        <h4 className="font-semibold mb-2">11. THEFT OR NON-RETURN</h4>
        <p>Failure to return equipment upon termination may be treated as theft.</p>
      </section>

      <hr className="border-border my-4" />

      <section className="mb-4">
        <h4 className="font-semibold mb-2">12. GOVERNING LAW</h4>
        <p>This Agreement is governed by Indiana law.</p>
      </section>

      <p className="text-muted-foreground text-xs mt-4">
        You may also view or download the official PDF:{" "}
        <a href="/zoomi-rental-agreement.pdf" target="_blank" rel="noopener noreferrer" className="underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded">
          Zoomi Rental Agreement (PDF)
        </a>
      </p>
    </>
  );
}

const CONTENT_BY_VERSION: Record<
  AgreementContentVersion,
  React.ComponentType<Omit<AgreementDocumentProps, "version">>
> = {
  "2025-02-v1": AgreementBody202502V1,
};

export function AgreementDocument({
  version,
  isSignedView,
  equipmentLabel,
  equipment,
  setEquipment,
}: AgreementDocumentProps) {
  const Body =
    CONTENT_BY_VERSION[version] ??
    CONTENT_BY_VERSION[AGREEMENT_VERSION as AgreementContentVersion];
  if (!Body) return null;
  return (
    <Body
      isSignedView={isSignedView}
      equipmentLabel={equipmentLabel}
      equipment={equipment}
      setEquipment={setEquipment}
    />
  );
}
