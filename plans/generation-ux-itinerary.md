# Plan: T3.3 — Generation UX (live agent progress + itinerary view)

> Source PRD: `../trip-planner-agent/plans/trip-journal-pivot.md` Phase 3 / ticket `03-03`. Backend contract: `../trip-planner-agent/docs/contracts/trip-journal-api.md` §3.9–§3.10, §5.2. Generation/manual-plans shapes from T3.2/T3.4.

## Architectural decisions

Durable decisions resolved during the grill-me session; apply across all phases:

- **Routes**: everything stays on `/trips/[id]` (`app/(app)/trips/[id]/page.tsx`). No new routes, no modal/overlay. A single inline `GenerationSection` swaps Generate button → progress panel → itinerary by the live doc `status`.
- **Itinerary retrieval after reload**: client-side Firestore query on `trips/{id}/generations` ordered by `startedAt desc, limit 1` — the authoritative state source. No dependency on the undocumented `latestGenerationId`; do **not** use the phantom `/trips/{id}/itinerary` REST endpoint (delete `getTripItinerary`).
- **Realtime reads**: Firebase web SDK `onSnapshot`, wrapped in an injectable `useGenerationDoc` hook so tests pass mock docs directly. No runtime mock-mode in shipped code. One progress listener per open view; detach 5s after `complete`/`error`, holding the last snapshot in state for the itinerary.
- **Category panel listeners**: lazy — one-time `getDoc` on mount, live `onSnapshot` only after the user runs the agent or a result already exists.
- **Layout**: planning phase keeps current order with Generate at the bottom; once a completed itinerary exists it becomes the hero under the trip header and planning tools collapse into a "Planning details" area.
- **Key data shapes** (already in `lib/api/types.ts`): `GenerationDoc`, `CategoryResult`, `TripItinerary`/`ItineraryDay`/`ItineraryBlock`/`ItineraryStop`, `ManualPlan`. Categories fixed: `food_drink, outdoors_scenic, nightlife, culture_local, logistics`.
- **Auth**: any member can generate; manual plans are admin-only create/edit/delete, member read-only. Member/admin derived from `listMembers` + `user.uid`.
- **External services**: none new. Backend via existing `apiFetch` client (`generateItinerary`, `generateCategory`, manual-plans CRUD, preference reads); Firestore via `lib/firebase.ts` `db`.
- **409 attach**: `POST /trips/{id}/generate` returning 409 carries the running `generationId`; read defensively from `ApiError.body` (`body.generationId ?? body.detail?.generationId`) and attach instead of erroring.
- **Preflight freshness**: hedged language ("likely reused" / "will run") from each category result's existence + `stale` flag — the backend makes the real `skipped_fresh` call.
- **Testing**: vitest + Testing Library (jsdom). Fixtures walk mock docs through pending/running/done/error/stale. Mock `firebase/firestore` `onSnapshot`/`getDoc` in tests.

---

## Phase 1: Saved-preference visibility (Wave 2 fix)

**User stories**: Saved preferences are visible after reload/return for every participant/category; form state, summary chips, and completion matrix agree; unclaimed participants included.

### What to build

Render a compact read summary (key enum values as chips + truncated free-text preview) on each category card in the selected-participant grid, derived from already-loaded `groupPreferences`. After save, update local UI immediately then revalidate from the backend so the matrix and the card agree. Remove the disabled "Generate Itinerary (Coming Soon)" placeholder in `PreferencesSection`.

### Acceptance criteria

- [ ] After saving a category and reloading, the saved values are visible as chips on that participant's category card (not a blank/dot-only state).
- [ ] Completion matrix, card summary, and the edit form show the same filled/empty truth.
- [ ] Unclaimed admin-created participants show their saved/empty summaries in the same flow.
- [ ] The "Coming Soon" placeholder is gone.
- [ ] Tests cover: filled category renders chips + free-text preview; empty category renders the AI-fill hint; save updates summary without a full reload.

---

## Phase 2: Independent per-category agent panels

**User stories**: Every category has its own visible panel + independent Generate; per-category listeners render candidates and stale hints independently; full itinerary generation is not the only way to see recommendations.

### What to build

Complete `CategoryAgentPanel`: lazy listener (one-time `getDoc` on mount, `onSnapshot` only after run or when a result exists); candidate rows showing venue/name, address, time-of-day fit, price level, why-it-fits, travelers-tip, and `AI-suggested` only when `suggested: true`; status, stale hint ("preferences changed since this ran"), error state, and metrics summary. Running one category must not start any other.

### Acceptance criteria

- [ ] Each of the five categories renders its own panel with an independent Run/Re-run button calling `POST /trips/{id}/categories/{category}/generate`.
- [ ] Running Food & Drink does not run Nightlife/Culture/Logistics/etc.
- [ ] Candidate rows render every field; `AI-suggested` appears only when `suggested: true`.
- [ ] Stale hint, error state, and metrics summary render per-category from the result doc.
- [ ] No persistent listener on a never-run category with no existing result (lazy verified in tests).
- [ ] 409 on run shows an "already running" hint, not an error.

---

## Phase 3: Manual plans guided UI

**User stories**: Admin can add/edit/delete manual plans with guided category/activity/time-of-day fields; non-admins read but cannot edit.

### What to build

Finish `ManualPlansSection`/dialog: time-of-day as a segmented control (toggle group), category select, required activity; optional date validated within the trip range, address, notes. Read from `GET /trips/{id}/manual-plans`; create/edit/delete via the T3.4 endpoints. Non-admin members see the list but get no add/edit/delete affordances.

### Acceptance criteria

- [ ] Admin can create, edit, and delete a manual plan with guided category/activity/time-of-day (segmented control).
- [ ] Date input rejects dates outside the trip's start/end range.
- [ ] Non-admin members see manual plans read-only (no Add/Edit/Delete controls).
- [ ] Required-field validation blocks submit until category + activity + time-of-day are set.
- [ ] Tests cover admin CRUD happy paths, non-admin read-only, and date-range validation.

---

## Phase 4: Generation progress panel (mock-first)

**User stories**: With a mocked doc walked through its states, the panel animates correctly through all six agents including the error path; stale guard.

### What to build

`useGenerationDoc(tripId, genId)` wrapping `onSnapshot` (injectable for tests). Progress panel: six named, icon'd rows (5 category agents + coordinator) animating pending → running (pulse) → done (check) → error, plus `skipped_fresh`/`fallback` "reused" markers; phase label ("Researching food & drink…"). Error state shows a readable message + Retry. Stale guard: wall-clock timer reset on each snapshot; >3min while still `running` → soft warning + retry. Listener detaches 5s after `complete`/`error`. Built entirely against hand-written fixture docs.

### Acceptance criteria

- [ ] Driven by a fixture walked pending→running→done, all six rows animate to their correct states.
- [ ] Error fixture renders a readable message + working Retry.
- [ ] `skipped_fresh`/`fallback` render as instantly-done with a "reused" marker.
- [ ] Stale fixture (no update >3min while running) shows the soft warning + retry.
- [ ] Listener detaches ~5s after completion (verified via mock unsubscribe).

---

## Phase 5: Itinerary view (mock-first)

**User stories**: Itinerary renders every stop field; suggested badges appear exactly where the data says; empty transport renders "Not available"; metrics footer; regenerate action.

### What to build

Itinerary view from a fixture `TripItinerary`: day sections ("Day 1 — Mon, Jul 6") → Morning/Afternoon/Evening blocks → stop cards (time, venue name, address, category icon, transport chip with mode + duration or "Not available", why-it-fits, AI-suggested badge on `suggested: true`). `manualPlanWarnings` banner. Subtle metrics footer ("generated in Xs · ~N tokens"). Regenerate button with confirmation ("replaces current itinerary; previous runs kept").

### Acceptance criteria

- [ ] Every stop field renders; long venue names truncate gracefully.
- [ ] AI-suggested badge appears exactly on stops with `suggested: true` and nowhere else.
- [ ] Empty/absent transport renders "Not available", never blank.
- [ ] Metrics footer renders from `metrics` (seconds from `latencyMs`, ~tokens from `totalTokens`).
- [ ] `manualPlanWarnings` render as a visible banner when present.
- [ ] Regenerate shows the confirmation copy before firing.

---

## Phase 6: Generate flow wiring + reload + layout (live integration point)

**User stories**: Generate confirmation lists participants (claimed + unclaimed) and empty categories, manual plans separately, and a reuse preview; any member can generate; 409 attaches to the in-flight run; live transitions without refresh; regenerate swaps to the new itinerary on completion.

### What to build

Assemble `GenerationSection` on `/trips/[id]`. Preflight confirmation dialog: all participants (claimed + unclaimed, "Mom — filled by Adam"), which categories are empty per `/preferences/status`, manual plans listed separately as mandatory context, hedged reuse preview from category-result freshness. POST `generate` → inline progress (attach `useGenerationDoc`); 409 → read running `generationId` from `ApiError.body` and attach. On reload, query newest gen doc to restore running/complete/none state. Itinerary-to-hero layout once complete; planning tools collapse. Regenerate → swap to progress → new itinerary on completion.

### Acceptance criteria

- [ ] Confirmation names participants/travelers (not only authenticated members), includes unclaimed travelers, and lists manual plans separately from preferences.
- [ ] Any member can generate; POST navigates to the inline progress view.
- [ ] Double-clicking Generate (409) attaches to the in-flight run instead of erroring.
- [ ] Reloading mid-run restores the live progress; reloading after completion shows the itinerary as hero.
- [ ] Regenerate produces a new run and the view swaps to the new itinerary on completion.
- [ ] Live integration: a real generate shows real-time transitions without refresh.

---

## Phase 7: QA & polish pass

**User stories**: QA pass — mobile widths, truncation, no listener leaks.

### What to build

Responsive sweep of progress panel + itinerary at mobile width; long venue-name truncation; verify no listener leaks via repeated mount/unmount (category panels, progress, reload query); confirm one progress listener per open view and the +5s detach. Live integration sanity when T3.2 lands.

### Acceptance criteria

- [ ] Progress panel and itinerary are usable and uncramped at mobile width.
- [ ] Long venue/activity names truncate gracefully everywhere.
- [ ] Repeated mount/unmount leaves no active Firestore listeners (verified).
- [ ] Exactly one progress listener per open progress view; detaches +5s after completion.
