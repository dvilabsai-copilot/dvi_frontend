# ItineraryDetails test matrix

| ID | Workflow | Test data | Prerequisites | Expected observables | Existing automated coverage | Baseline | Current |
|---|---|---|---|---|---|---|---|
| IT-01 | Initial load/timeline | `E2E_ITINERARY_QUOTE_ID` or `DVI202604247` | local API/frontend, auth token | URL stable, loader completes, day/timeline rows visible, no new console errors | `itinerary-anchor-hotspot-smoke`, hotspot suites | passed via existing smoke flow | passed |
| IT-02 | Route options/switch | record with routeOptions, e.g. `DVI202604230` parity fixture | API returns sibling routes | tabs/URL/request quote ID update, selected timeline replaces | `legacy-route-options-16` | not run | pending |
| IT-03 | Hotspot list/search/preview | `DVI202604247` or fixture selector | editable route with candidates | dialog, city/search filter, preview and toasts unchanged | `itinerary-anchor-hotspot-smoke`, `itinerary-hotspot-modal-regression` | not run | passed (2 preview tests) |
| IT-04 | Fit Here | `DVI202606167`, `DVI2026071` where configured | exact fixture/env and mutation cleanup | anchor, preview, retry/confirm, timeline and API payload unchanged | Fit Here suites | not run | pending |
| IT-05 | Activities | route with available activity | editable attraction | list/preview/add/delete and refresh unchanged | activity coverage in itinerary suites | not run | pending |
| IT-06 | Guides | `E2E_BOOKING_RULE_QUOTE_GUIDE_TOTAL` | guide availability | options, save/delete, total/toasts unchanged | `guide-*` | not run | pending |
| IT-07 | Hotels/arrival | `E2E_BOOKING_RULE_QUOTE_*` hotel fixtures | supplier/local API | hotel rows, search, arrival policy, room/voucher behavior unchanged | hotel/arrival suites | not run | pending |
| IT-08 | Vehicles | vehicle-only fixture or created quote | build API available | status/rows/charges unchanged | `vehicle-only-itinerary`, vehicle suites | not run | pending |
| IT-09 | Confirmation/wallet | created/resettable booking fixture | auth, wallet/prebook APIs | validation, modal transitions, payload and success unchanged | `confirm-booking-modal-e2e`, booking flows | not run | pending |
| IT-10 | Confirmed/read-only/cancel | confirmed ID from local data | confirmed route | mutations unavailable, view remains visible | confirmed itinerary coverage | not run | pending |
| IT-11 | Clipboard/share/source/gallery | any loaded itinerary | browser clipboard permissions optional | copy/share/preview dialogs and messages unchanged | partial existing coverage | not run | pending |
