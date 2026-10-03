import type { locationsApi } from "@/services/locations";

export type TollPair = { source: string; destination: string };
export type TollEditorRow = {
  vehicle_type_id: number;
  vehicle_type_name: string;
  charge: string;
};
export type TollRouteEditor = TollPair & {
  locationId: number | null;
  rows: TollEditorRow[];
  loadError: string;
  saveState: "idle" | "saved" | "error";
  saveError: string;
  dirty: boolean;
};
type TollApi = Pick<typeof locationsApi, "list" | "tolls" | "saveTolls">;
const normalize = (value: string) => value.trim().toLowerCase();

export function parseTollCharge(value: string): number | null {
  if (!/^\d+(?:\.\d+)?$/.test(value.trim())) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export async function loadTollRoute(
  pair: TollPair,
  api: Pick<TollApi, "list" | "tolls">,
): Promise<TollRouteEditor> {
  const route: TollRouteEditor = {
    ...pair, locationId: null, rows: [], loadError: "",
    saveState: "idle", saveError: "", dirty: false,
  };
  try {
    const result = await api.list({ ...pair, page: 1, pageSize: 200 });
    const matches = result.rows.filter((row) =>
      normalize(row.source_location) === normalize(pair.source) &&
      normalize(row.destination_location) === normalize(pair.destination),
    );
    const ids = new Set(matches.map((row) => row.location_ID));
    if (!matches.length) throw new Error("No exact route found. Check this source/destination pair.");
    if (ids.size !== 1 || !Number.isSafeInteger(matches[0].location_ID) || matches[0].location_ID <= 0) {
      throw new Error("This route has ambiguous or invalid records. Resolve them before updating tolls.");
    }
    const locationId = matches[0].location_ID;
    const tolls = await api.tolls(locationId);
    if (tolls.some((row) => !Number.isSafeInteger(row.vehicle_type_id) || row.vehicle_type_id <= 0) ||
        new Set(tolls.map((row) => row.vehicle_type_id)).size !== tolls.length) {
      throw new Error("Invalid or duplicate vehicle types were returned for this route.");
    }
    return {
      ...route, locationId,
      rows: tolls.map((row) => ({
        vehicle_type_id: row.vehicle_type_id,
        vehicle_type_name: row.vehicle_type_name,
        charge: String(row.toll_charge),
      })),
    };
  } catch (error) {
    return { ...route, loadError: error instanceof Error ? error.message : "Unable to load this route." };
  }
}

export async function saveTollRoutes(
  routes: TollRouteEditor[],
  api: Pick<TollApi, "saveTolls">,
): Promise<TollRouteEditor[]> {
  const pending = routes.filter((route) => route.locationId !== null && !route.loadError &&
    route.rows.length > 0 && route.saveState !== "saved");

  // Validate the entire pending batch before sending any write request.
  if (new Set(pending.map((route) => route.locationId)).size !== pending.length) {
    throw new Error("The same route appears more than once. Reload distinct route pairs.");
  }
  for (const route of pending) {
    for (const row of route.rows) {
      if (parseTollCharge(row.charge) === null) {
        throw new Error(`${route.source} to ${route.destination}: enter a valid non-negative toll for ${row.vehicle_type_name}.`);
      }
    }
  }

  const updated = [...routes];
  for (const route of pending) {
    const index = routes.indexOf(route);
    try {
      const response = await api.saveTolls(route.locationId!, route.rows.map((row) => ({
        vehicle_type_id: row.vehicle_type_id,
        toll_charge: parseTollCharge(row.charge)!,
      })));
      if (response?.ok !== true) throw new Error("The server did not confirm this update.");
      updated[index] = { ...route, saveState: "saved", saveError: "", dirty: false };
    } catch (error) {
      updated[index] = {
        ...route, saveState: "error",
        saveError: error instanceof Error ? error.message : "Update failed. Please retry.",
      };
    }
  }
  return updated;
}
