/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HotelRoomSelectionModal } from "@/components/hotels/HotelRoomSelectionModal";

export const HotelListDialogs: React.FC<{ context: Record<string, any> }> = ({ context }) => {
  const {
    stayExtensionModalState,
    setStayExtensionModalState,
    formatDisplayDate,
    formatCurrency,
    openConfirmDialogForAction,
    setPendingHotelAction,
    setShowConfirmDialog,
    showConfirmDialog,
    pendingHotelAction,
    isUpdatingHotel,
    handleConfirmHotelSelection,
    handleCancelHotelAction,
    setRoomSelectionModal,
    roomSelectionModal,
    toast,
  } = context;

  const getSelectionPrice = (selection: any, preview?: any): number => {
    const amount = preview?.totalAmountAfterTax ??
      selection?.totalAmountAfterTax ??
      selection?.totalAmount ??
      selection?.netAmount ??
      (Number(selection?.totalHotelCost || 0) + Number(selection?.totalHotelTaxAmount || selection?.taxAmount || 0));
    const parsed = Number(amount || 0);
    return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
  };

  const isOfflineSelection = Boolean(
    pendingHotelAction?.room && (
      String((pendingHotelAction.room as any).provider || '').trim().toLowerCase() === 'offline' ||
      (pendingHotelAction.room as any).requiresHotelApproval === true
    ),
  );

  return (
    <>
      <Dialog
        open={Boolean(stayExtensionModalState)}
        onOpenChange={(open) => {
          if (!open) {
            setStayExtensionModalState(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
              <DialogTitle>
                {stayExtensionModalState?.preview.blocked ||
                !stayExtensionModalState?.preview.canBookMultiNight
                  ? "Restrictions apply to some dates"
                  : "Book continuous stay?"}
              </DialogTitle>
              <DialogDescription asChild className="pt-2 text-left">
                <div className="space-y-3 text-sm text-slate-700">
                  {stayExtensionModalState && (
                    <div className="space-y-3 text-sm text-slate-700">
                    {(stayExtensionModalState.preview.blocked ||
                      !stayExtensionModalState.preview.canBookMultiNight) && (
                      <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                        This hotel, room type, or meal plan cannot be extended across all of the continuous dates shown below. Review the affected dates and choose only this day if the single-night option is available.
                      </div>
                    )}
                    <div>
                    <div className="font-semibold text-slate-900">


                      {stayExtensionModalState.preview.hotelName || stayExtensionModalState.action.newHotelName}
                    </div>
                    <div>
                      {formatDisplayDate(stayExtensionModalState.preview.checkInDate)} to{" "}
                      {formatDisplayDate(stayExtensionModalState.preview.checkOutDate)}
                    </div>
                    <div>{stayExtensionModalState.preview.nights} night(s)</div>
                  </div>

                  <div>
                    <div>Room: {stayExtensionModalState.preview.roomType || stayExtensionModalState.action.room.roomType || "-"}</div>
                    <div>Meal Plan: {stayExtensionModalState.preview.mealPlan || (stayExtensionModalState.action.room as any).mealPlan || "-"}</div>
                    {stayExtensionModalState.preview.totalAmountAfterTax > 0 && (
                      <div>Total: {formatCurrency(stayExtensionModalState.preview.totalAmountAfterTax)}</div>
                    )}
                  </div>

                  {stayExtensionModalState.preview.nightlyRates.length > 0 && (
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      {stayExtensionModalState.preview.nightlyRates.map((night) => (
                        <div key={night.date} className="flex items-center justify-between text-xs">
                          <span>{formatDisplayDate(night.date)}</span>
                          <span>{formatCurrency(night.amountAfterTax)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {stayExtensionModalState.preview.restrictionConflicts.length > 0 && (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                      {stayExtensionModalState.preview.restrictionConflicts.map((conflict, index) => (
                        <div key={`${conflict.type}-${conflict.date || index}`}>- {conflict.message}</div>
                      ))}
                    </div>
                  )}

                  {stayExtensionModalState.preview.warnings.length > 0 && (
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                      {stayExtensionModalState.preview.warnings.map((warning, index) => (
                        <div key={`${warning.type}-${index}`}>- {warning.message}</div>
                      ))}
                    </div>
                  )}
                    </div>
                  )}
                </div>
              </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            {stayExtensionModalState?.preview.canBookSingleNight && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const action = stayExtensionModalState.action;
                  setStayExtensionModalState(null);
                  openConfirmDialogForAction(action);
                }}
              >
                Book Only This Day
              </Button>
            )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setStayExtensionModalState(null)}
              >
                Close
              </Button>
            {stayExtensionModalState?.preview.canBookMultiNight && !stayExtensionModalState.preview.blocked && (
              <Button
                type="button"
                onClick={() => {
                  if (!stayExtensionModalState) return;
                  setStayExtensionModalState(null);
                  setPendingHotelAction({
                    ...stayExtensionModalState.action,
                    multiNightPreview: stayExtensionModalState.preview,
                  });
                  setShowConfirmDialog(true);
                }}
              >
                {stayExtensionModalState.preview.nights
                  ? `Book ${stayExtensionModalState.preview.nights} Nights`
                  : "Book Stay"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onOpenChange={(open) => {
          if (!open && !isUpdatingHotel) {
            handleCancelHotelAction();
          } else if (open) {
            setShowConfirmDialog(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-yellow-100 p-3">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <DialogTitle className="text-center">
              {pendingHotelAction?.isRateUpdate
                ? "Confirm Hotel Update"
                : pendingHotelAction?.multiNightPreview?.nights && pendingHotelAction.multiNightPreview.nights > 1
                ? `Confirm ${pendingHotelAction.multiNightPreview.nights}-Night Hotel Booking?`
                : pendingHotelAction?.isReplacing
                ? `Confirm Hotel Modification for ${pendingHotelAction?.routeDate}?`
                : "Confirm Hotel Update"}
            </DialogTitle>
            <DialogDescription asChild className="text-center pt-2">
              <div className="pt-2">
                {pendingHotelAction?.isRateUpdate ? (
                <div className="space-y-3 text-left text-sm text-slate-700">
                  <div className="text-center">
                    <strong>{pendingHotelAction.newHotelName}</strong>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 font-semibold text-slate-900">Current</div>
                    <div>Room type: {String((pendingHotelAction.previousSelection as any)?.roomType || "-")}</div>
                    <div>Meal plan: {String((pendingHotelAction.previousSelection as any)?.mealPlan || "-")}</div>
                    <div>Price: {formatCurrency(getSelectionPrice(pendingHotelAction.previousSelection))}</div>
                  </div>
                  <div className="rounded-md border border-violet-200 bg-violet-50 p-3">
                    <div className="mb-2 font-semibold text-violet-900">New</div>
                    <div>Room type: {String((pendingHotelAction.room as any)?.roomTypeName || (pendingHotelAction.room as any)?.roomType || "-")}</div>
                    <div>Meal plan: {String((pendingHotelAction.room as any)?.mealPlan || "-")}</div>
                    <div>Price: {formatCurrency(getSelectionPrice(pendingHotelAction.room, pendingHotelAction.multiNightPreview))}</div>
                  </div>
                  {(() => {
                    const difference = Number((getSelectionPrice(pendingHotelAction.room, pendingHotelAction.multiNightPreview) - getSelectionPrice(pendingHotelAction.previousSelection)).toFixed(2));
                    return (
                      <div className="font-semibold text-slate-900">
                        Difference: {difference > 0
                          ? `Increase by ${formatCurrency(difference)}`
                          : difference < 0
                          ? `Decrease by ${formatCurrency(Math.abs(difference))}`
                          : "No price difference"}
                      </div>
                    );
                  })()}
                </div>
              ) : pendingHotelAction?.multiNightPreview?.nights && pendingHotelAction.multiNightPreview.nights > 1 ? (
                <>
                  Confirm booking <strong>{pendingHotelAction?.newHotelName}</strong> from{" "}
                  <strong>{formatDisplayDate(pendingHotelAction?.multiNightPreview?.checkInDate)}</strong> to{" "}
                  <strong>{formatDisplayDate(pendingHotelAction?.multiNightPreview?.checkOutDate)}</strong> for{" "}
                  <strong>{pendingHotelAction?.multiNightPreview?.nights} nights</strong>?
                </>
              ) : pendingHotelAction?.isReplacing ? (
                <>
                  Are you sure you want to modify the hotel from{" "}
                  <strong>{pendingHotelAction?.previousHotelName}</strong> to{" "}
                  <strong>{pendingHotelAction?.newHotelName}</strong> for{" "}
                  <strong>{pendingHotelAction?.routeDate}</strong>?
                </>
              ) : (
                <>Are you sure you want to update the hotel details?</>
              )}

                {isOfflineSelection && (
                <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-left text-xs text-amber-900">
                  <div className="mb-1 font-semibold">Offline hotel - subject to availability</div>
                  <div>
                    This option is not confirmed at the time of selection. Availability and rate are subject to confirmation by the hotel. We will request confirmation and contact you if the hotel or rate is unavailable.
                  </div>
                </div>
              )}

                {pendingHotelAction?.manualRoomMealMismatchWarning?.enabled && (
                <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-left text-xs text-amber-800">
                  <div className="mb-1 font-semibold">Room / meal plan mismatch warning</div>
                  <div>{pendingHotelAction.manualRoomMealMismatchWarning.message}</div>
                  <div className="mt-2 font-semibold">
                    Continue only if you want.
                  </div>
                </div>
              )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                handleCancelHotelAction();
              }}
              disabled={isUpdatingHotel}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handleConfirmHotelSelection}
              disabled={isUpdatingHotel}
            >
              {isUpdatingHotel ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                pendingHotelAction?.isRateUpdate ? "Confirm Update" : "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hotel Room Selection Modal */}
      {roomSelectionModal && (
        <HotelRoomSelectionModal
          open={roomSelectionModal.open}
          onOpenChange={(open) => {
            if (!open) {
              setRoomSelectionModal(null);
            }
          }}
          itinerary_plan_hotel_details_ID={roomSelectionModal.itinerary_plan_hotel_details_ID}
          itinerary_plan_id={roomSelectionModal.itinerary_plan_id}
          itinerary_route_id={roomSelectionModal.itinerary_route_id}
          hotel_id={roomSelectionModal.hotel_id}
          group_type={roomSelectionModal.group_type}
          hotel_name={roomSelectionModal.hotel_name}
          onSuccess={() => {
            toast.success('Room categories updated successfully');
            // Note: Room selection doesn't affect hotel list, no refresh needed
          }}
        />
      )}
    </>
  );
};
