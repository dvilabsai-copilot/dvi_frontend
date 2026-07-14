# Final report

Refactor remains in progress; this checkpoint records the verified state after the latest committed controller-state extractions.

Current facts:

- Original `ItineraryDetails.tsx`: approximately 19,604 physical lines.
- Stable router entrypoint `ItineraryDetails.tsx`: 14 lines.
- Thin composition runtime `ItineraryDetailsRuntime.tsx`: 11 lines.
- Transitional controller `ItineraryDetailsController.tsx`: 10,809 lines; it is explicitly documented as the remaining staging module to split by workflow.
- Required documentation and architecture map: created.
- Existing named/default exports: preserved so far.
- Build baseline: passes.
- Typecheck/lint baseline: fail for documented pre-existing repository errors.
- Focused Playwright characterization: exact-anchor Fit Here and hotspot preview regression both pass after the latest extraction.
- Full itinerary Playwright suite (latest parallel rerun): 34 tests executed; 9 passed, 2 skipped, and 23 failed for documented shared-data/environment/parity issues. Focused pair remains 2/2 passed.
- Extracted boundaries now include loader/error, confirmed-quote banner, media/share/source, delete confirmation, all-hotspots preview, clipboard, para recommendations, day header, timeline segments, guide modal/delete workflows, activity availability/preview/add/delete workflows, vehicle build/rebuild workflow, vehicle section/grouping composition, vehicle-only clipboard workflow, quotation passenger validation/payload construction, quotation passenger-form view, quotation travel-details view, quotation dialog footer view, quotation passenger-requirement notice, quotation prebook loading notice, quotation agent summary view, quotation rooming preview view, quotation prebook TBO hotel rows view, quotation prebook acceptance notice, quotation non-TBO acceptance notice, quotation hotel-selection preparation, quotation occupancy utilities, quotation confirmation payload construction, quotation hotel-booking row normalization, quotation prebook selection preparation, quotation confirmation completion/reset, quotation booking guards, quotation route/prebook context derivation, quotation confirmation modal shell, manual hotspot application, hotspot dialog header view, hotspot city-tabs view, hotspot list-state view, hotspot selection notice view, hotspot dialog footer view, hotspot apply-button view, Fit Here timeline-row/anchor composition, Fit Here empty-state guidance, Fit Here selected-hotspot header, Fit Here preview loading state, same-city rescheduling notice, route-fit feasibility notice, empty preview-timeline fallback, resolved-overflow header, resolved-overflow final-timeline notice, resolved-removal leak diagnostic, day-end overflow notice, wallet top-up actions view, wallet balance/panel/top-up workflow, route switching, hotel selection/search/voucher workflows, hotel refresh/rebuild, selection coverage, hotspot deletion/matrix recovery/preview/priority approval/Fit Here preview/dialog/error/confirmation state/reset/normalization/refresh helpers, computed totals, and the previously documented state/derived boundaries.
- New in this checkpoint: staged itinerary loading, hotel hydration, vehicle-build handoff, stale-request guards, and loading/error cleanup are isolated in `usePreparedItineraryPageLoader.ts`.
- New in this checkpoint: route rebuild mutation/progress and refresh behavior are isolated in `useRouteRebuildMutation.ts`.
- New in this checkpoint: route-time PATCH progress, refresh, and hotel-detail preservation are isolated in `useRouteTimePatchMutation.ts`.
- New in this checkpoint: arrival-policy decision-key derivation is shared through `routeArrivalPolicy.utils.ts`.
- New in this checkpoint: arrival-policy route-time gating and confirmation persistence are isolated in `useArrivalPolicyRouteTimeController.ts`.
- New in this checkpoint: guide availability loading and loading/error cleanup are isolated in `useGuideAvailabilityLoader.ts`.
- New in this checkpoint: guide assignment save validation, persistence, cost reconciliation, itinerary totals, and toast handling are isolated in `useGuideAssignmentSaveMutation.ts`.
- New in this checkpoint: canonical hotel-selection merging and multi-night child-route cleanup are isolated in `useHotelSelectionsChangeMutation.ts`.
- New in this checkpoint: guide assignment lookup, availability gating, slot windows, and attraction coverage are isolated in `guideAssignment.utils.ts`.
- New in this checkpoint: backend hotspot availability normalization and active/excluded route reconciliation are isolated in `hotspotAvailability.utils.ts`.
- New in this checkpoint: hotspot source/destination city-context derivation is isolated in `hotspotCityContext.utils.ts`.
- New in this checkpoint: Fit Here anchor-key normalization and serialization are isolated in `fitHereAnchor.utils.ts`.
- New in this checkpoint: Fit Here timeline label/time/type guards and attraction ID helpers are isolated in `fitHereTimeline.utils.ts`.
- New in this checkpoint: Fit Here anchor construction from timeline rows is isolated in `fitHereAnchorBuilder.utils.ts`.
- New in this checkpoint: day-segment-to-preview timeline mapping is isolated in `fitHerePreviewTimeline.utils.ts`.
- New in this checkpoint: selected-hotspot preview segment selection and conflict/time ordering are isolated in `fitHereSelectedPreview.utils.ts`.
- New in this checkpoint: removed-hotspot detail normalization and optional-removal filtering are isolated in `previewRemovedHotspots.utils.ts`.
- Remaining work: split the transitional controller into domain controllers/views, remove compatibility fragments, extract vehicle actions/view and the large hotspot/Fit Here and quotation review sections, then run the full green verification loop.
- Intentional behavior changes: none.
- Documented blockers: repository-wide lint baseline (1,936 errors/107 warnings), existing unrelated type errors, and 23 broader-suite failures classified in `REGRESSION_LOG.md`.
