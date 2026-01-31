"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

export function SplashHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/5">
      {/* Background pattern */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#d6d3d1_1px,transparent_1px),linear-gradient(to_bottom,#d6d3d1_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
      </div>

      {/* Decorative gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 py-16 sm:py-20 md:py-24">
        <div className="mx-auto max-w-5xl space-y-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-5 py-2.5 backdrop-blur-sm border-2 border-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Headache-Free • We Handle Everything</span>
            </div>
            
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
              Washer & Dryer Rental
              <span className="block text-primary mt-2">
                Made Simple
              </span>
            </h1>
          </motion.div>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="text-lg sm:text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed text-muted-foreground font-medium"
          >
            Stop going to the laundromat. We deliver, install, service, and remove. One monthly payment. No hidden fees.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="inline-block"
          >
            <div className="rounded-3xl bg-card px-8 py-5 backdrop-blur-sm border-2 border-border shadow-2xl">
              <p className="text-4xl font-bold text-foreground sm:text-5xl">
                $60<span className="text-xl text-muted-foreground">/mo</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1.5 font-medium">
                with AutoPay • No long-term contract
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
          >
            <Link
              href="/checklist"
              className="group relative inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-10 py-5 text-lg font-semibold text-primary-foreground shadow-xl shadow-primary/30 transition-all hover:scale-105 hover:shadow-2xl hover:shadow-primary/40 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background"
            >
              Get Started Today
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            
            <button
              onClick={() => {
                const element = document.getElementById("how-it-works");
                if (element) {
                  const headerOffset = 80;
                  const elementPosition = element.getBoundingClientRect().top;
                  const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                  window.scrollTo({
                    top: offsetPosition,
                    behavior: "smooth"
                  });
                }
              }}
              className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-card px-10 py-5 text-lg font-semibold text-foreground backdrop-blur-sm border-2 border-border transition-all hover:bg-accent hover:scale-105 shadow-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
            >
              See How It Works
            </button>
          </motion.div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent z-10" />
    </section>
  );
}
