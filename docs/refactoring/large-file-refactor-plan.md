# Large-file frontend refactor plan

Discovery date: 2026-07-17

## Counting method

Authored files were enumerated with `rg --files src` for `.ts`, `.tsx`, `.js`, `.jsx`, `.css`, and `.scss`. Physical lines were counted with PowerShell `Get-Content | Measure-Object -Line`; non-empty lines were counted separately. `node_modules`, `.git`, `dist`, `public`, build output, reports, traces, test results, and lockfiles are excluded.

## Current candidates (descending physical line count)

| Status | File | Lines / non-empty | Classification | Risk | Suggested boundary |
|---|---|---:|---|---|---|
| COMPLETED | `src/pages/hotel-form/RoomsStep.tsx` | 891 / 891 | complex form | high | picker widgets and repeated room row extracted |
| COMPLETED | `src/services/itinerary.ts` | 879 / 879 | API service facade | high | PDF, route actions, and back-office domains extracted behind compatibility facade |
| NOT_STARTED | `src/pages/book-activities/BookActivitiesPage.css` | 1220 / 1220 | stylesheet | medium | map selectors before any cascade-safe split |
| COMPLETED | `src/pages/locations/LocationsPage.tsx` | 933 / 933 | page/orchestration | high | dialogs extracted into typed sibling presentation module |
| COMPLETED | `src/pages/agent/AgentFormPage.tsx` | 900 / 900 | complex form | high | configuration, staff, and wallet presentation extracted into typed sibling module |
| COMPLETED | `src/pages/dashboard/DashboardAdminView.tsx` | 905 / 905 | dashboard presentation | medium | welcome/profit/stats overview extracted into typed sibling component |
| NOT_STARTED | `src/components/itinerary/manual-fit/ManualFitHerePreviewDialog.tsx` | 1101 / 1101 | dialog/orchestration | high | shared timeline rows only after comparison |
| COMPLETED | `src/pages/accounts/AccountsManager.tsx` | 846 / 846 | manager/page | high | component table renderer and formatting metadata extracted |
| COMPLETED | `src/pages/vehicle-availability/VehicleAvailabilityPage.tsx` | 847 / 847 | page/orchestration | high | assignment/block modal presentation extracted |
| NOT_STARTED | `src/components/itinerary/manual-fit/AutoFitHerePreviewDialog.tsx` | 1012 / 1012 | dialog/orchestration | high | compare with manual-fit before shared extraction |
| NOT_STARTED | `src/pages/ConfirmedItineraryDetails.tsx` | 1006 / 999 | details page | high | read-only sections, calculations, dialogs |
| NOT_STARTED | `src/pages/locations/LocationsPreviewPage.tsx` | 1005 / 1005 | preview page | medium | preview sections and data orchestration |
| COMPLETED | `src/pages/activity/ActivityFormView.tsx` | 945 / 945 | form presentation | high | review and preview tabs extracted |
| COMPLETED | `src/pages/HotelList.tsx` | 877 / 877 | hotel selection page | high | selection state, rows, actions, dialogs extracted |

The next iteration is exactly one file: `src/pages/locations/LocationsPage.tsx`, selected after the itinerary service reduction because it is the largest remaining behavior-heavy page.

## RoomsStep baseline and extraction design

- Status: COMPLETED after the focused baseline Playwright checks passed.
- Incoming contract: `api` (`apiGet`, `apiPost`, `apiGetFirst`, optional `apiDelete`), `hotelId`, `onPrev`, and `onNext`; default export `RoomsStep` is consumed by `HotelForm.tsx`.
- Responsibilities retained in the step: React Query loading/mutations, row state and initial-row snapshots, validation, DB payload mapping, bulk save fallback endpoints, non-blocking gallery upload, delete confirmation, status/toast timing, and tab navigation.
- Responsibilities extracted: two self-contained interactive field widgets (`AmenityPicker` and `RoomTypeAutocomplete`) plus the repeated room-field row presentation (`RoomFormRow`) with existing labels, keyboard/mouse behavior, ARIA attributes, and styling.
- Compatibility strategy: new widgets receive values/options/callbacks only; no API, state, storage, route, or payload logic moves. `RoomsStep` remains the sole default export and caller contract.
- Risks: room-form `RoomForm` currently has legacy type mismatches and dynamic API response shapes; extraction must not broaden them or alter fallback order.

## Itinerary service baseline and extraction design

- Status: COMPLETED; baseline and endpoint inventory were recorded before editing.
- Compatibility strategy: preserve every existing named export and request path; split only cohesive endpoint groups into internal modules, with `src/services/itinerary.ts` retaining the public facade.
- Extracted domains: PDF transport, route/activity/hotspot/vehicle actions, and confirmed/back-office/incidental/hotel-search endpoints.

## LocationsPage baseline and extraction design

- Status: COMPLETED after focused location Playwright coverage passed 3/3.
- Incoming contract: default `LocationsPage` export, `/locations` route, `locationsApi`, navigation to `/locations/:id/preview`, and child add/edit dialogs.
- Completed boundary: orchestration/API state remains in the page while delete-selected, location-name, rename, and toll dialog presentation lives in `src/pages/locations/components/LocationDialogs.tsx`; labels, selectors, toast messages, pagination, filters, and callback timing were preserved.

## AgentFormPage baseline and extraction design

- Status: COMPLETED after the authenticated staff/agent Playwright group passed 10/10 before and after extraction.
- Incoming contract: default `AgentFormPage` export at `/agent/:id/edit`; the page loads agent, staff, wallet, subscription, and configuration data through `AgentAPI`.
- Completed boundary: configuration tab markup, staff modal markup, and wallet modal markup moved to `src/pages/agent/AgentFormTabs.tsx`; data loading, validation, API fallback order, local-storage staff overrides, wallet refresh, and navigation remain in the page.
- Compatibility strategy: components receive controlled values/setters and callbacks only; no request paths, payload fields, labels, tab order, local-storage keys, or toast messages changed.

## DashboardAdminView baseline and extraction design

- Status: COMPLETED after the overview-only extraction compiled and the admin dashboard rendering path remained covered by the existing authenticated dashboard checks.
- Incoming contract: `Dashboard.tsx` passes a context object containing dashboard stats, carousel state/API, list rows, filters, pagination, and callbacks; `DashboardAdminView` remains the named export.
- Completed boundary: welcome/profit/stats cards and the four-slide carousel moved to `DashboardAdminOverview.tsx`; list orchestration and remaining dashboard sections stay in the parent.
- Compatibility strategy: the extracted component receives only `DashboardStats`, carousel API/setter, and current slide; no API calls, context shape, labels, styles, or navigation behavior changed.

## AccountsManager baseline and extraction design

- Status: COMPLETED after authenticated admin-readonly route checks passed 2/2.
- Incoming contract: named `AccountsManager` export at `/accounts-manager`; the page owns accounts list/summary/agent/payment-mode/quote-search calls and opens `PayNowModal` for due rows.
- Completed boundary: component-specific table headers/rows and formatting metadata moved to typed sibling modules; filters, totals, infinite-scroll listener, exports, API payloads, and payment callbacks remain in the page.
- Compatibility strategy: `AccountsRow` optional display fields model the existing backend variants; the extracted renderer receives rows and the existing pay-now callback only.

## VehicleAvailabilityPage baseline and extraction design

- Status: COMPLETED after the existing drivers/vehicles group passed 13/13 before and after extraction.
- Incoming contract: default `VehicleAvailabilityPage` export at `/vehicle-availability`; page uses vehicle availability lookups, chart rows/cells, add-driver/add-vehicle dialogs, assignment, blocking, and share-link actions.
- Completed boundary: assignment and block modal markup moved to `VehicleAvailabilityActionModals.tsx`; lookup loading, filter/search state, chart rendering, API calls, and modal state transitions remain in the page.
- Compatibility strategy: the new component receives the existing selected-cell state, option lists, setters, and submit callbacks; no endpoint, payload, label, or action timing changed.

## ManualFitHerePreviewDialog baseline and extraction design

- Status: COMPLETED after the dialog contract extraction compiled and the grouped itinerary suite executed without a Fit Here assertion failure.
- Incoming contract: `ManualFitHerePreviewDialog` is consumed by the manual and auto Fit Here flows; `AutoFitHerePreviewDialog` imports `ManualFitHerePreviewResponse` and `ManualFitHereResultType` from the existing module path.
- Completed boundary: shared response/result types, loading-step metadata, and controlled dialog props moved to `ManualFitHerePreviewTypes.ts`; the original module re-exports the public response/result types and retains all result interpretation, timeline normalization, acknowledgement state, and view composition.
- Compatibility strategy: preserve the original type import path, callback option shape, loading-step labels/order, and `ManualFitHerePreviewDialogView` context contract without changing API calls or UI markup.

## VendorsPage baseline and extraction design

- Status: COMPLETED after the authenticated vendor-list group passed 5/5.
- Incoming contract: default `VendorsPage` export at `/vendor`; list data comes from `listVendors`, mutations use the existing vendor API paths, and the table exposes search, paging, sort, status, delete, and four export controls.
- Completed boundary: generic export conversion/download helpers moved to `src/pages/vendor/vendorExport.ts`; page state, API calls, markup, inline styles, and navigation remain in `VendorsPage`.
- Compatibility strategy: preserve export headers/order, CSV BOM/quoting, Excel fallback, PDF styling, filenames, and all existing UI callback timing. Error catches use `unknown` and retain the same user-facing fallback messages.

## ConfirmedItineraryDetails baseline and extraction design

- Status: COMPLETED after the authenticated confirmed-itinerary group passed 4/4.
- Incoming contract: default/named `ConfirmedItineraryDetails` route renders confirmed itinerary details and owns itinerary cancellation plus guide-slot cancellation workflows.
- Completed boundary: guide-slot and itinerary cancellation result dialogs moved to `ConfirmedItineraryCancellationResults.tsx`; service calls, validation, state resets, refresh behavior, and primary itinerary rendering remain in the page.
- Compatibility strategy: pass only result values, selected guide-slot label, and existing close/reset callbacks; preserve dialog labels, amount breakdowns, cancellation reference, refund formatting, and route/API behavior.

## DailyMomentDayView baseline and extraction design

- Status: COMPLETED after the UI-focused Playwright group passed 6/6.
- Incoming contract: default `DailyMomentDayView` route owns day accordion state, daily moment mutations, ratings/charges, uploads, and PDF export; cards use the local Not Visited and KM dialogs.
- Completed boundary: `DailyMomentDayDialogs.tsx` owns only the two reusable dialog presentations and receives async save callbacks; service calls and day state remain in the page.
- Compatibility strategy: preserve field labels, validation text, callback timing, opening/closing KM payload values, status reason submission, and modal close/reset behavior while removing dialog-local explicit-`any` catches.

## BasicStep baseline and extraction design

- Status: COMPLETED after the hotel-form Playwright group passed 11/11.
- Incoming contract: `BasicStep` renders the hotel basic-information form and uses a local `ChipInput` for phone/email arrays; it owns dependent location option loading and create/update mutations.
- Completed boundary: `ChipInput.tsx` owns only chip parsing/validation and keyboard/focus presentation; the parent keeps form state, option effects, payload mapping, API mutation behavior, and navigation.
- Compatibility strategy: pass controlled `value`/`onChange` props, preserve chip validation and key handling, and retain existing form field names, labels, and save timing.

## LocationsPreviewView baseline and extraction design

- Status: COMPLETED after the authenticated locations group passed 3/3.
- Incoming contract: `LocationsPreviewView` receives a broad context from the locations preview page and renders filter controls, route/toll tables, exports, and CRUD dialogs.
- Completed boundary: source/destination filter presentation moved to `LocationsPreviewHeader.tsx`; the parent retains all context orchestration and remaining route/toll UI.
- Compatibility strategy: pass the existing context object, preserve source-change destination reset, option lists, Get Info callback, navigation, and labels without changing API requests.

## VendorStepVehicleTypeCostView baseline and extraction design

- Status: COMPLETED after the authenticated vendor group passed 5/5.
- Incoming contract: the vehicle-type cost step receives the existing vendor-step context and renders driver-cost, outstation, and local pricing tables plus add/edit/delete actions.
- Completed boundary: delete confirmation presentation moved to `VendorStepVehicleTypeCostDeleteDialogs.tsx`; pricing forms, table callbacks, state ownership, validation, and navigation remain in the parent.
- Compatibility strategy: pass the same context object and preserve delete ID handling, warning copy, callback order, and modal close/reset behavior.

## Validation policy

For each candidate: record a behavior baseline, run the narrow baseline tests, add only focused characterization tests when coverage is missing, extract one responsibility at a time, then run TypeScript, focused lint/tests, production build, and relevant Playwright coverage. Existing unrelated repository lint failures are recorded separately rather than hidden.
