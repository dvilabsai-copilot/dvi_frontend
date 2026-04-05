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

export const VendorStepVehicleTypeCost: React.FC<Props> = ({
  vendorId,
  onBack,
  onNext,
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("driverCost");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
    driverBhatta: "",
    foodCost: "",
    accommodationCost: "",
    extraCost: "",
    morningCharges: "",
    eveningCharges: "",
  });

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

  useEffect(() => {
    if (vendorId) {
      fetchData();
      fetchDropdowns();
    }
  }, [vendorId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dc, out, loc] = await Promise.all([
  api(`/vendors/${vendorId}/vehicle-types`),
  api(`/vendors/${vendorId}/pricebook/outstation`),
  api(`/vendors/${vendorId}/pricebook/local`),
]);

      setDriverCostRows(
  (dc as any[]).map((r) => ({
    id: Number(r.vendor_vehicle_type_ID ?? 0),
    vehicleType: String(r.vehicle_type_id ?? ""),
    vehicleTypeId: Number(r.vehicle_type_id ?? 0),
    driverBhatta: String(r.driver_batta ?? 0),
    foodCost: String(r.food_cost ?? 0),
    accommodationCost: String(r.accomodation_cost ?? 0),
    extraCost: String(r.extra_cost ?? 0),
    morningCharges: String(r.driver_early_morning_charges ?? 0),
    eveningCharges: String(r.driver_evening_charges ?? 0),
  }))
);

      setOutstationRows((out as any[]).map(r => ({
        id: r.out_km_id,
        vehicleType: String(r.vehicle_type_id),
        vehicleTypeId: r.vehicle_type_id,
        title: r.out_km_title,
        limit: String(r.out_km_limit),
        status: r.status === 0 ? "Active" : "Inactive",
      })));

      setLocalRows((loc as any[]).map(r => ({
        id: r.loc_km_id,
        vehicleType: String(r.vehicle_type_id),
        vehicleTypeId: r.vehicle_type_id,
        title: r.loc_km_title,
        hours: String(r.loc_km_hour),
        km: String(r.loc_km_limit),
        status: r.status === 0 ? "Active" : "Inactive",
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
      setVehicleTypeOptions(vtRes as Option[]);
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
    return localRows.filter(
      (row) => {
        const vtLabel = vehicleTypeOptions.find(o => o.id === row.vehicleType)?.label || "";
        return vtLabel.toLowerCase().includes(q) || row.title.toLowerCase().includes(q);
      }
    );
  }, [localRows, localSearch, vehicleTypeOptions]);

  // ============================================================
  // Driver Cost modal handlers
  // ============================================================

  const openAddDriverCost = () => {
    setEditingDriverRow(null);
    setDriverFormVehicleType("");
    setDriverFormFields({
      driverBhatta: "",
      foodCost: "",
      accommodationCost: "",
      extraCost: "",
      morningCharges: "",
      eveningCharges: "",
    });
    setShowDriverCostModal(true);
  };

  const openEditDriverCost = (row: DriverCostRow) => {
    setEditingDriverRow(row);
    setDriverFormVehicleType(row.vehicleType);
    setDriverFormFields({
      driverBhatta: row.driverBhatta,
      foodCost: row.foodCost,
      accommodationCost: row.accommodationCost,
      extraCost: row.extraCost,
      morningCharges: row.morningCharges,
      eveningCharges: row.eveningCharges,
    });
    setShowDriverCostModal(true);
  };

 const handleSaveDriverCost = async () => {
  if (!driverFormVehicleType || !vendorId) return;

  setSaving(true);

  try {
    const driverBhattaNum = Number(driverFormFields.driverBhatta);
const foodCostNum = Number(driverFormFields.foodCost);
const accommodationCostNum = Number(driverFormFields.accommodationCost);
const extraCostNum = Number(driverFormFields.extraCost);
const morningChargesNum = Number(driverFormFields.morningCharges);
const eveningChargesNum = Number(driverFormFields.eveningCharges);

if (
  !Number.isFinite(driverBhattaNum) ||
  !Number.isFinite(foodCostNum) ||
  !Number.isFinite(accommodationCostNum) ||
  !Number.isFinite(extraCostNum) ||
  !Number.isFinite(morningChargesNum) ||
  !Number.isFinite(eveningChargesNum)
) {
  alert("Please enter only numeric values in all cost fields.");
  setSaving(false);
  return;
}

await api(`/vendors/${vendorId}/vehicle-types`, {
  method: "POST",
  body: JSON.stringify({
    vehicle_type_id: Number(driverFormVehicleType),
    driver_batta: driverBhattaNum,
    food_cost: foodCostNum,
    accomodation_cost: accommodationCostNum,
    extra_cost: extraCostNum,
    driver_early_morning_charges: morningChargesNum,
    driver_evening_charges: eveningChargesNum,
  }),
});
    await fetchData();
    setShowDriverCostModal(false);
    setEditingDriverRow(null);
  } catch (e) {
    console.error("Failed to save driver cost", e);
  } finally {
    setSaving(false);
  }
};

  const handleDeleteDriverCost = async (rowId: number) => {
    // Backend doesn't have delete yet, but we can just re-save with 0 or ignore
    // For now, just UI delete
    setDriverCostRows((prev) => prev.filter((row) => row.id !== rowId));
  };

  // ============================================================
  // Outstation KM modal handlers
  // ============================================================

  const openAddOutstation = () => {
    setEditingOutstationRow(null);
    setOutstationFormVehicleType("");
    setOutstationFormFields({ title: "", limit: "" });
    setShowOutstationModal(true);
  };

  const openEditOutstation = (row: OutstationKmLimitRow) => {
    setEditingOutstationRow(row);
    setOutstationFormVehicleType(row.vehicleType);
    setOutstationFormFields({ title: row.title, limit: row.limit });
    setShowOutstationModal(true);
  };

  const handleSaveOutstation = async () => {
  if (!outstationFormVehicleType || !vendorId) return;
  setSaving(true);
  try {
    await api(`/vendors/${vendorId}/pricebook/outstation`, {
      method: "POST",
      body: JSON.stringify({
        vehicle_type_id: Number(outstationFormVehicleType),
        out_km_title: outstationFormFields.title,
        out_km_limit: Number(outstationFormFields.limit),
        status: 0,
      }),
    });
    await fetchData();
    setShowOutstationModal(false);
  } catch (e) {
    console.error("Failed to save outstation limit", e);
  } finally {
    setSaving(false);
  }
};

  const handleDeleteOutstation = (rowId: number) => {
    setOutstationRows((prev) => prev.filter((row) => row.id !== rowId));
  };

  // ============================================================
  // Local KM modal handlers
  // ============================================================

  const openAddLocal = () => {
    setEditingLocalRow(null);
    setLocalFormVehicleType("");
    setLocalFormFields({ title: "", hours: "", km: "" });
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
    setShowLocalModal(true);
  };

  const handleSaveLocal = async () => {
  if (!localFormVehicleType || !vendorId) return;
  setSaving(true);
  try {
    await api(`/vendors/${vendorId}/pricebook/local`, {
      method: "POST",
      body: JSON.stringify({
        vehicle_type_id: Number(localFormVehicleType),
        loc_km_title: localFormFields.title,
        loc_km_hour: Number(localFormFields.hours),
        loc_km_limit: Number(localFormFields.km),
        status: 0,
      }),
    });
    await fetchData();
    setShowLocalModal(false);
  } catch (e) {
    console.error("Failed to save local limit", e);
  } finally {
    setSaving(false);
  }
};

  const handleDeleteLocal = (rowId: number) => {
    setLocalRows((prev) => prev.filter((row) => row.id !== rowId));
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
                          onClick={() => handleDeleteDriverCost(row.id)}
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
                          onClick={() => handleDeleteOutstation(row.id)}
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
                          onClick={() => handleDeleteLocal(row.id)}
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
                onValueChange={setDriverFormVehicleType}
              >
                <SelectTrigger className="w-full">
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>
                  Driver Bhatta (₹) <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Driver Bhatta"
                  value={driverFormFields.driverBhatta}
                  onChange={(e) =>
                    setDriverFormFields((prev) => ({
                      ...prev,
                      driverBhatta: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>
                  Driver Food Cost (₹) <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Food Cost"
                  value={driverFormFields.foodCost}
                  onChange={(e) =>
                    setDriverFormFields((prev) => ({
                      ...prev,
                      foodCost: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>
                  Driver Accomodation Cost (₹){" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Accomodation Cost"
                  value={driverFormFields.accommodationCost}
                  onChange={(e) =>
                    setDriverFormFields((prev) => ({
                      ...prev,
                      accommodationCost: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>
                  Extra Cost (₹) <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Extra Cost"
                  value={driverFormFields.extraCost}
                  onChange={(e) =>
                    setDriverFormFields((prev) => ({
                      ...prev,
                      extraCost: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>
                  Early Morning Charges Per Hour (Before 6 AM) (₹){" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Early Morning Charges"
                  value={driverFormFields.morningCharges}
                  onChange={(e) =>
                    setDriverFormFields((prev) => ({
                      ...prev,
                      morningCharges: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>
                  Evening Charges Per Hour (After 8 PM) (₹){" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Evening Charges"
                  value={driverFormFields.eveningCharges}
                  onChange={(e) =>
                    setDriverFormFields((prev) => ({
                      ...prev,
                      eveningCharges: e.target.value,
                    }))
                  }
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
        onOpenChange={setShowOutstationModal}
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
                onValueChange={setOutstationFormVehicleType}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose Vehicle Type" />
                </SelectTrigger>
                <SelectContent>
                  {vehicleTypeOptions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>
                Outstation KM Limit Title{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Outstation KM Limit Title"
                value={outstationFormFields.title}
                onChange={(e) =>
                  setOutstationFormFields((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label>
                Outstation KM Limit <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Outstation KM Limit"
                value={outstationFormFields.limit}
                onChange={(e) =>
                  setOutstationFormFields((prev) => ({
                    ...prev,
                    limit: e.target.value,
                  }))
                }
              />
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
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LOCAL KM LIMIT MODAL */}
      <Dialog open={showLocalModal} onOpenChange={setShowLocalModal}>
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
                onValueChange={setLocalFormVehicleType}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose Vehicle Type" />
                </SelectTrigger>
                <SelectContent>
                  {vehicleTypeOptions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Enter Title"
                value={localFormFields.title}
                onChange={(e) =>
                  setLocalFormFields((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>
                  Hours <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Enter Hours"
                  value={localFormFields.hours}
                  onChange={(e) =>
                    setLocalFormFields((prev) => ({
                      ...prev,
                      hours: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>
                  Kilometer(KM) <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="KM Limit"
                  value={localFormFields.km}
                  onChange={(e) =>
                    setLocalFormFields((prev) => ({
                      ...prev,
                      km: e.target.value,
                    }))
                  }
                />
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
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
