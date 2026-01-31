"use client";

import { motion } from "framer-motion";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Wrench, DollarSign, LayoutDashboard } from "lucide-react";

const benefits = [
  {
    icon: Calendar,
    title: "Headache-Free Process",
    description: "Simple sign-up. Book online and we handle everything else from start to finish.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Wrench,
    title: "Full-Service Support",
    description: "We deliver, install, service, and remove. Professional support throughout your rental.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: DollarSign,
    title: "One Monthly Payment",
    description: "Starting at $60/mo with AutoPay. No surprises, no hidden fees.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: LayoutDashboard,
    title: "Stop Going to the Laundromat",
    description: "Do laundry on your schedule in the comfort of your own home. No more trips or waiting.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
];

export function BenefitsWithIcons() {
  return (
    <section className="px-4 py-20 sm:py-24" aria-labelledby="benefits-heading">
      <div className="mx-auto max-w-6xl space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4"
        >
          <h2 id="benefits-heading" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Why Zoomi Rentals
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need for hassle-free washer and dryer rental
          </p>
        </motion.div>
        
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full">
                  <CardHeader className="space-y-4">
                    <div className={`w-14 h-14 rounded-xl ${item.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`h-7 w-7 ${item.color}`} />
                    </div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
