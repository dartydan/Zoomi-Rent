"use client";

import { useEffect, useRef, useState } from "react";

export type InstalledUnitMapPin = {
  id: string;
  userId: string;
  unitId: string;
  customerName: string;
  address: string;
  status: "installed";
};

export type InstalledUnitsMapProps = {
  pins: InstalledUnitMapPin[];
};

type LatLng = {
  lat: number;
  lng: number;
};

type ResolvedPin = InstalledUnitMapPin & LatLng;

const GOOGLE_MAPS_SCRIPT_ID = "zoomi-google-maps-js";
const GEOCODE_CACHE_PREFIX = "zoomi:admin:geocode:v1:";

declare global {
  interface Window {
    google?: {
      maps?: {
        Map: new (el: HTMLElement, opts?: Record<string, unknown>) => unknown;
        Marker: new (opts?: Record<string, unknown>) => {
          setMap: (map: unknown) => void;
          addListener: (eventName: string, handler: () => void) => void;
        };
        Geocoder: new () => {
          geocode: (
            request: { address: string },
            callback: (
              results: Array<{
                geometry?: {
                  location?: { lat: () => number; lng: () => number };
                };
              }> | null,
              status: string
            ) => void
          ) => void;
        };
        InfoWindow: new () => {
          setContent: (content: string) => void;
          open: (opts: { map: unknown; anchor?: unknown; shouldFocus?: boolean }) => void;
          close: () => void;
        };
        LatLngBounds: new () => {
          extend: (latLng: { lat: number; lng: number }) => void;
        };
      };
    };
    __zoomiGoogleMapsPromise?: Promise<void>;
  }
}

function normalizeAddress(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, " ");
}

function readCachedCoords(normalizedAddress: string): LatLng | null | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.sessionStorage.getItem(`${GEOCODE_CACHE_PREFIX}${normalizedAddress}`);
    if (raw == null) return undefined;
    const parsed = JSON.parse(raw) as { lat?: number; lng?: number } | null;
    if (
      parsed &&
      typeof parsed.lat === "number" &&
      Number.isFinite(parsed.lat) &&
      typeof parsed.lng === "number" &&
      Number.isFinite(parsed.lng)
    ) {
      return { lat: parsed.lat, lng: parsed.lng };
    }
    return null;
  } catch {
    return undefined;
  }
}

function writeCachedCoords(normalizedAddress: string, coords: LatLng | null): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(`${GEOCODE_CACHE_PREFIX}${normalizedAddress}`, JSON.stringify(coords));
  } catch {
    // Ignore sessionStorage write failures.
  }
}

function loadGoogleMapsApi(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser only"));
  if (window.google?.maps) return Promise.resolve();

  if (window.__zoomiGoogleMapsPromise) {
    return window.__zoomiGoogleMapsPromise;
  }

  window.__zoomiGoogleMapsPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Maps script")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.maps) {
        resolve();
      } else {
        reject(new Error("Google Maps loaded but maps API is unavailable"));
      }
    };
    script.onerror = () => reject(new Error("Failed to load Google Maps script"));
    document.head.appendChild(script);
  }).catch((err) => {
    window.__zoomiGoogleMapsPromise = undefined;
    throw err;
  });

  return window.__zoomiGoogleMapsPromise;
}

function geocodeAddress(
  geocoder: {
    geocode: (
      request: { address: string },
      callback: (
        results: Array<{
          geometry?: {
            location?: { lat: () => number; lng: () => number };
          };
        }> | null,
        status: string
      ) => void
    ) => void;
  },
  address: string
): Promise<LatLng | null> {
  return new Promise((resolve) => {
    geocoder.geocode({ address }, (results, status) => {
      if (status !== "OK" || !results || results.length === 0) {
        resolve(null);
        return;
      }
      const location = results[0]?.geometry?.location;
      if (!location) {
        resolve(null);
        return;
      }
      resolve({ lat: location.lat(), lng: location.lng() });
    });
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function popupHtml(pin: InstalledUnitMapPin): string {
  const customerUrl = `/admin/users/${encodeURIComponent(pin.userId)}`;
  const unitUrl = `/admin/units/${encodeURIComponent(pin.unitId)}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pin.address)}`;
  return `
    <div style="max-width:280px;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:4px 2px;">
      <div style="font-weight:600;font-size:14px;line-height:1.35;margin-bottom:6px;">
        ${escapeHtml(pin.customerName)}
      </div>
      <div style="font-size:12px;color:#475569;line-height:1.4;margin-bottom:6px;">
        ${escapeHtml(pin.address)}
      </div>
      <div style="font-size:12px;color:#334155;margin-bottom:4px;">
        Unit: <code>${escapeHtml(pin.unitId)}</code>
      </div>
      <div style="display:inline-block;font-size:11px;line-height:1.2;border:1px solid #16a34a;background:#dcfce7;color:#166534;border-radius:9999px;padding:2px 8px;margin-bottom:8px;">
        Installed
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;font-size:12px;">
        <a href="${customerUrl}" style="color:#0f766e;text-decoration:none;">View customer</a>
        <a href="${unitUrl}" style="color:#0f766e;text-decoration:none;">View unit</a>
        <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" style="color:#0f766e;text-decoration:none;">Open in Google Maps</a>
      </div>
    </div>
  `;
}

function offsetDuplicateMarker(lat: number, lng: number, duplicateIndex: number): LatLng {
  if (duplicateIndex <= 0) return { lat, lng };

  const radiusMeters = 12 * duplicateIndex;
  const angle = (duplicateIndex * 50 * Math.PI) / 180;
  const latOffset = (radiusMeters / 111_320) * Math.cos(angle);
  const lngDivisor = Math.max(0.000001, Math.cos((lat * Math.PI) / 180));
  const lngOffset = (radiusMeters / (111_320 * lngDivisor)) * Math.sin(angle);
  return { lat: lat + latOffset, lng: lng + lngOffset };
}

export function InstalledUnitsMap({ pins }: InstalledUnitsMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);
  const infoWindowRef = useRef<{
    setContent: (content: string) => void;
    open: (opts: { map: unknown; anchor?: unknown; shouldFocus?: boolean }) => void;
    close: () => void;
  } | null>(null);
  const markersRef = useRef<Array<{ setMap: (map: unknown) => void; addListener: (eventName: string, handler: () => void) => void }>>([]);

  const [resolvedPins, setResolvedPins] = useState<ResolvedPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unmappedCount, setUnmappedCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function resolvePins() {
      if (!apiKey) {
        setResolvedPins([]);
        setUnmappedCount(0);
        setError("Map unavailable: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured.");
        setLoading(false);
        return;
      }

      if (pins.length === 0) {
        setResolvedPins([]);
        setUnmappedCount(0);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        await loadGoogleMapsApi(apiKey);
        const geocoderCtor = window.google?.maps?.Geocoder;
        if (!geocoderCtor) throw new Error("Google Maps geocoder is unavailable.");
        const geocoder = new geocoderCtor();

        const uniqueAddresses = new Map<string, string>();
        for (const pin of pins) {
          const normalized = normalizeAddress(pin.address);
          if (!normalized) continue;
          if (!uniqueAddresses.has(normalized)) {
            uniqueAddresses.set(normalized, pin.address.trim());
          }
        }

        const coordsByAddress = new Map<string, LatLng | null>();
        await Promise.all(
          Array.from(uniqueAddresses.entries()).map(async ([normalized, address]) => {
            const cached = readCachedCoords(normalized);
            if (cached !== undefined) {
              coordsByAddress.set(normalized, cached);
              return;
            }
            const geocoded = await geocodeAddress(geocoder, address);
            writeCachedCoords(normalized, geocoded);
            coordsByAddress.set(normalized, geocoded);
          })
        );

        const nextResolved: ResolvedPin[] = [];
        for (const pin of pins) {
          const normalized = normalizeAddress(pin.address);
          const coords = coordsByAddress.get(normalized) ?? null;
          if (!coords) continue;
          nextResolved.push({
            ...pin,
            lat: coords.lat,
            lng: coords.lng,
          });
        }

        if (!cancelled) {
          setResolvedPins(nextResolved);
          setUnmappedCount(Math.max(0, pins.length - nextResolved.length));
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setResolvedPins([]);
          setUnmappedCount(0);
          setError("Unable to load the map right now. Check Google Maps setup and try again.");
          setLoading(false);
        }
      }
    }

    resolvePins();
    return () => {
      cancelled = true;
    };
  }, [apiKey, pins]);

  useEffect(() => {
    if (loading || error || resolvedPins.length === 0) return;
    if (!containerRef.current || !window.google?.maps) return;

    const maps = window.google.maps;
    const mapCtor = maps?.Map;
    const markerCtor = maps?.Marker;
    const boundsCtor = maps?.LatLngBounds;
    const infoWindowCtor = maps?.InfoWindow;
    if (!mapCtor || !markerCtor || !boundsCtor || !infoWindowCtor) return;

    if (!mapRef.current) {
      mapRef.current = new mapCtor(containerRef.current, {
        center: { lat: resolvedPins[0].lat, lng: resolvedPins[0].lng },
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
    }
    if (!infoWindowRef.current) {
      infoWindowRef.current = new infoWindowCtor();
    }

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const bounds = new boundsCtor();
    const duplicateCounter = new Map<string, number>();
    for (const pin of resolvedPins) {
      const key = `${pin.lat.toFixed(6)}:${pin.lng.toFixed(6)}`;
      const duplicateIndex = duplicateCounter.get(key) ?? 0;
      duplicateCounter.set(key, duplicateIndex + 1);
      const markerPosition = offsetDuplicateMarker(pin.lat, pin.lng, duplicateIndex);

      const marker = new markerCtor({
        map: mapRef.current,
        position: markerPosition,
        title: pin.customerName,
      });
      marker.addListener("click", () => {
        infoWindowRef.current?.setContent(popupHtml(pin));
        infoWindowRef.current?.open({
          map: mapRef.current as unknown,
          anchor: marker,
          shouldFocus: false,
        });
      });
      markersRef.current.push(marker);
      bounds.extend(markerPosition);
    }

    if (resolvedPins.length === 1) {
      const single = resolvedPins[0];
      const mapObj = mapRef.current as { setCenter: (coords: LatLng) => void; setZoom: (zoom: number) => void };
      mapObj.setCenter({ lat: single.lat, lng: single.lng });
      mapObj.setZoom(12);
    } else {
      const mapObj = mapRef.current as { fitBounds: (bounds: unknown, padding?: number) => void };
      mapObj.fitBounds(bounds, 60);
    }
  }, [error, loading, resolvedPins]);

  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      infoWindowRef.current?.close();
    };
  }, []);

  if (pins.length === 0) {
    return <p className="text-sm text-muted-foreground">No installed unit locations to display.</p>;
  }

  if (loading) {
    return (
      <div className="h-[360px] w-full rounded-md border border-border bg-muted/20 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-muted-foreground">{error}</p>;
  }

  if (resolvedPins.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">No installed unit locations to display.</p>
        {unmappedCount > 0 && (
          <p className="text-xs text-muted-foreground">
            Could not map {unmappedCount} {unmappedCount === 1 ? "address" : "addresses"}.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="h-[360px] w-full rounded-md border border-border"
        role="img"
        aria-label="Installed unit location map"
      />
      {unmappedCount > 0 && (
        <p className="text-xs text-muted-foreground">
          Could not map {unmappedCount} {unmappedCount === 1 ? "address" : "addresses"}.
        </p>
      )}
    </div>
  );
}
