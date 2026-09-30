import React, { useEffect, useMemo, useState } from "react";
import { ItineraryService } from "@/services/itinerary";
import type { ClipboardIncludeSections } from "../hooks/useMediaShareState";
import {
  CalendarDays,
  ClipboardCopy,
  Eye,
  Hotel,
  MapPin,
  Plane,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ItineraryDetailsResponse } from "../itinerary-details.types";

export type ClipboardLegOption = {
  key: string;
  label: string;
  quoteId?: string;
  details?: ItineraryDetailsResponse;
};

export type ClipboardLegSelectionDialogProps = {
  open: boolean;
  legs: ClipboardLegOption[];
  selectedLegs: Record<string, boolean>;

  hotelTabs?: Array<{
    groupType?: number;
    label?: string;
    name?: string;
    title?: string;
  }>;

  hotelSelectionState?: unknown[];

  selectedHotelOptions: Record<string, number[]>;
  onHotelOptionSelectionChange: (
    selection: Record<string, number[]>,
  ) => void;

  includeSections: ClipboardIncludeSections;
  onIncludeSectionsChange: (
    selection: ClipboardIncludeSections,
  ) => void;

onOpenChange: (open: boolean) => void;
onSelectionChange: (
  selection: Record<string, boolean>,
) => void;

onPreview: () => void;
onContinue: () => void;
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getDateParts = (dateRange?: string) => {
  if (!dateRange) {
    return {
      start: "-",
      end: "-",
    };
  }

  const parts = dateRange
    .split(/\s+to\s+/i)
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    start: parts[0] || "-",
    end: parts[1] || parts[0] || "-",
  };
};

const getLocationName = (value: unknown): string => {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    const item = value as Record<string, unknown>;

    return String(
      item.name ||
        item.cityName ||
        item.locationName ||
        item.destinationName ||
        item.title ||
        "",
    );
  }

  return "";
};

const getRouteNames = (
  details?: ItineraryDetailsResponse,
) => {
  if (!details?.days?.length) return [];

  const names: string[] = [];

  const addLocation = (value?: string | null) => {
    const name = String(value || "").trim();

    if (!name) return;

    if (names[names.length - 1] !== name) {
      names.push(name);
    }
  };

  details.days.forEach((day) => {
    addLocation(day.departure);

    day.viaRoutes?.forEach((viaRoute) => {
      const viaName = getLocationName(viaRoute);
      addLocation(viaName);
    });

    addLocation(day.arrival);
  });

  return names;
};

const getSelectedCount = (
  legs: ClipboardLegOption[],
  selectedLegs: Record<string, boolean>,
) =>
  legs.filter((leg) => Boolean(selectedLegs[leg.key]))
    .length;

export const ClipboardLegSelectionDialog: React.FC<
  ClipboardLegSelectionDialogProps
> = ({
  open,
  legs,
  selectedLegs,
  hotelTabs = [],
  hotelSelectionState = [],
  selectedHotelOptions,
  onHotelOptionSelectionChange,
  includeSections,
  onIncludeSectionsChange,
onOpenChange,
onSelectionChange,
onPreview,
onContinue,
}) => {
  const hotelOptionLabels = useMemo(() => {
    const optionCount = Math.max(
      4,
      Array.isArray(hotelTabs) ? hotelTabs.length : 0,
    );

    return Array.from(
      { length: optionCount },
      (_, index) => {
        const tab = Array.isArray(hotelTabs)
          ? hotelTabs[index]
          : undefined;

        const groupType = Number(
          tab?.groupType ?? index + 1,
        );

        return {
          value: groupType,
          label: `Option ${groupType}`,
        };
      },
    ).slice(0, 4);
  }, [hotelTabs]);

  const [hotelOptionCosts, setHotelOptionCosts] =
    useState<Record<string, Record<number, number>>>(
      {},
    );

  const [
    loadingOptionCosts,
    setLoadingOptionCosts,
  ] = useState(false);

  const formatOptionPrice = (amount: number) =>
    `₹${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  useEffect(() => {
    if (
      !open ||
      !legs.length ||
      !hotelOptionLabels.length
    ) {
      return;
    }

    let cancelled = false;

    const loadOptionCosts = async () => {
      setLoadingOptionCosts(true);

      try {
        const entries = await Promise.all(
          legs.flatMap((leg) => {
            const legQuoteId = String(
              leg.quoteId ||
                leg.details?.quoteId ||
                "",
            ).trim();

            if (!legQuoteId) {
              return [];
            }

            return hotelOptionLabels.map(
              async (option) => {
                try {
                  const optionDetails =
                    await ItineraryService.getDetails(
                      legQuoteId,
                      option.value,
                    );

                  const netPayable = Number(
                    optionDetails?.costBreakdown
                      ?.netPayable || 0,
                  );

                  const overallCost = Number(
                    optionDetails?.overallCost || 0,
                  );

                  const baseAmount =
                    netPayable > 0
                      ? netPayable
                      : overallCost;

                  return {
                    legKey: leg.key,
                    option: option.value,
                    amount: Math.round(baseAmount),
                  };
                } catch (error) {
                  console.warn(
                    `Failed to load overall cost for ${legQuoteId}, option ${option.value}`,
                    error,
                  );

                  return {
                    legKey: leg.key,
                    option: option.value,
                    amount: 0,
                  };
                }
              },
            );
          }),
        );

        if (cancelled) {
          return;
        }

        const nextCosts: Record<
          string,
          Record<number, number>
        > = {};

        entries.forEach((entry) => {
          if (!nextCosts[entry.legKey]) {
            nextCosts[entry.legKey] = {};
          }

          nextCosts[entry.legKey][entry.option] =
            entry.amount;
        });

        setHotelOptionCosts(nextCosts);
      } finally {
        if (!cancelled) {
          setLoadingOptionCosts(false);
        }
      }
    };

    void loadOptionCosts();

    return () => {
      cancelled = true;
    };
  }, [open, legs, hotelOptionLabels]);

  const selectedCount = getSelectedCount(
    legs,
    selectedLegs,
  );

  const hasSelection = selectedCount > 0;

  const allSelected =
    legs.length > 0 &&
    selectedCount === legs.length;

  const selectedDetails = useMemo(
    () =>
      legs
        .filter((leg) => selectedLegs[leg.key])
        .map((leg) => leg.details)
        .filter(
          Boolean,
        ) as ItineraryDetailsResponse[],
    [legs, selectedLegs],
  );

  const overallSummary = useMemo(() => {
    const first = selectedDetails[0];
    const last =
      selectedDetails[selectedDetails.length - 1];

    const firstRange = getDateParts(
      first?.dateRange,
    );

    const lastRange = getDateParts(
      last?.dateRange,
    );

    return {
      startDate: firstRange.start,
      endDate: lastRange.end,
      adults: first?.adults ?? 0,
      children: first?.children ?? 0,
      infants: first?.infants ?? 0,
    };
  }, [selectedDetails]);

  const toggleAll = () => {
    const nextSelection: Record<string, boolean> =
      {};

    legs.forEach((leg) => {
      nextSelection[leg.key] = !allSelected;
    });

    onSelectionChange(nextSelection);
  };

  const toggleIncludeSection = (
    key: keyof ClipboardIncludeSections,
  ) => {
    onIncludeSectionsChange({
      ...includeSections,
      [key]: !includeSections[key],
    });
  };

  const toggleHotelOption = (
    legKey: string,
    option: number,
  ) => {
    const currentOptions =
      selectedHotelOptions[legKey] || [];

    const alreadySelected =
      currentOptions.includes(option);

    onHotelOptionSelectionChange({
      ...selectedHotelOptions,
      [legKey]: alreadySelected
        ? currentOptions.filter(
            (item) => item !== option,
          )
        : [...currentOptions, option],
    });
  };

  const toggleAllHotelOptionsForLeg = (
  legKey: string,
) => {
  const allOptions = hotelOptionLabels.map(
    (option) => option.value,
  );

  const currentOptions =
    selectedHotelOptions[legKey] || [];

  const allSelected = allOptions.every(
    (option) => currentOptions.includes(option),
  );

  onHotelOptionSelectionChange({
    ...selectedHotelOptions,
    [legKey]: allSelected ? [] : allOptions,
  });
};

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        className="
          flex
          max-h-[88vh]
          w-[96vw]
          max-w-[1500px]
          flex-col
          gap-0
          overflow-hidden
          p-0
          sm:max-w-[1500px]
        "
      >
        {/* HEADER */}
        <div className="border-b bg-white px-5 py-2.5">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50">
                <ClipboardCopy className="h-6 w-6 text-purple-700" />
              </div>

              <div>
                <DialogTitle className="text-xl font-bold leading-tight text-slate-900">
                  Copy to Clipboard – Complete
                  Itinerary
                </DialogTitle>

                <DialogDescription className="mt-1 text-sm text-slate-500">
                  Select legs and details to copy.
                  This will include full itinerary,
                  hotels, vehicles, activities and
                  costs.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* TOP SUMMARY */}
        <div className="px-5 pt-2.5">
          <div className="grid grid-cols-1 rounded-xl border bg-purple-50/60 md:grid-cols-4">
            <div className="flex items-center gap-3 border-b px-4 py-2.5 md:border-b-0 md:border-r">
              <CalendarDays className="h-6 w-6 shrink-0 text-purple-700" />

              <div>
                <div className="text-xs font-medium text-slate-500">
                  Travel Period
                </div>

                <div className="font-semibold text-slate-900">
                  {overallSummary.startDate} –{" "}
                  {overallSummary.endDate}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 border-b px-4 py-2.5 md:border-b-0 md:border-r">
              <Plane className="h-7 w-7 shrink-0 text-purple-700" />

              <div>
                <div className="text-xs font-medium text-slate-500">
                  Arrival
                </div>

                <div className="font-semibold text-slate-900">
                  {getRouteNames(
                    selectedDetails[0],
                  )?.[0] || "-"}
                </div>

                <div className="text-xs text-slate-500">
                  {overallSummary.startDate}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 border-b px-4 py-2.5 md:border-b-0 md:border-r">
              <Plane className="h-7 w-7 shrink-0 rotate-180 text-purple-700" />

              <div>
                <div className="text-xs font-medium text-slate-500">
                  Departure
                </div>

                <div className="font-semibold text-slate-900">
                  {getRouteNames(
                    selectedDetails[
                      selectedDetails.length - 1
                    ],
                  ).slice(-1)[0] || "-"}
                </div>

                <div className="text-xs text-slate-500">
                  {overallSummary.endDate}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-2.5">
              <Users className="h-7 w-7 shrink-0 text-purple-700" />

              <div>
                <div className="text-xs font-medium text-slate-500">
                  Guests
                </div>

                <div className="font-semibold text-slate-900">
                  {overallSummary.adults} Adults
                </div>

                <div className="text-xs text-slate-500">
                  {overallSummary.children} Child ·{" "}
                  {overallSummary.infants} Infant
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LEG ROWS */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
          <div className="space-y-1.5">
            {legs.map((leg, index) => {
              const details = leg.details;

              const dateParts = getDateParts(
                details?.dateRange,
              );

              const routeNames =
                getRouteNames(details);

              const hotelOptions =
                hotelOptionLabels;

              const selectedOptions =
                selectedHotelOptions[leg.key] ||
                [];

              const optionCosts =
                hotelOptionCosts[leg.key] || {};

              const nights =
                details?.nightCount ?? 0;

              const days =
                details?.dayCount ??
                details?.days?.length ??
                0;

              return (
                <div
                  key={leg.key}
                  className="overflow-hidden rounded-xl border bg-white"
                >
                  <div className="flex min-w-[1180px] items-center gap-3 px-4 py-2">
                    <input
                      type="checkbox"
                      id={`clipboard-leg-${leg.key}`}
                      className="h-6 w-6 shrink-0 cursor-pointer accent-purple-700"
                      checked={Boolean(
                        selectedLegs[leg.key],
                      )}
                      onChange={(event) =>
                        onSelectionChange({
                          ...selectedLegs,
                          [leg.key]:
                            event.target.checked,
                        })
                      }
                    />

                    {/* LEG */}
                    <div className="w-[130px] shrink-0 rounded-lg bg-purple-50 px-3 py-1.5">
                      <label
                        htmlFor={`clipboard-leg-${leg.key}`}
                        className="cursor-pointer font-semibold text-slate-900"
                      >
                        Leg {index + 1}
                      </label>

                      <div className="text-xs text-slate-500">
                        {nights} Nights / {days} Days
                      </div>
                    </div>

                    {/* DATE */}
                    <div className="flex w-[190px] shrink-0 items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 shrink-0 text-slate-600" />

                      <div className="whitespace-nowrap text-xs font-medium text-slate-700">
                        {formatDate(
                          dateParts.start,
                        )}
                        <span className="mx-1">
                          –
                        </span>
                        {formatDate(dateParts.end)}
                      </div>
                    </div>

                    {/* ROUTE */}
                    <div className="flex min-w-0 flex-1 items-start gap-1.5">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-pink-500" />

                      {routeNames.length ? (
                        <div
                          className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] font-medium leading-4 text-slate-700"
                          title={routeNames.join(
                            " → ",
                          )}
                        >
                          {routeNames.map(
                            (
                              name,
                              routeIndex,
                            ) => (
                              <React.Fragment
                                key={`${leg.key}-${name}-${routeIndex}`}
                              >
                                {routeIndex >
                                  0 && (
                                  <span className="shrink-0 text-slate-400">
                                    →
                                  </span>
                                )}

                                <span>
                                  {name}
                                </span>
                              </React.Fragment>
                            ),
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          Route information
                        </span>
                      )}
                    </div>

                    {/* HOTEL OPTIONS */}
                    <div className="flex w-[610px] shrink-0 items-center gap-2">
                      <Hotel className="h-4 w-4 shrink-0 text-purple-700" />

                      <span className="shrink-0 whitespace-nowrap text-xs text-slate-600">
                        Hotel Options
                      </span>

<div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
  {hotelOptions.map((option) => {
    const checked =
      selectedOptions.includes(option.value);

    const amount =
      optionCosts[option.value] || 0;

    return (
      <label
        key={option.value}
        className={`
          flex cursor-pointer items-center gap-1.5
          rounded-md border px-2 py-1.5
          text-[11px] font-medium
          ${
            checked
              ? "border-purple-300 bg-purple-100 text-purple-700"
              : "border-slate-200 bg-white text-slate-700"
          }
        `}
      >
        <input
          type="checkbox"
          className="h-4 w-4 shrink-0 cursor-pointer accent-purple-700"
          checked={checked}
          onChange={() =>
            toggleHotelOption(
              leg.key,
              option.value,
            )
          }
        />

        <span className="whitespace-nowrap">
          Option {option.value}
        </span>

        <span className="whitespace-nowrap font-semibold">
          {loadingOptionCosts && !amount
            ? "..."
            : amount > 0
              ? formatOptionPrice(amount)
              : "--"}
        </span>
      </label>
    );
  })}

  <button
    type="button"
    onClick={() =>
      toggleAllHotelOptionsForLeg(leg.key)
    }
    className="
      shrink-0
      whitespace-nowrap
      rounded-md
      border
      border-purple-300
      bg-purple-50
      px-2.5
      py-1.5
      text-[11px]
      font-semibold
      text-purple-700
      hover:bg-purple-100
    "
  >
    {hotelOptions.every((option) =>
      selectedOptions.includes(option.value),
    )
      ? "Clear All"
      : "Select All"}
   </button>
</div>

                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="shrink-0 border-t bg-white px-5 py-1.5">
          <div className="flex items-center gap-3">
            {/* SELECT ALL */}
            <div className="flex shrink-0 items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-sm font-semibold text-slate-800">
                <input
                  type="checkbox"
                  className="h-5 w-5 cursor-pointer accent-purple-700"
                  checked={allSelected}
                  onChange={toggleAll}
                />

                Select All Legs
              </label>

              <div className="h-7 w-px bg-slate-200" />

              <span className="whitespace-nowrap text-sm font-semibold text-purple-700">
                {selectedCount}{" "}
                {selectedCount === 1
                  ? "Leg"
                  : "Legs"}{" "}
                Selected
              </span>
            </div>

            {/* INCLUDE OPTIONS */}
            <div className="min-w-0 flex-1">
              <div className="mb-1 text-[11px] font-medium leading-none text-slate-500">
                Include in Clipboard
              </div>

              <div className="flex flex-nowrap items-center gap-1.5">
                {[
                  ["itinerary", "Itinerary"],
                  ["hotels", "Hotels"],
                  ["vehicles", "Vehicles"],
                  ["activities", "Activities"],
                  [
                    "entryTickets",
                    "Entry Tickets",
                  ],
                  [
                    "costSummary",
                    "Cost Summary",
                  ],
                ].map(([key, label]) => {
                  const typedKey =
                    key as keyof ClipboardIncludeSections;

                  return (
                    <label
                      key={key}
                      className="
                        flex
                        h-8
                        cursor-pointer
                        items-center
                        gap-1.5
                        whitespace-nowrap
                        rounded-md
                        border
                        border-purple-100
                        bg-purple-50/60
                        px-2
                        text-xs
                        font-medium
                        text-slate-700
                      "
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0 cursor-pointer accent-purple-700"
                        checked={
                          includeSections[
                            typedKey
                          ]
                        }
                        onChange={() =>
                          toggleIncludeSection(
                            typedKey,
                          )
                        }
                      />

                      {label}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="ml-auto flex shrink-0 items-center gap-2">
             <Button
  type="button"
  variant="outline"
  disabled={!hasSelection}
  className="h-8 gap-1.5 whitespace-nowrap px-4 text-xs font-semibold"
  onClick={onPreview}
>
  <Eye className="h-4 w-4" />
  Preview
</Button>

              <Button
                type="button"
                disabled={!hasSelection}
                className="
                  h-8
                  gap-1.5
                  whitespace-nowrap
                  bg-purple-700
                  px-4
                  text-xs
                  font-semibold
                  hover:bg-purple-800
                "
                onClick={onContinue}
              >
                <ClipboardCopy className="h-4 w-4" />
                Copy to Clipboard
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClipboardLegSelectionDialog;