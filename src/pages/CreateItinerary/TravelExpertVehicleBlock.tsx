// FILE: src/pages/CreateItinerary/VehicleBlock.tsx

import "./TravelExpertToursVehicleAgentV6.css"; // DVI_TE_TOURS_VEHICLE_AGENT_V6
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronDown, Trash2 } from "lucide-react";
import { SimpleOption } from "@/services/itineraryDropdownsMock";
import { getVehicleOptionCapacity } from "./helpers/createItinerary.utils";
import "./TravelExpertToursVehicleLayoutV4.css"; // DVI_TE_TOURS_VEHICLE_LAYOUT_V4
import { useToast } from "@/components/ui/use-toast";

type VehicleRow = {
  id: number;
  type: string; // vehicle_type_id from DB as string
  count: number;
};

type ValidationErrors = {
  [key: string]: string;
};

type VehicleBlockProps = {
  vehicleTypes: SimpleOption[]; // fetched via fetchVehicleTypes()
  selectedVehicleIds: string[]; // accepts pre-selected IDs from API
  vehicles: VehicleRow[];
  setVehicles: React.Dispatch<React.SetStateAction<VehicleRow[]>>;

  // now optional so CreateItinerary can pass only what it has
  itineraryPreference?: "vehicle" | "hotel" | "both";
  addVehicle?: () => void;
  removeVehicle?: (id: number) => void;

  // optional validation
  validationErrors?: ValidationErrors;
  travelExpertCabs?: boolean;
  autoMatchPax?: boolean;
  totalTravellingPax?: number;
};

type VehicleTypeSelectProps = {
  value: string;
  options: SimpleOption[];
  disabled: boolean;
  onChange: (value: string) => void;
  onUnavailableOpen: () => void;
  travelExpertCabs?: boolean;
  fullVehicleList?: boolean;
};

const VehicleTypeSelect = ({
  value,
  options,
  disabled,
  onChange,
  onUnavailableOpen,
  travelExpertCabs = false,
  fullVehicleList = false,
}: VehicleTypeSelectProps) => {
  const [open, setOpen] = useState(false);
  const selectedOptionRef = useRef<HTMLButtonElement | null>(null);
  const selectedOption = options.find((option) => String(option.id) === value);
  // DVI_TE_AUTO_VEHICLE_MATCH_V1: smallest known passenger capacity first, stable for unknown sizes.
  const displayOptions = fullVehicleList
    ? [...options].sort((a, c) => {
        const ac = getVehicleOptionCapacity(a) ?? Number.POSITIVE_INFINITY;
        const bc = getVehicleOptionCapacity(c) ?? Number.POSITIVE_INFINITY;
        return ac - bc || String(a.label || "").localeCompare(String(c.label || ""));
      })
    : options;

  useEffect(() => {
    if (!open) return;

    // The selected item may be near the end of a long list. Keep it visible
    // whenever the menu opens without moving the page itself.
    const frame = window.requestAnimationFrame(() => {
      selectedOptionRef.current?.scrollIntoView({ block: "nearest" });
      selectedOptionRef.current?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, value, options]);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen && disabled) {
          onUnavailableOpen();
          return;
        }
        setOpen(nextOpen);
      }}
      modal={false}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          title={selectedOption?.label || "Select Vehicle Type"}
          className="flex h-9 w-full max-w-full items-center justify-between rounded-md border border-[#e5d7f6] bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="truncate text-left">
            {selectedOption?.label ??
              (value ? "Selected vehicle type is unavailable" : "Select Vehicle Type")}
          </span>
          <ChevronDown className="h-4 w-4 flex-shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        sticky="always"
        collisionPadding={8}
        className={`z-[100] max-h-[min(22rem,calc(100vh-1rem))] w-[var(--radix-popover-trigger-width)] overflow-y-auto p-1 ${travelExpertCabs ? "dvi-te-cabs-dropdown" : ""}`}
        style={fullVehicleList ? { width: "min(19rem, calc(100vw - 24px))", maxHeight: "min(16rem, calc(100dvh - 48px))", overflowY: "auto", overscrollBehavior: "contain", zIndex: 2600 } : undefined}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div role="listbox" aria-label="Vehicle Type">
          {displayOptions.map((option) => {
            const optionValue = String(option.id);
            const isSelected = optionValue === value;

            return (
              <button
                key={option.id}
                ref={isSelected ? selectedOptionRef : undefined}
                type="button"
                role="option"
                aria-selected={isSelected}
                className="relative flex w-full items-center rounded-sm py-1.5 pl-8 pr-2 text-left text-sm outline-none hover:bg-violet-50 focus:bg-violet-50 focus:text-violet-700"
                onClick={() => {
                  onChange(optionValue);
                  setOpen(false);
                }}
              >
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                  {isSelected && <Check className="h-4 w-4" />}
                </span>
                <span className={fullVehicleList ? "min-w-0 flex-1 whitespace-normal break-words font-medium leading-5" : "truncate"} title={option.label}>{option.label}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const VehicleBlock = ({
  itineraryPreference,
  vehicles,
  setVehicles,
  vehicleTypes,
  selectedVehicleIds,
  addVehicle,
  removeVehicle,
  validationErrors,
  travelExpertCabs = false,
  autoMatchPax = false,
  totalTravellingPax = 0,
}: VehicleBlockProps) => {
  const { toast } = useToast();

  const pref = itineraryPreference ?? "both";
  const showVehicleBlock = pref === "vehicle" || pref === "both";

  const hasVehicleTypes = vehicleTypes && vehicleTypes.length > 0;

  useEffect(() => {
    if (
      selectedVehicleIds.length > 0 &&
      vehicles.length > 0 &&
      !vehicles[0].type
    ) {
      setVehicles((prev) =>
        prev.map((v, idx) =>
          idx === 0 && !v.type ? { ...v, type: selectedVehicleIds[0] } : v
        )
      );
    }
  }, [selectedVehicleIds, vehicles.length, setVehicles]);


  // DVI_TE_AUTO_VEHICLE_MATCH_V3: change vehicle when guest totals change; never guess unknown capacities.
  // Keep existing valid manual multi-vehicle selections unless they become insufficient.
  const lastAutoMatchedPaxRef = useRef<number | null>(null);
  useEffect(() => {
    const pax = Math.max(0, Math.ceil(Number(totalTravellingPax) || 0));
    if (!autoMatchPax || pax <= 0) {
      lastAutoMatchedPaxRef.current = null;
      return;
    }
    if (!hasVehicleTypes) return;
    const available = vehicleTypes
      .map((option) => ({ option, capacity: getVehicleOptionCapacity(option) }))
      .filter((item): item is { option: SimpleOption; capacity: number } =>
        item.capacity !== null && item.capacity > 0,
      )
      .sort((a, b) => a.capacity - b.capacity || String(a.option.label || "").localeCompare(String(b.option.label || "")));
    if (!available.length) return;

    const previousPax = lastAutoMatchedPaxRef.current;
    const guestCountChanged = previousPax !== null && previousPax !== pax;
    lastAutoMatchedPaxRef.current = pax;

    setVehicles((previous) => {
      if (!previous.length) return previous;
      const capacityOf = (row: VehicleRow) => {
        const option = vehicleTypes.find((item) => String(item.id) === String(row.type || ""));
        return getVehicleOptionCapacity(option);
      };
      const rowSeats = (row: VehicleRow) => {
        const capacity = capacityOf(row);
        const count = Number(row.count);
        return capacity !== null && Number.isInteger(count) && count > 0
          ? capacity * count : 0;
      };
      const knownAndValid = previous.every((row) => !!row.type && rowSeats(row) > 0);
      const existingSeats = previous.reduce((sum, row) => sum + rowSeats(row), 0);

      // Preserve manually assembled combinations if they fit.
      if (previous.length > 1 && knownAndValid && existingSeats >= pax) return previous;
      // No traveller change: preserve any valid selection, including a larger preferred car.
      if (!guestCountChanged && knownAndValid && existingSeats >= pax) return previous;

      const lastIndex = previous.length - 1;
      const seatsInOtherRows = previous.slice(0, lastIndex).reduce((sum, row) => sum + rowSeats(row), 0);
      const needed = Math.max(1, pax - seatsInOtherRows);
      const recommendation = available.find((item) => item.capacity >= needed) || available[available.length - 1];
      const nextType = String(recommendation.option.id);
      const nextCount = Math.max(1, Math.ceil(needed / recommendation.capacity));
      const last = previous[lastIndex];
      if (String(last.type || "") === nextType && Number(last.count) === nextCount) return previous;
      return previous.map((row, index) => index === lastIndex
        ? { ...row, type: nextType, count: nextCount }
        : row);
    });
  }, [autoMatchPax, totalTravellingPax, hasVehicleTypes, vehicleTypes, setVehicles]);

  // Keep hook order stable across renders; conditionally render only after hooks.
  if (!showVehicleBlock) {
    return null;
  }

  const internalAddVehicle = () => {
    setVehicles((prev) => [
      ...prev,
      {
        id: prev.length ? prev[prev.length - 1].id + 1 : 1,
        type: "",
        count: 1,
      },
    ]);
  };

  const internalRemoveVehicle = (id: number) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  };

  const vehicleTypeError = validationErrors?.vehicleType;

  return (
    <Card className={(autoMatchPax && !travelExpertCabs ? "dvi-te-tours-vehicle-v4 border border-[#efdef8] rounded-lg bg-white shadow-none" : "border border-[#efdef8] rounded-lg bg-white shadow-none") + (pref === "both" && !travelExpertCabs ? " dvi-te-v6-vehicle-root" : "")}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-[#4a4260]">
          Vehicle
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {autoMatchPax && !travelExpertCabs && totalTravellingPax > 0 && (
          <div role="status" aria-live="polite" className="rounded-lg bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-800">
            Vehicle recommendation adjusts to {totalTravellingPax} travelling passenger{totalTravellingPax === 1 ? "" : "s"}.
          </div>
        )}
        {/* DVI_TE_CABS_HORIZONTAL_THREE_VEHICLES_V1: one to three boxes on one horizontal line */}
        <div className={(autoMatchPax && !travelExpertCabs ? "dvi-te-tours-vehicle-grid-v4 grid grid-cols-1 md:grid-cols-2 gap-3" : travelExpertCabs ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" : "space-y-4") + (pref === "both" && !travelExpertCabs ? " dvi-te-v6-vehicle-grid" : "")}>
        {vehicles.map((vehicle, idx) => (
          <div
            key={vehicle.id}
            className={(autoMatchPax && !travelExpertCabs ? "dvi-te-tours-vehicle-card-v4 relative w-full min-w-0 rounded-md border border-[#f1d8ff] p-3 pt-8" : "min-w-0 border border-[#f1d8ff] rounded-md p-3") + (pref === "both" && !travelExpertCabs ? " dvi-te-v6-vehicle-card" : "")}
           style={autoMatchPax && !travelExpertCabs ? { position: "relative" } : undefined}>
            <div className={autoMatchPax && !travelExpertCabs ? "h-0" : "flex items-center justify-between mb-3"}>
              <p className={autoMatchPax && !travelExpertCabs ? "sr-only" : "text-sm font-medium text-[#4a4260]"}>
                Vehicle #{idx + 1}
              </p>
              {vehicles.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    (removeVehicle ?? internalRemoveVehicle)(vehicle.id)
                  }
                  className={(autoMatchPax && !travelExpertCabs ? "!absolute !right-2 !left-auto !top-2 z-20 flex h-8 w-8 items-center justify-center text-rose-600 hover:bg-rose-50" + " DVI_TE_VEHICLE_DELETE_POSITION_V5" : (autoMatchPax && !travelExpertCabs ? "dvi-te-tours-vehicle-delete-v4 absolute right-3 top-2 z-10 h-7 w-7 text-[#e63963]" : "h-7 w-7 text-[#e63963]")) + (pref === "both" && !travelExpertCabs ? " dvi-te-v6-vehicle-delete" : "")}
                 style={autoMatchPax && !travelExpertCabs ? { position: "absolute", top: 8, right: 8, left: "auto" } : undefined}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className={travelExpertCabs ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 md:grid-cols-2 gap-3"}>
              {/* Vehicle Type */}
              <div
                className={
                  vehicleTypeError
                    ? "border border-red-500 rounded-md p-2"
                    : ""
                }
                data-field="vehicleType"
              >
                <Label className="text-sm block mb-1">
                  Vehicle Type <span className="text-red-500">*</span>
                </Label>

                <VehicleTypeSelect
                  value={vehicle.type}
                  options={vehicleTypes}
                  disabled={!hasVehicleTypes}
                  travelExpertCabs={travelExpertCabs}
                   fullVehicleList={autoMatchPax}
                  onChange={(val) =>
                    setVehicles((prev) =>
                      prev.map((v) =>
                        v.id === vehicle.id ? { ...v, type: val } : v
                      )
                    )
                  }
                  onUnavailableOpen={() =>
                    toast({
                      variant: "destructive",
                      title: travelExpertCabs ? "Vehicle types unavailable" : "Please fill Route Details first",
                      description: travelExpertCabs
                        ? "Vehicle types could not be loaded. Please retry or contact support."
                        : "Vehicle types will be available once you add at least one day in Route Details.",
                    })
                  }
                />

                {vehicleTypeError && (
                  <p className="mt-1 text-xs text-red-500">
                    {vehicleTypeError}
                  </p>
                )}
              </div>

              {/* Vehicle Count */}
              <div>
                <Label className="text-sm block mb-1">
                  Vehicle Count <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={vehicle.count}
                  onChange={(e) =>
                    setVehicles((prev) =>
                      prev.map((v) =>
                        v.id === vehicle.id
                          ? {
                              ...v,
                              count: Math.max(
                                1,
                                Number.isNaN(Number(e.target.value))
                                  ? 1
                                  : Number(e.target.value)
                              ),
                            }
                          : v
                      )
                    )
                  }
                  type="number"
                  min={1}
                  className="h-9 border-[#e5d7f6]"
                />
              </div>
            </div>
          </div>
        ))}
        </div>

        <Button
          onClick={() => {
            // DVI_TE_CABS_HORIZONTAL_THREE_VEHICLES_V2: allow adding vehicle rows before route-dependent vehicle types load.
            // DVI_TE_CABS_UNLIMITED_ADD_VEHICLE_V3: one new vehicle on every click; no UI quantity limit.
            if (!travelExpertCabs && !hasVehicleTypes) {
              toast({
                variant: "destructive",
                title: travelExpertCabs ? "Vehicle types unavailable" : "Please fill Route Details first",
                description: travelExpertCabs
                  ? "Vehicle types could not be loaded. Please retry or contact support."
                  : "You can add vehicles only after filling the Route Details section.",
              });
              return;
            }
            (addVehicle ?? internalAddVehicle)();
          }}
          className="bg-[#f054b5] hover:bg-[#e249a9]"
        >
          + Add Vehicle
        </Button>
      </CardContent>
    </Card>
  );
};
