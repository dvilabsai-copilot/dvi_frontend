/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { AutoSuggestSelect } from "@/components/AutoSuggestSelect";

export function LocationsPreviewHeader({ context }: { context: Record<string, any> }) {
  const { destinationOptions, handleGetInfo, selectedDestination, selectedSource, setSelectedDestination, setSelectedSource, sourceOptions } = context;
  return (
    <>
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-semibold mb-4">Filter</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className="text-sm font-medium mb-2 block">Source Location *</label><AutoSuggestSelect mode="single" value={selectedSource} onChange={(value) => { const nextValue = String(value || ""); setSelectedSource(nextValue); setSelectedDestination(""); }} options={sourceOptions} placeholder="Choose Source Location" /></div>
          <div><label className="text-sm font-medium mb-2 block">Destination Location *</label><AutoSuggestSelect mode="single" value={selectedDestination} onChange={(value) => setSelectedDestination(String(value || ""))} options={destinationOptions} placeholder="Choose Destination Location" /></div>
          <div className="flex items-end"><Button onClick={handleGetInfo} className="w-full">Get Info</Button></div>
        </div>
      </div>
    </>
  );
}
