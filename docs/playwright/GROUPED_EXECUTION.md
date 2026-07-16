# Grouped Playwright E2E execution

Updated 2026-07-15.

The grouped projects run the existing E2E coverage by business area. They use the local API only and require an explicit process-level `E2E_ALLOW_WRITES=true`. The checked-in `.env.e2e` remains `E2E_ALLOW_WRITES=false`.

## Groups and latest results

| Group | Selected tests | Result |
|---|---:|---|
| Itinerary | 16 | 16 passed |
| Confirmed itinerary | 4 | 4 passed |
| Hotels | 11 | 11 passed |
| Vendors | 5 | 5 passed |
| Drivers + vehicle availability | 13 | 13 passed |
| Hotspots | 10 | 10 passed |
| Activities | 7 | 7 passed |
| Locations | 3 | 3 passed |
| Guides | 5 | 5 passed |
| Staff + agents | 10 | 10 passed |
| Business rules | 2 | 2 passed |
| UI/UX contracts | 6 | 6 passed |

Total: 92 tests, 92 passed.

The final run completed with no Playwright skips or failures. Draft plans created by the write tests were soft-deleted by their test cleanup. No quotation confirmation was executed.

## Commands

From `dvi_frontend` in PowerShell:

```powershell
$env:E2E_ALLOW_WRITES='true'

npm run e2e:seed:booking

npm run e2e:group:itinerary
npm run e2e:group:confirmed-itinerary
npm run e2e:group:hotels
npm run e2e:group:vendors
npm run e2e:group:drivers-vehicles
npm run e2e:group:hotspots
npm run e2e:group:activities
npm run e2e:group:locations
npm run e2e:group:guides
npm run e2e:group:staff-agents
npm run e2e:group:business-rules
npm run e2e:group:ui-ux

$env:E2E_ALLOW_WRITES='false'
```

To list a group without running it:

```powershell
$env:E2E_ALLOW_WRITES='true'
npx playwright test --list --project=group-itinerary
```

Replace `group-itinerary` with any project name above.

## Explicit exclusions

- Quotation confirmation is excluded, including `confirm-booking-modal-e2e.spec.ts` and the booking-flow confirmation path.
- Vehicle type master, parking charge, between-hotspots, toll charge, pricebook/settings, and AxisRooms pricebook workflows are excluded.
- The groups do not include quarantined, external-provider, or legacy-environment projects.

## Added scenario coverage

- Business rules: ordered itinerary days and valid segment times; same-city before-noon and after-noon check-in sequencing; the 20 km same-city boundary; different-city travel before hotel check-in; closed-hotspot deferral annotations; houseboat no-attraction behavior; distance warning text; and guide total calculation.
- UI/UX contracts: narrow-viewport usability and overflow checks for itinerary creation, hotels, hotspots, activities, and locations; itinerary-details sharing controls; clipboard menu visibility; clipboard dialog open/cancel behavior; and the rule that these actions do not navigate to quotation confirmation.

## Current coverage limits

The grouping organizes the executable tests currently present. Quotation confirmation and the explicitly excluded master/settings/provider workflows remain outside the groups. The guides group uses the stable authenticated page and dropdown-contract coverage; the older exploratory guide CRUD specs remain outside grouped execution because their UI flow currently hangs after the validation step.

## Fixes applied for the clean run

- Seeded the booking-engine scenarios into the local E2E database and persisted their quote IDs in `.env.e2e`, removing fixture-driven skips.
- Fixed async vehicle-build waiting and draft-plan cleanup for vehicle-only itinerary tests.
- Fixed current hotel-form selectors/login bootstrap and validation assertions.
- Scoped the network monitor to known non-blocking background requests and Razorpay bootstrap calls while retaining HTTP and browser-error checks.
- Fixed current driver/staff/agent selectors, unique vehicle registrations, guide date-picker prop leakage, and guide country selection.
- Vehicle availability add-form coverage now uses the shared authenticated fixture and waits for the route/chart contract before opening mutation dialogs.
