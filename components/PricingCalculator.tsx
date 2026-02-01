"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { useGetStarted } from "@/components/GetStartedContext";

type Plan = {
  id: string;
  name: string;
  basePrice: number;
  autoPayPrice: number;
  popular?: boolean;
};

const plans: Plan[] = [
  {
    id: "basic",
    name: "Basic Units",
    basePrice: 70,
    autoPayPrice: 60,
  },
  {
    id: "premium",
    name: "Premium Units",
    basePrice: 90,
    autoPayPrice: 80,
    popular: true,
  },
];

export function PricingCalculator() {
  const [selectedPlan, setSelectedPlan] = useState<string>("premium");
  const [useAutoPay, setUseAutoPay] = useState<boolean>(true);
  const { openGetStarted } = useGetStarted();

  const selectedPlanData = plans.find((p) => p.id === selectedPlan);
  const currentPrice = selectedPlanData
    ? useAutoPay
      ? selectedPlanData.autoPayPrice
      : selectedPlanData.basePrice
    : 0;
  const savings = selectedPlanData
    ? selectedPlanData.basePrice - selectedPlanData.autoPayPrice
    : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* AutoPay toggle */}
      <div className="flex justify-center">
        <div className="inline-flex flex-row items-center gap-4 rounded-2xl sm:border-2 sm:border-border sm:bg-card px-6 py-5 sm:shadow-sm">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-primary" />
            <div className="text-left">
              <p className="text-base font-semibold text-foreground">Enable AutoPay</p>
              <p className="text-sm text-muted-foreground">Save ${savings} per month</p>
            </div>
          </div>
          
          {/* iOS-style toggle switch */}
          <button
            onClick={() => setUseAutoPay(!useAutoPay)}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              useAutoPay ? "bg-primary" : "bg-muted-foreground/30 border-2 border-border"
            }`}
            role="switch"
            aria-checked={useAutoPay}
            aria-label="Toggle AutoPay"
          >
            <motion.span
              animate={{
                x: useAutoPay ? 28 : 4
              }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30
              }}
              className="inline-block h-6 w-6 rounded-full bg-white shadow-lg"
            />
          </button>
        </div>
      </div>

      {/* Plans grid */}
      <div className="grid gap-6 sm:grid-cols-2 max-w-4xl mx-auto">
        {plans.map((plan) => (
          <motion.div
            key={plan.id}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card
              className={`relative cursor-pointer transition-all h-full ${
                selectedPlan === plan.id
                  ? "border-primary border-2 shadow-lg"
                  : "hover:border-primary/50"
              } ${plan.popular ? "ring-2 ring-primary/20" : ""}`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <div className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                </div>
              )}
              <CardHeader className="space-y-4">
                <div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription className="mt-3">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-4xl font-bold text-foreground">
                        ${useAutoPay ? plan.autoPayPrice : plan.basePrice}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                      {useAutoPay && (
                        <div className="ml-auto flex items-baseline gap-1.5">
                          <span className="text-sm text-muted-foreground line-through">
                            ${plan.basePrice}/mo
                          </span>
                          <span className="text-xs font-semibold text-green-600 dark:text-green-500">
                            Save ${savings}/mo
                          </span>
                        </div>
                      )}
                    </div>
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Summary */}
      <div className="max-w-4xl mx-auto">
        <motion.div
          layout
          className="p-6 sm:p-8"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left w-full sm:w-auto">
              <p className="text-sm font-medium text-primary uppercase tracking-wide mb-2">Selected Plan</p>
              <p className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                {selectedPlanData?.name}
              </p>
            </div>
            <Button size="lg" className="w-full sm:w-auto px-8 py-6 text-lg hover:scale-105 transition-transform whitespace-nowrap" onClick={() => openGetStarted(selectedPlanData?.name)}>
              Get Started
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
