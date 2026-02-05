import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Whether the given date (YYYY-MM-DD) falls in EDT (daylight saving) for America/New_York. */
function isEDT(dateStr: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (m < 3 || m > 11) return false;
  if (m >= 4 && m <= 10) return true;
  if (m === 3) {
    let sundayCount = 0;
    for (let day = 1; day <= 31; day++) {
      if (new Date(y, 2, day).getMonth() !== 2) break;
      if (new Date(y, 2, day).getDay() === 0) {
        sundayCount++;
        if (sundayCount === 2) return d >= day;
      }
    }
    return d >= 9;
  }
  if (m === 11) {
    for (let day = 1; day <= 7; day++) {
      if (new Date(y, 10, day).getDay() === 0) return d < day;
    }
    return d < 2;
  }
  return false;
}

/** Convert date (YYYY-MM-DD) and time (HH:mm) in EST to ISO string (UTC). */
export function estDateTimeToISO(dateStr: string, timeStr: string): string {
  const [h, m] = timeStr.trim().split(":");
  const hour = parseInt(h ?? "0", 10);
  const min = parseInt(m ?? "0", 10);
  if (hour < 0 || hour > 23 || min < 0 || min > 59) {
    return new Date(dateStr + "T12:00:00.000Z").toISOString();
  }
  const timePadded = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  const offset = isEDT(dateStr) ? "-04:00" : "-05:00";
  return new Date(`${dateStr}T${timePadded}:00${offset}`).toISOString();
}
