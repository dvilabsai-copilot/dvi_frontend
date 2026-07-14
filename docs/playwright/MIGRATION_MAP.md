# Existing test migration map

The authoritative per-file map is [existing-test-classification.json](/c:/wamp64/www/dvi_fullstack/dvi_frontend/tests/e2e/coverage/existing-test-classification.json). It records the classification, behavior, routes, endpoints, fixed data, destructive actions, cleanup availability, and replacement slots for every current E2E asset.

Current classification totals:

- Retain: 18
- Refactor: 25
- Blocked: 22 (external-provider sandbox, legacy environment, parameterized fixtures, fixed-record legacy fixtures, and the vehicle-registration regression with no backend delete endpoint)
- Quarantine: 3 (production-connected historical files)
- Replace with fixture: 1 (shared booking seeder)

Important regression files are retained rather than deleted. Large itinerary, guide, hotel, and vendor specs remain migration targets behind explicit legacy-fixture or external-sandbox gates until their assertions are moved into independently runnable E2E-owned fixtures and focused specs.
