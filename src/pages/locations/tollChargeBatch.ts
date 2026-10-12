import type { locationsApi } from "@/services/locations";

export type TollPair = { source: string; destination: string };
export type TollEditorRow = {
  vehicle_type_id: number;
  vehicle_type_name: string;
  charge: string;
};
export type TollRouteEditor = TollPair & {
  rows: TollEditorRow[];
  loadError: string;
  saveState: "idle" | "saved" | "error";
  saveError: string;
  dirty: boolean;
};
type TollApi = Pick<typeof locationsApi, "tolls" | "saveTolls">;
const normalize = (value: string) => value.trim().toLowerCase();

export function parseTollCharge(value: string): number | null {
  if (!/^\d+(?:\.\d+)?$/.test(value.trim())) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export async function loadTollRoute(
  pair: TollPair,
  api: Pick<TollApi, "tolls">,
): Promise<TollRouteEditor> {
  const route: TollRouteEditor = {
    ...pair, rows: [], loadError: "",
    saveState: "idle", saveError: "", dirty: false,
  };
  try {
    const tolls = await api.tolls(pair.source, pair.destination);
    if (tolls.some((row) => !Number.isSafeInteger(row.vehicle_type_id) || row.vehicle_type_id <= 0) ||
        new Set(tolls.map((row) => row.vehicle_type_id)).size !== tolls.length) {
      throw new Error("Invalid or duplicate vehicle types were returned for this route.");
    }
    return {
      ...route,
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
  const pending = routes.filter((route) => !route.loadError &&
    route.rows.length > 0 && route.saveState !== "saved");

  // Validate the entire pending batch before sending any write request.
  if (new Set(pending.map((route) => `${normalize(route.source)}::${normalize(route.destination)}`)).size !== pending.length) {
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
      const response = await api.saveTolls(route.source, route.destination, route.rows.map((row) => ({
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
