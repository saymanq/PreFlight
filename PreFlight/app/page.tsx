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

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const },
  }),
};

const FEATURES = [
  {
    icon: <Layers className="h-5 w-5" />,
    title: "Visual Canvas",
    description: "Drag & drop 25+ architecture components onto an infinite canvas. Connect services with typed edges.",
    color: "from-indigo-500 to-blue-500",
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
    description: "8-dimension analysis and 15+ architecture lint rules catch design mistakes before you build.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: <GitCompare className="h-5 w-5" />,
    title: "Compare Versions",
    description: "Save architecture snapshots and compare iterations side-by-side with visual diffs.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: <ListChecks className="h-5 w-5" />,
    title: "Feature Planner",
    description: "Plan features with MoSCoW prioritization. Track architecture impact per feature.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: <Download className="h-5 w-5" />,
    title: "Export Handoff",
    description: "Export as JSON, Markdown, or AI-generated prompt packs for Cursor, Claude, or Lovable.",
    color: "from-rose-500 to-red-500",
  },
];

const WORKFLOW = [
  { step: "01", title: "Describe", desc: "Tell Preflight your app idea and constraints", icon: <Code2 className="h-5 w-5" /> },
  { step: "02", title: "Generate", desc: "AI creates a scored architecture plan", icon: <Sparkles className="h-5 w-5" /> },
  { step: "03", title: "Refine", desc: "Drag, drop, lint, and iterate", icon: <Layers className="h-5 w-5" /> },
  { step: "04", title: "Export", desc: "Hand off prompt packs to your AI coder", icon: <Zap className="h-5 w-5" /> },
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navbar */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <span className="text-lg font-bold bg-gradient-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Preflight
          </span>
          <div className="flex items-center gap-3">
            <a
              href="/sign-in"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </a>
            <a
              href="/sign-up"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Get Started
            </a>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-4 text-center pt-14">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px]" />
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          className="relative z-10 max-w-4xl"
        >
          <motion.div custom={0} variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-8 border border-primary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Architecture Planning for AI-First Teams
          </motion.div>

          <motion.h1 custom={1} variants={fadeUp} className="text-5xl sm:text-6xl md:text-8xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Plan before
            </span>
            <br />
            <span className="text-foreground">you build.</span>
          </motion.h1>

          <motion.p custom={2} variants={fadeUp} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
            Design, score, and validate architecture plans with AI — then export implementation-ready prompt packs for{" "}
            <span className="text-foreground font-medium">Cursor</span>,{" "}
            <span className="text-foreground font-medium">Claude Code</span>, or{" "}
            <span className="text-foreground font-medium">Lovable</span>.
          </motion.p>

          <motion.div custom={3} variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/sign-up"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] gap-2 shadow-lg shadow-primary/20"
            >
              Start Planning Free
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#features"
              className="inline-flex items-center justify-center rounded-xl border border-border px-8 py-3.5 text-sm font-medium text-foreground hover:bg-accent/50 transition-all"
            >
              See Features
            </a>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="w-5 h-8 rounded-full border-2 border-border/50 flex items-start justify-center p-1">
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-1 h-1 rounded-full bg-muted-foreground"
            />
          </div>
        </motion.div>
      </section>

      {/* Workflow */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16"
        >
          <motion.p custom={0} variants={fadeUp} className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
            How it works
          </motion.p>
          <motion.h2 custom={1} variants={fadeUp} className="text-3xl md:text-4xl font-bold">
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
              <div className="p-6 rounded-2xl border border-border/50 bg-card/50 hover:border-primary/30 transition-all hover:bg-card/80">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl font-bold text-primary/20">{w.step}</span>
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {w.icon}
                  </div>
                </div>
                <h3 className="font-semibold mb-1">{w.title}</h3>
                <p className="text-sm text-muted-foreground">{w.desc}</p>
              </div>
              {i < 3 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 text-muted-foreground/20">
                  <ArrowRight className="h-5 w-5" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-5xl mx-auto px-6 py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="text-center mb-16"
        >
          <motion.p custom={0} variants={fadeUp} className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">
            Features
          </motion.p>
          <motion.h2 custom={1} variants={fadeUp} className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need to Plan
          </motion.h2>
          <motion.p custom={2} variants={fadeUp} className="text-muted-foreground max-w-xl mx-auto">
            From idea to implementation-ready architecture, Preflight gives you the tools to plan with confidence.
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
              className="p-6 rounded-2xl border border-border/50 bg-card/30 hover:border-primary/20 transition-all group"
            >
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${feature.color} w-fit mb-4 text-white shadow-lg`}>
                {feature.icon}
              </div>
              <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.div
            custom={0}
            variants={fadeUp}
            className="p-12 rounded-3xl border border-border/50 bg-gradient-to-b from-card/80 to-card/30 backdrop-blur-sm relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to plan your next build?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Stop starting projects with a blank cursor. Plan your architecture first, then build with confidence.
              </p>
              <a
                href="/sign-up"
                className="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98] gap-2 shadow-lg shadow-primary/20"
              >
                Start Planning Free
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm font-semibold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            Preflight
          </span>
          <p className="text-xs text-muted-foreground">
            Built for AI-first teams who plan before they build.
          </p>
        </div>
      </footer>
    </div>
  );
}
