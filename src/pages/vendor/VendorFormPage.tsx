// REPLACE-WHOLE-FILE: src/pages/vendor/VendorFormPage.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { BasicInfoForm, BranchForm, Option } from "./vendorFormTypes";
import { VendorStepBasicInfo } from "./steps/VendorStepBasicInfo";
import { VendorStepBranch } from "./steps/VendorStepBranch";
import { VendorStepVehicleTypeCost } from "./steps/VendorStepVehicleTypeCost";
import { VendorStepVehicle } from "./steps/VendorStepVehicle";
import { VendorStepVehiclePricebook } from "./steps/VendorStepVehiclePricebook";
import { VendorStepPermitCost } from "./steps/VendorStepPermitCost";

const steps = [
  "Basic Info",
  "Branch",
  "Vehicle Type (Driver Cost)",
  "Vehicle",
  "Vehicle Pricebook",
  "Permit Cost",
];

const emptyBasicInfo: BasicInfoForm = {
  vendorName: "",
  email: "",
  primaryMobile: "",
  altMobile: "",
  otherNumber: "",
  countryId: "",
  stateId: "",
  cityId: "",
  pincode: "",
  username: "",
  password: "",
  roleId: "",
  marginPercent: "",
  marginGstType: "included",
  marginGstPercent: "",
  address: "",
  invoiceCompanyName: "",
  invoiceAddress: "",
  invoicePincode: "",
  invoiceGstin: "",
  invoicePan: "",
  invoiceContactNo: "",
  invoiceEmail: "",
};

const emptyBranch: BranchForm = {
  name: "",
  location: "",
  email: "",
  primaryMobile: "",
  altMobile: "",
  countryId: "",
  stateId: "",
  cityId: "",
  pincode: "",
  gstType: "included",
  gstPercent: "",
  address: "",
};

type VendorDetailResponse = {
  vendor: any;
  branches: any[];
};

type BasicInfoErrors = Partial<Record<keyof BasicInfoForm, string>>;
type BranchErrors = Record<number, Partial<Record<keyof BranchForm, string>>>;

export default function VendorFormPage() {
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const editingId = params.id ? Number(params.id) : undefined;

  const [activeStep, setActiveStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [vendorId, setVendorId] = useState<number | undefined>(editingId);

  const [basicInfo, setBasicInfo] = useState<BasicInfoForm>(emptyBasicInfo);
  const [branches, setBranches] = useState<BranchForm[]>([emptyBranch]);
  const [basicFieldErrors, setBasicFieldErrors] = useState<BasicInfoErrors>({});
  const [branchFieldErrors, setBranchFieldErrors] = useState<BranchErrors>({});

  // dropdowns
  const [countryOptions, setCountryOptions] = useState<Option[]>([]);
  const [stateOptions, setStateOptions] = useState<Option[]>([]);
  const [cityOptions, setCityOptions] = useState<Option[]>([]);
  const [roleOptions, setRoleOptions] = useState<Option[]>([]);
  const [gstPercentOptions, setGstPercentOptions] = useState<Option[]>([]);

  const gstTypeOptions: Option[] = useMemo(
    () => [
      { id: "included", label: "Included" },
      { id: "excluded", label: "Excluded" },
    ],
    []
  );

  const isEdit = Boolean(editingId);
  const maxEnabledStep = vendorId ? 6 : 1;

  /** ---------- Load static dropdowns (countries, roles, GST %) ---------- */
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [countriesRes, rolesRes, gstPercentsRes] = await Promise.all([
          api("/dropdowns/countries"),
          api("/dropdowns/roles"),
          api("/dropdowns/gst-percents"),
        ]);

        const countriesItems =
          (countriesRes as any)?.items ?? countriesRes ?? [];
        const rolesItems = (rolesRes as any)?.items ?? rolesRes ?? [];
        const gstPercentItems =
          (gstPercentsRes as any)?.items ?? gstPercentsRes ?? [];

        setCountryOptions(
          (countriesItems || []).map((c: any) => ({
            id: String(c.id ?? c.country_id),
            label: c.label ?? c.name ?? c.country_name,
          }))
        );
        setRoleOptions(
          (rolesItems || []).map((r: any) => ({
            id: String(r.id ?? r.role_id),
            label: r.label ?? r.name ?? r.role_name,
          }))
        );
        setGstPercentOptions(
            (gstPercentItems || []).map((g: any) => {
                const value =
                g.value ?? g.gst_value ?? g.gst_percentage ?? g.id ?? "";

                // base number we got from API, e.g. "5", "12", "18", "0"
                const base = String(g.label ?? g.title ?? value ?? "");

                // formatted label: "5 % GST - %5"
                const label = `${base} % GST - %${base}`;

                return {
                id: String(value), // value sent back to API
                label,             // pretty label shown in dropdown
                };
            })
            );
      } catch (e) {
        console.error("Failed to load dropdowns", e);
      }
    };
    fetchDropdowns();
  }, []);

  /** ---------- Dependent dropdowns for Basic Info (state & city) ---------- */
  useEffect(() => {
    if (!basicInfo.countryId) return;
    const fetchStates = async () => {
      try {
        const statesRes = await api(
          `/dropdowns/states?countryId=${basicInfo.countryId}`
        );
        const statesItems = (statesRes as any)?.items ?? statesRes ?? [];
        setStateOptions(
          (statesItems || []).map((s: any) => ({
            id: String(s.id ?? s.state_id),
            label: s.label ?? s.name ?? s.state_name,
          }))
        );
      } catch (e) {
        console.error("Failed to load states", e);
      }
    };
    fetchStates();
  }, [basicInfo.countryId]);

  useEffect(() => {
    if (!basicInfo.stateId) return;
    const fetchCities = async () => {
      try {
        const citiesRes = await api(
          `/dropdowns/cities?stateId=${basicInfo.stateId}`
        );
        const citiesItems = (citiesRes as any)?.items ?? citiesRes ?? [];
        setCityOptions(
          (citiesItems || []).map((c: any) => ({
            id: String(c.id ?? c.city_id),
            label: c.label ?? c.name ?? c.city_name,
          }))
        );
      } catch (e) {
        console.error("Failed to load cities", e);
      }
    };
    fetchCities();
  }, [basicInfo.stateId]);

  /** ---------- Load vendor when editing ---------- */
  useEffect(() => {
    if (!editingId) return;

    const loadVendor = async () => {
      setLoading(true);
      try {
        const data = (await api(
          `/vendors/${editingId}`
        )) as VendorDetailResponse;
        const { vendor, branches: existingBranches } = data;

        setVendorId(vendor.vendor_id);
        setBasicInfo({
          vendorName: vendor.vendor_name ?? "",
          email: vendor.vendor_email ?? "",
          primaryMobile: vendor.vendor_primary_mobile_number ?? "",
          altMobile: vendor.vendor_alternative_mobile_number ?? "",
          otherNumber: vendor.vendor_other_number ?? "",
          countryId: vendor.vendor_country_id
            ? String(vendor.vendor_country_id)
            : "",
          stateId: vendor.vendor_state_id ? String(vendor.vendor_state_id) : "",
          cityId: vendor.vendor_city_id ? String(vendor.vendor_city_id) : "",
          pincode: vendor.vendor_pincode ?? "",
          username: vendor.vendor_username ?? "",
          password: "",
          roleId: vendor.role_id ? String(vendor.role_id) : "",
          marginPercent:
            vendor.vendor_margin_percent != null
              ? String(vendor.vendor_margin_percent)
              : "",
          marginGstType: vendor.vendor_margin_gst_type ?? "included",
          marginGstPercent:
            vendor.vendor_margin_gst_percent != null
              ? String(vendor.vendor_margin_gst_percent)
              : "",
          address: vendor.vendor_address ?? "",
          invoiceCompanyName: vendor.invoice_company_name ?? "",
          invoiceAddress: vendor.invoice_address ?? "",
          invoicePincode: vendor.invoice_pincode ?? "",
          invoiceGstin: vendor.invoice_gstin ?? "",
          invoicePan: vendor.invoice_pan ?? "",
          invoiceContactNo: vendor.invoice_contact_no ?? "",
          invoiceEmail: vendor.invoice_email ?? "",
        });

        const mappedBranches: BranchForm[] =
          existingBranches?.map((b: any) => ({
            id: b.vendor_branch_id,
            name: b.vendor_branch_name ?? b.branch_name ?? "",
            location: b.vendor_branch_location ?? b.branch_location ?? "",
            email: b.vendor_branch_emailid ?? b.branch_email ?? "",
            primaryMobile:
              b.vendor_branch_primary_mobile_number ??
              b.primary_mobile_number ??
              "",
            altMobile:
              b.vendor_branch_alternative_mobile_number ??
              b.alternative_mobile_number ??
              "",
            countryId:
              b.vendor_branch_country != null
                ? String(b.vendor_branch_country)
                : b.country_id != null
                ? String(b.country_id)
                : "",
            stateId:
              b.vendor_branch_state != null
                ? String(b.vendor_branch_state)
                : b.state_id != null
                ? String(b.state_id)
                : "",
            cityId:
              b.vendor_branch_city != null
                ? String(b.vendor_branch_city)
                : b.city_id != null
                ? String(b.city_id)
                : "",
            pincode:
              b.vendor_branch_pincode != null
                ? String(b.vendor_branch_pincode)
                : b.pincode != null
                ? String(b.pincode)
                : "",
            gstType:
              b.vendor_branch_gst_type != null
                ? String(b.vendor_branch_gst_type)
                : b.gst_type ?? "included",
            gstPercent:
              b.vendor_branch_gst != null
                ? String(b.vendor_branch_gst)
                : b.gst_percent != null
                ? String(b.gst_percent)
                : "",
            address: b.vendor_branch_address ?? b.address ?? "",
          })) ?? [];

        setBranches(mappedBranches.length ? mappedBranches : [emptyBranch]);
      } catch (e) {
        console.error("Failed to load vendor", e);
      } finally {
        setLoading(false);
      }
    };

    loadVendor();
  }, [editingId]);

  useEffect(() => {
    if (activeStep !== 1) setBasicFieldErrors({});
    if (activeStep !== 2) setBranchFieldErrors({});
  }, [activeStep]);

  /** ---------- Save handlers (same as earlier single-file version) ---------- */

  const isFilled = (value?: string) => Boolean(String(value ?? "").trim());

  const validateBasicInfo = (): boolean => {
    const errors: BasicInfoErrors = {};

    if (!isFilled(basicInfo.vendorName)) errors.vendorName = "This value is required.";
    if (!isFilled(basicInfo.email)) errors.email = "This value is required.";
    if (!isFilled(basicInfo.primaryMobile)) errors.primaryMobile = "This value is required.";
    if (!isFilled(basicInfo.altMobile)) errors.altMobile = "This value is required.";
    if (!isFilled(basicInfo.countryId)) errors.countryId = "This value is required.";
    if (!isFilled(basicInfo.stateId)) errors.stateId = "This value is required.";
    if (!isFilled(basicInfo.cityId)) errors.cityId = "This value is required.";
    if (!isFilled(basicInfo.pincode)) errors.pincode = "This value is required.";
    if (!isFilled(basicInfo.username)) errors.username = "This value is required.";
    if (!isEdit && !isFilled(basicInfo.password)) errors.password = "This value is required.";
    if (!isFilled(basicInfo.roleId)) errors.roleId = "This value is required.";
    if (!isFilled(basicInfo.marginPercent)) errors.marginPercent = "This value is required.";
    if (!isFilled(basicInfo.marginGstType)) errors.marginGstType = "This value is required.";
    if (!isFilled(basicInfo.marginGstPercent)) errors.marginGstPercent = "This value is required.";
    if (!isFilled(basicInfo.address)) errors.address = "This value is required.";
    if (!isFilled(basicInfo.invoiceCompanyName)) errors.invoiceCompanyName = "This value is required.";
    if (!isFilled(basicInfo.invoiceAddress)) errors.invoiceAddress = "This value is required.";
    if (!isFilled(basicInfo.invoicePincode)) errors.invoicePincode = "This value is required.";
    if (!isFilled(basicInfo.invoiceGstin)) errors.invoiceGstin = "This value is required.";
    if (!isFilled(basicInfo.invoicePan)) errors.invoicePan = "This value is required.";
    if (!isFilled(basicInfo.invoiceContactNo)) errors.invoiceContactNo = "This value is required.";
    if (!isFilled(basicInfo.invoiceEmail)) errors.invoiceEmail = "This value is required.";

    setBasicFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateBranches = (): boolean => {
    const allErrors: BranchErrors = {};

    for (let i = 0; i < branches.length; i += 1) {
      const b = branches[i];
      const errors: Partial<Record<keyof BranchForm, string>> = {};

      if (!isFilled(b.name)) errors.name = "This value is required.";
      if (!isFilled(b.location)) errors.location = "This value is required.";
      if (!isFilled(b.email)) errors.email = "This value is required.";
      if (!isFilled(b.primaryMobile)) errors.primaryMobile = "This value is required.";
      if (!isFilled(b.altMobile)) errors.altMobile = "This value is required.";
      if (!isFilled(b.countryId)) errors.countryId = "This value is required.";
      if (!isFilled(b.stateId)) errors.stateId = "This value is required.";
      if (!isFilled(b.cityId)) errors.cityId = "This value is required.";
      if (!isFilled(b.pincode)) errors.pincode = "This value is required.";
      if (!isFilled(b.gstType)) errors.gstType = "This value is required.";
      if (!isFilled(b.gstPercent)) errors.gstPercent = "This value is required.";
      if (!isFilled(b.address)) errors.address = "This value is required.";

      if (Object.keys(errors).length > 0) {
        allErrors[i] = errors;
      }
    }

    setBranchFieldErrors(allErrors);
    return Object.keys(allErrors).length === 0;
  };

  const handleSaveBasicInfo = async (): Promise<number | undefined> => {
    if (!validateBasicInfo()) return undefined;

    setSaving(true);
    try {
      const payload = {
        vendor_name: basicInfo.vendorName,
        vendor_email: basicInfo.email,
        vendor_primary_mobile_number: basicInfo.primaryMobile,
        vendor_alternative_mobile_number: basicInfo.altMobile,
        vendor_other_number: basicInfo.otherNumber,
        vendor_country_id: basicInfo.countryId
          ? Number(basicInfo.countryId)
          : null,
        vendor_state_id: basicInfo.stateId
          ? Number(basicInfo.stateId)
          : null,
        vendor_city_id: basicInfo.cityId ? Number(basicInfo.cityId) : null,
        vendor_pincode: basicInfo.pincode,
        vendor_address: basicInfo.address,
        vendor_margin_percent: basicInfo.marginPercent
          ? Number(basicInfo.marginPercent)
          : null,
        vendor_margin_gst_type: basicInfo.marginGstType,
        vendor_margin_gst_percent: basicInfo.marginGstPercent
          ? Number(basicInfo.marginGstPercent)
          : null,
        invoice_company_name: basicInfo.invoiceCompanyName,
        invoice_address: basicInfo.invoiceAddress,
        invoice_pincode: basicInfo.invoicePincode,
        invoice_gstin: basicInfo.invoiceGstin,
        invoice_pan: basicInfo.invoicePan,
        invoice_contact_no: basicInfo.invoiceContactNo,
        invoice_email: basicInfo.invoiceEmail,
        role_id: basicInfo.roleId ? Number(basicInfo.roleId) : null,
        vendor_username: basicInfo.username,
      };

      const method = vendorId ? "PUT" : "POST";
      const path = vendorId ? `/vendors/${vendorId}` : "/vendors";

      const res = (await api(path, {
        method,
        body: JSON.stringify(payload),
      })) as VendorDetailResponse;

      const newVendorId = res.vendor.vendor_id as number;
      setVendorId(newVendorId);
      setBasicFieldErrors({});
      setActiveStep(2);
      return newVendorId;
    } catch (e) {
      console.error("Failed to save basic info", e);
      return undefined;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBranches = async () => {
    if (!validateBranches()) return;

    const effectiveVendorId = vendorId ?? (await handleSaveBasicInfo());
    if (!effectiveVendorId) return;

    setSaving(true);
    try {
      for (const b of branches) {
        const payload = {
          branch_name: b.name,
          branch_location: b.location,
          branch_email: b.email,
          primary_mobile_number: b.primaryMobile,
          alternative_mobile_number: b.altMobile,
          country_id: b.countryId ? Number(b.countryId) : null,
          state_id: b.stateId ? Number(b.stateId) : null,
          city_id: b.cityId ? Number(b.cityId) : null,
          pincode: b.pincode,
          gst_type: b.gstType,
          gst_percent: b.gstPercent ? Number(b.gstPercent) : null,
          address: b.address,
        };

        if (b.id) {
          await api(`/vendors/branches/${b.id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          });
        } else {
          await api(`/vendors/${effectiveVendorId}/branches`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
        }
      }
      setBranchFieldErrors({});
      setActiveStep(3);
    } catch (e) {
      console.error("Failed to save branches", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBranch = async (index: number) => {
    const branch = branches[index];
    if (branch?.id) {
      try {
        await api(`/vendors/branches/${branch.id}`, { method: "DELETE" });
      } catch (e) {
        console.error("Failed to delete branch", e);
      }
    }
    setBranches((prev) => prev.filter((_, i) => i !== index));
  };

  /** ---------- Step header ---------- */

  const renderStepHeader = () => (
    <div className="mb-6 flex flex-wrap gap-3">
      {steps.map((label, i) => {
        const stepNumber = i + 1;
        const isActive = activeStep === stepNumber;
        const isCompleted = activeStep > stepNumber;
        const isEnabled = stepNumber === 1 || stepNumber <= maxEnabledStep;

        return (
          <button
            key={label}
            type="button"
            disabled={!isEnabled}
            onClick={() => isEnabled && setActiveStep(stepNumber)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow"
                : isCompleted
                ? "bg-purple-50 text-purple-600"
                : "bg-white text-gray-500 border border-gray-200"
            } ${!isEnabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-xs text-purple-600">
              {stepNumber}
            </span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );

  /** ---------- Render active step ---------- */

  const renderActiveStep = () => {
    if (activeStep === 1) {
      return (
        <VendorStepBasicInfo
          basicInfo={basicInfo}
          setBasicInfo={setBasicInfo}
          countryOptions={countryOptions}
          stateOptions={stateOptions}
          cityOptions={cityOptions}
          roleOptions={roleOptions}
          gstTypeOptions={gstTypeOptions}
          gstPercentOptions={gstPercentOptions}
          saving={saving}
          isEdit={isEdit}
          fieldErrors={basicFieldErrors}
          onClearFieldError={(field) =>
            setBasicFieldErrors((prev) => ({ ...prev, [field]: undefined }))
          }
          onBack={() => navigate(-1)}
          onSaveAndNext={handleSaveBasicInfo}
        />
      );
    }
    if (activeStep === 2) {
      return (
        <VendorStepBranch
          branches={branches}
          setBranches={setBranches}
          countryOptions={countryOptions}
          gstTypeOptions={gstTypeOptions}
          gstPercentOptions={gstPercentOptions}
          saving={saving}
          fieldErrors={branchFieldErrors}
          onClearFieldError={(index, field) =>
            setBranchFieldErrors((prev) => ({
              ...prev,
              [index]: { ...(prev[index] || {}), [field]: undefined },
            }))
          }
          onBack={() => setActiveStep(1)}
          onSaveAndNext={handleSaveBranches}
          onDeleteBranch={handleDeleteBranch}
        />
      );
    }
    if (activeStep === 3) {
      return (
        <VendorStepVehicleTypeCost
          vendorId={vendorId}
          onBack={() => setActiveStep(2)}
          onNext={() => setActiveStep(4)}
        />
      );
    }
    if (activeStep === 4) {
      return (
        <VendorStepVehicle
          vendorId={vendorId}
          onBack={() => setActiveStep(3)}
          onNext={() => setActiveStep(5)}
        />
      );
    }
    if (activeStep === 5) {
      return (
        <VendorStepVehiclePricebook
          vendorId={vendorId}
          onBack={() => setActiveStep(4)}
          onFinish={() => setActiveStep(6)}
        />
      );
    }
    return (
      <VendorStepPermitCost
        vendorId={vendorId}
        onBack={() => setActiveStep(5)}
        onNext={() => navigate("/vendor")}
      />
    );
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">
          {isEdit ? "Edit Vendor" : "Add Vendor"}
        </h1>
      </div>

      {renderStepHeader()}

      {loading ? (
        <div className="flex h-40 items-center justify-center text-gray-500">
          Loading vendor...
        </div>
      ) : (
        renderActiveStep()
      )}
    </div>
  );
}
