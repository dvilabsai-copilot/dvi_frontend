# ItineraryDetails architecture map

## Entry points and exports

- `src/App.tsx` routes `/itinerary-details/:id` and `/confirmed-itinerary/:id` through `ItineraryDetailsRouter`.
- `ItineraryDetailsRouter` lazily imports `./ItineraryDetails`, resolving the named `ItineraryDetails` export first and the default export second. The page must retain both exports.
- Confirmed routes are handled by `ConfirmedItineraryDetails`; normal routes call `ItineraryService.getDetails(id)` to determine whether the editable page should be read-only.

## Page dependency surface

The page imports React Router, the shared UI primitives, Lucide icons, itinerary/hotel/vehicle/modal components, `ItineraryService`, `AgentAPI`, the generic `api` client, `HotelVoucherService`, hotel-search types, Sonner toast, and create-itinerary progress constants. `HotelList.tsx` also imports the page's exported hotel and vehicle row types.

## Top-level declarations (first extraction boundary)

The first 1,300 lines contain API/domain types for timeline segments, days, hotspots, guides, hotels, vehicles, package/cost data, route options, and itinerary responses. They also contain pure helpers for dates, times, distances, durations, meal-plan labels, hotel bookability, hotspot city/route matching, timeline normalization, and request deduplication. These are the safest initial extraction candidates.

## Major state groups and workflows

- Initial details/loader stages, selected route, route options, route switching, vehicle build progress, and hotel prefetch.
- Timeline/day display and route-time progress.
- Hotspot listing/search/city filter/preview/add/delete/rebuild.
- Manual and automatic Fit Here, matrix build, retries, priority/optional replacement, and confirmation.
- Activity listing/preview/add/delete.
- Guide availability/options/add/edit/delete.
- Hotels: supplier search, selection, room categories, arrival policy, voucher/cancellation, pagination, group type, costs.
- Vehicles: rows, build state, grouping, assignment and charges.
- Clipboard/share/source Markdown/gallery/video dialogs.
- Quotation confirmation: wallet, prebook, guest/passenger forms, arrival/departure, validation, final confirmation.
- Confirmed/read-only and cancellation presentation.

## Effects, refs, and browser coupling

Effects cover initial route/details loading, route switching, hotel hydration, scroll restoration, sticky-height measurement, and confirmation state. Refs track hotspot/timeline/priority scrolling, Fit Here and route-time progress timers, in-flight requests, mounted state, hotel save/prebook data, and pending day scroll. Browser coupling includes local/session storage route options and scroll day, Clipboard APIs, window prompts/confirms/open/reload/scroll, resize/keyboard events, timers, and DOM lookup for sharing/scrolling.

## API dependency map

`ItineraryService` methods used by the page include details/hotel/vehicle build operations, route rebuild and route-time updates, hotspot and Fit Here preview/apply operations, activity and guide operations, hotel search/selection/prebook/cancellation, customer/wallet/quotation confirmation, clipboard/markdown, and voucher/invoice data. `AgentAPI.addCashWallet` is used for confirmation wallet top-up. The exact routes and payloads remain in `src/services/itinerary.ts` and are not changed by this refactor.

## Coupling/risk points

1. `HotelList.tsx` imports named page types.
2. The lazy router depends on both page exports and prop names.
3. Details request deduplication and StrictMode guards are module/page coupled.
4. Fit Here preview state is coupled to timeline anchor construction and modal JSX.
5. Confirmation payload construction depends on hotel selection, prebook state, wallet state, and passenger validation.
6. Optimistic hotspot/activity changes are followed by details/hotel refreshes.
7. Existing E2E tests mutate shared itinerary records; mutation tests must keep their current cleanup/reset behavior.

## Existing test coverage

The repository already has itinerary E2E tests for loading/route options, hotspot modal/add/replacement/timing, Fit Here exact/automatic/confirm/replay, guide, hotel, vehicle, arrival policy, confirmation, and PHP/Nest parity. Unit tests are present for unrelated services/pages; no dedicated `ItineraryDetails` unit test was found.

Extracted presentational boundaries now include the loader/error states, media/share/source dialogs, delete confirmation, clipboard dialog, all-hotspots preview, compact day header, and segment/timeline renderer.

The confirmed-quote read-only banner is isolated in `ConfirmedQuoteBanner.tsx`; it owns only the visual context surface and has no workflow or API dependencies.

## Current composition checkpoint

- `src/pages/ItineraryDetails.tsx` is the stable 14-line router/HMR entrypoint. It preserves the named/default component exports and historical hotel/vehicle type re-exports.
- `src/pages/ItineraryDetailsRuntime.tsx` is the thin composition boundary for the route and preserves the router-facing named/default exports.
- `src/pages/ItineraryDetailsController.tsx` is the explicitly named transitional controller module while the remaining workflows are split by responsibility. It currently consumes `ItineraryHeader`, `VehicleBuildErrorState`, `useHotspotState`, `useItineraryRouteState`, `useQuotationState`, `useHotelSelectionState`, `useHotelWorkflowState`, `useMediaShareState`, `useActivityState`, and `useGuideState`.
- State ownership extracted so far: route/loading and route-option hydration; hotspot/Fit Here state and refs; quotation/wallet/passenger state; hotel selections/totals/pagination refs; gallery/video/clipboard/share state.
- Destructive-action state is isolated in `useItineraryDeletionState`: hotspot deletion/rebuild flags, all-hotspots preview modal state, and activity deletion state remain independent from their API handlers and dialog rendering.
- Route-time progress mechanics are isolated in `useRouteTimeProgressController`; the page retains only workflow decisions and passes the existing state setters/timer ref through.
- Vehicle total synchronization is isolated in `useVehicleTotalsSync`; it derives active vehicle types, clears stale quote totals, and seeds cheapest defaults without owning vehicle API actions.
- Sticky summary measurement, section scrolling, and day-count ref tracking are isolated in `useItineraryScrollController`.
- Paginated hotel-row loading and merge behavior are isolated in `useHotelPaginationController`; hotel search, selection, and rebuild actions remain separate concerns.
- Guide assignment loading and post-mutation itinerary refreshes are isolated in `useGuideDataRefresh`; guide modal/options mutations remain in the page workflow.
- Remaining high-risk boundaries: hotel search/arrival/room-selection operations, vehicle workflow, hotspot/Fit Here action controller and large modal view, and quotation review/submission view.
