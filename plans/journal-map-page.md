# Plan: Journal Map Page

> Source PRD: T4.2 Journal map page, approved grill-me answers from 2026-06-10.

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: `/map` remains the personal journal map route inside the authenticated app shell.
- **Data scope**: The page requests the signed-in user's trips through the existing authenticated trips list API. No global, public, group-wide, destination-search, or geocoding endpoint is used by the map page.
- **Destination source**: Map points consume persisted Google Places-derived `destination.lat`, `destination.lng`, and `destination.placeId` fields from trips. Missing coordinates degrade to list-only rendering with a data-quality state.
- **Trip details**: The initial map load fetches the trip list only. Trip members, participants, preferences, itinerary, manual plans, and journal entries are loaded when a trip is selected.
- **Map provider**: Map provider setup, viewport fitting, heat glow, markers, clustering or offset behavior, fly-to, and teardown stay behind a small local adapter. Provider SDK code is lazy-loaded with client-only rendering.
- **Visual model**: All user trips can appear on the map; completed trips render brighter than planning/generated trips. The heat effect uses a warm amber/coral ramp matching the app palette.
- **Fallbacks**: Loading, empty, missing-coordinate, API error, and map-provider-failure states render intentionally. Provider failure falls back to the chronological journal list rather than a blank page.

---

## Phase 1: Personal Map Data Spine

**User stories**: As a signed-in user, I only see my own trips on `/map`; trips with persisted Google Places destination coordinates appear as map-ready points; trips missing coordinates degrade intentionally.

### What to build

Create the testable data normalization path that turns authenticated trip list responses into map-ready points, list-only trips, initial viewport inputs, and status-aware marker metadata.

### Acceptance criteria

- [ ] `/map` uses the authenticated trips list and does not call destination search or geocoding.
- [ ] Trips with finite `destination.lat` and `destination.lng` become map points while preserving `destination.placeId`.
- [ ] Trips without coordinates remain visible in list-only and data-quality states.

---

## Phase 2: Lazy MapCN Adapter + Baseline Map

**User stories**: As a user, I see a dark full-bleed journal map that fits my trips; provider setup is isolated; MapCN/map SDK code is lazy-loaded only on `/map`; provider failure falls back to a usable list.

### What to build

Wrap the existing map capability in a local journal-map adapter that accepts normalized points and emits selection events. Keep provider setup and environment-derived style configuration out of the page component.

### Acceptance criteria

- [ ] Map code is loaded through a client-only dynamic import.
- [ ] Initial viewport fits coordinate-backed trips and handles the one-trip case.
- [ ] Map provider errors switch the page to a fallback journal list using the same trip data.

---

## Phase 3: Heat Glow, Waypoints, And Clustering

**User stories**: As a user, my trips render as warm glowing heatmap-backed waypoints; completed trips read brighter than planning trips; nearby trips remain selectable through clustering or deterministic offset.

### What to build

Render a heatmap-style glow layer and custom selectable waypoints over the dark map. Use deterministic weights and offsets so visual tuning is testable without loading the provider.

### Acceptance criteria

- [ ] Heat and marker config are produced by pure functions.
- [ ] Completed trips have stronger glow and brighter markers than planning/generated trips.
- [ ] Trips with near-identical coordinates remain individually selectable.

---

## Phase 4: Trip Selection And Memory Sheet

**User stories**: As a user, clicking/tapping a waypoint flies to the destination and opens a desktop side sheet or mobile bottom sheet with trip dates, members, compact itinerary stops, participant wants, and manual plans.

### What to build

Add a shared trip memory sheet loaded on selection. Fetch detail data only for the selected trip, keep itinerary stops, participant preferences, and admin manual plans visually separate, and reuse compact trip detail presentation where available.

### Acceptance criteria

- [ ] Selecting a marker or list card opens the same sheet and requests only that trip's detail data.
- [ ] Participant wants are grouped per participant, including claimed and unclaimed participants.
- [ ] Admin manual plans render in a separate compact section and are not mixed with preferences.

---

## Phase 5: Journal List Toggle And Edge States

**User stories**: As a user, I can switch between map and chronological journal list using the same data and sheet; loading, empty, missing-coordinate, error, and mobile states feel designed instead of incidental.

### What to build

Add the journal list mode, responsive controls, polished skeletons, empty CTA, API retry, missing-coordinate notice, and mobile sheet layout.

### Acceptance criteria

- [ ] Map/list toggle preserves selected trip behavior and uses shared data.
- [ ] Empty, loading, error, missing-coordinate, and provider-failure states are all visible and actionable.
- [ ] The layout is usable at 375px without clipped text or overlapping controls.

---

## Phase 6: Verification And Bundle Sanity

**User stories**: As a maintainer, I have tests proving user-scoped API usage, no destination geocoding/search calls, correct coordinate consumption, pure map config behavior, sheet data separation, and lazy map loading.

### What to build

Add focused tests and run the frontend QA pass, including type checking, linting, and local browser inspection where practical.

### Acceptance criteria

- [ ] Tests cover map point normalization, heat/marker tuning, detail sheet data separation, and endpoint usage.
- [ ] Typecheck, lint, and focused tests pass.
- [ ] Visual QA confirms desktop and 375px mobile states.
