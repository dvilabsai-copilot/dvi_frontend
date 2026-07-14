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
