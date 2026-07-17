/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Copy, FileSpreadsheet, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LocationAutosuggestInput } from "./components/LocationAutosuggestInput";
import { AutoSuggestSelect } from "@/components/AutoSuggestSelect";
import { locationsApi } from "@/services/locations";

export function LocationsPreviewView({ context }: { context: Record<string, any> }) {
  const { addRouteModalOpen, addingSuggestionDays, addingSuggestionForm, confirmDeleteSelectedSuggestion, deleteSuggestedRouteId, destinationOptions, editingSuggestionDays, editingSuggestionForm, editingSuggestionId, editingViaRouteId, filteredRouteSuggestions, getCompactPaginationItems, handleAddToSuggestedRoutes, handleCopySuggestedRoutes, handleCopyViaRoutes, handleDeleteSelectedSuggestion, handleDeleteViaRoute, handleEditSelectedSuggestion, handleExportSuggestedRoutesCSV, handleExportSuggestedRoutesExcel, handleExportViaRoutesCSV, handleExportViaRoutesExcel, handleGetInfo, handleSaveEditedSuggestion, handleSaveNewSuggestedRoute, handleUpdateTolls, isAddSuggestionDetailsStep, location, navigate, openAddViaRouteDialog, openEditViaRouteDialog, pageLoading, renderHighlightedRouteSuggestion, resetAddSuggestionState, resetViaRouteForm, resizeSuggestionDays, routeSuggestionSearch, routeSuggestions, saveViaRoute, selectedDestination, selectedSource, setAddRouteModalOpen, setAddingSuggestionDays, setAddingSuggestionForm, setDeleteSuggestedRouteId, setDeleteViaRouteId, setEditingSuggestionDays, setEditingSuggestionForm, setEditingSuggestionId, setEditingViaRouteId, setIsAddSuggestionDetailsStep, setLastViaRouteLookupValue, setRouteSuggestionSearch, setSelectedDestination, setSelectedSource, setSuggestedRouteCurrentPage, setSuggestedRoutePageSize, setTolls, setViaRouteCurrentPage, setViaRouteDialogOpen, setViaRouteForm, setViaRoutePageSize, sourceOptions, suggestedRouteCurrentPage, suggestedRoutePageSize, suggestedRouteTotalPages, suggestedRoutes, suggestionDayOptions, tolls, viaRouteCurrentPage, viaRouteDeleting, viaRouteDialogOpen, viaRouteForm, viaRouteLookupLoading, viaRoutePageSize, viaRoutePlaceOptions, viaRouteSaving, viaRouteTotalPages, viaRoutes } = context;
  const { deleteViaRouteId } = context;
 if (pageLoading) {
  return (
    <div className="p-6">
      <p>Loading...</p>
    </div>
  );
}

  return (
    <div className="p-6 space-y-6">
      {/* Back button */}
      <Button variant="outline" onClick={() => navigate("/locations")}>
        â† Back to List
      </Button>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-lg font-semibold mb-4">Filter</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <div>
    <label className="text-sm font-medium mb-2 block">Source Location *</label>
    <AutoSuggestSelect
      mode="single"
      value={selectedSource}
      onChange={(value) => {
        const nextValue = String(value || "");
        setSelectedSource(nextValue);
        setSelectedDestination("");
      }}
      options={sourceOptions}
      placeholder="Choose Source Location"
    />
  </div>

  <div>
    <label className="text-sm font-medium mb-2 block">Destination Location *</label>
    <AutoSuggestSelect
      mode="single"
      value={selectedDestination}
      onChange={(value) => setSelectedDestination(String(value || ""))}
      options={destinationOptions}
      placeholder="Choose Destination Location"
    />
  </div>

  <div className="flex items-end">
    <Button onClick={handleGetInfo} className="w-full">
      Get Info
    </Button>
  </div>
</div>
      </div>

      {/* Location Details Section */}
      {location && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-6 text-pink-600">Location Details</h3>

          <div className="grid grid-cols-4 gap-6">
            {/* Row 1: Source info */}
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-2">Source</label>
              <p className="text-sm text-gray-700">{location.source_location}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-2">Source Latitude</label>
              <p className="text-sm text-gray-700">{location.source_latitude}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-2">Source Longitude</label>
              <p className="text-sm text-gray-700">{location.source_longitude}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-2">Source City</label>
              <p className="text-sm text-gray-700">{location.source_city}</p>
            </div>

            {/* Row 2: Destination info */}
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-2">Destination</label>
              <p className="text-sm text-gray-700">{location.destination_location}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-2">Destination Latitude</label>
              <p className="text-sm text-gray-700">{location.destination_latitude}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-2">Destination Longitude</label>
              <p className="text-sm text-gray-700">{location.destination_longitude}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-2">Destination City</label>
              <p className="text-sm text-gray-700">{location.destination_city}</p>
            </div>

            {/* Row 3: Distance & Duration */}
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-2">Distance</label>
              <p className="text-sm text-gray-700">{location.distance_km}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-2">Duration</label>
              <p className="text-sm text-gray-700">{location.duration_text}</p>
            </div>
            <div></div>
            <div></div>
          </div>

          {/* Description if present */}
          {location.location_description && (
            <div className="mt-6 pt-6 border-t">
              <label className="text-xs text-gray-500 font-medium block mb-2">Description</label>
              <p className="text-sm text-gray-700">{location.location_description}</p>
            </div>
          )}

          {/* Via Route Details */}
          {viaRoutes.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <label className="text-xs text-gray-500 font-medium block mb-4">
                Via Route Details
              </label>

              <div className="space-y-4">
                {viaRoutes.map((item) => (
                  <div
                    key={item.via_route_location_ID}
                    className="rounded-md border p-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-2">
                          Place Location
                        </label>
                        <p className="text-sm text-gray-700">
                          {item.via_route_location || "â€”"}
                        </p>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-2">
                          Place City
                        </label>
                        <p className="text-sm text-gray-700">
                          {item.via_route_location_city || "â€”"}
                        </p>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-2">
                          Place State
                        </label>
                        <p className="text-sm text-gray-700">
                          {item.via_route_location_state || "â€”"}
                        </p>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-2">
                          Place Latitude
                        </label>
                        <p className="text-sm text-gray-700">
                          {item.via_route_location_lattitude || "â€”"}
                        </p>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 font-medium block mb-2">
                          Place Longitude
                        </label>
                        <p className="text-sm text-gray-700">
                          {item.via_route_location_longitude || "â€”"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vehicle Toll Details Section */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-6 text-pink-600">Vehicle Toll Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          {tolls.map((toll, idx) => (
            <div key={toll.vehicle_type_id} className="space-y-2">
              <label className="text-xs text-gray-600 font-medium capitalize block">{toll.vehicle_type_name}</label>
              <div className="flex items-center">
                <span className="text-gray-600 mr-2">â‚¹</span>
                <Input
                  type="number"
                  className="flex-1"
                  value={String(toll.toll_charge || 0)}
                  onChange={(e) => {
                    const updated = [...tolls];
                    updated[idx] = { ...toll, toll_charge: Number(e.target.value || 0) };
                    setTolls(updated);
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-start">
          <Button onClick={handleUpdateTolls} className="bg-pink-600 hover:bg-pink-700 text-white">
            Update Toll Charges
          </Button>
        </div>
      </div>

      {/* Via Route List Section */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-pink-600">List Of Via Routes</h3>
          <Button
            type="button"
            size="sm"
            onClick={openAddViaRouteDialog}
            className="bg-pink-100 text-pink-600 hover:bg-pink-200"
          >
            + Add Via Route
          </Button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">Show</span>
            <select
              value={viaRoutePageSize}
              onChange={(e) => {
                setViaRoutePageSize(Number(e.target.value));
                setViaRouteCurrentPage(1);
              }}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm">entries</span>
          </div>

          <div className="flex items-center gap-2">
  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={handleCopyViaRoutes}
    className="border-blue-600 text-blue-600 hover:bg-blue-50"
  >
    <Copy className="h-4 w-4 mr-2" />
    Copy
  </Button>

  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={handleExportViaRoutesExcel}
    className="border-green-600 text-green-600 hover:bg-green-50"
  >
    <FileSpreadsheet className="h-4 w-4 mr-2" />
    Excel
  </Button>

  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={handleExportViaRoutesCSV}
    className="border-orange-600 text-orange-600 hover:bg-orange-50"
  >
    <FileText className="h-4 w-4 mr-2" />
    CSV
  </Button>
</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">S.NO</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">VIA ROUTE LOCATION</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">CITY</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">STATE</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">LATITUDE</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">LONGITUDE</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {viaRoutes.length > 0 ? (
                viaRoutes
                  .slice(
                    (viaRouteCurrentPage - 1) * viaRoutePageSize,
                    viaRouteCurrentPage * viaRoutePageSize
                  )
                  .map((item, index) => (
                    <tr key={item.via_route_location_ID} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">{(viaRouteCurrentPage - 1) * viaRoutePageSize + index + 1}</td>
                      <td className="px-4 py-3">{item.via_route_location || "â€”"}</td>
                      <td className="px-4 py-3">{item.via_route_location_city || "â€”"}</td>
                      <td className="px-4 py-3">{item.via_route_location_state || "â€”"}</td>
                      <td className="px-4 py-3">{item.via_route_location_lattitude || "â€”"}</td>
                      <td className="px-4 py-3">{item.via_route_location_longitude || "â€”"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditViaRouteDialog(item)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteViaRouteId(item.via_route_location_ID)}
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                    No via routes added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-6 text-sm text-gray-600">
          <span>
            Showing {viaRoutes.length === 0 ? 0 : (viaRouteCurrentPage - 1) * viaRoutePageSize + 1} to{" "}
            {Math.min(viaRouteCurrentPage * viaRoutePageSize, viaRoutes.length)} of {viaRoutes.length} entries
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViaRouteCurrentPage(Math.max(1, viaRouteCurrentPage - 1))}
              disabled={viaRouteCurrentPage === 1}
            >
              Previous
            </Button>
            <Button
              size="sm"
              onClick={() => setViaRouteCurrentPage(1)}
              className={viaRouteCurrentPage === 1 ? "bg-purple-600 text-white" : ""}
            >
              1
            </Button>
            {getCompactPaginationItems(viaRouteTotalPages, viaRouteCurrentPage)
              .filter((item, index) => !(index === 0 && item === 1))
              .map((item, index) => {
                if (item === "ellipsis") {
                  return (
                    <span key={`via-ellipsis-${index}`} className="px-2 py-1 text-gray-500">
                      ...
                    </span>
                  );
                }

                return (
                  <Button
                    key={item}
                    size="sm"
                    onClick={() => setViaRouteCurrentPage(item)}
                    className={viaRouteCurrentPage === item ? "bg-purple-600 text-white" : ""}
                  >
                    {item}
                  </Button>
                );
              })}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setViaRouteCurrentPage(
                  Math.min(viaRouteTotalPages, viaRouteCurrentPage + 1)
                )
              }
              disabled={viaRouteCurrentPage === viaRouteTotalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Route Suggestions Section */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-pink-600">List Of Routes Suggestions</h3>
          <Button
            type="button"
            size="sm"
            onClick={() => {
  setAddRouteModalOpen(true);
  setRouteSuggestionSearch("");
  setIsAddSuggestionDetailsStep(false);
  setAddingSuggestionForm({
    routes: "",
            no_of_nights: "",
            route_details: "",
          });
}}
            className="bg-pink-100 text-pink-600 hover:bg-pink-200"
          >
            + Add Route
          </Button>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm">Show</span>
            <select
              value={suggestedRoutePageSize}
              onChange={(e) => {
                setSuggestedRoutePageSize(Number(e.target.value));
                setSuggestedRouteCurrentPage(1);
              }}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm">entries</span>
          </div>

         <div className="flex items-center gap-2">
  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={handleCopySuggestedRoutes}
    className="border-blue-600 text-blue-600 hover:bg-blue-50"
  >
    <Copy className="h-4 w-4 mr-2" />
    Copy
  </Button>

  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={handleExportSuggestedRoutesExcel}
    className="border-green-600 text-green-600 hover:bg-green-50"
  >
    <FileSpreadsheet className="h-4 w-4 mr-2" />
    Excel
  </Button>

  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={handleExportSuggestedRoutesCSV}
    className="border-orange-600 text-orange-600 hover:bg-orange-50"
  >
    <FileText className="h-4 w-4 mr-2" />
    CSV
  </Button>
</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">S.NO</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ROUTES</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">NO OF NIGHTS</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ROUTE DETAILS</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ACTION</th>
              </tr>
            </thead>
            <tbody>
             {suggestedRoutes.length > 0 ? (
              suggestedRoutes
                  .slice(
                    (suggestedRouteCurrentPage - 1) * suggestedRoutePageSize,
                    suggestedRouteCurrentPage * suggestedRoutePageSize
                  )
                  .map((route, index) => (
                    <tr key={route.modify} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">{(suggestedRouteCurrentPage - 1) * suggestedRoutePageSize + index + 1}</td>
                      <td className="px-4 py-3">{route.routes || "â€”"}</td>
                      <td className="px-4 py-3">{route.no_of_nights || "â€”"}</td>
                      <td className="px-4 py-3">{route.route_details || "â€”"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditSelectedSuggestion(route)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSelectedSuggestion(route.modify)}
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    No data available in table
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-6 text-sm text-gray-600">
          <span>
           Showing {suggestedRoutes.length === 0 ? 0 : (suggestedRouteCurrentPage - 1) * suggestedRoutePageSize + 1} to{" "}
{Math.min(suggestedRouteCurrentPage * suggestedRoutePageSize, suggestedRoutes.length)} of {suggestedRoutes.length} entries
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSuggestedRouteCurrentPage(Math.max(1, suggestedRouteCurrentPage - 1))}
              disabled={suggestedRouteCurrentPage === 1}
            >
              Previous
            </Button>
            <Button
              size="sm"
              onClick={() => setSuggestedRouteCurrentPage(1)}
              className={suggestedRouteCurrentPage === 1 ? "bg-purple-600 text-white" : ""}
            >
              1
            </Button>
            {getCompactPaginationItems(suggestedRouteTotalPages, suggestedRouteCurrentPage)
              .filter((item, index) => !(index === 0 && item === 1))
              .map((item, index) => {
                if (item === "ellipsis") {
                  return (
                    <span key={`suggested-ellipsis-${index}`} className="px-2 py-1 text-gray-500">
                      ...
                    </span>
                  );
                }

                return (
                  <Button
                    key={item}
                    size="sm"
                    onClick={() => setSuggestedRouteCurrentPage(item)}
                    className={suggestedRouteCurrentPage === item ? "bg-purple-600 text-white" : ""}
                  >
                    {item}
                  </Button>
                );
              })}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setSuggestedRouteCurrentPage(
                  Math.min(suggestedRouteTotalPages, suggestedRouteCurrentPage + 1)
                )
              }
              disabled={suggestedRouteCurrentPage === suggestedRouteTotalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

            {viaRouteDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">
  {editingViaRouteId ? "Edit Via Route Details" : "Add Via Route Details"}
</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Place Location *</label>
  <LocationAutosuggestInput
      placeholder="Search location..."
     value={viaRouteForm.via_route_location}
  onValueChange={(value) => {
    const normalizedNext = value.trim().toLowerCase();

    setViaRouteForm((prev) => {
      const normalizedPrev = prev.via_route_location.trim().toLowerCase();

      // Keep existing autofilled values when the selected place is unchanged.
      if (normalizedPrev === normalizedNext) {
        return {
          ...prev,
          via_route_location: value,
        };
      }

      return {
        ...prev,
        via_route_location: value,
        via_route_location_city: "",
        via_route_location_state: "",
        via_route_location_lattitude: "",
        via_route_location_longitude: "",
        distance_from_source_location: "",
        duration_from_source_location: "",
      };
    });

    // Ensure a new lookup runs when user picks/enters a different place.
    setLastViaRouteLookupValue("");
  }}
  search={(phrase) => locationsApi.searchDestinations(phrase)}
  defaultItems={viaRoutePlaceOptions}
/>
<p className="mt-1 text-xs text-gray-500">
  If this place already exists in the database, city, state, latitude, longitude, distance and duration will autofill automatically.
</p>
{viaRouteLookupLoading && (
  <p className="mt-3 text-sm text-gray-500">Fetching stored place details...</p>
)}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Place City</label>
                <Input
                  value={viaRouteForm.via_route_location_city}
                  onChange={(e) =>
                    setViaRouteForm((prev) => ({
                      ...prev,
                      via_route_location_city: e.target.value,
                    }))
                  }
                  placeholder="Enter place city"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Place State</label>
                <Input
                  value={viaRouteForm.via_route_location_state}
                  onChange={(e) =>
                    setViaRouteForm((prev) => ({
                      ...prev,
                      via_route_location_state: e.target.value,
                    }))
                  }
                  placeholder="Enter place state"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Place Latitude</label>
                <Input
                  value={viaRouteForm.via_route_location_lattitude}
                  onChange={(e) =>
                    setViaRouteForm((prev) => ({
                      ...prev,
                      via_route_location_lattitude: e.target.value,
                    }))
                  }
                  placeholder="Enter place latitude"
                />
              </div>

                            <div>
                <label className="text-sm font-medium mb-2 block">Place Longitude</label>
                <Input
                  value={viaRouteForm.via_route_location_longitude}
                  onChange={(e) =>
                    setViaRouteForm((prev) => ({
                      ...prev,
                      via_route_location_longitude: e.target.value,
                    }))
                  }
                  placeholder="Enter place longitude"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Distance from Source</label>
                <Input
                  value={viaRouteForm.distance_from_source_location}
                  onChange={(e) =>
                    setViaRouteForm((prev) => ({
                      ...prev,
                      distance_from_source_location: e.target.value,
                    }))
                  }
                  placeholder="Enter distance from source"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Duration from Source</label>
                <Input
                  value={viaRouteForm.duration_from_source_location}
                  onChange={(e) =>
                    setViaRouteForm((prev) => ({
                      ...prev,
                      duration_from_source_location: e.target.value,
                    }))
                  }
                  placeholder="Enter duration from source"
                />
              </div>
            </div>

            

            <div className="mt-6 flex justify-end gap-2">
              <Button
  variant="outline"
  onClick={() => {
    setViaRouteDialogOpen(false);
    setLastViaRouteLookupValue("");
    setEditingViaRouteId(null);
    resetViaRouteForm();
  }}
>
  Cancel
</Button>
              <Button onClick={saveViaRoute} disabled={viaRouteSaving}>
  {viaRouteSaving ? "Saving..." : "Save"}
</Button>
            </div>
          </div>
        </div>
      )}

            {deleteViaRouteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Delete Via Route</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Do you really want to delete this via route?
            </p>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteViaRouteId(null)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteViaRoute} disabled={viaRouteDeleting}>
                {viaRouteDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

            {deleteSuggestedRouteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-3">Delete Suggested Route</h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this suggested route?
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteSuggestedRouteId(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDeleteSelectedSuggestion}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {editingSuggestionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">Edit Route Suggestion</h3>

                  <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
            {selectedSource || "Source"}
          </span>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
            {selectedDestination || "Destination"}
          </span>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Total No. of Nights</label>
          <Input
            type="number"
            min="0"
            value={editingSuggestionForm.no_of_nights}
            onChange={(e) => {
              const value = e.target.value;
              setEditingSuggestionForm((prev) => ({
                ...prev,
                no_of_nights: value,
              }));
              resizeSuggestionDays(value, setEditingSuggestionDays);
            }}
            placeholder="Enter total number of nights"
          />
        </div>

        {editingSuggestionDays.length > 0 && (
          <div className="space-y-3">
            {editingSuggestionDays.map((dayValue, index) => (
              <div key={index}>
                <label className="text-sm font-medium mb-2 block">
                  #{`Day ${index + 1}`}
                </label>
                <LocationAutosuggestInput
  placeholder="Search location..."
  value={dayValue}
  onValueChange={(value) =>
    setEditingSuggestionDays((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? value : item
      )
    )
  }
  search={(phrase) =>
    locationsApi.searchDestinations(phrase, selectedSource, {
      dayNo: index + 1,
      totalNoOfDays: editingSuggestionDays.length,
      departureLocation: selectedSource,
    })
  }
  defaultItems={viaRoutePlaceOptions}
/>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setEditingSuggestionId(null);
            setEditingSuggestionForm({
              routes: "",
              no_of_nights: "",
              route_details: "",
            });
            setEditingSuggestionDays([]);
          }}
        >
          Cancel
        </Button>
        <Button onClick={handleSaveEditedSuggestion}>Save</Button>
      </div>
          </div>
        </div>
      )}

      {addRouteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
  {isAddSuggestionDetailsStep ? "Add Route Suggestion Details" : "Select Route Suggestion"}
</h3>

{!isAddSuggestionDetailsStep ? (
  <>
    <div className="mb-4 space-y-3">
      <Input
        value={routeSuggestionSearch}
        onChange={(e) => setRouteSuggestionSearch(e.target.value)}
        placeholder="Search location in suggestions..."
      />

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => {
            resetAddSuggestionState();
            setIsAddSuggestionDetailsStep(true);
          }}
        >
          Add Manually
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            resetAddSuggestionState();
            setAddRouteModalOpen(false);
          }}
        >
          Close
        </Button>
      </div>
    </div>

    {routeSuggestions.length > 0 ? (
      filteredRouteSuggestions.length > 0 ? (
      <div className="space-y-2">
        {filteredRouteSuggestions.map((route) => (
          <Button
            key={route}
            type="button"
            variant="outline"
            className="w-full justify-start text-left text-gray-700 border-gray-300 hover:bg-gray-50"
            onClick={() => handleAddToSuggestedRoutes(route)}
          >
            {renderHighlightedRouteSuggestion(route)}
          </Button>
        ))}
      </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-4">
          No location matches your search.
        </p>
      )
    ) : (
      <p className="text-sm text-gray-500 text-center py-4">
        No route suggestions available. You can still add a route manually.
      </p>
    )}
  </>
) : (
  <>
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
          {selectedSource || "Source"}
        </span>
        <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
          {selectedDestination || "Destination"}
        </span>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Total No. of Nights</label>
        <Input
          type="number"
          min="0"
          value={addingSuggestionForm.no_of_nights}
          onChange={(e) => {
            const value = e.target.value;
            setAddingSuggestionForm((prev) => ({
              ...prev,
              no_of_nights: value,
            }));
            resizeSuggestionDays(value, setAddingSuggestionDays);
          }}
          placeholder="Enter total number of nights"
        />
      </div>

      {addingSuggestionDays.length > 0 && (
        <div className="space-y-3">
          {addingSuggestionDays.map((dayValue, index) => (
            <div key={index}>
              <label className="text-sm font-medium mb-2 block">
                #{`Day ${index + 1}`}
              </label>
              <AutoSuggestSelect
                mode="single"
                value={dayValue}
                onChange={(value) =>
                  setAddingSuggestionDays((prev) =>
                    prev.map((item, itemIndex) =>
                      itemIndex === index ? String(value || "") : item
                    )
                  )
                }
                options={suggestionDayOptions}
                placeholder="Choose Location"
              />
            </div>
          ))}
        </div>
      )}
    </div>

    <div className="mt-6 flex justify-end gap-2">
      <Button
        variant="outline"
        onClick={() => {
          resetAddSuggestionState();
        }}
      >
        Back
      </Button>
      <Button onClick={handleSaveNewSuggestedRoute}>
        Save
      </Button>
    </div>
  </>
)}
          </div>
        </div>
      )}

    </div>
  );
}
