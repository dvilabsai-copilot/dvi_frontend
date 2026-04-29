import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AutoSuggestSelect, AutoSuggestOption } from "@/components/AutoSuggestSelect";
import { locationsApi, LocationRow, TollRow } from "@/services/locations";
import { toast } from "sonner";

export default function TollChargePage() {
  const [sources, setSources] = useState<string[]>([]);
  const [destinations, setDestinations] = useState<string[]>([]);

  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");

  const [location, setLocation] = useState<LocationRow | null>(null);
  const [tolls, setTolls] = useState<TollRow[]>([]);

  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [saving, setSaving] = useState(false);

  const sourceOptions: AutoSuggestOption[] = useMemo(
    () =>
      sources.map((item) => ({
        value: item,
        label: item,
      })),
    [sources]
  );

  const destinationOptions: AutoSuggestOption[] = useMemo(
    () =>
      destinations.map((item) => ({
        value: item,
        label: item,
      })),
    [destinations]
  );

  useEffect(() => {
    void loadSources();
  }, []);

  useEffect(() => {
    void loadDestinations(source);
  }, [source]);

  async function loadSources() {
    try {
      setLoadingOptions(true);
      const data = await locationsApi.dropdowns();
      setSources(data.sources || []);
    } catch (error) {
      console.error("Error loading source locations:", error);
      toast.error("Failed to load source locations");
    } finally {
      setLoadingOptions(false);
    }
  }

  async function loadDestinations(selectedSource: string) {
    if (!selectedSource.trim()) {
      setDestinations([]);
      return;
    }

    try {
      const data = await locationsApi.dropdowns({ source: selectedSource });
      setDestinations(data.destinations || []);
    } catch (error) {
      console.error("Error loading destination locations:", error);
      toast.error("Failed to load destination locations");
      setDestinations([]);
    }
  }

  async function handleGetInfo() {
    if (!source.trim() || !destination.trim()) {
      toast.warning("Please select both source and destination");
      return;
    }

    try {
      setLoadingRoute(true);

      const result = await locationsApi.list({
        source: source.trim(),
        destination: destination.trim(),
        page: 1,
        pageSize: 200,
      });

      const sourceValue = source.trim().toLowerCase();
      const destinationValue = destination.trim().toLowerCase();

      const exactMatch = result.rows.find(
        (row) =>
          row.source_location.trim().toLowerCase() === sourceValue &&
          row.destination_location.trim().toLowerCase() === destinationValue
      );

      const found = exactMatch || result.rows[0] || null;

      if (!found) {
        setLocation(null);
        setTolls([]);
        toast.warning("No route found for this source/destination pair");
        return;
      }

      setLocation(found);

      const tollRows = await locationsApi.tolls(found.location_ID);
      setTolls(tollRows);
    } catch (error) {
      console.error("Error loading toll info:", error);
      toast.error("Failed to load toll charges");
    } finally {
      setLoadingRoute(false);
    }
  }

  async function handleSaveTolls() {
    if (!location) {
      toast.warning("Please load a route first");
      return;
    }

    try {
      setSaving(true);

      await locationsApi.saveTolls(
        location.location_ID,
        tolls.map((item) => ({
          vehicle_type_id: item.vehicle_type_id,
          toll_charge: Number(item.toll_charge || 0),
        }))
      );

      toast.success("Toll charges updated");
    } catch (error) {
      console.error("Error saving toll charges:", error);
      toast.error("Failed to save toll charges");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-primary">Toll Charge</h1>

      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-xs mb-1">Source Location *</div>
            <AutoSuggestSelect
              mode="single"
              value={source}
              onChange={(val) => {
                const nextValue = (val as string) || "";
                setSource(nextValue);
                setDestination("");
                setLocation(null);
                setTolls([]);
              }}
              options={sourceOptions}
              placeholder="Choose Source Location"
            />
          </div>

          <div>
            <div className="text-xs mb-1">Destination Location *</div>
            <AutoSuggestSelect
              mode="single"
              value={destination}
              onChange={(val) => {
                setDestination((val as string) || "");
                setLocation(null);
                setTolls([]);
              }}
              options={destinationOptions}
              placeholder="Choose Destination Location"
              disabled={!source.trim()}
            />
          </div>

          <div className="flex items-end gap-2">
            <Button onClick={handleGetInfo} disabled={loadingRoute || !source.trim() || !destination.trim()}>
              {loadingRoute ? "Loading..." : "Get Info"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSource("");
                setDestination("");
                setLocation(null);
                setTolls([]);
              }}
              disabled={loadingRoute || loadingOptions}
            >
              Clear
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-4 space-y-4">
        <h2 className="text-lg font-semibold text-primary">Vehicle Toll Details</h2>

        {!location ? (
          <div className="text-sm text-muted-foreground">
            Select source and destination, then click Get Info to load toll charges.
          </div>
        ) : (
          <>
            <div className="text-sm text-muted-foreground">
              Route: {location.source_location} to {location.destination_location}
            </div>

            <div className="rounded-md border max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>S.NO</TableHead>
                    <TableHead>Vehicle Type</TableHead>
                    <TableHead>Toll Charge</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tolls.map((row, index) => (
                    <TableRow key={row.vehicle_type_id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{row.vehicle_type_name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          value={String(row.toll_charge || 0)}
                          onChange={(e) => {
                            const next = [...tolls];
                            next[index] = {
                              ...row,
                              toll_charge: Number(e.target.value || 0),
                            };
                            setTolls(next);
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveTolls} disabled={saving || loadingRoute || tolls.length === 0}>
                {saving ? "Saving..." : "Update Toll Charges"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
