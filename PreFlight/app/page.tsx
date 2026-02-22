"use client";

import React, { useEffect, useState } from "react";
import { redirect } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  ArrowRight,
  RocketIcon,
  MessageSquare,
  SlidersHorizontal,
  Rocket,
  Play,
  Check,
  X,
  AlertTriangle,
  Flame,
  Mail,
} from "lucide-react";
import Particles from "@/components/ui/Particles";
import { GlowingEffect } from "@/components/ui/glowing-effect";
import { Button, buttonVariants } from "@/components/ui/button";
import { useScroll } from "@/components/ui/use-scroll";
import { MenuToggleIcon } from "@/components/ui/menu-toggle-icon";
import { LogoCloud } from "@/components/ui/logo-cloud-3";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.06,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
};

const STEPS = [
  {
    num: "01",
    title: "Talk",
    icon: <MessageSquare className="h-5 w-5" />,
    description:
      "Describe what you're building. Preflight asks smart follow-ups about your constraints, budget, timeline, and scale.",
  },
  {
    num: "02",
    title: "Choose",
    icon: <SlidersHorizontal className="h-5 w-5" />,
    description:
      "Get component recommendations with honest trade-offs. Pick, reject, or ask questions. It adapts.",
  },
  {
    num: "03",
    title: "Build",
    icon: <Rocket className="h-5 w-5" />,
    description:
      "Your architecture appears on a visual canvas, scored and validated. One click exports to Cursor, Claude Code, or Lovable.",
  },
];

const STATS = [
  { value: "229", label: "Technologies" },
  { value: "22", label: "Categories" },
  { value: "8", label: "Scoring Dimensions" },
  { value: "30+", label: "Lint Rules" },
];

const COMPARISON = [
  {
    metric: "Time to architecture",
    preflight: "60 seconds",
    cursor: "2-6 hours of trial & error",
  },
  {
    metric: "Components evaluated",
    preflight: "229 across 22 categories",
    cursor: "Whatever you already know",
  },
  {
    metric: "Anti-patterns caught",
    preflight: "30+ lint rules, before code",
    cursor: "Discovered in production",
  },
  {
    metric: "Cost estimation",
    preflight: "Per-component cost scoring",
    cursor: "Surprise bills at scale",
  },
  {
    metric: "Scalability analysis",
    preflight: "8-dimensional scoring",
    cursor: "Hope for the best",
  },
  {
    metric: "Export to IDE",
    preflight: "One-click with prompts & configs",
    cursor: "Copy-paste from ChatGPT",
  },
];

const CATCHES = [
  {
    mistake: "Firebase for a project that needs SQL joins",
    detail:
      "Preflight flags this and suggests Supabase or PlanetScale instead.",
    severity: "high",
  },
  {
    mistake: "No queue for AI processing that takes 30+ seconds",
    detail:
      "Preflight adds BullMQ or Inngest before your server crashes under load.",
    severity: "high",
  },
  {
    mistake: "Auth provider that costs $500/mo at 50K users",
    detail:
      "Preflight compares Clerk, Supabase Auth, and Lucia with real cost curves.",
    severity: "medium",
  },
  {
    mistake: "WebSocket server with no horizontal scaling",
    detail:
      "Preflight recommends Redis pub/sub or a managed service like Ably.",
    severity: "medium",
  },
];

const TECH_LOGOS = [
  { src: "https://storage.efferd.com/logo/nvidia-wordmark.svg", alt: "Nvidia" },
  { src: "https://storage.efferd.com/logo/supabase-wordmark.svg", alt: "Supabase" },
  { src: "https://storage.efferd.com/logo/openai-wordmark.svg", alt: "OpenAI" },
  { src: "https://storage.efferd.com/logo/vercel-wordmark.svg", alt: "Vercel" },
  { src: "https://storage.efferd.com/logo/github-wordmark.svg", alt: "GitHub" },
  { src: "https://storage.efferd.com/logo/claude-wordmark.svg", alt: "Claude AI" },
  { src: "https://storage.efferd.com/logo/clerk-wordmark.svg", alt: "Clerk" },
];

const NAV_LINKS = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Compare", href: "#compare" },
  { label: "About", href: "#origin" },
];

function MobileMenu({
  open,
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & { open: boolean }) {
  if (!open || typeof window === "undefined") return null;

  return createPortal(
    <div
      id="mobile-menu"
      className={cn(
        "bg-background/95 supports-[backdrop-filter]:bg-background/50 backdrop-blur-lg",
        "fixed top-14 right-0 bottom-0 left-0 z-40 flex flex-col overflow-hidden border-y md:hidden"
      )}
    >
      <div
        data-slot={open ? "open" : "closed"}
        className={cn(
          "data-[slot=open]:animate-in data-[slot=open]:zoom-in-97 ease-out",
          "size-full p-4",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth();
  const [email, setEmail] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const scrolled = useScroll(10);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      redirect("/dashboard");
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--bg-primary)]">
        <div className="animate-pulse text-[var(--text-muted)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[var(--bg-primary)] overflow-x-hidden scroll-smooth">
      <Particles />

      {/* ─── Header ─── */}
      <header
        className={cn(
          "sticky top-0 z-50 w-full border-b border-transparent transition-all",
          scrolled &&
            "border-border bg-background/95 supports-[backdrop-filter]:bg-background/50 backdrop-blur-lg"
        )}
      >
        <nav className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <a href="/" className="hover:bg-accent/10 rounded-md p-2">
            <img
              src="/preflight-logo.png"
              alt="PreFlight"
              className="h-7 w-auto object-contain"
            />
          </a>
          <div className="hidden items-center gap-2 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                className={buttonVariants({ variant: "ghost" })}
                href={link.href}
              >
                {link.label}
              </a>
            ))}
            <Button variant="outline" asChild>
              <a href="/sign-in">Sign In</a>
            </Button>
            <Button asChild>
              <a href="/sign-up">Get Started</a>
            </Button>
          </div>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label="Toggle menu"
          >
            <MenuToggleIcon open={menuOpen} className="size-5" duration={300} />
          </Button>
        </nav>
        <MobileMenu open={menuOpen} className="flex flex-col justify-between gap-2">
          <div className="grid gap-y-2">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                className={buttonVariants({ variant: "ghost", className: "justify-start" })}
                href={link.href}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="outline" className="w-full bg-transparent" asChild>
              <a href="/sign-in">Sign In</a>
            </Button>
            <Button className="w-full" asChild>
              <a href="/sign-up">Get Started</a>
            </Button>
          </div>
        </MobileMenu>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative z-10 mx-auto w-full max-w-5xl">
        {/* Side faded borders */}
        <div
          aria-hidden="true"
          className="absolute inset-0 isolate hidden overflow-hidden contain-strict lg:block"
        >
          <div className="absolute inset-0 -top-14 isolate -z-10 bg-[radial-gradient(35%_80%_at_49%_0%,var(--color-foreground/.08),transparent)] contain-strict" />
        </div>

        <div
          aria-hidden="true"
          className="absolute inset-0 mx-auto hidden min-h-screen w-full max-w-5xl lg:block"
        >
          <div className="mask-y-from-80% mask-y-to-100% absolute inset-y-0 left-0 z-10 h-full w-px bg-foreground/15" />
          <div className="mask-y-from-80% mask-y-to-100% absolute inset-y-0 right-0 z-10 h-full w-px bg-foreground/15" />
        </div>

        {/* Main hero content */}
        <div className="relative flex flex-col items-center justify-center gap-5 pt-32 pb-30">
          {/* Inner content faded borders */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-1 size-full overflow-hidden"
          >
            <div className="absolute inset-y-0 left-4 w-px bg-linear-to-b from-transparent via-border to-border md:left-8" />
            <div className="absolute inset-y-0 right-4 w-px bg-linear-to-b from-transparent via-border to-border md:right-8" />
            <div className="absolute inset-y-0 left-8 w-px bg-linear-to-b from-transparent via-border/50 to-border/50 md:left-12" />
            <div className="absolute inset-y-0 right-8 w-px bg-linear-to-b from-transparent via-border/50 to-border/50 md:right-12" />
          </div>

          {/* Badge */}
          <a
            className={cn(
              "group mx-auto flex w-fit items-center gap-3 rounded-full border bg-card px-3 py-1 shadow",
              "fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards transition-all delay-500 duration-500 ease-out"
            )}
            href="/sign-up"
          >
            <RocketIcon className="size-3 text-[var(--accent)]" />
            <span className="text-xs">2,000+ developers planning before they build</span>
            <span className="block h-5 border-l" />
            <ArrowRight className="size-3 duration-150 ease-out group-hover:translate-x-1" />
          </a>

          {/* Heading */}
          <h1
            className={cn(
              "fade-in slide-in-from-bottom-10 animate-in text-balance fill-mode-backwards text-center text-4xl tracking-tight delay-100 duration-500 ease-out md:text-5xl lg:text-6xl",
              "text-shadow-[0_0px_50px_theme(--color-foreground/.2)]"
            )}
          >
            Plan before you build<span className="text-[var(--accent)]">.</span>
          </h1>

          {/* Subtitle */}
          <p className="fade-in slide-in-from-bottom-10 mx-auto max-w-md animate-in fill-mode-backwards text-center text-base text-foreground/80 tracking-wider delay-200 duration-500 ease-out sm:text-lg md:text-xl">
            The AI architect that stress-tests your idea, <br />
            designs your stack, and exports to your IDE in 60 seconds.
          </p>

          {/* CTA Buttons */}
          <div className="fade-in slide-in-from-bottom-10 flex animate-in flex-row flex-wrap items-center justify-center gap-3 fill-mode-backwards pt-2 delay-300 duration-500 ease-out">
            <Button className="rounded-full" size="lg" variant="secondary" asChild>
              <a href="#demo">
                <Play className="size-4 mr-2" />
                Watch Demo
              </a>
            </Button>
            <Button className="rounded-full" size="lg" asChild>
              <a href="/sign-up">
                Get Started
                <ArrowRight className="size-4 ms-2" />
              </a>
            </Button>
          </div>

          {/* Demo Video Placeholder */}
          <div
            id="demo"
            className="fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards delay-500 duration-500 ease-out relative w-full max-w-3xl mx-auto mt-10 rounded-2xl border border-border bg-card overflow-hidden aspect-video group cursor-pointer"
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-[var(--accent-muted)] flex items-center justify-center group-hover:bg-[var(--accent)]/25 transition-all group-hover:scale-110">
                <Play className="h-7 w-7 text-[var(--accent)] ml-1" />
              </div>
              <p className="text-sm text-muted-foreground">
                Chat &rarr; Components &rarr; Canvas in 60s
              </p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          </div>
        </div>
      </section>

      {/* ─── Logo Cloud ─── */}
      <section className="relative z-10 space-y-4 border-t border-border pt-6 pb-10">
        <h2 className="text-center font-medium text-lg text-muted-foreground tracking-tight md:text-xl">
          Built with technologies from <span className="text-foreground">industry leaders</span>
        </h2>
        <div className="relative z-10 mx-auto max-w-4xl">
          <LogoCloud logos={TECH_LOGOS} />
        </div>
      </section>

      {/* ─── The Problem ─── */}
      <section
        id="problem"
        className="relative z-10 max-w-3xl mx-auto px-6 py-28"
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          <motion.p
            custom={0}
            variants={fadeUp}
            className="text-xs font-semibold text-[var(--accent)] uppercase tracking-widest mb-4"
          >
            The Problem
          </motion.p>
          <motion.h2
            custom={1}
            variants={fadeUp}
            className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-6 leading-snug"
          >
            Every developer starts the same way.
          </motion.h2>
          <motion.p
            custom={2}
            variants={fadeUp}
            className="text-base text-[var(--text-muted)] leading-relaxed"
          >
            You have an idea. You open Cursor. You start prompting. Six hours later, your database doesn&apos;t support real-time, your auth can&apos;t handle teams, and your storage costs 10x what you budgeted.
          </motion.p>
          <motion.p
            custom={3}
            variants={fadeUp}
            className="text-base text-[var(--text-secondary)] leading-relaxed mt-4 font-medium"
          >
            The architecture was wrong from the start. No AI coding tool told you.
          </motion.p>
        </motion.div>
      </section>

      {/* ─── What Preflight Catches ─── */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-28">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mb-14"
        >
          <motion.p
            custom={0}
            variants={fadeUp}
            className="text-xs font-semibold text-[var(--accent)] uppercase tracking-widest mb-4"
          >
            What Preflight Catches
          </motion.p>
          <motion.h2
            custom={1}
            variants={fadeUp}
            className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] leading-snug"
          >
            Real mistakes.{" "}
            <span className="text-[var(--text-muted)]">Caught before line one.</span>
          </motion.h2>
        </motion.div>

        <ul className="grid grid-cols-1 gap-4 md:grid-cols-12 md:grid-rows-2 lg:gap-4">
          {CATCHES.map((item, i) => {
            const areas = [
              "md:[grid-area:1/1/2/7]",
              "md:[grid-area:1/7/2/13]",
              "md:[grid-area:2/1/2/7]",
              "md:[grid-area:2/7/3/13]",
            ];
            return (
              <motion.li
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className={`min-h-[14rem] list-none ${areas[i]}`}
              >
                <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-border p-2 md:rounded-[1.5rem] md:p-3">
                  <GlowingEffect
                    spread={40}
                    glow={true}
                    disabled={false}
                    proximity={64}
                    inactiveZone={0.01}
                    borderWidth={3}
                  />
                  <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl border-[0.75px] border-border bg-background p-6 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
                    <div className="relative flex flex-1 flex-col justify-between gap-3">
                      <div
                        className={`w-fit rounded-lg border-[0.75px] border-border p-2 ${
                          item.severity === "high"
                            ? "text-[var(--error)]"
                            : "text-[var(--warning)]"
                        }`}
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="space-y-3">
                        <h3 className="pt-0.5 text-xl leading-[1.375rem] font-semibold tracking-[-0.04em] md:text-2xl md:leading-[1.875rem] text-balance text-foreground">
                          {item.mistake}
                        </h3>
                        <p className="text-sm leading-[1.125rem] md:text-base md:leading-[1.375rem] text-muted-foreground">
                          {item.detail}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </section>

      {/* ─── What Preflight Does ─── */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-28">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          <motion.p
            custom={0}
            variants={fadeUp}
            className="text-xs font-semibold text-[var(--accent)] uppercase tracking-widest mb-4"
          >
            What Preflight Does
          </motion.p>
          <motion.h2
            custom={1}
            variants={fadeUp}
            className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-6 leading-snug"
          >
            The missing 30 minutes between your idea and your first line of code.
          </motion.h2>
          <motion.p
            custom={2}
            variants={fadeUp}
            className="text-base text-[var(--text-muted)] leading-relaxed"
          >
            Describe what you&apos;re building in plain English. Preflight asks the questions a $400/hr architect would ask, then designs the architecture visually, scores every component across 8 dimensions, and lints for 30+ anti-patterns.
          </motion.p>
          <motion.p
            custom={3}
            variants={fadeUp}
            className="text-base text-[var(--accent)] font-medium mt-4"
          >
            One click to export.
          </motion.p>
        </motion.div>
      </section>

      {/* ─── The Numbers ─── */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-28">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="text-center mb-16"
        >
          <motion.p
            custom={0}
            variants={fadeUp}
            className="text-xs font-semibold text-[var(--accent)] uppercase tracking-widest mb-4"
          >
            The Numbers
          </motion.p>
          <motion.p
            custom={1}
            variants={fadeUp}
            className="text-base text-[var(--text-muted)] max-w-xl mx-auto leading-relaxed"
          >
            Every technology in the modern stack. Scored, compared, and recommended for your project.
          </motion.p>
        </motion.div>

        <ul className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((stat, i) => (
            <motion.li
              key={stat.label}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              variants={fadeUp}
              className="list-none"
            >
              <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-border p-2 md:rounded-[1.5rem] md:p-2">
                <GlowingEffect
                  spread={40}
                  glow={true}
                  disabled={false}
                  proximity={64}
                  inactiveZone={0.01}
                  borderWidth={2}
                />
                <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl border-[0.75px] border-border bg-background py-8 px-4 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
                  <div className="text-3xl md:text-4xl font-bold text-[var(--accent)] mb-1">
                    {stat.value}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">
                    {stat.label}
                  </div>
                </div>
              </div>
            </motion.li>
          ))}
        </ul>
      </section>

      {/* ─── Comparison Table ─── */}
      <section id="compare" className="relative z-10 max-w-4xl mx-auto px-6 py-28">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mb-14"
        >
          <motion.p
            custom={0}
            variants={fadeUp}
            className="text-xs font-semibold text-[var(--accent)] uppercase tracking-widest mb-4"
          >
            The Difference
          </motion.p>
          <motion.h2
            custom={1}
            variants={fadeUp}
            className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] leading-snug"
          >
            Preflight vs. starting in Cursor
          </motion.h2>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          custom={0}
          variants={fadeUp}
        >
          <div className="relative rounded-[1.25rem] border-[0.75px] border-border p-2 md:rounded-[1.5rem] md:p-3">
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={3}
            />
            <div className="relative overflow-hidden rounded-xl border-[0.75px] border-border bg-background shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
              <div className="grid grid-cols-[1fr_1fr_1fr] text-xs uppercase tracking-wider border-b border-border bg-muted">
                <div className="px-5 py-4 text-muted-foreground" />
                <div className="px-5 py-4 text-[var(--accent)] font-semibold">Preflight</div>
                <div className="px-5 py-4 text-muted-foreground font-semibold">
                  Without Preflight
                </div>
              </div>
              {COMPARISON.map((row, i) => (
                <div
                  key={i}
                  className={`grid grid-cols-[1fr_1fr_1fr] text-sm ${
                    i < COMPARISON.length - 1 ? "border-b border-border" : ""
                  } hover:bg-muted transition-colors`}
                >
                  <div className="px-5 py-4 text-muted-foreground font-medium">
                    {row.metric}
                  </div>
                  <div className="px-5 py-4 text-foreground flex items-start gap-2">
                    <Check className="h-4 w-4 text-[var(--accent)] shrink-0 mt-0.5" />
                    <span>{row.preflight}</span>
                  </div>
                  <div className="px-5 py-4 text-muted-foreground/50 flex items-start gap-2">
                    <X className="h-4 w-4 text-muted-foreground/30 shrink-0 mt-0.5" />
                    <span>{row.cursor}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ─── How It Works ─── */}
      <section
        id="how-it-works"
        className="relative z-10 max-w-3xl mx-auto px-6 py-28"
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="mb-16"
        >
          <motion.p
            custom={0}
            variants={fadeUp}
            className="text-xs font-semibold text-[var(--accent)] uppercase tracking-widest mb-4"
          >
            How It Works
          </motion.p>
          <motion.h2
            custom={1}
            variants={fadeUp}
            className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] leading-snug"
          >
            Idea to implementation in 60 seconds.
          </motion.h2>
        </motion.div>

        <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <motion.li
              key={step.num}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              variants={fadeUp}
              className="min-h-[16rem] list-none"
            >
              <div className="relative h-full rounded-[1.25rem] border-[0.75px] border-border p-2 md:rounded-[1.5rem] md:p-3">
                <GlowingEffect
                  spread={40}
                  glow={true}
                  disabled={false}
                  proximity={64}
                  inactiveZone={0.01}
                  borderWidth={3}
                />
                <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl border-[0.75px] border-border bg-background p-6 shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
                  <div className="relative flex flex-1 flex-col justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-fit rounded-lg border-[0.75px] border-border bg-[var(--accent-muted)] p-2 text-[var(--accent)]">
                        {step.icon}
                      </div>
                      <span className="text-sm font-bold text-muted-foreground">
                        {step.num}
                      </span>
                    </div>
                    <div className="space-y-3">
                      <h3 className="pt-0.5 text-xl leading-[1.375rem] font-semibold tracking-[-0.04em] md:text-2xl md:leading-[1.875rem] text-foreground">
                        {step.title}
                      </h3>
                      <p className="text-sm leading-[1.125rem] md:text-base md:leading-[1.375rem] text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.li>
          ))}
        </ul>
      </section>

      {/* ─── Origin Story ─── */}
      <section id="origin" className="relative z-10 max-w-3xl mx-auto px-6 py-28">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          <motion.div
            custom={0}
            variants={fadeUp}
            className="flex items-center gap-2 mb-6"
          >
            <Flame className="h-5 w-5 text-[var(--warning)]" />
            <p className="text-xs font-semibold text-[var(--warning)] uppercase tracking-widest">
              Built by developers who got burned
            </p>
          </motion.div>
          <motion.h2
            custom={1}
            variants={fadeUp}
            className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-6 leading-snug"
          >
            We rebuilt our hackathon project 3 times because the architecture was wrong.
          </motion.h2>
          <motion.p
            custom={2}
            variants={fadeUp}
            className="text-base text-[var(--text-muted)] leading-relaxed"
          >
            Wrong database. Wrong auth. Wrong queue. Every time we started coding, we discovered the stack couldn&apos;t handle what we were building. By the third rewrite, we realized the problem wasn&apos;t the code. It was the decisions we made before we wrote any.
          </motion.p>
          <motion.p
            custom={3}
            variants={fadeUp}
            className="text-base text-[var(--text-secondary)] leading-relaxed mt-4"
          >
            So we built the tool that would have saved us. Preflight is the architect we wished we had. It asks the hard questions upfront, knows every technology trade-off, and never lets you ship an architecture that breaks at scale.
          </motion.p>
        </motion.div>
      </section>

      {/* ─── Tagline Divider ─── */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.blockquote
            custom={0}
            variants={fadeUp}
            className="text-center"
          >
            <p className="text-xl md:text-2xl font-medium text-[var(--text-secondary)] italic leading-relaxed">
              &quot;The 30 minutes that saves you 30 days.&quot;
            </p>
          </motion.blockquote>
        </motion.div>
      </section>

      {/* ─── Why This Matters ─── */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-28">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          <motion.p
            custom={0}
            variants={fadeUp}
            className="text-xs font-semibold text-[var(--accent)] uppercase tracking-widest mb-4"
          >
            Why This Matters
          </motion.p>
          <motion.h2
            custom={1}
            variants={fadeUp}
            className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-6 leading-snug"
          >
            AI made building 10x faster. It also made building the wrong thing 10x faster.
          </motion.h2>
          <motion.p
            custom={2}
            variants={fadeUp}
            className="text-base text-[var(--text-muted)] leading-relaxed"
          >
            Preflight is the guardrail. The architect in the room who asks &quot;what happens at 10,000 users?&quot; before you commit to a stack that breaks at 500.
          </motion.p>
          <motion.p
            custom={3}
            variants={fadeUp}
            className="text-sm text-white/25 mt-6"
          >
            Every AI tool helps you write code. None of them ask if you should.
          </motion.p>
        </motion.div>
      </section>

      {/* ─── Waitlist CTA ─── */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-28">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div
            custom={0}
            variants={fadeUp}
          >
            <div className="relative rounded-[1.25rem] border-[0.75px] border-border p-2 md:rounded-[1.5rem] md:p-3">
              <GlowingEffect
                spread={40}
                glow={true}
                disabled={false}
                proximity={64}
                inactiveZone={0.01}
                borderWidth={3}
              />
              <div className="relative overflow-hidden rounded-xl border-[0.75px] border-border bg-background p-10 md:p-16 text-center shadow-sm dark:shadow-[0px_0px_27px_0px_rgba(45,45,45,0.3)]">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                  Think first. Build right. Ship fast.
                </h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto text-base">
                  Join 2,000+ developers who plan before they build.
                </p>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    window.location.href = "/sign-up";
                  }}
                  className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-6"
                >
                  <div className="relative flex-1">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full rounded-full bg-muted border border-border pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--accent)] transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-all gap-2 shrink-0"
                  >
                    Get Early Access
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>

                <p className="text-xs text-muted-foreground">
                  Free to start. No credit card required.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 border-t border-[var(--glass-border)] py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <a href="/" className="flex items-center shrink-0">
            <img
              src="/preflight-logo.png"
              alt="PreFlight"
              className="h-8 w-auto object-contain"
            />
          </a>
          <p className="text-xs text-[var(--text-muted)]">
            Built for developers who plan before they build.
          </p>
        </div>
      </footer>
    </div>
  );
}
