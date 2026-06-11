# Plan: Journal Anonymous Share UI

> Source PRD: T4.5 -- Journal & anonymous-share UI

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: use `POST /trips/{tripId}/complete`, `GET /trips/{tripId}/journal`, `PUT /trips/{tripId}/journal/{placeId}`, `POST /trips/{tripId}/journal/from-whim/{whimId}`, `GET /me/shares`, and `DELETE /me/shares/{opaqueId}`.
- **Schema**: journal cards are venue-centric and keyed by `placeId`; each response contains stop metadata plus nullable caller-owned `myEntry`.
- **Key models**: `Trip`, `JournalEntryView`, `JournalContribution`, `JournalContributionUpdate`, and `SharedTip`.
- **Auth**: complete-trip is admin-only; journal reads/writes are trip-member-only; shared-tip management is caller-owned.
- **External services**: PII scrub, embedding, memory storage, and deletion are backend-owned; the frontend only shows honest pending/success/error states.
- **Scope guard**: do not edit `/dashboard` files; keep implementation to trip detail, journal UI, API client/types, Right Now save action, shared tips management, and tests.

---

## Phase 1: Journal API Contract Integration

**User stories**: Frontend can call complete-trip, journal read/write, shared tips, delete share, and whim-to-journal routes using finalized backend DTOs.

### What to build

Wire typed API helpers to the finalized journal and share endpoints. Replace provisional journal-entry routes with the member-scoped journal route so later UI slices all use the same backend-confirmed contract.

### Acceptance criteria

- [ ] Complete-trip helper posts to `/trips/{tripId}/complete` and returns `Trip`.
- [ ] Journal helpers read and write `/trips/{tripId}/journal`.
- [ ] Shared tips helpers read `/me/shares` and delete `/me/shares/{opaqueId}`.
- [ ] Whim-to-journal helper posts to `/trips/{tripId}/journal/from-whim/{whimId}`.

---

## Phase 2: Complete Trip Opens The Journal

**User stories**: Admin completes a generated trip; completed status persists after reload; journal section appears; non-admins do not see the action.

### What to build

Add a generated-trip admin action in the trip header with confirmation. On success, reload the trip, members, and journal state from the backend and render completed trips with the journal as the primary section.

### Acceptance criteria

- [ ] Admins see Complete trip only when the trip is generated.
- [ ] Non-admins and planning trips do not show the action.
- [ ] Confirmation copy matches the privacy-sensitive product wording.
- [ ] Successful completion reloads backend state and displays the journal section.

---

## Phase 3: Private Journal Cards

**User stories**: Members can see completed-trip journal stubs, rate stops, write notes up to 1000 chars, save edits, and reload persisted entries.

### What to build

Render completed-trip journal entries as cards with stop metadata, rating, note editing, dirty state, validation, loading, empty, and error states. Persist only through explicit Save actions.

### Acceptance criteria

- [ ] Unrated stubs show empty stars, empty note, share off, and Private state.
- [ ] Filled cards rehydrate the caller's own saved contribution.
- [ ] Notes are limited to 1000 characters with visible count.
- [ ] Save success updates the card from the backend response.

---

## Phase 4: Anonymous Share Toggle And Privacy Copy

**User stories**: Members opt in/out per journal entry; sharing requires rating; state is visually honest; privacy explainer and what-gets-shared popover are present.

### What to build

Add the anonymous-share toggle, required privacy microcopy, share validation, backend-confirmed shared/private status, and share failure handling.

### Acceptance criteria

- [ ] Share toggle defaults off for new entries.
- [ ] Sharing requires a rating before save.
- [ ] Shared, private, saving, and failed states are distinct.
- [ ] Privacy copy accurately describes shared and never-shared fields.
- [ ] Unshare saves through the same journal endpoint and clears shared state after backend success.

---

## Phase 5: Shared Tips Management

**User stories**: User opens Shared tips from the profile menu, sees backend-confirmed shared entries, confirms delete, and deleted entries disappear after backend success.

### What to build

Add a profile-menu entry that opens a dialog with the caller's shared tips and per-entry delete confirmation. Refresh journal/share state after deletion where practical.

### Acceptance criteria

- [ ] Shared tips load from `/me/shares`.
- [ ] Empty, loading, error, and success states are handled.
- [ ] Delete requires confirmation.
- [ ] Deleted entries are removed only after `DELETE` succeeds.

---

## Phase 6: Whim To Journal

**User stories**: Trip-context Right Now suggestions show Save to journal, saved whims become private journal cards, global whims do not show the action, and 403 is handled.

### What to build

Enable Save to journal on trip-context Right Now suggestions. On success, mark the suggestion saved, prevent repeat saves, and notify the trip page to refresh journal entries.

### Acceptance criteria

- [ ] Save to journal appears only when Right Now is launched with a trip id.
- [ ] Saved whims are private by default.
- [ ] Repeat saves for the same active whim are disabled.
- [ ] 403 shows "You no longer have access to this trip."

---

## Phase 7: Frontend QA And Regression Coverage

**User stories**: Mobile, dark theme, loading/error/empty/saving states, API helper tests, trip page tests, journal card tests, shared tips tests, Right Now save tests, no `/dashboard` edits.

### What to build

Add focused tests and run the strongest practical verification for the changed frontend surfaces. Polish responsive layouts and edge states found during the QA pass.

### Acceptance criteria

- [ ] API helper contract tests cover all new routes.
- [ ] Trip page tests cover complete flow and journal render.
- [ ] Journal card tests cover private save, share, and unshare.
- [ ] Right Now tests cover trip-context save.
- [ ] Shared tips tests cover list and delete.
- [ ] Typecheck, lint, and focused tests pass or any blockers are documented.
