# Plan: T3.6 Live Frontend Integration

> Source PRD: T3.6 frontend live integration brief in the Codex thread, checked against `docs/contracts/trip-journal-api.md`.

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: generation uses `POST /trips/{tripId}/generate`; independent category runs use `POST /trips/{tripId}/categories/{category}/generate`; manual plans use `GET|POST|PATCH|DELETE /trips/{tripId}/manual-plans`; whims use `POST /whims`.
- **Firestore listeners**: itinerary generation progress is read from `trips/{tripId}/generations/{generationId}`; category results are read from `trips/{tripId}/categoryResults/{category}`. The frontend reads these paths directly and never writes to Firestore.
- **Contract authority**: `docs/contracts/trip-journal-api.md` is the frontend source of truth. Live shape differences are treated as contract divergences and reported instead of silently adapted.
- **Key models**: `GenerationDoc`, `CategoryResult`, `TripItinerary`, `ItineraryStop`, `ManualPlan`, `WhimCreate`, and `WhimSuggestion` remain the stable integration models.
- **Auth**: every live API request uses the existing Firebase bearer-token API client; Firestore access relies on Firebase web SDK security rules.
- **External services**: Google Places/Routes and agent execution remain backend-owned. The frontend only triggers jobs, listens for backend-owned docs, and renders returned data.
- **Ownership**: this wave owns trip pages, generation UI, whim UI, the trip API client, and `lib/api/types.ts`. Dashboard files are out of scope.

---

## Phase 1: Contract Baseline And Live Shape Guard

**User stories**: frontend consumes the backend contract as source of truth; live response divergences are reported instead of silently adapted.

### What to build

Sync the backend API contract into the frontend repo, align frontend DTOs with the documented Firestore and API shapes, and make live listener shape problems visible in the UI. This establishes a hard baseline before browser testing against real backend data.

### Acceptance criteria

- [ ] The frontend repo contains the trip journal API contract used for this integration pass.
- [ ] Generation and category listener data is checked for contract-critical fields before rendering.
- [ ] Contract divergences surface as visible errors instead of partial itinerary/category rendering.
- [ ] Frontend types no longer encode tolerated variants that contradict the contract.

---

## Phase 2: Preferences And Category Agent Live Slice

**User stories**: saved preferences visibly reload; one category can generate independently; stale hint appears after preference edits; running one category does not trigger others.

### What to build

Make one independent category-agent panel fully live first, including start, running state, result listener, stale hint, error state, and listener cleanup. Then apply the same verified behavior to all five category panels.

### Acceptance criteria

- [ ] Preferences for claimed and unclaimed participants remain visible after browser refresh.
- [ ] Each category panel starts only its own category endpoint.
- [ ] Running one category does not change the other four panels except through their own existing listener data.
- [ ] A stale category result shows a rerun hint but does not block full itinerary generation.

---

## Phase 3: Manual Plans Live Slice

**User stories**: admin adds/edits/deletes morning/afternoon/evening plans; members can read plans; admin-only writes are enforced; plans feed itinerary expectations.

### What to build

Verify manual plans as live backend state on the trip page, including loading, empty, create, edit, delete, reload, and authorization behavior. Keep manual plans visible before generation so users can verify required context.

### Acceptance criteria

- [ ] Admins can create, update, and delete manual plans through live endpoints.
- [ ] Members can read manual plans but do not see write controls.
- [ ] Morning, afternoon, and evening plans render with category, date, address, and notes where present.
- [ ] Failed manual plan mutations show recoverable errors without losing local page context.

---

## Phase 4: Coordinator Generation Live Slice

**User stories**: Generate attaches to live `generationId`; double-click handles 409; six progress rows animate from Firestore; fresh category results render as reused; stale/missing categories are auto-run.

### What to build

Wire the coordinator generation button to the live generation endpoint and Firestore generation doc. Preserve the latest completed run, attach to in-flight runs on conflict, render all agent statuses from the live doc, and tune the stale guard for free-tier latency.

### Acceptance criteria

- [ ] `POST /trips/{tripId}/generate` starts a run and subscribes to the returned generation doc.
- [ ] A 409 response attaches to the in-flight generation instead of showing an error.
- [ ] The progress panel renders all five category agents plus the coordinator from live status transitions.
- [ ] `skipped_fresh` renders as reused, not rerun.
- [ ] The stale guard waits five minutes without an update before warning.
- [ ] The listener detaches after completion/error and on unmount.

---

## Phase 5: Itinerary Render And Regeneration Slice

**User stories**: real itinerary renders all stop fields; suggested badges match data; missing transport shows `Not available`; manual plans appear or warnings surface; regenerate swaps to a new doc.

### What to build

Render the live itinerary exactly from the generation doc, including day/block structure, stop fields, provenance badges, transport, metrics, manual plan warnings, and regenerate behavior.

### Acceptance criteria

- [ ] Every returned stop field with UI representation is visible.
- [ ] `suggested: true` is the only condition that shows the AI-suggested badge.
- [ ] Missing transport renders `Not available`.
- [ ] Manual plans appear in itinerary stops or in visible warning messages.
- [ ] Regenerate starts or attaches to a new live generation doc and swaps the rendered view.

---

## Phase 6: Right Now Live Whim Slice

**User stories**: trip-context whim uses `tripId`; browser geolocation path works; typed-city fallback works; reroll accumulates `excludePlaceIds`; five rerolls produce distinct venues.

### What to build

Use the synchronous live whim endpoint from the global and trip-page Right Now entry points. Verify geolocation, fallback city, trip context, loading/error/success states, Maps link, travelers tip, and reroll uniqueness.

### Acceptance criteria

- [ ] Browser geolocation submits `{lat,lng}` when available.
- [ ] Location denial or unavailable geolocation prompts for a city and submits `{city}`.
- [ ] Trip-page whims include the current trip id.
- [ ] Rerolls send accumulated `excludePlaceIds`.
- [ ] Five rerolls return five distinct places or expose a backend no-results error.

---

## Phase 7: End-To-End Two-Account Acceptance Pass

**User stories**: full product flow in browser with two accounts, including unclaimed participant preferences, category run, manual plan, generation, itinerary, Right Now, reroll, and console/listener leak checks.

### What to build

Run the complete live browser flow with two accounts and record any remaining contract divergences, backend failures, listener leaks, or unverified acceptance criteria.

### Acceptance criteria

- [ ] Two-account flow completes from preferences through itinerary.
- [ ] One admin-filled unclaimed participant is included in saved preferences and generation context.
- [ ] One independent category result is reused by full generation when fresh.
- [ ] Manual plans are included or visibly warned about.
- [ ] Right Now returns a trip-context venue and distinct rerolls.
- [ ] Repeated navigation does not produce console listener leak warnings.
- [ ] Completion summary lists all verified flows and any contract divergences.
