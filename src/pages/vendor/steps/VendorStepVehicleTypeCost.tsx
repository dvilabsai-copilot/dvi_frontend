/* eslint-disable @typescript-eslint/no-explicit-any */
// FILE: src/pages/vendor/steps/VendorStepVehicleTypeCost.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { VendorStepVehicleTypeCostView } from "./VendorStepVehicleTypeCostView";
import { api } from "@/lib/api";
import { Option } from "../vendorFormTypes";
import { toast } from "sonner";
type Props = {
  vendorId?: number;
  onBack: () => void;
  onNext: () => void;
};
// ======== Types for local UI state ========
type DriverCostRow = {
  id: number;
  vehicleType: string;
  vehicleTypeId: number;
  driverBhatta: string;
  foodCost: string;
  accommodationCost: string;
  extraCost: string;
  morningCharges: string;
  eveningCharges: string;
};
type OutstationKmLimitRow = {
  id: number;
  vehicleType: string;
  vehicleTypeId: number;
  title: string;
  limit: string;
  status: string;
};
type LocalKmLimitRow = {
  id: number;
  vehicleType: string;
  vehicleTypeId: number;
  title: string;
  hours: string;
  km: string;
  status: string;
};
type ActiveTab = "driverCost" | "outstation" | "local";
type DriverFieldErrors = Partial<{
  vehicleType: string;
  driverBhatta: string;
  foodCost: string;
  accommodationCost: string;
  extraCost: string;
  morningCharges: string;
  eveningCharges: string;
}>;
type OutstationFieldErrors = Partial<{
  vehicleType: string;
  title: string;
  limit: string;
}>;
type LocalFieldErrors = Partial<{
  vehicleType: string;
  title: string;
  hours: string;
  km: string;
}>;
const extractApiErrorMessage = (error: unknown, fallback: string) => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const jsonMatch = message.match(/\{"message":"([^"]+)"/);
  if (jsonMatch?.[1]) return jsonMatch[1];
  return message || fallback;
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
const showKmLimitSaveErrorToast = (error: unknown, fallback: string, vehicleTypeLabel?: string) => {
  const message = extractApiErrorMessage(error, fallback);
  if (/already exist for this vehicle type/i.test(message)) {
    const duplicateMessage = vehicleTypeLabel
      ? `Already exist for ${vehicleTypeLabel}`
      : message;
    showOrangeWarningToast(duplicateMessage);
    return true;
  }
  toast.error(message);
  return false;
};
export const VendorStepVehicleTypeCost: React.FC<Props> = ({
  vendorId,
  onBack,
  onNext,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("driverCost");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
 const [deleteDriverCostId, setDeleteDriverCostId] = useState<number | null>(null);
const [deleteOutstationId, setDeleteOutstationId] = useState<number | null>(null);
const [deleteLocalId, setDeleteLocalId] = useState<number | null>(null);
  // Dropdowns
  const [vehicleTypeOptions, setVehicleTypeOptions] = useState<Option[]>([]);
  // ---- Driver Cost state ----
  const [driverCostRows, setDriverCostRows] = useState<DriverCostRow[]>([]);
  const [driverCostSearch, setDriverCostSearch] = useState("");
  const [showDriverCostModal, setShowDriverCostModal] = useState(false);
  const [editingDriverRow, setEditingDriverRow] = useState<DriverCostRow | null>(
    null
  );
  const [driverFormVehicleType, setDriverFormVehicleType] = useState<string>("");
const [driverFormFields, setDriverFormFields] = useState({
  driverBhatta: "0",
  foodCost: "0",
  accommodationCost: "0",
  extraCost: "0",
  morningCharges: "0",
  eveningCharges: "0",
});
  const [driverFieldErrors, setDriverFieldErrors] = useState<DriverFieldErrors>({});
  // ---- Outstation KM Limit state ----
  const [outstationRows, setOutstationRows] = useState<OutstationKmLimitRow[]>(
    []
  );
  const [outstationSearch, setOutstationSearch] = useState("");
  const [showOutstationModal, setShowOutstationModal] = useState(false);
  const [editingOutstationRow, setEditingOutstationRow] =
    useState<OutstationKmLimitRow | null>(null);
  const [outstationFormVehicleType, setOutstationFormVehicleType] =
    useState<string>("");
  const [outstationFormFields, setOutstationFormFields] = useState({
    title: "",
    limit: "",
  });
  const [outstationFieldErrors, setOutstationFieldErrors] = useState<OutstationFieldErrors>({});
  const [outstationSaveLocked, setOutstationSaveLocked] = useState(false);
  // ---- Local KM Limit state ----
  const [localRows, setLocalRows] = useState<LocalKmLimitRow[]>([]);
  const [localSearch, setLocalSearch] = useState("");
  const [showLocalModal, setShowLocalModal] = useState(false);
  const [editingLocalRow, setEditingLocalRow] =
    useState<LocalKmLimitRow | null>(null);
  const [localFormVehicleType, setLocalFormVehicleType] = useState<string>("");
  const [localFormFields, setLocalFormFields] = useState({
    title: "",
    hours: "",
    km: "",
  });
  const [localFieldErrors, setLocalFieldErrors] = useState<LocalFieldErrors>({});
  const [localSaveLocked, setLocalSaveLocked] = useState(false);
const isValidNumberInput = (value: string): boolean => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return false;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0;
};
const numberOrZero = (value: string): number => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return 0;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};
  useEffect(() => {
    if (vendorId) {
      fetchData();
    }
  }, [vendorId]);
  const fetchData = async () => {
    setLoading(true);
    try {
      const [dc, out, loc] = await Promise.all([
        api(`/vendors/${vendorId}/vehicle-type-costs`),
        api(`/vendors/${vendorId}/outstation-km-limits`),
        api(`/vendors/${vendorId}/local-km-limits`),
      ]);
  await fetchDropdowns();
      setDriverCostRows((dc as any[]).map(r => ({
        id: Number(r.vendor_vehicle_type_ID),
        vehicleType: String(r.vehicle_type_id),
        vehicleTypeId: r.vehicle_type_id,
        driverBhatta: String(r.driver_batta ?? r.driver_bhatta ?? 0),
        foodCost: String(r.food_cost),
        accommodationCost: String(r.accomodation_cost ?? r.accommodation_cost ?? 0),
        extraCost: String(r.extra_cost),
        morningCharges: String(r.driver_early_morning_charges ?? r.morning_charges ?? 0),
        eveningCharges: String(r.driver_evening_charges ?? r.evening_charges ?? 0),
      })));
      setOutstationRows((out as any[]).map(r => ({
        id: Number(r.kms_limit_id),
        vehicleType: String(r.vehicle_type_id),
        vehicleTypeId: Number(r.vehicle_type_id),
        title: r.kms_limit_title,
        limit: String(r.kms_limit),
        status: Number(r.status) === 1 ? "Active" : "Inactive",
      })));
      setLocalRows((loc as any[]).map(r => ({
        id: Number(r.time_limit_id),
        vehicleType: String(r.vehicle_type_id),
        vehicleTypeId: Number(r.vehicle_type_id),
        title: r.time_limit_title,
        hours: String(r.hours_limit),
        km: String(r.km_limit),
        status: Number(r.status) === 1 ? "Active" : "Inactive",
      })));
    } catch (e) {
      console.error("Failed to fetch vehicle type costs", e);
    } finally {
      setLoading(false);
    }
  };
  const fetchDropdowns = async () => {
    try {
      const vtRes = await api("/dropdowns/vehicle-types");
      const items = (
  (vtRes as any)?.items ??
  (vtRes as any)?.data ??
  (vtRes as any)?.result ??
  vtRes ??
  []
) as any[];
      setVehicleTypeOptions(
        items
  .map((v) => ({
    id: String(v.id ?? v.vehicle_type_id ?? v.value ?? ""),
    label: String(
      v.label ??
        v.vehicle_type_title ??
        v.vehicle_type_name ??
        v.name ??
        v.title ??
        ""
    ),
  }))
  .filter((v) => v.id && v.label)
      );
    } catch (e) {
      console.error("Failed to fetch dropdowns", e);
    }
  };
  // ====== Helpers for tables (simple client-side search) ======
  const filteredDriverCostRows = useMemo(() => {
    if (!driverCostSearch.trim()) return driverCostRows;
    const q = driverCostSearch.toLowerCase();
    return driverCostRows.filter(
      (row) => {
        const vtLabel = vehicleTypeOptions.find(o => o.id === row.vehicleType)?.label || "";
        return vtLabel.toLowerCase().includes(q) || row.driverBhatta.toLowerCase().includes(q);
      }
    );
  }, [driverCostRows, driverCostSearch, vehicleTypeOptions]);
  const filteredOutstationRows = useMemo(() => {
    if (!outstationSearch.trim()) return outstationRows;
    const q = outstationSearch.toLowerCase();
    return outstationRows.filter(
      (row) => {
        const vtLabel = vehicleTypeOptions.find(o => o.id === row.vehicleType)?.label || "";
        return vtLabel.toLowerCase().includes(q) || row.title.toLowerCase().includes(q);
      }
    );
  }, [outstationRows, outstationSearch, vehicleTypeOptions]);
 const filteredLocalRows = useMemo(() => {
  if (!localSearch.trim()) return localRows;
  const q = localSearch.toLowerCase();
  return localRows.filter((row) => {
    const vtLabel =
      vehicleTypeOptions.find((o) => o.id === row.vehicleType)?.label || "";
    return (
      vtLabel.toLowerCase().includes(q) ||
      row.title.toLowerCase().includes(q)
    );
  });
}, [localRows, localSearch, vehicleTypeOptions]);
const driverCostVehicleTypeOptions = useMemo(() => {
  const selectedVehicleTypeIds = new Set(
    driverCostRows.map((row) => String(row.vehicleTypeId))
  );
  return vehicleTypeOptions.filter((option) =>
    selectedVehicleTypeIds.has(String(option.id))
  );
}, [driverCostRows, vehicleTypeOptions]);
// ============================================================
// Driver Cost modal handlers
// ============================================================
 const openAddDriverCost = () => {
  setEditingDriverRow(null);
  setDriverFormVehicleType("");
  setDriverFormFields({
    driverBhatta: "0",
    foodCost: "0",
    accommodationCost: "0",
    extraCost: "0",
    morningCharges: "0",
    eveningCharges: "0",
  });
  setDriverFieldErrors({});
  setShowDriverCostModal(true);
};
 const openEditDriverCost = (row: DriverCostRow) => {
  setEditingDriverRow(row);
  setDriverFormVehicleType(row.vehicleType);
  setDriverFormFields({
    driverBhatta: row.driverBhatta || "0",
    foodCost: row.foodCost || "0",
    accommodationCost: row.accommodationCost || "0",
    extraCost: row.extraCost || "0",
    morningCharges: row.morningCharges || "0",
    eveningCharges: row.eveningCharges || "0",
  });
  setDriverFieldErrors({});
  setShowDriverCostModal(true);
};
  const handleSaveDriverCost = async () => {
    if (!vendorId) return;
 const errors: DriverFieldErrors = {};
if (!String(driverFormVehicleType ?? "").trim()) {
  errors.vehicleType = "This value is required.";
}
if (Object.keys(errors).length > 0) {
  setDriverFieldErrors(errors);
  return;
}
setDriverFieldErrors({});
setSaving(true);
try {
 const payload = {
vehicle_type_id: Number(driverFormVehicleType),
driver_bhatta: numberOrZero(driverFormFields.driverBhatta),
food_cost: numberOrZero(driverFormFields.foodCost),
accommodation_cost: numberOrZero(driverFormFields.accommodationCost),
extra_cost: numberOrZero(driverFormFields.extraCost),
morning_charges: numberOrZero(driverFormFields.morningCharges),
evening_charges: numberOrZero(driverFormFields.eveningCharges),
};
await api(
  editingDriverRow
    ? `/vendors/${vendorId}/vehicle-type-costs/${editingDriverRow.id}`
    : `/vendors/${vendorId}/vehicle-type-costs`,
  {
    method: editingDriverRow ? "PATCH" : "POST",
    body: JSON.stringify(payload),
  }
);
      await fetchData();
      setDriverFieldErrors({});
      setShowDriverCostModal(false);
    } catch (e) {
      console.error("Failed to save driver cost", e);
    } finally {
      setSaving(false);
    }
  };
const handleDeleteDriverCost = async (rowId: number) => {
  setSaving(true);
  try {
    if (vendorId) {
      await api(`/vendors/${vendorId}/vehicle-type-costs/${rowId}`, {
        method: "DELETE",
      });
    }
    setDriverCostRows((prev) => prev.filter((row) => row.id !== rowId));
    toast.success("Deleted successfully");
  } catch (e) {
    console.error("Failed to delete driver cost", e);
    // Keep UI delete working even if backend DELETE route is missing
      toast.error("Delete failed. Backend API is not deleting this record.");
  } finally {
    setSaving(false);
  }
};
  // ============================================================
  // Outstation KM modal handlers
  // ============================================================
  const openAddOutstation = () => {
    setEditingOutstationRow(null);
    setOutstationFormVehicleType("");
    setOutstationFormFields({ title: "", limit: "" });
    setOutstationFieldErrors({});
    setOutstationSaveLocked(false);
    setShowOutstationModal(true);
  };
  const openEditOutstation = (row: OutstationKmLimitRow) => {
    setEditingOutstationRow(row);
    setOutstationFormVehicleType(row.vehicleType);
    setOutstationFormFields({ title: row.title, limit: row.limit });
    setOutstationFieldErrors({});
    setOutstationSaveLocked(false);
    setShowOutstationModal(true);
  };
  const handleSaveOutstation = async () => {
    if (!vendorId) return;
    if (outstationSaveLocked) return;
    const errors: OutstationFieldErrors = {};
    if (!String(outstationFormVehicleType ?? "").trim()) {
      errors.vehicleType = "This value is required.";
    }
    if (!String(outstationFormFields.title ?? "").trim()) {
      errors.title = "This value is required.";
    }
    if (!isValidNumberInput(outstationFormFields.limit)) {
      errors.limit = "Please enter valid KM limit";
    }
    if (Object.keys(errors).length > 0) {
      setOutstationFieldErrors(errors);
      return;
    }
    setOutstationFieldErrors({});
    setSaving(true);
    try {
      await api(`/vendors/${vendorId}/outstation-km-limits`, {
        method: "POST",
        body: JSON.stringify({
          out_km_id: editingOutstationRow?.id,
          vehicle_type_id: Number(outstationFormVehicleType),
          out_km_title: outstationFormFields.title,
          out_km_limit: Number(outstationFormFields.limit),
          status: 1,
        }),
      });
      await fetchData();
      setOutstationFieldErrors({});
      setShowOutstationModal(false);
    } catch (e) {
      console.error("Failed to save outstation limit", e);
      const vehicleTypeLabel =
        vehicleTypeOptions.find((opt) => opt.id === outstationFormVehicleType)?.label;
      const isDuplicate = showKmLimitSaveErrorToast(e, "Failed to save outstation KM limit", vehicleTypeLabel);
      if (isDuplicate) {
        setOutstationSaveLocked(true);
      }
    } finally {
      setSaving(false);
    }
  };
  const handleDeleteOutstation = async (rowId: number) => {
  if (!vendorId) return;
  setSaving(true);
  try {
    await api(`/vendors/${vendorId}/outstation-km-limits/${rowId}`, {
      method: "DELETE",
    });
    setOutstationRows((prev) => prev.filter((row) => row.id !== rowId));
  } catch (e) {
    console.error("Failed to delete outstation limit", e);
  } finally {
    setSaving(false);
  }
};
  // ============================================================
  // Local KM modal handlers
  // ============================================================
  const openAddLocal = () => {
    setEditingLocalRow(null);
    setLocalFormVehicleType("");
    setLocalFormFields({ title: "", hours: "", km: "" });
    setLocalFieldErrors({});
    setLocalSaveLocked(false);
    setShowLocalModal(true);
  };
  const openEditLocal = (row: LocalKmLimitRow) => {
    setEditingLocalRow(row);
    setLocalFormVehicleType(row.vehicleType);
    setLocalFormFields({
      title: row.title,
      hours: row.hours,
      km: row.km,
    });
    setLocalFieldErrors({});
    setLocalSaveLocked(false);
    setShowLocalModal(true);
  };
  const handleSaveLocal = async () => {
    if (!vendorId) return;
    if (localSaveLocked) return;
    const errors: LocalFieldErrors = {};
    if (!String(localFormVehicleType ?? "").trim()) {
      errors.vehicleType = "This value is required.";
    }
    if (!String(localFormFields.title ?? "").trim()) {
      errors.title = "This value is required.";
    }
    if (!isValidNumberInput(localFormFields.hours)) {
      errors.hours = "Please enter valid hours";
    }
    if (!isValidNumberInput(localFormFields.km)) {
      errors.km = "Please enter valid KM limit";
    }
    if (Object.keys(errors).length > 0) {
      setLocalFieldErrors(errors);
      return;
    }
    setLocalFieldErrors({});
    setSaving(true);
    try {
      await api(`/vendors/${vendorId}/local-km-limits`, {
        method: "POST",
        body: JSON.stringify({
          loc_km_id: editingLocalRow?.id,
          vehicle_type_id: Number(localFormVehicleType),
          loc_km_title: localFormFields.title,
          loc_km_hour: Number(localFormFields.hours),
          loc_km_limit: Number(localFormFields.km),
          status: 1,
        }),
      });
      await fetchData();
      setLocalFieldErrors({});
      setShowLocalModal(false);
    } catch (e) {
      console.error("Failed to save local limit", e);
      const vehicleTypeLabel =
        vehicleTypeOptions.find((opt) => opt.id === localFormVehicleType)?.label;
      const isDuplicate = showKmLimitSaveErrorToast(e, "Failed to save local KM limit", vehicleTypeLabel);
      if (isDuplicate) {
        setLocalSaveLocked(true);
      }
    } finally {
      setSaving(false);
    }
  };
const handleDeleteLocal = async (rowId: number) => {
  if (!vendorId) return;
  setSaving(true);
  try {
    await api(`/vendors/${vendorId}/local-km-limits/${rowId}`, {
      method: "DELETE",
    });
    setLocalRows((prev) => prev.filter((row) => row.id !== rowId));
    toast.success("Deleted successfully");
  } catch (e) {
    console.error("Failed to delete local limit", e);
    toast.error("Delete failed. Backend API is not deleting this record.");
  } finally {
    setSaving(false);
  }
};
  // ============================================================
  // Render helpers
  // ============================================================
  const renderTopTabs = () => (
    <div className="flex border-b border-gray-200 text-sm font-medium">
      <button
        type="button"
        className={`px-4 py-3 border-b-2 transition-colors ${
          activeTab === "driverCost"
            ? "border-pink-500 text-pink-600"
            : "border-transparent text-gray-500 hover:text-pink-600"
        }`}
        onClick={() => setActiveTab("driverCost")}
      >
        Driver Cost
      </button>
      <button
        type="button"
        className={`px-4 py-3 border-b-2 transition-colors ${
          activeTab === "outstation"
            ? "border-pink-500 text-pink-600"
            : "border-transparent text-gray-500 hover:text-pink-600"
        }`}
        onClick={() => setActiveTab("outstation")}
      >
        Outstation KM Limit
      </button>
      <button
        type="button"
        className={`px-4 py-3 border-b-2 transition-colors ${
          activeTab === "local"
            ? "border-pink-500 text-pink-600"
            : "border-transparent text-gray-500 hover:text-pink-600"
        }`}
        onClick={() => setActiveTab("local")}
      >
        Local KM Limit
      </button>
    </div>
  );
  const renderTableHeader = (cols: string[]) => (
    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
      <tr>
        {cols.map((col) => (
          <th
            key={col}
            className="px-4 py-3 border-b border-gray-200 font-semibold text-left"
          >
            {col}
          </th>
        ))}
      </tr>
    </thead>
  );
    const getVehicleTypeLabel = (row: DriverCostRow) =>
    vehicleTypeOptions.find((o) => o.id === row.vehicleType)?.label ||
    row.vehicleType;
  const driverCostExportRows = filteredDriverCostRows.map((row, index) => ({
    "S.NO": index + 1,
    "VEHICLE TYPE": getVehicleTypeLabel(row),
    "DRIVER BHATTA(\u20B9)": row.driverBhatta,
    "FOOD COST(\u20B9)": row.foodCost,
    "ACCOMODATION COST(\u20B9)": row.accommodationCost,
    "EXTRA COST(\u20B9)": row.extraCost,
    "MORNING CHARGES(\u20B9)": row.morningCharges,
    "EVENING CHARGES(\u20B9)": row.eveningCharges,
  }));
  const handleCopyDriverCost = async () => {
    const text = driverCostExportRows
      .map((row) => Object.values(row).join("\t"))
      .join("\n");
    await navigator.clipboard.writeText(text);
    toast.success("Copied successfully");
  };
  const handleDownloadDriverCostCsv = () => {
    const headers = Object.keys(driverCostExportRows[0] || {});
    const csv = [
      headers.join(","),
      ...driverCostExportRows.map((row) =>
        headers
          .map((h) => `"${String((row as any)[h] ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vehicle-type-driver-cost.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  // ============================================================
  // MAIN RENDER
  // ============================================================
  const vehicleTypeCostViewContext = {
    activeTab,
    deleteDriverCostId,
    deleteLocalId,
    deleteOutstationId,
    driverCostRows,
    driverCostSearch,
    driverCostVehicleTypeOptions,
    driverFieldErrors,
    driverFormFields,
    driverFormVehicleType,
    editingDriverRow,
    editingLocalRow,
    editingOutstationRow,
    filteredDriverCostRows,
    filteredLocalRows,
    filteredOutstationRows,
    handleCopyDriverCost,
    handleDeleteDriverCost,
    handleDeleteLocal,
    handleDeleteOutstation,
    handleDownloadDriverCostCsv,
    handleSaveDriverCost,
    handleSaveLocal,
    handleSaveOutstation,
    localFieldErrors,
    localFormFields,
    localFormVehicleType,
    localRows,
    localSaveLocked,
    localSearch,
    onBack,
    onNext,
    openAddDriverCost,
    openAddLocal,
    openAddOutstation,
    openEditDriverCost,
    openEditLocal,
    openEditOutstation,
    outstationFieldErrors,
    outstationFormFields,
    outstationFormVehicleType,
    outstationRows,
    outstationSaveLocked,
    outstationSearch,
    renderTableHeader,
    renderTopTabs,
    saving,
    setDeleteDriverCostId,
    setDeleteLocalId,
    setDeleteOutstationId,
    setDriverCostSearch,
    setDriverFieldErrors,
    setDriverFormFields,
    setDriverFormVehicleType,
    setEditingDriverRow,
    setLocalFieldErrors,
    setLocalFormFields,
    setLocalFormVehicleType,
    setLocalSaveLocked,
    setLocalSearch,
    setOutstationFieldErrors,
    setOutstationFormFields,
    setOutstationFormVehicleType,
    setOutstationSaveLocked,
    setOutstationSearch,
    setShowDriverCostModal,
    setShowLocalModal,
    setShowOutstationModal,
    showDriverCostModal,
    showLocalModal,
    showOutstationModal,
    vehicleTypeOptions,
    vendorId
  };
  return <VendorStepVehicleTypeCostView context={vehicleTypeCostViewContext} />;
};
