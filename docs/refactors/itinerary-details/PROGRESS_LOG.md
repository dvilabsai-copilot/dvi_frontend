# Progress log

## Iteration 51 — Para recommendations hook

### Baseline
- Starting point: Iteration 50 lint baseline documentation was committed; build, filtered typecheck, and focused Playwright pair were green.
- Scope: extract recommendation-group hotel derivation used by para/clipboard views.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useParaRecommendations.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: group bucketing, route ordering, cheapest-row selection, and four-tab recommendation shaping now live in the hook.
- Behaviour intentionally changed: No. Existing group ordering, cheapest comparison, labels, and slice limit are preserved.

### Verification
- Typecheck: no diagnostics from the controller, runtime, or new hook; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Production build: passed with existing warnings.
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Composition `ItineraryDetailsRuntime.tsx`: 11 lines.
- Transitional `ItineraryDetailsController.tsx`: 13,824 lines.
- New `useParaRecommendations.ts`: 27 lines.

### Notes
- Clipboard generation still depends on the controller's hotel selections and vehicle-only branches; those remain high-coupling follow-up boundaries.

## Iteration 50 — Lint baseline rerun

### Baseline
- Starting point: Iteration 49 summary values extraction was committed; build, filtered typecheck, and focused Playwright pair were green.
- Scope: rerun repository lint and record the current baseline count.

### Changes
- Files modified: `REGRESSION_LOG.md`, `FINAL_REPORT.md`, `PROGRESS_LOG.md`.
- Code moved: none; verification/documentation checkpoint only.
- Behaviour intentionally changed: No.

### Verification
- Lint: failed with 1,925 errors and 110 warnings across the repository.
- Targeted Playwright: focused pair remains 2 passed.
- Production build: passed with existing warnings.
- Filtered page/new-module typecheck: no new diagnostics.

### Notes
- Completion criteria remain open: the transitional controller is still 13,852 lines, repository lint is red, and broader E2E failures remain environment/data dependent.

## Iteration 49 — Itinerary summary values hook

### Baseline
- Starting point: Iteration 48 documentation facts were current and the branch was clean; previous focused/build/typecheck verification was green.
- Scope: extract the small header summary formatting and special-instruction fallback lookup.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useItinerarySummaryValues.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: payable/overall-cost formatting and special-instruction field fallback resolution now live in the hook.
- Behaviour intentionally changed: No. Existing fallback field order and two-decimal formatting are preserved.

### Verification
- Typecheck: no diagnostics from the controller, runtime, or new hook; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Production build: passed with existing warnings.
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Composition `ItineraryDetailsRuntime.tsx`: 11 lines.
- Transitional `ItineraryDetailsController.tsx`: 13,852 lines.
- New `useItinerarySummaryValues.ts`: 20 lines.

### Notes
- This is a small summary boundary; the remaining high-risk controller regions are still hotspot/Fit Here actions/views, vehicle workflow, quotation submission, and compatibility fragments.

## Iteration 47 — Broader verification rerun

### Baseline
- Starting point: Iteration 46 room-night extraction was committed and the focused pair/build/typecheck were green.
- Scope: rerun the broader itinerary Playwright set after the accumulated controller/state/computation extractions.

### Changes
- Files modified: `REGRESSION_LOG.md`, `FINAL_REPORT.md`, `PROGRESS_LOG.md`.
- Code moved: none; this is a verification/documentation checkpoint.
- Behaviour intentionally changed: No.

### Verification
- Broader itinerary Playwright: 34 tests, 8 passed, 2 skipped, 24 failed under 8 workers; failures are classified in `REGRESSION_LOG.md` as shared-data contention/environment/parity issues.
- Targeted Playwright: focused pair remains 2 passed.
- Production build: passed with existing warnings.
- Filtered page/new-module typecheck: no new diagnostics.
- Generated Playwright artifacts were removed/restored.

### Notes
- Completion criteria are still not met: the transitional controller remains 13,861 lines, repository lint is red, and the broader suite has unresolved environment/data failures. Continue responsibility-level extraction.

## Iteration 46 — Room-night breakdown hook

### Baseline
- Starting point: Iteration 45 financial totals extraction was committed; build, filtered typecheck, and focused Playwright pair were green.
- Scope: extract room-night count derivation used by quotation/room summaries.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useRoomBreakdownNights.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: stay grouping, selected booking matching, cheapest-row fallback, room count fallback, and final room-night aggregation now live in the hook.
- Behaviour intentionally changed: No. Existing match precedence and fallback arithmetic are preserved.

### Verification
- Typecheck: no diagnostics from the controller, runtime, or new hook; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Production build: passed with existing warnings.
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Composition `ItineraryDetailsRuntime.tsx`: 11 lines.
- Transitional `ItineraryDetailsController.tsx`: 13,861 lines.
- New `useRoomBreakdownNights.ts`: 69 lines.

### Notes
- Hotel summary calculations now have named boundaries for cost, selection metadata, loading, room nights, and pagination; hotel mutation handlers remain next.

## Iteration 45 — Financial totals hook

### Baseline
- Starting point: Iteration 44 entry-ticket summary extraction was committed; build, filtered typecheck, and focused Playwright pair were green.
- Scope: extract the high-coupling financial totals calculation while preserving backend and live-selection precedence.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useFinancialTotals.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: safe-money conversion, backend payable fast path, live hotel/vehicle totals, entry-ticket substitution, other-cost aggregation, and round-off calculation now live in the hook.
- Behaviour intentionally changed: No. Existing field precedence, rounding, and output shape are preserved.

### Verification
- Typecheck: no diagnostics from the controller, runtime, or new hook; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Production build: passed with existing warnings.
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Composition `ItineraryDetailsRuntime.tsx`: 11 lines.
- Transitional `ItineraryDetailsController.tsx`: 13,923 lines.
- New `useFinancialTotals.ts`: 81 lines.

### Notes
- The quotation totals surface now has a named computation boundary; wallet, passenger validation, and submission handlers remain in the controller.

## Iteration 44 — Entry-ticket summary hook

### Baseline
- Starting point: Iteration 43 computed vehicle totals was committed; build, filtered typecheck, and focused Playwright pair were green.
- Scope: extract attraction-segment entry-ticket aggregation and location-wise total derivation.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useEntryTicketSummary.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: attraction filtering, location grouping, amount rounding/sorting, and aggregate total now live in the hook.
- Behaviour intentionally changed: No. Existing segment filters, labels, rounding, and sort order are preserved.

### Verification
- Typecheck: no diagnostics from the controller, runtime, or new hook; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Production build: passed with existing warnings.
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Composition `ItineraryDetailsRuntime.tsx`: 11 lines.
- Transitional `ItineraryDetailsController.tsx`: 13,995 lines.
- New `useEntryTicketSummary.ts`: 37 lines.

### Notes
- Cost presentation now has isolated hotel, vehicle, and entry-ticket derivations; quotation financial totals remain the next larger computation cluster.

## Iteration 43 — Computed vehicle totals hook

### Baseline
- Starting point: Iteration 42 computed hotel cost extraction was committed; build, filtered typecheck, and focused Playwright pair were green.
- Scope: extract vehicle amount and quantity derivation from the page controller.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useComputedVehicleTotals.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: selection totals reduction, vehicle-visibility gating, and itinerary cost-breakdown fallbacks now live in the hook.
- Behaviour intentionally changed: No. Existing amount/quantity precedence and fallback fields are preserved.

### Verification
- Typecheck: no diagnostics from the controller, runtime, or new hook; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Production build: passed with existing warnings.
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Composition `ItineraryDetailsRuntime.tsx`: 11 lines.
- Transitional `ItineraryDetailsController.tsx`: 14,028 lines.
- New `useComputedVehicleTotals.ts`: 32 lines.

### Notes
- Vehicle totals are now isolated from vehicle actions and presentation; the remaining vehicle build/assignment workflow is still in the controller.

## Iteration 42 — Computed hotel cost hook

### Baseline
- Starting point: Iteration 41 selected hotel summary extraction was committed; build, filtered typecheck, and focused Playwright pair were green.
- Scope: extract displayed hotel-cost derivation across confirmed and draft workflows.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useComputedHotelCost.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: confirmed-tab/row totals, selected/list totals, supplier-row grouping, cheapest-row selection, room multipliers, and cost-breakdown fallback now live in the hook.
- Behaviour intentionally changed: No. Existing precedence and fallback calculations are preserved.

### Verification
- Typecheck: no diagnostics from the controller, runtime, or new hook; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Production build: passed with existing warnings.
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Composition `ItineraryDetailsRuntime.tsx`: 11 lines.
- Transitional `ItineraryDetailsController.tsx`: 14,044 lines.
- New `useComputedHotelCost.ts`: 67 lines.

### Notes
- Hotel cost selection is now independent of hotel mutation actions; financial quotation totals remain a separate high-coupling region.

## Iteration 41 — Selected hotel summary derivation

### Baseline
- Starting point: Iteration 40 hotel details loader was committed; build, filtered typecheck, and focused Playwright pair were green.
- Scope: extract selected-hotel total and route summary derivation from the page controller.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useSelectedHotelSummary.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: selected booking total, route-bucket matching, booking/code/name matching, and cheapest-row fallback calculations now live in the hook.
- Behaviour intentionally changed: No. Existing matching precedence, amount calculations, and room-count fallback are preserved.

### Verification
- Typecheck: no diagnostics from the controller, runtime, or new hook; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Production build: passed with existing warnings.
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Composition `ItineraryDetailsRuntime.tsx`: 11 lines.
- Transitional `ItineraryDetailsController.tsx`: 14,105 lines.
- New `useSelectedHotelSummary.ts`: 86 lines.

### Notes
- Hotel display derivation is now separate from hotel mutation workflows; arrival policy, room selection, and rebuild actions remain to be split.

## Iteration 40 — Hotel details loader

### Baseline
- Starting point: Iteration 39 document action extraction was committed; build, filtered typecheck, and focused Playwright pair were green.
- Scope: extract the coupled hotel hydration/normalization loaders while preserving the route-state callback ref.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useHotelDetailsLoader.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: full route pagination hydration, dedupe/merge loop, confirmed hotel response normalization, confirmed DB loading, and itinerary-preference gating now live in the hook.
- Behaviour intentionally changed: No. Service calls, pagination size, normalization fields, and callback ref assignment are preserved.

### Verification
- Typecheck: no diagnostics from the controller, runtime, or new hook; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Production build: passed with existing warnings.
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Composition `ItineraryDetailsRuntime.tsx`: 11 lines.
- Transitional `ItineraryDetailsController.tsx`: 14,156 lines.
- New `useHotelDetailsLoader.ts`: 129 lines.

### Notes
- This is the first larger hotel workflow extraction; hotel selection, arrival policy, room selection, and rebuild handlers remain for later responsibility-level splits.

## Iteration 39 — Itinerary document actions

### Baseline
- Starting point: Iteration 38 guide data refresh extraction was committed; build, filtered typecheck, and focused Playwright pair were green.
- Scope: isolate the summary document preview actions from the page controller.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useItineraryDocumentActions.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: plan-id validation, toast fallback, and pluck-card/invoice `window.open` URLs now live in the hook.
- Behaviour intentionally changed: No. Existing paths, query encoding, and blank-window options are unchanged.

### Verification
- Typecheck: no diagnostics from the controller, runtime, or new hook; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Production build: passed with existing warnings.
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Composition `ItineraryDetailsRuntime.tsx`: 11 lines.
- Transitional `ItineraryDetailsController.tsx`: 14,279 lines.
- New `useItineraryDocumentActions.ts`: 20 lines.

### Notes
- This removes browser-window side effects from the controller; quotation confirmation and hotel workflows remain the primary large action clusters.

## Iteration 38 — Guide data refresh controller

### Baseline
- Starting point: Iteration 37 hotel pagination controller was committed; build, filtered typecheck, and focused Playwright pair were green.
- Scope: extract guide assignment loading and the refresh-after-guide-change sequence.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useGuideDataRefresh.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: assignment API loading, invalid-plan handling, and concurrent assignment/details refresh now live in the hook.
- Behaviour intentionally changed: No. Existing service calls, fallback arrays, and error handling are preserved.

### Verification
- Typecheck: no diagnostics from the controller, runtime, or new hook; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Production build: passed with existing warnings.
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Composition `ItineraryDetailsRuntime.tsx`: 11 lines.
- Transitional `ItineraryDetailsController.tsx`: 14,291 lines.
- New `useGuideDataRefresh.ts`: 47 lines.

### Notes
- Guide assignment mutation and dialog orchestration remain coupled to the page until a later controller extraction can preserve their full dependency set.

## Iteration 37 — Hotel pagination controller

### Baseline
- Starting point: Iteration 36 scroll controller was committed; build, filtered typecheck, and focused Playwright pair were green.
- Scope: extract the paginated hotel-row loader and merge logic from the page controller.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useHotelPaginationController.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: loading guard, `ItineraryService.getHotelDetails` call, row/pagination merge, page cursor update, and failure cleanup now live in the hook.
- Behaviour intentionally changed: No. Existing service arguments, merge semantics, and loading flag lifecycle are preserved.

### Verification
- Typecheck: no diagnostics from the controller, runtime, or new hook; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Production build: passed with existing warnings.
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Composition `ItineraryDetailsRuntime.tsx`: 11 lines.
- Transitional `ItineraryDetailsController.tsx`: 14,313 lines.
- New `useHotelPaginationController.ts`: 44 lines.

### Notes
- The hook is intentionally limited to pagination; supplier search, room selection, arrival policy, and rebuild flows remain in the controller for later responsibility-level extraction.

## Iteration 36 — Itinerary scroll controller

### Baseline
- Starting point: Iteration 35 vehicle totals synchronization was committed; build, filtered typecheck, and focused Playwright pair were green.
- Scope: extract sticky-summary measurement, section scroll helpers, and day-count ref synchronization.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useItineraryScrollController.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: `ResizeObserver` setup/cleanup, smooth hotel/vehicle section scrolling, and itinerary day-count ref updates now live in the hook.
- Behaviour intentionally changed: No. Existing refs, offsets, and scroll behavior are preserved.

### Verification
- Typecheck: no diagnostics from the controller, runtime, or new hook; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Production build: passed with existing warnings.
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Composition `ItineraryDetailsRuntime.tsx`: 11 lines.
- Transitional `ItineraryDetailsController.tsx`: 14,330 lines.
- New `useItineraryScrollController.ts`: 50 lines.

### Notes
- The hook isolates browser measurement and navigation mechanics; route/hotel action workflows remain in the controller for later extraction.

## Iteration 35 — Vehicle totals synchronization hook

### Baseline
- Starting point: Iteration 34 route-time progress controller was committed; build, filtered typecheck, and focused Playwright pair were green.
- Scope: move the vehicle-total synchronization effects out of the page controller while leaving selection and API handlers untouched.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useVehicleTotalsSync.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: active vehicle-type derivation, quote reset, stale type cleanup, and cheapest-vehicle default seeding now live in the hook.
- Behaviour intentionally changed: No. The same `selectedVehicleTotalsByType` setter receives equivalent updates.

### Verification
- Typecheck: no diagnostics from the controller, runtime, or new hook; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Production build: passed with existing warnings.
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Composition `ItineraryDetailsRuntime.tsx`: 11 lines.
- Transitional `ItineraryDetailsController.tsx`: 14,345 lines.
- New `useVehicleTotalsSync.ts`: 64 lines.

### Notes
- This boundary isolates vehicle-derived state; vehicle action handlers and the vehicle-only presentation remain the next high-risk workflow area.

## Iteration 34 — Route-time progress controller

### Baseline
- Starting point: Iteration 33 destructive-action state hook was committed; build, filtered typecheck, and focused Playwright pair were green.
- Scope: extract the route-time progress timer and history mechanics while preserving the existing hotel workflow state shape.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useRouteTimeProgressController.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: interval cleanup, progress-stage history, percentage updates, and route-time estimate calculation now live in the hook.
- Behaviour intentionally changed: No. The controller passes the same state setters and timer ref and receives the same callback names.

### Verification
- Typecheck: no diagnostics from the controller, runtime, or new hook; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Production build: passed with existing warnings.
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Composition `ItineraryDetailsRuntime.tsx`: 11 lines.
- Transitional `ItineraryDetailsController.tsx`: 14,393 lines.
- New `useRouteTimeProgressController.ts`: 51 lines.

### Notes
- The hook keeps timing behavior local to the route-time workflow; remaining hotel search and route action handlers still need extraction.

## Iteration 33 — Destructive-action state hook

### Baseline
- Starting point: Iteration 32 confirmed-quote banner extraction was committed; build, filtered typecheck, and focused Playwright pair were green.
- Scope: move modal state and in-flight flags for destructive itinerary actions into a dedicated state hook.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useItineraryDeletionState.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: hotspot deletion modal, activity deletion modal, all-hotspots preview modal, route rebuild flags, and deletion flags now originate from the hook.
- Behaviour intentionally changed: No. Existing handlers and dialog props use the same state values and setters.

### Verification
- Typecheck: no diagnostics from the controller, runtime, or new hook; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Production build: passed with existing warnings.
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Composition `ItineraryDetailsRuntime.tsx`: 11 lines.
- Transitional `ItineraryDetailsController.tsx`: 14,410 lines.
- New `useItineraryDeletionState.ts`: 75 lines.

### Notes
- The new hook intentionally preserves existing dynamic preview data typing while establishing a clear state ownership boundary; API handlers remain in the controller for the next workflow extraction.

## Iteration 32 — Confirmed quote banner presentation boundary

### Baseline
- Starting point: Iteration 31 controller/runtime boundary was committed; the focused hotspot pair and production build were green.
- Scope: extract the confirmed/read-only context banner as a dedicated presentational responsibility.

### Changes
- Files created: `src/pages/itinerary-details/components/ConfirmedQuoteBanner.tsx`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: the confirmed quote banner JSX now lives in `ConfirmedQuoteBanner`; the controller keeps only the `isConfirmedPresentation` visibility decision.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no diagnostics from the controller, runtime, or new component; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Production build: passed with existing warnings.
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Composition `ItineraryDetailsRuntime.tsx`: 11 lines.
- Transitional `ItineraryDetailsController.tsx`: 14,455 lines.
- New `ConfirmedQuoteBanner.tsx`: 18 lines.

### Notes
- This is a focused view extraction; the controller remains above the 1,000-line ceiling and requires further workflow-level splits.

## Iteration 31 — Explicit controller/runtime composition boundary

### Baseline
- Starting point: the stable page entrypoint already delegated to a single transitional implementation module, and the focused Playwright pair plus production build were green.
- Scope: name the remaining implementation according to its actual responsibility and keep a thin runtime composition module at the router boundary.

### Changes
- Files renamed: `src/pages/ItineraryDetailsRuntime.tsx` → `src/pages/ItineraryDetailsController.tsx`.
- Files created: `src/pages/ItineraryDetailsRuntime.tsx` (11-line composition boundary).
- Behaviour intentionally changed: No. The runtime re-exports the controller's named/default component contract without changing props, routes, API calls, or JSX.

### Verification
- Typecheck: repository command still reports the documented unrelated errors; no new errors were introduced in the itinerary controller/runtime modules. The lazy router's existing prop inference diagnostics remain documented baseline debt.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Production build: passed with existing warnings.
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Composition `ItineraryDetailsRuntime.tsx`: 11 lines.
- Transitional `ItineraryDetailsController.tsx`: 16,191 lines.

### Notes
- This is an architectural naming/boundary checkpoint, not completion. The controller still requires responsibility-by-responsibility extraction under the 1,000-line source-file ceiling.

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

## Iteration 118 — Fit Here timeline-row composition

### Baseline
- Starting point: Iteration 117 hotspot apply-button extraction; stable page entrypoint remained 14 lines and focused hotspot Playwright remained green.
- Scope: extract the Fit Here preview timeline rows and exact-anchor button placement without moving anchor construction or mutation behavior.

### Changes
- File created: `src/pages/itinerary-details/components/HotspotFitHereTimelineRows.tsx`.
- File modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: non-hotspot Fit Here timeline-row rendering, row labels/times, and injected anchor-button placement now live in the presentation component.
- Behaviour intentionally changed: No. Existing segment filtering, data-testid attributes, labels, anchor builder, and renderer are preserved.

### Verification
- Lint: new component passes ESLint with `--max-warnings=0`.
- Typecheck: no diagnostics from the controller or new component; existing repository diagnostics remain.
- Production build: passed with existing Browserslist/Tailwind/dynamic-import/chunk-size warnings.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Full itinerary Playwright: not run in this iteration.
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 11,802 lines.
- New `HotspotFitHereTimelineRows.tsx`: 56 lines.

### Notes
- Anchor construction and Fit Here mutation flows remain controller-owned and injected, keeping this extraction presentation-only.
- Remaining high-risk boundaries are the larger hotspot/Fit Here diagnostics/timeline pane, quotation review/submission view, and transitional controller composition.

## Iteration 120 — Fit Here selected-hotspot header

### Baseline
- Starting point: Iteration 119 Fit Here empty-state extraction; stable page entrypoint remained 14 lines and focused hotspot Playwright remained green.
- Scope: extract selected-hotspot identity presentation while retaining the existing note and all Fit Here state in the controller.

### Changes
- File created: `src/pages/itinerary-details/components/HotspotFitHereSelectionHeader.tsx`.
- File modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: selected-for-Fit-Here label and hotspot name presentation now live in a typed component.
- Behaviour intentionally changed: No.

### Verification
- Lint: new component passes ESLint with `--max-warnings=0`.
- Typecheck: no diagnostics from the controller or new component; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 11,792 lines.
- New `HotspotFitHereSelectionHeader.tsx`: 18 lines.

### Notes
- The selected-hotspot explanatory copy remains in the controller because the source contains legacy mojibake text; no copy or encoding was changed.

## Iteration 121 — Fit Here preview loading state

### Baseline
- Starting point: Iteration 120 selected-hotspot header extraction; stable page entrypoint remained 14 lines and focused hotspot Playwright remained green.
- Scope: extract the calculation-in-progress indicator from the preview timeline container.

### Changes
- File created: `src/pages/itinerary-details/components/HotspotPreviewLoadingState.tsx`.
- File modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: spinner and “Calculating selected slot…” presentation now live in a component; visibility remains driven by the existing preview-request id.
- Behaviour intentionally changed: No.

### Verification
- Lint: new component passes ESLint with `--max-warnings=0`.
- Typecheck: no diagnostics from the controller or new component; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 11,788 lines.
- New `HotspotPreviewLoadingState.tsx`: 18 lines.

### Notes
- The surrounding timeline container and preview banners remain controller-owned for the next bounded extraction.

## Iteration 122 — Same-city rescheduling notice

### Baseline
- Starting point: Iteration 121 preview loading-state extraction; stable page entrypoint remained 14 lines and focused hotspot Playwright remained green.
- Scope: extract the same-city rescheduling notice shown above the preview timeline.

### Changes
- File created: `src/pages/itinerary-details/components/HotspotPreviewRescheduleNotice.tsx`.
- File modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: rescheduling notice copy and presentation now live in a component; the existing resolution flag is injected unchanged.
- Behaviour intentionally changed: No.

### Verification
- Lint: new component passes ESLint with `--max-warnings=0`.
- Typecheck: no diagnostics from the controller or new component; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 11,781 lines.
- New `HotspotPreviewRescheduleNotice.tsx`: 20 lines.

### Notes
- The adjacent recalculated-timings banner still contains legacy mojibake text and remains queued for a safe extraction.

## Iteration 123 — Route-fit feasibility notice

### Baseline
- Starting point: Iteration 122 same-city rescheduling notice extraction; stable page entrypoint remained 14 lines and focused hotspot Playwright remained green.
- Scope: extract the plain feasibility explanation below the recalculated-timings banner.

### Changes
- File created: `src/pages/itinerary-details/components/HotspotPreviewRouteFitNotice.tsx`.
- File modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: route-fit feasibility copy presentation now lives in a component; the legacy checkmark banner and visibility condition remain unchanged.
- Behaviour intentionally changed: No.

### Verification
- Lint: new component passes ESLint with `--max-warnings=0`.
- Typecheck: no diagnostics from the controller or new component; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 11,780 lines.
- New `HotspotPreviewRouteFitNotice.tsx`: 10 lines.

### Notes
- Legacy mojibake checkmark/overflow labels remain untouched; future extraction must preserve their encoded display exactly.

## Iteration 124 — Empty preview timeline fallback

### Baseline
- Starting point: Iteration 123 route-fit feasibility notice extraction; stable page entrypoint remained 14 lines and focused hotspot Playwright remained green.
- Scope: extract the fallback rendered when no preview timeline is available.

### Changes
- File created: `src/pages/itinerary-details/components/HotspotPreviewEmptyTimeline.tsx`.
- File modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: empty-timeline copy and presentation now live in a component; the existing timeline-length branch remains unchanged.
- Behaviour intentionally changed: No.

### Verification
- Lint: new component passes ESLint with `--max-warnings=0`.
- Typecheck: no diagnostics from the controller or new component; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 11,779 lines.
- New `HotspotPreviewEmptyTimeline.tsx`: 10 lines.

### Notes
- Remaining larger preview blocks include legacy mojibake labels and should be extracted only with exact encoding preservation.

## Iteration 125 — Resolved-overflow header

### Baseline
- Starting point: Iteration 124 empty preview-timeline fallback extraction; stable page entrypoint remained 14 lines and focused hotspot Playwright remained green.
- Scope: extract the resolved-overflow heading and timing-policy explanation while preserving removal-plan row rendering.

### Changes
- File created: `src/pages/itinerary-details/components/HotspotPreviewOverflowResolvedHeader.tsx`.
- File modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: resolved-overflow heading and policy explanation presentation now live in a typed component; the original first-available timing-policy precedence remains injected through the computed label.
- Behaviour intentionally changed: No.

### Verification
- Lint: new component passes ESLint with `--max-warnings=0`.
- Typecheck: no diagnostics from the controller or new component; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 11,774 lines.
- New `HotspotPreviewOverflowResolvedHeader.tsx`: 18 lines.

### Notes
- Planned-removal rows and legacy encoded separators remain controller-owned for exact display preservation.

## Iteration 126 — Resolved timeline notice

### Baseline
- Starting point: Iteration 125 resolved-overflow header extraction; stable page entrypoint remained 14 lines and focused hotspot Playwright remained green.
- Scope: extract the final resolved-timeline explanation below the planned-removal list.

### Changes
- File created: `src/pages/itinerary-details/components/HotspotPreviewResolvedTimelineNotice.tsx`.
- File modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: resolved-preview explanatory copy presentation now lives in a pure component.
- Behaviour intentionally changed: No.

### Verification
- Lint: new component passes ESLint with `--max-warnings=0`.
- Typecheck: no diagnostics from the controller or new component; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 11,773 lines.
- New `HotspotPreviewResolvedTimelineNotice.tsx`: 10 lines.

### Notes
- Planned-removal rows, leak diagnostics, and encoded separators remain controller-owned.

## Iteration 127 — Resolved-removal leak diagnostic

### Baseline
- Starting point: Iteration 126 resolved-timeline notice extraction; stable page entrypoint remained 14 lines and focused hotspot Playwright remained green.
- Scope: isolate the development-only leak diagnostic without moving its predicate.

### Changes
- File created: `src/pages/itinerary-details/components/HotspotPreviewOverflowLeakNotice.tsx`.
- File modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: development-only diagnostic copy presentation now lives in a component; `import.meta.env.DEV && resolvedRemovalTimelineLeak` remains unchanged in the controller.
- Behaviour intentionally changed: No.

### Verification
- Lint: new component passes ESLint with `--max-warnings=0`.
- Typecheck: no diagnostics from the controller or new component; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 11,770 lines.
- New `HotspotPreviewOverflowLeakNotice.tsx`: 18 lines.

### Notes
- The larger planned-removal diagnostics remain controller-owned pending an encoding-safe extraction.

## Iteration 128 — Day-end overflow notice

### Baseline
- Starting point: Iteration 127 resolved-removal leak diagnostic extraction; stable page entrypoint remained 14 lines and focused hotspot Playwright remained green.
- Scope: extract the plain day-end overflow explanation beneath the legacy warning label.

### Changes
- File created: `src/pages/itinerary-details/components/HotspotPreviewDayEndOverflowNotice.tsx`.
- File modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: overflow minutes explanation presentation now lives in a typed component; calculation and warning visibility remain controller-owned.
- Behaviour intentionally changed: No.

### Verification
- Lint: new component passes ESLint with `--max-warnings=0`.
- Typecheck: no diagnostics from the controller or new component; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 11,769 lines.
- New `HotspotPreviewDayEndOverflowNotice.tsx`: 14 lines.

### Notes
- The legacy warning icon label remains in place to preserve its current encoded display.

## Iteration 129 — Quotation confirmation dialog shell

### Baseline
- Starting point: Iteration 128 day-end overflow notice extraction; stable page entrypoint remained 14 lines and focused hotspot Playwright remained green.
- Scope: extract the quotation confirmation modal shell without moving encoded guest/prebook copy or submission behavior.

### Changes
- File created: `src/pages/itinerary-details/QuotationConfirmationDialogShell.tsx`.
- File modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: quotation modal open state wiring, dialog header, content container, and shell layout now live in a typed component; all existing content and footer remain controller-composed as children.
- Behaviour intentionally changed: No.

### Verification
- Lint: new component passes ESLint with `--max-warnings=0`.
- Typecheck: no diagnostics from the controller or new component; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 11,764 lines.
- New `QuotationConfirmationDialogShell.tsx`: 31 lines.

### Notes
- A full quotation-content extraction remains queued; legacy mojibake strings made a whole-dialog move unsafe without changing displayed text.

## Iteration 130 — Prepared itinerary page loader

### Baseline
- Starting point: Iteration 129 quotation confirmation modal shell extraction; stable page entrypoint remained 14 lines and focused hotspot Playwright remained green.
- Scope: extract staged itinerary loading and its vehicle/hotel handoff as a controller hook.

### Changes
- File created: `src/pages/itinerary-details/hooks/usePreparedItineraryPageLoader.ts`.
- File modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: initial details fetch, hotel hydration, vehicle-build handoff, stale-request guards, page-ready/loading transitions, and failure cleanup now live in the hook.
- Behavior intentionally changed: No. A follow-up lifecycle fix replaced an inline reset callback with the stable page-loader-history setter so the route-loading effect does not restart on state updates.

### Verification
- Lint: new hook passes ESLint with `--max-warnings=0`.
- Typecheck: no diagnostics from the controller or new hook; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`) after the lifecycle fix.
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 11,714 lines.
- New `usePreparedItineraryPageLoader.ts`: 161 lines.

### Notes
- This is the first controller-level loading responsibility extracted after the presentation-only preview boundaries. Remaining work includes route-time/rebuild actions, hotel workflows, large hotspot/Fit Here rendering, quotation review content, and full-suite verification.

## Iteration 131 — Route rebuild mutation

### Baseline
- Starting point: Iteration 130 prepared itinerary page-loader extraction; stable page entrypoint remained 14 lines and focused hotspot Playwright remained green.
- Scope: extract the route rebuild mutation and its progress/refresh lifecycle.

### Changes
- File created: `src/pages/itinerary-details/hooks/useRouteRebuildMutation.ts`.
- File modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: route validation, rebuild API call, progress stages, details/hotel refresh, stale-route recovery, success/error toasts, and rebuild-marker clearing now live in the hook.
- Behaviour intentionally changed: No.

### Verification
- Lint: new hook passes ESLint with `--max-warnings=0`.
- Typecheck: no diagnostics from the controller or new hook; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 11,659 lines.
- New `useRouteRebuildMutation.ts`: 147 lines.

### Notes
- Route-time updates and arrival-policy confirmation remain a separate high-risk mutation boundary for the next iteration.

## Iteration 132 — Route-time PATCH mutation

### Baseline
- Starting point: Iteration 131 route rebuild mutation extraction; stable page entrypoint remained 14 lines and focused hotspot Playwright remained green.
- Scope: extract route-time PATCH progress and refresh behavior while retaining arrival-policy orchestration in the controller.

### Changes
- File created: `src/pages/itinerary-details/hooks/useRouteTimePatchMutation.ts`.
- File modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: timing update request, progress stages, source-of-truth itinerary refresh, hotel-detail preservation, scroll target, success/error toasts, and cleanup now live in the hook.
- Behaviour intentionally changed: No.

### Verification
- Lint: new hook passes ESLint with `--max-warnings=0`.
- Typecheck: no diagnostics from the controller or new hook; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 11,611 lines.
- New `useRouteTimePatchMutation.ts`: 124 lines.

### Notes
- Arrival-policy decision gating and confirmation persistence remain the next route-time responsibility boundary.

## Iteration 133 — Arrival-policy decision-key utilities

### Baseline
- Starting point: Iteration 132 route-time PATCH mutation extraction; stable page entrypoint remained 14 lines and focused hotspot Playwright remained green.
- Scope: centralize arrival-policy decision-key normalization used by duplicate guards and confirmation actions.

### Changes
- File created: `src/pages/itinerary-details/utils/routeArrivalPolicy.utils.ts`.
- File modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: route/date/start-time key construction and request fallback derivation now live in pure utilities shared by existing controller paths.
- Behaviour intentionally changed: No.

### Verification
- Lint: new utility passes ESLint with `--max-warnings=0`.
- Typecheck: no diagnostics from the controller or new utility; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 11,576 lines.
- New `routeArrivalPolicy.utils.ts`: 43 lines.

### Notes
- Arrival-policy async gating and persistence remain the next route-time responsibility boundary.

## Iteration 134 — Arrival-policy route-time controller

### Baseline
- Starting point: Iteration 133 arrival-policy decision-key utility extraction; stable page entrypoint remained 14 lines and focused hotspot Playwright remained green.
- Scope: extract early-morning arrival-policy gating, confirmation-modal preparation, direct timing orchestration, and persistence.

### Changes
- File created: `src/pages/itinerary-details/hooks/useArrivalPolicyRouteTimeController.ts`.
- File modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: direct route-time handling, hotel-arrival policy resolution, confirmation state preparation, and confirmed decision persistence now live in the hook.
- Behaviour intentionally changed: No.

### Verification
- Lint: new hook passes ESLint with `--max-warnings=0`.
- Typecheck: no diagnostics from the controller or new hook; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 11,471 lines.
- New `useArrivalPolicyRouteTimeController.ts`: 194 lines.

### Notes
- Route-time mutation responsibilities are now separated into rebuild, PATCH, and arrival-policy controllers; larger hotel/hotspot/quotation views remain.

## Iteration 135 - Guide availability loader

### Baseline
- Starting point: Iteration 134 arrival-policy route-time controller extraction; stable page entrypoint remained 14 lines and focused hotspot Playwright remained green.
- Scope: extract the guide availability API loader and its loading/error state transitions.

### Changes
- File created: `src/pages/itinerary-details/hooks/useGuideAvailabilityLoader.ts`.
- File modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: guide availability request, response assignment, error reset, and loading cleanup now live in the hook.
- Behaviour intentionally changed: No.

### Verification
- Lint: new hook passes ESLint with `--max-warnings=0`.
- Typecheck: no diagnostics from the controller or new hook; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 11,452 lines.
- New `useGuideAvailabilityLoader.ts`: 35 lines.

### Notes
- Guide assignment selection and mutation remain separate existing boundaries.

## Iteration 119 — Fit Here empty-state guidance

### Baseline
- Starting point: Iteration 118 Fit Here timeline-row extraction; stable page entrypoint remained 14 lines and focused hotspot Playwright remained green.
- Scope: extract the right-pane guidance shown before a hotspot is selected.

### Changes
- File created: `src/pages/itinerary-details/components/HotspotFitHereEmptyState.tsx`.
- File modified: `src/pages/ItineraryDetailsController.tsx`.
- Code moved: Fit Here empty-state copy and layout now live in a presentation component; visibility is still derived from the existing selected-hotspot/modal state.
- Behaviour intentionally changed: No.

### Verification
- Lint: new component passes ESLint with `--max-warnings=0`.
- Typecheck: no diagnostics from the controller or new component; existing repository diagnostics remain.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Generated Playwright artifacts were restored/cleaned.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 11,796 lines.
- New `HotspotFitHereEmptyState.tsx`: 20 lines.

### Notes
- Remaining high-risk boundaries are the larger hotspot/Fit Here diagnostics/timeline pane, quotation review/submission view, and transitional controller composition.

## Iteration 100 — Quotation passenger form view extraction

### Baseline
- Tests run: targeted typecheck filtered to the changed controller/form/state files, production build, and the focused Fit Here/hotspot Playwright pair.
- Result: no changed-file type errors; build passed with existing warnings; focused Playwright passed 2/2.

### Changes
- Files created: `src/pages/itinerary-details/QuotationPassengerForm.tsx`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `src/pages/itinerary-details/hooks/useQuotationState.ts`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: primary guest fields and conditional additional adult/child/infant form rows (including existing error rendering and immutable nationality/child-age behavior) now render through a typed component; state setters, default-passenger creation, and passenger-field error lookup remain supplied by the controller.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx`, `QuotationPassengerForm.tsx`, or `useQuotationState.ts`; unrelated repository errors remain.
- Lint: new form component passes ESLint; repository baseline remains failing.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: not rerun; documented shared-data/environment failures remain unchanged.

### Line counts
- Transitional `ItineraryDetailsController.tsx`: 12,205 lines (down from 12,619 at the previous report checkpoint).
- New `QuotationPassengerForm.tsx`: 470 lines.
- Stable `ItineraryDetails.tsx`: 14 lines.

### Notes
- The component remains below the prompt’s 500-line normal component guidance and keeps all existing setter/update expressions intact to minimize behavioral risk.
- Remaining high-risk boundaries are the quotation arrival/departure/review footer, hotspot/Fit Here composition, and hotel/vehicle workflow views.

## Iteration 101 — Quotation travel-details view extraction

### Baseline
- Tests run: targeted typecheck filtered to the changed controller/form/state files, production build, and the focused Fit Here/hotspot Playwright pair.
- Result: no changed-file type errors; new view lint passed; build passed with existing warnings; focused Playwright passed 2/2.

### Changes
- Files created: `src/pages/itinerary-details/QuotationTravelDetailsForm.tsx`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: quotation arrival and departure date/time, place, and flight-detail fields now render in a typed view; the existing arrival date normalization handler is injected unchanged.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `QuotationTravelDetailsForm.tsx`; unrelated repository errors remain.
- Lint: new travel-details component passes ESLint; repository baseline remains failing.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: not rerun; documented shared-data/environment failures remain unchanged.

### Line counts
- Transitional `ItineraryDetailsController.tsx`: 12,117 lines (down from 12,205 at the previous checkpoint).
- New `QuotationTravelDetailsForm.tsx`: 111 lines.
- Stable `ItineraryDetails.tsx`: 14 lines.

### Notes
- The modal footer still retains cancellation/reset and confirmation submission orchestration; the next quotation boundary is the review/footer composition.

## Iteration 102 — Quotation dialog footer view extraction

### Baseline
- Tests run: targeted typecheck filtered to the changed controller/footer files, production build, and the focused Fit Here/hotspot Playwright pair.
- Result: no changed-file type errors; new footer view lint passed; build passed with existing warnings; focused Playwright passed 2/2.

### Changes
- Files created: `src/pages/itinerary-details/QuotationDialogFooter.tsx`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: quotation cancel/reset state clearing and confirmation-button loading/disabled presentation now render in a typed footer component; submission and wallet reset callbacks remain injected.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `QuotationDialogFooter.tsx`; unrelated repository errors remain.
- Lint: new footer component passes ESLint; repository baseline remains failing.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: not rerun; documented shared-data/environment failures remain unchanged.

### Line counts
- Transitional `ItineraryDetailsController.tsx`: 12,090 lines (down from 12,117 at the previous checkpoint).
- New `QuotationDialogFooter.tsx`: 85 lines.
- Stable `ItineraryDetails.tsx`: 14 lines.

### Notes
- The high-coupling quotation review/prebook body remains in the controller for the next boundary pass.

## Iteration 103 — Quotation passenger notice extraction

### Baseline
- Tests run: targeted typecheck/lint filtered to the changed controller/notice files, production build, and the focused Fit Here/hotspot Playwright pair.
- Result: no changed-file type errors; notice view lint passed; build passed with existing warnings; focused Playwright passed 2/2.

### Changes
- Files created: `src/pages/itinerary-details/QuotationPassengerNotice.tsx`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: conditional child/infant passenger-requirement notice markup now renders in a dedicated view; the original passenger-count visibility predicate remains unchanged in the controller.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `QuotationPassengerNotice.tsx`; unrelated repository errors remain.
- Lint: new notice component passes ESLint; repository baseline remains failing.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: not rerun; documented shared-data/environment failures remain unchanged.

### Line counts
- Transitional `ItineraryDetailsController.tsx`: 12,086 lines (down from 12,090 at the previous checkpoint).
- New `QuotationPassengerNotice.tsx`: 17 lines.
- Stable `ItineraryDetails.tsx`: 14 lines.

### Notes
- This small view completes another independent quotation-dialog presentation boundary while preserving the larger prebook review body for a later typed extraction.

## Iteration 104 — Quotation prebook loading notice extraction

### Baseline
- Tests run: targeted typecheck/lint filtered to the changed controller/loading-notice files, production build, and the focused Fit Here/hotspot Playwright pair.
- Result: no changed-file type errors; loading notice lint passed; build passed with existing warnings; focused Playwright passed 2/2.

### Changes
- Files created: `src/pages/itinerary-details/QuotationPrebookLoadingNotice.tsx`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: the prebook-in-progress loading presentation now renders in a dedicated view; its existing modal-state visibility predicate remains unchanged.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `QuotationPrebookLoadingNotice.tsx`; unrelated repository errors remain.
- Lint: new loading notice component passes ESLint; repository baseline remains failing.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: not rerun; documented shared-data/environment failures remain unchanged.

### Line counts
- Transitional `ItineraryDetailsController.tsx`: 12,081 lines (down from 12,086 at the previous checkpoint).
- New `QuotationPrebookLoadingNotice.tsx`: 20 lines.
- Stable `ItineraryDetails.tsx`: 14 lines.

### Notes
- The next high-coupling quotation boundary is the wallet top-up panel or supplier hotel review body; both require careful typed normalization of legacy provider data.

## Iteration 105 — Quotation agent summary extraction

### Baseline
- Tests run: targeted typecheck/lint filtered to the changed controller/agent-summary files, production build, and the focused Fit Here/hotspot Playwright pair.
- Result: no changed-file type errors; agent-summary view lint passed; build passed with existing warnings; focused Playwright passed 2/2.

### Changes
- Files created: `src/pages/itinerary-details/QuotationAgentSummary.tsx`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: quotation number, agent identity, wallet balance, and amount-required summary now render in a typed view; wallet parsing and currency formatting remain injected unchanged.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `QuotationAgentSummary.tsx`; unrelated repository errors remain.
- Lint: new agent-summary component passes ESLint; repository baseline remains failing.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: not rerun; documented shared-data/environment failures remain unchanged.

### Line counts
- Transitional `ItineraryDetailsController.tsx`: 12,063 lines (down from 12,081 at the previous checkpoint).
- New `QuotationAgentSummary.tsx`: 47 lines.
- Stable `ItineraryDetails.tsx`: 14 lines.

### Notes
- The wallet top-up editor remains the next high-coupling presentation boundary; no wallet mutation or balance-refresh behavior was moved in this iteration.

## Iteration 106 — Quotation rooming preview extraction

### Baseline
- Tests run: targeted typecheck/lint filtered to the changed controller/rooming-preview files, production build, and the focused Fit Here/hotspot Playwright pair.
- Result: no changed-file type errors; rooming-preview view lint passed; build passed with existing warnings; focused Playwright passed 2/2.

### Changes
- Files created: `src/pages/itinerary-details/QuotationRoomingPreview.tsx`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: room-count, passenger-mix, and per-room occupancy preview markup now renders in a typed view; the controller still supplies the existing normalized occupancy array.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `QuotationRoomingPreview.tsx`; unrelated repository errors remain.
- Lint: new rooming-preview component passes ESLint; repository baseline remains failing.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: not rerun; documented shared-data/environment failures remain unchanged.

### Line counts
- Transitional `ItineraryDetailsController.tsx`: 12,040 lines (down from 12,063 at the previous checkpoint).
- New `QuotationRoomingPreview.tsx`: 47 lines.
- Stable `ItineraryDetails.tsx`: 14 lines.

### Notes
- The remaining wallet editor and detailed hotel review sections retain their existing provider data handling until a larger typed boundary can be introduced safely.

## Iteration 107 — Broad-suite verification audit

### Baseline
- Tests run: explicit 11-file itinerary Playwright suite, after the green focused pair/build checkpoints.
- Result: the broad command exceeded the five-minute command limit without a final aggregate result; workers were terminated safely. The focused pair remains 2/2 from the immediately preceding checkpoint.

### Changes
- Files modified: `REGRESSION_LOG.md`, `PROGRESS_LOG.md`.
- Code moved: none; this is a verification/documentation checkpoint.
- Behaviour intentionally changed: No.

### Verification
- Broad itinerary Playwright: timed out at the command limit; this is documented separately from the prior completed 34-test failure classifications.
- Generated Playwright artifacts: removed; tracked metadata restored.
- Previous production build and focused Playwright results remain green.

### Notes
- The broad suite timeout reinforces the existing environment/data contention blocker; no test was weakened and no application workaround was introduced.

## Iteration 108 — Wallet top-up actions view extraction

### Baseline
- Tests run: targeted typecheck/lint filtered to the changed controller/wallet-actions files and the focused Fit Here/hotspot Playwright pair; production build was already green before the final callback-type correction.
- Result: no changed-file type errors after widening only the refresh callback result type; wallet-actions lint passed; focused Playwright passed 2/2.

### Changes
- Files created: `src/pages/itinerary-details/QuotationWalletTopUpActions.tsx`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: wallet top-up amount/remark inputs and add-cash/refresh buttons now render in a typed view; wallet mutation, submitting state, and balance-refresh callbacks remain supplied by the controller.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `QuotationWalletTopUpActions.tsx`; unrelated repository errors remain.
- Lint: new wallet-actions component passes ESLint; repository baseline remains failing.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: latest explicit broad command timed out at the documented command limit.

### Line counts
- Transitional `ItineraryDetailsController.tsx`: 12,005 lines (down from 12,040 at the previous checkpoint).
- New `QuotationWalletTopUpActions.tsx`: 68 lines.
- Stable `ItineraryDetails.tsx`: 14 lines.

### Notes
- The wallet insufficient-balance warning and top-up orchestration remain in the controller; this extraction is presentation-only and preserves the existing callbacks.

## Iteration 109 — TBO prebook hotel rows extraction

### Baseline
- Tests run: targeted typecheck/lint filtered to the changed controller/prebook-row component, production build, and the focused Fit Here/hotspot Playwright pair.
- Result: no changed-file type errors; prebook-row view lint passed; build passed with existing warnings; focused Playwright passed 2/2.

### Changes
- Files created: `src/pages/itinerary-details/QuotationPrebookHotelRows.tsx`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: TBO prebook hotel detail rendering now lives in a typed component, including cancellation policy, room promotion, rate conditions, amenities, package inclusions, and supplement handling; controller-owned normalization helpers are injected unchanged.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `QuotationPrebookHotelRows.tsx`; unrelated repository errors remain.
- Lint: new prebook-row component passes ESLint; repository baseline remains failing.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: latest explicit broad command timed out at the documented command limit.

### Line counts
- Transitional `ItineraryDetailsController.tsx`: 11,890 lines (down from 12,005 at the previous checkpoint).
- New `QuotationPrebookHotelRows.tsx`: 161 lines.
- Stable `ItineraryDetails.tsx`: 14 lines.

### Notes
- Non-TBO selected-hotel review rows and the surrounding prebook summary remain in the controller for a subsequent provider-specific extraction.

## Iteration 110 — Prebook acceptance notice extraction

### Baseline
- Tests run: targeted typecheck/lint filtered to the changed controller/acceptance-notice files, production build, and the focused Fit Here/hotspot Playwright pair.
- Result: no changed-file type errors; acceptance-notice view lint passed; build passed with existing warnings; focused Playwright passed 2/2.

### Changes
- Files created: `src/pages/itinerary-details/QuotationPrebookAcceptanceNotice.tsx`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: prebook changed-price warning and hotel-detail acknowledgement checkbox now render in a dedicated typed view; acceptance state remains controller-owned.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `QuotationPrebookAcceptanceNotice.tsx`; unrelated repository errors remain.
- Lint: new acceptance-notice component passes ESLint; repository baseline remains failing.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: latest explicit broad command timed out at the documented command limit.

### Line counts
- Transitional `ItineraryDetailsController.tsx`: 11,881 lines (down from 11,890 at the previous checkpoint).
- New `QuotationPrebookAcceptanceNotice.tsx`: 29 lines.
- Stable `ItineraryDetails.tsx`: 14 lines.

### Notes
- The non-TBO hotel review and prebook summary remain the next quotation review boundaries; no provider data or booking payload semantics were changed.

## Iteration 111 — Hotspot dialog header extraction

### Baseline
- Tests run: targeted typecheck/lint filtered to the changed controller/hotspot-header files, production build, and the focused Fit Here/hotspot Playwright pair.
- Result: no changed-file type errors; hotspot-header view lint passed; build passed with existing warnings; focused Playwright passed 2/2.

### Changes
- Files created: `src/pages/itinerary-details/components/HotspotDialogHeader.tsx`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: Add Hotspot dialog title, destination-context description, and search field now render in a dedicated component; query state and context remain controller-owned.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `HotspotDialogHeader.tsx`; unrelated repository errors remain.
- Lint: new hotspot-header component passes ESLint; repository baseline remains failing.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: latest explicit broad command timed out at the documented command limit.

### Line counts
- Transitional `ItineraryDetailsController.tsx`: 11,869 lines (down from 11,881 at the previous checkpoint).
- New `HotspotDialogHeader.tsx`: 39 lines.
- Stable `ItineraryDetails.tsx`: 14 lines.

### Notes
- The hotspot list and preview/action pane remain coupled to Fit Here/matrix state and require a larger typed boundary in a subsequent iteration.

## Iteration 112 — Hotspot city-tabs extraction

### Baseline
- Tests run: targeted typecheck/lint filtered to the changed controller/city-tabs files, production build, and the focused Fit Here/hotspot Playwright pair.
- Result: no changed-file type errors; city-tabs view lint passed; build passed with existing warnings; focused Playwright passed 2/2.

### Changes
- Files created: `src/pages/itinerary-details/components/HotspotCityTabs.tsx`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: route-different-city tab rendering and active-tab button behavior now render in a dedicated component; active-tab state and visibility predicate remain unchanged.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `HotspotCityTabs.tsx`; unrelated repository errors remain.
- Lint: new city-tabs component passes ESLint; repository baseline remains failing.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: latest explicit broad command timed out at the documented command limit.

### Line counts
- Transitional `ItineraryDetailsController.tsx`: 11,853 lines (down from 11,869 at the previous checkpoint).
- New `HotspotCityTabs.tsx`: 48 lines.
- Stable `ItineraryDetails.tsx`: 14 lines.

### Notes
- Hotspot card status/preview/delete actions remain coupled to Fit Here and matrix state for a later larger extraction.

## Iteration 113 — Hotspot list-state extraction

### Baseline
- Tests run: targeted typecheck/lint filtered to the changed controller/list-state files, production build, and the focused Fit Here/hotspot Playwright pair.
- Result: no changed-file type errors; list-state view lint passed; build passed with existing warnings; focused Playwright passed 2/2.

### Changes
- Files created: `src/pages/itinerary-details/components/HotspotListState.tsx`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: loading and no-results messaging for the Add Hotspot list now render in a dedicated view; hotspot data and search state remain unchanged.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `HotspotListState.tsx`; unrelated repository errors remain.
- Lint: new list-state component passes ESLint; repository baseline remains failing.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: latest explicit broad command timed out at the documented command limit.

### Line counts
- Transitional `ItineraryDetailsController.tsx`: 11,851 lines (down from 11,853 at the previous checkpoint).
- New `HotspotListState.tsx`: 26 lines.
- Stable `ItineraryDetails.tsx`: 14 lines.

### Notes
- Hotspot cards and Fit Here/matrix action controls remain the next high-coupling hotspot view boundary.

## Iteration 115 — Hotspot selection notice extraction

### Baseline
- Tests run: targeted typecheck/lint filtered to the changed controller/selection-notice files, production build, and the focused Fit Here/hotspot Playwright pair.
- Result: no changed-file type errors; selection notice lint passed; build passed with existing warnings; focused Playwright passed 2/2.

### Changes
- Files created: `src/pages/itinerary-details/components/HotspotSelectionNotice.tsx`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: Fit Here selection-mode guidance now renders in a dedicated component; preview validation and action state remain unchanged.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `HotspotSelectionNotice.tsx`; unrelated repository errors remain.
- Lint: new selection notice component passes ESLint; repository baseline remains failing.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: latest explicit broad command timed out at the documented command limit.

### Line counts
- Transitional `ItineraryDetailsController.tsx`: 11,841 lines (down from 11,847 at the previous checkpoint).
- New `HotspotSelectionNotice.tsx`: 11 lines.
- Stable `ItineraryDetails.tsx`: 14 lines.

### Notes
- The remaining hotspot action button and preview timeline contain high-coupling matrix/conflict decisions and remain deferred for a larger controller/view boundary.

## Iteration 116 — Hotspot dialog footer extraction

### Baseline
- Tests run: targeted typecheck/lint filtered to the changed controller/dialog-footer files, production build, and the focused Fit Here/hotspot Playwright pair.
- Result: no changed-file type errors; dialog-footer view lint passed; build passed with existing warnings; focused Playwright passed 2/2.

### Changes
- Files created: `src/pages/itinerary-details/components/HotspotDialogFooter.tsx`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: Add Hotspot dialog close-button/footer presentation now renders in a dedicated component; the existing cleanup/reset callback remains unchanged and injected.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `HotspotDialogFooter.tsx`; unrelated repository errors remain.
- Lint: new dialog-footer component passes ESLint; repository baseline remains failing.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: latest explicit broad command timed out at the documented command limit.

### Line counts
- Transitional `ItineraryDetailsController.tsx`: 11,837 lines (down from 11,841 at the previous checkpoint).
- New `HotspotDialogFooter.tsx`: 18 lines.
- Stable `ItineraryDetails.tsx`: 14 lines.

### Notes
- Matrix/conflict action controls and preview timeline remain the next high-coupling hotspot boundary.

## Iteration 117 — Hotspot apply-button extraction

### Baseline
- Tests run: targeted typecheck/lint filtered to the changed controller/apply-button files, production build, and the focused Fit Here/hotspot Playwright pair.
- Result: no changed-file type errors; apply-button view lint passed; build passed with existing warnings; focused Playwright passed 2/2.

### Changes
- Files created: `src/pages/itinerary-details/components/HotspotApplyButton.tsx`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: hotspot preview apply-button presentation, loading state, conflict styling, disabled state, and action labels now render in a dedicated component; matrix/conflict decision predicates remain unchanged in the controller.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `HotspotApplyButton.tsx`; unrelated repository errors remain.
- Lint: new apply-button component passes ESLint; repository baseline remains failing.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: latest explicit broad command timed out at the documented command limit.

### Line counts
- Transitional `ItineraryDetailsController.tsx`: 11,829 lines (down from 11,837 at the previous checkpoint).
- New `HotspotApplyButton.tsx`: 34 lines.
- Stable `ItineraryDetails.tsx`: 14 lines.

### Notes
- Fit Here/matrix decision computation and preview timeline rendering remain coupled and are deferred for a larger boundary extraction.

## Iteration 114 — Non-TBO acceptance notice extraction

### Baseline
- Tests run: targeted typecheck/lint filtered to the changed controller/acceptance-notice files, production build, and the focused Fit Here/hotspot Playwright pair.
- Result: no changed-file type errors; non-TBO acceptance view lint passed; build passed with existing warnings; focused Playwright passed 2/2.

### Changes
- Files created: `src/pages/itinerary-details/QuotationNonTboAcceptanceNotice.tsx`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: the non-TBO selected-hotel acknowledgement checkbox now renders in a dedicated view; shared acceptance state remains unchanged.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `QuotationNonTboAcceptanceNotice.tsx`; unrelated repository errors remain.
- Lint: new non-TBO acceptance component passes ESLint; repository baseline remains failing.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: latest explicit broad command timed out at the documented command limit.

### Line counts
- Transitional `ItineraryDetailsController.tsx`: 11,847 lines (down from 11,851 at the previous checkpoint).
- New `QuotationNonTboAcceptanceNotice.tsx`: 19 lines.
- Stable `ItineraryDetails.tsx`: 14 lines.

### Notes
- Non-TBO hotel card rendering remains coupled to legacy provider-display strings and is deferred until an encoding-safe typed extraction is available.

## Iteration 89 - Quotation hotel-selection preparation

### Baseline
- Tests run: targeted controller/new-hook typecheck filter, focused hotspot Playwright pair, and production build.
- Result: no type errors from the controller or new hook; focused pair 2 passed; build passed with existing repository warnings.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useQuotationHotelSelectionPreparation.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: confirmation-time provider discovery, persisted hotel backfill, missing-route provider matching, external-stay fallback selection, and selected-booking synchronization.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `useQuotationHotelSelectionPreparation.ts`; unrelated repository errors remain.
- Lint: new hook passes ESLint; repository baseline remains failing as documented.
- Targeted Playwright: 2 passed.
- Production build: passed with existing warnings.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 13,260 lines.
- New `useQuotationHotelSelectionPreparation.ts`: 104 lines.

### Notes
- The confirmation payload and prebook flow retain the prepared selection map and group type exactly as before; only ownership moved.
- Follow-up extraction: quotation confirmation orchestration and the remaining hotel/vehicle workflow boundaries.

## Iteration 90 - Quotation passenger payload construction

### Baseline
- Tests run: targeted controller/new-hook typecheck filter, focused hotspot Playwright pair, and production build.
- Result: no type errors from the controller or validation hook; focused pair 2 passed; build passed with existing repository warnings.

### Changes
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `src/pages/itinerary-details/hooks/useQuotationPassengerValidation.ts`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: primary and additional passenger booking-payload construction now follows the existing validation/normalization boundary.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `useQuotationPassengerValidation.ts`; unrelated repository errors remain.
- Lint: validation hook passes ESLint; repository baseline remains failing as documented.
- Targeted Playwright: 2 passed.
- Production build: passed with existing warnings.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 13,188 lines.
- `useQuotationPassengerValidation.ts`: 198 lines.

### Notes
- Passenger fields, title/pax-type mapping, lead-passenger flag, and optional document/contact handling remain unchanged; only ownership moved.
- Follow-up extraction: quotation occupancy/payload assembly and confirmation orchestration.

## Iteration 91 - Quotation occupancy utilities

### Baseline
- Tests run: targeted controller/new-utility typecheck filter, focused hotspot Playwright pair, and production build.
- Result: no type errors from the controller or new utility; focused pair 2 passed; build passed with existing repository warnings.

### Changes
- Files created: `src/pages/itinerary-details/utils/quotationOccupancy.utils.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: TBO/supplier occupancy distribution, traveller-derived occupancy hydration, and confirmation-template child-age normalization.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `quotationOccupancy.utils.ts`; unrelated repository errors remain.
- Lint: new utility passes ESLint; repository baseline remains failing as documented.
- Targeted Playwright: 2 passed.
- Production build: passed with existing warnings.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 13,043 lines.
- New `quotationOccupancy.utils.ts`: 144 lines.

### Notes
- Occupancy limits, round-robin adult/child assignment, fallback child age, and template age rules remain unchanged; only ownership moved.
- Follow-up extraction: quotation hotel-booking payload assembly and final confirmation orchestration.

## Iteration 92 - Quotation confirmation payload utility

### Baseline
- Tests run: targeted controller/new-utility typecheck filter, focused hotspot Playwright pair, and production build.
- Result: no type errors from the controller or new utility; focused pair 2 passed; build passed with existing repository warnings.

### Changes
- Files created: `src/pages/itinerary-details/utils/quotationConfirmation.utils.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: final guest/passenger arrays, hotel-booking metadata, route IDs, prebook context, and price-confirmation request shape.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `quotationConfirmation.utils.ts`; unrelated repository errors remain.
- Lint: new utility passes ESLint; repository baseline remains failing as documented.
- Targeted Playwright: 2 passed.
- Production build: passed with existing warnings.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 13,029 lines.
- New `quotationConfirmation.utils.ts`: 91 lines.

### Notes
- Request field names, optional hotel-flow fields, passenger arrays, and prebook route metadata remain unchanged; only pure assembly moved.
- Follow-up extraction: final confirmation response/reset orchestration and remaining hotel/vehicle workflow boundaries.

## Iteration 93 - Quotation hotel-booking row utility

### Baseline
- Tests run: targeted controller/new-utility typecheck filter, focused hotspot Playwright pair, and production build.
- Result: no type errors from the controller or new utility; focused pair 2 passed; build passed with existing repository warnings.

### Changes
- Files created: `src/pages/itinerary-details/utils/quotationHotelBookings.utils.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: supplier-bookable filtering and provider-neutral hotel booking row construction, including occupancy, passenger, pricing, session, and multi-night metadata.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `quotationHotelBookings.utils.ts`; unrelated repository errors remain.
- Lint: new utility passes ESLint; repository baseline remains failing as documented.
- Targeted Playwright: 2 passed.
- Production build: passed with existing warnings.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 13,003 lines.
- New `quotationHotelBookings.utils.ts`: 76 lines.

### Notes
- Provider inference, supplier-bookable guards, amount conversion, and attached passengers remain unchanged; only pure row normalization moved.
- Follow-up extraction: final confirmation response/reset orchestration and remaining hotel/vehicle workflow boundaries.

## Iteration 94 - Quotation prebook selection utility

### Baseline
- Tests run: targeted controller/new-utility typecheck filter, focused hotspot Playwright pair, and production build.
- Result: no type errors from the controller or new utility; focused pair 2 passed; build passed with existing repository warnings.

### Changes
- Files created: `src/pages/itinerary-details/utils/quotationPrebookSelections.utils.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: persisted supplier-row backfill, uncovered-route detection, cheapest-per-route recommendation selection, and prebook selection-map normalization.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `quotationPrebookSelections.utils.ts`; unrelated repository errors remain.
- Lint: new utility passes ESLint; repository baseline remains failing as documented.
- Targeted Playwright: 2 passed.
- Production build: passed with existing warnings.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 12,906 lines.
- New `quotationPrebookSelections.utils.ts`: 109 lines.

### Notes
- Explicit in-session selections remain authoritative; persisted rows only fill uncovered routes and recommended cheapest rows fill remaining routes as before.
- Follow-up extraction: final confirmation response/reset orchestration and remaining hotel/vehicle workflow boundaries.

## Iteration 95 - Quotation confirmation completion

### Baseline
- Tests run: targeted controller/new-hook typecheck filter, focused hotspot Playwright pair, and production build.
- Result: no type errors from the controller or new hook; focused pair 2 passed; build passed with existing repository warnings.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useQuotationConfirmationCompletion.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: confirmation success toast/modal close, confirmed-plan hotel hydration, selection/loading cleanup, and guest/prebook form reset.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `useQuotationConfirmationCompletion.ts`; unrelated repository errors remain.
- Lint: new hook passes ESLint; repository baseline remains failing as documented.
- Targeted Playwright: 2 passed.
- Production build: passed with existing warnings.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 12,864 lines.
- New `useQuotationConfirmationCompletion.ts`: 120 lines.

### Notes
- Success sequencing, confirmed-plan fallback warning, reset defaults, and loading cleanup remain unchanged; only ownership moved.
- Follow-up extraction: remaining quotation guards and vehicle workflow boundaries.

## Iteration 96 - Quotation booking guards

### Baseline
- Tests run: targeted controller/new-hook typecheck filter, focused hotspot Playwright pair, and production build.
- Result: no type errors from the controller or new hook; focused pair 2 passed; build passed with existing repository warnings.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useQuotationBookingGuards.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: mixed-provider approval, supplier/stale-session guards, TBO prebook presence and total checks, review acknowledgement, and client-IP resolution.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `useQuotationBookingGuards.ts`; unrelated repository errors remain.
- Lint: new hook passes ESLint; repository baseline remains failing as documented.
- Targeted Playwright: 2 passed.
- Production build: passed with existing warnings.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 12,797 lines.
- New `useQuotationBookingGuards.ts`: 121 lines.

### Notes
- Provider prompts, stale-session timeout, prebook mismatch threshold, acknowledgement requirement, fallback IP, and toast messages remain unchanged; only ownership moved.
- Follow-up extraction: remaining quotation route/prebook context assembly and vehicle workflow boundaries.

## Iteration 97 - Quotation route/prebook context

### Baseline
- Tests run: targeted controller/new-utility typecheck filter, focused hotspot Playwright pair, and production build.
- Result: no type errors from the controller or new utility; focused pair 2 passed; build passed with existing repository warnings.

### Changes
- Files created: `src/pages/itinerary-details/utils/quotationHotelRouteContext.utils.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: prebook-context matching and selected/external hotel route-id derivation for the final confirmation request.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `quotationHotelRouteContext.utils.ts`; unrelated repository errors remain.
- Lint: new utility passes ESLint; repository baseline remains failing as documented.
- Targeted Playwright: 2 passed.
- Production build: passed with existing warnings.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 12,772 lines.
- New `quotationHotelRouteContext.utils.ts`: 53 lines.

### Notes
- Matching keys, route expansion, positive numeric filtering, and external-stay route handling remain unchanged; only pure derivation moved.
- Follow-up extraction: remaining vehicle workflow boundaries and larger quotation modal/view composition.

## Iteration 98 - Vehicle build controller

### Baseline
- Tests run: targeted controller/new-hook typecheck filter, focused hotspot Playwright pair, and production build.
- Result: no type errors from the controller or new hook; first Playwright attempt encountered a transient hotspot fixture API 500, rerun passed 2/2; build passed with existing repository warnings.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useVehicleBuildController.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: vehicle build-status lookup, permit/vehicle rebuild, route-option strictness, completed-details validation, and non-suggested fallback behavior.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `useVehicleBuildController.ts`; unrelated repository errors remain.
- Lint: new hook passes ESLint; repository baseline remains failing as documented.
- Targeted Playwright: rerun 2 passed after transient fixture 500.
- Production build: passed with existing warnings.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 12,687 lines.
- New `useVehicleBuildController.ts`: 108 lines.

### Notes
- Build-status normalization, loader-stage labels, strict suggested-route failure behavior, fallback warning, and final hydration sequencing remain unchanged.
- Unrelated concurrent edits in `ConfirmedItineraries.tsx` and `services/itinerary.ts` were intentionally left out of this checkpoint.
- Follow-up extraction: vehicle list derivation/rendering and larger quotation/hotspot controller boundaries.

## Iteration 99 - Vehicle section composition

### Baseline
- Tests run: targeted controller/new-component typecheck filter, focused hotspot Playwright pair, and production build.
- Result: no type errors from the controller or component; focused pair 2 passed; build passed with existing repository warnings.

### Changes
- Files created: `src/pages/itinerary-details/components/VehicleSection.tsx`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: vehicle-type grouping, cheapest-row assignment marking, route-label preparation, and `VehicleList` rendering.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `VehicleSection.tsx`; unrelated repository errors remain.
- Lint: new component passes ESLint; repository baseline remains failing as documented.
- Targeted Playwright: 2 passed.
- Production build: passed with existing warnings.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 12,619 lines.
- New `VehicleSection.tsx`: 74 lines.

### Notes
- Vehicle grouping order, amount sort, assignment identity fallback, day labels, and child callbacks remain unchanged; only section ownership moved.
- Follow-up extraction: vehicle empty-state/presentation cleanup and larger quotation/hotspot controller boundaries.

## Iteration 71 - Hotspot deletion mutation boundary

### Baseline
- Tests run: targeted controller/new-hook typecheck filter, focused hotspot Playwright pair, and production build.
- Result: no type errors from the controller or new hook; focused pair 2 passed; build passed with existing repository warnings.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useHotspotDeleteMutation.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: hotspot delete service invocation, optimistic timeline/exclusion cleanup, delete-modal reset, rebuild marker, details/hotel refresh, and available-hotspot modal rehydration.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `useHotspotDeleteMutation.ts`; unrelated repository errors remain.
- Lint: new hook passes ESLint; repository baseline remains failing as documented.
- Targeted Playwright: 2 passed.
- Production build: passed with existing warnings.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 14,506 lines.
- New `useHotspotDeleteMutation.ts`: 130 lines.

### Notes
- The old inline hotspot deletion implementation was removed after the new hook passed verification; the controller now has one active delete path.
- Follow-up extraction: Fit Here action controller/modal view, vehicle workflow, and quotation review/submission.

## Iteration 72 - Hotspot matrix recovery boundary

### Baseline
- Tests run: targeted controller/new-hook typecheck filter, focused hotspot Playwright pair, and production build.
- Result: no type errors from the controller or new hook; focused pair 2 passed; build passed with existing repository warnings.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useHotspotMatrixPreviewController.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: destination-side re-preview, missing city-matrix build, backend result-code handling, and matrix-triggered manual preview retry.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `useHotspotMatrixPreviewController.ts`; unrelated repository errors remain.
- Lint: new hook passes ESLint; repository baseline remains failing as documented.
- Targeted Playwright: 2 passed.
- Production build: passed with existing warnings.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 14,449 lines.
- New `useHotspotMatrixPreviewController.ts`: 104 lines.

### Notes
- Matrix result-code behavior and toast wording remain unchanged; only ownership moved.
- Follow-up extraction: manual hotspot preview mutation and Fit Here confirmation workflow.

## Iteration 73 - Manual hotspot preview mutation boundary

### Baseline
- Tests run: targeted controller/new-hook typecheck filter, focused hotspot Playwright pair, and production build.
- Result: no type errors from the controller or new hook; focused pair 2 passed; build passed with existing repository warnings.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useHotspotPreviewMutation.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: manual preview API invocation, stale-request guard, preview timeline/resolution state, anchor-adjustment toast, and preview cancellation cleanup.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `useHotspotPreviewMutation.ts`; unrelated repository errors remain.
- Lint: new hook passes ESLint; repository baseline remains failing as documented.
- Targeted Playwright: 2 passed.
- Production build: passed with existing warnings.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 14,343 lines.
- New `useHotspotPreviewMutation.ts`: 156 lines.

### Notes
- Preview request payloads, response normalization, and toast wording remain unchanged; only ownership moved.
- Follow-up extraction: priority-replacement/matrix-confirmation action and Fit Here confirmation workflow.

## Iteration 74 - Hotspot priority replacement controller

### Baseline
- Tests run: targeted controller/new-hook typecheck filter, focused hotspot Playwright pair, and production build.
- Result: no type errors from the controller or new hook; focused pair 2 passed; build passed with existing repository warnings.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useHotspotPriorityReplacementController.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: protected-priority removal detection, approval re-preview, approval state updates, and cancellation cleanup.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `useHotspotPriorityReplacementController.ts`; unrelated repository errors remain.
- Lint: new hook passes ESLint; repository baseline remains failing as documented.
- Targeted Playwright: 2 passed.
- Production build: passed with existing warnings.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 14,316 lines.
- New `useHotspotPriorityReplacementController.ts`: 58 lines.

### Notes
- Approval flags and preview request semantics remain unchanged; only ownership moved.
- Follow-up extraction: Fit Here confirmation mutation and its timeline refresh path.

## Iteration 83 - Activity mutation controller

### Baseline
- Tests run: targeted controller/new-hook typecheck filter, focused hotspot Playwright pair, and production build.
- Result: no type errors from the controller or new hook; focused pair 2 passed; build passed with existing repository warnings.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useActivityMutationController.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: activity add conflict confirmation, add/delete service calls, modal cleanup, and independent itinerary/hotel refresh behavior.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `useActivityMutationController.ts`; unrelated repository errors remain.
- Lint: new hook passes ESLint; repository baseline remains failing as documented.
- Targeted Playwright: 2 passed.
- Production build: passed with existing warnings.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 13,893 lines.
- New `useActivityMutationController.ts`: 148 lines.

### Notes
- Conflict override payloads, modal reset values, and best-effort hotel refresh semantics remain unchanged; only ownership moved.
- Follow-up extraction: vehicle workflow actions and remaining Fit Here confirmation orchestration.

## Iteration 85 - Quotation passenger validation boundary

### Baseline
- Tests run: targeted controller/new-hook typecheck filter, focused hotspot Playwright pair, and production build.
- Result: no type errors from the controller or new hook; focused pair 2 passed; build passed with existing repository warnings.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useQuotationPassengerValidation.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: primary/additional passenger sanitization, title/name/nationality/age/PAN validation, expected-count checks, and form-error/toast handling.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `useQuotationPassengerValidation.ts`; unrelated repository errors remain.
- Lint: new hook passes ESLint; repository baseline remains failing as documented.
- Targeted Playwright: 2 passed.
- Production build: passed with existing warnings.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 13,825 lines.
- New `useQuotationPassengerValidation.ts`: 109 lines.

### Notes
- Validation messages, normalized passenger fields, and age/title rules remain unchanged; only ownership moved.
- Follow-up extraction: quotation hotel-selection/prebook preparation and cleanup of the legacy vehicle clipboard fragment.

## Iteration 86 - Remove legacy vehicle clipboard fragment

### Baseline
- Tests run: focused hotspot Playwright pair and production build after removing the inline vehicle-only clipboard implementation.
- Result: focused pair 2 passed; build passed with existing repository warnings.

### Changes
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code removed: duplicate inline vehicle-only clipboard fetch/HTML cleanup/signature relocation implementation; all call sites use `useVehicleOnlyClipboardAction`.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from the controller or extracted vehicle clipboard action; unrelated repository errors remain.
- Lint: extracted vehicle clipboard hook passes ESLint; repository baseline remains failing as documented.
- Targeted Playwright: 2 passed.
- Production build: passed with existing warnings.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 13,627 lines.
- `useVehicleOnlyClipboardAction.ts`: 97 lines.

### Notes
- This cleanup removes the final duplicate vehicle-only clipboard path and leaves one owner for that workflow.
- Follow-up extraction: quotation hotel-selection/prebook preparation and confirmation orchestration.

## Iteration 88 - Manual hotspot application mutation

### Baseline
- Tests run: targeted controller/new-hook typecheck filter, focused hotspot Playwright pair, and production build.
- Result: no type errors from the controller or new hook; focused pair 2 passed; build passed with existing repository warnings.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useHotspotAddMutation.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: manual hotspot apply guards/payload, conflict and priority handling, optimistic availability state, route rebuild marking, details/hotel refresh, and background available-hotspot refresh.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `useHotspotAddMutation.ts`; unrelated repository errors remain.
- Lint: new hook passes ESLint; repository baseline remains failing as documented.
- Targeted Playwright: 2 passed.
- Production build: passed with existing warnings.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 13,343 lines.
- New `useHotspotAddMutation.ts`: 157 lines.

### Notes
- Manual add success/error messages and optimistic modal behavior remain unchanged; only ownership moved.
- Follow-up extraction: quotation hotel-selection/prebook preparation and confirmation orchestration.

## Iteration 87 - Broader regression checkpoint

### Baseline
- Tests run: `npx.cmd playwright test itinerary --project=chromium --workers=8`.
- Result: 34 tests; 9 passed, 2 skipped, 23 failed. The focused hotspot pair remains 2/2 passed.

### Classification
- Shared Fit Here/APJ records are mutated by parallel tests.
- PHP/Nest parity still differs at logout/login redirect resolution.
- Vehicle-only test failures remain backend processing/data visibility issues.

### Changes
- Files modified: `REGRESSION_LOG.md`, `PROGRESS_LOG.md`.
- Behaviour intentionally changed: No.

### Notes
- This is a verification-only checkpoint; no test weakening or application workaround was added.
- Follow-up extraction: quotation hotel-selection/prebook preparation and confirmation orchestration.

## Iteration 84 - Vehicle-only clipboard action boundary

### Baseline
- Tests run: targeted controller/new-hook typecheck filter, focused hotspot Playwright pair, and production build.
- Result: no type errors from the controller or new hook; focused pair 2 passed; build passed with existing repository warnings.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useVehicleOnlyClipboardAction.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: vehicle-only backend clipboard retrieval, hotel-row stripping, vehicle amount-label cleanup, highlights replacement/signature relocation, and clipboard copy/toast behavior.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `useVehicleOnlyClipboardAction.ts`; unrelated repository errors remain.
- Lint: new hook passes ESLint; repository baseline remains failing as documented.
- Targeted Playwright: 2 passed.
- Production build: passed with existing warnings.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 13,903 lines.
- New `useVehicleOnlyClipboardAction.ts`: 97 lines.

### Notes
- Vehicle-only call-site behavior now uses the extracted action. The old inline implementation remains as a temporary compatibility fragment and is the immediate cleanup follow-up.

## Iteration 82 - Fit Here confirmation refresh boundary

### Baseline
- Tests run: targeted controller/new-hook typecheck filter, focused hotspot Playwright pair, and production build.
- Result: no type errors from the controller or new hook; focused pair 2 passed; build passed with existing repository warnings.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useFitHereConfirmationRefresh.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: confirmed-route details hydration, optional hotel refresh, and route-scoped timeline merge after confirmation.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `useFitHereConfirmationRefresh.ts`; unrelated repository errors remain.
- Lint: new hook passes ESLint; repository baseline remains failing as documented.
- Targeted Playwright: 2 passed.
- Production build: passed with existing warnings.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 14,008 lines.
- New `useFitHereConfirmationRefresh.ts`: 33 lines.

### Notes
- Quote/hotel refresh gating and route merge semantics remain unchanged; only ownership moved.
- Follow-up extraction: Fit Here confirmation mutation and its timeline refresh path.

## Iteration 81 - Fit Here confirmation state controller

### Baseline
- Tests run: targeted controller/new-hook typecheck filter, focused hotspot Playwright pair, and production build.
- Result: no type errors from the controller or new hook; focused pair 2 passed; build passed with existing repository warnings.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useFitHereConfirmationState.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: optimistic added/excluded hotspot state, availability-row updates, normalized confirmed timeline replacement, and route rebuild marking.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `useFitHereConfirmationState.ts`; unrelated repository errors remain.
- Lint: new hook passes ESLint; repository baseline remains failing as documented.
- Targeted Playwright: 2 passed.
- Production build: passed with existing warnings.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 14,022 lines.
- New `useFitHereConfirmationState.ts`: 82 lines.

### Notes
- Optimistic updates, normalized segment fallback, and rebuild-marker semantics remain unchanged; only ownership moved.
- Follow-up extraction: Fit Here confirmation mutation and its timeline refresh path.

## Iteration 80 - Fit Here confirmation reset boundary

### Baseline
- Tests run: targeted controller/new-hook typecheck filter, focused hotspot Playwright pair, and production build.
- Result: no type errors from the controller or new hook; focused pair 2 passed; build passed with existing repository warnings.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useFitHereConfirmationReset.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: successful-insertion reset of selected hotspot, active preview, timeline/resolution caches, modal state, and tried-anchor state.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `useFitHereConfirmationReset.ts`; unrelated repository errors remain.
- Lint: new hook passes ESLint; repository baseline remains failing as documented.
- Targeted Playwright: 2 passed.
- Production build: passed with existing warnings.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 14,089 lines.
- New `useFitHereConfirmationReset.ts`: 68 lines.

### Notes
- Reset values and modal closure semantics remain unchanged; only ownership moved.
- Follow-up extraction: Fit Here confirmation mutation and its timeline refresh path.

## Iteration 79 - Fit Here confirmation response normalization

### Baseline
- Tests run: targeted controller/new-module typecheck filter, focused hotspot Playwright pair, and production build.
- Result: no type errors from the controller or updated utility; focused pair 2 passed; build passed with existing repository warnings.

### Changes
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `src/pages/itinerary-details/utils/fitHereConfirm.utils.ts`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: confirmation result ID resolution, authoritative timeline selection, inserted route-hotspot lookup, and removed-hotspot ID normalization.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `fitHereConfirm.utils.ts`; unrelated repository errors remain.
- Lint: updated utility passes ESLint; repository baseline remains failing as documented.
- Targeted Playwright: 2 passed.
- Production build: passed with existing warnings.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 14,101 lines.
- `fitHereConfirm.utils.ts`: 147 lines.

### Notes
- Backend response precedence and removed-ID semantics remain unchanged; only pure normalization moved.
- Follow-up extraction: Fit Here confirmation mutation and its timeline refresh path.

## Iteration 78 - Fit Here confirmation analysis helper

### Baseline
- Tests run: targeted controller/new-module typecheck filter, focused hotspot Playwright pair, and production build.
- Result: no type errors from the controller or updated utility; focused pair 2 passed; build passed with existing repository warnings.

### Changes
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `src/pages/itinerary-details/utils/fitHereConfirm.utils.ts`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: removal-row aggregation, acknowledgement normalization, timing/priority risk analysis, protected-removal detection, and conflict-force eligibility.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `fitHereConfirm.utils.ts`; unrelated repository errors remain.
- Lint: updated utility passes ESLint; repository baseline remains failing as documented.
- Targeted Playwright: 2 passed.
- Production build: passed with existing warnings.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 14,137 lines.
- `fitHereConfirm.utils.ts`: 97 lines.

### Notes
- Confirmation guard conditions and payload inputs remain unchanged; only pure analysis moved.
- Follow-up extraction: Fit Here confirmation mutation and its timeline refresh path.

## Iteration 77 - Fit Here confirmation error helpers

### Baseline
- Tests run: targeted controller/new-module typecheck filter, focused hotspot Playwright pair, and production build.
- Result: no type errors from the controller or new utility; focused pair 2 passed; build passed with existing repository warnings.

### Changes
- Files created: `src/pages/itinerary-details/utils/fitHereConfirm.utils.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: retryable-confirm classification, confirmation error-code extraction, and expired/missing attempt classification.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `fitHereConfirm.utils.ts`; unrelated repository errors remain.
- Lint: new utility passes ESLint; repository baseline remains failing as documented.
- Targeted Playwright: 2 passed.
- Production build: passed with existing warnings.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 14,170 lines.
- New `fitHereConfirm.utils.ts`: 39 lines.

### Notes
- Existing error matching and fallback code extraction are unchanged; only pure logic moved.
- Follow-up extraction: Fit Here confirmation mutation and its timeline refresh path.

## Iteration 76 - Fit Here dialog controller

### Baseline
- Tests run: targeted controller/new-hook typecheck filter, focused hotspot Playwright pair, and production build.
- Result: no type errors from the controller or new hook; focused pair 2 passed; build passed with existing repository warnings.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useFitHereDialogController.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: Fit Here cancel state reset, tried-anchor bookkeeping, retry payload validation, and retry dispatch.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `useFitHereDialogController.ts`; unrelated repository errors remain.
- Lint: new hook passes ESLint; repository baseline remains failing as documented.
- Targeted Playwright: 2 passed.
- Production build: passed with existing warnings.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 14,208 lines.
- New `useFitHereDialogController.ts`: 60 lines.

### Notes
- Dialog reset shape and retry behavior remain unchanged; only ownership moved.
- Follow-up extraction: Fit Here confirmation mutation and its timeline refresh path.

## Iteration 75 - Exact-anchor Fit Here preview controller

### Baseline
- Tests run: targeted controller/new-hook typecheck filter, focused hotspot Playwright pair, and production build.
- Result: no type errors from the controller or new hook; focused pair 2 passed; build passed with existing repository warnings.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useFitHerePreviewController.ts`.
- Files modified: `src/pages/ItineraryDetailsController.tsx`, `ARCHITECTURE_MAP.md`, `FINAL_REPORT.md`.
- Code moved: exact-anchor payload construction, Fit Here preview API call, progress state transitions, stale-free success/error state, and toast handling.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from `ItineraryDetailsController.tsx` or `useFitHerePreviewController.ts`; unrelated repository errors remain.
- Lint: new hook passes ESLint; repository baseline remains failing as documented.
- Targeted Playwright: 2 passed.
- Production build: passed with existing warnings.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsController.tsx`: 14,237 lines.
- New `useFitHerePreviewController.ts`: 109 lines.

### Notes
- Exact anchor fields, progress timing, and retry payload semantics remain unchanged; only ownership moved.
- Follow-up extraction: Fit Here confirmation mutation and its timeline refresh path.

## Iteration 52 — Hotel rebuild mutation boundary

### Changes

- Created `src/pages/itinerary-details/hooks/useHotelDataController.ts`.
- Moved hotel rebuild orchestration (rebuild request, details refresh, complete hotel hydration, loading state, and existing toast messages) out of `ItineraryDetailsController.tsx`.
- Preserved the existing `ItineraryService` calls, group-type argument, cache update, and rebuild button callback contract.
- Behaviour intentionally changed: No.

### Verification

- Typecheck: no errors from `ItineraryDetailsController.tsx` or `useHotelDataController.ts`; existing repository errors remain documented.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).
- Lint: repository baseline remains failing; no lint-only changes made.

### Line counts

- `ItineraryDetailsController.tsx`: 15,416 physical lines after extraction.
- `useHotelDataController.ts`: 143 physical lines.

### Notes

- The hook currently owns the rebuild mutation while adjacent refresh/group-switch callbacks remain in the controller for a follow-up pass; this keeps the first mutation extraction small and behaviorally auditable.

## Iteration 53 — Hotel refresh callback boundary

### Changes

- Moved `refreshVehicleData` and `handleHotelGroupTypeChange` into `useHotelDataController`.
- Preserved the existing vehicle-row diagnostics, group-type API request, and fallback that retains known vehicle rows when a group-type response omits them.
- Behaviour intentionally changed: No.

### Verification

- Typecheck: no errors from the modified controller or hotel data hook; existing repository errors remain documented.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).

### Line counts

- `ItineraryDetailsController.tsx`: 15,365 physical lines after extraction.
- `useHotelDataController.ts`: 143 physical lines.

### Notes

- The remaining `refreshHotelData` callback is intentionally deferred because its legacy diagnostic strings use repository mojibake; it will be removed with the surrounding hotel mutation workflow boundary once that region is extracted safely.

## Iteration 54 — Hotel voucher workflow boundary

### Changes

- Created `src/pages/itinerary-details/hooks/useHotelVoucherController.ts`.
- Moved voucher modal selection, save-function registration, single-voucher cancellation setup, and bulk voucher cancellation/API orchestration out of `ItineraryDetailsController.tsx`.
- Preserved cancellation validation, reason prompt, service payload, success/error toast wording, and post-cancellation hotel refresh.
- Behaviour intentionally changed: No.

### Verification

- Typecheck: no errors from the modified controller or voucher hook; existing repository errors remain documented.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).

### Line counts

- `ItineraryDetailsController.tsx`: 15,270 physical lines after extraction.
- `useHotelVoucherController.ts`: 95 physical lines.

## Iteration 55 — Vehicle selection totals boundary

### Changes

- Created `src/pages/itinerary-details/hooks/useVehicleSelectionTotalsController.ts`.
- Moved the idempotent vehicle-row total/quantity update callback out of `ItineraryDetailsController.tsx`.
- Preserved the existing numeric normalization and no-op behavior when the selected totals are unchanged.
- Behaviour intentionally changed: No.

### Verification

- Typecheck: no errors from the modified controller or vehicle totals hook; existing repository errors remain documented.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).

### Line counts

- `ItineraryDetailsController.tsx`: 15,250 physical lines after extraction.
- `useVehicleSelectionTotalsController.ts`: 39 physical lines.

## Iteration 56 — Hotel selection coverage derivation

### Changes

- Created `src/pages/itinerary-details/hooks/useHotelSelectionCoverage.ts`.
- Moved route-coverage derivation for single-night and multi-night hotel selections into a dedicated hook.
- Preserved the returned `Set<number>` semantics used by prebook, confirmation, and non-TBO review filtering.
- Behaviour intentionally changed: No.

### Verification

- Typecheck: no errors from the modified controller or coverage hook; existing repository errors remain documented.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).

### Line counts

- `ItineraryDetailsController.tsx`: 15,226 physical lines after extraction.
- `useHotelSelectionCoverage.ts`: 39 physical lines.

## Iteration 57 — Formatted hotel clipboard action

### Changes

- Created `src/pages/itinerary-details/hooks/useHotelClipboardAction.ts`.
- Moved selected-hotel validation, clipboard API retrieval, package HTML merge, highlights replacement, copy, state reset, and existing toast/error behavior out of `ItineraryDetailsController.tsx`.
- Preserved clipboard mode routing (`recommended`, `highlights`, `para`) and backend group-type payload construction.
- Behaviour intentionally changed: No.

### Verification

- Typecheck: no errors from the modified controller or clipboard hook; existing repository errors remain documented.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).

### Line counts

- `ItineraryDetailsController.tsx`: 15,213 physical lines after extraction.
- `useHotelClipboardAction.ts`: 68 physical lines.

## Iteration 58 — Persisted hotel selection mutation

### Changes

- Created `src/pages/itinerary-details/hooks/useHotelSelectionMutation.ts`.
- Moved the persisted hotel selection API call, modal/reset state, post-selection details/hotel refresh, and existing read-only/toast/error behavior out of `ItineraryDetailsController.tsx`.
- Preserved the selected meal-plan and room-type arguments and the hotel-bearing itinerary refresh gate.
- Behaviour intentionally changed: No.

### Verification

- Typecheck: no errors from the modified controller or selection mutation hook; existing repository errors remain documented.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).

### Line counts

- `ItineraryDetailsController.tsx`: 15,180 physical lines after extraction.
- `useHotelSelectionMutation.ts`: 72 physical lines.

## Iteration 59 — Sibling route switch controller

### Changes

- Created `src/pages/itinerary-details/hooks/useRouteOptionSwitchController.ts`.
- Moved fast sibling-route navigation, stale-request protection, route details hydration, cached hotel reuse, and loading/error cleanup out of `ItineraryDetailsController.tsx`.
- Preserved route ID validation, URL replacement navigation, vehicle readiness behavior, route-scoped hotel caching, and existing toast wording.
- Behaviour intentionally changed: No.

### Verification

- Typecheck: no errors from the modified controller or route switch hook; existing repository errors remain documented.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).

### Line counts

- `ItineraryDetailsController.tsx`: 15,118 physical lines after extraction.
- `useRouteOptionSwitchController.ts`: 123 physical lines.

## Iteration 60 — Supplier-search hotel selection boundary

### Changes

- Created `src/pages/itinerary-details/hooks/useHotelSearchSelectionMutation.ts`.
- Moved supplier-search hotel payload normalization, booking-code validation, selected-booking state update, prebook reset, selection API call, modal reset, and post-selection refresh out of `ItineraryDetailsController.tsx`.
- Preserved provider/room/rate/search-reference fields, multi-provider flags, existing validation message, and error rethrow behavior for the search modal.
- Behaviour intentionally changed: No.

### Verification

- Typecheck: no errors from the modified controller or supplier-search mutation hook; existing repository errors remain documented.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).

### Line counts

- `ItineraryDetailsController.tsx`: 15,017 physical lines after extraction.
- `useHotelSearchSelectionMutation.ts`: 126 physical lines.

## Iteration 61 — Supplier-selection type hardening and lint checkpoint

### Changes

- Replaced newly introduced supplier-selection `any` types with explicit modal, meal-plan, search-result, and selected-booking shapes.
- Removed an unnecessary route-switch hook dependency and kept all new extraction hooks clean under focused ESLint.
- Behaviour intentionally changed: No.

### Verification

- Typecheck: no errors from the modified controller or extraction hooks; existing repository errors remain documented.
- Focused ESLint: passed for the four latest workflow hooks.
- Repository lint: failed at the current baseline with 1,936 errors and 107 warnings.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).

### Line counts

- `ItineraryDetailsController.tsx`: 15,016 physical lines.
- `useHotelSearchSelectionMutation.ts`: 159 physical lines.

## Iteration 62 — Guide modal hydration boundary

### Changes

- Created `src/pages/itinerary-details/hooks/useGuideModalController.ts`.
- Moved guide modal opening, option retrieval, local-assignment slot precedence, language hydration, read-only/plan guards, and error cleanup out of `ItineraryDetailsController.tsx`.
- Preserved guide assignment API arguments and existing toast wording.
- Behaviour intentionally changed: No.

### Verification

- Typecheck: no errors from the modified controller or guide modal hook; existing repository errors remain documented.
- Focused ESLint: passed for the guide modal hook.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).

### Line counts

- `ItineraryDetailsController.tsx`: 14,932 physical lines after extraction.
- `useGuideModalController.ts`: 98 physical lines.

## Iteration 63 — Guide deletion mutation boundary

### Changes

- Created `src/pages/itinerary-details/hooks/useGuideDeleteMutation.ts`.
- Moved guide assignment deletion, deleting-state transitions, post-delete refresh, and existing toast/error behavior out of `ItineraryDetailsController.tsx`.
- Preserved plan/assignment guards and the route-guide/route ID service payload.
- Behaviour intentionally changed: No.

### Verification

- Typecheck: no errors from the modified controller or guide delete hook; existing repository errors remain documented.
- Focused ESLint: passed for the guide modal and delete hooks.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).

### Line counts

- `ItineraryDetailsController.tsx`: 14,918 physical lines after extraction.
- `useGuideDeleteMutation.ts`: 44 physical lines.

## Iteration 64 — Activity preview workflow boundary

### Changes

- Created `src/pages/itinerary-details/hooks/useActivityPreviewController.ts`.
- Moved single-activity preview and all-hotspots preview API calls, loading transitions, modal updates, and existing toast/error behavior out of `ItineraryDetailsController.tsx`.
- Preserved activity/route/hotspot payload fields and preview reset semantics.
- Behaviour intentionally changed: No.

### Verification

- Typecheck: no errors from the modified controller or activity preview hook; existing repository errors remain documented.
- Focused ESLint: passed for the activity preview hook.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).

### Line counts

- `ItineraryDetailsController.tsx`: 14,863 physical lines after extraction.
- `useActivityPreviewController.ts`: 84 physical lines.

## Iteration 65 — Wallet top-up continuation boundary

### Changes

- Created `src/pages/itinerary-details/hooks/useWalletTopUpController.ts`.
- Moved cash-wallet top-up validation, wallet mutation, balance refresh, shortfall panel handling, reset, and confirmation continuation out of `ItineraryDetailsController.tsx`.
- Preserved agent guard, amount/remark validation, service payload rounding, and existing toast wording.
- Behaviour intentionally changed: No.

### Verification

- Typecheck: no errors from the modified controller or wallet hook; existing repository errors remain documented.
- Focused ESLint: passed for the wallet hook.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).

### Line counts

- `ItineraryDetailsController.tsx`: 14,836 physical lines after extraction.
- `useWalletTopUpController.ts`: 68 physical lines.

## Iteration 66 — Broader verification checkpoint

### Verification

- Broader itinerary selector: 34 tests executed with 8 workers; 9 passed, 2 skipped, and 23 failed.
- Failures remain classified in `REGRESSION_LOG.md` as shared mutable Fit Here/APJ data, PHP/Nest parity/environment differences, and vehicle-only backend processing/data visibility.
- Focused Playwright pair remains 2 passed; production build passes; filtered page/new-module typecheck remains free of new errors.
- Repository lint baseline remains 1,936 errors and 107 warnings.

### Notes

- No application or test weakening changes were made. This is a documentation-only verification checkpoint; the refactor remains in progress.

## Iteration 67 — Activity availability loader boundary

### Changes

- Created `src/pages/itinerary-details/hooks/useActivityAvailabilityLoader.ts`.
- Moved activity modal opening, stale-preview reset, available-activity API loading, loading transitions, and existing toast/error behavior out of `ItineraryDetailsController.tsx`.
- Preserved the hotspot/plan/route payload and modal state shape.
- Behaviour intentionally changed: No.

### Verification

- Typecheck: no errors from the modified controller or activity availability hook; existing repository errors remain documented.
- Focused ESLint: passed for the activity availability hook.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).

### Line counts

- `ItineraryDetailsController.tsx`: 14,811 physical lines after extraction.
- `useActivityAvailabilityLoader.ts`: 42 physical lines.

## Iteration 68 — Focused hook lint hardening

### Changes

- Replaced the remaining explicit `any` diagnostics in `useHotelDataController` and `useHotelSelectionCoverage` with local vehicle/selection shapes.
- No runtime behavior or API payloads changed.

### Verification

- Typecheck: no errors from the modified hooks or controller; existing repository errors remain documented.
- Focused ESLint: all current extracted workflow hooks pass.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).

### Line counts

- `ItineraryDetailsController.tsx`: 14,811 physical lines.

## Iteration 69 — Wallet balance/panel ownership

### Changes

- Extended `useWalletTopUpController.ts` to own wallet-balance retrieval, top-up panel reset, and shortfall preparation in addition to the top-up mutation.
- Removed those wallet helpers from `ItineraryDetailsController.tsx`; quotation modal and balance-refresh call sites now use the hook-owned callbacks.
- Preserved wallet API parsing, currency formatting, panel defaults, and quotation-specific remark text.
- Behaviour intentionally changed: No.

### Verification

- Typecheck: no errors from the modified controller or wallet hook; existing repository errors remain documented.
- Focused ESLint: passed for the wallet hook.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).

### Line counts

- `ItineraryDetailsController.tsx`: 14,792 physical lines after extraction.

## Iteration 70 — Add-hotspot modal controller

### Changes

- Created `src/pages/itinerary-details/hooks/useAddHotspotModalController.ts`.
- Moved add-hotspot modal initialization, Fit Here preview-state reset, route active/excluded ID derivation, available-hotspot API loading/filtering/normalization, and existing error/toast behavior out of `ItineraryDetailsController.tsx`.
- Preserved anchor payloads, route-pair filtering, manual-hotspot preselection reset, and availability normalization options.
- Behaviour intentionally changed: No.

### Verification

- Typecheck: no errors from the modified controller or add-hotspot hook; existing repository errors remain documented.
- Focused ESLint: passed for the add-hotspot hook.
- Production build: passed with existing warnings.
- Targeted Playwright: 2 passed (`itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression`).

### Line counts

- `ItineraryDetailsController.tsx`: 14,673 physical lines after extraction.
- `useAddHotspotModalController.ts`: 134 physical lines.
- `useWalletTopUpController.ts`: 113 physical lines.

## Iteration 25 — Hotel workflow state boundary

### Baseline
- Tests run: repository typecheck output filtered to page/new modules; `npm run build`; focused hotspot Playwright pair.
- Result: no page/new-module type errors; build passed with existing warnings; both focused flows passed after extraction.
- Relevant behavior: hotel search/arrival-policy/room-selection state, route-time progress state, supplier hotel list state, and selected meal-plan state retain their existing defaults and setter semantics.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useHotelWorkflowState.ts`.
- Files modified: `src/pages/ItineraryDetailsRuntime.tsx`.
- Code moved: hotel workflow state and route-time progress state now originate from a dedicated hook; hotel filtering, API operations, timing policy, and supplier payload logic remain in the runtime.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from the runtime, hotel workflow state hook, or stable page entrypoint; existing repository errors remain documented.
- Lint: repository baseline remains failing; no lint-only changes made.
- Unit tests: no dedicated unit script configured.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: not run.
- Production build: passed with existing warnings.
- Console/network check: focused flows passed without new page/runtime failures.

### Line counts
- ItineraryDetailsRuntime.tsx before: 16,325; after: 16,271.
- Stable `ItineraryDetails.tsx`: 14 lines.
- Largest new source file: `useHotelWorkflowState.ts` (39 lines).

### Notes
- Coupling discovered: the local runtime still owns hotel provider normalization and arrival-policy request sequencing; this iteration moved state only.
- Follow-up extraction: vehicle workflow state/actions, hotspot/Fit Here controller, and quotation review view.

## Iteration 26 — Activity workflow state boundary

### Baseline
- Tests run: repository typecheck output filtered to page/new modules; `npm run build`; focused hotspot Playwright pair.
- Result: no page/new-module type errors; build passed with existing warnings; both focused flows passed after extraction.
- Relevant behavior: activity modal, available activities, preview, add loading, and selected preview ID retain their existing defaults and setter semantics.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useActivityState.ts`.
- Files modified: `src/pages/ItineraryDetailsRuntime.tsx`.
- Code moved: activity workflow state now originates from a dedicated hook; activity API calls, preview transformation, mutation handlers, and toasts remain unchanged in the runtime.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from the runtime, activity state hook, or stable page entrypoint; existing repository errors remain documented.
- Lint: repository baseline remains failing; no lint-only changes made.
- Unit tests: no dedicated unit script configured.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: not run.
- Production build: passed with existing warnings.
- Console/network check: focused flows passed without new page/runtime failures.

### Line counts
- ItineraryDetailsRuntime.tsx before: 16,271; after: 16,231.
- Stable `ItineraryDetails.tsx`: 14 lines.
- Largest new source file: `useActivityState.ts` (15 lines).

### Notes
- Coupling discovered: the historical activity response shape is consumed dynamically by existing handlers; the state hook keeps that shape unchanged.
- Follow-up extraction: guide workflow state/actions, vehicle state/actions, hotspot/Fit Here controller, and quotation review view.

## Iteration 27 — Guide workflow state boundary

### Baseline
- Tests run: repository typecheck output filtered to page/new modules; `npm run build`; focused hotspot Playwright pair.
- Result: no page/new-module type errors; build passed with existing warnings; both focused flows passed after extraction.
- Relevant behavior: guide assignments, availability, add/edit modal, loading/saving, and delete confirmation state retain their existing defaults and setter semantics.

### Changes
- Files created: `src/pages/itinerary-details/hooks/useGuideState.ts`.
- Files modified: `src/pages/ItineraryDetailsRuntime.tsx`.
- Code moved: guide workflow state now originates from a dedicated hook; availability loading, save/delete API calls, option normalization, and toasts remain in the runtime.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from the runtime, guide state hook, or stable page entrypoint; existing repository errors remain documented.
- Lint: repository baseline remains failing; no lint-only changes made.
- Unit tests: no dedicated unit script configured.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: not run.
- Production build: passed with existing warnings.
- Console/network check: focused flows passed without new page/runtime failures.

### Line counts
- ItineraryDetailsRuntime.tsx before: 16,231; after: 16,202.
- Stable `ItineraryDetails.tsx`: 14 lines.
- Largest new source file: `useGuideState.ts` (14 lines).

### Notes
- Coupling discovered: guide availability and assignment rules remain in existing callbacks; this iteration moved state only.
- Follow-up extraction: vehicle workflow state/actions and hotspot/Fit Here controller/view.

## Iteration 28 — Broader verification and final-report checkpoint

### Baseline
- Tests run: the 13-file itinerary Playwright suite (34 tests), plus the focused pair, production build, and page/new-module typecheck.
- Result: focused pair 2/2 passed; broader suite 9 passed, 2 skipped, 23 failed for documented shared-data/environment/parity causes; build passed; no new page/new-module type errors.

### Changes
- Files created: none.
- Files modified: `REGRESSION_LOG.md`, `FINAL_REPORT.md`, `PROGRESS_LOG.md`.
- Code moved: none; recorded the broader-suite evidence and current transitional-runtime status.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no new errors from the page/runtime/new hooks; existing repository errors remain documented.
- Lint: repository baseline remains failing (documented).
- Unit tests: no dedicated unit script configured.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: 34 tests, 9 passed, 2 skipped, 23 failed; failures documented rather than hidden.
- Production build: passed with existing warnings.
- Console/network check: focused flows passed without new page/runtime failures.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsRuntime.tsx`: 16,202 lines.

### Notes
- The stable route boundary and multiple domain state hooks are committed, but the overall refactor is not complete until the transitional runtime is split into workflow-sized controllers/views and the documented full-suite blockers are resolved or externally confirmed.

## Iteration 29 — Vehicle build error view

### Baseline
- Tests run: repository typecheck output filtered to page/new modules; `npm run build`; focused hotspot Playwright pair.
- Result: no page/new-module type errors; build passed with existing warnings; both focused flows passed after extraction.
- Relevant behavior: failed vehicle-build state retains the same error wording, retry action, loading transition, and page reload callback.

### Changes
- Files created: `src/pages/itinerary-details/components/VehicleBuildErrorState.tsx`.
- Files modified: `src/pages/ItineraryDetailsRuntime.tsx`.
- Code moved: the failed vehicle-build retry view now renders through a focused component; retry sequencing and state updates remain in the runtime callback.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no errors from the runtime, vehicle error component, or stable page entrypoint; existing repository errors remain documented.
- Lint: repository baseline remains failing; no lint-only changes made.
- Unit tests: no dedicated unit script configured.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: broader 34-test run recorded separately (9 passed, 2 skipped, 23 documented failures).
- Production build: passed with existing warnings.
- Console/network check: focused flows passed without new page/runtime failures.

### Line counts
- ItineraryDetailsRuntime.tsx before: 16,202; after: 16,191.
- Stable `ItineraryDetails.tsx`: 14 lines.
- Largest new source file: `VehicleBuildErrorState.tsx` (20 lines).

### Notes
- Coupling discovered: vehicle retry still intentionally invokes the existing prepared-itinerary loader and preserves its state transitions.
- Follow-up extraction: hotspot/Fit Here controller/view and vehicle workflow actions; final composition verification remains outstanding.

## Iteration 30 — Verification and lint checkpoint

### Baseline
- Tests run: `npm run lint`, page/new-module TypeScript filter, `npm run build`, focused Playwright pair, and the broader itinerary suite.
- Result: build and focused pair remain green; page/new-module typecheck has no new errors; broader suite and lint remain red for documented environment/repository issues.

### Changes
- Files created: none.
- Files modified: `REGRESSION_LOG.md`, `PROGRESS_LOG.md`.
- Code moved: none; recorded the final verification evidence for this loop budget.
- Behaviour intentionally changed: No.

### Verification
- Typecheck: no new errors from current page/runtime/new modules; existing repository errors remain documented.
- Lint: 1,921 errors/122 warnings; not green.
- Unit tests: no dedicated unit script configured.
- Targeted Playwright: 2 passed.
- Full itinerary Playwright: 34 tests, 9 passed, 2 skipped, 23 failed; documented in `REGRESSION_LOG.md`.
- Production build: passed with existing warnings.
- Console/network check: focused flows passed without new page/runtime failures.

### Line counts
- Stable `ItineraryDetails.tsx`: 14 lines.
- Transitional `ItineraryDetailsRuntime.tsx`: 16,191 lines.

### Notes
- Completion criteria are not yet met: the transitional runtime still exceeds the 1,000-line source-file target, repository lint is red, and the broader suite has unresolved shared-data/environment failures. The branch is intentionally left at the last green application checkpoint for continued work.

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
