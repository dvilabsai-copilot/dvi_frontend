// FILE: src/pages/vendor/steps/VendorStepPermitCost.tsx

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
import { api } from "@/lib/api";
import { Option } from "../vendorFormTypes";

type Props = {
  vendorId?: number;
  onBack: () => void;
  onNext: () => void;
};

type PermitRow = {
  id: number;
  vehicleType: string;
  sourceState: string;
  vehicleTypeId: number;
  sourceStateId: number;
};

const gradientButton =
  "bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600";

export const VendorStepPermitCost: React.FC<Props> = ({
  vendorId,
  onBack,
  onNext,
}) => {
  /** ---------- TABLE + FILTER STATE ---------- */
  const [rows, setRows] = useState<PermitRow[]>([]);
  const [entriesPerPage] = useState(10);
  const [searchText, setSearchText] = useState("");
  const [isAddMode, setIsAddMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dropdowns
  const [vehicleTypeOptions, setVehicleTypeOptions] = useState<Option[]>([]);
  const [stateOptions, setStateOptions] = useState<Option[]>([]);

  /** ---------- ADD FORM STATE ---------- */
  const [permitForm, setPermitForm] = useState({
    vehicleType: "",
    state: "",
  });
  const [permitFieldErrors, setPermitFieldErrors] = useState<Partial<Record<"vehicleType" | "state", string>>>({});
  const [destinationCostError, setDestinationCostError] = useState("");

  const [destinationCosts, setDestinationCosts] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (vendorId) {
      fetchPermitCosts();
      fetchDropdowns();
    }
  }, [vendorId]);

  const fetchPermitCosts = async () => {
    setLoading(true);
    try {
      const data = (await api(`/vendors/${vendorId}/permit-costs`)) as any[];
      // Group by vehicle type and source state for the list view
      const grouped: { [key: string]: PermitRow } = {};
      data.forEach((pc: any) => {
        const key = `${pc.vehicle_type_id}-${pc.source_state_id}`;
        if (!grouped[key]) {
          grouped[key] = {
            id: pc.permit_cost_id,
            vehicleType: String(pc.vehicle_type_id),
            sourceState: String(pc.source_state_id),
            vehicleTypeId: pc.vehicle_type_id,
            sourceStateId: pc.source_state_id,
          };
        }
      });
      setRows(Object.values(grouped));
    } catch (e) {
      console.error("Failed to fetch permit costs", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [vtRes, sRes] = await Promise.all([
        api("/dropdowns/vehicle-types"),
        api("/dropdowns/permit-states"),
      ]);
      const vehicleItems = ((vtRes as any)?.items ?? vtRes ?? []) as any[];
      const stateItems = ((sRes as any)?.items ?? sRes ?? []) as any[];

      setVehicleTypeOptions(
        vehicleItems.map((v: any) => ({
          id: String(v.id ?? v.vehicle_type_id ?? ""),
          label: String(v.label ?? v.name ?? v.vehicle_type_title ?? ""),
        }))
      );
      setStateOptions(
        stateItems.map((s: any) => ({
          id: String(s.id ?? s.state_id ?? ""),
          label: String(s.label ?? s.name ?? s.state_name ?? ""),
        }))
      );
    } catch (e) {
      console.error("Failed to fetch dropdowns", e);
    }
  };

  const handleFormChange = (
    field: keyof typeof permitForm,
    value: string
  ): void => {
    setPermitForm((prev) => ({ ...prev, [field]: value }));
    setPermitFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setDestinationCostError("");
    if (field === "state" || field === "vehicleType") {
      // Fetch existing costs for this combination if editing
      // For now, just clear
      setDestinationCosts({});
    }
  };

  const filteredRows = useMemo(() => {
    if (!searchText.trim()) return rows;
    const q = searchText.toLowerCase();
    return rows.filter(
      (r) => {
        const vtLabel = vehicleTypeOptions.find(o => o.id === r.vehicleType)?.label || "";
        const sLabel = stateOptions.find(o => o.id === r.sourceState)?.label || "";
        return vtLabel.toLowerCase().includes(q) || sLabel.toLowerCase().includes(q);
      }
    );
  }, [rows, searchText, vehicleTypeOptions, stateOptions]);

  const handleSavePermit = async () => {
    if (!vendorId) return;

    const fieldErrors: Partial<Record<"vehicleType" | "state", string>> = {};
    if (!String(permitForm.vehicleType ?? "").trim()) fieldErrors.vehicleType = "This value is required.";
    if (!String(permitForm.state ?? "").trim()) fieldErrors.state = "This value is required.";

    if (Object.keys(fieldErrors).length > 0) {
      setPermitFieldErrors(fieldErrors);
      return;
    }
    setPermitFieldErrors({});

    const hasAnyDestinationCost = Object.values(destinationCosts).some((cost) =>
      String(cost ?? "").trim()
    );

    if (!hasAnyDestinationCost) {
      setDestinationCostError("Please enter at least one destination state permit cost.");
      return;
    }

    setDestinationCostError("");
    setSaving(true);
    try {
      // In legacy PHP, it saves multiple destination states.
      // My backend updateVendorPermitCost currently handles one at a time.
      // I should probably update the backend to handle multiple or loop here.
      // I'll loop here for now to match the UI.
      for (const destStateId in destinationCosts) {
        const cost = destinationCosts[destStateId];
        if (cost) {
          await api(`/vendors/${vendorId}/permit-costs`, {
            method: "POST",
            body: JSON.stringify({
              vehicle_type_id: Number(permitForm.vehicleType),
              source_state_id: Number(permitForm.state),
              destination_state_id: Number(destStateId),
              permit_cost: Number(cost),
            }),
          });
        }
      }
      await fetchPermitCosts();
      setPermitFieldErrors({});
      setDestinationCostError("");
      setIsAddMode(false);
    } catch (e) {
      console.error("Failed to save permit costs", e);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (row: PermitRow) => {
    setPermitForm({
      vehicleType: String(row.vehicleTypeId),
      state: String(row.sourceStateId),
    });
    setIsAddMode(true);
    setLoading(true);
    try {
      const data = (await api(`/vendors/${vendorId}/permit-costs`)) as any[];
      const costs: { [key: string]: string } = {};
      data.forEach((pc: any) => {
        if (pc.vehicle_type_id === row.vehicleTypeId && pc.source_state_id === row.sourceStateId) {
          costs[pc.destination_state_id] = String(pc.permit_cost);
        }
      });
      setDestinationCosts(costs);
    } catch (e) {
      console.error("Failed to fetch permit costs for edit", e);
    } finally {
      setLoading(false);
    }
  };

  /** ---------- LIST VIEW (matches PHP “Permit Details” screen) ---------- */
  const renderListView = () => (
    <>
      <h2 className="mb-4 text-lg font-semibold text-pink-600">
        Permit Details
      </h2>

      <div className="mb-4 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-sm">
          <span>Show</span>
          <select
            className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            value={entriesPerPage}
            onChange={() => {}}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span>entries</span>
        </div>

        <div className="flex items-center gap-4">
          <Button
            type="button"
            className="bg-purple-100 px-5 text-sm font-semibold text-purple-700 hover:bg-purple-200"
            onClick={() => {
              setPermitForm({ vehicleType: "", state: "" });
              setDestinationCosts({});
              setPermitFieldErrors({});
              setDestinationCostError("");
              setIsAddMode(true);
            }}
            disabled={!vendorId}
          >
            + Add Permit Cost
          </Button>

          <div className="flex items-center gap-2 text-sm">
            <span>Search:</span>
            <Input
              className="h-9 w-56 text-sm"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">S.NO</th>
              <th className="px-4 py-3 text-left font-semibold">
                VIEW&amp;EDIT PERMITCOST
              </th>
              <th className="px-4 py-3 text-left font-semibold">
                VEHICLE TYPE
              </th>
              <th className="px-4 py-3 text-left font-semibold">
                SOURCE STATE
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-sm text-gray-500"
                >
                  No data available in table
                </td>
              </tr>
            ) : (
              filteredRows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="border-b border-gray-100 px-4 py-3">
                    {idx + 1}
                  </td>
                  <td className="border-b border-gray-100 px-4 py-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs"
                      onClick={() => handleEdit(row)}
                    >
                      View &amp; Edit
                    </Button>
                  </td>
                  <td className="border-b border-gray-100 px-4 py-3">
                    {vehicleTypeOptions.find(o => o.id === row.vehicleType)?.label || row.vehicleType}
                  </td>
                  <td className="border-b border-gray-100 px-4 py-3">
                    {stateOptions.find(o => o.id === row.sourceState)?.label || row.sourceState}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-col items-start justify-between gap-3 text-xs text-gray-500 sm:flex-row sm:items-center">
        <span>
          Showing 0 to {filteredRows.length} of {rows.length} entries
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-4 text-xs"
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-4 text-xs"
          >
            Next
          </Button>
        </div>
      </div>

      {/* Bottom navigation (Back + Submit) */}
      <div className="mt-8 flex justify-between">
        <Button
          variant="outline"
          type="button"
          className="bg-gray-100 px-8"
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={!vendorId}
          className={`${gradientButton} px-10`}
        >
          Save & Next
        </Button>
      </div>
    </>
  );

  /** ---------- ADD FORM VIEW (matches PHP “Add Permit Cost”) ---------- */
  const renderAddView = () => (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-pink-600">
          Add Permit Cost
        </h2>
        <Button
          type="button"
          variant="outline"
          className="bg-gray-100 px-6"
          onClick={() => {
            setPermitFieldErrors({});
            setDestinationCostError("");
            setIsAddMode(false);
          }}
        >
          Back To List
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-1">
          <Label>
            Vehicle Type <span className="text-red-500">*</span>
          </Label>
          <Select
            value={permitForm.vehicleType}
            onValueChange={(v) => handleFormChange("vehicleType", v)}
          >
            <SelectTrigger className={permitFieldErrors.vehicleType ? "border-red-400 focus-visible:ring-red-300" : ""}>
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
          {permitFieldErrors.vehicleType ? (
            <p className="text-xs text-red-600">{permitFieldErrors.vehicleType}</p>
          ) : null}
        </div>

        <div className="space-y-1">
          <Label>
            State <span className="text-red-500">*</span>
          </Label>
          <Select
            value={permitForm.state}
            onValueChange={(v) => handleFormChange("state", v)}
          >
            <SelectTrigger className={permitFieldErrors.state ? "border-red-400 focus-visible:ring-red-300" : ""}>
              <SelectValue placeholder="Select Any One" />
            </SelectTrigger>
            <SelectContent>
              {stateOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {permitFieldErrors.state ? (
            <p className="text-xs text-red-600">{permitFieldErrors.state}</p>
          ) : null}
        </div>
      </div>

      {/* Destination States Grid */}
      {permitForm.state && (
        <div className="mt-6">
          <h3 className="mb-4 text-md font-semibold text-gray-700">Destination State Permit Costs</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto p-2 border rounded-md">
            {stateOptions.map((state) => (
              <div key={state.id} className="flex items-center gap-2">
                <Label className="w-32 text-xs truncate">{state.label}</Label>
                <Input 
                  type="number" 
                  placeholder="Cost" 
                  className="h-8 text-xs"
                  value={destinationCosts[state.id] || ""}
                  onChange={(e) => {
                    setDestinationCostError("");
                    setDestinationCosts(prev => ({...prev, [state.id]: e.target.value}));
                  }}
                />
              </div>
            ))}
          </div>
          {destinationCostError ? (
            <p className="mt-2 text-xs text-red-600">{destinationCostError}</p>
          ) : null}
        </div>
      )}

      <div className="mt-10 flex justify-between">
        <Button
          type="button"
          variant="outline"
          className="bg-gray-100 px-8"
          onClick={() => {
            setPermitFieldErrors({});
            setDestinationCostError("");
            setIsAddMode(false);
          }}
        >
          Back To List
        </Button>
        <Button
          type="button"
          className={`${gradientButton} px-10`}
          onClick={handleSavePermit}
          disabled={!vendorId}
        >
          Save
        </Button>
      </div>
    </>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-pink-600">Permit Cost</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!vendorId && (
          <p className="text-sm text-red-500">
            Save Basic Info first before configuring permit cost.
          </p>
        )}

        {!isAddMode ? renderListView() : renderAddView()}
      </CardContent>
    </Card>
  );
};
