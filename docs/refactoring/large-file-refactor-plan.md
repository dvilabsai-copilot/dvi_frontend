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
| NOT_STARTED | `src/pages/locations/LocationsPage.tsx` | 1198 / 1195 | page/orchestration | high | data loading, filters, table/presentation |
| NOT_STARTED | `src/pages/agent/AgentFormPage.tsx` | 1164 / 1164 | complex form | high | form sections, validation, payload mapping |
| NOT_STARTED | `src/pages/dashboard/DashboardAdminView.tsx` | 1115 / 1106 | dashboard presentation | medium | role-specific sections and widgets |
| NOT_STARTED | `src/components/itinerary/manual-fit/ManualFitHerePreviewDialog.tsx` | 1101 / 1101 | dialog/orchestration | high | shared timeline rows only after comparison |
| NOT_STARTED | `src/pages/accounts/AccountsManager.tsx` | 1064 / 1064 | manager/page | high | loading, filters, table, dialogs |
| NOT_STARTED | `src/pages/vehicle-availability/VehicleAvailabilityPage.tsx` | 1057 / 1055 | page/orchestration | high | data state, filters, form/dialog presentation |
| NOT_STARTED | `src/components/itinerary/manual-fit/AutoFitHerePreviewDialog.tsx` | 1012 / 1012 | dialog/orchestration | high | compare with manual-fit before shared extraction |
| NOT_STARTED | `src/pages/ConfirmedItineraryDetails.tsx` | 1006 / 999 | details page | high | read-only sections, calculations, dialogs |
| NOT_STARTED | `src/pages/locations/LocationsPreviewPage.tsx` | 1005 / 1005 | preview page | medium | preview sections and data orchestration |
| COMPLETED | `src/pages/activity/ActivityFormView.tsx` | 945 / 945 | form presentation | high | review and preview tabs extracted |
| COMPLETED | `src/pages/HotelList.tsx` | 877 / 877 | hotel selection page | high | selection state, rows, actions, dialogs extracted |

The next iteration is exactly one file: `src/services/itinerary.ts`, selected because it is now the largest remaining authored source file and combines multiple itinerary endpoint domains behind one facade.

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

## Validation policy

For each candidate: record a behavior baseline, run the narrow baseline tests, add only focused characterization tests when coverage is missing, extract one responsibility at a time, then run TypeScript, focused lint/tests, production build, and relevant Playwright coverage. Existing unrelated repository lint failures are recorded separately rather than hidden.
