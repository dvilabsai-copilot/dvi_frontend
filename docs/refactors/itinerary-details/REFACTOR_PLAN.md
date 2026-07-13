# Refactor plan

The work is intentionally incremental. Each iteration moves one cohesive responsibility, runs the narrowest available verification, then runs build/type/lint checks appropriate to the repository baseline.

| Sequence | Source responsibility | Destination | Dependencies | Risk | Protection |
|---|---|---|---|---|---|
| 1 | API/domain types (lines 78-639) | `itinerary-details.types.ts` | React page, HotelList | Low | build + targeted typecheck |
| 2 | Pure vehicle/hotel/meal helpers (former lines 361-550) | `utils/domain.utils.ts` | vehicle row type | Low | targeted typecheck + build |
| 3 | Pure date/time/distance/timeline helpers (former lines 663-1300) | `utils/timeline.utils.ts` | timeline/domain types | Low/medium | targeted typecheck + build |
| 4 | Loader labels/deduped details request | constants/loader utility | ItineraryService | Medium | route/load E2E |
| 5 | Small page header/summary/loader sections | components | page-derived props | Medium | load/read-only E2E |
| 6 | Timeline/day/segment rendering | components/segments | normalized day/anchor helpers | High | timeline/Fit Here E2E |
| 7 | Small preview/share/gallery dialogs | dialogs/components | existing handlers initially | Medium | modal E2E |
| 8 | Activity and guide controllers/dialogs | hooks/dialogs | service calls, refresh callbacks | High | activity/guide E2E |
| 9 | Route/initial loader controller | hooks | dedupe/StrictMode guards | High | route-switch/load E2E |
| 10 | Hotel and vehicle controllers/sections | hooks/components | selection, pagination, costs | High | hotel/vehicle E2E |
| 11 | Hotspot listing controller | hooks/dialogs | preview/add/delete state | High | hotspot E2E |
| 12 | Fit Here controller/reducer/dialogs | hooks/reducers/dialogs | anchor/timer/matrix state | Very high | Fit Here E2E |
| 13 | Quotation confirmation controller/forms | hooks/dialogs | wallet/prebook/passenger payload | Very high | confirmation E2E |
| 14 | Final orchestration | page composition | all controllers/components | High | full itinerary suite/build |

The first source change is limited to declarations and imports. No API route, payload, toast text, validation rule, router prop, or business condition is changed.
