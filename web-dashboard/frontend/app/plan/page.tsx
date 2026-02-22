"use client";

import dynamic from "next/dynamic";

const PlanningChat = dynamic(() => import("@/components/plan/PlanningChat"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-[#0c0c0c] text-[#8e8e93]">
      <p>Loading...</p>
    </div>
  ),
});

export default function PlanPage() {
  return <PlanningChat />;
}
