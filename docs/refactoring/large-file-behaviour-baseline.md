# Large-file observable behavior baselines

This document records behavior before each selected file is changed. It is intentionally separate from implementation notes so regressions can be compared against an observable contract.

## HotelList.tsx (pre-extraction)

- Purpose/routes: hotel choices embedded in itinerary details; normal and confirmed/read-only itinerary views consume the component.
- Incoming contract: `HotelListProps` supplies open/restricted hotels, tabs, availability, quote/plan identifiers, rate visibility, room count, pagination, callbacks for refresh, totals, saving, vouchers, and selection changes.
- Export contract: named `HotelList` export and default component export remain required.
- API behavior: room-detail loading, route sync, stay-extension preview/confirm, batch selection save, and supplier-specific multi-night payload shaping are delegated to the existing `ItineraryService`; endpoint/method/payload behavior must not change.
- State: active group, local open/restricted hotel arrays, selected-by-group and user overrides, expanded row/room details/cache, room search/dropdown, unsaved selections, sync/update progress, pending action/confirmation dialog, stay-extension modal, voucher rows, and rate visibility.
- Effects: initialize active tab from backend tabs, mirror rate visibility, refresh expanded room details when hotel rows change, synchronize selected vouchers in read-only mode, notify parent totals and selected hotels, and expose the save callback.
- Interactions: expand/collapse a stay, search/select a room, confirm/update/cancel a hotel, sync a route, add/extend a stay, save all selections, create/cancel vouchers, sort/scroll/paginate rows, and read-only rendering.
- States and quirks: empty hotels, placeholders, restricted/not-bookable suppliers, meal-plan mismatch warnings, external stays, loading progress, confirmation prompts, and supplier multi-night route deletion semantics must remain unchanged.
- Styling/selectors: `HotelList.module.css`, table/dialog markup, labels, and callback timing are compatibility-sensitive.

## ActivityFormView.tsx (pre-extraction)

- Purpose/routes: presentation for the activity create/edit form; `ActivityForm.tsx` owns orchestration and passes one context object.
- Export contract: named `ActivityFormView` export; no default export is introduced.
- Incoming context: active tab, form data, loading/edit/read-only flags, hotspot options, images, price-book rows/dates, review state, navigation, field handlers, CRUD/export callbacks, and tab navigation callbacks.
- Observable tabs: basic details (title, hotspot, person limit, duration, image upload/delete, description, default/special times), price book (dates, pricing rows, edit/update), review (rating/feedback CRUD, search, page size, pagination, copy/Excel/CSV), and read-only preview.
- Form behavior: controlled fields, disabled read-only tabs/controls, existing labels and formatting, image confirmation dialog, validation and submit callback, and unchanged navigation between tabs.
- API/storage behavior: none owned by this view; callbacks preserve the parent’s existing API calls, payloads, hydration, and error/toast behavior.
- Styling/selectors: existing Tailwind classes, table structure, button labels, and route links are compatibility-sensitive.
- Known quirks to preserve: existing text encoding artifacts and exact review/preview formatting are not silently “cleaned up” during extraction.
- Existing coverage: activity Playwright group and any activity unit tests are the relevant suites; baseline results must be recorded before marking complete.

## RoomsStep.tsx (pre-extraction)

- Purpose/routes: the Rooms step of the hotel create/edit flow, rendered by `HotelForm.tsx` at `/hotels/:id/edit?tab=rooms`; the default export must remain `RoomsStep`.
- Incoming props: `api` context (`apiGet`, `apiPost`, `apiGetFirst`, optional `apiDelete`), `hotelId`, `onPrev`, and `onNext`.
- API calls and fallback order: GST percentages use `/api/v1/meta/gst/percentages`, `/api/v1/gst/percentages`, `/api/v1/meta/gst/percents`; room types use hotel-specific `/roomtypes` and `/room-types`, query variants, then `/api/v1/room-types` with static fallback; amenities use `/api/v1/hotels/inbuilt-amenities`, `/api/v1/meta/inbuilt-amenities`, `/api/v1/inbuilt-amenities`; existing rooms use `/api/v1/hotels/:id/rooms`, `/api/v1/hotels/rooms?hotelId=`, `/api/v1/rooms?hotelId=`; delete uses `/api/v1/hotels/:id/rooms/:roomId`; save tries `/api/v1/hotels/:id/rooms/bulk`, `/api/v1/hotels/:id/rooms`, `/api/v1/rooms/bulk`, first with `{ items: batch }` then the raw batch; gallery uploads POST to `/hotels/:id/rooms/:roomId/gallery` with bearer token and `FormData`.
- State/effects: rows, initial comparable snapshots, validation/status messages, delete index, top success message/timer, React Query caches/mutations, localStorage `USE_ROOM_TYPE_STATIC`, and cleanup of the success timer.
- Data rules: default room values, GST included/excluded mapping (1/2), 0/1 DB flags, 12/24-hour conversion, room reference generation, preferred-for and amenity list normalization, room-type name-to-ID resolution, 25-row save batches, and non-blocking gallery upload.
- User interactions: add room, type/select room type with keyboard navigation, choose/remove preferred audiences and amenities, edit all room fields, choose gallery files, toggle food flags, delete with confirmation, navigate Back, and Update & Continue.
- Validation/messages: required room type/title/availability/AC/status/adult/children/check-in/check-out/GST fields; exact existing error strings, success messages, delete dialog text, button labels, and saving/deleting states must remain unchanged.
- Styling/accessibility: picker classes, `role="combobox"`, `role="listbox"`, `role="option"`, `aria-controls`, `aria-expanded`, keyboard behavior, file input, and all existing Tailwind classes are compatibility-sensitive.
- Existing tests: hotel form Playwright coverage includes tab discovery, empty-form validation, structure checks, and save flow. Baseline structure/navigation/validation tests passed 3/3; save flow was not run in the baseline because it writes test data.

## services/itinerary.ts (pre-extraction)

- Purpose/contract: public `ItineraryService` facade consumed throughout itinerary details, latest/confirmed/cancelled itinerary, hotel, vehicle, activity, hotspot, invoice, voucher, incidental-expense, and booking flows. Existing imports from `@/services/itinerary` remain compatibility-sensitive.
- Exported symbols: `ItinerarySaveType`, `ItineraryClipboardMode`, `HotspotScenarioMarkdownResponse`, hotel-arrival and stay-extension request/response types, manual-fit payload types, PDF option/result types, and the `ItineraryService` object with its existing method names.
- API domains: create/update/edit/template/latest/details/guide/build/permit/hotel-room/clipboard/scenario/confirmed; activity and hotspot availability, preview, insert, apply, remove and rebuild; hotel selection/search/availability; vehicle selection/build; quotation confirmation/prebook/cancel; confirmed/cancelled/accounts listings and filters; vouchers/invoices/pluck-card PDFs; incidental expenses.
- Transport behavior: standard calls use the existing `api` helper; PDF downloads use authenticated `fetch`, bearer token handling, 401 redirect to `/login`, JSON error extraction, content-disposition filename parsing, object URL creation/revocation, and optional unauthenticated preview behavior.
- Observable request contract: exact endpoint paths, HTTP methods, cache policies, no-cache headers, query parameter names/order, payload fields, fallback handling, and return casts are compatibility-sensitive and were inventoried before extraction.
- Consumers/tests: pages and hooks call individual `ItineraryService` methods directly; no consumer was changed. Existing itinerary, confirmed-itinerary, hotel, activity, and vehicle Playwright groups cover the affected request paths. No new API behavior or UI workflow was introduced.
- Known quirks: legacy explicit `any` payload fields and text-encoding artifacts remain in the compatibility facade; they were not broadened or “cleaned up” during extraction.

## locations/LocationsPage.tsx (pre-extraction)

- Purpose/routes: authenticated admin/agent location master list at `/locations`; row preview navigates to `/locations/:id/preview`.
- Export/consumers: default `LocationsPage` export consumed by `App.tsx`; child `AddLocationDialog` and `EditLocationDialog` own add/edit form markup and submit callbacks.
- API calls: `locationsApi.dropdowns`, `list` (including same-source/destination fallback pagination), `create`, `update`, `modifyName`, `updateLocationName`, `deleteLocationName`, `remove`, `restore`, `tolls`, and `saveTolls`.
- State/effects: paginated rows/total/page/page size; source/destination/search filters with 300ms debounce; dropdown loading; selected/edit rows; add progress loader; rename/delete dialogs; delete-selected popup filters, pagination, selected IDs; toll dialog; effects for initial dropdown/list loading, debounced search, popup filtering, and dialog option animation frames.
- Interactions: add, modify, update/rename, delete by location name, delete selected rows with undo, toll editing, source/destination autosuggest filters, clear/search/page-size controls, row selection, preview/edit/delete action buttons, and pagination.
- Validation/messages: same-location routes under 10 km are rejected; exact toast/error strings, progress stages, undo timing, dialog labels, table headers, and text-encoding artifacts are compatibility-sensitive.
- Styling/accessibility: Tailwind classes, shadcn Dialog/Table/Select/Button/Input structure, autosuggest props, and row/button event propagation are covered by selectors and visual layout.
- Baseline tests: `E2E_ALLOW_WRITES=true npm run e2e:group:locations` passed 3/3 (admin/agent page load plus filters/search/clear/page-size workflow).
