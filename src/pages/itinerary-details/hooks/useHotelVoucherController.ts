import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import { HotelVoucherService } from "@/services/hotelVoucher";
import { toast } from "sonner";

export interface HotelVoucherItem {
  routeId: number;
  hotelId: number;
  hotelName: string;
  hotelEmail: string;
  hotelStateCity: string;
  routeDates: string[];
  dayNumbers: number[];
  hotelDetailsIds: number[];
  initialStatus?: "confirmed" | "cancelled" | "pending";
}

interface HotelVoucherControllerOptions {
  itineraryPlanId: number;
  hotelSaveFunctionRef: MutableRefObject<(() => Promise<boolean>) | null>;
  refreshHotelData: () => Promise<void>;
  setHotelVoucherModalOpen: Dispatch<SetStateAction<boolean>>;
  setSelectedHotelForVoucher: Dispatch<SetStateAction<HotelVoucherItem | null>>;
}

/** Owns hotel voucher modal selection and cancellation mutations. */
export const useHotelVoucherController = ({
  itineraryPlanId,
  hotelSaveFunctionRef,
  refreshHotelData,
  setHotelVoucherModalOpen,
  setSelectedHotelForVoucher,
}: HotelVoucherControllerOptions) => {
  const handleGetSaveFunction = useCallback((saveFn: () => Promise<boolean>) => {
    hotelSaveFunctionRef.current = saveFn;
  }, [hotelSaveFunctionRef]);

  const openVoucherModal = useCallback((item: HotelVoucherItem, initialStatus: HotelVoucherItem["initialStatus"]) => {
    setSelectedHotelForVoucher({ ...item, initialStatus });
    setHotelVoucherModalOpen(true);
  }, [setHotelVoucherModalOpen, setSelectedHotelForVoucher]);

  const handleCreateVoucher = useCallback((hotelData: HotelVoucherItem) => {
    openVoucherModal(hotelData, "confirmed");
  }, [openVoucherModal]);

  const handleCancelVoucherSingle = useCallback((item: HotelVoucherItem) => {
    openVoucherModal(item, "cancelled");
  }, [openVoucherModal]);

  const handleCancelVoucherItems = useCallback(async (items: HotelVoucherItem[]) => {
    if (!itineraryPlanId) {
      toast.error("Unable to resolve itinerary plan ID for hotel cancellation");
      return;
    }

    const validItems = Array.isArray(items) ? items : [];
    if (validItems.length === 0) {
      toast.error("No hotels selected for cancellation");
      return;
    }

    const reason = window.prompt("Enter cancellation reason")?.trim() || "";
    if (!reason) {
      toast.error("Cancellation reason is required");
      return;
    }

    try {
      const routeIds = Array.from(
        new Set(validItems.map((item) => Number(item.routeId)).filter((id) => Number.isFinite(id) && id > 0)),
      );
      const hotelDetailsIds = Array.from(
        new Set(
          validItems
            .flatMap((item) => item.hotelDetailsIds || [])
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id) && id > 0),
        ),
      );

      await HotelVoucherService.cancelHotelVouchers({ itineraryPlanId, reason, routeIds, hotelDetailsIds });
      toast.success(
        validItems.length > 1
          ? `Cancelled ${validItems.length} hotel voucher(s)`
          : "Hotel voucher cancelled successfully",
      );
      await refreshHotelData();
    } catch (error) {
      console.error("Failed to cancel hotel vouchers", error);
      toast.error(error?.message || "Failed to cancel hotel voucher(s)");
    }
  }, [itineraryPlanId, refreshHotelData]);

  return { handleCancelVoucherItems, handleCancelVoucherSingle, handleCreateVoucher, handleGetSaveFunction };
};
