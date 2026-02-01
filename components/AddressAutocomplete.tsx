"use client";

import { useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Set to "true" to enable Google Places Autocomplete. When false/unset, a plain address input is used (easy to switch back later). */
const USE_GOOGLE_AUTOCOMPLETE = process.env.NEXT_PUBLIC_USE_GOOGLE_ADDRESS_AUTOCOMPLETE === "true";

type GoogleAddressComponent = { types: string[]; long_name: string; short_name: string };
type GooglePlaceResult = { address_components?: GoogleAddressComponent[]; place_id?: string };

declare global {
  interface Window {
    google?: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            opts?: { types?: string[]; sessionToken?: unknown }
          ) => {
            addListener: (event: string, handler: () => void) => void;
            getPlace: () => GooglePlaceResult;
          };
          AutocompleteSessionToken: new () => unknown;
          PlacesService: new (div: HTMLDivElement) => {
            getDetails: (
              request: { placeId: string; sessionToken?: unknown; fields?: string[] },
              callback: (place: GooglePlaceResult | null, status: string) => void
            ) => void;
          };
        };
      };
    };
  }
}

export type AddressParts = {
  street: string;
  city: string;
  state: string;
  zip: string;
};

function formatAddress(parts: AddressParts): string {
  const { street, city, state, zip } = parts;
  return [street, city, state, zip].filter(Boolean).join(", ");
}

type AddressAutocompleteProps = {
  /** Initial/display value. Input is uncontrolled so this is only used as defaultValue to avoid conflicting with Google's Autocomplete. */
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (address: AddressParts) => void;
  /** Called when user selects a place (true) or edits the field manually (false). Use to require standardized addresses. */
  onStandardizedChange?: (standardized: boolean) => void;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
};

let googleMapsLoadPromise: Promise<void> | null = null;

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("window undefined"));
  if (window.google?.maps?.places) return Promise.resolve();
  if (googleMapsLoadPromise) return googleMapsLoadPromise;
  googleMapsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps script failed to load"));
    document.head.appendChild(script);
  });
  return googleMapsLoadPromise;
}

function parseAddressComponents(components: GoogleAddressComponent[] | undefined): AddressParts {
  const get = (type: string, useShort = false) => {
    const c = components?.find((x) => x.types.includes(type));
    if (!c) return "";
    return useShort && c.short_name ? c.short_name : c.long_name;
  };
  const streetNumber = get("street_number");
  const route = get("route");
  const street = [streetNumber, route].filter(Boolean).join(" ") || get("subpremise") || "";
  const city = get("locality") || get("administrative_area_level_2") || get("sublocality") || "";
  const state = get("administrative_area_level_1", true);
  const zip = get("postal_code");
  return { street, city, state, zip };
}

export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  onStandardizedChange,
  placeholder = "Street address",
  id = "street",
  disabled = false,
  className,
  required = false,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<{ addListener: (e: string, h: () => void) => void; getPlace: () => GooglePlaceResult } | null>(null);
  const onChangeRef = useRef(onChange);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const onStandardizedChangeRef = useRef(onStandardizedChange);
  onChangeRef.current = onChange;
  onPlaceSelectRef.current = onPlaceSelect;
  onStandardizedChangeRef.current = onStandardizedChange;

  // Base version: plain address input (no Google). Same API so callers work unchanged; easy to swap back to Google later.
  if (!USE_GOOGLE_AUTOCOMPLETE) {
    return (
      <Input
        id={id}
        type="text"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v);
          onStandardizedChange?.(false);
        }}
        onBlur={(e) => {
          const v = e.target.value.trim();
          if (v) onPlaceSelect({ street: v, city: "", state: "", zip: "" });
        }}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(className)}
        required={required}
        autoComplete="street-address"
        aria-label={placeholder}
      />
    );
  }

  const initAutocomplete = useCallback(() => {
    if (!USE_GOOGLE_AUTOCOMPLETE) return;
    const input = inputRef.current;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!input || !apiKey?.trim()) return;

    loadGoogleMapsScript(apiKey)
      .then(() => {
        try {
          if (!window.google?.maps?.places || !inputRef.current) return;
          const places = window.google.maps.places;

          if (autocompleteRef.current) return;
          const autocomplete = new places.Autocomplete(inputRef.current, { types: ["address"] });
          autocompleteRef.current = autocomplete;

          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            const placeId = place?.place_id;
            if (!placeId) return;

            const div = document.createElement("div");
            const service = new places.PlacesService(div);
            service.getDetails(
              { placeId, fields: ["address_components"] },
              (result, status) => {
                if (status !== "OK" || !result?.address_components) return;
                const parts = parseAddressComponents(result.address_components);
                if (inputRef.current) inputRef.current.value = formatAddress(parts);
                onChangeRef.current?.(parts.street);
                onPlaceSelectRef.current?.(parts);
                onStandardizedChangeRef.current?.(true);
              }
            );
          });
        } catch (err) {
          if (process.env.NODE_ENV === "development") {
            console.warn("AddressAutocomplete: Google Places failed", err);
          }
        }
      })
      .catch((err) => {
        if (process.env.NODE_ENV === "development") {
          console.warn("AddressAutocomplete: Google Maps script failed to load", err);
        }
      });
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => initAutocomplete(), 200);
    return () => {
      window.clearTimeout(t);
      autocompleteRef.current = null;
    };
  }, [initAutocomplete]);

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      onStandardizedChange?.(false);
    },
    [onChange, onStandardizedChange]
  );

  // Uncontrolled input; no parent updates on keystroke so typing never triggers re-renders and freezes.
  // We only sync to parent on blur (and on place select).
  return (
    <Input
      ref={inputRef}
      id={id}
      type="text"
      defaultValue={value}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(className)}
      required={required}
      autoComplete="off"
      aria-label={placeholder}
    />
  );
}
