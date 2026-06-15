import { api } from '@/lib/api';

export interface VehicleCancellationPolicy {
  id: number;
  vendorId: number;
  vendorName: string;
  vendorVehicleTypeId: number;
  vehicleTypeName: string;
  cancellationDate: string;
  cancellationPercentage: number;
  description: string;
  itineraryPlanId: number;
}

export interface VehicleVoucherData {
  id?: number;
  itineraryPlanId: number;
  vendorEligibleId: number;
  confirmedVendorEligibleId?: number;
  vendorId: number;
  vendorBranchId: number;
  vehicleTypeId: number;
  confirmedBy: string;
  emailId: string;
  mobileNumber: string;
  status: 'confirmed' | 'cancelled' | 'pending';
  invoiceTo: 'gst_bill_against_dvi' | 'hotel_direct' | 'agent';
  voucherTermsCondition: string;
  reservationNo?: string;
  verifiedBy?: string;
  verifiedMobileNo?: string;
  verifiedEmailId?: string;
  statusRemarks?: string;
  bookingStatusCode?: number;
}

export interface CreateVehicleVoucherPayload {
  itineraryPlanId: number;
  vouchers: Array<{
    vendorEligibleId?: number;
    confirmedVendorEligibleId?: number;
    vehicleTypeId: number;
    vendorVehicleTypeId: number;
    vendorId: number;
    vendorBranchId: number;
    totalVehicleQty: number;
    grandTotal: number;
    confirmedBy: string;
    emailId: string;
    mobileNumber: string;
    status: string;
    invoiceTo: string;
    voucherTermsCondition: string;
  }>;
}

export interface AddVehicleCancellationPolicyPayload {
  itineraryPlanId: number;
  vendorId: number;
  vendorVehicleTypeId: number;
  cancellationDate: string;
  cancellationPercentage: number;
  description: string;
}

export interface UpdateVehicleVoucherConfirmationPayload {
  itineraryPlanId: number;
  vendorEligibleId: number;
  reservationNo: string;
  verifiedBy: string;
  verifiedMobileNo: string;
  verifiedEmailId?: string;
  bookingStatus: number;
  statusRemarks?: string;
}

export const VehicleVoucherService = {
  getCancellationPolicies: async (itineraryPlanId: number): Promise<VehicleCancellationPolicy[]> => {
    return api(`/itineraries/${itineraryPlanId}/vehicle-vouchers/cancellation-policies`, {
      method: 'GET',
    });
  },

  getVehicleCancellationPolicies: async (
    itineraryPlanId: number,
    vendorId: number,
    vendorVehicleTypeId: number,
  ): Promise<VehicleCancellationPolicy[]> => {
    return api(
      `/itineraries/${itineraryPlanId}/vehicle-vouchers/${vendorId}/${vendorVehicleTypeId}/cancellation-policies`,
      {
        method: 'GET',
      },
    );
  },

  addCancellationPolicy: async (
    payload: AddVehicleCancellationPolicyPayload,
  ): Promise<{ success: boolean; data: VehicleCancellationPolicy }> => {
    return api(`/itineraries/${payload.itineraryPlanId}/vehicle-vouchers/cancellation-policies`, {
      method: 'POST',
      body: {
        vendorId: payload.vendorId,
        vendorVehicleTypeId: payload.vendorVehicleTypeId,
        cancellationDate: payload.cancellationDate,
        cancellationPercentage: payload.cancellationPercentage,
        description: payload.description,
      },
    });
  },

  deleteCancellationPolicy: async (
    itineraryPlanId: number,
    policyId: number,
  ): Promise<{ success: boolean }> => {
    return api(`/itineraries/${itineraryPlanId}/vehicle-vouchers/cancellation-policies/${policyId}`, {
      method: 'DELETE',
    });
  },

  getVehicleVoucher: async (
    itineraryPlanId: number,
    vendorEligibleId: number,
  ): Promise<VehicleVoucherData | null> => {
    return api(`/itineraries/${itineraryPlanId}/vehicle-vouchers/${vendorEligibleId}`, {
      method: 'GET',
    });
  },

  getDefaultVoucherTerms: async (itineraryPlanId: number): Promise<string> => {
    const response = await api(`/itineraries/${itineraryPlanId}/vehicle-vouchers/default-terms`, {
      method: 'GET',
    });
    return String(response?.terms || '').trim();
  },

  createVehicleVouchers: async (
    payload: CreateVehicleVoucherPayload,
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api(`/itineraries/${payload.itineraryPlanId}/vehicle-vouchers`, {
      method: 'POST',
      body: payload,
    });

    return {
      success: true,
      message: response.message || 'Vehicle voucher successfully created',
    };
  },

  updateVehicleVoucherConfirmation: async (
    payload: UpdateVehicleVoucherConfirmationPayload,
  ): Promise<{ success: boolean; message: string }> => {
    const response = await api(
      `/itineraries/${payload.itineraryPlanId}/vehicle-vouchers/${payload.vendorEligibleId}/confirmation`,
      {
        method: 'PATCH',
        body: {
          reservationNo: payload.reservationNo,
          verifiedBy: payload.verifiedBy,
          verifiedMobileNo: payload.verifiedMobileNo,
          verifiedEmailId: payload.verifiedEmailId,
          bookingStatus: payload.bookingStatus,
          statusRemarks: payload.statusRemarks,
        },
      },
    );

    return {
      success: true,
      message: response.message || 'Vehicle voucher confirmation updated',
    };
  },
};
