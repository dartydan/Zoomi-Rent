"use client";

import Link from "next/link";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { motion } from "framer-motion";
import { UserPlus, Camera, Calendar, Truck, LayoutDashboard } from "lucide-react";
import { useGetStarted } from "@/components/GetStartedContext";

const steps = [
  {
    icon: UserPlus,
    title: "Sign Up",
    descriptionKey: "signup",
  },
  {
    icon: Camera,
    title: "Submit Laundry Space Photo",
    description: "Upload a clear photo of your laundry area so hookups and space can be verified before scheduling.",
  },
  {
    icon: Calendar,
    title: "Schedule Installation",
    description: "Once approved, you are placed on the installation schedule and receive a confirmed date.",
  },
  {
    icon: Truck,
    title: "Installation and Activation",
    description: "We deliver and install the washer and dryer at no cost, review and sign the service agreement, and collect the first month's payment on site.",
  },
  {
    icon: LayoutDashboard,
    title: "Portal Access and Support",
    descriptionKey: "portal",
  },
];

function TimelineStep({ step, index }: { step: (typeof steps)[number]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { openGetStarted } = useGetStarted();

  const Icon = step.icon;
  const isLeft = index === 1 || index === 3; // steps 2 and 4 to the left, right-aligned

  const description =
    step.descriptionKey === "signup" ? (
      <span className="text-base text-muted-foreground leading-relaxed max-w-md inline-block">
        Complete the{" "}
        <button
          type="button"
          onClick={() => openGetStarted()}
          className="font-bold text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
        >
          Get Started
        </button>{" "}
        form with your contact and billing information.
      </span>
    ) : step.descriptionKey === "portal" ? (
      <span className="text-base text-muted-foreground leading-relaxed max-w-md inline-block">
        Get access to your{" "}
        <Link
          href="/login"
          className="font-bold text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
        >
          customer portal
        </Link>{" "}
        for billing and service requests. Support responses are provided within 24 hours.
      </span>
    ) : (
      <p className="text-base text-muted-foreground leading-relaxed max-w-md">
        {"description" in step ? step.description : ""}
      </p>
    );

  const content = (
    <motion.div
      initial={{ opacity: 0, x: isLeft ? 20 : -20 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: isLeft ? 20 : -20 }}
      transition={{ duration: 0.5, delay: index * 0.2 + 0.2 }}
      className={`flex-1 pb-12 ${isLeft ? "pr-6 sm:pr-8" : "pl-6 sm:pl-8"}`}
    >
      <div className={`space-y-2 max-w-md ${isLeft ? "ml-auto text-right" : ""}`}>
        <h3 className="text-xl font-bold text-foreground sm:text-2xl">
          {step.title}
        </h3>
        {description}
      </div>
    </motion.div>
  );

  return (
    <div ref={ref} className="relative grid grid-cols-[1fr_auto_1fr] gap-0 items-start max-w-4xl mx-auto">
      {isLeft ? content : <div className="pb-12" />}
      {/* Icon - centered */}
      <div className="relative flex flex-col items-center">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          transition={{ duration: 0.5, delay: index * 0.2 }}
          className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg"
        >
          <Icon className="h-8 w-8 text-primary-foreground" />
        </motion.div>
      </div>
      {!isLeft ? content : <div className="pb-12" />}
    </div>
  );
}

export function HowItWorksTimeline() {
  return (
    <div className="relative max-w-4xl mx-auto">
      {/* Single continuous line - centered behind icons */}
      <div
        className="absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 bg-gradient-to-b from-primary to-primary/30 z-0"
        aria-hidden
      />
      {steps.map((step, index) => (
        <TimelineStep key={index} step={step} index={index} />
      ))}
    </div>
  );
}
