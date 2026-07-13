# Regression log

## 2026-07-14 — Baseline before extraction

### Failure
`npx tsc -p tsconfig.app.json --noEmit` reports existing errors in `ConfirmedItineraryDetails.tsx`, `hotel-form/RoomsStep.tsx`, `ItineraryDetailsRouter.tsx` prop typing, `PaymentSuccess.tsx`, Settings pages, and `agentSubscriptionPlanService.ts`.

### Classification
- pre-existing defect

### Root cause
The clean working tree fails typecheck before any refactor change. The router currently lazy-resolves an untyped component, which exposes prop errors; this is not caused by an extraction.

### Resolution
No unrelated type fixes made. These errors remain tracked so an extraction does not get misclassified as their cause.

### Verification
The same baseline command was run before source edits and failed with the errors above. Production build still passes.

## 2026-07-14 — Baseline lint

### Failure
`npm run lint` reports 1,613 errors and 77 warnings across the repository, including existing `no-explicit-any` violations, a malformed `booking-flow-api-direct.spec.ts`, and an inline configuration conflict in an existing file.

### Classification
- pre-existing defect

### Root cause
The repository lint configuration applies strict rules to legacy source/tests. The page has a narrow existing exception for `no-explicit-any`, but the overall command remains red before extraction.

### Resolution
No lint suppression or unrelated cleanup added.

### Verification
Baseline `npm run lint` reproduced the failure before source edits.

## 2026-07-14 — Iteration 2

### Failure
The first generated `timeline.utils.ts` extraction ended before the closing brace of `normalizeDateToYmd`; TypeScript reported `TS1005: '}' expected` and Vite reported an unexpected end of file.

### Classification
- refactor regression

### Root cause
The extraction range stopped one source line before the helper’s final `return ''` and closing brace.

### Resolution
Compared the utility tail with the original helper in `git show HEAD:src/pages/ItineraryDetails.tsx` and restored the missing return/closing brace.

### Verification
Targeted TypeScript output contains no errors from `ItineraryDetails.tsx` or `itinerary-details/utils`; `npm run build` passes.

## 2026-07-14 — Iteration 6

### Failure
The initial source/share dialog replacement began two lines inside the source preview dialog, leaving stale `<Dialog>`/`<DialogContent>` openings and causing JSX closing-tag errors; the smoke test could not find the loaded day card.

### Classification
- refactor regression

### Root cause
The replacement range used a one-line physical/index boundary mismatch.

### Resolution
Inspected the exact current JSX boundary, removed the two stale opening lines, and retained the extracted dialog components.

### Verification
Targeted TypeScript output contains no page/new-module errors, build passes, and both hotspot Playwright tests pass.

## 2026-07-14 — Iteration 9

### Note
The all-hotspots preview now renders through `AllHotspotsPreviewDialog`; the duplicate legacy JSX was removed after focused characterization.

### Verification
The exact-anchor Fit Here smoke and hotspot preview regression both pass.

## 2026-07-14 — Iteration 30 lint checkpoint

### Failure
`npm run lint` remains red with 1,921 errors and 122 warnings across the repository.

### Classification
- pre-existing repository defect, with additional strict typing findings in the newly staged transitional hooks

### Root cause
The repository-wide command already fails in legacy source/tests and configuration comments. The staged transitional hooks also preserve several dynamic response shapes while their controller extraction is still in progress.

### Resolution
No lint suppression or blanket rule changes were added. The remaining hook typing cleanup is an explicit follow-up before final completion.

### Verification
`npm run build`, focused Playwright (2/2), and page/new-module typecheck remain green.

## 2026-07-14 — Broader itinerary Playwright suite checkpoint

### Failure
The repository itinerary suite command ran 34 tests: 9 passed, 2 skipped, and 23 failed. Failures clustered in shared mutable Fit Here/APJ records, PHP/Nest parity (`/login` versus PHP redirect), and vehicle-only test data not becoming visible before its assertion.

### Classification
- test-data issue
- environment issue
- pre-existing backend/parity issue

### Root cause
The failures reproduce against shared scenario records and external PHP/Nest parity assumptions; the focused characterization flows remain green. The suite also creates mutable itineraries and depends on backend processing timing/data availability outside this structural extraction.

### Resolution
No application or test weakening changes were made. Generated Playwright artifacts were removed and tracked metadata restored.

### Verification
Focused pair remains 2/2 passed; production build passes; page/new-module typecheck remains free of new errors.

## 2026-07-14 — Iteration 49 lint rerun

### Failure
`npm run lint` remains red with 1,925 errors and 110 warnings.

### Classification
- repository-wide baseline debt

### Root cause
The command reports legacy `any` usage, configuration-comment diagnostics, and existing test/source warnings across the repository. The current page/controller extraction does not introduce a clean repository lint baseline.

### Resolution
No broad lint suppression or unrelated repository cleanup was added; typing cleanup remains a follow-up after the controller boundaries stabilize.

### Verification
Focused Playwright remains 2/2 passed; production build passes; filtered page/new-module typecheck remains free of new errors.

## 2026-07-14 — Broader itinerary Playwright rerun after controller extractions

### Failure
The broader command ran 34 tests with 8 workers: 8 passed, 2 skipped, and 24 failed.

### Classification
- shared mutable test-data contention
- environment issue
- pre-existing backend/parity issue

### Root cause
The parallel run amplified the existing shared-record Fit Here/APJ mutations; parity still resolves PHP to its logout redirect while Nest resolves `/login`, and the vehicle-only flow still depends on backend processing/data visibility. These failures are outside the page composition changes; the focused characterization pair remains green.

### Resolution
No test weakening or application workaround was added. Generated result directories were removed and tracked Playwright metadata restored.

### Verification
Focused pair remains 2/2 passed; production build passes; filtered page/new-module typecheck remains free of new errors.
