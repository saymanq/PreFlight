"use client";

import { SignUp } from "@clerk/nextjs";
import Particles from "@/components/ui/Particles";

export default function SignUpPage() {
  return (
    <div className="relative flex items-center justify-center min-h-screen bg-black">
      <Particles />
      <div className="relative z-10">
        <SignUp afterSignUpUrl="/dashboard" />
      </div>
    </div>
  );
}
