"use client";

import { SignIn } from "@clerk/nextjs";
import Particles from "@/components/ui/Particles";

export default function SignInPage() {
  return (
    <div className="relative flex items-center justify-center min-h-screen bg-black">
      <Particles />
      <div className="relative z-10">
        <SignIn afterSignInUrl="/dashboard" />
      </div>
    </div>
  );
}
