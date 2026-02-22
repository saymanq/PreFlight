"use client";

import { useEffect } from "react";
import { redirect } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  Layers,
  AlertTriangle,
  Download,
  Zap,
  Code2,
  GitCompare,
  ListChecks,
} from "lucide-react";
import Particles from "@/components/ui/Particles";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const FEATURES = [
  {
    icon: <Layers className="h-5 w-5" />,
    title: "Visual Canvas",
    description:
      "Drag & drop 25+ architecture components onto an infinite canvas. Connect services with typed edges.",
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: "AI Generation",
    description: "Describe your app idea and Azure OpenAI GPT-5.2 generates a complete, validated architecture in seconds.",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: <AlertTriangle className="h-5 w-5" />,
    title: "Smart Scoring & Lint",
    description:
      "8-dimension analysis and 15+ architecture lint rules catch design mistakes before you build.",
  },
  {
    icon: <GitCompare className="h-5 w-5" />,
    title: "Compare Versions",
    description:
      "Save architecture snapshots and compare iterations side-by-side with visual diffs.",
  },
  {
    icon: <ListChecks className="h-5 w-5" />,
    title: "Feature Planner",
    description:
      "Plan features with MoSCoW prioritization. Track architecture impact per feature.",
  },
  {
    icon: <Download className="h-5 w-5" />,
    title: "Export Handoff",
    description:
      "Export as JSON, Markdown, or AI-generated prompt packs for Cursor, Claude, or Lovable.",
  },
];

const WORKFLOW = [
  {
    step: "01",
    title: "Describe",
    desc: "Tell Preflight your app idea and constraints",
    icon: <Code2 className="h-5 w-5" />,
  },
  {
    step: "02",
    title: "Generate",
    desc: "AI creates a scored architecture plan",
    icon: <Sparkles className="h-5 w-5" />,
  },
  {
    step: "03",
    title: "Refine",
    desc: "Drag, drop, lint, and iterate",
    icon: <Layers className="h-5 w-5" />,
  },
  {
    step: "04",
    title: "Export",
    desc: "Hand off prompt packs to your AI coder",
    icon: <Zap className="h-5 w-5" />,
  },
];

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      redirect("/dashboard");
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="animate-pulse text-white/40">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black overflow-x-hidden scroll-smooth">
      <Particles />

      {/* Navbar */}
      <motion.nav
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-black/60 backdrop-blur-sm"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <a href="/" className="flex items-center shrink-0" title="PreFlight">
            <img
              src="/preflight-logo.png"
              alt="PreFlight"
              className="h-10 w-auto object-contain"
            />
          </a>
          <div className="flex items-center gap-4">
            <a
              href="/sign-in"
              className="text-sm text-white/50 hover:text-white transition-colors"
            >
              Sign In
            </a>
            <a
              href="/sign-up"
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2 text-sm font-medium text-black hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Get Started
            </a>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center pt-14">
        <motion.div
          initial="hidden"
          animate="visible"
          className="relative z-10 max-w-4xl"
        >
          <motion.div
            custom={0}
            variants={fadeUp}
            className="flex items-center justify-center mb-8"
          >
            <img
              src="/preflight-logo.png"
              alt="PreFlight"
              className="h-20 w-auto object-contain"
            />
          </motion.div>

          <motion.div
            custom={1}
            variants={fadeUp}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] text-white/60 text-xs font-medium mb-8 border border-white/[0.08]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Architecture Planning for AI-First Teams
          </motion.div>

          <motion.h1
            custom={2}
            variants={fadeUp}
            className="text-5xl sm:text-6xl md:text-8xl font-bold tracking-tight mb-6 text-white"
          >
            Plan before
            <br />
            <span className="text-white/40">you build.</span>
          </motion.h1>

          <motion.p
            custom={3}
            variants={fadeUp}
            className="text-lg md:text-xl text-white/40 max-w-2xl mx-auto leading-relaxed mb-10"
          >
            Design, score, and validate architecture plans with AI — then export
            implementation-ready prompt packs for{" "}
            <span className="text-white font-medium">Cursor</span>,{" "}
            <span className="text-white font-medium">Claude Code</span>, or{" "}
            <span className="text-white font-medium">Lovable</span>.
          </motion.p>

          <motion.div
            custom={4}
            variants={fadeUp}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <a
              href="/sign-up"
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-sm font-medium text-black hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98] gap-2"
            >
              Start Planning Free
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#features"
              className="inline-flex items-center justify-center rounded-full border border-white/[0.1] px-8 py-3.5 text-sm font-medium text-white/60 hover:text-white hover:border-white/[0.2] transition-all"
            >
              See Features
            </a>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="w-5 h-8 rounded-full border-2 border-white/[0.1] flex items-start justify-center p-1">
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-1 h-1 rounded-full bg-white/30"
            />
          </div>
        </motion.div>
      </section>

      {/* Workflow */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16"
        >
          <motion.p
            custom={0}
            variants={fadeUp}
            className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3"
          >
            How it works
          </motion.p>
          <motion.h2
            custom={1}
            variants={fadeUp}
            className="text-3xl md:text-4xl font-bold text-white"
          >
            Idea to Implementation in 4 Steps
          </motion.h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {WORKFLOW.map((w, i) => (
            <motion.div
              key={w.step}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              variants={fadeUp}
              className="relative group"
            >
              <div className="p-6 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:border-white/[0.12] transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl font-bold text-white/10">
                    {w.step}
                  </span>
                  <div className="p-2 rounded-lg bg-white/[0.06] text-white/60">
                    {w.icon}
                  </div>
                </div>
                <h3 className="font-semibold text-white mb-1">{w.title}</h3>
                <p className="text-sm text-white/50">{w.desc}</p>
              </div>
              {i < 3 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 text-white/10">
                  <ArrowRight className="h-5 w-5" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="relative z-10 max-w-5xl mx-auto px-6 py-24"
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16"
        >
          <motion.p
            custom={0}
            variants={fadeUp}
            className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3"
          >
            Features
          </motion.p>
          <motion.h2
            custom={1}
            variants={fadeUp}
            className="text-3xl md:text-4xl font-bold text-white mb-4"
          >
            Everything You Need to Plan
          </motion.h2>
          <motion.p
            custom={2}
            variants={fadeUp}
            className="text-white/50 max-w-xl mx-auto"
          >
            From idea to implementation-ready architecture, Preflight gives you
            the tools to plan with confidence.
          </motion.p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              variants={fadeUp}
              className="p-6 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:border-white/[0.12] transition-all group"
            >
              <div className="p-2.5 rounded-xl bg-white/[0.06] w-fit mb-4 text-white/60 group-hover:text-white transition-colors">
                {feature.icon}
              </div>
              <h3 className="font-semibold text-white mb-2 group-hover:text-white transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-white/50 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 py-24 text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div
            custom={0}
            variants={fadeUp}
            className="p-12 rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm relative overflow-hidden"
          >
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to plan your next build?
              </h2>
              <p className="text-white/40 mb-8 max-w-lg mx-auto">
                Stop starting projects with a blank cursor. Plan your
                architecture first, then build with confidence.
              </p>
              <a
                href="/sign-up"
                className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-sm font-medium text-black hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98] gap-2"
              >
                Start Planning Free
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <a href="/" className="flex items-center shrink-0">
            <img
              src="/preflight-logo.png"
              alt="PreFlight"
              className="h-8 w-auto object-contain"
            />
          </a>
          <p className="text-xs text-white/30">
            Built for AI-first teams who plan before they build.
          </p>
        </div>
      </footer>
    </div>
  );
}
