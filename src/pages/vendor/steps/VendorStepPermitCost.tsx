// FILE: src/pages/vendor/steps/VendorStepPermitCost.tsx

import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { toast } from "sonner";
import { Eye, Pencil, Trash2 } from "lucide-react";

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
  vendorVehicleTypeId: number;
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
  const [deletingRow, setDeletingRow] = useState<PermitRow | null>(null);

 // Dropdowns
const [vehicleTypeOptions, setVehicleTypeOptions] = useState<Option[]>([]);
const [driverCostVehicleTypeIds, setDriverCostVehicleTypeIds] = useState<
  number[]
>([]);
const [stateOptions, setStateOptions] = useState<Option[]>([]);

  /** ---------- ADD FORM STATE ---------- */
  const [permitForm, setPermitForm] = useState({
    vehicleType: "",
    state: "",
  });

  const [destinationCosts, setDestinationCosts] = useState<{
  [key: string]: string;
}>({});

// Vehicle Type dropdown
const [isVehicleTypeDropdownOpen, setIsVehicleTypeDropdownOpen] =
  useState(false);
const [vehicleTypeSearchText, setVehicleTypeSearchText] = useState("");
const [highlightedVehicleTypeIndex, setHighlightedVehicleTypeIndex] =
  useState(0);
const vehicleTypeListRef = useRef<HTMLDivElement | null>(null);

// State dropdown
const [isPermitStateDropdownOpen, setIsPermitStateDropdownOpen] =
  useState(false);
const [permitStateSearchText, setPermitStateSearchText] = useState("");
const [highlightedPermitStateIndex, setHighlightedPermitStateIndex] =
  useState(0);
const permitStateListRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (vendorId) {
      fetchPermitCosts();
      fetchDropdowns();
    }
  }, [vendorId]);

  useEffect(() => {
    const vehicleTypeId = Number(permitForm.vehicleType);
    const sourceStateId = Number(permitForm.state);

    if (!vendorId || !vehicleTypeId || !sourceStateId) {
      setDestinationCosts({});
      return;
    }

    let cancelled = false;

    const loadSelectedPermitCosts = async () => {
      try {
        const data = (await api(`/vendors/${vendorId}/permit-costs`)) as any[];
        if (cancelled) return;

        const costs: { [key: string]: string } = {};
        data.forEach((pc: any) => {
          if (
            Number(pc.vehicle_type_id) === vehicleTypeId &&
            Number(pc.source_state_id) === sourceStateId &&
            pc.permit_cost !== null &&
            pc.permit_cost !== undefined
          ) {
            costs[String(pc.destination_state_id)] = String(pc.permit_cost);
          }
        });
        setDestinationCosts(costs);
      } catch (e) {
        if (!cancelled) {
          console.error("Failed to fetch permit costs for selected vehicle and state", e);
          setDestinationCosts({});
        }
      }
    };

    void loadSelectedPermitCosts();

    return () => {
      cancelled = true;
    };
  }, [vendorId, permitForm.vehicleType, permitForm.state]);

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
            vendorVehicleTypeId: pc.vendor_vehicle_type_id ?? pc.vehicle_type_id,
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
    const [vtRes, driverCostRes, sRes] = await Promise.all([
      api("/dropdowns/vehicle-types"),
      api(`/vendors/${vendorId}/vehicle-type-costs`),
      api("/dropdowns/permit-states"),
    ]);

    const vehicleItems = ((vtRes as any)?.items ?? vtRes ?? []) as any[];
    const driverCostItems = (driverCostRes ?? []) as any[];
    const stateItems = ((sRes as any)?.items ?? sRes ?? []) as any[];

    setVehicleTypeOptions(
      vehicleItems
        .map((v: any) => ({
          id: String(v.id ?? v.vehicle_type_id ?? ""),
          label: String(
            v.label ??
              v.name ??
              v.vehicle_type_title ??
              v.vehicle_type_name ??
              ""
          ),
        }))
        .filter((v: Option) => v.id && v.label)
    );

    setDriverCostVehicleTypeIds(
      Array.from(
        new Set(
          driverCostItems
            .map((row: any) => Number(row.vehicle_type_id))
            .filter((id: number) => Number.isFinite(id) && id > 0)
        )
      )
    );

    setStateOptions(
      stateItems
        .map((s: any) => ({
          id: String(s.id ?? s.state_id ?? ""),
          label: String(s.label ?? s.name ?? s.state_name ?? ""),
        }))
        .filter((s: Option) => s.id && s.label)
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
  };

  const resetPermitEditor = () => {
    setPermitForm({ vehicleType: "", state: "" });
    setDestinationCosts({});
    setIsAddMode(false);
  };

 const filteredRows = useMemo(() => {
  if (!searchText.trim()) return rows;
  const q = searchText.toLowerCase();

  return rows.filter((r) => {
    const vtLabel =
      vehicleTypeOptions.find((o) => o.id === r.vehicleType)?.label || "";

    const sLabel =
      stateOptions.find((o) => o.id === r.sourceState)?.label || "";

    return (
      vtLabel.toLowerCase().includes(q) ||
      sLabel.toLowerCase().includes(q)
    );
  });
}, [rows, searchText, vehicleTypeOptions, stateOptions]);

const permitVehicleTypeOptions = useMemo(() => {
  const configuredIds = new Set(
    driverCostVehicleTypeIds.map((id) => String(id))
  );

  return vehicleTypeOptions.filter((option) =>
    configuredIds.has(String(option.id))
  );
}, [vehicleTypeOptions, driverCostVehicleTypeIds]);

const selectedVehicleTypeLabel =
  permitVehicleTypeOptions.find(
    (vehicle) => vehicle.id === permitForm.vehicleType
  )?.label || "";

const filteredPermitVehicleTypeOptions = useMemo(() => {
  const query = vehicleTypeSearchText.trim().toLowerCase();

  if (!query) return permitVehicleTypeOptions;

  return permitVehicleTypeOptions.filter((vehicle) =>
    vehicle.label.toLowerCase().includes(query)
  );
}, [permitVehicleTypeOptions, vehicleTypeSearchText]);

const handleVehicleTypeSelect = (vehicleTypeId: string) => {
  handleFormChange("vehicleType", vehicleTypeId);
  setVehicleTypeSearchText("");
  setIsVehicleTypeDropdownOpen(false);
};

const handleVehicleTypeKeyDown = (
  e: React.KeyboardEvent<HTMLInputElement>
) => {
  if (!filteredPermitVehicleTypeOptions.length) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();

    setHighlightedVehicleTypeIndex((prev) => {
      const nextIndex =
        prev >= filteredPermitVehicleTypeOptions.length - 1 ? 0 : prev + 1;

      requestAnimationFrame(() => {
        const listEl = vehicleTypeListRef.current;
        const itemEl = listEl?.querySelector<HTMLElement>(
          `[data-vehicle-type-index="${nextIndex}"]`
        );

        itemEl?.scrollIntoView({
          block: "nearest",
        });
      });

      return nextIndex;
    });
  }

  if (e.key === "ArrowUp") {
    e.preventDefault();

    setHighlightedVehicleTypeIndex((prev) => {
      const nextIndex =
        prev <= 0 ? filteredPermitVehicleTypeOptions.length - 1 : prev - 1;

      requestAnimationFrame(() => {
        const listEl = vehicleTypeListRef.current;
        const itemEl = listEl?.querySelector<HTMLElement>(
          `[data-vehicle-type-index="${nextIndex}"]`
        );

        itemEl?.scrollIntoView({
          block: "nearest",
        });
      });

      return nextIndex;
    });
  }

  if (e.key === "Enter") {
    e.preventDefault();

    const selectedVehicle =
      filteredPermitVehicleTypeOptions[highlightedVehicleTypeIndex];

    if (selectedVehicle) {
      handleVehicleTypeSelect(selectedVehicle.id);
    }
  }

  if (e.key === "Escape") {
    setIsVehicleTypeDropdownOpen(false);
  }
};

const selectedPermitStateLabel =
  stateOptions.find((state) => state.id === permitForm.state)?.label || "";

const destinationStateOptions = useMemo(
  () => stateOptions.filter((state) => state.id !== permitForm.state),
  [stateOptions, permitForm.state],
);

const filteredPermitStateOptions = useMemo(() => {
  const query = permitStateSearchText.trim().toLowerCase();

  if (!query) return stateOptions;

  return stateOptions.filter((state) =>
    state.label.toLowerCase().includes(query)
  );
}, [stateOptions, permitStateSearchText]);

const handlePermitStateSelect = (stateId: string) => {
  handleFormChange("state", stateId);
  setPermitStateSearchText("");
  setIsPermitStateDropdownOpen(false);
};

const handlePermitStateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (!filteredPermitStateOptions.length) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();

    setHighlightedPermitStateIndex((prev) => {
      const nextIndex =
        prev >= filteredPermitStateOptions.length - 1 ? 0 : prev + 1;

      requestAnimationFrame(() => {
        const listEl = permitStateListRef.current;
        const itemEl = listEl?.querySelector<HTMLElement>(
          `[data-permit-state-index="${nextIndex}"]`
        );

        itemEl?.scrollIntoView({
          block: "nearest",
        });
      });

      return nextIndex;
    });
  }

  if (e.key === "ArrowUp") {
    e.preventDefault();

    setHighlightedPermitStateIndex((prev) => {
      const nextIndex =
        prev <= 0 ? filteredPermitStateOptions.length - 1 : prev - 1;

      requestAnimationFrame(() => {
        const listEl = permitStateListRef.current;
        const itemEl = listEl?.querySelector<HTMLElement>(
          `[data-permit-state-index="${nextIndex}"]`
        );

        itemEl?.scrollIntoView({
          block: "nearest",
        });
      });

      return nextIndex;
    });
  }

  if (e.key === "Enter") {
    e.preventDefault();

    const selectedState = filteredPermitStateOptions[highlightedPermitStateIndex];
    if (selectedState) {
      handlePermitStateSelect(selectedState.id);
    }
  }

  if (e.key === "Escape") {
    setIsPermitStateDropdownOpen(false);
  }
};

  const handleSavePermit = async () => {
    if (!vendorId) return;

    setSaving(true);
    try {
      const items = destinationStateOptions.map((state) => {
        const rawCost = String(destinationCosts[state.id] ?? "").trim();
        const permitCost = rawCost === "" ? 0 : Number(rawCost);
        if (!Number.isFinite(permitCost) || permitCost < 0) {
          throw new Error(`Permit cost for ${state.label} must be zero or greater`);
        }
        return {
          vehicle_type_id: Number(permitForm.vehicleType),
          source_state_id: Number(permitForm.state),
          destination_state_id: Number(state.id),
          permit_cost: permitCost,
        };
      });

      await api(`/vendors/${vendorId}/permit-costs`, {
        method: "POST",
        body: JSON.stringify({ items }),
      });
      await fetchPermitCosts();
      setIsAddMode(false);
      toast.success("Permit cost saved successfully");
    } catch (e) {
      console.error("Failed to save permit costs", e);
      toast.error(e instanceof Error ? e.message : "Failed to save permit costs");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (row: PermitRow) => {
    setPermitForm({
      vehicleType: String(row.vehicleTypeId),
      state: String(row.sourceStateId),
    });
    setIsAddMode(true);
  };

  const handleDeletePermitGroup = async (row: PermitRow) => {
    if (!vendorId) return;
    setSaving(true);
    try {
      await api(
        `/vendors/${vendorId}/permit-costs?vendor_vehicle_type_id=${row.vendorVehicleTypeId}&source_state_id=${row.sourceStateId}`,
        { method: "DELETE" },
      );
      toast.success("Deleted successfully");
      setDeletingRow(null);
      await fetchPermitCosts();
    } catch (e: any) {
      console.error("Failed to delete permit cost group", e);
      toast.error(e?.message || "Failed to delete permit cost.");
    } finally {
      setSaving(false);
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
                    <div className="flex items-center gap-3 text-gray-500">
                      <button
                        type="button"
                        className="transition hover:text-gray-700"
                        aria-label={`View permit cost ${idx + 1}`}
                        onClick={() => handleEdit(row)}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="transition hover:text-purple-600"
                        aria-label={`Edit permit cost ${idx + 1}`}
                        onClick={() => handleEdit(row)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="transition hover:text-red-600"
                        aria-label={`Delete permit cost ${idx + 1}`}
                        onClick={() => setDeletingRow(row)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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
          onClick={resetPermitEditor}
        >
          Back To List
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-1">
  <Label>Vehicle Type</Label>

  <div
    className="relative"
    onBlur={(e) => {
      const nextFocusedElement = e.relatedTarget as Node | null;

      if (
        !nextFocusedElement ||
        !e.currentTarget.contains(nextFocusedElement)
      ) {
        setIsVehicleTypeDropdownOpen(false);
      }
    }}
  >
    <button
      type="button"
      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-left text-sm"
      onClick={() => {
        setIsVehicleTypeDropdownOpen((prev) => !prev);
        setHighlightedVehicleTypeIndex(0);
      }}
    >
      <span
        className={
          selectedVehicleTypeLabel ? "text-gray-900" : "text-gray-500"
        }
      >
        {selectedVehicleTypeLabel || "Choose Vehicle Type"}
      </span>

      <span className="text-gray-500">⌄</span>
    </button>

    {isVehicleTypeDropdownOpen ? (
      <div className="absolute left-0 top-[46px] z-[100] w-full rounded-xl border border-purple-200 bg-white p-2 shadow-lg">
        <Input
          value={vehicleTypeSearchText}
          onChange={(e) => {
            setVehicleTypeSearchText(e.target.value);
            setHighlightedVehicleTypeIndex(0);
          }}
          onKeyDown={handleVehicleTypeKeyDown}
          placeholder="Type to search..."
          className="mb-2 h-12 rounded-lg border-purple-400 text-sm focus-visible:ring-2 focus-visible:ring-purple-500"
          autoFocus
        />

        <div
          ref={vehicleTypeListRef}
          className="max-h-60 overflow-y-auto pr-1"
        >
          {filteredPermitVehicleTypeOptions.length > 0 ? (
            filteredPermitVehicleTypeOptions.map((vehicle, index) => {
              const isHighlighted =
                index === highlightedVehicleTypeIndex;
              const isSelected =
                permitForm.vehicleType === vehicle.id;

              return (
                <button
                  key={vehicle.id}
                  type="button"
                  data-vehicle-type-index={index}
                  className={`block w-full rounded-md px-3 py-2 text-left text-sm ${
                    isHighlighted || isSelected
                      ? "bg-purple-100 text-purple-700"
                      : "text-gray-800 hover:bg-purple-50"
                  }`}
                  onMouseEnter={() =>
                    setHighlightedVehicleTypeIndex(index)
                  }
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() =>
                    handleVehicleTypeSelect(vehicle.id)
                  }
                >
                  {vehicle.label}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-3 text-sm text-gray-500">
              No vehicle types found
            </div>
          )}
        </div>
      </div>
    ) : null}
  </div>
</div>

        <div className="space-y-1">
          <Label>
            State
          </Label>
<div
  className="relative"
  onBlur={(e) => {
    const nextFocusedElement = e.relatedTarget as Node | null;

    if (!nextFocusedElement || !e.currentTarget.contains(nextFocusedElement)) {
      setIsPermitStateDropdownOpen(false);
    }
  }}
>
  <button
    type="button"
    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-left text-sm"
    onClick={() => {
  setIsPermitStateDropdownOpen((prev) => !prev);
  setHighlightedPermitStateIndex(0);
}}
  >
    <span className={selectedPermitStateLabel ? "text-gray-900" : "text-gray-500"}>
      {selectedPermitStateLabel || "Select Any One"}
    </span>
    <span className="text-gray-500">⌄</span>
  </button>

  {isPermitStateDropdownOpen ? (
    <div className="absolute left-0 top-[46px] z-50 w-full rounded-xl border border-purple-200 bg-white p-2 shadow-lg">
      <Input
  value={permitStateSearchText}
  onChange={(e) => {
    setPermitStateSearchText(e.target.value);
    setHighlightedPermitStateIndex(0);
  }}
  onKeyDown={handlePermitStateKeyDown}
  placeholder="Type to search..."
  className="mb-2 h-12 rounded-lg border-purple-400 text-sm focus-visible:ring-2 focus-visible:ring-purple-500"
  autoFocus
/>

      <div ref={permitStateListRef} className="max-h-60 overflow-y-auto pr-1">
        {filteredPermitStateOptions.length > 0 ? (
filteredPermitStateOptions.map((state, index) => {
  const isHighlighted = index === highlightedPermitStateIndex;
  const isSelected = permitForm.state === state.id;

  return (
    <button
  key={state.id}
  type="button"
  data-permit-state-index={index}
      className={`block w-full rounded-md px-3 py-2 text-left text-sm ${
        isHighlighted || isSelected
          ? "bg-purple-100 text-purple-700"
          : "text-gray-800 hover:bg-purple-50"
      }`}
      onMouseEnter={() => setHighlightedPermitStateIndex(index)}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => handlePermitStateSelect(state.id)}
    >
      {state.label}
    </button>
  );
})
        ) : (
          <div className="px-3 py-3 text-sm text-gray-500">
            No states found
          </div>
        )}
      </div>
    </div>
  ) : null}
</div>
        </div>
      </div>

      {/* Destination States Grid */}
      {permitForm.state && (
        <div className="mt-6">
          <h3 className="mb-4 text-md font-semibold text-gray-700">Destination State Permit Costs</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto p-2 border rounded-md">
            {destinationStateOptions.map((state) => (
              <div key={state.id} className="flex items-center gap-2">
                <Label className="w-32 text-xs truncate">{state.label}</Label>
                <Input 
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Cost" 
                  className="h-8 text-xs"
                  value={destinationCosts[state.id] ?? ""}
                  onChange={(e) => {
                    setDestinationCosts(prev => ({...prev, [state.id]: e.target.value}));
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 flex justify-between">
        <Button
          type="button"
          variant="outline"
          className="bg-gray-100 px-8"
          onClick={resetPermitEditor}
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

        {deletingRow !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-[380px] rounded-lg bg-white px-7 py-6 text-center shadow-xl">
              <div className="mb-3 flex justify-center text-red-500">
                <Trash2 className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-semibold text-gray-700">Are you sure?</h2>
              <p className="mt-3 text-sm text-gray-600">Do you really want to delete this record?</p>
              <p className="text-sm text-gray-600">This process cannot be undone.</p>

              <div className="mt-6 flex justify-center gap-3">
                <Button type="button" variant="secondary" onClick={() => setDeletingRow(null)} disabled={saving}>
                  Close
                </Button>
                <Button
                  type="button"
                  className="bg-red-500 text-white hover:bg-red-600"
                  onClick={() => handleDeletePermitGroup(deletingRow)}
                  disabled={saving}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
