# Hotel pricing parity E2E tests

These tests are intentionally opt-in. They must run against a staging API and staging frontend with E2E-owned itineraries; the repository preflight blocks production hosts.

Configure `.env.e2e` or the shell with:

```text
E2E_HOTEL_PARITY_ITINERARIES=STAGING_QUOTE_1,STAGING_QUOTE_2
E2E_HOTEL_PARITY_REQUIRED_CASES=tbo|rooms=1|extraBed=0,axisrooms|rooms=3|extraBed=1,offline|rooms=2
```

The required-case entries are partial matches. The test also records child-with-bed and child-without-bed counts when the API supplies them. Add one staging itinerary for every provider/occupancy combination that must be release-covered.

Run the read-only parity test first:

```powershell
npx playwright test tests/e2e/hotel-pricing-parity.spec.ts --project=hotel-pricing-parity --grep "every provider"
```

Then run the repeated reset test only against an isolated E2E database with writes explicitly enabled:

```powershell
$env:E2E_ALLOW_WRITES = "true"
npx playwright test tests/e2e/hotel-pricing-parity.spec.ts --project=hotel-pricing-parity --grep "repeated actions"
```

The suite fails when:

- a selected API row lacks `totalHotelCost` and `totalPrice`;
- both backend totals exist but disagree;
- an explicit backend breakdown does not reconcile to the payable total;
- a rendered row, recommendation tab, overall cost, or tooltip differs from the API;
- reload or repeated reset changes the parity result; or
- a required provider/occupancy case was not observed.

