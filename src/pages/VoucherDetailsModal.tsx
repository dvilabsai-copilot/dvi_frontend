import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ItineraryService } from "@/services/itinerary";
import { Loader2, Building2, Car, CalendarDays, MapPin, Phone, Mail, BedDouble } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HotelVoucherModal } from "@/components/modals/HotelVoucherModal";
import { VehicleVoucherModal } from "@/components/modals/VehicleVoucherModal";
import { VehicleVoucherConfirmationModal } from "@/components/modals/VehicleVoucherConfirmationModal";
import { toast } from "sonner";

interface VoucherDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  itineraryPlanId: number;
}

interface VoucherWorkspaceData {
  summary: {
    itineraryPlanId: number;
    confirmedItineraryPlanId: number;
    quotationNo: string;
    itineraryPreference: number;
    shouldShowHotels: boolean;
    shouldShowVehicles: boolean;
    arrivalLocation: string;
    departureLocation: string;
    tripStartDateTime?: string | null;
    tripEndDateTime?: string | null;
    noOfDays: number;
    noOfNights: number;
    adults: number;
    children: number;
    infants: number;
    roomCount: number;
    extraBed: number;
    childWithBed: number;
    childWithoutBed: number;
    existingHotelVoucherCount: number;
    existingVehicleVoucherCount: number;
  };
  customer: {
    name: string;
    age?: number | null;
    contactNo: string;
    emailId: string;
  };
  hotelVoucherGroups: Array<{
    routeId: number;
    hotelId: number;
    hotelName: string;
    hotelEmail: string;
    hotelStateCity: string;
    routeDates: string[];
    dayNumbers: number[];
    hotelDetailsIds: number[];
    destinations: string[];
    roomTypes: string[];
    hasVoucher: boolean;
    voucherCount: number;
    cancellationPolicyCount: number;
    voucherCancelled: boolean;
    bookingStatusLabel: string;
    confirmedBy: string;
    confirmedEmail: string;
    confirmedMobile: string;
    invoiceToLabel: string;
  }>;
  vehicleVoucherGroups: Array<{
    vendorEligibleId: number;
    confirmedVendorEligibleId: number;
    vehicleTypeId: number;
    vendorVehicleTypeId: number;
    vendorId: number;
    vendorName: string;
    vendorEmail: string;
    vendorBranchId: number;
    vendorBranchName: string;
    vehicleTypeTitle: string;
    vehicleOrigin: string;
    totalQty: number;
    totalAmount: number;
    cancellationPolicyCount: number;
    hasVoucher: boolean;
    voucherCount: number;
    bookingStatusLabel: string;
    confirmedBy: string;
    confirmedEmail: string;
    confirmedMobile: string;
    reservationNo: string;
    verifiedBy: string;
    verifiedMobile: string;
    verifiedEmail: string;
    statusRemarks: string;
    invoiceToLabel: string;
  }>;
}

type HotelVoucherSelection = {
  routeId: number;
  hotelId: number;
  hotelName: string;
  hotelEmail: string;
  hotelStateCity: string;
  routeDates: string[];
  dayNumbers: number[];
  hotelDetailsIds: number[];
  initialStatus?: 'confirmed' | 'cancelled' | 'pending';
};

type VehicleVoucherSelection = {
  vendorEligibleId: number;
  confirmedVendorEligibleId: number;
  vehicleTypeId: number;
  vendorVehicleTypeId: number;
  vendorId: number;
  vendorName: string;
  vendorEmail: string;
  vendorBranchId: number;
  vendorBranchName: string;
  vehicleTypeTitle: string;
  vehicleOrigin: string;
  totalQty: number;
  totalAmount: number;
  initialStatus?: 'confirmed' | 'cancelled' | 'pending';
};

type VehicleConfirmationSelection = {
  vendorEligibleId: number;
  vehicleTypeTitle: string;
  vendorName: string;
  vendorBranchName: string;
};

export const VoucherDetailsModal: React.FC<VoucherDetailsModalProps> = ({
  isOpen,
  onClose,
  itineraryPlanId,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<VoucherWorkspaceData | null>(null);
  const [selectedHotelForVoucher, setSelectedHotelForVoucher] = useState<HotelVoucherSelection | null>(null);
  const [hotelVoucherModalOpen, setHotelVoucherModalOpen] = useState(false);
  const [selectedVehicleForVoucher, setSelectedVehicleForVoucher] = useState<VehicleVoucherSelection | null>(null);
  const [vehicleVoucherModalOpen, setVehicleVoucherModalOpen] = useState(false);
  const [selectedVehicleForConfirmation, setSelectedVehicleForConfirmation] = useState<VehicleConfirmationSelection | null>(null);
  const [vehicleConfirmationModalOpen, setVehicleConfirmationModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen && itineraryPlanId) {
      void fetchData();
    }
  }, [isOpen, itineraryPlanId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await ItineraryService.getVoucherDetails(itineraryPlanId);
      setData(res as VoucherWorkspaceData);
    } catch (error) {
      console.error("Error fetching voucher workspace:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const passengerMix = useMemo(() => {
    if (!data) return '';
    const parts = [
      data.summary.adults > 0 ? `${data.summary.adults} Adult${data.summary.adults === 1 ? '' : 's'}` : null,
      data.summary.children > 0 ? `${data.summary.children} Child${data.summary.children === 1 ? '' : 'ren'}` : null,
      data.summary.infants > 0 ? `${data.summary.infants} Infant${data.summary.infants === 1 ? '' : 's'}` : null,
    ].filter(Boolean);
    return parts.join(', ');
  }, [data]);

  const formatDateTime = (value?: string | null) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateList = (values: string[]) =>
    values
      .map((value) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      })
      .join(', ');

  const statusBadgeClass = (label: string) => {
    const normalized = label.toLowerCase();
    if (normalized.includes('confirm')) return 'bg-green-100 text-green-700';
    if (normalized.includes('cancel')) return 'bg-red-100 text-red-700';
    if (normalized.includes('block')) return 'bg-slate-100 text-slate-700';
    if (normalized.includes('wait')) return 'bg-amber-100 text-amber-700';
    if (normalized.includes('await')) return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  };

  const openHotelVoucher = (
    group: VoucherWorkspaceData['hotelVoucherGroups'][number],
    initialStatus: 'confirmed' | 'cancelled',
  ) => {
    setSelectedHotelForVoucher({
      routeId: group.routeId,
      hotelId: group.hotelId,
      hotelName: group.hotelName,
      hotelEmail: group.hotelEmail,
      hotelStateCity: group.hotelStateCity,
      routeDates: group.routeDates,
      dayNumbers: group.dayNumbers,
      hotelDetailsIds: group.hotelDetailsIds,
      initialStatus,
    });
    setHotelVoucherModalOpen(true);
  };

  const openVehicleVoucher = (
    group: VoucherWorkspaceData['vehicleVoucherGroups'][number],
    initialStatus: 'confirmed' | 'cancelled',
  ) => {
    setSelectedVehicleForVoucher({
      vendorEligibleId: group.vendorEligibleId,
      confirmedVendorEligibleId: group.confirmedVendorEligibleId,
      vehicleTypeId: group.vehicleTypeId,
      vendorVehicleTypeId: group.vendorVehicleTypeId,
      vendorId: group.vendorId,
      vendorName: group.vendorName,
      vendorEmail: group.vendorEmail,
      vendorBranchId: group.vendorBranchId,
      vendorBranchName: group.vendorBranchName,
      vehicleTypeTitle: group.vehicleTypeTitle,
      vehicleOrigin: group.vehicleOrigin,
      totalQty: group.totalQty,
      totalAmount: group.totalAmount,
      initialStatus,
    });
    setVehicleVoucherModalOpen(true);
  };

  const openVehicleConfirmation = (
    group: VoucherWorkspaceData['vehicleVoucherGroups'][number],
  ) => {
    setSelectedVehicleForConfirmation({
      vendorEligibleId: group.confirmedVendorEligibleId || group.vendorEligibleId,
      vehicleTypeTitle: group.vehicleTypeTitle,
      vendorName: group.vendorName,
      vendorBranchName: group.vendorBranchName,
    });
    setVehicleConfirmationModalOpen(true);
  };

  const handleDownloadHotelVoucher = async () => {
    try {
      await ItineraryService.downloadHotelVoucherPdf(itineraryPlanId);
      toast.success("Hotel voucher download started");
    } catch (error) {
      console.error("Failed to download hotel voucher PDF", error);
      toast.error("Failed to download hotel voucher");
    }
  };

  const handleDownloadVehicleVoucher = async () => {
    try {
      await ItineraryService.downloadVehicleVoucherPdf(itineraryPlanId);
      toast.success("Transport voucher download started");
    } catch (error) {
      console.error("Failed to download vehicle voucher PDF", error);
      toast.error("Failed to download transport voucher");
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Voucher Workspace</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center p-10">
              <Loader2 className="h-8 w-8 animate-spin text-[#d546ab]" />
            </div>
          ) : data ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-[#eadcfb] bg-gradient-to-br from-[#fff7fc] to-[#f9f6ff] p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9c7fb8]">Voucher Details</p>
                    <h2 className="mt-1 text-2xl font-semibold text-[#4a4260]">{data.summary.quotationNo || `Plan ${data.summary.itineraryPlanId}`}</h2>
                    <p className="mt-1 text-sm text-[#6c6c6c]">
                      {data.summary.noOfNights}N / {data.summary.noOfDays}D
                      {passengerMix ? ` | ${passengerMix}` : ''}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm md:min-w-[320px]">
                    <div className="rounded-xl border border-white/70 bg-white/80 p-3">
                      <p className="text-[#6c6c6c]">Hotel Vouchers</p>
                      <p className="mt-1 text-lg font-semibold text-[#4a4260]">{data.summary.existingHotelVoucherCount}</p>
                    </div>
                    <div className="rounded-xl border border-white/70 bg-white/80 p-3">
                      <p className="text-[#6c6c6c]">Vehicle Vouchers</p>
                      <p className="mt-1 text-lg font-semibold text-[#4a4260]">{data.summary.existingVehicleVoucherCount}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-xl bg-white/80 p-4">
                    <div className="flex items-center gap-2 text-[#4a4260]">
                      <MapPin className="h-4 w-4 text-[#d546ab]" />
                      <span className="font-medium">Arrival</span>
                    </div>
                    <p className="mt-2 text-sm text-[#4a4260]">{data.summary.arrivalLocation || '--'}</p>
                    <p className="text-xs text-[#6c6c6c]">{formatDateTime(data.summary.tripStartDateTime)}</p>
                  </div>
                  <div className="rounded-xl bg-white/80 p-4">
                    <div className="flex items-center gap-2 text-[#4a4260]">
                      <CalendarDays className="h-4 w-4 text-[#d546ab]" />
                      <span className="font-medium">Guest</span>
                    </div>
                    <p className="mt-2 text-sm text-[#4a4260]">{data.customer.name || '--'}</p>
                    <p className="text-xs text-[#6c6c6c]">
                      {data.customer.contactNo || '--'}
                      {data.customer.emailId ? ` | ${data.customer.emailId}` : ''}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white/80 p-4">
                    <div className="flex items-center gap-2 text-[#4a4260]">
                      <MapPin className="h-4 w-4 text-[#d546ab]" />
                      <span className="font-medium">Departure</span>
                    </div>
                    <p className="mt-2 text-sm text-[#4a4260]">{data.summary.departureLocation || '--'}</p>
                    <p className="text-xs text-[#6c6c6c]">{formatDateTime(data.summary.tripEndDateTime)}</p>
                  </div>
                </div>

                {data.summary.shouldShowHotels && (
                  <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-xl border border-[#f0e6fb] bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-[#9c7fb8]">Room Count</p>
                      <p className="mt-1 font-semibold text-[#4a4260]">{data.summary.roomCount || 0}</p>
                    </div>
                    <div className="rounded-xl border border-[#f0e6fb] bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-[#9c7fb8]">Extra Bed</p>
                      <p className="mt-1 font-semibold text-[#4a4260]">{data.summary.extraBed || 0}</p>
                    </div>
                    <div className="rounded-xl border border-[#f0e6fb] bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-[#9c7fb8]">Child With Bed</p>
                      <p className="mt-1 font-semibold text-[#4a4260]">{data.summary.childWithBed || 0}</p>
                    </div>
                    <div className="rounded-xl border border-[#f0e6fb] bg-white px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-[#9c7fb8]">Child Without Bed</p>
                      <p className="mt-1 font-semibold text-[#4a4260]">{data.summary.childWithoutBed || 0}</p>
                    </div>
                  </div>
                )}
              </div>

              {data.summary.shouldShowHotels && (
                <section className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-[#d546ab]" />
                      <h3 className="text-lg font-semibold text-[#4a4260]">Hotel Voucher Flow</h3>
                    </div>
                    {data.summary.existingHotelVoucherCount > 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="border-[#20c997] text-[#20c997] hover:bg-[#20c997] hover:text-white"
                        onClick={() => void handleDownloadHotelVoucher()}
                      >
                        <Building2 className="mr-2 h-4 w-4" />
                        Download Hotel Voucher
                      </Button>
                    ) : null}
                  </div>

                  {data.hotelVoucherGroups.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#eadcfb] bg-[#fcfaff] p-6 text-sm text-[#6c6c6c]">
                      No hotel voucher rows found for this itinerary.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data.hotelVoucherGroups.map((group) => (
                        <div key={`hotel-group-${group.hotelId}`} className="rounded-2xl border border-[#eadcfb] bg-white p-4 shadow-sm">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-base font-semibold text-[#4a4260]">{group.hotelName}</h4>
                                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(group.bookingStatusLabel)}`}>
                                  {group.bookingStatusLabel}
                                </span>
                                <span className="rounded-full bg-[#f6efff] px-2.5 py-1 text-xs font-medium text-[#7d56a4]">
                                  {group.dayNumbers.length > 1 ? `Days ${group.dayNumbers.join(', ')}` : `Day ${group.dayNumbers[0] || '-'}`}
                                </span>
                              </div>
                              <p className="text-sm text-[#6c6c6c]">
                                {group.hotelStateCity || group.destinations.join(', ') || '--'}
                              </p>
                              <p className="text-sm text-[#4a4260]">{formatDateList(group.routeDates)}</p>
                              <div className="flex flex-wrap gap-3 text-xs text-[#6c6c6c]">
                                <span className="inline-flex items-center gap-1">
                                  <BedDouble className="h-3.5 w-3.5" />
                                  {group.roomTypes.length > 0 ? group.roomTypes.join(', ') : 'Room type unavailable'}
                                </span>
                                <span>Policies: {group.cancellationPolicyCount}</span>
                                <span>Voucher Rows: {group.voucherCount}</span>
                                <span>Invoice To: {group.invoiceToLabel}</span>
                              </div>
                              {(group.confirmedBy || group.confirmedEmail || group.confirmedMobile) && (
                                <div className="flex flex-wrap gap-3 text-xs text-[#6c6c6c]">
                                  {group.confirmedBy ? <span>Confirmed By: {group.confirmedBy}</span> : null}
                                  {group.confirmedMobile ? (
                                    <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{group.confirmedMobile}</span>
                                  ) : null}
                                  {group.confirmedEmail ? (
                                    <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{group.confirmedEmail}</span>
                                  ) : null}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col lg:min-w-[220px]">
                              <Button
                                type="button"
                                className="bg-[#8b43d1] hover:bg-[#7c37c1]"
                                onClick={() => openHotelVoucher(group, 'confirmed')}
                              >
                                {group.hasVoucher ? 'Update Hotel Voucher' : 'Create Hotel Voucher'}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() => openHotelVoucher(group, 'cancelled')}
                              >
                                Cancel Hotel Voucher
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {data.summary.shouldShowVehicles && (
                <section className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Car className="h-5 w-5 text-[#d546ab]" />
                      <h3 className="text-lg font-semibold text-[#4a4260]">Vehicle Voucher Flow</h3>
                    </div>
                    {data.summary.existingVehicleVoucherCount > 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="border-[#0d6efd] text-[#0d6efd] hover:bg-[#0d6efd] hover:text-white"
                        onClick={() => void handleDownloadVehicleVoucher()}
                      >
                        <Car className="mr-2 h-4 w-4" />
                        Download Transport Voucher
                      </Button>
                    ) : null}
                  </div>

                  {data.vehicleVoucherGroups.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#eadcfb] bg-[#fcfaff] p-6 text-sm text-[#6c6c6c]">
                      No vehicle voucher rows found for this itinerary.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                      {data.vehicleVoucherGroups.map((group) => (
                        <div
                          key={`vehicle-group-${group.confirmedVendorEligibleId || group.vendorEligibleId}`}
                          className="rounded-2xl border border-[#eadcfb] bg-white p-4 shadow-sm"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-base font-semibold text-[#4a4260]">{group.vehicleTypeTitle}</h4>
                                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(group.bookingStatusLabel)}`}>
                                  {group.bookingStatusLabel}
                                </span>
                              </div>
                              <p className="text-sm text-[#4a4260]">{group.vendorName}</p>
                              <p className="text-sm text-[#6c6c6c]">
                                {group.vendorBranchName}
                                {group.vehicleOrigin ? ` | Origin: ${group.vehicleOrigin}` : ''}
                              </p>
                              <div className="flex flex-wrap gap-3 text-xs text-[#6c6c6c]">
                                <span>Qty: {group.totalQty}</span>
                                <span>Amount: Rs. {Number(group.totalAmount || 0).toFixed(2)}</span>
                                <span>Policies: {group.cancellationPolicyCount}</span>
                                <span>Voucher Rows: {group.voucherCount}</span>
                                <span>Invoice To: {group.invoiceToLabel}</span>
                              </div>
                              {(group.confirmedBy || group.confirmedEmail || group.confirmedMobile) && (
                                <div className="flex flex-wrap gap-3 text-xs text-[#6c6c6c]">
                                  {group.confirmedBy ? <span>Confirmed By: {group.confirmedBy}</span> : null}
                                  {group.confirmedMobile ? (
                                    <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{group.confirmedMobile}</span>
                                  ) : null}
                                  {group.confirmedEmail ? (
                                    <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{group.confirmedEmail}</span>
                                  ) : null}
                                </div>
                              )}
                              {(group.reservationNo || group.verifiedBy || group.verifiedMobile || group.verifiedEmail) && (
                                <div className="flex flex-wrap gap-3 text-xs text-[#6c6c6c]">
                                  {group.reservationNo ? <span>Reservation No: {group.reservationNo}</span> : null}
                                  {group.verifiedBy ? <span>Verified By: {group.verifiedBy}</span> : null}
                                  {group.verifiedMobile ? (
                                    <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{group.verifiedMobile}</span>
                                  ) : null}
                                  {group.verifiedEmail ? (
                                    <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{group.verifiedEmail}</span>
                                  ) : null}
                                </div>
                              )}
                              {group.statusRemarks ? (
                                <p className="text-xs text-[#6c6c6c]">Remarks: {group.statusRemarks}</p>
                              ) : null}
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row lg:min-w-[220px] lg:flex-col">
                              <div className="rounded-xl bg-[#faf5ff] px-3 py-2 text-xs text-[#7d56a4] text-center">
                                {group.hasVoucher ? 'Voucher exists' : 'Voucher not created'}
                              </div>
                              <Button
                                type="button"
                                className="bg-[#8b43d1] hover:bg-[#7c37c1]"
                                onClick={() => openVehicleVoucher(group, 'confirmed')}
                              >
                                {group.hasVoucher ? 'Update Vehicle Voucher' : 'Create Vehicle Voucher'}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() => openVehicleVoucher(group, 'cancelled')}
                              >
                                Cancel Vehicle Voucher
                              </Button>
                              {group.hasVoucher ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="border-[#d9c4f5] text-[#7d56a4] hover:bg-[#faf5ff]"
                                  onClick={() => openVehicleConfirmation(group)}
                                >
                                  Supplier Confirmation
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          ) : (
            <div className="text-center p-8 text-gray-500">
              Failed to load voucher workspace.
            </div>
          )}
        </DialogContent>
      </Dialog>

      {selectedHotelForVoucher && (
        <HotelVoucherModal
          open={hotelVoucherModalOpen}
          onOpenChange={setHotelVoucherModalOpen}
          itineraryPlanId={itineraryPlanId}
          routeId={selectedHotelForVoucher.routeId}
          hotelId={selectedHotelForVoucher.hotelId}
          hotelName={selectedHotelForVoucher.hotelName}
          hotelEmail={selectedHotelForVoucher.hotelEmail}
          hotelStateCity={selectedHotelForVoucher.hotelStateCity}
          routeDates={selectedHotelForVoucher.routeDates}
          dayNumbers={selectedHotelForVoucher.dayNumbers}
          hotelDetailsIds={selectedHotelForVoucher.hotelDetailsIds}
          initialStatus={selectedHotelForVoucher.initialStatus}
          onSuccess={() => {
            void fetchData();
          }}
        />
      )}

      {selectedVehicleForVoucher && (
        <VehicleVoucherModal
          open={vehicleVoucherModalOpen}
          onOpenChange={setVehicleVoucherModalOpen}
          itineraryPlanId={itineraryPlanId}
          vendorEligibleId={selectedVehicleForVoucher.vendorEligibleId}
          confirmedVendorEligibleId={selectedVehicleForVoucher.confirmedVendorEligibleId}
          vehicleTypeId={selectedVehicleForVoucher.vehicleTypeId}
          vendorVehicleTypeId={selectedVehicleForVoucher.vendorVehicleTypeId}
          vendorId={selectedVehicleForVoucher.vendorId}
          vendorName={selectedVehicleForVoucher.vendorName}
          vendorEmail={selectedVehicleForVoucher.vendorEmail}
          vendorBranchId={selectedVehicleForVoucher.vendorBranchId}
          vendorBranchName={selectedVehicleForVoucher.vendorBranchName}
          vehicleTypeTitle={selectedVehicleForVoucher.vehicleTypeTitle}
          vehicleOrigin={selectedVehicleForVoucher.vehicleOrigin}
          totalQty={selectedVehicleForVoucher.totalQty}
          totalAmount={selectedVehicleForVoucher.totalAmount}
          initialStatus={selectedVehicleForVoucher.initialStatus}
          onSuccess={() => {
            void fetchData();
          }}
        />
      )}

      {selectedVehicleForConfirmation && (
        <VehicleVoucherConfirmationModal
          open={vehicleConfirmationModalOpen}
          onOpenChange={setVehicleConfirmationModalOpen}
          itineraryPlanId={itineraryPlanId}
          vendorEligibleId={selectedVehicleForConfirmation.vendorEligibleId}
          vehicleTypeTitle={selectedVehicleForConfirmation.vehicleTypeTitle}
          vendorName={selectedVehicleForConfirmation.vendorName}
          vendorBranchName={selectedVehicleForConfirmation.vendorBranchName}
          onSuccess={() => {
            void fetchData();
          }}
        />
      )}
    </>
  );
};

