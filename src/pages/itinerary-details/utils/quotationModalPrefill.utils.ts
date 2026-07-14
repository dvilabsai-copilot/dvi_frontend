import type { AdditionalPassenger } from '../hooks/useQuotationState';
import { buildOccupanciesFromTravellers, type QuotationOccupancy } from './quotationOccupancy.utils';
import { resolveConfirmNationality } from './quotationConfirmationDetails.utils';
import { formatQuotationDateTime } from './quotationDateTime.utils';

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value !== null && typeof value === 'object' ? (value as UnknownRecord) : {};

export type QuotationModalPrefill = {
  nationality: string;
  arrivalDateTime: string;
  arrivalPlace: string;
  departureDateTime: string;
  departurePlace: string;
  additionalAdults: AdditionalPassenger[];
  additionalChildren: AdditionalPassenger[];
  additionalInfants: AdditionalPassenger[];
  occupancyTemplate: QuotationOccupancy[] | null;
};

export const buildQuotationModalPrefill = ({
  plan,
  travellers,
  fallbackNationality,
  roomCount,
  requiresDetailedPassengerFlow,
}: {
  plan: unknown;
  travellers: unknown[];
  fallbackNationality: string;
  roomCount: number;
  requiresDetailedPassengerFlow: boolean;
}): QuotationModalPrefill => {
  const planRecord = asRecord(plan);
  const nationality = resolveConfirmNationality(planRecord, fallbackNationality || 'IN');
  const sortedTravellers = [...travellers].sort((a, b) => {
    const first = asRecord(a);
    const second = asRecord(b);
    return Number(first.traveller_details_ID || 0) - Number(second.traveller_details_ID || 0);
  });
  const adults = sortedTravellers.filter((traveller) => Number(asRecord(traveller).traveller_type || 0) === 1);
  const children = sortedTravellers.filter((traveller) => Number(asRecord(traveller).traveller_type || 0) === 2);
  const infants = sortedTravellers.filter((traveller) => Number(asRecord(traveller).traveller_type || 0) === 3);
  const toPassenger = (title: string, traveller: unknown): AdditionalPassenger => {
    const ageNum = Number(asRecord(traveller).traveller_age);
    return {
      title,
      name: '',
      age: Number.isFinite(ageNum) ? String(Math.trunc(ageNum)) : '',
      nationality,
      panNo: '',
      passportNo: '',
    };
  };
  const additionalAdults = requiresDetailedPassengerFlow ? adults.slice(1).map((traveller) => toPassenger('Mr', traveller)) : [];
  const additionalChildren = requiresDetailedPassengerFlow ? children.map((traveller) => toPassenger('Ms', traveller)) : [];
  const additionalInfants = requiresDetailedPassengerFlow ? infants.map((traveller) => toPassenger('Ms', traveller)) : [];
  const occupancyTemplate = requiresDetailedPassengerFlow && travellers.length > 0
    ? buildOccupanciesFromTravellers(travellers as Array<Record<string, unknown>>, roomCount)
    : null;
  return {
    nationality,
    arrivalDateTime: planRecord.trip_start_date_and_time ? formatQuotationDateTime(String(planRecord.trip_start_date_and_time)) : '',
    arrivalPlace: String(planRecord.arrival_location || ''),
    departureDateTime: planRecord.trip_end_date_and_time ? formatQuotationDateTime(String(planRecord.trip_end_date_and_time)) : '',
    departurePlace: String(planRecord.departure_location || ''),
    additionalAdults,
    additionalChildren,
    additionalInfants,
    occupancyTemplate,
  };
};
