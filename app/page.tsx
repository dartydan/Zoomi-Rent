"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MarketingHeader } from "@/components/MarketingHeader";
import { SplashHero } from "@/components/SplashHero";
import { BenefitsWithIcons } from "@/components/BenefitsWithIcons";
import { TestimonialsCarousel } from "@/components/TestimonialsCarousel";
import { PricingCalculator } from "@/components/PricingCalculator";
import { HowItWorksTimeline } from "@/components/HowItWorksTimeline";
import { Button } from "@/components/ui/button";
import { useGetStarted } from "@/components/GetStartedContext";

function PhotoGallerySection() {
  const photos = [
    {
      url: "/washerdryer.webp",
      alt: "Modern apartment with washer and dryer",
      caption: "Premium units for any space"
    },
    {
      url: "/install.jpg",
      alt: "Washer and dryer installation in apartment",
      caption: "Professional installation"
    },
    {
      url: "/clean-design.png",
      alt: "Clean laundry room setup",
      caption: "Relax, no headache"
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
  const { openGetStarted } = useGetStarted();
  return (
    <section className="px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 px-8 py-16 sm:px-16 text-center space-y-8"
        >
          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
              Ready to simplify your laundry?
            </h2>
            <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mx-auto">
              Stop wasting time at the laundromat. Get started today with flexible month-to-month plans.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-base px-10 py-6 text-lg hover:scale-105 transition-transform" onClick={openGetStarted}>
              Get Started Today
            </Button>
            <Button size="lg" variant="outline" className="text-base px-10 py-6 text-lg hover:scale-105 transition-transform bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white" asChild>
              <Link href="#pricing">View Pricing</Link>
            </Button>
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
  return (
    <div className="min-h-screen bg-background">
      <MarketingHeader />
      <SplashHero />
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
