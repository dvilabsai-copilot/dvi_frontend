# Progress log

## Iteration 0 — inspection and baseline

### Baseline
- Tests/config inspected: `package.json`, Vite, TypeScript, ESLint, Vitest, Playwright, router, services, existing itinerary E2E files.
- Result: clean working tree; page has 19,604 physical lines and exports named/default `ItineraryDetails`.
- Relevant behavior: lazy router resolves named export first; HotelList imports page-exported row types.

### Changes
- Files created: required refactor documentation set.
- Files modified: none.
- Code moved: none.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: baseline fails on pre-existing errors; see regression log.
- Lint: baseline fails repository-wide (1,613 errors, 77 warnings).
- Unit tests: not run yet.
- Targeted Playwright: not run; local services/test auth are required.
- Full itinerary Playwright: not run.
- Production build: passes with existing warnings.
- Console/network check: pending live browser baseline.

### Line counts
- `ItineraryDetails.tsx` before: 19,604 physical lines.
- `ItineraryDetails.tsx` after: 19,604 (no source edit yet).
- Largest new file: documentation only.

### Notes
- Coupling discovered: page types are imported by `HotelList`; route lazy loading requires both exports; Fit Here and confirmation have the highest coupling.
- Follow-up extraction: Iteration 1 will move top-level declarations only.

## Iteration 1 — API/domain declarations and pure vehicle/hotel helpers

### Baseline
- Tests run: `npx tsc -p tsconfig.app.json --noEmit`, `npm run build`.
- Result: baseline build passed; typecheck had the documented unrelated repository errors.
- Relevant behavior: page-local type declarations and pure normalization functions had no React state or JSX dependencies.

### Changes
- Files created: `src/pages/itinerary-details/itinerary-details.types.ts`, `src/pages/itinerary-details/utils/domain.utils.ts`.
- Files modified: `src/pages/ItineraryDetails.tsx`.
- Code moved: API/domain response declarations, vehicle amount/cheapest selection, supplier-bookability, and meal-plan normalization.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetails.tsx` or the new modules; existing `ConfirmedItineraryDetails`/repository errors remain.
- Lint: not rerun; repository baseline is red as documented.
- Unit tests: not run; no existing helper tests for these functions.
- Targeted Playwright: not run; local services/auth required.
- Full itinerary Playwright: not run.
- Production build: passes with existing warnings.
- Console/network check: pending live browser baseline.

### Line counts
- `ItineraryDetails.tsx` before: 19,604.
- `ItineraryDetails.tsx` after: 19,327.
- Largest new source file: `itinerary-details.types.ts` (approximately 460 lines).

### Notes
- Coupling discovered: details request deduplication remains page-local for the next loader extraction; timeline/hotspot/confirmation state remains untouched.
- Follow-up extraction: module-level details request dedupe, then pure date/time/timeline helpers.

## Iteration 2 — Pure domain, hotspot, date/time, and timeline helpers

### Baseline
- Tests run: targeted TypeScript output filtered to the page/new modules; `npm run build`.
- Result: page/new-module baseline had no local errors; build passed.
- Relevant behavior: helper functions had no React state/JSX dependencies and were called by existing workflows.

### Changes
- Files created: `src/pages/itinerary-details/utils/timeline.utils.ts`.
- Files modified: `src/pages/ItineraryDetails.tsx`.
- Code moved: date/time/distance/duration, hotspot city/route filtering, preview policy, and timeline normalization helpers.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from the page or new utilities; existing repository error remains documented.
- Lint: not rerun; repository baseline remains red.
- Unit tests: not run; helper test coverage is a follow-up.
- Targeted Playwright: not run; local services/auth required.
- Full itinerary Playwright: not run.
- Production build: passes with existing warnings.
- Console/network check: pending live browser baseline.

### Line counts
- `ItineraryDetails.tsx` before: 19,327.
- `ItineraryDetails.tsx` after: 18,717.
- Largest new source file: `timeline.utils.ts` (approximately 640 lines; cohesive timeline/hotspot normalization boundary).

### Notes
- Coupling discovered: `normalizeConfirmedTimelineToSegments` needs attraction/segment types; hotspot filtering helpers are used by modal state but remain pure.
- Follow-up extraction: module-level details request dedupe and staged loader constants/controller.

## Iteration 3 — Details request deduplication

### Baseline
- Tests run: targeted TypeScript output; `npm run build`.
- Result: page/new-module baseline had no local errors; build passed.
- Relevant behavior: module-level in-flight quote map and StrictMode guard were independent of JSX.

### Changes
- Files created: `src/pages/itinerary-details/utils/details-dedupe.ts`.
- Files modified: `src/pages/ItineraryDetails.tsx`.
- Code moved: in-flight details map, `autoLoadStartedQuotes`, and `getDetailsDeduped`.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from the page or new utility; existing repository error remains documented.
- Production build: passes with existing warnings.
- Playwright: not run; local services/auth required.

### Line counts
- Before: 18,717; after: 18,704.
- Largest new source file: `timeline.utils.ts`.

### Notes
- Coupling discovered: dedupe utility still owns the same service call and promise cleanup semantics.
- Follow-up extraction: page loader component.

## Iteration 4 — Page loader component

### Baseline
- Tests run: targeted TypeScript output; `npm run build`.
- Result: page/new-module baseline had no local errors; build passed.
- Relevant behavior: only the loading branch JSX moved; parent conditions and state remain unchanged.

### Changes
- Files created: `src/pages/itinerary-details/components/ItineraryPageLoader.tsx`.
- Files modified: `src/pages/ItineraryDetails.tsx`.
- Code moved: staged loader card/progress history rendering.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from the page or new component; existing repository error remains documented.
- Production build: passes with existing warnings.
- Playwright: not run; local services/auth required.

### Line counts
- Before: 18,704; after: 18,666.
- Largest new source file: `timeline.utils.ts`.

### Notes
- Coupling discovered: loader visibility remains parent-owned, preventing a prop-drilling state rewrite.
- Follow-up extraction: error/empty state component, then timeline segments.

## Characterization run — local services

- `npx playwright test tests/e2e/itinerary-anchor-hotspot-smoke.spec.ts --project=chromium`: passed (1 test, 15.4s).
- `npx playwright test tests/e2e/itinerary-hotspot-modal-regression.spec.ts --project=chromium`: passed (1 test, 12.3s).
- These are the existing non-apply preview scenarios; no mutation cleanup was required.

## Iteration 5 — Error state and media dialogs

### Baseline
- Tests run: targeted TypeScript output; `npm run build`; two existing hotspot preview Playwright tests.
- Result: page/new-module type output clean; build passed; both Playwright tests passed.
- Relevant behavior: error state, gallery, and video dialogs are presentational wrappers around existing state/setters.

### Changes
- Files created: `components/ItineraryDetailsErrorState.tsx`, `components/MediaDialogs.tsx`.
- Files modified: `src/pages/ItineraryDetails.tsx`.
- Code moved: error/empty return branch, gallery dialog, and video dialog JSX.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from page/new components; existing repository error remains documented.
- Production build: passes with existing warnings.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Full itinerary Playwright: not run.
- Console/network check: targeted flows passed with no test failures; broad observer pending.

### Line counts
- Before: 18,666; after: 18,537.
- Largest new source file: `timeline.utils.ts`.

### Notes
- Coupling discovered: media state remains page-owned; component props preserve the original setter/reset behavior.
- Follow-up extraction: clipboard/source/share dialogs, then timeline segments.

## Iteration 6 — Source preview and share dialogs

### Baseline
- Tests run: targeted TypeScript output; `npm run build`; two existing hotspot preview Playwright tests.
- Result: first replacement exposed two stale opening JSX lines; those were removed after comparing the rendered source boundary. Final build and both Playwright tests passed.
- Relevant behavior: source Markdown and email-share dialogs were presentational wrappers around existing state and browser actions.

### Changes
- Files created: `components/ShareAndSourceDialogs.tsx`.
- Files modified: `src/pages/ItineraryDetails.tsx`.
- Code moved: source Markdown preview and share-via-email dialog JSX.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from page/new modules; existing repository error remains documented.
- Production build: passes with existing warnings.
- Targeted Playwright: 2 passed (hotspot preview/smoke).
- Full itinerary Playwright: not run.

### Line counts
- Before: 18,537; after: 18,447.
- Largest new source file: `timeline.utils.ts`.

### Notes
- Coupling discovered: share uses existing DOM IDs, `window.open`, and exact toast wording; all remain unchanged inside the extracted component.
- Follow-up extraction: clipboard dialog and all-hotspots preview, then timeline segments.

## Iteration 7 — Delete confirmation dialogs

### Baseline
- Tests run: targeted TypeScript output; `npm run build`; exact-anchor Fit Here smoke.
- Result: page/new-module type output clean; build passed; smoke passed.
- Relevant behavior: hotspot/activity/guide delete dialogs shared the same confirmation/loading structure while retaining workflow-specific callbacks and descriptions.

### Changes
- Files created: `components/DeleteConfirmationDialog.tsx`.
- Files modified: `src/pages/ItineraryDetails.tsx`.
- Code moved: three delete confirmation dialog shells; parent state/reset/callback behavior remains supplied through props.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from page/new components; existing repository error remains documented.
- Production build: passes with existing warnings.
- Targeted Playwright: exact-anchor smoke passed.
- Full itinerary Playwright: not run.

### Line counts
- Before: 18,447; after: 18,336.
- Largest new source file: `timeline.utils.ts`.

### Notes
- Coupling discovered: confirmation wording and reset payloads remain in the parent; the shared component only owns visual structure.
- Follow-up extraction: clipboard dialog/all-hotspots preview, then timeline/day rendering.

## Iteration 8 — Complete declaration boundary and loader constants

### Baseline
- Tests run: targeted TypeScript output; `npm run build`; exact-anchor smoke after declaration cleanup.
- Result: page/new-module type output clean; build passed; smoke passed.
- Relevant behavior: all active page domain types now come from the dedicated type module; loader stage text is a pure constant map.

### Changes
- Files created: `itinerary-details.constants.ts`.
- Files modified: `src/pages/ItineraryDetails.tsx`.
- Code moved: loader stage detail map and remaining active API/domain declarations (the original declaration block is no longer executable page code).
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from page/new modules; existing repository error remains documented.
- Production build: passes with existing warnings.
- Targeted Playwright: exact-anchor smoke passed.
- Full itinerary Playwright: not run.

### Line counts
- Before this iteration: 16,799; after: 16,772.
- Largest new source file: `timeline.utils.ts`.

### Notes
- Iteration 9: extracted `AllHotspotsPreviewDialog` as a presentational boundary, removed the duplicate legacy markup, and verified the replacement against both focused hotspot flows.
- Iteration 10: extracted `ClipboardDialog`; validation, backend clipboard retrieval, merge logic, toast text, and reset behavior remain in the page handler.
- Iteration 11: extracted the compact day header/guide summary into `ItineraryDayHeader`; route-time, guide, source, and hotspot callbacks remain passed through the page context.
- Iteration 12: extracted the segment/timeline renderer into `ItinerarySegments`; focused Fit Here and hotspot preview flows pass after the boundary move.
- Iteration 13: extracted `GuideAssignmentDialog`; guide state/save behavior remains controlled by the page handler and focused regressions pass.
- Iteration 14: extracted `AddActivityDialog`; activity preview/add behavior remains controlled by the page handler and focused regressions pass.
- Iteration 15: extracted `SpecialInstructionsSection`; build/type baseline and the focused Fit Here smoke pass.
- Iteration 16: extracted `PackageIncludesCard`; build/type baseline and the focused Fit Here smoke pass.
- Coupling discovered: `HotelList` continues to consume the named hotel/vehicle type exports from the page; those exports now need an explicit re-export boundary in a later cleanup.
- Follow-up extraction: clipboard/all-hotspots dialogs and timeline/day card components.

## Iteration 17 — Stable page composition boundary

### Baseline
- Tests run: `npm run build`; `npx playwright test tests/e2e/itinerary-anchor-hotspot-smoke.spec.ts tests/e2e/itinerary-hotspot-modal-regression.spec.ts --project=chromium`.
- Result: production build passed with existing warnings; both focused Playwright tests passed.
- Relevant behavior: the router resolves the historical named/default page exports and passes `readOnly`/`presentationMode` props.

### Changes
- Files created: `src/pages/ItineraryDetails.tsx` (stable entrypoint wrapper).
- Files modified: `src/pages/ItineraryDetailsRuntime.tsx` (implementation moved without code changes).
- Code moved: the existing page implementation now sits behind a small route/HMR-compatible composition boundary; the wrapper preserves named and default exports and the historical type re-exports.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: repository baseline errors remain in unrelated existing modules; no new errors from the page/runtime boundary.
- Lint: repository baseline remains failing; no lint-only changes made.
- Unit tests: no dedicated unit script configured.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: not run.
- Production build: passed with existing warnings.
- Console/network check: focused tests passed without new page/runtime failures.

### Line counts
- ItineraryDetails.tsx before: 16,772; after: 14.
- Largest new source file: `ItineraryDetailsRuntime.tsx` (16,772 lines; transitional staging module to be split by workflow in subsequent iterations).

### Notes
- Coupling discovered: router lazy loading relies on both exports, so the wrapper intentionally keeps both names stable.
- Follow-up extraction: split the transitional runtime into hotspot/Fit Here, hotel/vehicle, confirmation, and route/loading controllers and views; no further wrapper-only work is considered complete.
