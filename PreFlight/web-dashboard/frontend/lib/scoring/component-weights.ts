export interface ScoreWeights {
  buildSpeed: number;
  complexity: number;
  scalability: number;
  cost: number;
  opsBurden: number;
  lockIn: number;
  reliability: number;
  aiReadiness: number;
}

export const COMPONENT_WEIGHTS: Record<string, ScoreWeights> = {
  // ── BACKEND ──
  fastapi:          { buildSpeed: 7, complexity: 4, scalability: 7, cost: 15, opsBurden: 5, lockIn: 2, reliability: 7, aiReadiness: 8 },
  express:          { buildSpeed: 8, complexity: 3, scalability: 6, cost: 10, opsBurden: 4, lockIn: 1, reliability: 6, aiReadiness: 5 },
  nodejs:           { buildSpeed: 8, complexity: 3, scalability: 6, cost: 10, opsBurden: 4, lockIn: 1, reliability: 6, aiReadiness: 5 },
  django:           { buildSpeed: 6, complexity: 5, scalability: 7, cost: 15, opsBurden: 5, lockIn: 2, reliability: 8, aiReadiness: 6 },
  flask:            { buildSpeed: 8, complexity: 3, scalability: 5, cost: 10, opsBurden: 4, lockIn: 1, reliability: 5, aiReadiness: 7 },
  spring:           { buildSpeed: 4, complexity: 7, scalability: 9, cost: 20, opsBurden: 6, lockIn: 2, reliability: 9, aiReadiness: 4 },
  nestjs:           { buildSpeed: 6, complexity: 5, scalability: 7, cost: 12, opsBurden: 4, lockIn: 2, reliability: 7, aiReadiness: 5 },
  go:               { buildSpeed: 5, complexity: 5, scalability: 9, cost: 8,  opsBurden: 5, lockIn: 1, reliability: 8, aiReadiness: 4 },

  // ── FRONTEND ──
  react:            { buildSpeed: 7, complexity: 2, scalability: 7, cost: 0, opsBurden: 2, lockIn: 1, reliability: 7, aiReadiness: 4 },
  nextjs:           { buildSpeed: 8, complexity: 3, scalability: 8, cost: 0, opsBurden: 2, lockIn: 2, reliability: 8, aiReadiness: 5 },
  vue:              { buildSpeed: 8, complexity: 2, scalability: 7, cost: 0, opsBurden: 2, lockIn: 1, reliability: 7, aiReadiness: 3 },
  svelte:           { buildSpeed: 8, complexity: 2, scalability: 6, cost: 0, opsBurden: 2, lockIn: 2, reliability: 6, aiReadiness: 3 },
  angular:          { buildSpeed: 5, complexity: 6, scalability: 8, cost: 0, opsBurden: 3, lockIn: 3, reliability: 8, aiReadiness: 3 },
  solid:            { buildSpeed: 7, complexity: 2, scalability: 7, cost: 0, opsBurden: 2, lockIn: 2, reliability: 6, aiReadiness: 3 },
  astro:            { buildSpeed: 8, complexity: 2, scalability: 7, cost: 0, opsBurden: 1, lockIn: 2, reliability: 7, aiReadiness: 3 },

  // ── DATABASE ──
  postgresql:       { buildSpeed: 5, complexity: 4, scalability: 8, cost: 15, opsBurden: 5, lockIn: 1, reliability: 9, aiReadiness: 5 },
  mysql:            { buildSpeed: 5, complexity: 4, scalability: 7, cost: 12, opsBurden: 5, lockIn: 1, reliability: 8, aiReadiness: 3 },
  mongodb:          { buildSpeed: 7, complexity: 3, scalability: 8, cost: 25, opsBurden: 3, lockIn: 3, reliability: 7, aiReadiness: 6 },
  supabase:         { buildSpeed: 8, complexity: 2, scalability: 7, cost: 25, opsBurden: 1, lockIn: 4, reliability: 7, aiReadiness: 5 },
  firebase:         { buildSpeed: 9, complexity: 2, scalability: 7, cost: 25, opsBurden: 1, lockIn: 6, reliability: 7, aiReadiness: 4 },
  redis:            { buildSpeed: 6, complexity: 3, scalability: 9, cost: 10, opsBurden: 3, lockIn: 1, reliability: 7, aiReadiness: 3 },
  amazondynamodb:   { buildSpeed: 6, complexity: 4, scalability: 10, cost: 20, opsBurden: 2, lockIn: 7, reliability: 9, aiReadiness: 3 },
  planetscale:      { buildSpeed: 7, complexity: 2, scalability: 8, cost: 29, opsBurden: 1, lockIn: 4, reliability: 8, aiReadiness: 3 },

  // ── HOSTING ──
  vercel:           { buildSpeed: 10, complexity: 1, scalability: 8, cost: 20, opsBurden: 0, lockIn: 4, reliability: 9, aiReadiness: 3 },
  netlify:          { buildSpeed: 9, complexity: 1, scalability: 7, cost: 19, opsBurden: 0, lockIn: 3, reliability: 8, aiReadiness: 2 },
  "aws-ec2":        { buildSpeed: 3, complexity: 7, scalability: 10, cost: 50, opsBurden: 8, lockIn: 5, reliability: 9, aiReadiness: 5 },
  "gcp-compute":    { buildSpeed: 3, complexity: 7, scalability: 10, cost: 45, opsBurden: 8, lockIn: 5, reliability: 9, aiReadiness: 6 },
  "azure-vm":       { buildSpeed: 3, complexity: 7, scalability: 10, cost: 48, opsBurden: 8, lockIn: 5, reliability: 9, aiReadiness: 5 },
  railway:          { buildSpeed: 9, complexity: 1, scalability: 6, cost: 5,  opsBurden: 1, lockIn: 2, reliability: 7, aiReadiness: 3 },
  render:           { buildSpeed: 9, complexity: 1, scalability: 6, cost: 7,  opsBurden: 1, lockIn: 2, reliability: 7, aiReadiness: 3 },
  cloudrun:         { buildSpeed: 7, complexity: 3, scalability: 9, cost: 15, opsBurden: 2, lockIn: 4, reliability: 8, aiReadiness: 4 },

  // ── ML / AI ──
  tensorflow:       { buildSpeed: 4, complexity: 7, scalability: 7, cost: 50, opsBurden: 6, lockIn: 3, reliability: 7, aiReadiness: 9 },
  pytorch:          { buildSpeed: 4, complexity: 7, scalability: 7, cost: 50, opsBurden: 6, lockIn: 3, reliability: 7, aiReadiness: 9 },
  opencv:           { buildSpeed: 5, complexity: 5, scalability: 6, cost: 0,  opsBurden: 4, lockIn: 1, reliability: 6, aiReadiness: 6 },
  scikitlearn:      { buildSpeed: 6, complexity: 4, scalability: 5, cost: 0,  opsBurden: 3, lockIn: 1, reliability: 6, aiReadiness: 7 },
  huggingface:      { buildSpeed: 7, complexity: 3, scalability: 7, cost: 9,  opsBurden: 3, lockIn: 3, reliability: 7, aiReadiness: 10 },
  openai:           { buildSpeed: 9, complexity: 1, scalability: 8, cost: 50, opsBurden: 1, lockIn: 4, reliability: 8, aiReadiness: 10 },
  anthropic:        { buildSpeed: 9, complexity: 1, scalability: 8, cost: 60, opsBurden: 1, lockIn: 4, reliability: 8, aiReadiness: 10 },

  // ── AUTH ──
  auth0:            { buildSpeed: 7, complexity: 3, scalability: 9, cost: 23, opsBurden: 2, lockIn: 5, reliability: 9, aiReadiness: 0 },
  clerk:            { buildSpeed: 9, complexity: 1, scalability: 9, cost: 25, opsBurden: 0, lockIn: 5, reliability: 9, aiReadiness: 0 },
  "firebase-auth":  { buildSpeed: 8, complexity: 2, scalability: 8, cost: 0,  opsBurden: 1, lockIn: 5, reliability: 8, aiReadiness: 0 },
  "supabase-auth":  { buildSpeed: 8, complexity: 2, scalability: 7, cost: 0,  opsBurden: 1, lockIn: 4, reliability: 7, aiReadiness: 0 },
  jwt:              { buildSpeed: 6, complexity: 4, scalability: 6, cost: 0,  opsBurden: 5, lockIn: 0, reliability: 5, aiReadiness: 0 },
  nextauth:         { buildSpeed: 7, complexity: 4, scalability: 6, cost: 0,  opsBurden: 4, lockIn: 2, reliability: 6, aiReadiness: 0 },
  cognito:          { buildSpeed: 5, complexity: 5, scalability: 9, cost: 15, opsBurden: 3, lockIn: 6, reliability: 9, aiReadiness: 0 },

  // ── CACHE ──
  "redis-cache":    { buildSpeed: 5, complexity: 3, scalability: 9, cost: 10, opsBurden: 3, lockIn: 1, reliability: 8, aiReadiness: 2 },
  memcached:        { buildSpeed: 5, complexity: 3, scalability: 8, cost: 8,  opsBurden: 3, lockIn: 1, reliability: 7, aiReadiness: 1 },
  "cloudflare-cdn": { buildSpeed: 8, complexity: 1, scalability: 10, cost: 20, opsBurden: 0, lockIn: 2, reliability: 10, aiReadiness: 0 },
  cloudfront:       { buildSpeed: 6, complexity: 3, scalability: 10, cost: 15, opsBurden: 2, lockIn: 5, reliability: 10, aiReadiness: 0 },
  varnish:          { buildSpeed: 4, complexity: 5, scalability: 8, cost: 0,  opsBurden: 6, lockIn: 1, reliability: 7, aiReadiness: 0 },

  // ── QUEUE ──
  rabbitmq:         { buildSpeed: 4, complexity: 6, scalability: 8, cost: 12, opsBurden: 6, lockIn: 2, reliability: 8, aiReadiness: 2 },
  kafka:            { buildSpeed: 3, complexity: 8, scalability: 10, cost: 50, opsBurden: 8, lockIn: 3, reliability: 9, aiReadiness: 3 },
  sqs:              { buildSpeed: 6, complexity: 3, scalability: 10, cost: 10, opsBurden: 1, lockIn: 6, reliability: 10, aiReadiness: 2 },
  "redis-pubsub":   { buildSpeed: 6, complexity: 3, scalability: 7, cost: 0,  opsBurden: 3, lockIn: 1, reliability: 6, aiReadiness: 1 },
  pubsub:           { buildSpeed: 6, complexity: 3, scalability: 10, cost: 15, opsBurden: 1, lockIn: 5, reliability: 9, aiReadiness: 2 },

  // ── STORAGE ──
  s3:               { buildSpeed: 6, complexity: 3, scalability: 10, cost: 5,  opsBurden: 2, lockIn: 3, reliability: 10, aiReadiness: 2 },
  gcs:              { buildSpeed: 6, complexity: 3, scalability: 10, cost: 5,  opsBurden: 2, lockIn: 4, reliability: 10, aiReadiness: 2 },
  "azure-blob":     { buildSpeed: 5, complexity: 3, scalability: 10, cost: 6,  opsBurden: 2, lockIn: 5, reliability: 10, aiReadiness: 2 },
  "cloudflare-r2":  { buildSpeed: 7, complexity: 2, scalability: 10, cost: 3,  opsBurden: 1, lockIn: 2, reliability: 9, aiReadiness: 2 },
  "supabase-storage": { buildSpeed: 9, complexity: 1, scalability: 7, cost: 0, opsBurden: 0, lockIn: 4, reliability: 7, aiReadiness: 2 },

  // ── CI/CD ──
  "github-actions": { buildSpeed: 8, complexity: 2, scalability: 8, cost: 0,  opsBurden: 2, lockIn: 3, reliability: 8, aiReadiness: 0 },
  "gitlab-ci":      { buildSpeed: 7, complexity: 3, scalability: 8, cost: 0,  opsBurden: 3, lockIn: 3, reliability: 8, aiReadiness: 0 },
  circleci:         { buildSpeed: 7, complexity: 3, scalability: 8, cost: 15, opsBurden: 2, lockIn: 3, reliability: 8, aiReadiness: 0 },
  jenkins:          { buildSpeed: 4, complexity: 7, scalability: 8, cost: 10, opsBurden: 7, lockIn: 1, reliability: 7, aiReadiness: 0 },
  "vercel-deploy":  { buildSpeed: 10, complexity: 1, scalability: 8, cost: 0, opsBurden: 0, lockIn: 4, reliability: 9, aiReadiness: 0 },

  // ── MONITORING ──
  sentry:           { buildSpeed: 9, complexity: 1, scalability: 8, cost: 26, opsBurden: 1, lockIn: 2, reliability: 9, aiReadiness: 0 },
  datadog:          { buildSpeed: 6, complexity: 4, scalability: 10, cost: 50, opsBurden: 3, lockIn: 4, reliability: 10, aiReadiness: 2 },
  newrelic:         { buildSpeed: 6, complexity: 4, scalability: 9, cost: 25, opsBurden: 3, lockIn: 4, reliability: 9, aiReadiness: 1 },
  prometheus:       { buildSpeed: 5, complexity: 5, scalability: 8, cost: 0,  opsBurden: 5, lockIn: 1, reliability: 8, aiReadiness: 0 },
  logrocket:        { buildSpeed: 8, complexity: 2, scalability: 7, cost: 99, opsBurden: 1, lockIn: 3, reliability: 7, aiReadiness: 0 },

  // ── SEARCH ──
  elasticsearch:    { buildSpeed: 4, complexity: 6, scalability: 9, cost: 45, opsBurden: 6, lockIn: 3, reliability: 8, aiReadiness: 5 },
  algolia:          { buildSpeed: 8, complexity: 2, scalability: 9, cost: 50, opsBurden: 1, lockIn: 5, reliability: 9, aiReadiness: 3 },
  meilisearch:      { buildSpeed: 7, complexity: 3, scalability: 7, cost: 0,  opsBurden: 3, lockIn: 2, reliability: 7, aiReadiness: 3 },
  typesense:        { buildSpeed: 7, complexity: 3, scalability: 7, cost: 0,  opsBurden: 3, lockIn: 2, reliability: 7, aiReadiness: 3 },
};

export function getProviderForComponent(type: string): string {
  const map: Record<string, string> = {
    vercel: "vercel", nextjs: "vercel", "vercel-deploy": "vercel",
    "aws-ec2": "aws", s3: "aws", sqs: "aws", amazondynamodb: "aws", cloudfront: "aws", cognito: "aws",
    "gcp-compute": "gcp", cloudrun: "gcp", pubsub: "gcp", gcs: "gcp",
    "azure-vm": "azure", "azure-blob": "azure",
    "cloudflare-cdn": "cloudflare", "cloudflare-r2": "cloudflare",
    supabase: "supabase", "supabase-auth": "supabase", "supabase-storage": "supabase",
    firebase: "google", "firebase-auth": "google",
    openai: "openai", anthropic: "anthropic",
    clerk: "clerk", auth0: "auth0",
    sentry: "sentry", datadog: "datadog", newrelic: "newrelic",
    mongodb: "mongodb",
  };
  return map[type] || "self-managed";
}

export function getLanguageForComponent(type: string): string | null {
  const map: Record<string, string> = {
    fastapi: "Python", django: "Python", flask: "Python",
    express: "TypeScript", nestjs: "TypeScript", nextjs: "TypeScript", nodejs: "TypeScript",
    go: "Go", spring: "Java",
  };
  return map[type] || null;
}
