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

## Iteration 18 — Header and trip-summary view

### Baseline
- Tests run: `npm run build`; focused hotspot Playwright pair.
- Result: baseline build passed with existing warnings; both focused flows passed before and after the extraction.
- Relevant behavior: route tabs, itinerary title/actions, confirmed-quote document actions, hotel rebuild action, passenger summary, and overall-trip-cost display remain connected to the same handlers and state.

### Changes
- Files created: `src/pages/itinerary-details/components/ItineraryHeader.tsx`.
- Files modified: `src/pages/ItineraryDetailsRuntime.tsx`.
- Code moved: the sticky header card and responsive trip summary now render in a focused component with typed props. The runtime retains all state, callbacks, and business rules.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsRuntime`, `ItineraryHeader`, or the stable page entrypoint; existing repository errors remain documented.
- Lint: repository baseline remains failing; no lint-only changes made.
- Unit tests: no dedicated unit script configured.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: not run.
- Production build: passed with existing warnings.
- Console/network check: focused flows passed without new page/runtime failures.

### Line counts
- ItineraryDetailsRuntime.tsx before: 16,772; after: 16,565.
- Stable `ItineraryDetails.tsx`: 14 lines.
- Largest new source file: `ItineraryHeader.tsx` (293 lines).

### Notes
- Coupling discovered: the header depends on route switching, confirmed-document actions, hotel rebuild state, and summary calculations; these remain explicit typed inputs rather than moving business logic into the view.
- Follow-up extraction: remove the remaining transitional dead compatibility fragment, then split hotspot/Fit Here state and preview UI into domain controllers/components.

## Iteration 19 — Hotspot and Fit Here state boundary

### Baseline
- Tests run: repository typecheck output filtered to page/new modules; `npm run build`; focused hotspot Playwright pair.
- Result: no page/new-module type errors; build passed with existing warnings; both focused flows passed before and after extraction.
- Relevant behavior: hotspot modal, preview, priority replacement, manual Fit Here, automatic Fit Here, matrix, and scroll state retain their existing initial values and setters.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useHotspotState.ts`.
- Files modified: `src/pages/ItineraryDetailsRuntime.tsx`.
- Code moved: the hotspot/Fit Here state and scrolling/request refs now live in a dedicated React state hook. Existing handlers and derived calculations consume the same named values through the hook return object.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from the runtime, hotspot state hook, or stable page entrypoint; existing repository errors remain documented.
- Lint: repository baseline remains failing; no lint-only changes made.
- Unit tests: no dedicated unit script configured.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: not run.
- Production build: passed with existing warnings.
- Console/network check: focused flows passed without new page/runtime failures.

### Line counts
- ItineraryDetailsRuntime.tsx before: 16,565; after: 16,492.
- Stable `ItineraryDetails.tsx`: 14 lines.
- Largest new source file: `useHotspotState.ts` (91 lines).

### Notes
- Coupling discovered: preview payloads remain intentionally untyped in the existing implementation because backend response variants are consumed throughout the page; the extraction preserved those shapes rather than reinterpret them.
- Follow-up extraction: move hotspot preview/Fit Here actions and their large modal view into focused controllers/components.

## Iteration 20 — Route/loading state boundary

### Baseline
- Tests run: repository typecheck output filtered to page/new modules; `npm run build`; focused hotspot Playwright pair.
- Result: no page/new-module type errors; build passed with existing warnings; both focused flows passed after the extraction.
- Relevant behavior: initial itinerary/hotel loading, loader stages/history, route option hydration, route hotel caches, source-preview state, and vehicle-build state keep their existing defaults and refs.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useItineraryRouteState.ts`.
- Files modified: `src/pages/ItineraryDetailsRuntime.tsx`.
- Code moved: route/loading state, route-option local-storage hydration, hotel-cache refs, source-preview state, and vehicle-build state now originate from a dedicated hook; derived read-only/presentation flags remain in the runtime because they depend on page props.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from the runtime, route state hook, or stable page entrypoint; existing repository errors remain documented.
- Lint: repository baseline remains failing; no lint-only changes made.
- Unit tests: no dedicated unit script configured.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: not run.
- Production build: passed with existing warnings.
- Console/network check: focused flows passed without new page/runtime failures.

### Line counts
- ItineraryDetailsRuntime.tsx before: 16,492; after: 16,436.
- Stable `ItineraryDetails.tsx`: 14 lines.
- Largest new source file: `useItineraryRouteState.ts` (60 lines).

### Notes
- Coupling discovered: source preview and route-switch handlers still intentionally own their API sequencing in the runtime; this iteration moved state ownership only.
- Follow-up extraction: route-switch/loading actions and hotel/vehicle controllers.

## Iteration 21 — Quotation state boundary

### Baseline
- Tests run: repository typecheck output filtered to page/new modules; `npm run build`; focused hotspot Playwright pair.
- Result: no page/new-module type errors; build passed with existing warnings; both focused flows passed after extraction.
- Relevant behavior: quotation confirmation, wallet top-up, document modal, guest/passenger form, prebook, and acceptance state retain their existing defaults and setter semantics.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useQuotationState.ts`.
- Files modified: `src/pages/ItineraryDetailsRuntime.tsx`.
- Code moved: quotation-confirmation modal state, wallet state, guest/passenger form state, agent state, prebook state, and confirmation review state now originate from a dedicated hook. Existing validation, payload construction, and submission handlers remain in the runtime.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from the runtime, quotation state hook, or stable page entrypoint; existing repository errors remain documented.
- Lint: repository baseline remains failing; no lint-only changes made.
- Unit tests: no dedicated unit script configured.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: not run.
- Production build: passed with existing warnings.
- Console/network check: focused flows passed without new page/runtime failures.

### Line counts
- ItineraryDetailsRuntime.tsx before: 16,436; after: 16,389.
- Stable `ItineraryDetails.tsx`: 14 lines.
- Largest new source file: `useQuotationState.ts` (62 lines).

### Notes
- Coupling discovered: confirmation derived totals and API submission remain in the runtime so request payload and validation semantics are unchanged.
- Follow-up extraction: hotel/vehicle state and the large quotation review view.

## Iteration 22 — Hotel selection state boundary

### Baseline
- Tests run: repository typecheck output filtered to page/new modules; `npm run build`; focused hotspot Playwright pair.
- Result: no page/new-module type errors; build passed with existing warnings; both focused flows passed after extraction.
- Relevant behavior: selected hotel bookings, clipboard hotel selection, active hotel group/totals, selected vehicle totals, cost popover, sticky/list refs, and hotel pagination retain their existing state shapes and defaults.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useHotelSelectionState.ts`.
- Files modified: `src/pages/ItineraryDetailsRuntime.tsx`.
- Code moved: multi-provider hotel selection state, vehicle totals state, hotel summary refs, and pagination state now originate from a dedicated state hook. Hotel calculations and API handlers remain in the runtime.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from the runtime, hotel selection hook, or stable page entrypoint; existing repository errors remain documented.
- Lint: repository baseline remains failing; no lint-only changes made.
- Unit tests: no dedicated unit script configured.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: not run.
- Production build: passed with existing warnings.
- Console/network check: focused flows passed without new page/runtime failures.

### Line counts
- ItineraryDetailsRuntime.tsx before: 16,389; after: 16,345.
- Stable `ItineraryDetails.tsx`: 14 lines.
- Largest new source file: `useHotelSelectionState.ts` (62 lines).

### Notes
- Coupling discovered: hotel pricing and supplier/provider normalization remain in existing runtime calculations; only state ownership moved.
- Follow-up extraction: remaining hotel search/arrival/room-selection state and vehicle workflow state.

## Iteration 24 — Architecture checkpoint documentation

### Baseline
- Tests run: documentation-only checkpoint after the green Iteration 23 build/typecheck/focused Playwright verification.
- Result: working tree was clean before documentation changes; no application behavior was changed.

### Changes
- Files created: none.
- Files modified: `ARCHITECTURE_MAP.md`, `PROGRESS_LOG.md`.
- Code moved: none; documented the stable 14-line router entrypoint, transitional runtime, extracted controllers/state hooks, and remaining high-risk boundaries.
- Behaviour intentionally changed: No.

### Verification
- Typecheck/build/Playwright: unchanged from Iteration 23; all passed with existing repository warnings/errors documented above.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsRuntime.tsx`: 16,325 lines.

### Notes
- This is a documentation checkpoint only; the refactor is not complete until the transitional runtime is split into domain controllers/views and the full verification suite is green.

## Iteration 23 — Media/share/clipboard state boundary

### Baseline
- Tests run: repository typecheck output filtered to page/new modules; `npm run build`; focused hotspot Playwright pair.
- Result: no page/new-module type errors; build passed with existing warnings; both focused flows passed after extraction.
- Relevant behavior: gallery/video dialogs, clipboard/share dialogs, clipboard type, and rates-visibility state retain their existing defaults and setter semantics.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useMediaShareState.ts`.
- Files modified: `src/pages/ItineraryDetailsRuntime.tsx`.
- Code moved: media, clipboard, and share modal state now originates from a dedicated hook; generation, API, and toast handlers remain unchanged in the runtime.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from the runtime, media/share state hook, or stable page entrypoint; existing repository errors remain documented.
- Lint: repository baseline remains failing; no lint-only changes made.
- Unit tests: no dedicated unit script configured.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: not run.
- Production build: passed with existing warnings.
- Console/network check: focused flows passed without new page/runtime failures.

### Line counts
- ItineraryDetailsRuntime.tsx before: 16,345; after: 16,325.
- Stable `ItineraryDetails.tsx`: 14 lines.
- Largest new source file: `useMediaShareState.ts` (18 lines).

### Notes
- Coupling discovered: clipboard generation still depends on hotel selections and vehicle-only branches in the runtime; this extraction intentionally moved state only.
- Follow-up extraction: remaining hotel search/arrival/room-selection state and vehicle workflow state.
