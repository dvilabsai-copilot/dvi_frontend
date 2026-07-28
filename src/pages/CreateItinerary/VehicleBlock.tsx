// FILE: src/pages/CreateItinerary/VehicleBlock.tsx

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
};

type VehicleTypeSelectProps = {
  value: string;
  options: SimpleOption[];
  disabled: boolean;
  onChange: (value: string) => void;
  onUnavailableOpen: () => void;
};

const VehicleTypeSelect = ({
  value,
  options,
  disabled,
  onChange,
  onUnavailableOpen,
}: VehicleTypeSelectProps) => {
  const [open, setOpen] = useState(false);
  const selectedOptionRef = useRef<HTMLButtonElement | null>(null);
  const selectedOption = options.find((option) => String(option.id) === value);

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
        collisionPadding={8}
        className="z-[100] max-h-[min(22rem,calc(100vh-1rem))] w-[var(--radix-popover-trigger-width)] overflow-y-auto p-1"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div role="listbox" aria-label="Vehicle Type">
          {options.map((option) => {
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
                <span className="truncate">{option.label}</span>
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
    <Card className="border border-[#efdef8] rounded-lg bg-white shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-[#4a4260]">
          Vehicle
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {vehicles.map((vehicle, idx) => (
          <div
            key={vehicle.id}
            className="border border-[#f1d8ff] rounded-md p-3"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[#4a4260]">
                Vehicle #{idx + 1}
              </p>
              {vehicles.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    (removeVehicle ?? internalRemoveVehicle)(vehicle.id)
                  }
                  className="h-7 w-7 text-[#e63963]"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                      title: "Please fill Route Details first",
                      description:
                        "Vehicle types will be available once you add at least one day in Route Details.",
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

        <Button
          onClick={() => {
            if (!hasVehicleTypes) {
              toast({
                variant: "destructive",
                title: "Please fill Route Details first",
                description:
                  "You can add vehicles only after filling the Route Details section.",
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
