export type AdminMetricStatus = string;

export type RecentGenerationMetric = {
  tripId: string;
  tripName: string;
  status: AdminMetricStatus;
  latencyMs: number;
  totalTokens: number;
  tokensPerSecond: number;
  estCostUsd: number;
  billingTier: string;
  traceId: string;
  startedAt: string;
};

export type RecentWhimMetric = {
  whimId: string;
  whimText: string;
  latencyMs: number;
  totalTokens: number;
  tokensPerSecond: number;
  estCostUsd: number;
  billingTier: string;
  traceId: string;
  createdAt: string;
};

export type EvalRunAggregates = {
  schemaValidity: number;
  groundedness: number;
  constraintAdherence: number;
  suggestedFlagHonesty: number;
};

export type EvalRun = {
  runId: string;
  timestamp: string;
  model: string;
  gitSha: string;
  aggregates: EvalRunAggregates;
};
