import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
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

interface DayDetail {
  dayNo: number;
  date: string;
  sourceLocation: string;
  nextLocation: string;
  viaRoute?: string;
  directVisit?: boolean;
}

interface RouteData {
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
}) => {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noRoutesMessage, setNoRoutesMessage] = useState<string | null>(null);
  const [noRoutesDialogOpen, setNoRoutesDialogOpen] = useState(false);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);

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
    if (arrivalLocation && departureLocation && noOfDays && startDate && endDate) {
      fetchRoutes();
    }
  }, [arrivalLocation, departureLocation, noOfDays, startDate, endDate]);

  const fetchRoutes = async () => {
    setLoading(true);
    setError(null);
    setNoRoutesMessage(null);
    setRoutes([]);

    try {
      const response = await fetch(
        'http://127.0.0.1:4006/api/v1/itineraries/default-route-suggestions/v2',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            _no_of_route_days: noOfDays,
            _arrival_location: arrivalLocation,
            _departure_location: departureLocation,
            _formattedStartDate: startDate,
            _formattedEndDate: endDate,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch routes: ${response.statusText}`);
      }

      const data: RouteResponse = await response.json();

      if (data.success && data.routes && data.routes.length > 0) {
        setRoutes(data.routes);
        
        // Load the first suggested route's data into the form
        const firstRoute = data.routes[0];
        const formattedRouteDetails = firstRoute.days.map((day, idx) => ({
          id: idx + 1,
          day: day.dayNo,
          date: day.date,
          source: day.sourceLocation,
          next: day.nextLocation,
          via: "",
          via_routes: [],
          directVisit: day.directVisit ? "Yes" : "No",
        }));
        
        setRouteDetails?.(formattedRouteDetails);
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
        {/* Route Tabs */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Suggested Routes ({routes.length} options available) - Click to load
          </label>
          <div className="flex flex-wrap gap-2">
            {routes.map((route, idx) => (
              <button
                key={`route-${idx}`}
                onClick={() => {
                  setSelectedRouteIdx(idx);
                  // Load this route's data into form
                  const formattedRouteDetails = route.days.map((day, dayIdx) => ({
                    id: dayIdx + 1,
                    day: day.dayNo,
                    date: day.date,
                    source: day.sourceLocation,
                    next: day.nextLocation,
                    via: "",
                    via_routes: [],
                    directVisit: day.directVisit ? "Yes" : "No",
                  }));
                  setRouteDetails?.(formattedRouteDetails);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                  selectedRouteIdx === idx
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Route {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Editable Route Details Form */}
        <RouteDetailsBlock
          routeDetails={routeDetails || []}
          setRouteDetails={setRouteDetails || (() => {})}
          locations={locations || []}
          onOpenViaRoutes={onOpenViaRoutes}
          departureLocation={departureLocation}
        />
      </div>
    );
  }

  return null;
};

export default DefaultRoutesSuggestions;
