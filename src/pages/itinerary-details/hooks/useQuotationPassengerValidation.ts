import { useCallback } from "react";
import { toast } from "sonner";
import type { AdditionalPassenger } from "./useQuotationState";

interface GuestDetailsShape {
  name: string;
  salutation: string;
  contactNo: string;
  nationality: string;
  age: string | number;
}

interface PassengerValidationOptions {
  guestDetails: GuestDetailsShape;
  additionalAdults: AdditionalPassenger[];
  additionalChildren: AdditionalPassenger[];
  additionalInfants: AdditionalPassenger[];
  requiresDetailedPassengerFlow: boolean;
  expectedAdults: number;
  expectedChildren: number;
  expectedInfants: number;
  setFormErrors: (errors: Record<string, string>) => void;
}

export interface ValidatedQuotationPassengers {
  normalizedAdditionalAdults: AdditionalPassenger[];
  normalizedAdditionalChildren: AdditionalPassenger[];
  normalizedAdditionalInfants: AdditionalPassenger[];
}

const allowedTitles = ["Mr", "Ms", "Mrs"];
const nameRegex = /^[A-Za-z][A-Za-z\s'-]{1,24}$/;
const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const normalizeNameParts = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || name.trim();
  return { firstName, lastName: parts.slice(1).join(" ") || firstName };
};
const validName = (value: string) => nameRegex.test(value.trim());
const validNationality = (value: string) => /^[A-Z]{2}$/.test(value.trim().toUpperCase());
const validNameParts = (value: string) => {
  const parts = normalizeNameParts(value);
  return validName(parts.firstName) && validName(parts.lastName);
};

const sanitize = (list: AdditionalPassenger[]) => list
  .map((item) => ({
    ...item,
    title: String(item.title || "").trim(),
    name: String(item.name || "").trim(),
    age: String(item.age || "").trim(),
    nationality: String(item.nationality || "").trim().toUpperCase(),
    panNo: String(item.panNo || "").trim().toUpperCase(),
    passportNo: String(item.passportNo || "").trim().toUpperCase(),
  }))
  .filter((item) => item.title || item.name || item.age || item.nationality || item.panNo || item.passportNo);

/** Validates and normalizes quotation passenger rows before confirmation. */
export const useQuotationPassengerValidation = ({
  guestDetails,
  additionalAdults,
  additionalChildren,
  additionalInfants,
  requiresDetailedPassengerFlow,
  expectedAdults,
  expectedChildren,
  expectedInfants,
  setFormErrors,
}: PassengerValidationOptions) => useCallback((): ValidatedQuotationPassengers | null => {
  const nextErrors: Record<string, string> = {};
  if (!String(guestDetails.name || "").trim()) nextErrors["primary-name"] = "Primary guest name is required.";
  if (!String(guestDetails.contactNo || "").trim()) nextErrors["primary-contactNo"] = "Primary guest contact number is required.";
  if (!String(guestDetails.nationality || "").trim()) nextErrors["primary-nationality"] = "Primary guest nationality is required.";
  if (!allowedTitles.includes(guestDetails.salutation)) nextErrors["primary-salutation"] = "Primary guest salutation is invalid.";
  if (!validNameParts(guestDetails.name)) nextErrors["primary-name"] = "Primary guest first name/last name must each be 2-25 valid characters.";
  if (!validNationality(guestDetails.nationality)) nextErrors["primary-nationality"] = "Primary guest nationality must be a valid ISO-2 code (example: IN).";
  const primaryAge = Number(guestDetails.age);
  if (!Number.isFinite(primaryAge) || primaryAge <= 0) nextErrors["primary-age"] = "Primary guest age must be a valid number.";

  const normalizedAdditionalAdults = sanitize(additionalAdults);
  const normalizedAdditionalChildren = sanitize(additionalChildren);
  const normalizedAdditionalInfants = sanitize(additionalInfants);
  const validateAdditional = (list: AdditionalPassenger[], label: "adult" | "child" | "infant", expectedCount: number, minAge: number, maxAge: number) => {
    if (list.length !== expectedCount) nextErrors[`count-${label}`] = `Expected ${expectedCount} ${label}${expectedCount === 1 ? "" : "s"}, but found ${list.length}.`;
    list.forEach((item, index) => {
      if (!item.title) nextErrors[`${label}-${index}-title`] = `${label} ${index + 1} title is required.`;
      else if (!allowedTitles.includes(item.title)) nextErrors[`${label}-${index}-title`] = `${label} ${index + 1} title is invalid.`;
      if (!item.name.trim()) nextErrors[`${label}-${index}-name`] = `${label} ${index + 1} name is required.`;
      else if (!validNameParts(item.name)) nextErrors[`${label}-${index}-name`] = `${label} ${index + 1} first/last name must each be 2-25 valid characters.`;
      if (!item.nationality.trim()) nextErrors[`${label}-${index}-nationality`] = `${label} ${index + 1} nationality is required.`;
      else if (!validNationality(item.nationality)) nextErrors[`${label}-${index}-nationality`] = `${label} ${index + 1} nationality must be ISO-2 code (example: IN).`;
      const age = Number(item.age);
      if (!Number.isFinite(age) || age < minAge || age > maxAge) nextErrors[`${label}-${index}-age`] = `${label} ${index + 1} age must be between ${minAge} and ${maxAge}.`;
      if (item.panNo && !panRegex.test(item.panNo)) nextErrors[`${label}-${index}-panNo`] = `${label} ${index + 1} PAN must be valid format (example: ABCDE1234F).`;
    });
  };
  if (requiresDetailedPassengerFlow) {
    validateAdditional(normalizedAdditionalAdults, "adult", expectedAdults, 12, 120);
    validateAdditional(normalizedAdditionalChildren, "child", expectedChildren, 2, 11);
    validateAdditional(normalizedAdditionalInfants, "infant", expectedInfants, 0, 5);
  }
  if (Object.keys(nextErrors).length > 0) {
    setFormErrors(nextErrors);
    toast.error(Object.values(nextErrors)[0] || "Please fix guest details before confirming quotation.");
    return null;
  }
  setFormErrors({});
  return { normalizedAdditionalAdults, normalizedAdditionalChildren, normalizedAdditionalInfants };
}, [additionalAdults, additionalChildren, additionalInfants, expectedAdults, expectedChildren, expectedInfants, guestDetails, requiresDetailedPassengerFlow, setFormErrors]);
