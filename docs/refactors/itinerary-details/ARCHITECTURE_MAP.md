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
- Quotation confirmation opening and final submission are isolated in dedicated hooks, keeping customer/agent hydration, prebook preparation, wallet gating, and confirmation payload submission out of the page controller.

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
- Guide availability loading and loading/error cleanup are isolated in `useGuideAvailabilityLoader`; guide assignment state remains controller-owned.
- Guide assignment save validation, persistence, cost reconciliation, itinerary totals, and toast handling are isolated in `useGuideAssignmentSaveMutation`; delete remains in `useGuideDeleteMutation`.
- Canonical HotelList selection merging and multi-night child-route cleanup are isolated in `useHotelSelectionsChangeMutation`; hotel totals and quotation preparation remain separate consumers.
- Guide assignment lookup, availability gating, slot windows, and attraction coverage are isolated in `guideAssignment.utils`; guide orchestration and modal state remain controller-owned.
- Backend hotspot availability normalization and active/excluded route reconciliation are isolated in `hotspotAvailability.utils`; hotspot fetching and modal workflows remain controller-owned.
- Hotspot source/destination city-context derivation is isolated in `hotspotCityContext.utils`; route metadata remains passed in explicitly to avoid stale async state.
- Fit Here anchor-key normalization and serialization are isolated in `fitHereAnchor.utils`; anchor discovery and preview orchestration remain controller-owned.
- Fit Here timeline labels, times, type guards, attraction IDs, and next-attraction lookup are isolated in `fitHereTimeline.utils`; anchor construction remains controller-owned.
- Fit Here anchor construction from start/attraction rows is isolated in `fitHereAnchorBuilder.utils`; route-specific preview orchestration remains controller-owned.
- Day-segment-to-preview timeline mapping is isolated in `fitHerePreviewTimeline.utils`; selected/active preview reconciliation remains controller-owned.
- Selected-hotspot preview segment fallback, conflict preference, and time ordering are isolated in `fitHereSelectedPreview.utils`; active preview reconciliation remains controller-owned.
- Removed-hotspot detail normalization and optional-removal filtering are isolated in `previewRemovedHotspots.utils`; priority/confirmation orchestration remains controller-owned.
- Pending top-priority replacement detection is isolated in `previewPriority.utils`; approval state and confirmation effects remain controller-owned.
- Automatic Fit Here removed-row extraction, priority detection, and attempt scoring are isolated in `autoPreviewScoring.utils`; preview orchestration remains controller-owned.
- Automatic Fit Here downstream progress text is isolated in `autoPreviewProgress.utils`; request lifecycle and modal state remain controller-owned.
- Automatic Fit Here preview request lifecycle, anchor progress rows, stale-response protection, result selection, and modal transitions are isolated in `useAutoFitHerePreviewController`; anchor discovery remains controller-owned.
- Fit Here confirmation validation, mutation payload, optimistic timeline update, refresh handoff, expired-attempt recovery, and retry paths are isolated in `useFitHereConfirmationMutation`; confirmation state/reset/refresh helpers remain separate boundaries.
- Clipboard recommendation grouping and local hotel/vehicle/cost package HTML and plain-text composition are isolated in `useClipboardContentBuilder`; remote clipboard retrieval and copy behavior remain in `useHotelClipboardAction`.
- Hotel refresh, group switching, rebuild, and vehicle refresh mutations share the existing `useHotelDataController`; duplicate page-level hotel-refresh orchestration was removed.
- Display-day fallback selection, segment safeguards, diagnostics, and start-segment ordering are isolated in `useDisplayItineraryDays`.
- Source-markdown preview quote resolution, loading/reset transitions, retrieval, heading fallback, and errors are isolated in `useSourcePreviewController`.
- Route-hotel cache writes, cached-result reuse, in-flight request de-duplication, and fetch cleanup are isolated in `useRouteHotelDetailsCache`.
- Hotspot search matching, availability classification, previewability, and modal list ranking are isolated in `useFilteredHotspots`.
- Hotspot source/destination city labels and cross-city route detection are isolated in `useHotspotRouteCityContext`.
- Hotspot city buckets, grouped rows, tabs, active-tab visibility, and destination-context tab selection are isolated in `useHotspotCityPresentation`.
- Matrix/anchor insertion-slot label normalization and destination fallback text are isolated in `useDestinationInsertionSlotLabel`.
- Fit Here result-type normalization and tried-anchor status labels are isolated in `fitHereAttemptStatus.utils`.
- Fit Here hotspot selection invalidation and modal-reset orchestration are isolated in `useFitHereHotspotSelection`.
- Current-route attraction/manual hotspot IDs, exclusion filtering, and manual hotspot metadata derivation are isolated in `routeHotspotIds.utils`.
- Active Fit Here preview route filtering, removal filtering, matrix ordering, and time/type fallback ordering are isolated in `activePreviewTimeline.utils`; resolution selection remains controller-owned.
- Active preview resolution precedence (manual, group, then selected hotspot) is isolated in `activePreviewResolution.utils`; validation and normalized-decision derivation remain controller-owned.
- Preview validation reason normalization, unscheduled-hotspot messaging, and destination-name substitution are isolated in `previewValidationReason.utils`; matrix apply gating remains controller-owned.
- Fit Here matrix apply-blocking decisions, including relaxed-route bypasses and destination-side behavior, are isolated in `matrixApplyBlocked.utils`; confirmation controls remain controller-owned.
- Insertion-slot normalization, route-fit labels, metrics fallback, and destination-side naming are isolated in `normalizedInsertionSlots.utils`; active-anchor insight derivation is isolated in `useActiveAnchorFitInsight.ts`.
- Fit Here anchor button presentation and tried-anchor status styling are isolated in `FitHereAnchorButton.tsx`; anchor selection remains injected from the controller.
- Automatic Fit Here start/attraction anchor filtering and de-duplication are isolated in `useAutoFitHereAnchors.ts`; timeline-row anchor construction remains injected.
- Vehicle-type selection requirements, rate-unavailable blocking, and quotation confirmation gating are isolated in `useVehicleRateSelectionGuard.ts`.
- Vehicle-build usable-row detection and intentional no-rate-state handling are isolated in `vehicleAvailability.utils.ts`.
- Stable Fit Here segment helpers and timeline-row anchor construction are isolated in `useFitHereTimelineHelpers.ts`.
- TBO hotel selection totals, prebook-price comparison, and detailed passenger-flow requirements are isolated in `useTboHotelSelectionSummary.ts`.
- Overall-cost rendering, hotel room-cost hover details, entry-ticket breakdown, and payable totals are isolated in `ItineraryOverallCost.tsx`.
- Clipboard/share menus, quotation actions, confirmed-document actions, and back-to-top behavior are isolated in `ItineraryActionButtons.tsx`.
- Shared non-TBO selected-hotel review cards and policy sections are isolated in `QuotationNonTboSelectedHotels.tsx`.
- Available-hotspot card status derivation, media actions, and preview/Fit Here controls are isolated in `HotspotSelectionCard.tsx`.
- Proposed-timeline reschedule, overflow, resolved-removal, and leak notices are isolated in `HotspotPreviewTimelineNotices.tsx`.
- Sticky proposed-timeline apply/selection controls are isolated in `HotspotPreviewApplyAction.tsx`.
- Optional-hotspot-removal warnings are consolidated into `HotspotPreviewTimelineNotices.tsx`.
- Synthetic waiting-gap rendering is isolated in `HotspotPreviewWaitingSegment.tsx`.
- Common proposed-timeline segment summaries and metrics are isolated in `HotspotPreviewSegmentSummary.tsx`.
- The former inline insertion-slot implementation is no longer retained as a commented compatibility fragment; the utility is the sole implementation.
- Vehicle total synchronization is isolated in `useVehicleTotalsSync`; it derives active vehicle types, clears stale quote totals, and seeds cheapest defaults without owning vehicle API actions.
- Sticky summary measurement, section scrolling, and day-count ref tracking are isolated in `useItineraryScrollController`.
- Paginated hotel-row loading and merge behavior are isolated in `useHotelPaginationController`; hotel search, selection, and rebuild actions remain separate concerns.
- Guide assignment loading and post-mutation itinerary refreshes are isolated in `useGuideDataRefresh`; guide modal/options mutations remain in the page workflow.
- Pluck-card and invoice preview actions are isolated in `useItineraryDocumentActions`; the header receives the same callbacks and plan-id guard.
- Complete hotel hydration, confirmed-hotel normalization, and preference-gated hotel loading are isolated in `useHotelDetailsLoader`; route-state refs still receive the current loader callback.
- Selected-hotel totals and route-level display metadata are isolated in `useSelectedHotelSummary`; it owns matching and cheapest-row fallback derivation only.
- Displayed hotel-cost derivation is isolated in `useComputedHotelCost`, covering confirmed, selected, supplier-row, room-count, and fallback cost paths.
- Vehicle amount and quantity derivation are isolated in `useComputedVehicleTotals`, preserving selection-first and itinerary-cost fallback semantics.
- Entry-ticket aggregation by attraction location is isolated in `useEntryTicketSummary`.
- Backend/live-selection payable computation is isolated in `useFinancialTotals`, including rounding and entry-ticket substitution.
- Room-night derivation is isolated in `useRoomBreakdownNights`, preserving selected-room matching and cheapest fallback behavior.
- Header summary cost formatting and special-instruction fallback lookup are isolated in `useItinerarySummaryValues`.
- Para/recommendation hotel grouping is isolated in `useParaRecommendations`; clipboard selection initialization remains in the page workflow.
- Hotel rebuild, vehicle refresh, and hotel group-type refresh mutation orchestration are isolated in `useHotelDataController`; voucher modal selection and cancellation mutations are isolated in `useHotelVoucherController`. Both preserve their existing service calls, loading state, cache update, fallback vehicle retention, and toast contract.
- Vehicle selection total/quantity updates are isolated in `useVehicleSelectionTotalsController`; it preserves numeric normalization and idempotent state updates.
- Hotel route-coverage derivation is isolated in `useHotelSelectionCoverage`; it preserves multi-night parent/child route expansion used by prebook and confirmation flows.
- Formatted hotel clipboard retrieval/merge/copy is isolated in `useHotelClipboardAction`; it preserves backend mode/group payloads, highlights replacement, selection reset, and toast behavior.
- Persisted hotel selection and post-selection refresh are isolated in `useHotelSelectionMutation`; it preserves read-only guards, selected meal-plan/room arguments, modal reset, and toast behavior.
- Fast sibling-route navigation and route-scoped hydration are isolated in `useRouteOptionSwitchController`; stale-request guards, cached hotels, URL replacement, and loading cleanup remain centralized there.
- Supplier-search hotel selection and booking payload normalization are isolated in `useHotelSearchSelectionMutation`; provider flags, prebook reset, modal reset, validation, and refresh behavior remain unchanged.
- The latest workflow hooks use explicit local shapes for modal/search/selection data; focused ESLint passes even though the repository-wide baseline remains failing.
- Guide modal option hydration and local-assignment precedence are isolated in `useGuideModalController`; guide save/delete mutations remain in the controller for a later workflow pass.
- Guide assignment deletion is isolated in `useGuideDeleteMutation`; it preserves the service payload, refresh, deleting state, and toast contract.
- Activity preview API workflows are isolated in `useActivityPreviewController`; add/delete activity mutations remain separate controller responsibilities.
- Wallet top-up continuation is isolated in `useWalletTopUpController`; balance refresh, shortfall handling, reset, and confirmation handoff preserve the existing quotation workflow.
- Activity availability loading and modal initialization are isolated in `useActivityAvailabilityLoader`; activity add/preview/delete workflows remain separately bounded.
- Add-hotspot modal hydration and available-hotspot normalization are isolated in `useAddHotspotModalController`; Fit Here action mutations remain a separate high-risk boundary.
- Hotspot deletion, optimistic timeline cleanup, exclusion updates, and modal refresh are isolated in `useHotspotDeleteMutation`; the controller retains only the Fit Here/rebuild decisions that surround that mutation.
- Missing-city-matrix recovery and the follow-up manual hotspot re-preview are isolated in `useHotspotMatrixPreviewController`; the preview mutation itself remains the next hotspot action boundary.
- Manual hotspot preview requests, request-staleness guards, timeline/resolution state, anchor-adjustment messaging, and preview cancellation are isolated in `useHotspotPreviewMutation`.
- Protected-priority replacement approval and cancellation are isolated in `useHotspotPriorityReplacementController`; it re-previews with the existing approval flag and preserves the modal's state updates.
- Exact-anchor Fit Here preview requests, progress-modal transitions, payload construction, and preview error handling are isolated in `useFitHerePreviewController`.
- Fit Here cancellation, retry-payload validation, and tried-anchor bookkeeping are isolated in `useFitHereDialogController`.
- Fit Here confirmation retryability, error-code extraction, expired-attempt classification, removal/approval analysis, and response normalization are pure helpers in `fitHereConfirm.utils.ts`.
- Successful Fit Here insertion reset of selected hotspot, preview maps, dialog state, and tried anchors is isolated in `useFitHereConfirmationReset`.
- Optimistic Fit Here confirmation state now belongs to `useFitHereConfirmationState`; it updates modal availability/exclusions, normalized timeline segments, and the route rebuild marker.
- Post-confirmation details and hotel hydration are isolated in `useFitHereConfirmationRefresh`; route timeline merging remains scoped to the confirmed route.
- Activity add/delete mutations and their independent itinerary/hotel refreshes are isolated in `useActivityMutationController`; preview and availability loading remain separate boundaries.
- Vehicle-only clipboard fetch, hotel-row stripping, amount-label cleanup, highlights replacement, signature relocation, and clipboard copy are isolated in `useVehicleOnlyClipboardAction`; the former inline implementation has been removed.
- Quotation passenger sanitization, primary/additional guest validation, booking passenger-payload construction, age/title/nationality/PAN rules, and form-error/toast handling are isolated in `useQuotationPassengerValidation`.
- Quotation confirmation hotel preparation is isolated in `useQuotationHotelSelectionPreparation`; persisted-route backfill, provider matching, external-stay fallback, and selected-booking state synchronization remain behaviorally unchanged.
- Quotation occupancy distribution and child-age normalization are pure utilities in `quotationOccupancy.utils.ts`; TBO, supplier, traveller-template, and confirmation-template paths share the same existing algorithms.
- Final quotation request shape is built by `quotationConfirmation.utils.ts`; guest fields, passenger arrays, hotel route metadata, and prebook context are assembled without owning validation or network side effects.
- Provider-neutral selected hotel booking rows are normalized by `quotationHotelBookings.utils.ts`; supplier-bookable filtering, occupancy/passenger attachment, pricing normalization, and multi-night metadata remain unchanged.
- Confirm-modal prebook preparation is isolated in `quotationPrebookSelections.utils.ts`; persisted supplier rows still win only for uncovered routes and cheapest-per-route recommendations still fill the remaining prebook selection map.
- Successful quotation confirmation refresh/reset orchestration is isolated in `useQuotationConfirmationCompletion`; confirmed-plan hydration, selection clearing, guest-form reset, and loading cleanup remain in the same order.
- Confirmation provider/session/prebook guards are isolated in `useQuotationBookingGuards`; mixed-provider approval, stale-session rejection, prebook-price comparison, and review acknowledgement retain their existing toast/return contracts.
- Prebook-context attachment and selected/external hotel route-id derivation are isolated in `quotationHotelRouteContext.utils.ts` before final confirmation payload construction.
- Vehicle build status/rebuild sequencing is isolated in `useVehicleBuildController`; route-option strictness, permit/vehicle rebuild calls, completed-details validation, and non-suggested fallback behavior remain unchanged.
- Vehicle type grouping, cheapest-row assignment marking, day-wise route-label derivation, and `VehicleList` composition are isolated in `VehicleSection.tsx`.
- Quotation passenger-form rendering for the primary guest and conditional adult/child/infant rows is isolated in `QuotationPassengerForm.tsx`; the controller still owns the existing state, validation, and submission orchestration.
- Quotation arrival/departure date, place, and flight-detail fields are isolated in `QuotationTravelDetailsForm.tsx`; the existing arrival normalization handler remains injected from the controller.
- Quotation dialog cancel/reset controls and confirmation-button loading/disable presentation are isolated in `QuotationDialogFooter.tsx`; confirmation submission and wallet reset callbacks remain injected from the controller.
- The conditional child/infant passenger-requirement notice is isolated in `QuotationPassengerNotice.tsx`; the controller supplies only the existing visibility predicate.
- The quotation prebook loading state is isolated in `QuotationPrebookLoadingNotice.tsx`; modal-flow visibility remains derived by the controller.
- Quotation number, agent identity, wallet balance, and required amount summary is isolated in `QuotationAgentSummary.tsx`; formatting and wallet parsing remain injected helpers.
- Quotation room-count, passenger-mix, and per-room occupancy preview is isolated in `QuotationRoomingPreview.tsx`; the controller continues to supply the existing normalized occupancy data.
- Wallet top-up amount/remark inputs and refresh/continue actions are isolated in `QuotationWalletTopUpActions.tsx`; wallet mutation and balance-refresh callbacks remain injected.
- TBO prebook hotel detail rows (cancellation, promotion, rate conditions, amenities, inclusions, and supplements) are isolated in `QuotationPrebookHotelRows.tsx`; existing normalization and meal-plan helpers remain injected.
- Prebook price-change warning and final hotel-detail acknowledgement are isolated in `QuotationPrebookAcceptanceNotice.tsx`; acceptance state remains owned by the quotation controller.
- Add-hotspot dialog title, destination-context description, and search input are isolated in `HotspotDialogHeader.tsx`; hotspot query state remains injected from the controller.
- Add-hotspot city-tab navigation is isolated in `HotspotCityTabs.tsx`; active-tab state and route-different-city visibility remain controller-owned.
- Add-hotspot loading and empty-search states are isolated in `HotspotListState.tsx`; visible-hotspot data and query state remain controller-owned.
- Non-TBO selected-hotel detail acknowledgement is isolated in `QuotationNonTboAcceptanceNotice.tsx`; the shared acceptance state remains controller-owned.
- Fit Here selection-mode guidance is isolated in `HotspotSelectionNotice.tsx`; the surrounding preview/action state remains controller-owned.
- Add Hotspot dialog close-button presentation is isolated in `HotspotDialogFooter.tsx`; the existing reset/cleanup callback remains injected inline.
- Hotspot preview apply-button presentation (loading, conflict color, disabled state, and action labels) is isolated in `HotspotApplyButton.tsx`; matrix/conflict decision logic remains in the controller.
- Fit Here timeline-row rendering and exact-anchor button placement are isolated in `HotspotFitHereTimelineRows.tsx`; anchor construction and preview action behavior remain injected from the controller.
- Fit Here empty-state guidance is isolated in `HotspotFitHereEmptyState.tsx`; modal visibility remains derived by the controller.
- Fit Here selected-hotspot title/identity presentation is isolated in `HotspotFitHereSelectionHeader.tsx`; the controller still owns the selected hotspot object and preview note.
- Fit Here preview calculation loading presentation is isolated in `HotspotPreviewLoadingState.tsx`; preview request state remains controller-owned.
- Same-city preview rescheduling notice presentation is isolated in `HotspotPreviewRescheduleNotice.tsx`; resolution flags remain controller-owned.
- Route-fit feasibility copy under the recalculated-timings banner is isolated in `HotspotPreviewRouteFitNotice.tsx`; banner visibility remains controller-owned.
- Empty preview-timeline fallback presentation is isolated in `HotspotPreviewEmptyTimeline.tsx`; timeline availability remains derived by the controller.
- Resolved-overflow heading and timing-policy explanation are isolated in `HotspotPreviewOverflowResolvedHeader.tsx`; removal-plan data remains controller-owned.
- Resolved-overflow final-timeline notice is isolated in `HotspotPreviewResolvedTimelineNotice.tsx`; preview data remains controller-owned.
- Development-only resolved-removal leak diagnostic is isolated in `HotspotPreviewOverflowLeakNotice.tsx`; the existing environment/flag predicate remains controller-owned.
- Day-end overflow timing explanation is isolated in `HotspotPreviewDayEndOverflowNotice.tsx`; overflow calculation remains controller-owned.
- Quotation confirmation modal shell (open state, header, and content slot) is isolated in `QuotationConfirmationDialogShell.tsx`; guest/prebook content and submission footer remain controller-composed.
- Staged itinerary loading, hotel hydration, vehicle-build handoff, stale-request guards, and loading/error cleanup are isolated in `usePreparedItineraryPageLoader.ts`; the controller injects stable state setters and workflow callbacks.
- Route rebuild request/progress sequencing, details/hotel refresh, stale-route recovery, toast handling, and `needsRebuild` clearing are isolated in `useRouteRebuildMutation.ts`.
- Route-time PATCH progress, itinerary refresh, hotel-detail preservation, scroll targeting, and success/error cleanup are isolated in `useRouteTimePatchMutation.ts`.
- Arrival-policy decision-key normalization and request-key derivation are pure utilities in `routeArrivalPolicy.utils.ts`; duplicate guards and confirmation flows share the same normalized key contract.
- Arrival-policy early-morning gating, confirmation-modal preparation, direct route-time orchestration, and confirmation persistence are isolated in `useArrivalPolicyRouteTimeController.ts`.
- Manual hotspot application, conflict/priority guards, service payload construction, optimistic availability updates, route rebuild marking, and background modal refresh are isolated in `useHotspotAddMutation`.
- Remaining high-risk boundaries: hotel search/arrival/room-selection operations, vehicle workflow, hotspot/Fit Here action controller and large modal view, and quotation review/submission view.
- Quotation confirmation detail normalization is isolated in `quotationConfirmationDetails.utils.ts`; nationality fallback, occupancy preview distribution, safe session-error messaging, prebook inclusion/meal-plan normalization, and cancellation-policy formatting remain pure and reusable.
- Clipboard and wallet formatting is isolated in `clipboardFormatting.utils.ts`; HTML escaping, currency parsing, wallet-response extraction, money rounding, and selected-hotel amount normalization remain pure and reusable.
- Clipboard itinerary totals are isolated in `clipboardItineraryTotals.utils.ts`; money display, hotel pax derivation, activity aggregation, and entry-ticket grouping no longer live inside the HTML builder.
- Clipboard financial totals are isolated in `clipboardFinancialTotals.utils.ts`; selected-group hotel costs, cost-breakdown aggregation, activity/hotspot fallback, vehicle totals, and net-payable rounding are now pure composition inputs.
- Clipboard vehicle-row HTML is isolated in `clipboardVehicleSection.utils.ts`; date range, route fallback, amount formatting, and empty-state markup are no longer nested in the controller.
- Clipboard cost-table HTML is isolated in `clipboardCostSection.utils.ts`; conditional cost rows, entry-ticket detail rows, coupon/rounding display, and net-payable labeling are now composed outside the controller.
- Clipboard hotel-package table composition is isolated in `clipboardHotelPackageSection.utils.ts`; hotel rows, group headings, empty-state markup, and vehicle/cost section composition are outside the controller.
- Clipboard plain-text generation is isolated in `clipboardPlainText.utils.ts`; group separators and hotel-row formatting are now pure and reusable.
- Clipboard HTML extraction/insertion is isolated in `clipboardHtmlMerge.utils.ts`; hotel, vehicle, cost, and B2B package anchors are handled without controller-local string surgery.
- HTML-to-plain-text conversion is isolated in `htmlToPlainText.utils.ts`; tag/entity/whitespace normalization is reusable and side-effect free.
- Highlights-mode hotspot rendering and replacement are isolated in `highlightsHotspotHtml.utils.ts`; day/route/attraction formatting and backend section anchoring are outside the controller.
- ClipboardItem writing and fallback text-copy behavior are isolated in `copyHtmlToClipboard.utils.ts`; browser clipboard side effects are no longer defined inline in the controller.
- Clipboard `para-*` selection filtering and group shaping are isolated in `clipboardSelection.utils.ts`; recommendation selection semantics remain generic and controller-light.
- Hotel booking normalization is isolated in `hotelBookingNormalization.utils.ts`; provider inference, booking/reference parsing, amount fallback, and no-availability classification are pure.
- Quotation confirmation date-time formatting is isolated in `quotationDateTime.utils.ts`; arrival/departure prefill formatting is reusable and side-effect free.
- Quotation confirmation-modal prefill is isolated in `quotationModalPrefill.utils.ts`; nationality/date patches, traveller passenger rows, and occupancy templates are derived without owning React state.
- Quotation booking occupancy resolution is isolated in `quotationBookingOccupancy.utils.ts`; child-age locking and TBO/supplier occupancy selection are pure.
- Route-family quote-number extraction and option normalization are isolated in `routeOptions.utils.ts`; deduplication, DVI filtering, sorting, and labels are reusable.
- Route hotel-cache warming is isolated in `useRouteHotelPrefetch.ts`; route filtering, deduplication, cancellation, and retry bookkeeping no longer live in the page controller.
- Related route-option discovery and fallback handling are isolated in `useRelatedRouteOptionsLoader.ts`; API/local-storage lookup, date formatting, related-plan filtering, and `Route 1` fallback behavior no longer live in the page controller.
- The legacy inline vehicle-only clipboard builder is removed; `useVehicleOnlyClipboardAction.ts` is the active vehicle-only clipboard boundary.
- Activity preview time, duration, money, and total-amount formatting are pure helpers in `activityFormatting.utils.ts`; the controller retains only state-dependent activity selection.
- Hotel-arrival policy resolution, confirmation-date preparation, arrival-time updates, and hotel-selection modal policy orchestration are isolated in `useHotelArrivalPolicyController.ts`.
- Manual preview timeline ordering, hotel-travel pruning, planned-removal filtering, best-slot placement, and baseline merging are isolated in `useEffectivePreviewTimeline.ts`.
- Selected-hotel display-day hydration, hotel travel-leg timing, check-in insertion, and early-morning arrival handling are isolated in `useHotelHydratedDays.ts`.
- Confirmed/read-only hotel row matching, day/date reconciliation, placeholder rows, cancellation metadata, and draft supplier-row preservation are isolated in `useHotelsForDisplay.ts`.
- External-stay filtering, preferred hotel-group selection, and the shared no-supplier customer message are isolated in `useExternalStayEntries.ts`.
- Non-TBO selected-hotel filtering, multi-night coverage suppression, route-row matching, and quotation-review shaping are isolated in `useNonTboSelectedHotelEntries.ts`.
- Destination hotel label resolution for hotspot previews and route-fit messaging is isolated in `useDestinationHotelDisplayName.ts`.
- Matrix-build suggestion lookup, chosen-slot validity, and usable-matrix-data detection are isolated in `useMatrixFitState.ts`.
- Hotspot city-context derivation, active preview hotspot lookup, context fallback, and destination-side preview detection are isolated in `usePreviewCityContext.ts`.
- Matrix-required, missing-data, infeasible-slot, and build-button decisions are isolated in `useMatrixAvailabilityState.ts`.
- Preview validation text, matrix apply-blocking, decision-status normalization, and confirm-action labels are isolated in `usePreviewDecisionState.ts`.
- Hotspot insertion outcome messaging, reschedule/overflow checks, and relaxed-route-fit summary decisions are isolated in `useInsertionDecisionSummary.ts`.
- Resolved-removal leak detection, safe-slot filtering, effective-fit selection, route-fit badge classes, and normalized insertion-slot derivation are isolated in `usePreviewSlotState.ts`.
- Preferred normalized insertion-slot selection and distance-delta fallback ordering are isolated in `useBestInsertionSlot.ts`.
- Route-day attraction timing and hotspot duration/timings/priority metadata merging are isolated in `usePreviewHotspotMeta.ts`.
- Current-route attraction/manual hotspot IDs, manual metadata, and already-added preview detection are isolated in `useCurrentRouteHotspotState.ts`.
- Available-hotspot normalization defaults and modal-specific normalization options are isolated in `useNormalizedAvailableHotspots.ts`.
- Image URL resolution, gallery initialization, and YouTube watch-to-embed conversion are isolated in `useMediaModalController.ts`.
- Lazy hotel-detail hydration is isolated in `useEnsureHotelDetailsLoaded.ts`; the controller no longer owns its loading/error lifecycle.
- Quotation confirmation-modal opening, wallet/customer hydration, traveller prefill, recommended-hotel reconciliation, and prebook session guards are isolated in `useQuotationConfirmationModalController.ts`.
- Itinerary UI source strings are stored as valid UTF-8; currency, punctuation, status symbols, and emoji rendering no longer depend on mojibake literals.
- Selected-attraction best-insertion-slot and requested-slot fallback presentation are isolated in `HotspotBestInsertionSlotPanel.tsx`.
- Inserted-hotspot matrix route-leg metrics and distance comparison messaging are isolated in `HotspotPreviewRouteSummary.tsx`.
- Inserted-hotspot status badges and route/timing insight presentation are isolated in `HotspotPreviewInsertedStatus.tsx`.
- Priority-reschedule/P3-removal confirmation presentation is isolated in `HotspotPriorityConfirmation.tsx`.
- Attraction priority, visit-time, duration, and timing badges are isolated in `HotspotPreviewAttractionMeta.tsx`.
- Conflict override/timing warning heading presentation is isolated in `HotspotConflictNotice.tsx`.
- Conflicting hotspot arrival, stay, departure, and onward-travel timing analysis is isolated in `HotspotConflictTimingDetails.tsx`.
- Quotation external-stay, non-TBO, and TBO prebook hotel review sections are isolated in `QuotationHotelReviewSections.tsx`.
- Quotation summary/wallet/rooming/passenger/loading notice composition is isolated in `QuotationConfirmationOverview.tsx`, with insufficient-wallet controls in `QuotationWalletInsufficientPanel.tsx`.
- Assigned-guide summary, cost, edit, and delete presentation is isolated in `ItineraryDayGuideCard.tsx`.
- Daily guide/header/segment composition is isolated in `ItineraryDaysSection.tsx`.
- Hotel-list loading and vehicle-unavailable page states are isolated in `HotelListLoadingState.tsx` and `VehicleUnavailableState.tsx`.
- Hotel-list scroll-anchor, pagination, selection, voucher, and refresh callback composition is isolated in `ItineraryHotelListSection.tsx`.
- The unreachable legacy activity-preview JSX branch was removed after activity-dialog extraction; active activity preview/add/delete behavior remains in `AddActivityDialog` and its controller hooks.
- The add-hotspot dialog's city tabs, loading state, and available-hotspot card column are isolated in `HotspotDialogListColumn.tsx`.
- Matrix-missing retry guidance and no-feasible-slot insertion warnings are isolated in `HotspotMatrixMissingNotice.tsx` and `HotspotMatrixNoFeasibleNotice.tsx`.
- Bounded manual-optimizer attempt diagnostics are isolated in `HotspotManualAttemptLog.tsx`.
- Selected preview strategy, insertion-slot decision, optimizer diagnostics, anchor-fit insight, and matrix retry/no-feasible notices are isolated in `HotspotPreviewStrategyPanel.tsx`.
