/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HotelRoomSelectionModal } from "@/components/hotels/HotelRoomSelectionModal";
import { DeleteConfirmationDialog } from "../itinerary-details/components/DeleteConfirmationDialog";
import { getHotelRoutePayable } from "./hotelCardPricing";
import { getSelectedRoomTypeLabels } from "./hotelList.utils";
import type { PendingHotelAction } from "./hotelList.types";
import type { HotelRoomBatchPrice } from "../itinerary-details/itinerary-details.types";
import { HotelRoomBatchPrices } from "./HotelAvailabilityReviewDialog";

export type BatchHotelFareReview = {
  action: PendingHotelAction;
  currency: string;
  estimatedTotal: number | null;
  mealSupplement: number;
  stayLabel: string;
  roomBatchPrices?: HotelRoomBatchPrice[];
};

export const HotelListDialogs: React.FC<{
  context: Record<string, any>;
  batchFareReview?: BatchHotelFareReview | null;
  onBatchFareDecision?: (approved: boolean) => void;
}> = ({ context, batchFareReview, onBatchFareDecision }) => {
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
    hotelActionPhase,
    handleConfirmHotelSelection,
    handleCancelHotelAction,
    setRoomSelectionModal,
    roomSelectionModal,
    toast,
    onRefreshSelectedHotel,
    pendingHotelRemoval,
    setPendingHotelRemoval,
    isRemovingHotel,
    handleConfirmHotelRemoval,
  } = context;

  const getSelectionPrice = (selection: any, preview?: any): number => {
    const amount = preview?.totalAmountAfterTax ?? getHotelRoutePayable(selection, true);
    const parsed = Number(amount || 0);
    return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
  };
  const getSelectionRoomLabel = (selection: Record<string, unknown> | null | undefined) => {
    const labels = getSelectedRoomTypeLabels(selection ?? {});
    return labels.length > 1 ? labels.join(" + ") : String(selection?.roomTypeName || selection?.roomType || "-");
  };

  const action: PendingHotelAction | null = batchFareReview?.action ?? pendingHotelAction;
  const updatingConfirmation = isUpdatingHotel && !batchFareReview;
  const confirmAction = () => batchFareReview ? onBatchFareDecision?.(true) : handleConfirmHotelSelection();
  const cancelAction = () => batchFareReview ? onBatchFareDecision?.(false) : handleCancelHotelAction();
  const isOfflineSelection = Boolean(
    action?.room && (
      String(action.room.provider || '').trim().toLowerCase() === 'offline' ||
      action.room.requiresHotelApproval === true
    ),
  );
  const hasPreviousSelection = Boolean(action?.previousSelection);
  const currentPrice = getSelectionPrice(action?.previousSelection);
  const newPrice = getSelectionPrice(action?.room, action?.multiNightPreview);
  const priceDifference = Number((newPrice - currentPrice).toFixed(2));
  const formatNewPrice = batchFareReview && batchFareReview.currency !== "INR"
    ? (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: batchFareReview.currency }).format(amount)
    : formatCurrency;

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
                  // This dialog already contains the complete single-night
                  // confirmation details. Persist the explicit choice without
                  // opening a second generic confirmation dialog.
                  openConfirmDialogForAction(action, { autoConfirm: true, singleNightOnly: true });
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
                  const { action, preview } = stayExtensionModalState;
                  setStayExtensionModalState(null);
                  // The continuous-stay dialog already contains the complete
                  // confirmation details. Persist immediately after this
                  // explicit choice instead of opening a second generic
                  // confirmation dialog with the same information.
                  openConfirmDialogForAction(action, {
                    autoConfirm: true,
                    multiNightPreview: preview,
                  });
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

      <Dialog open={Boolean(isUpdatingHotel) && (hotelActionPhase === 'checking' || hotelActionPhase === 'applying')}>
        <DialogContent
          className="sm:max-w-sm"
          hideClose
          onEscapeKeyDown={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
          aria-busy="true"
        >
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-violet-100 p-3">
                <Loader2 className="h-6 w-6 animate-spin text-violet-700" aria-hidden="true" />
              </div>
            </div>
            <DialogTitle className="text-center">
              {hotelActionPhase === 'applying' ? 'Applying hotel selection' : 'Checking hotel availability'}
            </DialogTitle>
            <DialogDescription className="text-center">
              {hotelActionPhase === 'applying'
                ? 'Saving the confirmed hotel selection. Please wait...'
                : 'Validating the selected hotel and latest rate. Please wait...'}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        // Auto-confirm actions originate from the stay-extension dialog,
        // whose details were already confirmed by the user. Keep the generic
        // dialog closed even if state updates arrive in separate renders.
        open={Boolean(batchFareReview) || (showConfirmDialog && !pendingHotelAction?.autoConfirm)}
        onOpenChange={(open) => {
          if (!open && !updatingConfirmation) {
            cancelAction();
          } else if (open && !batchFareReview) {
            setShowConfirmDialog(true);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void confirmAction();
            }}
          >
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-yellow-100 p-3">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <DialogTitle className="text-center">
              {hasPreviousSelection
                ? "Confirm Hotel Modification"
                : action?.multiNightPreview?.nights && action.multiNightPreview.nights > 1
                ? `Confirm ${action.multiNightPreview.nights}-Night Hotel Booking?`
                : action?.isReplacing
                ? `Confirm Hotel Modification for ${action?.routeDate}?`
                : "Confirm Hotel Update"}
            </DialogTitle>
            <DialogDescription asChild className="text-center pt-2">
              <div className="pt-2">
                {action && (hasPreviousSelection || batchFareReview) ? (
                <div className="space-y-3 text-left text-sm text-slate-700">
                  <div className="text-center text-xs text-slate-600">
                    {batchFareReview?.stayLabel ?? (action.multiNightPreview?.nights && action.multiNightPreview.nights > 1
                      ? `${formatDisplayDate(action.multiNightPreview.checkInDate)} to ${formatDisplayDate(action.multiNightPreview.checkOutDate)} · ${action.multiNightPreview.nights} nights`
                      : action.routeDate)}
                  </div>
                  {hasPreviousSelection && (
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <div className="mb-2 font-semibold text-slate-900">Current</div>
                      <div>Hotel: {String(action.previousHotelName || action.previousSelection?.hotelName || "-")}</div>
                      <div>Room type: {getSelectionRoomLabel(action.previousSelection)}</div>
                      <div>Meal plan: {String(action.previousSelection?.mealPlan || "-")}</div>
                      <div>Price: {batchFareReview && currentPrice <= 0 ? "—" : formatCurrency(currentPrice)}</div>
                    </div>
                  )}
                  <div className="rounded-md border border-violet-200 bg-violet-50 p-3">
                    <div className="mb-2 font-semibold text-violet-900">New</div>
                    <div>Hotel: {String(action.newHotelName || action.room.hotelName || "-")}</div>
                    {batchFareReview?.roomBatchPrices?.length
                      ? <HotelRoomBatchPrices prices={batchFareReview.roomBatchPrices} />
                      : <div>Room type: {getSelectionRoomLabel(action.room)}</div>}
                    <div>Meal plan: {String(action.room.mealPlan || "-")}</div>
                    <div>Price: {formatNewPrice(newPrice)}</div>
                    {batchFareReview && batchFareReview.mealSupplement > 0 && (
                      <div>DVI {action.room.mealPlan === 'CP' ? 'breakfast' : 'meals'} included: {formatNewPrice(batchFareReview.mealSupplement)}</div>
                    )}
                    {batchFareReview?.estimatedTotal != null && batchFareReview.estimatedTotal !== newPrice && (
                      <div className="text-xs text-slate-600">Previous estimate: {formatNewPrice(batchFareReview.estimatedTotal)}</div>
                    )}
                  </div>
                  {hasPreviousSelection && (!batchFareReview || (currentPrice > 0 && batchFareReview.currency === "INR")) && (
                      <div className="font-semibold text-slate-900">
                        Difference: {priceDifference > 0
                          ? `Increase by ${formatCurrency(priceDifference)}`
                          : priceDifference < 0
                          ? `Decrease by ${formatCurrency(Math.abs(priceDifference))}`
                          : "No price difference"}
                      </div>
                  )}
                  {action.operationPricing && action.operationPricing.dates.length > 1 && (
                    <div className="text-xs text-slate-600">
                      Applies to: {action.operationPricing.dates.map(formatDisplayDate).join(", ")}
                      <div>Prices shown are for {formatDisplayDate(action.routeDate)}.</div>
                    </div>
                  )}
                </div>
              ) : action?.multiNightPreview?.nights && action.multiNightPreview.nights > 1 ? (
                <>
                  Confirm booking <strong>{action?.newHotelName}</strong> from{" "}
                  <strong>{formatDisplayDate(action?.multiNightPreview?.checkInDate)}</strong> to{" "}
                  <strong>{formatDisplayDate(action?.multiNightPreview?.checkOutDate)}</strong> for{" "}
                  <strong>{action?.multiNightPreview?.nights} nights</strong>?
                </>
              ) : action?.isReplacing ? (
                <>
                  Are you sure you want to modify the hotel from{" "}
                  <strong>{action?.previousHotelName}</strong> to{" "}
                  <strong>{action?.newHotelName}</strong> for{" "}
                  <strong>{action?.routeDate}</strong>?
                </>
              ) : (
                <>Are you sure you want to update the hotel details?</>
              )}

                {batchFareReview && String(action?.room.mealPlan || "").toUpperCase() === "EP" && (
                  <p className="mt-4 text-left text-sm text-amber-900">Room only. Breakfast is excluded.</p>
                )}
                {isOfflineSelection && (
                <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-left text-xs text-amber-900">
                  <div className="mb-1 font-semibold">Offline hotel - subject to availability</div>
                  <div>
                    This option is not confirmed at the time of selection. Availability and rate are subject to confirmation by the hotel. We will request confirmation and contact you if the hotel or rate is unavailable.
                  </div>
                </div>
              )}

                {action?.manualRoomMealMismatchWarning?.enabled && (
                <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-left text-xs text-amber-800">
                  <div className="mb-1 font-semibold">Room / meal plan mismatch warning</div>
                  <div>{action.manualRoomMealMismatchWarning.message}</div>
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
                cancelAction();
              }}
              disabled={updatingConfirmation}
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                void confirmAction();
              }}
              disabled={updatingConfirmation}
            >
              {updatingConfirmation ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                hasPreviousSelection ? "Confirm Update" : "Confirm"
              )}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={Boolean(pendingHotelRemoval)}
        title="Remove hotel reservation?"
        description={(
          <span>
            Are you sure you want to remove the hotel reservation for{' '}
            <strong>{pendingHotelRemoval?.routeDate || 'this stay'}</strong>
            {pendingHotelRemoval?.hotelName ? <> at <strong>{pendingHotelRemoval.hotelName}</strong></> : ''}? The traveler will arrange this stay independently.
          </span>
        )}
        deleting={Boolean(isRemovingHotel)}
        onOpenChange={(open) => {
          if (!open && !isRemovingHotel) setPendingHotelRemoval(null);
        }}
        onCancel={() => setPendingHotelRemoval(null)}
        onConfirm={() => void handleConfirmHotelRemoval()}
      />

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
          hotel_code={roomSelectionModal.hotel_code}
          provider={roomSelectionModal.provider}
          selected_room_type_title={roomSelectionModal.selected_room_type_title}
          assignedRoomTypes={roomSelectionModal.assignedRoomTypes}
          onSuccess={async () => {
            toast.success('Room categories updated successfully');
            const routeId = Number(roomSelectionModal.itinerary_route_id || 0);
            const provider = String(roomSelectionModal.provider || '').trim().toLowerCase();
            const hotelCode = String(roomSelectionModal.hotel_code || '').trim();
            if (onRefreshSelectedHotel && routeId > 0 && provider && hotelCode) {
              await onRefreshSelectedHotel({
                routeId,
                provider,
                hotelCode,
                groupType: Number(roomSelectionModal.group_type || 0),
              });
            } else {
              toast.warning('Hotel availability was not refreshed because the selected hotel identity is incomplete.');
            }
          }}
        />
      )}
    </>
  );
};
