// FILE: src/drivers/steps/DriverStepBasicInfo.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import type { DriverBasicInfo, Option } from "@/services/drivers";

function isoToDate(iso?: string) {
  if (!iso) return undefined;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? undefined : d;
}

function dateToISO(d?: Date) {
  if (!d) return "";
  // keep noon to avoid timezone shifting in UI
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0).toISOString();
}

function RequiredStar() {
  return <span className="text-red-500"> *</span>;
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <div className="text-xs text-red-600 mt-1">{msg}</div>;
}

function isValidIndianMobile(value?: string) {
  return /^[6-9][0-9]{9}$/.test(String(value || "").trim());
}

function isValidEmail(value?: string) {
  const trimmed = String(value || "").trim();

  if (!trimmed) return true;

  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed);
}

function isValidLicenseNumber(value?: string) {
  const trimmed = String(value || "").trim().toUpperCase();

  if (!trimmed) return true;

  return /^[A-Z]{2}[0-9]{2}\s?[0-9]{11}$/.test(trimmed);
}

function isValidAadharNumber(value?: string) {
  const trimmed = String(value || "").trim();

  if (!trimmed) return true;

  return /^[2-9][0-9]{11}$/.test(trimmed);
}

function isValidPanNumber(value?: string) {
  const trimmed = String(value || "").trim().toUpperCase();

  if (!trimmed) return true;

  return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(trimmed);
}

function isValidVoterIdNumber(value?: string) {
  const trimmed = String(value || "").trim().toUpperCase();

  if (!trimmed) return true;

  return /^[A-Z]{3}[0-9]{7}$/.test(trimmed);
}

function formatDateForInput(date?: Date) {
  if (!date) return "";

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());

  return `${dd}/${mm}/${yyyy}`;
}

function parseManualDateToISO(value: string) {
  const raw = String(value || "").trim();

  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return "";

  const [dd, mm, yyyy] = raw.split("/").map(Number);
  const date = new Date(yyyy, mm - 1, dd, 12, 0, 0);

  if (
    Number.isNaN(date.getTime()) ||
    date.getDate() !== dd ||
    date.getMonth() !== mm - 1 ||
    date.getFullYear() !== yyyy
  ) {
    return "";
  }

  return date.toISOString();
}

function DatePicker({
  label,
  required,
  valueISO,
  onChangeISO,
  error,
  inputId,
  allowManualInput = false,
  fromYear = 1950,
  toYear = new Date().getFullYear() + 20,
  defaultMonth,
}: {
  label: string;
  required?: boolean;
  valueISO?: string;
  onChangeISO: (iso: string) => void;
  error?: string;
  inputId: string;
  allowManualInput?: boolean;
  fromYear?: number;
  toYear?: number;
  defaultMonth?: Date;
}) {
  const selected = isoToDate(valueISO);
  const [inputValue, setInputValue] = useState(formatDateForInput(selected));

  useEffect(() => {
    setInputValue(formatDateForInput(selected));
  }, [valueISO]);

  const handleManualChange = (rawValue: string) => {
    let cleaned = rawValue.replace(/[^\d/]/g, "");

    if (cleaned.length === 2 && !cleaned.includes("/")) {
      cleaned = `${cleaned}/`;
    }

    if (cleaned.length === 5 && cleaned.split("/").length === 2) {
      cleaned = `${cleaned}/`;
    }

    if (cleaned.length > 10) return;

    setInputValue(cleaned);

    if (cleaned.length === 10) {
      const iso = parseManualDateToISO(cleaned);
      if (iso) {
        onChangeISO(iso);
      }
    }

    if (!cleaned) {
      onChangeISO("");
    }
  };

  return (
    <div>
      <Label htmlFor={inputId} className="text-sm text-gray-700">
        {label}
        {required ? <RequiredStar /> : null}
      </Label>

      <Popover>
        <div
          className={[
            "mt-2 flex h-11 w-full items-center rounded-md border bg-white px-3",
            error ? "border-red-500" : "border-gray-200",
          ].join(" ")}
        >
          <Input
            id={inputId}
            value={allowManualInput ? inputValue : formatDateForInput(selected)}
            onChange={(e) => {
              if (allowManualInput) {
                handleManualChange(e.target.value);
              }
            }}
            readOnly={!allowManualInput}
            placeholder={label}
            className="h-9 border-0 px-0 text-base shadow-none focus-visible:ring-0"
          />

          <PopoverTrigger asChild>
            <button type="button" className="ml-2">
              <CalendarIcon className="h-5 w-5 text-violet-600" />
            </button>
          </PopoverTrigger>
        </div>

        <PopoverContent className="w-auto p-2" align="start">
          <Calendar
  mode="single"
  selected={selected}
  defaultMonth={selected || defaultMonth}
  onSelect={(d) => {
    const iso = dateToISO(d);
    onChangeISO(iso);
    setInputValue(formatDateForInput(d));
  }}
  captionLayout="dropdown"
  fromYear={fromYear}
  toYear={toYear}
  initialFocus
/>
        </PopoverContent>
      </Popover>

      <FieldError msg={error} />
    </div>
  );
}

export function DriverStepBasicInfo({
  values,
  onChange,
  vendors,
  vehicleTypes,
  bloodGroups,
  genders,
  onBack,
  onSaveContinue,
  saving,
}: {
  values: DriverBasicInfo;
  onChange: (patch: Partial<DriverBasicInfo>) => void;
  vendors: Option[];
  vehicleTypes: Option[];
  bloodGroups: Option[];
  genders: Option[];
  onBack: () => void;
  onSaveContinue: () => void;
  saving: boolean;
}) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const refs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});

  const vendorItems = useMemo(() => vendors ?? [], [vendors]);
  const vehicleTypeItems = useMemo(() => vehicleTypes ?? [], [vehicleTypes]);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState<string>(values.profileUrl || "");

    useEffect(() => {
    if (values.profileFile) {
      const objectUrl = URL.createObjectURL(values.profileFile);
      setProfilePreviewUrl(objectUrl);
      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    }

    setProfilePreviewUrl(values.profileUrl || "");
    return undefined;
  }, [values.profileFile, values.profileUrl]);

  function handleMobileChange(
    field: "primaryMobile" | "alternativeMobile" | "whatsappMobile",
    value: string,
  ) {
    onChange({ [field]: value } as Partial<DriverBasicInfo>);

    const trimmedValue = String(value || "").trim();

    setErrors((prev) => {
      const next = { ...prev };

      if (field === "primaryMobile") {
        if (!trimmedValue) {
          next.primaryMobile = "Primary Mobile Number is required";
        } else if (!/^[0-9]+$/.test(trimmedValue)) {
          next.primaryMobile = "Only numbers are allowed";
        } else if (!isValidIndianMobile(trimmedValue)) {
          next.primaryMobile =
            "Mobile number must be 10 digits and start with 6, 7, 8, or 9";
        } else {
          delete next.primaryMobile;
        }

        return next;
      }

      if (trimmedValue && !/^[0-9]+$/.test(trimmedValue)) {
        next[field] = "Only numbers are allowed";
      } else if (trimmedValue && !isValidIndianMobile(trimmedValue)) {
        next[field] =
          "Mobile number must be 10 digits and start with 6, 7, 8, or 9";
      } else {
        delete next[field];
      }

      return next;
    });
  }

 function handleTextValidationChange(
  field:
    | "email"
    | "licenseNumber"
    | "aadharNumber"
    | "panNumber"
    | "voterId",
  value: string,
) {
  onChange({ [field]: value } as Partial<DriverBasicInfo>);

  const trimmedValue = String(value || "").trim();

  setErrors((prev) => {
    const next = { ...prev };

    if (field === "email") {
      if (trimmedValue && !isValidEmail(trimmedValue)) {
        next.email = "Enter a valid email address. Example: user@example.com";
      } else {
        delete next.email;
      }

      return next;
    }

    if (field === "licenseNumber") {
      if (trimmedValue && !isValidLicenseNumber(trimmedValue)) {
        next.licenseNumber =
          "Enter valid license number. Format: CH03 78678555785";
      } else {
        delete next.licenseNumber;
      }

      return next;
    }

    if (field === "aadharNumber") {
      if (trimmedValue && !/^[0-9]+$/.test(trimmedValue)) {
        next.aadharNumber = "Only numbers are allowed";
      } else if (trimmedValue && !isValidAadharNumber(trimmedValue)) {
        next.aadharNumber =
          "Enter valid Aadhar number. It must be 12 digits and cannot start with 0 or 1";
      } else {
        delete next.aadharNumber;
      }

      return next;
    }

    if (field === "panNumber") {
      if (trimmedValue && !isValidPanNumber(trimmedValue)) {
        next.panNumber = "Enter valid PAN number. Format: CNFPC5441D";
      } else {
        delete next.panNumber;
      }

      return next;
    }

  if (field === "voterId") {
  if (trimmedValue && !isValidVoterIdNumber(trimmedValue)) {
    next.voterId = "Enter valid Voter ID. Format: ABC1234567";
  } else {
    delete next.voterId;
  }

  return next;
}

    return next;
  });
}
  function validate() {
    const e: Record<string, string> = {};
    if (!values.vendorId) e.vendorId = "Choose Vendor is required";
    if (!values.vehicleTypeId) e.vehicleTypeId = "Choose Vehicle Type is required";
      if (!values.driverName?.trim()) e.driverName = "Driver Name is required";

    const primaryMobile = String(values.primaryMobile || "").trim();
    const alternativeMobile = String(values.alternativeMobile || "").trim();
    const whatsappMobile = String(values.whatsappMobile || "").trim();

    if (!primaryMobile) {
      e.primaryMobile = "Primary Mobile Number is required";
    } else if (!/^[0-9]+$/.test(primaryMobile)) {
      e.primaryMobile = "Only numbers are allowed";
    } else if (!isValidIndianMobile(primaryMobile)) {
      e.primaryMobile =
        "Mobile number must be 10 digits and start with 6, 7, 8, or 9";
    }

    if (alternativeMobile && !/^[0-9]+$/.test(alternativeMobile)) {
      e.alternativeMobile = "Only numbers are allowed";
    } else if (alternativeMobile && !isValidIndianMobile(alternativeMobile)) {
      e.alternativeMobile =
        "Mobile number must be 10 digits and start with 6, 7, 8, or 9";
    }
    if (whatsappMobile && !/^[0-9]+$/.test(whatsappMobile)) {
      e.whatsappMobile = "Only numbers are allowed";
    } else if (whatsappMobile && !isValidIndianMobile(whatsappMobile)) {
      e.whatsappMobile =
        "Mobile number must be 10 digits and start with 6, 7, 8, or 9";
    }
const email = String(values.email || "").trim();
const licenseNumber = String(values.licenseNumber || "").trim();
const aadharNumber = String(values.aadharNumber || "").trim();
const panNumber = String(values.panNumber || "").trim().toUpperCase();
const voterId = String(values.voterId || "").trim().toUpperCase();

if (email && !isValidEmail(email)) {
  e.email = "Enter a valid email address. Example: user@example.com";
}

if (licenseNumber && !isValidLicenseNumber(licenseNumber)) {
  e.licenseNumber =
    "Enter valid license number. Format: CH03 78678555785";
}

if (aadharNumber && !/^[0-9]+$/.test(aadharNumber)) {
  e.aadharNumber = "Only numbers are allowed";
} else if (aadharNumber && !isValidAadharNumber(aadharNumber)) {
  e.aadharNumber =
    "Enter valid Aadhar number. It must be 12 digits and cannot start with 0 or 1";
}

if (panNumber && !isValidPanNumber(panNumber)) {
  e.panNumber = "Enter valid PAN number. Format: CNFPC5441D";
}

if (voterId && !isValidVoterIdNumber(voterId)) {
  e.voterId = "Enter valid Voter ID. Format: ABC1234567";
}

setErrors(e);
    const firstKey = Object.keys(e)[0];
    if (firstKey) {
      const el = refs.current[firstKey];
      el?.focus?.();
      el?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      return false;
    }
    return true;
  }

  function handleSave() {
    if (!validate()) return;
    onSaveContinue();
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
          {/* Row 1 */}
          <div>
            <Label className="text-sm text-gray-700">
              Choose Vendor<RequiredStar />
            </Label>
            <div className="mt-2">
              <Select
                value={values.vendorId ? String(values.vendorId) : ""}
                onValueChange={(v) => onChange({ vendorId: v })}
              >
                <SelectTrigger className={errors.vendorId ? "border-red-500" : ""}>
                  <SelectValue placeholder="Choose Vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendorItems.map((o) => (
                    <SelectItem key={String(o.id)} value={String(o.id)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError msg={errors.vendorId} />
            </div>
          </div>

          <div>
            <Label className="text-sm text-gray-700">
              Choose Vehicle Type<RequiredStar />
            </Label>
            <div className="mt-2">
              <Select
                value={values.vehicleTypeId ? String(values.vehicleTypeId) : ""}
                onValueChange={(v) => onChange({ vehicleTypeId: v })}
              >
                <SelectTrigger className={errors.vehicleTypeId ? "border-red-500" : ""}>
                  <SelectValue placeholder="Choose Vehicle Type" />
                </SelectTrigger>
                <SelectContent>
                  {vehicleTypeItems.map((o) => (
                    <SelectItem key={String(o.id)} value={String(o.id)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError msg={errors.vehicleTypeId} />
            </div>
          </div>

          <div>
            <Label className="text-sm text-gray-700" htmlFor="driverName">
              Driver Name<RequiredStar />
            </Label>
            <Input
              id="driverName"
              className={["mt-2 h-11", errors.driverName ? "border-red-500" : ""].join(" ")}
              placeholder="Driver Name"
              value={values.driverName || ""}
              onChange={(e) => onChange({ driverName: e.target.value })}
              ref={(el) => (refs.current.driverName = el)}
            />
            <FieldError msg={errors.driverName} />
          </div>

          {/* Row 2 */}
          <div>
            <Label className="text-sm text-gray-700" htmlFor="primaryMobile">
              Primary Mobile Number<RequiredStar />
            </Label>
                       <Input
              id="primaryMobile"
              className={["mt-2 h-11", errors.primaryMobile ? "border-red-500" : ""].join(" ")}
              placeholder="Primary Mobile Number"
              value={values.primaryMobile || ""}
              maxLength={10}
              onChange={(e) => handleMobileChange("primaryMobile", e.target.value)}
              ref={(el) => (refs.current.primaryMobile = el)}
            />
            <FieldError msg={errors.primaryMobile} />
          </div>

          <div>
            <Label className="text-sm text-gray-700" htmlFor="alternativeMobile">
              Alternative Mobile Number
            </Label>
                       <Input
              id="alternativeMobile"
              className={["mt-2 h-11", errors.alternativeMobile ? "border-red-500" : ""].join(" ")}
              placeholder="Alternative Mobile Number"
              value={values.alternativeMobile || ""}
              maxLength={10}
              onChange={(e) => handleMobileChange("alternativeMobile", e.target.value)}
              ref={(el) => (refs.current.alternativeMobile = el)}
            />
            <FieldError msg={errors.alternativeMobile} />
          </div>

          <div>
            <Label className="text-sm text-gray-700" htmlFor="whatsappMobile">
              Whatsapp Mobile Number
            </Label>
                        <Input
                        id="whatsappMobile"
                        className={["mt-2 h-11", errors.whatsappMobile ? "border-red-500" : ""].join(" ")}
                        placeholder="Whatsapp Mobile Number"
                        value={values.whatsappMobile || ""}
                        maxLength={10}
                        onChange={(e) => handleMobileChange("whatsappMobile", e.target.value)}
                        ref={(el) => (refs.current.whatsappMobile = el)}
                      />
            <FieldError msg={errors.whatsappMobile} />
          </div>

          {/* Row 3 */}
          <div>
            <Label className="text-sm text-gray-700" htmlFor="email">
              Email ID
            </Label>
              <Input
              id="email"
              className={["mt-2 h-11", errors.email ? "border-red-500" : ""].join(" ")}
              placeholder="Email ID"
              value={values.email || ""}
              onChange={(e) => handleTextValidationChange("email", e.target.value)}
              ref={(el) => (refs.current.email = el)}
            />
            <FieldError msg={errors.email} />
          </div>

          <div>
            <Label className="text-sm text-gray-700" htmlFor="licenseNumber">
              License Number
            </Label>
                       <Input
              id="licenseNumber"
              className={["mt-2 h-11", errors.licenseNumber ? "border-red-500" : ""].join(" ")}
              placeholder="License Number"
              value={values.licenseNumber || ""}
              onChange={(e) => handleTextValidationChange("licenseNumber", e.target.value.toUpperCase())}
              ref={(el) => (refs.current.licenseNumber = el)}
            />
            <FieldError msg={errors.licenseNumber} />
            <p className="mt-2 text-sm font-semibold text-slate-800">
              License Number Format: CH03 78678555785
            </p>
          </div>

         <DatePicker
  label="License Issue Date"
  inputId="licenseIssueDate"
  valueISO={values.licenseIssueDate}
  onChangeISO={(iso) => onChange({ licenseIssueDate: iso })}
  error={errors.licenseIssueDate}
  allowManualInput
  fromYear={1940}
  toYear={new Date().getFullYear() + 20}
  defaultMonth={new Date()}
/>
          {/* Row 4 */}
          <DatePicker
  label="License Expire Date"
  inputId="licenseExpireDate"
  valueISO={values.licenseExpireDate}
  onChangeISO={(iso) => onChange({ licenseExpireDate: iso })}
  error={errors.licenseExpireDate}
  allowManualInput
  fromYear={1940}
  toYear={new Date().getFullYear() + 30}
  defaultMonth={new Date()}
/>

    <DatePicker
  label="Date of Birth"
  inputId="dateOfBirth"
  valueISO={values.dateOfBirth}
  onChangeISO={(iso) => onChange({ dateOfBirth: iso })}
  error={errors.dateOfBirth}
  allowManualInput
  fromYear={1940}
  toYear={new Date().getFullYear()}
  defaultMonth={new Date(1990, 0, 1)}
/>

          <div>
            <Label className="text-sm text-gray-700">Blood Group</Label>
            <div className="mt-2">
              <Select
                value={values.bloodGroup || ""}
                onValueChange={(v) => onChange({ bloodGroup: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose Blood Group" />
                </SelectTrigger>
                <SelectContent>
                  {bloodGroups.map((o) => (
                    <SelectItem key={String(o.id)} value={String(o.id)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 5 */}
          <div>
            <Label className="text-sm text-gray-700">Gender</Label>
            <div className="mt-2">
              <Select
                value={values.gender || ""}
                onValueChange={(v) => onChange({ gender: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose Gender" />
                </SelectTrigger>
                <SelectContent>
                  {genders.map((o) => (
                    <SelectItem key={String(o.id)} value={String(o.id)}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm text-gray-700" htmlFor="aadharNumber">
              Aadhar Card Number
            </Label>
           <Input
  id="aadharNumber"
  className={["mt-2 h-11", errors.aadharNumber ? "border-red-500" : ""].join(" ")}
  placeholder="Aadhar Card Number"
  value={values.aadharNumber || ""}
  maxLength={12}
  onChange={(e) =>
    handleTextValidationChange(
      "aadharNumber",
      e.target.value.replace(/\D/g, ""),
    )
  }
/>
<FieldError msg={errors.aadharNumber} />
<p className="mt-2 text-sm font-semibold text-slate-800">
  Aadhar Number Format: 246884637988
</p>
          </div>

          <div>
            <Label className="text-sm text-gray-700" htmlFor="panNumber">
              PAN Card Number
            </Label>
           <Input
  id="panNumber"
  className={["mt-2 h-11", errors.panNumber ? "border-red-500" : ""].join(" ")}
  placeholder="PAN Card Number"
  value={values.panNumber || ""}
  maxLength={10}
  onChange={(e) =>
    handleTextValidationChange("panNumber", e.target.value.toUpperCase())
  }
/>
<FieldError msg={errors.panNumber} />
<p className="mt-2 text-sm font-semibold text-slate-800">
  Pan Format: CNFPC5441D
</p>
          </div>

          {/* Row 6 */}
          <div>
            <Label className="text-sm text-gray-700" htmlFor="voterId">
              Voter ID Number
            </Label>
<Input
  id="voterId"
  className={["mt-2 h-11", errors.voterId ? "border-red-500" : ""].join(" ")}
  placeholder="Voter ID Number"
  value={values.voterId || ""}
  maxLength={10}
  onChange={(e) =>
    handleTextValidationChange("voterId", e.target.value.toUpperCase())
  }
/>
<FieldError msg={errors.voterId} />
          </div>

          <div>
            <Label className="text-sm text-gray-700" htmlFor="profileFile">
              Upload Profile
            </Label>
            <Input
              id="profileFile"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              className="mt-2 h-11"
              onChange={(e) => onChange({ profileFile: e.target.files?.[0] ?? null })}
              ref={(el) => (refs.current.profileFile = el)}
            />
            {profilePreviewUrl ? (
              <div className="mt-3">
                <div className="text-xs text-gray-500 mb-1">Profile Preview</div>
                <img
                  src={profilePreviewUrl}
                  alt="Driver profile preview"
                  className="h-20 w-20 rounded-md border object-cover"
                />
              </div>
            ) : null}
          </div>

          <div>
            <Label className="text-sm text-gray-700" htmlFor="address">
              Address
            </Label>
            <Textarea
              id="address"
              className="mt-2 min-h-[90px]"
              placeholder="Address"
              value={values.address || ""}
              onChange={(e) => onChange({ address: e.target.value })}
              ref={(el) => (refs.current.address = el)}
            />
          </div>
        </div>

        {/* Footer buttons (same placement as screenshot) */}
        <div className="mt-8 flex items-center justify-between">
          <Button
            type="button"
            variant="secondary"
            className="h-11 px-10 bg-gray-300 text-white hover:bg-gray-400"
            onClick={onBack}
          >
            Back
          </Button>

          <Button
            type="button"
            className="h-11 px-10 bg-gradient-to-r from-violet-600 to-pink-500 text-white hover:opacity-95"
            onClick={handleSave}
            disabled={saving}
          >
            Save &amp; Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
