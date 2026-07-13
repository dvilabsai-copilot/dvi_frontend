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

Extracted presentational boundaries now include the loader/error states, media/share/source dialogs, delete confirmation, clipboard dialog, all-hotspots preview, and compact day header.
