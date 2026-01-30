"use client";

import Script from "next/script";
import { useRef, useEffect, useState } from "react";

const SCHEDULING_URL =
  process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_SCHEDULING_URL ||
  "https://calendar.google.com/calendar/appointments/schedules/AcZssZ25Ld2qzv_o7PoLQo0RRuOfc6i1G7kSUDwrUF5pmZSkq9tzRJVu3TSeZmav37r5gGtbYzup8NER?gv=true";

const SCRIPT_LOADED_EVENT = "google-calendar-scheduling-script-loaded";

declare global {
  interface Window {
    calendar?: {
      schedulingButton: {
        load: (opts: {
          url: string;
          color: string;
          label: string;
          target: HTMLElement;
        }) => void;
      };
    };
  }
}

function tryInjectButton(container: HTMLDivElement | null): boolean {
  if (typeof window === "undefined" || !container || !window.calendar?.schedulingButton) return false;
  window.calendar.schedulingButton.load({
    url: SCHEDULING_URL,
    color: "#7a3fd3",
    label: "Book an appointment",
    target: container,
  });
  return true;
}

export function GoogleCalendarSchedulingButton() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [injected, setInjected] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || injected) return;
    const attempt = () => {
      if (tryInjectButton(containerRef.current)) {
        setInjected(true);
        return true;
      }
      return false;
    };
    if (attempt()) return;
    const onScriptLoaded = () => attempt();
    window.addEventListener(SCRIPT_LOADED_EVENT, onScriptLoaded);
    const id = setInterval(() => {
      if (attempt()) clearInterval(id);
    }, 150);
    return () => {
      window.removeEventListener(SCRIPT_LOADED_EVENT, onScriptLoaded);
      clearInterval(id);
    };
  }, [injected]);

  return (
    <>
      <link
        href="https://calendar.google.com/calendar/scheduling-button-script.css"
        rel="stylesheet"
      />
      <Script
        src="https://calendar.google.com/calendar/scheduling-button-script.js"
        strategy="afterInteractive"
        onLoad={() => window.dispatchEvent(new Event(SCRIPT_LOADED_EVENT))}
      />
      <div ref={containerRef} className="inline-block min-h-[40px]" />
    </>
  );
}
