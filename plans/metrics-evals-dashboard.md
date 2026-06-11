# Plan: Metrics & Evals Dashboard

> Source PRD: T4.3b metrics and evals dashboard UI ticket, Phase 4 Wave 3.

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: `/dashboard` remains the protected app route for signed-in users.
- **Schema**: dashboard data consumes mocked admin endpoint shapes for recent generations, recent whims, and eval runs.
- **Key models**: generation metric rows, whim metric rows, and eval run aggregate scores.
- **Auth**: route access stays behind the existing signed-in app layout; no additional role gate is added.
- **External services**: Cloud Trace links use `https://console.cloud.google.com/traces/list?project=trip-agent-498919&tid={traceId}`.
- **Integration boundary**: dashboard-owned API DTOs live outside shared trip/whim API internals so live integration is a configuration switch.

---

## Phase 1: Dashboard Data Contract + Mock Source

**User stories**: A signed-in user can open `/dashboard` and see observability data without waiting for backend 04-03a.

### What to build

Define the dashboard-owned data contract, mock data source, and live-ready fetch boundary. Keep the contract narrow and shaped exactly like the planned admin endpoints.

### Acceptance criteria

- [ ] Dashboard DTOs cover recent generations, recent whims, and eval runs.
- [ ] Mock data renders without backend availability.
- [ ] Live integration is isolated to the data source configuration.

---

## Phase 2: Recent Generations + Whims Comparison

**User stories**: A user can compare slow multi-agent generations against fast whim runs, including latency, tokens, cost, billing tier, status, started time, and trace links.

### What to build

Render recent generations and whims side by side with a shared latency visual scale, desktop tables, mobile cards, trace link-outs, and explicit loading, empty, error, and retry states.

### Acceptance criteria

- [ ] Generation and whim metric rows show the requested columns.
- [ ] Trace links open the expected Cloud Trace URL for each row.
- [ ] The latency contrast is visually evident on desktop and mobile.
- [ ] Loading, empty, error, and retry states are covered.

---

## Phase 3: Eval Runs History + Run Detail

**User stories**: A user can inspect eval score trends over time and click a run to see model, git SHA, timestamp, and rubric scores.

### What to build

Render compact score history for eval runs without adding a chart dependency. Let users select a run and inspect the FDE rubric aggregate details.

### Acceptance criteria

- [ ] Eval runs show schema validity, groundedness, constraint adherence, and suggested-flag honesty.
- [ ] Clicking a run updates the detail panel.
- [ ] Empty, loading, error, and retry states are covered.

---

## Phase 4: Dashboard QA + Integration Readiness

**User stories**: The dashboard has full state coverage, correct trace URLs, responsive behavior, and clean handoff for live backend integration.

### What to build

Add focused frontend tests and run the practical verification suite. Confirm touched files stay within dashboard ownership boundaries.

### Acceptance criteria

- [ ] Tests cover mock data rendering, loading, empty, error, retry, trace URLs, and eval selection.
- [ ] Lint and type checks pass or failures are documented.
- [ ] Responsive layout is inspected and polished.
- [ ] Git diff only includes dashboard-owned files and the approved plan.
