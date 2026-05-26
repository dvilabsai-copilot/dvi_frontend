// FILE: src/pages/vendor/steps/VendorStepBasicInfo.tsx

import React, { useState } from "react";
import { BasicInfoForm, Option } from "../vendorFormTypes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type Props = {
  basicInfo: BasicInfoForm;
  setBasicInfo: React.Dispatch<React.SetStateAction<BasicInfoForm>>;
  countryOptions: Option[];
  stateOptions: Option[];
  cityOptions: Option[];
  roleOptions: Option[];
  gstTypeOptions: Option[];
  gstPercentOptions: Option[];
  saving: boolean;
  isEdit: boolean;
  fieldErrors?: Partial<Record<keyof BasicInfoForm, string>>;
  onClearFieldError?: (field: keyof BasicInfoForm) => void;
  onBack: () => void;
  onSaveAndNext: () => void;
};

export const VendorStepBasicInfo: React.FC<Props> = ({
  basicInfo,
  setBasicInfo,
  countryOptions,
  stateOptions,
  cityOptions,
  roleOptions,
  gstTypeOptions,
  gstPercentOptions,
  saving,
  isEdit,
  fieldErrors = {},
  onClearFieldError,
  onBack,
  onSaveAndNext,
}) => {
  const inputErrorClass = "border-red-400 focus-visible:ring-red-300";
  const [liveErrors, setLiveErrors] = useState<Partial<Record<keyof BasicInfoForm, string>>>({});

  const errors = {
    ...fieldErrors,
    ...liveErrors,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-pink-600">Basic Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <Label>Vendor Name *</Label>
            <Input
              className={fieldErrors.vendorName ? inputErrorClass : ""}
              value={basicInfo.vendorName}
              onChange={(e) => {
                setBasicInfo((p) => ({ ...p, vendorName: e.target.value }));
                onClearFieldError?.("vendorName");
              }}
              placeholder="Vendor Name"
            />
            {fieldErrors.vendorName ? <p className="text-xs text-red-600">{fieldErrors.vendorName}</p> : null}
          </div>
          <div>
            <Label>Email ID *</Label>
            <Input
              type="email"
            className={errors.email ? inputErrorClass : ""}
value={basicInfo.email}
onChange={(e) => {
  const value = e.target.value;

  setBasicInfo((p) => ({ ...p, email: value }));

  setLiveErrors((p) => ({
    ...p,
    email: !value.trim()
      ? "This value is required."
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ? "Please enter a valid email address."
        : "",
  }));
}}
              placeholder="Email ID"
            />
            {errors.email ? <p className="text-xs text-red-600">{errors.email}</p> : null}
          </div>
          <div>
            <Label>Primary Mobile Number *</Label>
            <Input
              className={errors.primaryMobile ? inputErrorClass : ""}
              value={basicInfo.primaryMobile}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 10);

              setLiveErrors((p) => ({
                ...p,
                primaryMobile:
                  /^[6-9]\d{9}$/.test(value)
                    ? ""
                    : "Primary mobile number must be 10 digits and start with 6, 7, 8, or 9.",
              }));
               setBasicInfo((p) => ({ ...p, primaryMobile: value }));
                onClearFieldError?.("primaryMobile");
              }}
              placeholder="Primary Mobile Number"
            />
            {errors.primaryMobile ? <p className="text-xs text-red-600">{errors.primaryMobile}</p> : null}
          </div>
          <div>
            <Label>Alternative Mobile Number *</Label>
            <Input
              className={errors.altMobile ? inputErrorClass : ""}
              value={basicInfo.altMobile}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 10);

setLiveErrors((p) => ({
  ...p,
  altMobile:
    /^[6-9]\d{9}$/.test(value)
      ? ""
      : "Alternative mobile number must be 10 digits and start with 6, 7, 8, or 9.",
}));
                setBasicInfo((p) => ({ ...p, altMobile: value }));
                onClearFieldError?.("altMobile");
              }}
              placeholder="Alternative Mobile Number"
            />
            {errors.altMobile ? <p className="text-xs text-red-600">{errors.altMobile}</p> : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <Label>Country *</Label>
            <Select
              value={basicInfo.countryId}
              onValueChange={(val) => {
                setBasicInfo((p) => ({ ...p, countryId: val, stateId: "", cityId: "" }));
                onClearFieldError?.("countryId");
              }}
            >
              <SelectTrigger className={fieldErrors.countryId ? inputErrorClass : ""}>
                <SelectValue placeholder="Choose Country" />
              </SelectTrigger>
              <SelectContent>
                {countryOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.countryId ? <p className="text-xs text-red-600">{fieldErrors.countryId}</p> : null}
          </div>
          <div>
            <Label>State *</Label>
            <Select
              value={basicInfo.stateId}
              onValueChange={(val) => {
                setBasicInfo((p) => ({ ...p, stateId: val, cityId: "" }));
                onClearFieldError?.("stateId");
              }}
            >
              <SelectTrigger className={fieldErrors.stateId ? inputErrorClass : ""}>
                <SelectValue placeholder="Choose State" />
              </SelectTrigger>
              <SelectContent>
                {stateOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.stateId ? <p className="text-xs text-red-600">{fieldErrors.stateId}</p> : null}
          </div>
          <div>
            <Label>City *</Label>
            <Select
              value={basicInfo.cityId}
              onValueChange={(val) => {
                setBasicInfo((p) => ({ ...p, cityId: val }));
                onClearFieldError?.("cityId");
              }}
            >
              <SelectTrigger className={fieldErrors.cityId ? inputErrorClass : ""}>
                <SelectValue placeholder="Choose City" />
              </SelectTrigger>
              <SelectContent>
                {cityOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.cityId ? <p className="text-xs text-red-600">{fieldErrors.cityId}</p> : null}
          </div>
          <div>
            <Label>Pincode *</Label>
            <Input
              className={errors.pincode ? inputErrorClass : ""}
value={basicInfo.pincode}
onChange={(e) => {
  const value = e.target.value.replace(/\D/g, "").slice(0, 6);

  setBasicInfo((p) => ({ ...p, pincode: value }));

  setLiveErrors((p) => ({
    ...p,
    pincode: /^[1-9]\d{5}$/.test(value)
      ? ""
      : "Pincode must be 6 digits and cannot start with 0.",
  }));

  onClearFieldError?.("pincode");
}}
placeholder="Pincode"
            />
            {errors.pincode ? <p className="text-xs text-red-600">{errors.pincode}</p> : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <Label>Other Number</Label>
            <Input
              value={basicInfo.otherNumber}
              onChange={(e) =>{
                const value = e.target.value.replace(/\D/g, "");
                 setBasicInfo((p) => ({ ...p, otherNumber: value }));
              }}
              placeholder="Other Number"
            />
          </div>
          <div>
            <Label>Username *</Label>
            <Input
              className={fieldErrors.username ? inputErrorClass : ""}
              value={basicInfo.username}
              onChange={(e) => {
                setBasicInfo((p) => ({ ...p, username: e.target.value }));
                onClearFieldError?.("username");
              }}
              placeholder="Username"
            />
            {fieldErrors.username ? <p className="text-xs text-red-600">{fieldErrors.username}</p> : null}
          </div>
          <div>
            <Label>Password {isEdit ? "(leave blank to keep)" : "*"}</Label>
            <Input
              type="password"
              className={fieldErrors.password ? inputErrorClass : ""}
              value={basicInfo.password}
              onChange={(e) => {
                setBasicInfo((p) => ({ ...p, password: e.target.value }));
                onClearFieldError?.("password");
              }}
              placeholder="Password"
            />
            {fieldErrors.password ? <p className="text-xs text-red-600">{fieldErrors.password}</p> : null}
          </div>
          <div>
            <Label>Role *</Label>
            <Select
              value={basicInfo.roleId}
              onValueChange={(val) => {
                setBasicInfo((p) => ({ ...p, roleId: val }));
                onClearFieldError?.("roleId");
              }}
            >
              <SelectTrigger className={fieldErrors.roleId ? inputErrorClass : ""}>
                <SelectValue placeholder="Choose Role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.roleId ? <p className="text-xs text-red-600">{fieldErrors.roleId}</p> : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Vendor Margin % *</Label>
            <Input
              className={fieldErrors.marginPercent ? inputErrorClass : ""}
              value={basicInfo.marginPercent}
              onChange={(e) => {
                const value = e.target.value;

if (/^\d{0,3}(\.\d{0,2})?$/.test(value) && Number(value || 0) <= 100) {
  setBasicInfo((p) => ({ ...p, marginPercent: value }));
}
                onClearFieldError?.("marginPercent");
              }}
              placeholder="Vendor Margin"
            />
            {fieldErrors.marginPercent ? <p className="text-xs text-red-600">{fieldErrors.marginPercent}</p> : null}
          </div>
          <div>
            <Label>Vendor Margin GST Type *</Label>
            <Select
              value={basicInfo.marginGstType}
              onValueChange={(val) => {
                setBasicInfo((p) => ({ ...p, marginGstType: val }));
                onClearFieldError?.("marginGstType");
              }}
            >
              <SelectTrigger className={fieldErrors.marginGstType ? inputErrorClass : ""}>
                <SelectValue placeholder="Included / Excluded" />
              </SelectTrigger>
              <SelectContent>
                {gstTypeOptions.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.marginGstType ? <p className="text-xs text-red-600">{fieldErrors.marginGstType}</p> : null}
          </div>
          <div>
            <Label>Vendor Margin GST Percentage *</Label>
            <Select
              value={basicInfo.marginGstPercent}
              onValueChange={(val) => {
                setBasicInfo((p) => ({ ...p, marginGstPercent: val }));
                onClearFieldError?.("marginGstPercent");
              }}
            >
              <SelectTrigger className={fieldErrors.marginGstPercent ? inputErrorClass : ""}>
                <SelectValue placeholder="Choose GST %" />
              </SelectTrigger>
              <SelectContent>
                {gstPercentOptions.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.marginGstPercent ? <p className="text-xs text-red-600">{fieldErrors.marginGstPercent}</p> : null}
          </div>
        </div>

        <div>
          <Label>Address *</Label>
          <Textarea
            className={fieldErrors.address ? inputErrorClass : ""}
            value={basicInfo.address}
            onChange={(e) => {
              setBasicInfo((p) => ({ ...p, address: e.target.value }));
              onClearFieldError?.("address");
            }}
            placeholder="Address"
          />
          {fieldErrors.address ? <p className="text-xs text-red-600 mt-1">{fieldErrors.address}</p> : null}
        </div>

        <div className="border-t pt-6 mt-4">
          <h3 className="mb-4 text-lg font-semibold text-pink-600">
            Invoice Details
          </h3>

          {/* Row 1: Company Name, Address, Pincode */}
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Company Name *</Label>
              <Input
                className={fieldErrors.invoiceCompanyName ? inputErrorClass : ""}
                value={basicInfo.invoiceCompanyName}
                onChange={(e) => {
                  setBasicInfo((p) => ({
                    ...p,
                    invoiceCompanyName: e.target.value,
                  }));
                  onClearFieldError?.("invoiceCompanyName");
                }}
                placeholder="Company Name"
              />
              {fieldErrors.invoiceCompanyName ? <p className="text-xs text-red-600">{fieldErrors.invoiceCompanyName}</p> : null}
            </div>
            <div>
              <Label>Address *</Label>
              <Input
                className={fieldErrors.invoiceAddress ? inputErrorClass : ""}
                value={basicInfo.invoiceAddress}
                onChange={(e) => {
                  setBasicInfo((p) => ({
                    ...p,
                    invoiceAddress: e.target.value,
                  }));
                  onClearFieldError?.("invoiceAddress");
                }}
                placeholder="Address"
              />
              {fieldErrors.invoiceAddress ? <p className="text-xs text-red-600">{fieldErrors.invoiceAddress}</p> : null}
            </div>
            <div>
              <Label>Pincode *</Label>
              <Input
  className={errors.invoicePincode ? inputErrorClass : ""}
  value={basicInfo.invoicePincode}
  onChange={(e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);

    setBasicInfo((p) => ({
      ...p,
      invoicePincode: value,
    }));

    setLiveErrors((p) => ({
      ...p,
      invoicePincode: /^[1-9]\d{5}$/.test(value)
        ? ""
        : "Pincode must be 6 digits and cannot start with 0.",
    }));

    onClearFieldError?.("invoicePincode");
  }}
  placeholder="Pincode"
/>
{errors.invoicePincode ? <p className="text-xs text-red-600">{errors.invoicePincode}</p> : null}
            </div>
          </div>

          {/* Row 2: GSTIN, PAN, Contact No. */}
          <div className="grid gap-4 md:grid-cols-3 mt-4">
            <div>
              <Label>GSTIN Number *</Label>
              <Input
  className={errors.invoiceGstin ? inputErrorClass : ""}
  value={basicInfo.invoiceGstin}
  onChange={(e) => {
    const value = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15);

    setBasicInfo((p) => ({
      ...p,
      invoiceGstin: value,
    }));

    setLiveErrors((p) => ({
      ...p,
      invoiceGstin: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value)
        ? ""
        : "Please enter a valid GSTIN number.",
    }));

    onClearFieldError?.("invoiceGstin");
  }}
  placeholder="GSTIN FORMAT: 10AABCU9603R1Z5"
/>
{errors.invoiceGstin ? <p className="text-xs text-red-600">{errors.invoiceGstin}</p> : null}
            </div>
            <div>
              <Label>PAN Number *</Label>
             <Input
  className={errors.invoicePan ? inputErrorClass : ""}
  value={basicInfo.invoicePan ?? ""}
onChange={(e) => {
  const value = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 10);

  setBasicInfo((p) => ({
    ...p,
    invoicePan: value,
  }));

    setLiveErrors((p) => ({
      ...p,
      invoicePan: /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value)
        ? ""
        : "Please enter a valid PAN number.",
    }));

    onClearFieldError?.("invoicePan");
  }}
  placeholder="PAN Format: CNFPC5441D"
/>
{errors.invoicePan ? <p className="text-xs text-red-600">{errors.invoicePan}</p> : null}
            </div>
            <div>
              <Label>Contact No. *</Label>
              <Input
  className={errors.invoiceContactNo ? inputErrorClass : ""}
  value={basicInfo.invoiceContactNo}
  onChange={(e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10);

    setBasicInfo((p) => ({
      ...p,
      invoiceContactNo: value,
    }));

    setLiveErrors((p) => ({
      ...p,
      invoiceContactNo: /^[6-9]\d{9}$/.test(value)
        ? ""
        : "Contact number must be 10 digits and start with 6, 7, 8, or 9.",
    }));

    onClearFieldError?.("invoiceContactNo");
  }}
  placeholder="Contact No."
/>
{errors.invoiceContactNo ? <p className="text-xs text-red-600">{errors.invoiceContactNo}</p> : null}
            </div>
          </div>

          {/* Row 3: Email + Logo */}
          <div className="grid gap-4 md:grid-cols-3 mt-4">
            <div>
              <Label>Email ID *</Label>
              <Input
  type="email"
  className={errors.invoiceEmail ? inputErrorClass : ""}
  value={basicInfo.invoiceEmail}
  onChange={(e) => {
    const value = e.target.value;

    setBasicInfo((p) => ({
      ...p,
      invoiceEmail: value,
    }));

    setLiveErrors((p) => ({
      ...p,
      invoiceEmail: !value.trim()
        ? "This value is required."
        : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
          ? "Please enter a valid email address."
          : "",
    }));

    onClearFieldError?.("invoiceEmail");
  }}
  placeholder="Company Email ID"
/>
{errors.invoiceEmail ? <p className="text-xs text-red-600">{errors.invoiceEmail}</p> : null}
            </div>
            <div>
              <Label>Logo</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setBasicInfo((p) =>
                    ({
                      ...(p as any),
                      invoiceLogoFile: file,
                    } as BasicInfoForm)
                  );
                }}
              />
              {(basicInfo as any).invoiceLogoFile && (
                <p className="mt-1 text-xs text-gray-500">
                  {(basicInfo as any).invoiceLogoFile.name}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-between">
          <Button variant="outline" type="button" onClick={onBack}>
            Back
          </Button>
          <Button type="button" onClick={onSaveAndNext} disabled={saving}>
            update &amp; Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
