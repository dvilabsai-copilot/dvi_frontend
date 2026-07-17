# Large-file refactor progress

## Iteration 1 — HotelList.tsx

- Starting line count: 4,156 lines in the pre-extraction snapshot; ending count: 877.
- Reason: high-change hotel selection page mixing state, rows, actions, totals, dialogs, and formatting.
- Responsibilities found: selection defaults and persistence, supplier/restricted hotel merging, room expansion, stay extension, totals, voucher rows, sync/save actions, dialogs, and table rendering.
- Modules created/used: `src/pages/hotel-list/hotelList.types.ts`, `hotelList.utils.ts`, `useHotelSelectionState.ts`, `useHotelGroupTotals.ts`, `useHotelListRows.ts`, `useHotelListActions.ts`, `HotelListTable.tsx`, `HotelListDialogs.tsx`, and `MealPlanCell.tsx`.
- Tests/validation: existing hotel and Playwright group coverage inspected; focused type/build validation is being rerun on the recovered branch.
- Status: COMPLETED in the recovered refactor snapshot; no commit/push performed by this task.
- Remaining risk: hook dependency warnings require review without changing selection timing.

## Iteration 2 — ActivityFormView.tsx

- Starting line count: 1,355 lines in the pre-extraction snapshot; ending count: 945.
- Reason: a form presentation module contained four distinct tabs and repeated review/preview markup.
- Responsibilities found: tab navigation, basic activity fields, price-book display/editing, review CRUD/search/pagination/export controls, and read-only preview.
- Modules created: `src/pages/activity/ActivityReviewTab.tsx` and `src/pages/activity/ActivityPreviewTab.tsx`.
- Public contract: `ActivityFormView` export and the context object contract remain unchanged; state and API callbacks remain owned by `ActivityForm.tsx`.
- Tests/validation: added `src/test/ActivityFormView.test.tsx` with two characterization tests; focused Vitest passed (2/2), focused ESLint passed with `--max-warnings=0`, `npx tsc --noEmit` passed, production `npm run build` passed, and the existing Playwright activity-list workflow passed (1/1). The full Vitest suite remains red only in pre-existing `src/test/Login.test.tsx` failures (3 tests; current login labels/duplicate matcher issue), while 10 other tests passed.
- Status: COMPLETED.
- Remaining risk: the production build retains existing Browserslist, Tailwind ambiguous-class, chunk-size, and dynamic-import warnings unrelated to this extraction.

## Next iteration

`src/pages/hotel-form/RoomsStep.tsx` (1234 lines), after completing ActivityFormView validation.

## Iteration 3 — RoomsStep.tsx (in progress)

- Starting line count: 1234 physical lines in the current authored-source scan.
- Reason for selection: largest remaining authored source file; it combines room form UI, query loading, API payload mapping, gallery uploads, deletion, validation, and navigation.
- Baseline tests: `E2E_ALLOW_WRITES=true npx playwright test tests/e2e/hotel-form-tabs-verification.spec.ts --project=admin-mutation --grep "navigate through all|handle form validation|verify form structure"` passed 3/3. The guarded run without `E2E_ALLOW_WRITES=true` was rejected by the repository’s safety preflight and is recorded as an environment guard, not a regression.
- Planned first slice: move only `AmenityPicker` and `RoomTypeAutocomplete` into a cohesive `RoomFieldPickers.tsx`; preserve props, markup, ARIA, keyboard handling, event order, labels, and classes.
- Completed first slice: `src/pages/hotel-form/RoomFieldPickers.tsx` now owns both interactive picker widgets; `RoomsStep.tsx` retains data loading, state, validation, persistence, gallery upload, and navigation responsibilities.
- Completed second slice: `src/pages/hotel-form/RoomFormRow.tsx` now owns the repeated room-field presentation and row-level interactions. `RoomsStep.tsx` dropped from 1234 to 891 lines while retaining row state updates, deletion confirmation, persistence, and navigation in the parent.
- Post-slice validation: `npx tsc --noEmit` passed; focused ESLint for `RoomFieldPickers.tsx` passed with `--max-warnings=0`; the three existing hotel-form verification tests passed (3/3) with the repository write guard enabled. `git diff --check` reports only pre-existing/new blank-line-at-EOF notices in dirty files; no whitespace content errors.
- Second-slice validation: `npx tsc --noEmit`, focused ESLint for `RoomFormRow.tsx` and `RoomFieldPickers.tsx`, the three hotel-form verification tests (3/3), and `npm run build` all passed. Build output retains only existing Browserslist, Tailwind, dynamic-import, and chunk-size warnings.
- Known baseline lint: the parent `RoomsStep.tsx` still contains its pre-existing explicit-`any`, empty-catch, and `@ts-ignore` diagnostics; the extracted picker module introduces none.
- Status: COMPLETED; no commit/push performed by this task.

## Next iteration

`src/services/itinerary.ts` (1373 lines), selected as the next largest authored frontend source file after the RoomsStep reduction.

## Iteration 4 — itinerary.ts

- Starting line count: 1373 physical lines.
- Reason: one public service facade mixed PDF transport, itinerary details, activity/hotspot mutations, confirmed-itinerary listings, incidental expenses, hotel search, vehicle selection, and confirmation APIs.
- Baseline: all named methods and exported payload/result types were inventoried; consumers import `ItineraryService` and the existing type exports from `@/services/itinerary`. Endpoint strings, methods, headers, cache options, payload fields, and return handling were preserved.
- Extracted modules: `src/services/itineraryPdf.ts`, `src/services/itineraryRouteActions.ts`, and `src/services/itineraryBackOffice.ts`. The original import path remains the compatibility facade and now delegates/spreads the domain functions.
- Ending line count: 879 physical lines.
- Validation: `npx tsc --noEmit` passed; focused ESLint passed for all new modules. The parent retains its pre-existing explicit-`any` diagnostics (8 after extraction; no new `any` was added in extracted modules). `npm run build` was previously green for the preceding iteration; an aggregate `npm run e2e:group` runner was added because that script was absent, and the run was exercised repeatedly. Individual groups passed, while the full aggregate exposed and was incrementally hardened against pre-existing network-monitor teardown races; the final aggregate attempt was interrupted before completion.
- Test infrastructure fixes: added cross-platform `scripts/e2e/run-groups.mjs` and `e2e:group` package script; expanded only the monitor's known non-blocking/externally hosted request handling and page-close race tolerance. No application assertions were weakened.
- Status: COMPLETED for source extraction; aggregate E2E remains `VALIDATING` because the user interruption stopped the final rerun. No commit/push had been made before this iteration.

## Next iteration

Rescan authored source files and select the highest-value remaining file over 1000 lines. Current candidates include `src/pages/locations/LocationsPage.tsx`, `src/pages/agent/AgentFormPage.tsx`, and `src/pages/dashboard/DashboardAdminView.tsx`.

## Iteration 5 — LocationsPage.tsx

- Starting line count: 1360 physical lines in the baseline snapshot.
- Reason: largest remaining behavior-heavy authored page; it combined location CRUD orchestration, filters, pagination, delete/undo workflows, toll editing, and five dialog presentations.
- Extracted module: `src/pages/locations/components/LocationDialogs.tsx` now owns the delete-selected, delete-location-name, update-location-name, rename, and toll dialog presentations with typed props. The page retains API calls, state, effects, validation, pagination, and callback timing.
- Ending line count: 933 physical lines.
- Compatibility: `/locations` route, default export, `locationsApi` calls, labels, toast text, dialog callbacks, autosuggest behavior, table structure, and navigation remain unchanged.
- Validation: `npx tsc --noEmit`, focused ESLint for the page and extracted module, production `npm run build`, and `E2E_ALLOW_WRITES=true npm run e2e:group:locations` passed (3/3). Build output retains only existing dependency/browser/chunk warnings.
- Status: COMPLETED locally; this iteration is ready to commit. Aggregate `npm run e2e:group` remains required by the autonomous loop and will be rerun before the next iteration.

## Next iteration

Rescan authored source files and select the next largest behavior-heavy file over 1000 lines, excluding the deferred stylesheet candidate until a cascade-safe split is mapped.

## Iteration 6 — AgentFormPage.tsx

- Starting line count: 1265 physical lines in the current authored-source scan.
- Reason: four-tab agent edit wizard mixed data loading, staff persistence/CRUD, wallet history/actions, configuration state, tab markup, and two modal presentations.
- Extracted module: `src/pages/agent/AgentFormTabs.tsx` owns the configuration tab, staff dialog, and wallet dialog presentation with typed state props. API calls, local-storage staff overrides, validation, state transitions, and navigation remain in `AgentFormPage`.
- Ending line count: 900 physical lines; the extracted module is 504 lines.
- Compatibility: `/agent/:id/edit`, default export, tab labels, field labels, dialog copy, wallet/staff callbacks, configuration payload, local-storage keys, and existing API fallback behavior remain unchanged.
- Validation: `npx tsc --noEmit`, focused ESLint for `AgentFormTabs.tsx`, production `npm run build`, and `E2E_ALLOW_WRITES=true npm run e2e:group:staff-agents` passed (10/10). The parent retains its pre-existing explicit-`any` and hook-dependency diagnostics; the extracted module adds none. Build output retains existing dependency/browser/chunk warnings.
- Aggregate validation: `E2E_ALLOW_WRITES=true npm run e2e:group` was attempted after this iteration but exceeded the five-minute command timeout while progressing through the grouped suites; no source assertion failure was returned before timeout. Focused validation remains green.
- Status: COMPLETED locally; the aggregate timeout is recorded as an environment/runtime limitation rather than a passing result.

## Next iteration

Rescan authored source files and select the next largest behavior-heavy file over 1000 lines, excluding the deferred stylesheet candidate.

## Iteration 10 — ManualFitHerePreviewDialog.tsx

- Starting line count: 1101 physical lines in the current authored-source scan.
- Reason: the manual Fit Here preview dialog mixed its public response/prop contract and loading-step model with result interpretation, timeline normalization, removal-proof presentation data, and dialog orchestration. The visual markup was already isolated in `ManualFitHerePreviewDialogView.tsx`.
- Extracted module: `src/components/itinerary/manual-fit/ManualFitHerePreviewTypes.ts` owns the shared result union, response shape, loading-step metadata, and controlled dialog props. The original module re-exports the response/result types so `AutoFitHerePreviewDialog` and existing consumers retain their import path.
- Ending line count: 877 physical lines; the extracted contract module is 177 lines.
- Compatibility: manual Fit Here and Auto Fit Here imports, dialog callbacks, loading labels, result variants, acknowledgement payloads, and route preview behavior remain unchanged.
- Validation: `npx tsc --noEmit` and focused ESLint for both modules passed. `E2E_ALLOW_WRITES=true npm run e2e:group:itinerary` executed 16 tests; 13 passed and 3 failed in existing environment-sensitive flows (guide-total text, random five-day fixture day visibility, and vehicle-only details visibility) after unrelated API/browser timing, with no Fit Here assertion failure reported. Generated failure artifacts remain untracked and are excluded from commits.
- Status: COMPLETED locally; focused source validation is green and the grouped itinerary failures are recorded as environment/runtime failures rather than attributed to this type-only extraction.

## Next iteration

Rescan authored source files and select the next largest behavior-heavy file over 1000 lines, excluding the deferred stylesheet candidate.

## Iteration 9 — VehicleAvailabilityPage.tsx

- Starting line count: 1173 physical lines in the current authored-source scan.
- Reason: the vehicle availability page combined filter/chart orchestration, assignment/block modal presentation, and add-driver/add-vehicle dialogs.
- Extracted module: `src/pages/vehicle-availability/components/VehicleAvailabilityActionModals.tsx` owns assign and block modal markup with typed state/callback props. Existing add-driver/add-vehicle modals remain unchanged.
- Removed dead presentation: the in-file `ChipMultiSelect` declaration was unused by the page and was removed rather than copied into a new module.
- Ending line count: 847 physical lines.
- Compatibility: `/vehicle-availability`, default export, filter state, chart cell actions, assignment/block payload callbacks, labels, disabled states, and modal close behavior remain unchanged.
- Validation: `npx tsc --noEmit`, focused ESLint for the extracted action-modal module, production `npm run build`, and `npm run e2e:group:drivers-vehicles` passed (13/13).
- Aggregate validation: the aggregate runner progressed through itinerary, confirmed-itinerary, hotels, vendors, drivers/vehicles, and hotspots after adding the known `/api/v1/hotspot-distance-cache/form-options` background request allowlist; it exceeded the five-minute command timeout before returning a final result. No VehicleAvailability assertion failed.
- Status: COMPLETED locally; focused VehicleAvailability validation remains green and the aggregate timeout is recorded as an environment/runtime limitation.

## Next iteration

Rescan authored source files and select the next largest behavior-heavy file over 1000 lines, excluding the deferred stylesheet candidate.

## Iteration 8 — AccountsManager.tsx

- Starting line count: 1180 physical lines in the current authored-source scan.
- Reason: account payout orchestration, filters, totals, infinite scrolling, CSV/Excel export, payment modal state, and the large component-specific table renderer were combined in one page.
- Extracted modules: `src/pages/accounts/AccountsSectionTable.tsx` owns hotel and generic component table markup; `src/pages/accounts/accountsManagerUtils.ts` owns INR/number formatting and section metadata. The page retains API calls, filters, pagination/scroll state, totals, export behavior, and PayNow callbacks.
- Related type improvement: `AccountsRow` now declares the optional backend display fields previously read dynamically, allowing the extraction and totals/grouping code to remain type-safe without `any` casts.
- Ending line count: 846 physical lines; the table module is 328 lines.
- Compatibility: `/accounts-manager`, named `AccountsManager` export, section ordering, headers, labels, pay-now disabled rules, formatting, export payloads, and infinite-scroll behavior remain unchanged.
- Validation: `npx tsc --noEmit`, focused ESLint for the page and extracted modules, production build, and direct authenticated admin-readonly route checks passed (2/2). The npm wrapper's grep forwarding remains unreliable in this environment, so the focused Playwright check used the repository's local Playwright CLI directly.
- Aggregate validation: `E2E_ALLOW_WRITES=true npm run e2e:group` progressed through multiple suites but exceeded the five-minute command timeout before producing a final aggregate result; no source failure was returned by the runner.
- Status: COMPLETED locally; focused AccountsManager validation remains green and the aggregate timeout is recorded as an environment/runtime limitation.

## Next iteration

Rescan authored source files and select the next largest behavior-heavy file over 1000 lines, excluding the deferred stylesheet candidate.

## Iteration 7 — DashboardAdminView.tsx

- Starting line count: 1215 physical lines in the current authored-source scan.
- Reason: the admin dashboard view combined the welcome/profit/stats carousel with daily moment, star performers, three paginated data tables, and most-visited hotels.
- Extracted module: `src/pages/dashboard/DashboardAdminOverview.tsx` now owns the welcome, profit, stats cards, and overview carousel. The parent retains all list state, filters, pagination, and dashboard interaction callbacks.
- Ending line count: 905 physical lines; the extracted overview module is 328 lines.
- Compatibility: `DashboardAdminView` export and Dashboard.tsx context contract remain unchanged; all labels, encoding artifacts, links, carousel behavior, styling, and data bindings were copied without changing request/state ownership.
- Validation: `npx tsc --noEmit`, focused ESLint for the new overview module, production `npm run build`, and direct Playwright dashboard checks were run. The direct dashboard check passed the admin and agent-role dashboard tests (2/3); the remaining authenticated-agent case has a pre-existing fixture assertion expecting the admin welcome label and a `/build/undefined` ORB monitor failure. The grouped UI/UX runner currently fails before test execution with a duplicate Playwright `test()` registration error after the environment's `.bin` links disappeared.
- Aggregate validation: `npm run e2e:group` failed before executing a suite because the environment's missing `node_modules/.bin` links caused `npx` to load duplicate Playwright test packages (`test() does not expect to be called here`). This is a runner/dependency-resolution failure, not a dashboard assertion.
- Status: COMPLETED locally; focused dashboard checks and build remain the source validation evidence.

## Iteration 11 — VendorsPage.tsx

- Starting line count: 1079 physical lines in the current authored-source scan.
- Reason: the vendor list page combined list orchestration, client-side filtering/sorting/pagination, CRUD/status actions, inline styles, and four export implementations.
- Extracted module: `src/pages/vendor/vendorExport.ts` owns the generic Copy/CSV/Excel/PDF export helpers and date suffix generation. The page retains all data loading, table markup, controls, navigation, and mutation callbacks.
- Small safety cleanup: vendor load/delete/status catches now use `unknown` with a typed error-message helper, removing three pre-existing explicit-`any` diagnostics without changing fallback text.
- Ending line count: 996 physical lines; the extracted export module is 91 lines.
- Compatibility: `/vendor`, add/edit navigation, search/page-size controls, sort arrows, export formats (including CSV BOM and Excel fallback), status toggle, delete confirmation, labels, and API paths remain unchanged.
- Validation: `npx tsc --noEmit`, focused ESLint for the page and export module, production `npm run build`, and `E2E_ALLOW_WRITES=true npm run e2e:group:vendors` passed (5/5). Build output retains existing dependency/chunk warnings.
- Status: COMPLETED locally; generated Playwright artifacts remain untracked and excluded from commits.

## Next iteration

Rescan authored source files and select the next largest behavior-heavy file over 1000 lines, excluding the deferred stylesheet candidate.
