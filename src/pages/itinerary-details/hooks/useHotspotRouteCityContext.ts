import { useMemo } from "react";

type HotspotRouteCityContextOptions = {
  sourceCityKey?: string | null;
  destinationCityKey?: string | null;
  routeDeparture?: string | null;
  routeArrival?: string | null;
  modalLocationName?: string | null;
  selectedAnchorTo?: string | null;
};

/** Derives the route city labels and cross-city flag used by hotspot modal presentation. */
export const useHotspotRouteCityContext = ({
  sourceCityKey,
  destinationCityKey,
  routeDeparture,
  routeArrival,
  modalLocationName,
  selectedAnchorTo,
}: HotspotRouteCityContextOptions) => {
  const sourceCityLabel = useMemo(() => {
    const raw = String(sourceCityKey || routeDeparture || modalLocationName || "").trim();
    if (!raw) return "source city";
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [modalLocationName, routeDeparture, sourceCityKey]);

  const destinationCityLabel = useMemo(() => {
    const raw = String(destinationCityKey || selectedAnchorTo || routeArrival || "").trim();
    if (!raw) return "destination city";
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [destinationCityKey, routeArrival, selectedAnchorTo]);

  const routeIsDifferentCity = useMemo(() => {
    const source = String(sourceCityKey || routeDeparture || modalLocationName || "").trim().toLowerCase();
    const destination = String(destinationCityKey || routeArrival || "").trim().toLowerCase();
    return source.length > 0 && destination.length > 0 && source !== destination;
  }, [destinationCityKey, modalLocationName, routeArrival, routeDeparture, sourceCityKey]);

  return { sourceCityLabel, destinationCityLabel, routeIsDifferentCity };
};
