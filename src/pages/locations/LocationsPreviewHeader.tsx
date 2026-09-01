/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { AutoSuggestSelect } from "@/components/AutoSuggestSelect";

export function LocationsPreviewHeader({
  context,
}: {
  context: Record<string, any>;
}) {
  const {
    destinationOptions,
    handleGetInfo,
    selectedDestinations,
    selectedSources,
    setSelectedDestinations,
    setSelectedSources,
    sourceOptions,
  } = context;

  return (
    <>
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-semibold mb-4">Filter</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Source Location *
            </label>

            <AutoSuggestSelect
              mode="multi"
              value={selectedSources}
              onChange={(value) =>
                setSelectedSources(
                  Array.isArray(value) ? value.slice(0, 5) : []
                )
              }
              options={sourceOptions}
              maxSelected={5}
              placeholder="Choose Source Locations"
            />

            <p className="text-xs text-muted-foreground mt-1">
              Select up to 5 locations
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Destination Location *
            </label>

            <AutoSuggestSelect
              mode="multi"
              value={selectedDestinations}
              onChange={(value) =>
                setSelectedDestinations(
                  Array.isArray(value) ? value.slice(0, 5) : []
                )
              }
              options={destinationOptions}
              maxSelected={5}
              placeholder="Choose Destination Locations"
            />

            <p className="text-xs text-muted-foreground mt-1">
              Select up to 5 locations
            </p>
          </div>

          <div className="flex items-end">
            <Button
              onClick={handleGetInfo}
              className="w-full"
            >
              Get Info
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}