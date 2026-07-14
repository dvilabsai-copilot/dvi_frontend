import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface AddActivityDialogProps { context: Record<string, any>; }

export const AddActivityDialog: React.FC<AddActivityDialogProps> = ({ context }) => {
  const { addActivityModal, setAddActivityModal, loadingActivities, availableActivities, activityPreview, isAddingActivity, previewingActivityId, handlePreviewActivity, handleOpenPreviewAllHotspots, formatActivityDuration, formatActivityMoney, formatPreviewTime, getActivityTotalAmount, getSelectedPreviewActivity, handleAddActivity } = context;
  return (
    <>
      {/* Add Activity Modal */}
      <Dialog
        open={addActivityModal.open}
        onOpenChange={(open) =>
          setAddActivityModal({ ...addActivityModal, open })
        }
      >
        <DialogContent className="w-[96vw] sm:max-w-5xl h-[85vh] flex flex-col overflow-hidden p-4 sm:p-6">
          <DialogHeader className="shrink-0">
            <DialogTitle>Add Activity to {addActivityModal.hotspotName}</DialogTitle>
            <DialogDescription>
              Select an activity on the left to preview fit and day impact.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-hidden py-2">
            <div className="h-full flex flex-col lg:flex-row gap-4 min-h-0">
              <div className="w-full lg:w-1/2 flex flex-col min-h-0 lg:border-r border-[#e5d9f2] lg:pr-4 pb-3 lg:pb-0 border-b lg:border-b-0">
                <div className="text-sm font-semibold text-[#4a4260] pb-2">
                  Available Activities
                </div>
                <div className="flex-1 overflow-y-auto space-y-2">
                  {loadingActivities && (
                    <p className="text-sm text-[#6c6c6c] text-center py-8">
                      Loading activities...
                    </p>
                  )}

                  {!loadingActivities && availableActivities.length === 0 && (
                    <p className="text-sm text-[#6c6c6c] text-center py-8">
                      No activities available for this hotspot
                    </p>
                  )}

                  {!loadingActivities && availableActivities.length > 0 && (
                    <div className="space-y-2">
                      {availableActivities.map((activity) => (
                        <button
                          key={activity.id}
                          type="button"
                          onClick={() => handlePreviewActivity(activity.id)}
                          className={`w-full rounded-lg border-2 p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d546ab] focus-visible:ring-offset-2 ${activityPreview?.activity?.id === activity.id
                              ? 'border-[#d546ab] bg-[#f7edf6]'
                              : 'border-[#e5d9f2] bg-white hover:bg-[#faf7fc]'
                            }`}
                          disabled={isAddingActivity}
                        >
                          <div className="font-semibold text-[#4a4260] text-sm">
                            {activity.title}
                          </div>
                          <div className="mt-1 text-xs text-[#6c6c6c] line-clamp-2">
                            {activity.description}
                          </div>
<div className="mt-2 space-y-1 text-xs text-[#6c6c6c]">
  {activity.duration && <div>Duration: {formatActivityDuration(activity.duration)}</div>}

  {activity.pricingUnitType === "UNIT" ? (
    <div>Unit - {formatActivityMoney(activity.unitCost)}</div>
  ) : (
    <>
      <div>Adult - {formatActivityMoney(activity.costAdult)}</div>
      <div>Children - {formatActivityMoney(activity.costChild)}</div>
    </>
  )}

  <div className="font-semibold text-[#4a4260]">
    Total Charges - {formatActivityMoney(getActivityTotalAmount(activity))}
  </div>
</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full lg:w-1/2 flex flex-col min-h-0 lg:pl-2">
                <div className="flex items-center justify-between gap-2 pb-2">
                  <div className="text-sm font-semibold text-[#4a4260]">
                    Preview
                  </div>
                  {activityPreview?.activity?.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[#d546ab] border-[#d546ab] hover:bg-[#d546ab] hover:text-white"
                      onClick={() => handleOpenPreviewAllHotspots(activityPreview.activity.id)}
                      disabled={isAddingActivity}
                    >
                      Preview All Hotspots
                    </Button>
                  )}
                </div>

                {previewingActivityId && (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-[#d546ab]" />
                  </div>
                )}

                {!previewingActivityId && !activityPreview && (
                  <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-[#e5d9f2] text-center text-sm text-[#6c6c6c]">
                    Click an activity on the left to see whether it fits.
                  </div>
                )}

                {!previewingActivityId && activityPreview && (
                  <div className="flex-1 overflow-y-auto space-y-4" aria-live="polite">
<div>
  <div className="font-semibold text-[#4a4260]">
    {activityPreview.activity?.title}
  </div>
  <div className="mt-1 text-xs text-[#6c6c6c]">
    Duration: {formatActivityDuration(activityPreview.activity?.duration)}
  </div>
</div>

{(() => {
  const selectedActivity = getSelectedPreviewActivity();
  if (!selectedActivity) return null;

  return (
    <div className="rounded-lg border border-[#e5d9f2] bg-white p-3 space-y-2">
      <div className="text-xs font-semibold text-[#4a4260] uppercase tracking-wide">
        Activity Cost
      </div>

      {selectedActivity.pricingUnitType === "UNIT" ? (
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#6c6c6c]">Unit</span>
          <span className="font-medium text-[#4a4260]">
            {formatActivityMoney(selectedActivity.unitCost)}
          </span>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#6c6c6c]">
              Adults ({selectedActivity.adultCount || 0})
            </span>
            <span className="font-medium text-[#4a4260]">
              {formatActivityMoney(selectedActivity.costAdult)}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-[#6c6c6c]">
              Children ({selectedActivity.childCount || 0})
            </span>
            <span className="font-medium text-[#4a4260]">
              {formatActivityMoney(selectedActivity.costChild)}
            </span>
          </div>
        </>
      )}

      <div className="flex items-center justify-between border-t border-[#e5d9f2] pt-2 text-xs">
        <span className="font-semibold text-[#4a4260]">Total Charges</span>
        <span className="font-semibold text-[#d546ab]">
          {formatActivityMoney(getActivityTotalAmount(selectedActivity))}
        </span>
      </div>
    </div>
  );
})()}

{/* ① Placement */}
                    <div className="rounded-lg border border-[#e5d9f2] bg-[#faf7fc] p-3 space-y-2">
                      <div className="text-xs font-semibold text-[#4a4260] uppercase tracking-wide">① Placement</div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#6c6c6c]">Hotspot Window</span>
                        <span className="font-medium text-[#4a4260]">
                          {formatPreviewTime(activityPreview.hotspotTiming?.startTime)} – {formatPreviewTime(activityPreview.hotspotTiming?.endTime)}
                        </span>
                      </div>
                      {activityPreview.proposedTiming && (
                        <>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#6c6c6c]">Inserted At</span>
                            <span className="font-semibold text-[#d546ab]">
                              {formatPreviewTime(activityPreview.proposedTiming.startTime)} – {formatPreviewTime(activityPreview.proposedTiming.endTime)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[#6c6c6c]">Position</span>
                            <span className="font-medium text-[#4a4260]">#{activityPreview.proposedTiming.order}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* ② Hotspot Impact */}
                    <div className={`rounded-lg border-2 p-3 ${activityPreview.hasConflicts
                        ? 'border-red-300 bg-red-50'
                        : activityPreview.proposedTiming?.willExtendHotspot
                          ? 'border-amber-300 bg-amber-50'
                          : 'border-green-300 bg-green-50'
                      }`}>
                      <div className="text-xs font-semibold uppercase tracking-wide mb-2">
                        <span className={
                          activityPreview.hasConflicts ? 'text-red-700'
                            : activityPreview.proposedTiming?.willExtendHotspot ? 'text-amber-700'
                              : 'text-green-700'
                        }>
                          ② Hotspot Impact — {
                            activityPreview.hasConflicts ? '⛔ Conflict'
                              : activityPreview.proposedTiming?.willExtendHotspot ? '⚠️ Extends Window'
                                : '✅ Fits within window'
                          }
                        </span>
                      </div>
                      {activityPreview.proposedTiming?.willExtendHotspot && !activityPreview.hasConflicts && (
                        <div className="text-xs text-amber-800">
                          Hotspot end time shifts from{' '}
                          <span className="font-semibold">{formatPreviewTime(activityPreview.hotspotTiming?.endTime)}</span>
                          {' '}→{' '}
                          <span className="font-semibold">{formatPreviewTime(activityPreview.proposedTiming.endTime)}</span>
                          {' '}(+{activityPreview.cascade?.shiftMinutes ?? 0} min)
                        </div>
                      )}
                      {activityPreview.hasConflicts && activityPreview.conflicts?.length > 0 && (
                        <div className="space-y-1 text-xs text-red-700 mt-1">
                          {activityPreview.conflicts.map((conflict, idx: number) => (
                            <div key={idx}>• {conflict.reason}</div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ③ Day Cascade */}
                    {activityPreview.cascade?.shiftMinutes > 0 && activityPreview.cascade?.affectedSegments?.length > 0 && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                        <div className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                          ③ Day Cascade — everything after shifts +{activityPreview.cascade.shiftMinutes} min
                        </div>
                        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                          {activityPreview.cascade.affectedSegments.map((seg, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-xs py-1 border-b border-amber-100 last:border-0">
                              <span className={`shrink-0 w-16 text-center rounded px-1 py-0.5 font-medium ${seg.type === 'travel' ? 'bg-blue-100 text-blue-700'
                                  : seg.type === 'break' ? 'bg-yellow-100 text-yellow-700'
                                    : seg.type === 'hotel' ? 'bg-purple-100 text-purple-700'
                                      : seg.type === 'return' ? 'bg-gray-100 text-gray-700'
                                        : 'bg-pink-100 text-pink-700'
                                }`}>
                                {seg.type === 'travel' ? '🚌 Travel'
                                  : seg.type === 'break' ? '⏸ Break'
                                    : seg.type === 'hotel' ? '🏨 Hotel'
                                      : seg.type === 'return' ? '🔄 Return'
                                        : '📍 Place'}
                              </span>
                              <span className="flex-1 font-medium text-[#4a4260] truncate">{seg.name}</span>
                              <span className="shrink-0 text-[#6c6c6c] line-through">{formatPreviewTime(seg.oldStartTime)}</span>
                              <span className="shrink-0 text-amber-700 font-semibold">{formatPreviewTime(seg.newStartTime)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between text-xs pt-1 border-t border-amber-200">
                          <span className="text-[#6c6c6c]">Day ends</span>
                          <span>
                            <span className="line-through text-[#6c6c6c] mr-2">{formatPreviewTime(activityPreview.cascade.originalDayEndTime)}</span>
                            <span className="font-semibold text-amber-800">{formatPreviewTime(activityPreview.cascade.newDayEndTime)}</span>
                          </span>
                        </div>
                      </div>
                    )}

                    {activityPreview.cascade?.shiftMinutes === 0 && (
                      <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-700">
                        ③ Day Cascade — <span className="font-semibold">No downstream impact.</span> Activity fits within the existing hotspot window.
                      </div>
                    )}

                    <Button
  className="w-full bg-[#d546ab] hover:bg-[#c03d9f] shrink-0"
  onClick={() => {
    const selectedActivity = getSelectedPreviewActivity();

    handleAddActivity(
      activityPreview.activity?.id,
      getActivityTotalAmount(selectedActivity),
    );
  }}
                      disabled={isAddingActivity}
                    >
                      {isAddingActivity ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        'Add Activity'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setAddActivityModal({
                  open: false,
                  planId: null,
                  routeId: null,
                  routeHotspotId: null,
                  hotspotId: null,
                  hotspotName: '',
                })
              }
              disabled={isAddingActivity}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
};
