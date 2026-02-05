"use client";

import { CustomSelect } from "@/components/ui/custom-select";

/** 2-hour installation windows from 8 AM to 8 PM. Value is window start time (HH:mm). Includes even and odd-hour options. */
const INSTALLATION_WINDOWS = [
  { value: "08:00", label: "8 AM – 10 AM" },
  { value: "09:00", label: "9 AM – 11 AM" },
  { value: "10:00", label: "10 AM – 12 PM" },
  { value: "11:00", label: "11 AM – 1 PM" },
  { value: "12:00", label: "12 PM – 2 PM" },
  { value: "13:00", label: "1 PM – 3 PM" },
  { value: "14:00", label: "2 PM – 4 PM" },
  { value: "15:00", label: "3 PM – 5 PM" },
  { value: "16:00", label: "4 PM – 6 PM" },
  { value: "17:00", label: "5 PM – 7 PM" },
  { value: "18:00", label: "6 PM – 8 PM" },
] as const;

export function timeToNearestOption(hhmm: string): string {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x ?? "0", 10));
  const mins = (h % 24) * 60 + (m % 60);
  const windowStarts = INSTALLATION_WINDOWS.map((w) => {
    const [wh, wm] = w.value.split(":").map((x) => parseInt(x, 10));
    return wh * 60 + wm;
  });
  let nearest = windowStarts[0];
  let nearestDiff = Math.abs(mins - windowStarts[0]);
  for (let i = 1; i < windowStarts.length; i++) {
    const diff = Math.abs(mins - windowStarts[i]);
    if (diff < nearestDiff) {
      nearestDiff = diff;
      nearest = windowStarts[i];
    }
  }
  const hOut = Math.floor(nearest / 60);
  const mOut = nearest % 60;
  return `${String(hOut).padStart(2, "0")}:${String(mOut).padStart(2, "0")}`;
}

export function TimeSelect({
  value,
  onChange,
  className,
  id,
  name,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
}) {
  const displayValue = INSTALLATION_WINDOWS.some((o) => o.value === value) ? value : "08:00";
  return (
    <CustomSelect
      id={id}
      name={name}
      value={displayValue}
      onChange={onChange}
      required={required}
      placeholder="Select time"
      options={INSTALLATION_WINDOWS.map((o) => ({ value: o.value, label: o.label }))}
      className={className}
    />
  );
}
