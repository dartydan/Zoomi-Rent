"use client";

import { useInView } from "framer-motion";
import { useRef } from "react";
import { motion } from "framer-motion";
import { Calendar, Truck, Wrench, CheckCircle2 } from "lucide-react";

const steps = [
  {
    icon: Calendar,
    title: "Book Online",
    description: "Choose your preferred date and time. Quick, headache-free sign-up takes just minutes.",
  },
  {
    icon: Truck,
    title: "We Deliver & Install",
    description: "Our team brings premium units and handles complete professional installation at your home.",
  },
  {
    icon: Wrench,
    title: "We Service & Maintain",
    description: "Need repairs? We've got you covered. Professional service throughout your entire rental.",
  },
  {
    icon: CheckCircle2,
    title: "We Remove When Done",
    description: "When you're ready to end service, we'll remove everything. No hassle, no questions asked.",
  },
];

function TimelineStep({ step, index }: { step: typeof steps[0]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const Icon = step.icon;
  const isLast = index === steps.length - 1;

  return (
    <div ref={ref} className="relative flex gap-6 sm:gap-8">
      {/* Icon and line */}
      <div className="relative flex flex-col items-center">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
          transition={{ duration: 0.5, delay: index * 0.2 }}
          className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg"
        >
          <Icon className="h-8 w-8 text-primary-foreground" />
        </motion.div>
        
        {!isLast && (
          <motion.div
            initial={{ height: 0 }}
            animate={isInView ? { height: "100%" } : { height: 0 }}
            transition={{ duration: 0.5, delay: index * 0.2 + 0.3 }}
            className="w-0.5 bg-gradient-to-b from-primary to-primary/30 absolute top-16"
            style={{ minHeight: "80px" }}
          />
        )}
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
        transition={{ duration: 0.5, delay: index * 0.2 + 0.2 }}
        className="flex-1 pb-12"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-foreground sm:text-2xl">
              {step.title}
            </h3>
            <span className="text-sm font-medium text-primary">
              Step {index + 1}
            </span>
          </div>
          <p className="text-base text-muted-foreground leading-relaxed max-w-md">
            {step.description}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export function HowItWorksTimeline() {
  return (
    <div className="relative max-w-3xl mx-auto">
      {steps.map((step, index) => (
        <TimelineStep key={index} step={step} index={index} />
      ))}
    </div>
  );
}
