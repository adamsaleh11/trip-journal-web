import type {
  EvalRun,
  RecentGenerationMetric,
  RecentWhimMetric,
} from "@/lib/api/adminTypes";

const CLOUD_TRACE_PROJECT_ID = "trip-agent-498919";

export function buildCloudTraceUrl(traceId: string) {
  const params = new URLSearchParams({
    project: CLOUD_TRACE_PROJECT_ID,
    tid: traceId,
  });

  return `https://console.cloud.google.com/traces/list?${params.toString()}`;
}

export async function listRecentGenerations() {
  const { apiFetch } = await import("@/lib/api/client");
  return apiFetch<RecentGenerationMetric[]>("/admin/generations/recent");
}

export async function listRecentWhims() {
  const { apiFetch } = await import("@/lib/api/client");
  return apiFetch<RecentWhimMetric[]>("/admin/whims/recent");
}

export async function listEvalRuns() {
  const { apiFetch } = await import("@/lib/api/client");
  return apiFetch<EvalRun[]>("/admin/eval-runs");
}
