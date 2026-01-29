"use client";

const END_SERVICES_MAILTO =
  "mailto:help@zoomi.co?subject=End%20Rental%20Request&body=I%20would%20like%20to%20end%20my%20washer%2Fdryer%20rental.";

export function EndServicesButton() {
  return (
    <a
      href={END_SERVICES_MAILTO}
      className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
    >
      End Services
    </a>
  );
}
