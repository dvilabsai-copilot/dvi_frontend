# Auto Fit Preview Finalized Sequence Rules

## Goal

When Auto-Preview Fit Here shows a ranked position, the UI must describe the real finalized outcome clearly before the user confirms it.

## Finalized Timeline

- The `finalizedTimeline` from the backend is the authoritative sequence for the selected ranked row.
- The UI must render that finalized order exactly as the "Finalized timeline".
- If downstream hotspots were reordered to preserve the selected manual hotspot, the final rendered order is the source of truth.
- If later rows were pushed forward after insertion, the final rendered times are the source of truth.

## Changes Required

- The "Changes required" box must list every hotspot that is effectively removed from the original route for that selected ranked result.
- This list must not depend only on backend removal summary arrays.
- If a hotspot exists in the original route timeline but is missing from the finalized timeline, it must appear in "Changes required".
- This protects against cases where the backend finalized sequence removes a hotspot but the removal summary is incomplete.

## Confirmation Lock Rule

- If any hotspot is removed from the original route, confirmation must stay locked until the user acknowledges all displayed removals.
- The checkbox list, the confirm-enable rule, and the confirm payload must all use the same removal ID set.
- The UI must never require acknowledgement for a hidden removal.

## UX Notes

- Show a reorder note when the finalized sequence changes the relative order of existing downstream hotspots.
- Show a shifted-timeline note when later rows are pushed forward after insertion.
- The confirm button becomes enabled only after every displayed removal acknowledgement is checked.

## Example Protected Behavior

- If the original route contains `Meenakshi Amman Temple` but the finalized sequence no longer contains it, `Meenakshi Amman Temple` must be shown in "Changes required".
- If the user checks all displayed removal checkboxes, the confirm button must enable immediately.
