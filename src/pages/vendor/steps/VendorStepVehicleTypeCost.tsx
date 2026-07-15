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
    "DRIVER BHATTA(₹)": row.driverBhatta,
    "FOOD COST(₹)": row.foodCost,
    "ACCOMODATION COST(₹)": row.accommodationCost,
    "EXTRA COST(₹)": row.extraCost,
    "MORNING CHARGES(₹)": row.morningCharges,
    "EVENING CHARGES(₹)": row.eveningCharges,
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

  return (
    <Card>
      <CardHeader className="flex flex-col gap-1">
        <CardTitle className="text-pink-600 text-lg">
          Vehicle Type – Driver Cost
        </CardTitle>
        {!vendorId && (
          <p className="text-xs text-red-500">
            Save <span className="font-semibold">Basic Info</span> and{" "}
            <span className="font-semibold">Branch</span> before configuring
            driver cost.
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {renderTopTabs()}

        {/* ---------- DRIVER COST TAB ---------- */}
        {activeTab === "driverCost" && (
          <div className="pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-700">
                List of Vehicle Type - Driver Cost
              </h2>
              <Button
                type="button"
                className="bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-full px-4 py-2 text-sm font-semibold"
                onClick={openAddDriverCost}
                disabled={!vendorId}
              >
                + Add Vehicle Type - Driver Cost
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span>Show</span>
                <select className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                </select>
                <span>entries</span>
              </div>

              <div className="flex items-center gap-2">
                <span>Search:</span>
                <Input
                  value={driverCostSearch}
                  onChange={(e) => setDriverCostSearch(e.target.value)}
                  className="h-8 w-48 text-sm"
                />
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                {renderTableHeader([
                  "S.NO",
                  "ACTION",
                  "VEHICLE TYPE",
                  "DRIVER BHATTA(₹)",
                  "FOOD COST(₹)",
                  "ACCOMODATION COST(₹)",
                  "EXTRA COST(₹)",
                  "MORNING CHARGES(₹)",
                  "EVENING CHARGES(₹)",
                ])}
                <tbody className="bg-white">
                  {filteredDriverCostRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-6 text-center text-sm text-gray-500"
                      >
                        No data available in table
                      </td>
                    </tr>
                  )}
                  {filteredDriverCostRows.map((row, index) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 border-b border-gray-100">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-3 text-xs"
                          type="button"
                          onClick={() => openEditDriverCost(row)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-3 text-xs text-red-600 border-red-200"
                          type="button"
                          onClick={() => setDeleteDriverCostId(row.id)}
                        >
                          Delete
                        </Button>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {vehicleTypeOptions.find(o => o.id === row.vehicleType)?.label || row.vehicleType}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {row.driverBhatta}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {row.foodCost}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {row.accommodationCost}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {row.extraCost}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {row.morningCharges}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {row.eveningCharges}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-500">
              <span>
                Showing 0 to {filteredDriverCostRows.length} of{" "}
                {driverCostRows.length} entries
              </span>
              <div className="flex items-center gap-2">

              <Button
  type="button"
  variant="outline"
  size="sm"
  className="h-8 px-3 text-xs"
  onClick={handleCopyDriverCost}
>
  Copy
</Button>
<Button
  type="button"
  variant="outline"
  size="sm"
  className="h-8 px-3 text-xs"
  onClick={handleDownloadDriverCostCsv}
>
  Excel
</Button>
<Button
  type="button"
  variant="outline"
  size="sm"
  className="h-8 px-3 text-xs"
  onClick={handleDownloadDriverCostCsv}
>
  CSV
</Button>

              </div>
            </div>
          </div>
        )}

        {/* ---------- OUTSTATION KM LIMIT TAB ---------- */}
        {activeTab === "outstation" && (
          <div className="pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-700">
                List of Outstation KM Limit
              </h2>
              <Button
                type="button"
                className="bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-full px-4 py-2 text-sm font-semibold"
                onClick={openAddOutstation}
                disabled={!vendorId}
              >
                + Add Outstation KM Limit
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span>Show</span>
                <select className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                </select>
                <span>entries</span>
              </div>

              <div className="flex items-center gap-2">
                <span>Search:</span>
                <Input
                  value={outstationSearch}
                  onChange={(e) => setOutstationSearch(e.target.value)}
                  className="h-8 w-48 text-sm"
                />
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                {renderTableHeader([
                  "S.NO",
                  "ACTION",
                  "VENDOR",
                  "VEHICLE TYPE",
                  "OUTSTATION KM LIMIT TITLE",
                  "OUTSTATION KM LIMIT",
                  "STATUS",
                ])}
                <tbody className="bg-white">
                  {filteredOutstationRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-6 text-center text-sm text-gray-500"
                      >
                        No data available in table
                      </td>
                    </tr>
                  )}
                  {filteredOutstationRows.map((row, index) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 border-b border-gray-100">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-3 text-xs"
                          type="button"
                          onClick={() => openEditOutstation(row)}
                        >
                          Edit
                        </Button>
                     <Button
  variant="outline"
  size="sm"
  className="h-7 px-3 text-xs text-red-600 border-red-200"
  type="button"
  onClick={() => setDeleteOutstationId(row.id)}
>
  Delete
</Button>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {/* Vendor column: in PHP this is vendor name; here just show current vendorId */}
                        {vendorId ?? "-"}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {vehicleTypeOptions.find(o => o.id === row.vehicleType)?.label || row.vehicleType}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {row.title}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {row.limit}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {row.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-500">
              <span>
                Showing 0 to {filteredOutstationRows.length} of{" "}
                {outstationRows.length} entries
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                >
                  Copy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                >
                  Excel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                >
                  CSV
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ---------- LOCAL KM LIMIT TAB ---------- */}
        {activeTab === "local" && (
          <div className="pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-700">
                List of Local KM Limit
              </h2>
              <Button
                type="button"
                className="bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-full px-4 py-2 text-sm font-semibold"
                onClick={openAddLocal}
                disabled={!vendorId}
              >
                + Add Local KM Limit
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span>Show</span>
                <select className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                </select>
                <span>entries</span>
              </div>

              <div className="flex items-center gap-2">
                <span>Search:</span>
                <Input
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="h-8 w-48 text-sm"
                />
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                {renderTableHeader([
                  "S.NO",
                  "ACTION",
                  "VENDOR",
                  "VEHICLE TYPE",
                  "TITLE",
                  "HOURS",
                  "KM",
                  "STATUS",
                ])}
                <tbody className="bg-white">
                  {filteredLocalRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-6 text-center text-sm text-gray-500"
                      >
                        No data available in table
                      </td>
                    </tr>
                  )}
                  {filteredLocalRows.map((row, index) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 border-b border-gray-100">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-3 text-xs"
                          type="button"
                          onClick={() => openEditLocal(row)}
                        >
                          Edit
                        </Button>
                       <Button
  variant="outline"
  size="sm"
  className="h-7 px-3 text-xs text-red-600 border-red-200"
  type="button"
  onClick={() => setDeleteLocalId(row.id)}
>
  Delete
</Button>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {vendorId ?? "-"}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {vehicleTypeOptions.find(o => o.id === row.vehicleType)?.label || row.vehicleType}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {row.title}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {row.hours}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {row.km}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {row.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-500">
              <span>
                Showing 0 to {filteredLocalRows.length} of {localRows.length}{" "}
                entries
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                >
                  Copy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                >
                  Excel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                >
                  CSV
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER BUTTONS */}
        <div className="mt-6 flex justify-between">
          <Button variant="outline" type="button" onClick={onBack}>
            Back
          </Button>
          <Button
            type="button"
            onClick={onNext}
            disabled={!vendorId}
            className="bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600"
          >
            Continue
          </Button>
        </div>
      </CardContent>

      {/* ============================================================
          MODALS
          ============================================================ */}

      {/* DRIVER COST MODAL */}
      <Dialog
  open={showDriverCostModal}
  onOpenChange={(open) => {
    setShowDriverCostModal(open);
    if (!open) {
      setEditingDriverRow(null);
    }
  }}
>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-800">
              Vehicle Type - Driver Cost
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                Vehicle type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={driverFormVehicleType}
                onValueChange={(value) => {
                  setDriverFormVehicleType(value);
                  setDriverFieldErrors((prev) => ({ ...prev, vehicleType: undefined }));
                }}
              >
                <SelectTrigger
                  className={`w-full ${driverFieldErrors.vehicleType ? "border-red-400 focus-visible:ring-red-300" : ""}`}
                >
                  <SelectValue placeholder="Choose Any One" />
                </SelectTrigger>
   <SelectContent>
  {vehicleTypeOptions.map((v) => (
    <SelectItem key={v.id} value={v.id}>
      {v.label}
    </SelectItem>
  ))}
</SelectContent>
              </Select>
              {driverFieldErrors.vehicleType ? (
                <p className="text-xs text-red-600">{driverFieldErrors.vehicleType}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-1">
  <Label>Driver Bhatta (₹)</Label>
  <Input
    placeholder="Driver Bhatta"
    value={driverFormFields.driverBhatta}
    onChange={(e) => {
      setDriverFormFields((prev) => ({
        ...prev,
        driverBhatta: e.target.value,
      }));
    }}
  />
</div>
            <div className="space-y-1">
  <Label>Driver Food Cost (₹)</Label>
  <Input
    placeholder="Food Cost"
    value={driverFormFields.foodCost}
    onChange={(e) => {
      setDriverFormFields((prev) => ({
        ...prev,
        foodCost: e.target.value,
      }));
    }}
  />
</div>
            <div className="space-y-1">
  <Label>Driver Accomodation Cost (₹)</Label>
  <Input
    placeholder="Accomodation Cost"
    value={driverFormFields.accommodationCost}
    onChange={(e) => {
      setDriverFormFields((prev) => ({
        ...prev,
        accommodationCost: e.target.value,
      }));
    }}
  />
</div>
            <div className="space-y-1">
  <Label>Extra Cost (₹)</Label>
  <Input
    placeholder="Extra Cost"
    value={driverFormFields.extraCost}
    onChange={(e) => {
      setDriverFormFields((prev) => ({
        ...prev,
        extraCost: e.target.value,
      }));
    }}
  />
</div>
              <div className="space-y-1">
  <Label>Early Morning Charges Per Hour (Before 6 AM) (₹)</Label>
  <Input
    placeholder="Early Morning Charges"
    value={driverFormFields.morningCharges}
    onChange={(e) => {
      setDriverFormFields((prev) => ({
        ...prev,
        morningCharges: e.target.value,
      }));
    }}
  />
</div>
              <div className="space-y-1">
  <Label>Evening Charges Per Hour (After 8 PM) (₹)</Label>
  <Input
    placeholder="Evening Charges"
    value={driverFormFields.eveningCharges}
    onChange={(e) => {
      setDriverFormFields((prev) => ({
        ...prev,
        eveningCharges: e.target.value,
      }));
    }}
  />
</div>
            </div>
          </div>

          <DialogFooter className="mt-6 flex justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              className="bg-gray-100 text-gray-700 px-6"
              onClick={() => setShowDriverCostModal(false)}
            >
              Cancel
            </Button>
           <Button
  type="button"
  className="bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 px-8"
  onClick={handleSaveDriverCost}
  disabled={saving}
>
  {saving ? "Saving..." : editingDriverRow ? "Update" : "Save"}
</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OUTSTATION KM LIMIT MODAL */}
      <Dialog
        open={showOutstationModal}
        onOpenChange={(open) => {
          setShowOutstationModal(open);
          if (!open) {
            setOutstationSaveLocked(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-800">
              {editingOutstationRow
                ? "Update Outstation KM Limit"
                : "Add Outstation KM Limit"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label>
                Vehicle type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={outstationFormVehicleType}
                onValueChange={(value) => {
                  setOutstationSaveLocked(false);
                  setOutstationFormVehicleType(value);
                  setOutstationFieldErrors((prev) => ({ ...prev, vehicleType: undefined }));
                }}
              >
                <SelectTrigger
                  className={`w-full ${outstationFieldErrors.vehicleType ? "border-red-400 focus-visible:ring-red-300" : ""}`}
                >
                  <SelectValue placeholder="Choose Vehicle Type" />
                </SelectTrigger>
                <SelectContent>
  {driverCostVehicleTypeOptions.length === 0 ? (
    <div className="px-3 py-2 text-sm text-gray-500">
      Add vehicle type in Driver Cost first
    </div>
  ) : (
    driverCostVehicleTypeOptions.map((v) => (
      <SelectItem key={v.id} value={v.id}>
        {v.label}
      </SelectItem>
    ))
  )}
</SelectContent>
              </Select>
              {outstationFieldErrors.vehicleType ? (
                <p className="text-xs text-red-600">{outstationFieldErrors.vehicleType}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <Label>
                Outstation KM Limit Title{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Outstation KM Limit Title"
                className={outstationFieldErrors.title ? "border-red-400 focus-visible:ring-red-300" : ""}
                value={outstationFormFields.title}
                onChange={(e) => {
                  setOutstationSaveLocked(false);
                  setOutstationFormFields((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }));
                  setOutstationFieldErrors((prev) => ({ ...prev, title: undefined }));
                }}
              />
              {outstationFieldErrors.title ? (
                <p className="text-xs text-red-600">{outstationFieldErrors.title}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <Label>
                Outstation KM Limit <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Outstation KM Limit"
                className={outstationFieldErrors.limit ? "border-red-400 focus-visible:ring-red-300" : ""}
                value={outstationFormFields.limit}
                onChange={(e) => {
                  setOutstationSaveLocked(false);
                  setOutstationFormFields((prev) => ({
                    ...prev,
                    limit: e.target.value,
                  }));
                  setOutstationFieldErrors((prev) => ({ ...prev, limit: undefined }));
                }}
              />
              {outstationFieldErrors.limit ? (
                <p className="text-xs text-red-600">{outstationFieldErrors.limit}</p>
              ) : null}
            </div>
          </div>

          <DialogFooter className="mt-6 flex justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              className="bg-gray-100 text-gray-700 px-6"
              onClick={() => setShowOutstationModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 px-8"
              onClick={handleSaveOutstation}
              disabled={saving || outstationSaveLocked}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LOCAL KM LIMIT MODAL */}
      <Dialog
        open={showLocalModal}
        onOpenChange={(open) => {
          setShowLocalModal(open);
          if (!open) {
            setLocalSaveLocked(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-800">
              {editingLocalRow ? "Update Local KM Limit" : "Add Local KM Limit"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label>
                Vehicle type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={localFormVehicleType}
                onValueChange={(value) => {
                  setLocalSaveLocked(false);
                  setLocalFormVehicleType(value);
                  setLocalFieldErrors((prev) => ({ ...prev, vehicleType: undefined }));
                }}
              >
                <SelectTrigger
                  className={`w-full ${localFieldErrors.vehicleType ? "border-red-400 focus-visible:ring-red-300" : ""}`}
                >
                  <SelectValue placeholder="Choose Vehicle Type" />
                </SelectTrigger>
                <SelectContent>
  {driverCostVehicleTypeOptions.length === 0 ? (
    <div className="px-3 py-2 text-sm text-gray-500">
      Add vehicle type in Driver Cost first
    </div>
  ) : (
    driverCostVehicleTypeOptions.map((v) => (
      <SelectItem key={v.id} value={v.id}>
        {v.label}
      </SelectItem>
    ))
  )}
</SelectContent>
              </Select>
              {localFieldErrors.vehicleType ? (
                <p className="text-xs text-red-600">{localFieldErrors.vehicleType}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <Label>
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Enter Title"
                className={localFieldErrors.title ? "border-red-400 focus-visible:ring-red-300" : ""}
                value={localFormFields.title}
                onChange={(e) => {
                  setLocalSaveLocked(false);
                  setLocalFormFields((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }));
                  setLocalFieldErrors((prev) => ({ ...prev, title: undefined }));
                }}
              />
              {localFieldErrors.title ? (
                <p className="text-xs text-red-600">{localFieldErrors.title}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>
                  Hours <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Enter Hours"
                  className={localFieldErrors.hours ? "border-red-400 focus-visible:ring-red-300" : ""}
                value={localFormFields.hours}
                onChange={(e) => {
                  setLocalSaveLocked(false);
                  setLocalFormFields((prev) => ({
                    ...prev,
                    hours: e.target.value,
                  }));
                    setLocalFieldErrors((prev) => ({ ...prev, hours: undefined }));
                  }}
                />
                {localFieldErrors.hours ? (
                  <p className="text-xs text-red-600">{localFieldErrors.hours}</p>
                ) : null}
              </div>
              <div className="space-y-1">
                <Label>
                  Kilometer(KM) <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="KM Limit"
                  className={localFieldErrors.km ? "border-red-400 focus-visible:ring-red-300" : ""}
                value={localFormFields.km}
                onChange={(e) => {
                  setLocalSaveLocked(false);
                  setLocalFormFields((prev) => ({
                    ...prev,
                    km: e.target.value,
                  }));
                    setLocalFieldErrors((prev) => ({ ...prev, km: undefined }));
                  }}
                />
                {localFieldErrors.km ? (
                  <p className="text-xs text-red-600">{localFieldErrors.km}</p>
                ) : null}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 flex justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              className="bg-gray-100 text-gray-700 px-6"
              onClick={() => setShowLocalModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 px-8"
              onClick={handleSaveLocal}
              disabled={saving || localSaveLocked}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>

        
           </Dialog>

      {deleteDriverCostId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-[380px] rounded-lg bg-white px-7 py-6 text-center shadow-xl">
            <div className="mb-3 text-4xl text-gray-500">🗑️</div>

            <h2 className="text-xl font-semibold text-gray-700">
              Are you sure?
            </h2>

            <p className="mt-3 text-sm text-gray-600">
              Do you really want to delete this record?
            </p>
            <p className="mt-2 text-sm font-semibold text-red-600">
              All related local and outstation rates will be permanently deleted.
            </p>
            <p className="text-sm text-gray-600">
              This process cannot be undone. Do you want to continue?
            </p>

            <div className="mt-6 flex justify-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDeleteDriverCostId(null)}
              >
                Close
              </Button>

              <Button
                type="button"
                className="bg-red-500 text-white hover:bg-red-600"
                onClick={async () => {
                  await handleDeleteDriverCost(deleteDriverCostId);
                  setDeleteDriverCostId(null);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>        
      )}
    
     {deleteOutstationId !== null && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div className="w-[380px] rounded-lg bg-white px-7 py-6 text-center shadow-xl">
      <div className="mb-3 text-4xl text-gray-500">🗑️</div>

      <h2 className="text-xl font-semibold text-gray-700">
        Are you sure?
      </h2>

      <p className="mt-3 text-sm text-gray-600">
        Do you really want to delete this record?
      </p>
      <p className="text-sm text-gray-600">
        This process cannot be undone.
      </p>

      <div className="mt-6 flex justify-center gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setDeleteOutstationId(null)}
        >
          Close
        </Button>

        <Button
          type="button"
          className="bg-red-500 text-white hover:bg-red-600"
          onClick={async () => {
            await handleDeleteOutstation(deleteOutstationId);
            setDeleteOutstationId(null);
          }}
        >
          Delete
        </Button>
      </div>
    </div>
  </div>
)}

{deleteLocalId !== null && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div className="w-[380px] rounded-lg bg-white px-7 py-6 text-center shadow-xl">
      <div className="mb-3 text-4xl text-gray-500">🗑️</div>

      <h2 className="text-xl font-semibold text-gray-700">
        Are you sure?
      </h2>

      <p className="mt-3 text-sm text-gray-600">
        Do you really want to delete this record?
      </p>
      <p className="text-sm text-gray-600">
        This process cannot be undone.
      </p>

      <div className="mt-6 flex justify-center gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setDeleteLocalId(null)}
        >
          Close
        </Button>

        <Button
          type="button"
          className="bg-red-500 text-white hover:bg-red-600"
          onClick={async () => {
            await handleDeleteLocal(deleteLocalId);
            setDeleteLocalId(null);
          }}
        >
          Delete
        </Button>
      </div>
    </div>
  </div>
)}
</Card>
  );
};
