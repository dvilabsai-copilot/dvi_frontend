# Current behavior baseline

This characterization is based on the current `ItineraryDetails.tsx`, `ItineraryDetailsRouter.tsx`, `src/services/itinerary.ts`, and existing Playwright scenarios. No product behavior is intentionally changed by the refactor.

## Entry, loading, and read-only behavior

- `/itinerary-details/:id` first calls `ItineraryService.getDetails(id)` in the router. While that resolves, the router shows `Loading itinerary...`. A confirmed response renders the page with `readOnly` and `presentationMode="confirmed"`; a failed status check falls back to editable mode with a warning.
- `/confirmed-itinerary/:id` bypasses the normal status call and renders `ConfirmedItineraryDetails`.
- The page loads details for the current quote, stages loader messages, hydrates route options from the API/local storage, and may check/build permits, vehicles, and hotel details according to itinerary preference and confirmed/read-only state.
- The page preserves `ItineraryDetails` as both named and default exports for lazy routing/HMR.

## Timeline and route behavior

The loaded response supplies days and typed segments (start, travel, attraction, hotspot, break, check-in, return). The page normalizes timeline labels/times/durations and renders each day in order. Route tabs select sibling route quote IDs, update the URL, retain the current page during loading, then refresh details and dependent hotel/vehicle state. Route options are stored under `itinerary-route-options:<quoteId>` when hydrated.

## Hotspots and Fit Here

The Add Hotspot flow loads candidates for a route or exact anchor, supports search and city filtering, shows preview/impact/timeline resolution, and applies or rejects conflicts using existing toast text. Deletion optimistically removes the row, then refreshes details. Fit Here is available from timeline anchors and has manual and automatic preview paths, progress timers, retries, matrix-building fallback, optional/P3/protected replacement decisions, and a final confirmation request. Confirmed/read-only mode prevents mutations.

## Activities and guides

Activities are loaded for a selected attraction, previewed, added, and deleted with refreshes and existing success/error toasts. Guide assignment availability/options are loaded by plan/route, and assignments can be added, edited, or deleted unless read-only. Form incompleteness and missing language/slot produce the current validation toasts.

## Hotels and vehicles

Hotel display is gated by itinerary preference/read-only/confirmed state. Supplier hotels can be searched, selected by route/provider, paginated, room categories viewed, and used in arrival-policy decisions. Voucher creation/cancellation and hotel rebuild use existing service methods. Vehicle build status and rows are loaded/rebuilt, grouped by vehicle type, and displayed with charge breakdowns and totals. Hotel/vehicle cost calculations are derived from the current response and selected records.

## Clipboard, sharing, previews, and confirmation

Clipboard content can be fetched from the backend or assembled from rendered data; the page supports formatted/plain copy, recommended/highlights/para modes, link sharing, WhatsApp/mailto, source Markdown preview, gallery/video, pluck card, invoice, and voucher dialogs. Confirm Quotation loads customer/agent/wallet data, mirrors visible hotel selections, validates passenger/arrival/departure data and wallet amount, optionally prebooks TBO hotels, then calls `confirmQuotation`. Confirmed success shows the existing toast and reloads/refreshes the itinerary.

## Error/empty/read-only rules

Existing API failures use the current service error text or workflow-specific fallback toast. Empty hotel/hotspot/activity/guide states are rendered by the existing JSX. Read-only/confirmed mode suppresses mutation controls and cancellation/booking actions while retaining view and document actions. No new selector or behavior has been added yet.

## Baseline verification observed

- `npm run build`: passes (Vite build; existing chunk-size, Tailwind ambiguity, Browserslist, and dynamic-import warnings).
- `npx tsc -p tsconfig.app.json --noEmit`: fails on pre-existing errors outside this page plus router/HotelList prop errors that are present before refactoring; details are in `REGRESSION_LOG.md`.
- `npm run lint`: fails repository-wide (1,613 errors/77 warnings at baseline), dominated by existing `no-explicit-any` errors and an existing malformed E2E file.
- Playwright configuration and test data are documented in `TEST_DATA.md`; live execution requires the local API/frontend services and environment credentials.

## Live characterization observed

With the local frontend/API services on ports 8080/4006 and the existing E2E auth helper, both `itinerary-anchor-hotspot-smoke.spec.ts` and `itinerary-hotspot-modal-regression.spec.ts` passed. They confirmed URL stability, day-card loading, Fit Here dialog visibility, POST preview requests, selected anchor/hotspot fields, and duplicate-row protection.
