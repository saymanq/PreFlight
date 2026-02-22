"use client";

import dynamic from "next/dynamic";

const PlanningChat = dynamic(() => import("@/components/plan/PlanningChat"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-[var(--plan-bg)] text-[var(--plan-text-muted)]">
      <p>Loading...</p>
    </div>
  ),
});

export default function DashboardPage() {
  return <PlanningChat />;
}
