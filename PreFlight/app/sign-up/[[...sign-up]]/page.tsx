"use client";

import { SignUp } from "@clerk/nextjs";
import Particles from "@/components/ui/Particles";

const authAppearance = {
  variables: {
    colorPrimary: "#16a34a",
    colorBackground: "#ffffff",
    colorInputBackground: "#f8fafc",
    colorInputText: "#0f172a",
    colorText: "#0f172a",
    colorTextSecondary: "#475569",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full max-w-md",
    card: "border border-white/70 bg-white/95 shadow-2xl backdrop-blur-md",
    headerTitle: "text-slate-900",
    headerSubtitle: "text-slate-600",
    socialButtonsBlockButton:
      "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    socialButtonsBlockButtonText: "text-slate-700",
    dividerLine: "bg-slate-200",
    dividerText: "text-slate-500",
    formFieldLabel: "text-slate-700",
    formFieldInput:
      "border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500/25",
    formButtonPrimary: "bg-emerald-600 text-white hover:bg-emerald-500",
    footerActionText: "text-slate-600",
    footerActionLink: "text-emerald-700 hover:text-emerald-600",
    formResendCodeLink: "text-emerald-700 hover:text-emerald-600",
    otpCodeFieldInput: "border border-slate-200 bg-slate-50 text-slate-900",
    alertText: "text-slate-700",
  },
} as const;

export default function SignUpPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      <Particles className="absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.22),transparent_60%)]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <SignUp afterSignUpUrl="/dashboard" appearance={authAppearance} />
      </div>
    </div>
  );
}
