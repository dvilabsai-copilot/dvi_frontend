# Final report

Refactor remains in progress; this checkpoint records the verified state after the latest committed controller-state extractions.

Current facts:

- Original `ItineraryDetails.tsx`: approximately 19,604 physical lines.
- Stable router entrypoint `ItineraryDetails.tsx`: 14 lines.
- Thin composition runtime `ItineraryDetailsRuntime.tsx`: 11 lines.
- Transitional controller `ItineraryDetailsController.tsx`: 12,081 lines; it is explicitly documented as the remaining staging module to split by workflow.
- Required documentation and architecture map: created.
- Existing named/default exports: preserved so far.
- Build baseline: passes.
- Typecheck/lint baseline: fail for documented pre-existing repository errors.
- Focused Playwright characterization: exact-anchor Fit Here and hotspot preview regression both pass after the latest extraction.
- Full itinerary Playwright suite (latest parallel rerun): 34 tests executed; 9 passed, 2 skipped, and 23 failed for documented shared-data/environment/parity issues. Focused pair remains 2/2 passed.
- Extracted boundaries now include loader/error, confirmed-quote banner, media/share/source, delete confirmation, all-hotspots preview, clipboard, para recommendations, day header, timeline segments, guide modal/delete workflows, activity availability/preview/add/delete workflows, vehicle build/rebuild workflow, vehicle section/grouping composition, vehicle-only clipboard workflow, quotation passenger validation/payload construction, quotation passenger-form view, quotation travel-details view, quotation dialog footer view, quotation passenger-requirement notice, quotation prebook loading notice, quotation hotel-selection preparation, quotation occupancy utilities, quotation confirmation payload construction, quotation hotel-booking row normalization, quotation prebook selection preparation, quotation confirmation completion/reset, quotation booking guards, quotation route/prebook context derivation, manual hotspot application, wallet balance/panel/top-up workflow, route switching, hotel selection/search/voucher workflows, hotel refresh/rebuild, selection coverage, hotspot deletion/matrix recovery/preview/priority approval/Fit Here preview/dialog/error/confirmation state/reset/normalization/refresh helpers, computed totals, and the previously documented state/derived boundaries.
- Remaining work: split the transitional controller into domain controllers/views, remove compatibility fragments, extract vehicle actions/view and the large hotspot/Fit Here and quotation review sections, then run the full green verification loop.
- Intentional behavior changes: none.
- Documented blockers: repository-wide lint baseline (1,936 errors/107 warnings), existing unrelated type errors, and 23 broader-suite failures classified in `REGRESSION_LOG.md`.
