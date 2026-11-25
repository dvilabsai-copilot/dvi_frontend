import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getGlobalSettings, type GlobalSettings } from "@/services/GlobalSettingsService";

type City = GlobalSettings["houseboat_only_cities"][number];
type Route = { id: number; next: string; preferHouseboats?: boolean };
type Choice = { route: Route; destination: string; city: City; nextValue?: boolean };

const cityKey = (value: string) => {
  const normalized = value.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  return normalized === "alleppey" ? "alappuzha" : normalized;
};

function findCity(cities: City[], destination: string) {
  const [name = "", state = ""] = destination.split(",");
  return cities.find(city => String(city.id) === name.trim() ||
    (cityKey(city.name) === cityKey(name) &&
      (!state || cityKey(state) === "india" || !city.stateName || cityKey(city.stateName) === cityKey(state))));
}

export function useHouseboatPreference<T extends Route>(
  setRoutes: Dispatch<SetStateAction<T[]>>,
  itineraryPreference?: "both" | "hotel" | "vehicle",
) {
  const enabled = itineraryPreference === "both" || itineraryPreference === "hotel";
  const [cities, setCities] = useState<City[]>([]);
  const [choice, setChoice] = useState<Choice | null>(null);
  const citiesRequest = useRef<Promise<City[]> | null>(null);
  const latestDestination = useRef(new Map<number, string>());

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const request = getGlobalSettings().then(settings => settings.houseboat_only_cities).catch(() => []);
    citiesRequest.current = request;
    void request.then(value => { if (active) setCities(value); });
    return () => { active = false; citiesRequest.current = null; };
  }, [enabled]);

  const promptForDestination = async (route: Route, destination: string, overnight: boolean) => {
    latestDestination.current.set(route.id, destination);
    if (!enabled || !overnight || destination === route.next) return;
    const eligibleCities = await citiesRequest.current ?? cities;
    if (latestDestination.current.get(route.id) !== destination) return;
    const city = findCity(eligibleCities, destination);
    if (city) setChoice({ route, destination, city });
  };

  const setPreference = (value: boolean) => {
    if (!choice) return;
    setRoutes(routes => routes.map(route =>
      route.id === choice.route.id && route.next === choice.destination
        ? { ...route, preferHouseboats: value }
        : route));
  };

  const initial = choice?.nextValue === undefined;
  const title = initial
    ? `Would you like to stay on a houseboat in ${choice?.city.name}?`
    : `Switch the automatic selection to a ${choice.nextValue ? "houseboat" : "regular hotel"} in ${choice.city.name}?`;
  const dialog = (
    <AlertDialog open={Boolean(choice)} onOpenChange={open => { if (!open) setChoice(null); }}>
      {choice && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>
              Both houseboats and regular hotels stay available to choose manually.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={initial ? () => setPreference(false) : undefined}>
              {initial ? "Choose hotel" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => setPreference(choice.nextValue ?? true)}>
              {initial ? "Choose houseboat" : choice.nextValue ? "Switch to houseboat" : "Switch to hotel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );

  return {
    switchFor: (route: Route & { day: number }) => {
      const city = enabled ? findCity(cities, route.next) : undefined;
      if (!city) return null;
      return (
        <div className="flex shrink-0 flex-col items-center gap-0.5">
          <button
            type="button"
            role="switch"
            aria-label={`Prefer houseboats in ${city.name} on day ${route.day}`}
            aria-checked={route.preferHouseboats === true}
            className={`hotel-toggle ${route.preferHouseboats ? "active" : ""}`}
            onClick={() => setChoice({ route, city, destination: route.next, nextValue: !route.preferHouseboats })}
          >
            <span className="hotel-toggle-knob" />
          </button>
          <span aria-hidden="true" className="text-[10px] leading-none text-[#4a4260]">Houseboat</span>
        </div>
      );
    },
    promptForDestination,
    dialog,
  };
}
