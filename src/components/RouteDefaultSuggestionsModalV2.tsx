import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { api } from '@/lib/api';

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
  no_routes_message?: string;
  routes?: RouteData[];
}

interface RouteDefaultSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRoute: (route: RouteData) => void;
  arrivalLocation: string;
  departureLocation: string;
  noOfDays: number;
  startDate: string;
  endDate: string;
}

export const RouteDefaultSuggestionsModalV2: React.FC<
  RouteDefaultSuggestionsModalProps
> = ({
  isOpen,
  onClose,
  onSelectRoute,
  arrivalLocation,
  departureLocation,
  noOfDays,
  startDate,
  endDate,
}) => {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noRoutesMessage, setNoRoutesMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && arrivalLocation && departureLocation) {
      fetchRoutes();
    }
  }, [isOpen, arrivalLocation, departureLocation, noOfDays, startDate, endDate]);

  const fetchRoutes = async () => {
    setLoading(true);
    setError(null);
    setNoRoutesMessage(null);
    setRoutes([]);

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
        setRoutes(data.routes);
      } else {
        setNoRoutesMessage(
          data.no_routes_message || 'No routes available for this location.',
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Suggested Default Routes</h2>
            <p className="text-blue-100 text-sm mt-1">
              {arrivalLocation} → {departureLocation}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-800 rounded-full p-2 transition"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin">
                <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
              </div>
              <span className="ml-4 text-gray-600">Loading routes...</span>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {noRoutesMessage && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{noRoutesMessage}</AlertDescription>
            </Alert>
          )}

          {routes.length > 0 && (
            <Tabs defaultValue={`route-0`} className="w-full">
              {/* Tabs List */}
              <TabsList className="grid w-full gap-2 mb-6 bg-gray-100 p-2 rounded-lg overflow-x-auto flex-wrap">
                {routes.map((route, idx) => (
                  <TabsTrigger
                    key={`route-${idx}`}
                    value={`route-${idx}`}
                    className="whitespace-nowrap data-[state=active]:bg-white data-[state=active]:shadow"
                  >
                    <span className="font-medium">{route.routeName}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Tab Contents */}
              {routes.map((route, idx) => (
                <TabsContent
                  key={`content-${idx}`}
                  value={`route-${idx}`}
                  className="mt-4"
                >
                  {/* Route Header */}
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg text-gray-800">
                          {route.routeName}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Duration: <Badge variant="outline">{route.noOfDays} days</Badge>
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          onSelectRoute(route);
                          onClose();
                        }}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Select This Route
                      </Button>
                    </div>
                  </div>

                  {/* Day-by-Day Table */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-gray-100">
                        <TableRow>
                          <TableHead className="w-12">Day</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>From Location</TableHead>
                          <TableHead>To Location</TableHead>
                          <TableHead className="text-center">Via Route</TableHead>
                          <TableHead className="text-center">Direct Visit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {route.days.map((day) => (
                          <TableRow key={`day-${day.dayNo}`} className="hover:bg-gray-50">
                            <TableCell className="font-bold text-blue-600 w-12">
                              Day {day.dayNo}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {day.date}
                            </TableCell>
                            <TableCell className="font-medium">
                              {day.sourceLocation}
                            </TableCell>
                            <TableCell className="font-medium text-green-700">
                              {day.nextLocation}
                            </TableCell>
                            <TableCell className="text-center">
                              {day.viaRoute ? (
                                <Badge variant="secondary">{day.viaRoute}</Badge>
                              ) : (
                                <span className="text-gray-400 text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <input
                                type="checkbox"
                                checked={day.directVisit || false}
                                readOnly
                                className="w-4 h-4 rounded border-gray-300"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Route Summary */}
                  <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200 text-sm text-gray-700">
                    <p>
                      <strong>Journey:</strong> {route.days[0]?.sourceLocation} →{' '}
                      {route.days[route.days.length - 1]?.nextLocation}
                    </p>
                    <p className="mt-2">
                      <strong>Total Days:</strong> {route.days.length} | 
                      <strong className="ml-3">Locations Visited:</strong> {route.days.length + 1}
                    </p>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
};

export default RouteDefaultSuggestionsModalV2;
