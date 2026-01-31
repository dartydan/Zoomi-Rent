"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

const valueProps = [
  "Stop going to the laundromat",
  "We deliver to your door",
  "Professional installation included",
  "Full service and maintenance",
  "We remove when you're done",
  "No long-term contracts",
  "Affordable monthly payments",
  "Hassle-free from start to finish",
];

export function ValuePropsSection() {
  return (
    <section className="px-4 py-16 sm:py-20 border-y border-border bg-card/50">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-8"
        >
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Everything You Need, Nothing You Don't
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {valueProps.map((prop, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="flex items-start gap-3 text-left"
              >
                <div className="rounded-full bg-primary/20 p-1 mt-0.5 flex-shrink-0">
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground leading-relaxed">
                  {prop}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
