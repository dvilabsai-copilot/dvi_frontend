// FILE: src/pages/vendor/steps/VendorStepBasicInfo.tsx

import React from "react";
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
              className={fieldErrors.email ? inputErrorClass : ""}
              value={basicInfo.email}
              onChange={(e) => {
                setBasicInfo((p) => ({ ...p, email: e.target.value }));
                onClearFieldError?.("email");
              }}
              placeholder="Email ID"
            />
            {fieldErrors.email ? <p className="text-xs text-red-600">{fieldErrors.email}</p> : null}
          </div>
          <div>
            <Label>Primary Mobile Number *</Label>
            <Input
              className={fieldErrors.primaryMobile ? inputErrorClass : ""}
              value={basicInfo.primaryMobile}
              onChange={(e) => {
                setBasicInfo((p) => ({ ...p, primaryMobile: e.target.value }));
                onClearFieldError?.("primaryMobile");
              }}
              placeholder="Primary Mobile Number"
            />
            {fieldErrors.primaryMobile ? <p className="text-xs text-red-600">{fieldErrors.primaryMobile}</p> : null}
          </div>
          <div>
            <Label>Alternative Mobile Number *</Label>
            <Input
              className={fieldErrors.altMobile ? inputErrorClass : ""}
              value={basicInfo.altMobile}
              onChange={(e) => {
                setBasicInfo((p) => ({ ...p, altMobile: e.target.value }));
                onClearFieldError?.("altMobile");
              }}
              placeholder="Alternative Mobile Number"
            />
            {fieldErrors.altMobile ? <p className="text-xs text-red-600">{fieldErrors.altMobile}</p> : null}
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
              className={fieldErrors.pincode ? inputErrorClass : ""}
              value={basicInfo.pincode}
              onChange={(e) => {
                setBasicInfo((p) => ({ ...p, pincode: e.target.value }));
                onClearFieldError?.("pincode");
              }}
              placeholder="Pincode"
            />
            {fieldErrors.pincode ? <p className="text-xs text-red-600">{fieldErrors.pincode}</p> : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <Label>Other Number</Label>
            <Input
              value={basicInfo.otherNumber}
              onChange={(e) =>
                setBasicInfo((p) => ({ ...p, otherNumber: e.target.value }))
              }
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
                setBasicInfo((p) => ({ ...p, marginPercent: e.target.value }));
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
                className={fieldErrors.invoicePincode ? inputErrorClass : ""}
                value={basicInfo.invoicePincode}
                onChange={(e) => {
                  setBasicInfo((p) => ({
                    ...p,
                    invoicePincode: e.target.value,
                  }));
                  onClearFieldError?.("invoicePincode");
                }}
                placeholder="Pincode"
              />
              {fieldErrors.invoicePincode ? <p className="text-xs text-red-600">{fieldErrors.invoicePincode}</p> : null}
            </div>
          </div>

          {/* Row 2: GSTIN, PAN, Contact No. */}
          <div className="grid gap-4 md:grid-cols-3 mt-4">
            <div>
              <Label>GSTIN Number *</Label>
              <Input
                className={fieldErrors.invoiceGstin ? inputErrorClass : ""}
                value={basicInfo.invoiceGstin}
                onChange={(e) => {
                  setBasicInfo((p) => ({
                    ...p,
                    invoiceGstin: e.target.value,
                  }));
                  onClearFieldError?.("invoiceGstin");
                }}
                placeholder="GSTIN FORMAT: 10AABCU9603R1Z5"
              />
              {fieldErrors.invoiceGstin ? <p className="text-xs text-red-600">{fieldErrors.invoiceGstin}</p> : null}
            </div>
            <div>
              <Label>PAN Number *</Label>
              <Input
                className={fieldErrors.invoicePan ? inputErrorClass : ""}
                value={(basicInfo as any).invoicePan ?? ""}
                onChange={(e) => {
                  setBasicInfo((p) =>
                    ({
                      ...(p as any),
                      invoicePan: e.target.value,
                    } as BasicInfoForm)
                  );
                  onClearFieldError?.("invoicePan");
                }}
                placeholder="PAN Format: CNFPC5441D"
              />
              {fieldErrors.invoicePan ? <p className="text-xs text-red-600">{fieldErrors.invoicePan}</p> : null}
            </div>
            <div>
              <Label>Contact No. *</Label>
              <Input
                className={fieldErrors.invoiceContactNo ? inputErrorClass : ""}
                value={basicInfo.invoiceContactNo}
                onChange={(e) => {
                  setBasicInfo((p) => ({
                    ...p,
                    invoiceContactNo: e.target.value,
                  }));
                  onClearFieldError?.("invoiceContactNo");
                }}
                placeholder="Contact No."
              />
              {fieldErrors.invoiceContactNo ? <p className="text-xs text-red-600">{fieldErrors.invoiceContactNo}</p> : null}
            </div>
          </div>

          {/* Row 3: Email + Logo */}
          <div className="grid gap-4 md:grid-cols-3 mt-4">
            <div>
              <Label>Email ID *</Label>
              <Input
                type="email"
                className={fieldErrors.invoiceEmail ? inputErrorClass : ""}
                value={basicInfo.invoiceEmail}
                onChange={(e) => {
                  setBasicInfo((p) => ({
                    ...p,
                    invoiceEmail: e.target.value,
                  }));
                  onClearFieldError?.("invoiceEmail");
                }}
                placeholder="Company Email ID"
              />
              {fieldErrors.invoiceEmail ? <p className="text-xs text-red-600">{fieldErrors.invoiceEmail}</p> : null}
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
