import { api } from '@/lib/api';

export interface HotelCancellationPolicy {
  id: number;
  hotelId: number;
  hotelName: string;
  cancellationDate: string;
  cancellationPercentage: number;
  description: string;
  itineraryPlanId: number;
}

export interface HotelVoucherData {
  id?: number;
  routeId: number;
  itineraryPlanId: number;
  hotelId: number;
  hotelName: string;
  hotelEmail: string;
  hotelStateCity: string;
  routeDates: string[];
  dayNumbers: number[];
  confirmedBy: string;
  emailId: string;
  mobileNumber: string;
  status: 'confirmed' | 'cancelled' | 'pending';
  invoiceTo: 'gst_bill_against_dvi' | 'hotel_direct' | 'agent';
  voucherTermsCondition: string;
  hotelDetailsIds: number[];
}

export interface CreateVoucherPayload {
  itineraryPlanId: number;
  vouchers: Array<{
    routeId: number;
    hotelId: number;
    hotelDetailsIds: number[];
    routeDates: string[];
    confirmedBy: string;
    emailId: string;
    mobileNumber: string;
    status: string;
    invoiceTo: string;
    voucherTermsCondition: string;
  }>;
}

export interface AddCancellationPolicyPayload {
  itineraryPlanId: number;
  hotelId: number;
  cancellationDate: string;
  cancellationPercentage: number;
  description: string;
}

export interface CancelHotelVouchersPayload {
  itineraryPlanId: number;
  reason: string;
  routeIds?: number[];
  hotelDetailsIds?: number[];
  cancelAll?: boolean;
}

export const HotelVoucherService = {
  /**
   * Get all cancellation policies for an itinerary
   */
  getCancellationPolicies: async (itineraryPlanId: number): Promise<HotelCancellationPolicy[]> => {
    return api(`/itineraries/${itineraryPlanId}/hotel-vouchers/cancellation-policies`, {
      method: 'GET',
    });
  },

  /**
   * Get cancellation policies for a specific hotel
   */
  getHotelCancellationPolicies: async (
    itineraryPlanId: number,
    hotelId: number
  ): Promise<HotelCancellationPolicy[]> => {
    return api(`/itineraries/${itineraryPlanId}/hotel-vouchers/${hotelId}/cancellation-policies`, {
      method: 'GET',
    });
  },

  /**
   * Add a new cancellation policy
   */
  addCancellationPolicy: async (
    payload: AddCancellationPolicyPayload
  ): Promise<{ success: boolean; data: HotelCancellationPolicy }> => {
    return api(`/itineraries/${payload.itineraryPlanId}/hotel-vouchers/cancellation-policies`, {
      method: 'POST',
      body: {
        hotelId: payload.hotelId,
        cancellationDate: payload.cancellationDate,
        cancellationPercentage: payload.cancellationPercentage,
        description: payload.description,
      },
    });
  },

  /**
   * Delete a cancellation policy
   */
  deleteCancellationPolicy: async (
    itineraryPlanId: number,
    policyId: number,
  ): Promise<{ success: boolean }> => {
    return api(`/itineraries/${itineraryPlanId}/hotel-vouchers/cancellation-policies/${policyId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get existing voucher data for a hotel
   */
  getHotelVoucher: async (
    itineraryPlanId: number,
    hotelId: number
  ): Promise<HotelVoucherData | null> => {
    return api(`/itineraries/${itineraryPlanId}/hotel-vouchers/${hotelId}`, {
      method: 'GET',
    });
  },

  /**
   * Create or update hotel vouchers
   */
  createHotelVouchers: async (
    payload: CreateVoucherPayload
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api(`/itineraries/${payload.itineraryPlanId}/hotel-vouchers`, {
      method: 'POST',
      body: payload,
    });

    return {
      success: true,
      message: response.message || 'Hotel voucher successfully created and sent to respective hotels',
    };
  },

  /**
   * Get default voucher terms and conditions
   */
  getDefaultVoucherTerms: async (itineraryPlanId: number): Promise<string> => {
    const response = await api(`/itineraries/${itineraryPlanId}/hotel-vouchers/default-terms`, {
      method: 'GET',
    });
    return String(response?.terms || '').trim();
  },

  /**
   * Cancel hotels for selected routes/hotel detail IDs (bulk or individual)
   */
  cancelHotelVouchers: async (payload: CancelHotelVouchersPayload) => {
    return api(`/itineraries/${payload.itineraryPlanId}/hotel-cancellations`, {
      method: 'POST',
      body: {
        reason: payload.reason,
        route_ids: payload.routeIds,
        hotel_details_ids: payload.hotelDetailsIds,
        cancel_all: payload.cancelAll === true,
      },
    });
  },
};
