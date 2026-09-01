import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RouteDetailsBlock } from '@/pages/CreateItinerary/RouteDetailsBlock';
import { api } from '@/lib/api';

interface DayDetail {
  dayNo: number;
  date: string;
  sourceLocation: string;
  nextLocation: string;
  viaRoute?: string;
  directVisit?: boolean;
}

export interface RouteData {
  routeId: number;
  routeName: string;
  noOfDays: number;
  days: DayDetail[];
}

interface RouteResponse {
  success: boolean;
  no_routes_found?: boolean;
  no_matching_routes_found?: boolean;
  no_routes_message?: string;
  routes?: RouteData[];
}

interface DefaultRoutesSuggestionsProps {
  arrivalLocation: string;
  departureLocation: string;
  noOfDays: number;
  startDate: string;
  endDate: string;
  onNoRoutesFound?: () => void;
  locations?: any[];
  routeDetails?: any[];
  setRouteDetails?: (routes: any[]) => void;
  onOpenViaRoutes?: (row: any) => void;
  onDeleteDay?: () => void;

  activeRouteIndex?: number;
  onRoutesLoaded?: (routes: RouteData[]) => void;
  onRouteSelect?: (route: RouteData, index: number) => void;
  onSelectedRoutesChange?: (routes: RouteData[]) => void;
}

export const DefaultRoutesSuggestions: React.FC<DefaultRoutesSuggestionsProps> = ({
  arrivalLocation,
  departureLocation,
  noOfDays,
  startDate,
  endDate,
  onNoRoutesFound,
  locations,
  routeDetails,
  setRouteDetails,
  onOpenViaRoutes,
  onDeleteDay,
  activeRouteIndex,
  onRoutesLoaded,
  onRouteSelect,
  onSelectedRoutesChange,
}) => {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noRoutesMessage, setNoRoutesMessage] = useState<string | null>(null);
  const [noRoutesDialogOpen, setNoRoutesDialogOpen] = useState(false);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [selectedRouteIndexes, setSelectedRouteIndexes] = useState<number[]>([0]);
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null);

  const [searchParams] = useSearchParams();
  const editPlanId = Number(searchParams.get('id') || 0);

  const [restoredRouteIds, setRestoredRouteIds] = useState<number[]>([]);
  const [restoredRouteCount, setRestoredRouteCount] = useState(0);
  const [editSelectionReady, setEditSelectionReady] = useState(!editPlanId);

  useEffect(() => {
    let cancelled = false;

    if (!editPlanId) {
      setRestoredRouteIds([]);
      setRestoredRouteCount(0);
      setEditSelectionReady(true);

      return () => {
        cancelled = true;
      };
    }

    const loadSavedSelection = async () => {
      let routeIds: number[] = [];
      let routeCount = 0;

      try {
        const existing = await api(
          `/itineraries/edit/${editPlanId}`,
          {
            method: 'GET',
          },
        ) as any;

        const quoteId = String(
          existing?.plan?.itinerary_quote_ID || '',
        ).trim();

        if (quoteId) {
          const savedIdsRaw = localStorage.getItem(
            `smart-booking-selected-route-ids:${quoteId}`,
          );

          if (savedIdsRaw) {
            try {
              const parsedIds = JSON.parse(savedIdsRaw);

              routeIds = Array.isArray(parsedIds)
                ? Array.from(
                    new Set(
                      parsedIds
                        .map((value) => Number(value))
                        .filter(
                          (value) =>
                            Number.isFinite(value) && value > 0,
                        ),
                    ),
                  ).slice(0, 5)
                : [];
            } catch (storageError) {
              console.warn(
                'Unable to read saved Smart Booking route IDs',
                storageError,
              );
            }
          }

          const routeOptionsRaw = localStorage.getItem(
            `itinerary-route-options:${quoteId}`,
          );

          if (routeOptionsRaw) {
            try {
              const parsedOptions = JSON.parse(routeOptionsRaw);

              if (Array.isArray(parsedOptions)) {
                routeCount = Math.min(parsedOptions.length, 5);
              }
            } catch (storageError) {
              console.warn(
                'Unable to read saved Smart Booking route count',
                storageError,
              );
            }
          }
        }
      } catch (error) {
        console.warn(
          'Unable to restore Smart Booking route selection',
          error,
        );
      }

      if (!cancelled) {
        setRestoredRouteIds(routeIds);
        setRestoredRouteCount(routeCount);
        setEditSelectionReady(true);
      }
    };

    void loadSavedSelection();

    return () => {
      cancelled = true;
    };
  }, [editPlanId]);

  const buildFormattedRouteDetails = (route: RouteData) => {
    const routeDays = Array.isArray(route.days) ? route.days : [];

    return routeDays.map((day, dayIdx) => {
      const nextDay = routeDays[dayIdx + 1];

      const source =
        day.sourceLocation ||
        (day as any).source ||
        (day as any).location_name ||
        (day as any).locationName ||
        "";

      const next =
        day.nextLocation ||
        (day as any).next ||
        (day as any).next_visiting_location ||
        (day as any).nextVisitingLocation ||
        nextDay?.sourceLocation ||
        (nextDay as any)?.source ||
        (dayIdx === routeDays.length - 1 ? departureLocation : "");

      return {
        id: dayIdx + 1,
        day: day.dayNo,
        date: day.date,
        source,
        next,
        via: day.viaRoute || "",
        via_routes: [],
        directVisit: day.directVisit ? "Yes" : "No",
        no_of_km: 0,
      };
    });
  };

  const emitSelectedRoutes = (
    indexes: number[],
    activeIndex: number,
    routeList: RouteData[] = routes,
  ) => {
    const uniqueIndexes = Array.from(new Set(indexes))
      .filter(
        (index) =>
          Number.isInteger(index) &&
          index >= 0 &&
          index < routeList.length,
      )
      .sort((a, b) => a - b)
      .slice(0, 5);

    const orderedIndexes = uniqueIndexes.includes(activeIndex)
      ? [
          activeIndex,
          ...uniqueIndexes.filter((index) => index !== activeIndex),
        ]
      : uniqueIndexes;

    onSelectedRoutesChange?.(
      orderedIndexes
        .map((index) => routeList[index])
        .filter((route): route is RouteData => Boolean(route)),
    );
  };

  const loadRouteIntoForm = (route: RouteData, index: number) => {
    setSelectedRouteIdx(index);
    onRouteSelect?.(route, index);
    setRouteDetails?.(buildFormattedRouteDetails(route));
  };

  const addRouteSelection = (index: number): number[] | null => {
    if (selectedRouteIndexes.includes(index)) {
      return selectedRouteIndexes;
    }

    if (selectedRouteIndexes.length >= 5) {
      setSelectionMessage("You can select a maximum of 5 routes.");
      return null;
    }

    const nextIndexes = [...selectedRouteIndexes, index].sort(
      (a, b) => a - b,
    );

    setSelectedRouteIndexes(nextIndexes);
    setSelectionMessage(null);

    return nextIndexes;
  };

  const handleRouteCardClick = (route: RouteData, index: number) => {
    const nextIndexes = addRouteSelection(index);

    if (!nextIndexes) return;

    loadRouteIntoForm(route, index);
    emitSelectedRoutes(nextIndexes, index);
  };

  const handleRouteCheckboxClick = (
    route: RouteData,
    index: number,
  ) => {
    const activeIndex = activeRouteIndex ?? selectedRouteIdx;
    const isSelected = selectedRouteIndexes.includes(index);

    if (isSelected) {
      if (selectedRouteIndexes.length === 1) {
        setSelectionMessage("At least one route must remain selected.");
        return;
      }

      const nextIndexes = selectedRouteIndexes.filter(
        (selectedIndex) => selectedIndex !== index,
      );

      setSelectedRouteIndexes(nextIndexes);
      setSelectionMessage(null);

      if (activeIndex === index) {
        const nextActiveIndex = nextIndexes[0];
        const nextActiveRoute = routes[nextActiveIndex];

        if (nextActiveRoute) {
          loadRouteIntoForm(nextActiveRoute, nextActiveIndex);
          emitSelectedRoutes(nextIndexes, nextActiveIndex);
        }
      } else {
        emitSelectedRoutes(nextIndexes, activeIndex);
      }

      return;
    }

    if (selectedRouteIndexes.length >= 5) {
      setSelectionMessage("You can select a maximum of 5 routes.");
      return;
    }

    const nextIndexes = [...selectedRouteIndexes, index].sort(
      (a, b) => a - b,
    );

    setSelectedRouteIndexes(nextIndexes);
    setSelectionMessage(null);
    emitSelectedRoutes(nextIndexes, activeIndex);
  };

  const buildBlankRouteDetails = (): any[] => {
    const totalDays = Math.max(Number(noOfDays || 1), 1);
    const [d, m, y] = String(startDate || '').split('/').map((v) => Number(v));
    const start = !Number.isNaN(d) && !Number.isNaN(m) && !Number.isNaN(y)
      ? new Date(y, m - 1, d)
      : new Date();

    const rows: any[] = [];
    for (let i = 0; i < totalDays; i++) {
      const dt = new Date(start);
      dt.setDate(start.getDate() + i);
      const date = `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;

      rows.push({
        id: i + 1,
        day: i + 1,
        date,
        source: i === 0 ? arrivalLocation : '',
        next: i === totalDays - 1 ? departureLocation : '',
        via: '',
        via_routes: [],
        directVisit: 'No',
        no_of_km: 0,
      });
    }

    return rows;
  };

  useEffect(() => {
    if (
      editSelectionReady &&
      arrivalLocation &&
      departureLocation &&
      noOfDays &&
      startDate &&
      endDate
    ) {
      fetchRoutes();
    }
  }, [
    arrivalLocation,
    departureLocation,
    noOfDays,
    startDate,
    endDate,
    editSelectionReady,
  ]);

  const fetchRoutes = async () => {
    setLoading(true);
    setError(null);
    setNoRoutesMessage(null);
    setRoutes([]);
    setSelectedRouteIndexes([]);
    setSelectionMessage(null);
    onSelectedRoutesChange?.([]);

    try {
      const data = await api('/itineraries/default-route-suggestions/v2', {
  method: 'POST',
  body: {
    _no_of_route_days: noOfDays,
    _arrival_location: arrivalLocation,
    _departure_location: departureLocation,
    _formattedStartDate: startDate,
    _formattedEndDate: endDate,
  },
}) as RouteResponse;

      if (data.success && data.routes && data.routes.length > 0) {
        const exactRestoredIndexes = restoredRouteIds
          .map((savedRouteId) =>
            data.routes!.findIndex(
              (route) =>
                Number(route.routeId) === Number(savedRouteId),
            ),
          )
          .filter((index) => index >= 0);

        const fallbackCount = Math.min(
          restoredRouteCount,
          data.routes.length,
          5,
        );

        const restoredIndexes =
          exactRestoredIndexes.length > 0
            ? Array.from(new Set(exactRestoredIndexes)).slice(0, 5)
            : fallbackCount > 0
              ? Array.from(
                  { length: fallbackCount },
                  (_, index) => index,
                )
              : [0];

        const activeIndex = restoredIndexes[0] ?? 0;
        const activeRoute = data.routes[activeIndex];

        setRoutes(data.routes);
        setSelectedRouteIndexes(restoredIndexes);
        setSelectedRouteIdx(activeIndex);
        setSelectionMessage(null);

        onRoutesLoaded?.(data.routes);
        emitSelectedRoutes(
          restoredIndexes,
          activeIndex,
          data.routes,
        );

        if (activeRoute) {
          loadRouteIntoForm(activeRoute, activeIndex);
        }
      } else {
        setNoRoutesMessage(
          data.no_routes_message || 'No routes available for this location.',
        );
        setNoRoutesDialogOpen(true);
        // PHP parity: when no default routes are found, switch to Customize with clean rows.
        setRouteDetails?.(buildBlankRouteDetails());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12 bg-blue-50 rounded-lg border border-blue-200">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
        <span className="text-gray-600">Fetching default routes...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // No routes found - show modal alert
  if (noRoutesMessage) {
    const handleCloseNoRoutesModal = () => {
      setNoRoutesDialogOpen(false);
      if (onNoRoutesFound) {
        onNoRoutesFound();
      }
    };

    return (
      <>
        <Dialog open={noRoutesDialogOpen} onOpenChange={(open) => {
          setNoRoutesDialogOpen(open);
          if (!open && onNoRoutesFound) {
            onNoRoutesFound();
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex justify-center mb-4">
                <AlertCircle className="h-16 w-16 text-orange-500" />
              </div>
              <DialogTitle className="text-center text-xl">
                No Default Routes Found!
              </DialogTitle>
              <DialogDescription className="text-center mt-2">
                {noRoutesMessage}
              </DialogDescription>
            </DialogHeader>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-gray-700">
                The itinerary type has been switched to <strong>Customize</strong>. 
                Please add routes manually.
              </p>
            </div>
            <DialogFooter className="mt-6">
              <Button 
                onClick={handleCloseNoRoutesModal}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Routes found - show tabs + editable form
  if (routes.length > 0) {
    return (
      <div className="w-full">
        {/* Route Options */}
        <div className="mb-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <label className="text-sm font-medium text-gray-700">
              Suggested Routes ({routes.length} options available) - Select up to 5 routes
            </label>

            <span className="text-xs font-medium text-gray-500">
              {selectedRouteIndexes.length}/5 selected
            </span>
          </div>

          {selectionMessage && (
            <div className="mb-3 rounded-md border border-pink-200 bg-pink-50 px-3 py-2 text-sm text-pink-700">
              {selectionMessage}
            </div>
          )}

          <div className="space-y-3">
            {routes.map((route, idx) => {
              const isSelected = selectedRouteIndexes.includes(idx);
              const isActive =
                (activeRouteIndex ?? selectedRouteIdx) === idx;

              const overnightStops = route.days
                .slice(0, -1)
                .reduce<Array<{ name: string; nights: number }>>(
                  (acc, day) => {
                    const name = String(
                      day.nextLocation ||
                        (day as any).next ||
                        (day as any).next_visiting_location ||
                        (day as any).nextVisitingLocation ||
                        '',
                    ).trim();

                    if (!name) return acc;

                    const lastStop = acc[acc.length - 1];

                    if (lastStop?.name === name) {
                      lastStop.nights += 1;
                    } else {
                      acc.push({ name, nights: 1 });
                    }

                    return acc;
                  },
                  [],
                );

              const lastDay = route.days[route.days.length - 1];

              const finalDestination = String(
                lastDay?.nextLocation ||
                  (lastDay as any)?.next ||
                  (lastDay as any)?.next_visiting_location ||
                  (lastDay as any)?.nextVisitingLocation ||
                  departureLocation ||
                  '',
              ).trim();

              const finalDestinationLabel = finalDestination
                ? /drop$/i.test(finalDestination)
                  ? finalDestination
                  : `${finalDestination} Drop`
                : '';

              const totalDays = Math.max(
                Number(route.noOfDays || route.days.length || 1),
                1,
              );

              const totalNights = Math.max(totalDays - 1, 0);

              return (
                <div
                  key={`route-${idx}`}
                  className={`w-full rounded-xl border px-4 py-4 transition-all ${
                    isSelected
                      ? 'border-pink-400 bg-pink-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-pink-200 hover:bg-pink-50/40'
                  } ${
                    isActive
                      ? 'ring-1 ring-pink-300'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() =>
                        handleRouteCheckboxClick(route, idx)
                      }
                      className="shrink-0"
                      aria-label={
                        isSelected
                          ? `Deselect Route ${idx + 1}`
                          : `Select Route ${idx + 1}`
                      }
                      title={
                        !isSelected &&
                        selectedRouteIndexes.length >= 5
                          ? 'Maximum 5 routes can be selected'
                          : undefined
                      }
                    >
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                          isSelected
                            ? 'border-pink-500 bg-pink-500'
                            : 'border-gray-300 bg-white hover:border-pink-400'
                        }`}
                      >
                        {isSelected && (
                          <Check className="h-3.5 w-3.5 text-white" />
                        )}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleRouteCardClick(route, idx)
                      }
                      className="flex min-w-0 flex-1 flex-wrap items-center gap-4 text-left"
                    >
                      <span
                        className={`min-w-[72px] font-semibold ${
                          isSelected
                            ? 'text-pink-600'
                            : 'text-gray-900'
                        }`}
                      >
                        Route {idx + 1}
                      </span>

                      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                        {overnightStops.map((stop, stopIdx) => (
                          <React.Fragment
                            key={`${stop.name}-${stopIdx}`}
                          >
                            <span
                              className={`rounded-md border bg-white px-3 py-1.5 text-sm font-medium shadow-sm ${
                                isSelected
                                  ? 'border-pink-200 text-pink-700'
                                  : 'border-gray-200 text-gray-700'
                              }`}
                            >
                              {stop.name} {stop.nights}N
                            </span>

                            <span className="text-gray-400">
                              ΓÇ║
                            </span>
                          </React.Fragment>
                        ))}

                        {finalDestinationLabel && (
                          <span
                            className={`rounded-md border bg-white px-3 py-1.5 text-sm font-medium shadow-sm ${
                              isSelected
                                ? 'border-pink-200 text-pink-700'
                                : 'border-gray-200 text-gray-700'
                            }`}
                          >
                            {finalDestinationLabel}
                          </span>
                        )}
                      </span>

                      <span
                        className={`ml-auto shrink-0 rounded-lg border bg-white px-3 py-2 text-sm font-medium ${
                          isSelected
                            ? 'border-pink-200 text-pink-700'
                            : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        {totalNights}{' '}
                        {totalNights === 1 ? 'Night' : 'Nights'}
                        {' / '}
                        {totalDays}{' '}
                        {totalDays === 1 ? 'Day' : 'Days'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Editable Route Details Form */}
        <RouteDetailsBlock
  routeDetails={routeDetails || []}
  setRouteDetails={setRouteDetails || (() => {})}
  locations={locations || []}
  onOpenViaRoutes={onOpenViaRoutes}
  departureLocation={departureLocation}
  onDeleteDay={onDeleteDay}
  hideIntercityKm={true}
/>
      </div>
    );
  }

  return null;
};

export default DefaultRoutesSuggestions;
