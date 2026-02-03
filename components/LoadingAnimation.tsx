"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { cn } from "@/lib/utils";

const LOTTIE_URL = "https://lottie.host/aa47d801-3a7f-4cde-8b25-c323095e55a1/eQMYPDqRb0.lottie";

type LoadingAnimationProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

export function LoadingAnimation({ className, size = "md" }: LoadingAnimationProps) {
  return (
    <div className={cn("flex items-center justify-center", sizeClasses[size], className)} role="status" aria-label="Loading">
      <DotLottieReact src={LOTTIE_URL} loop autoplay className="h-full w-full" />
    </div>
  );
}
