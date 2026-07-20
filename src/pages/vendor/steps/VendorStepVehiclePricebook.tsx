/* eslint-disable @typescript-eslint/no-explicit-any */
// FILE: src/pages/vendor/steps/VendorStepVehiclePricebook.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calendar as CalendarIcon, ChevronDown, X } from "lucide-react";
import { addDays, format, isValid, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Option } from "../vendorFormTypes";
import { VendorStepVehiclePricebookView } from "./VendorStepVehiclePricebookView";
type Props = {
  vendorId?: number;
  onBack: () => void;
  onFinish: () => void;
};
const gstTypes = [
  { id: "included", label: "Included" },
  { id: "excluded", label: "Excluded" },
];
const toPickerDate = (value: string) => {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
};
const toYmd = (date?: Date) => {
  if (!date) return "";
  return format(date, "yyyy-MM-dd");
};
const extractApiErrorMessage = (error: unknown, fallback: string) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const jsonMatch = message.match(/\{"message":"([^"]+)"/);
  if (jsonMatch?.[1]) return jsonMatch[1];
  return message || fallback;
};
const showKmLimitSaveErrorToast = (error: unknown, fallback: string, vehicleTypeLabel?: string) => {
  const message = extractApiErrorMessage(error, fallback);
  if (/already exist for this vehicle type/i.test(message)) {
    const duplicateMessage = vehicleTypeLabel
      ? `Already exist for ${vehicleTypeLabel}`
      : message;
    toast(duplicateMessage, {
      position: "top-center",
      style: {
        background: "#f59e0b",
        color: "#ffffff",
        border: "1px solid #f59e0b",
      },
      closeButton: true,
      duration: 3500,
    });
    return true;
  }
  toast.error(message);
  return false;
};
const showOrangeWarningToast = (message: string) => {
  toast(message, {
    position: "top-center",
    style: {
      background: "#f59e0b",
      color: "#ffffff",
      border: "1px solid #f59e0b",
    },
    closeButton: true,
    duration: 3500,
  });
};
import { PricebookDatePicker, VehicleTypeMultiSelect } from "./VendorStepVehiclePricebookFields";
export const VendorStepVehiclePricebook: React.FC<Props> = ({
  vendorId,
  onBack,
  onFinish,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Dropdowns
  const [vehicleTypeOptions, setVehicleTypeOptions] = useState<Option[]>([]);
  const [gstPercentOptions, setGstPercentOptions] = useState<Option[]>([]);
  // ----- Vendor margin state -----
  const [vendorMarginPercent, setVendorMarginPercent] = useState<string>("0");
  const [vendorMarginGstType, setVendorMarginGstType] =
    useState<string>("included");
  const [vendorMarginGstPercent, setVendorMarginGstPercent] =
    useState<string>("0");
  // ----- Driver/extra cost state -----
  const [driverCosts, setDriverCosts] = useState<any[]>([]);
  const [editableDriverRows, setEditableDriverRows] = useState<any[]>([]);
  const [vehicleExtraRows, setVehicleExtraRows] = useState<any[]>([]);
  // ----- PHP parity pricebook rows -----
  const [localFormRows, setLocalFormRows] = useState<any[]>([]);
  const [outstationFormRows, setOutstationFormRows] = useState<any[]>([]);
  const [localRentalByRow, setLocalRentalByRow] = useState<Record<string, string>>({});
  const [outstationRentalByRow, setOutstationRentalByRow] = useState<Record<string, string>>({});
  const [localStartDate, setLocalStartDate] = useState("");
  const [localEndDate, setLocalEndDate] = useState("");
  const [outstationStartDate, setOutstationStartDate] = useState("");
  const [outstationEndDate, setOutstationEndDate] = useState("");
  const [localVehicleFilter, setLocalVehicleFilter] = useState("all");
  const [outstationVehicleFilter, setOutstationVehicleFilter] = useState("all");
  const [localPreview, setLocalPreview] = useState<{ days: Array<{ key: string; label: string }>; rows: Array<{ vehicle_type_id?: number; vehicle_type_title: string; time_limit_id?: number; time_limit_title: string; prices: Array<number | null> }> }>({ days: [], rows: [] });
  const [outstationPreview, setOutstationPreview] = useState<{ days: Array<{ key: string; label: string }>; rows: Array<{ vehicle_type_id?: number; vehicle_type_title: string; kms_limit_id?: number; kms_limit_title: string; prices: Array<number | null> }> }>({ days: [], rows: [] });
  // ----- Local KM Limit modal -----
  const [localKmOpen, setLocalKmOpen] = useState(false);
  const [localKmSaveLocked, setLocalKmSaveLocked] = useState(false);
  const [localKmForm, setLocalKmForm] = useState({
    vehicleType: "",
    title: "",
    hours: "",
    kmLimit: "",
  });
  // ----- Outstation KM Limit modal -----
  const [outKmOpen, setOutKmOpen] = useState(false);
  const [outKmSaveLocked, setOutKmSaveLocked] = useState(false);
  const [outKmForm, setOutKmForm] = useState({
    vehicleType: "",
    title: "",
    kmLimit: "",
  });
  // ----- Delete confirm -----
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    type: "local" | "outstation" | null;
    id: number | null;
    label: string;
  }>({ open: false, type: null, id: null, label: "" });
  useEffect(() => {
    if (vendorId) {
      fetchData();
      fetchDropdowns();
    }
  }, [vendorId]);
  useEffect(() => {
    if (!vendorId) return;
    const loadPreview = async () => {
      if (!localStartDate || !localEndDate) {
        setLocalPreview({ days: [], rows: [] });
        return;
      }
      try {
        const preview = (await api(
          `/vendors/${vendorId}/pricebook/local/preview?startDate=${encodeURIComponent(localStartDate)}&endDate=${encodeURIComponent(localEndDate)}`,
          { cache: "no-store" },
        )) as any;
        setLocalPreview(preview ?? { days: [], rows: [] });
      } catch (e) {
        console.error("Failed to load local pricebook preview", e);
      }
    };
    loadPreview();
  }, [vendorId, localStartDate, localEndDate]);
  useEffect(() => {
    if (!vendorId) return;
    const loadPreview = async () => {
      if (!outstationStartDate || !outstationEndDate) {
        setOutstationPreview({ days: [], rows: [] });
        return;
      }
      try {
        const preview = (await api(
          `/vendors/${vendorId}/pricebook/outstation/preview?startDate=${encodeURIComponent(outstationStartDate)}&endDate=${encodeURIComponent(outstationEndDate)}`,
          { cache: "no-store" },
        )) as any;
        setOutstationPreview(preview ?? { days: [], rows: [] });
      } catch (e) {
        console.error("Failed to load outstation pricebook preview", e);
      }
    };
    loadPreview();
  }, [vendorId, outstationStartDate, outstationEndDate]);
  const fetchData = async () => {
    setLoading(true);
    try {
      const [vRes, dcRes, extraRes, localRowsRes, outRowsRes] = await Promise.all([
        api(`/vendors/${vendorId}`, { cache: "no-store" }),
        api(`/vendors/${vendorId}/vehicle-type-costs`, { cache: "no-store" }),
        api(`/vendors/${vendorId}/vehicle-extra-costs`, { cache: "no-store" }),
        api(`/vendors/${vendorId}/pricebook/local/form-rows`, { cache: "no-store" }),
        api(`/vendors/${vendorId}/pricebook/outstation/form-rows`, { cache: "no-store" }),
      ]);
      const v = vRes.vendor;
      const gstTypeRaw = String(v.vendor_margin_gst_type ?? "1");
      const gstType =
        gstTypeRaw === "2" || gstTypeRaw === "excluded"
          ? "excluded"
          : "included";
      setVendorMarginPercent(String(v.vendor_margin ?? v.vendor_margin_percent ?? 0));
      setVendorMarginGstType(gstType);
      setVendorMarginGstPercent(String(v.vendor_margin_gst_percentage || 0));
      const normalizedDriverRows = (dcRes as any[]).map((dc) => ({
        vendor_vehicle_type_ID: dc.vendor_vehicle_type_ID,
        vehicle_type_id: dc.vehicle_type_id,
        vehicle_type_title: dc.vehicle_type_title,
        driver_batta: String(dc.driver_batta ?? dc.driver_bhatta ?? 0),
        food_cost: String(dc.food_cost ?? 0),
        accomodation_cost: String(dc.accomodation_cost ?? dc.accommodation_cost ?? 0),
        extra_cost: String(dc.extra_cost ?? 0),
        driver_early_morning_charges: String(dc.driver_early_morning_charges ?? dc.morning_charges ?? 0),
        driver_evening_charges: String(dc.driver_evening_charges ?? dc.evening_charges ?? 0),
      }));
      const vendorTypeMap = new Map<string, Option>(
        (dcRes as any[])
          .map((r: any) => ({
            id: String(r.vendor_vehicle_type_ID ?? r.vehicle_type_id ?? ""),
            label: String(r.vehicle_type_title ?? r.vehicle_type_name ?? r.vehicle_title ?? "").trim(),
          }))
          .filter((option) => option.id && option.label)
          .map((option) => [option.id, option] as const),
      );
      const activeBaseTypeIds = new Set(
        (dcRes as any[])
          .map((r: any) => String(r.vehicle_type_id ?? "").trim())
          .filter((id: string) => id.length > 0),
      );
      setVehicleTypeOptions(Array.from(vendorTypeMap.values()));
      setDriverCosts(dcRes as any[]);
      setEditableDriverRows(normalizedDriverRows);
      setVehicleExtraRows(
        (extraRes as any[])
          .map((r: any) => {
            const vehicleTypeId = String(r.vehicle_type_id ?? r.vendor_vehicle_type_id ?? "").trim();
            if (vehicleTypeId && !activeBaseTypeIds.has(vehicleTypeId)) {
              return null;
            }
            const responseTitle = String(
              r.vehicle_type_title ??
                r.vehicle_type_name ??
                r.vehicle_title ??
                "",
            ).trim();
            const mappedTitle = vendorTypeMap.get(vehicleTypeId)?.label;
            const vehicleTypeTitle =
              responseTitle && !/^\d+$/.test(responseTitle)
                ? responseTitle
                : mappedTitle || vehicleTypeId;
            return {
              vendor_branch_id: r.vendor_branch_id,
              vendor_branch_name: r.vendor_branch_name,
              vehicle_type_id: r.vehicle_type_id,
              vehicle_type_title: vehicleTypeTitle,
              extra_km_charge: String(r.extra_km_charge ?? 0),
              extra_hour_charge: String(r.extra_hour_charge ?? 0),
              early_morning_charges: String(r.early_morning_charges ?? 0),
              evening_charges: String(r.evening_charges ?? 0),
            };
          })
          .filter(Boolean),
      );
      setLocalFormRows(localRowsRes as any[]);
      setOutstationFormRows(outRowsRes as any[]);
      if (localStartDate && localEndDate) {
        const preview = (await api(
          `/vendors/${vendorId}/pricebook/local/preview?startDate=${encodeURIComponent(localStartDate)}&endDate=${encodeURIComponent(localEndDate)}`,
          { cache: "no-store" },
        )) as any;
        setLocalPreview(preview ?? { days: [], rows: [] });
      }
    } catch (e) {
      console.error("Failed to fetch pricebook data", e);
    } finally {
      setLoading(false);
    }
  };
  const fetchDropdowns = async () => {
    try {
      const gpRes = await api("/dropdowns/gst-percentages");
      const gstItems = ((gpRes as any)?.items ?? gpRes ?? []) as any[];
      setGstPercentOptions(
        gstItems.map((g: any) => ({
          id: String(g.id ?? g.gstperc_id ?? ""),
          label: String(g.label ?? g.gstpercentage ?? g.name ?? ""),
        }))
      );
    } catch (e) {
      console.error("Failed to fetch dropdowns", e);
    }
  };
  const handleUpdateMargin = async () => {
    if (!vendorId) return;
    setSaving(true);
    try {
      await api(`/vendors/${vendorId}`, {
        method: "PATCH",
        body: JSON.stringify({
          vendor_margin_percent: Number(vendorMarginPercent),
          vendor_margin_gst_type: vendorMarginGstType,
          vendor_margin_gst_percentage: Number(vendorMarginGstPercent),
        }),
      });
      // Refresh
      await fetchData();
    } catch (e) {
      console.error("Failed to update margin", e);
    } finally {
      setSaving(false);
    }
  };
  const gradientButton =
    "bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600";
  const setDriverCell = (idx: number, field: string, value: string) => {
    setEditableDriverRows((prev) => {
      const clone = [...prev];
      clone[idx] = { ...clone[idx], [field]: value };
      return clone;
    });
  };
  const setExtraCell = (idx: number, field: string, value: string) => {
    setVehicleExtraRows((prev) => {
      const clone = [...prev];
      clone[idx] = { ...clone[idx], [field]: value };
      return clone;
    });
  };
  const handleUpdateDriverAndExtraCosts = async () => {
    if (!vendorId || !editableDriverRows.length) return;
    setSaving(true);
    try {
      for (const row of editableDriverRows) {
        await api(`/vendors/${vendorId}/vehicle-type-costs`, {
          method: "POST",
          body: JSON.stringify({
            vehicle_type_id: Number(row.vehicle_type_id),
            driver_bhatta: Number(row.driver_batta || 0),
            food_cost: Number(row.food_cost || 0),
            accommodation_cost: Number(row.accomodation_cost || 0),
            extra_cost: Number(row.extra_cost || 0),
            morning_charges: Number(row.driver_early_morning_charges || 0),
            evening_charges: Number(row.driver_evening_charges || 0),
          }),
        });
      }
      await fetchData();
    } catch (e) {
      console.error("Failed to update driver/extra costs", e);
    } finally {
      setSaving(false);
    }
  };
  const handleUpdateVehicleExtraCosts = async () => {
    if (!vendorId || !vehicleExtraRows.length) return;
    setSaving(true);
    try {
      const groupedByBranch = vehicleExtraRows.reduce((acc: Record<string, any[]>, row) => {
        const key = String(row.vendor_branch_id);
        if (!acc[key]) acc[key] = [];
        acc[key].push(row);
        return acc;
      }, {});
     for (const [branchId, rows] of Object.entries(groupedByBranch) as [string, any[]][]) {
  await api(`/vendors/${vendorId}/vehicle-extra-costs`, {
    method: "POST",
    body: JSON.stringify({
      vendor_branch_id: Number(branchId),
      vehicle_type_id: rows.map((r: any) => Number(r.vehicle_type_id)),
      vehicle_type_title: rows.map((r: any) => r.vehicle_type_title),
      extra_km_charge: rows.map((r: any) => Number(r.extra_km_charge || 0)),
      extra_hour_charge: rows.map((r: any) => Number(r.extra_hour_charge || 0)),
      early_morning_charges: rows.map((r: any) => Number(r.early_morning_charges || 0)),
      evening_charges: rows.map((r: any) => Number(r.evening_charges || 0)),
    }),
  });
}
      await fetchData();
    } catch (e) {
      console.error("Failed to update vehicle extra costs", e);
    } finally {
      setSaving(false);
    }
  };
  const groupedExtraRows = useMemo(() => {
    return vehicleExtraRows.reduce((acc: Record<string, any[]>, row: any) => {
      const key = `${row.vendor_branch_id}:${row.vendor_branch_name || ""}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    }, {});
  }, [vehicleExtraRows]);
  const handleLocalKmChange = (
    field: keyof Omit<typeof localKmForm, "vehicleType">,
    value: string
  ) => {
    setLocalKmSaveLocked(false);
    setLocalKmForm((prev) => ({ ...prev, [field]: value }));
  };
  const handleOutKmChange = (field: keyof Omit<typeof outKmForm, "vehicleType">, value: string) => {
    setOutKmSaveLocked(false);
    setOutKmForm((prev) => ({ ...prev, [field]: value }));
  };
  const handleOpenLocalKmModal = () => {
    setLocalKmSaveLocked(false);
    setLocalKmForm({
      vehicleType: localVehicleFilter !== "all" ? localVehicleFilter : "",
      title: "",
      hours: "",
      kmLimit: "",
    });
    setLocalKmOpen(true);
  };
  const handleOpenOutKmModal = () => {
    setOutKmSaveLocked(false);
    setOutKmForm({
      vehicleType: outstationVehicleFilter !== "all" ? outstationVehicleFilter : "",
      title: "",
      kmLimit: "",
    });
    setOutKmOpen(true);
  };
  const handleLocalKmSave = async () => {
    if (!vendorId) return;
    if (localKmSaveLocked) return;
    const isLocalKmFormDirty = Boolean(
      localKmForm.vehicleType || localKmForm.title.trim() || localKmForm.hours.trim() || localKmForm.kmLimit.trim()
    );
    if (!isLocalKmFormDirty) {
      showOrangeWarningToast("Please change at least one field");
      setLocalKmSaveLocked(true);
      return;
    }
    if (!localKmForm.vehicleType) {
      showOrangeWarningToast("Please select vehicle type");
      setLocalKmSaveLocked(true);
      return;
    }
    const savedVehicleType = localKmForm.vehicleType;
    setSaving(true);
    try {
      await api(`/vendors/${vendorId}/local-km-limits`, {
        method: "POST",
        body: JSON.stringify({
          vehicle_type_id: Number(localKmForm.vehicleType),
          loc_km_title: localKmForm.title,
          loc_km_hour: Number(localKmForm.hours || 0),
          loc_km_limit: Number(localKmForm.kmLimit || 0),
          status: 1,
        }),
      });
      setLocalVehicleFilter(savedVehicleType);
      setLocalKmOpen(false);
      setLocalKmSaveLocked(false);
      setLocalKmForm({ vehicleType: "", title: "", hours: "", kmLimit: "" });
      toast.success("Local KM limit saved successfully");
      await fetchData();
    } catch (e) {
      console.error("Failed to save local KM limit", e);
      const vehicleTypeLabel = vehicleTypeOptions.find((opt) => opt.id === localKmForm.vehicleType)?.label;
      const isDuplicate = showKmLimitSaveErrorToast(e, "Failed to save local KM limit", vehicleTypeLabel);
      if (isDuplicate) {
        setLocalKmSaveLocked(true);
      }
    } finally {
      setSaving(false);
    }
  };
  const handleOutKmSave = async () => {
    if (!vendorId) return;
    if (outKmSaveLocked) return;
    if (!outKmForm.vehicleType) {
      showOrangeWarningToast("Please select vehicle type");
      setOutKmSaveLocked(true);
      return;
    }
    const savedVehicleType = outKmForm.vehicleType;
    setSaving(true);
    try {
      await api(`/vendors/${vendorId}/outstation-km-limits`, {
        method: "POST",
        body: JSON.stringify({
          vehicle_type_id: Number(outKmForm.vehicleType),
          out_km_title: outKmForm.title,
          out_km_limit: Number(outKmForm.kmLimit || 0),
          status: 1,
        }),
      });
      setOutstationVehicleFilter(savedVehicleType);
      setOutKmOpen(false);
      setOutKmSaveLocked(false);
      setOutKmForm({ vehicleType: "", title: "", kmLimit: "" });
      toast.success("Outstation KM limit saved successfully");
      await fetchData();
    } catch (e) {
      console.error("Failed to save outstation KM limit", e);
      const vehicleTypeLabel = vehicleTypeOptions.find((opt) => opt.id === outKmForm.vehicleType)?.label;
      const isDuplicate = showKmLimitSaveErrorToast(e, "Failed to save outstation KM limit", vehicleTypeLabel);
      if (isDuplicate) {
        setOutKmSaveLocked(true);
      }
    } finally {
      setSaving(false);
    }
  };
  const handleDeleteKmLimit = async () => {
    if (!vendorId || !deleteConfirm.type || !deleteConfirm.id) return;
    const pendingDelete = { ...deleteConfirm };
    setSaving(true);
    try {
      const endpoint = pendingDelete.type === "local"
        ? `/vendors/${vendorId}/local-km-limits`
        : `/vendors/${vendorId}/outstation-km-limits`;
      const body = pendingDelete.type === "local"
        ? {
            loc_km_id: pendingDelete.id,
            deleted: 1,
            status: 0,
          }
        : {
            out_km_id: pendingDelete.id,
            deleted: 1,
            status: 0,
          };
      await api(endpoint, { method: "POST", body: JSON.stringify(body) });
      setDeleteConfirm({ open: false, type: null, id: null, label: "" });
      toast.success("KM limit deleted successfully");
      await fetchData();
    } catch (e) {
      console.error("Failed to delete KM limit", e);
      toast.error("Failed to delete KM limit. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  const matchesVehicleFilter = (row: any, filter: string, filterLabel: string) => {
    if (filter === "all") return true;
    const rowTypeId = String(row.vehicle_type_id ?? row.vendor_vehicle_type_id ?? "");
    const rowTitle = String(
      row.vehicle_type_title ?? row.vehicle_type_name ?? row.vehicle_title ?? "",
    )
      .trim()
      .toLowerCase();
    const normalizedFilterLabel = String(filterLabel ?? "").trim().toLowerCase();
    return (
      rowTypeId === filter ||
      (normalizedFilterLabel.length > 0 && rowTitle === normalizedFilterLabel)
    );
  };
  const groupedLocalRows = useMemo(() => {
    const filtered = localVehicleFilter === "all"
      ? localFormRows
      : localFormRows.filter((r: any) => matchesVehicleFilter(r, localVehicleFilter, vehicleTypeOptions.find((o) => o.id === localVehicleFilter)?.label ?? ""));
    return filtered.reduce((acc: Record<string, any[]>, row: any) => {
      const k = `${row.vendor_branch_id}:${row.vendor_branch_name || ""}`;
      if (!acc[k]) acc[k] = [];
      acc[k].push(row);
      return acc;
    }, {});
  }, [localFormRows, localVehicleFilter, vehicleTypeOptions]);
  const groupedOutstationRows = useMemo(() => {
    const filtered = outstationVehicleFilter === "all"
      ? outstationFormRows
      : outstationFormRows.filter((r: any) => matchesVehicleFilter(r, outstationVehicleFilter, vehicleTypeOptions.find((o) => o.id === outstationVehicleFilter)?.label ?? ""));
    return filtered.reduce((acc: Record<string, any[]>, row: any) => {
      const k = `${row.vendor_branch_id}:${row.vendor_branch_name || ""}`;
      if (!acc[k]) acc[k] = [];
      acc[k].push(row);
      return acc;
    }, {});
  }, [outstationFormRows, outstationVehicleFilter, vehicleTypeOptions]);
  const localVehicleTypeOptions = useMemo(() => {
    const seen = new Map<string, string>();
    vehicleTypeOptions.forEach((opt) => {
      if (opt.id && !seen.has(opt.id)) seen.set(opt.id, opt.label);
    });
    localFormRows.forEach((r: any) => {
      const id = String(r.vehicle_type_id ?? "");
      if (id && !seen.has(id)) seen.set(id, String(r.vehicle_type_title ?? id));
    });
    return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
  }, [localFormRows, vehicleTypeOptions]);
  const filteredLocalPreviewRows = useMemo(() => {
    if (localVehicleFilter === "all") return localPreview.rows;
    const filterLabel = vehicleTypeOptions.find((o) => o.id === localVehicleFilter)?.label ?? "";
    return localPreview.rows.filter((row) => matchesVehicleFilter(row, localVehicleFilter, filterLabel));
  }, [localPreview.rows, localVehicleFilter, vehicleTypeOptions]);
  const outstationVehicleTypeOptions = useMemo(() => {
    const seen = new Map<string, string>();
    vehicleTypeOptions.forEach((opt) => {
      if (opt.id && !seen.has(opt.id)) seen.set(opt.id, opt.label);
    });
    outstationFormRows.forEach((r: any) => {
      const id = String(r.vehicle_type_id ?? "");
      if (id && !seen.has(id)) seen.set(id, String(r.vehicle_type_title ?? id));
    });
    return Array.from(seen.entries()).map(([id, label]) => ({ id, label }));
  }, [outstationFormRows, vehicleTypeOptions]);
  const filteredOutstationPreviewRows = useMemo(() => {
    if (outstationVehicleFilter === "all") return outstationPreview.rows;
    const filterLabel = vehicleTypeOptions.find((o) => o.id === outstationVehicleFilter)?.label ?? "";
    return outstationPreview.rows.filter((row) => matchesVehicleFilter(row, outstationVehicleFilter, filterLabel));
  }, [outstationPreview.rows, outstationVehicleFilter, vehicleTypeOptions]);
  const rowKey = (r: any, type: "local" | "out") =>
    type === "local"
      ? `${r.vendor_branch_id}:${r.vehicle_type_id}:${r.time_limit_id}`
      : `${r.vendor_branch_id}:${r.vehicle_type_id}:${r.kms_limit_id}`;
  const handleLocalPricebookUpdate = async () => {
    if (!vendorId) return;
    const rowsWithCharge = localFormRows
      .map((r) => ({ r, charge: localRentalByRow[rowKey(r, "local")]?.trim() ?? "" }))
      .filter((x) => x.charge !== "");
    if (!rowsWithCharge.length) return;
    if (!localStartDate || !localEndDate) return;
    setSaving(true);
    try {
      await api(`/vendors/${vendorId}/pricebook/local`, {
        method: "POST",
        body: JSON.stringify({
          vendor_id: rowsWithCharge.map((x) => x.r.vendor_id),
          vendor_branch_id: rowsWithCharge.map((x) => x.r.vendor_branch_id),
          vehicle_id: rowsWithCharge.map((x) => x.r.vehicle_id),
          time_limit_id: rowsWithCharge.map((x) => x.r.time_limit_id),
          vehicle_type_id: rowsWithCharge.map((x) => x.r.vehicle_type_id),
          vehicle_type_title: rowsWithCharge.map((x) => x.r.vehicle_type_title),
          vehicle_rental_charge: rowsWithCharge.map((x) => x.charge),
          local_pricebook_start_date: localStartDate,
          local_pricebook_end_date: localEndDate,
        }),
      });
      setLocalRentalByRow({});
      if (localStartDate && localEndDate) {
        const preview = (await api(
          `/vendors/${vendorId}/pricebook/local/preview?startDate=${encodeURIComponent(localStartDate)}&endDate=${encodeURIComponent(localEndDate)}`,
          { cache: "no-store" },
        )) as any;
        setLocalPreview(preview ?? { days: [], rows: [] });
      }
      await fetchData();
    } catch (e) {
      console.error("Failed to update local pricebook", e);
    } finally {
      setSaving(false);
    }
  };
  const handleOutstationPricebookUpdate = async () => {
    if (!vendorId) return;
    const rowsWithCharge = outstationFormRows
      .map((r) => ({ r, charge: outstationRentalByRow[rowKey(r, "out")]?.trim() ?? "" }))
      .filter((x) => x.charge !== "");
    if (!rowsWithCharge.length) return;
    if (!outstationStartDate || !outstationEndDate) return;
    setSaving(true);
    try {
      await api(`/vendors/${vendorId}/pricebook/outstation`, {
        method: "POST",
        body: JSON.stringify({
          vendor_id: rowsWithCharge.map((x) => x.r.vendor_id),
          vendor_branch_id: rowsWithCharge.map((x) => x.r.vendor_branch_id),
          vehicle_id: rowsWithCharge.map((x) => x.r.vehicle_id),
          kms_limit_id: rowsWithCharge.map((x) => x.r.kms_limit_id),
          vehicle_type_id: rowsWithCharge.map((x) => x.r.vehicle_type_id),
          vehicle_type_title: rowsWithCharge.map((x) => x.r.vehicle_type_title),
          outstation_vehicle_rental_charge: rowsWithCharge.map((x) => x.charge),
          outstation_pricebook_start_date: outstationStartDate,
          outstation_pricebook_end_date: outstationEndDate,
        }),
      });
      setOutstationRentalByRow({});
      if (outstationStartDate && outstationEndDate) {
        const preview = (await api(
          `/vendors/${vendorId}/pricebook/outstation/preview?startDate=${encodeURIComponent(outstationStartDate)}&endDate=${encodeURIComponent(outstationEndDate)}`,
          { cache: "no-store" },
        )) as any;
        setOutstationPreview(preview ?? { days: [], rows: [] });
      }
      await fetchData();
    } catch (e) {
      console.error("Failed to update outstation pricebook", e);
    } finally {
      setSaving(false);
    }
  };
  const pricebookViewContext = {
    PricebookDatePicker,
    deleteConfirm,
    driverCosts,
    editableDriverRows,
    filteredLocalPreviewRows,
    filteredOutstationPreviewRows,
    gradientButton,
    groupedExtraRows,
    groupedLocalRows,
    groupedOutstationRows,
    gstPercentOptions,
    gstTypes,
    handleDeleteKmLimit,
    handleLocalKmChange,
    handleLocalKmSave,
    handleLocalPricebookUpdate,
    handleOpenLocalKmModal,
    handleOpenOutKmModal,
    handleOutKmChange,
    handleOutKmSave,
    handleOutstationPricebookUpdate,
    handleUpdateDriverAndExtraCosts,
    handleUpdateMargin,
    handleUpdateVehicleExtraCosts,
    localEndDate,
    localKmForm,
    localKmOpen,
    localKmSaveLocked,
    localPreview,
    localRentalByRow,
    localStartDate,
    localVehicleFilter,
    localVehicleTypeOptions,
    onBack,
    onFinish,
    open,
    outKmForm,
    outKmOpen,
    outKmSaveLocked,
    outstationEndDate,
    outstationPreview,
    outstationRentalByRow,
    outstationStartDate,
    outstationVehicleFilter,
    outstationVehicleTypeOptions,
    rowKey,
    saving,
    setDeleteConfirm,
    setDriverCell,
    setExtraCell,
    setLocalEndDate,
    setLocalKmForm,
    setLocalKmOpen,
    setLocalKmSaveLocked,
    setLocalRentalByRow,
    setLocalStartDate,
    setLocalVehicleFilter,
    setOutKmForm,
    setOutKmOpen,
    setOutKmSaveLocked,
    setOutstationEndDate,
    setOutstationRentalByRow,
    setOutstationStartDate,
    setOutstationVehicleFilter,
    setVendorMarginGstPercent,
    setVendorMarginGstType,
    setVendorMarginPercent,
    toPickerDate,
    vehicleExtraRows,
    vehicleTypeOptions,
    vendorId,
    vendorMarginGstPercent,
    vendorMarginGstType,
    vendorMarginPercent,
  };
  return <VendorStepVehiclePricebookView context={pricebookViewContext} />;
};
