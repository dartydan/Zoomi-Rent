"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MarketingHeader } from "@/components/MarketingHeader";
import { SplashHero } from "@/components/SplashHero";
import { ValuePropsSection } from "@/components/ValuePropsSection";
import { BenefitsWithIcons } from "@/components/BenefitsWithIcons";
import { TestimonialsCarousel } from "@/components/TestimonialsCarousel";
import { PricingCalculator } from "@/components/PricingCalculator";
import { HowItWorksTimeline } from "@/components/HowItWorksTimeline";
import { Button } from "@/components/ui/button";

function PhotoGallerySection() {
  const photos = [
    {
      url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop",
      alt: "Modern apartment with washer and dryer",
      caption: "Premium units for any space"
    },
    {
      url: "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&auto=format&fit=crop",
      alt: "Washer and dryer installation in apartment",
      caption: "Professional installation"
    },
    {
      url: "https://images.unsplash.com/photo-1604709177225-055f99402ea3?w=800&auto=format&fit=crop",
      alt: "Clean laundry room setup",
      caption: "Clean, efficient design"
    },
  ];

  return (
    <section className="px-4 py-20 sm:py-24 bg-muted/30" aria-labelledby="gallery-heading">
      <div className="mx-auto max-w-6xl space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4"
        >
          <h2 id="gallery-heading" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            See It In Action
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Quality appliances that fit perfectly into your home
          </p>
        </motion.div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative overflow-hidden rounded-xl shadow-md hover:shadow-xl transition-all duration-300"
            >
              <div className="aspect-[4/3] relative overflow-hidden">
                <img
                  src={photo.url}
                  alt={photo.alt}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <p className="text-white font-semibold text-lg">{photo.caption}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="px-4 py-20 sm:py-24" aria-labelledby="how-it-works-heading">
      <div className="mx-auto max-w-6xl space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4"
        >
          <h2 id="how-it-works-heading" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get started in four simple steps
          </p>
        </motion.div>
        <HowItWorksTimeline />
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="px-4 py-20 sm:py-24 bg-muted/30" aria-labelledby="pricing-heading">
      <div className="mx-auto max-w-6xl space-y-6 sm:space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4"
        >
          <h2 id="pricing-heading" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that works best for you
          </p>
        </motion.div>
        <PricingCalculator />
      </div>
    </section>
  );
}

function TestimonialsSection() {
  return (
    <section id="testimonials" className="px-4 py-20 sm:py-24" aria-labelledby="testimonials-heading">
      <div className="mx-auto max-w-4xl space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center space-y-4"
        >
          <h2 id="testimonials-heading" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            What Our Customers Say
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real reviews from real customers
          </p>
        </motion.div>
        <TestimonialsCarousel />
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="px-4 py-20 sm:py-24">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 px-8 py-16 sm:px-16 shadow-2xl"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />
          <div className="relative text-center space-y-6">
            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
              Stop Going to the Laundromat Today
            </h2>
            <p className="text-lg text-primary-foreground/90 max-w-2xl mx-auto">
              Join hundreds of satisfied customers enjoying hassle-free laundry at home. We deliver, install, service, and remove.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" variant="secondary" className="text-base px-8 hover:scale-105 transition-transform" asChild>
                <Link href="/checklist">Get Started</Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8 bg-white/10 border-white/20 text-primary-foreground hover:bg-white/20 hover:text-primary-foreground hover:scale-105 transition-transform" asChild>
                <Link href="/checklist">Learn More</Link>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function MarketingFooter() {
  return (
    <footer className="border-t border-border px-4 py-8" role="contentinfo">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-lg font-semibold text-foreground">Zoomi Rentals</p>
            <p className="text-sm text-muted-foreground">Making laundry simple since 2024</p>
          </div>
          <Button variant="link" size="default" asChild>
            <Link href="/login">Customer Login</Link>
          </Button>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      {isDevelopment && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2">
          <div className="max-w-6xl mx-auto flex items-center justify-center gap-4">
            <span className="text-sm text-yellow-700 dark:text-yellow-400 font-medium">
              Development Mode
            </span>
            <Button size="sm" variant="outline" className="h-8 text-xs" asChild>
              <Link href="/playground">View Playground</Link>
            </Button>
          </div>
        </div>
      )}
      <SplashHero />
      <ValuePropsSection />
      <div id="benefits">
        <BenefitsWithIcons />
      </div>
      <PhotoGallerySection />
      <HowItWorksSection />
      <PricingSection />
      <TestimonialsSection />
      <CTASection />
      <MarketingFooter />
    </div>
  );
}
