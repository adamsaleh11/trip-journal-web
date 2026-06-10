# Plan: Right Now UI

> Source PRD: T3.5 "Right Now" UI from `../trip-planner-agent/tickets/phase-03/03-05-right-now-ui.md`.

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: No new route. A global authenticated launcher opens one modal from the protected app shell; the trip detail page opens the same modal with trip context.
- **Schema**: `POST /whims` accepts `{ whimText, location: {lat, lng} | {city}, tripId?, excludePlaceIds? }` and returns `{ whimId, suggestion }`.
- **Key models**: `WhimCreate`, `WhimCreated`, and `WhimSuggestion` mirror the backend contract.
- **Auth**: Use the existing authenticated API client so Firebase bearer tokens are attached consistently.
- **External services**: Browser Geolocation API for lat/lng; Google Maps link-out via the backend-provided `mapsUri`.
- **Session state**: Reroll history and `excludePlaceIds` live in the modal session and reset when the modal opens.
- **Deferred behavior**: "Save to journal" remains hidden until T4.1 ships the whim-to-journal endpoint.

---

## Phase 1: Global Right Now Shell

**User stories**: Open Right Now from anywhere; open from the trip page with trip context.

### What to build

Add a global provider under the authenticated shell, a shell-level launcher, and a trip-page card that opens the same modal with `tripId`.

### Acceptance criteria

- [ ] The launcher is visible from every authenticated page.
- [ ] The trip detail card opens the same modal and passes `tripId`.
- [ ] The feature is reachable in no more than two interactions.

---

## Phase 2: Whim Request Contract And Location Flow

**User stories**: Empty submit allowed; use real geolocation; handle denied geolocation with remembered city.

### What to build

Add typed whim API models and a `POST /whims` client. On submit, request browser location first; if unavailable, collect a city and remember it locally.

### Acceptance criteria

- [ ] Empty submit sends `whimText: ""`.
- [ ] Geolocation success sends `{ lat, lng }`.
- [ ] Denied geolocation shows city input and sends `{ city }`.
- [ ] Remembered city is reused on later opens.

---

## Phase 3: Suggestion Result And Slot-Machine Interaction

**User stories**: Show a playful loading state; render one suggestion card; show tips, hours, Maps, and recoverable errors.

### What to build

Render a compact loading animation, suggestion card, travelers tip styling, Maps link-out, no-results state, and retryable API failure state.

### Acceptance criteria

- [ ] Suggestion card shows place name, category icon, address, hours badge, whyThis, and Maps action.
- [ ] `travelersTip` renders distinctly when present.
- [ ] No-results, API failure, and location fallback are styled and recoverable.

---

## Phase 4: Reroll And Session History

**User stories**: Another one excludes previous places; history restores a rejected suggestion.

### What to build

Accumulate shown `placeId`s into `excludePlaceIds`, cap at 20, move rejected suggestions into a session history strip, and restore previous suggestions from that strip.

### Acceptance criteria

- [ ] Reroll sends accumulated `excludePlaceIds`.
- [ ] The exclusion list is capped at 20 place IDs.
- [ ] Tapping a previous suggestion restores it as the active card.

---

## Phase 5: Responsive QA And Polish

**User stories**: Mobile 375px QA; no console errors; all states are usable.

### What to build

Run focused tests, typecheck, lint, and local browser inspection. Polish mobile layout, focus behavior, long text, double submit protection, and visual consistency.

### Acceptance criteria

- [ ] Focused tests cover success, tip-present, no-results/API failure, geo-denied, tripId, and reroll exclusions.
- [ ] Typecheck and lint pass.
- [ ] The modal works cleanly at 375px and desktop widths.
