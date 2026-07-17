/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VendorStepVehicleTypeCostDeleteDialogs } from "./VendorStepVehicleTypeCostDeleteDialogs";

export function VendorStepVehicleTypeCostView({ context }: { context: Record<string, any> }) {
  const { activeTab, deleteDriverCostId, deleteLocalId, deleteOutstationId, driverCostRows, driverCostSearch, driverCostVehicleTypeOptions, driverFieldErrors, driverFormFields, driverFormVehicleType, editingDriverRow, editingLocalRow, editingOutstationRow, filteredDriverCostRows, filteredLocalRows, filteredOutstationRows, handleCopyDriverCost, handleDeleteDriverCost, handleDeleteLocal, handleDeleteOutstation, handleDownloadDriverCostCsv, handleSaveDriverCost, handleSaveLocal, handleSaveOutstation, localFieldErrors, localFormFields, localFormVehicleType, localRows, localSaveLocked, localSearch, onBack, onNext, openAddDriverCost, openAddLocal, openAddOutstation, openEditDriverCost, openEditLocal, openEditOutstation, outstationFieldErrors, outstationFormFields, outstationFormVehicleType, outstationRows, outstationSaveLocked, outstationSearch, renderTableHeader, renderTopTabs, saving, setDeleteDriverCostId, setDeleteLocalId, setDeleteOutstationId, setDriverCostSearch, setDriverFieldErrors, setDriverFormFields, setDriverFormVehicleType, setEditingDriverRow, setLocalFieldErrors, setLocalFormFields, setLocalFormVehicleType, setLocalSaveLocked, setLocalSearch, setOutstationFieldErrors, setOutstationFormFields, setOutstationFormVehicleType, setOutstationSaveLocked, setOutstationSearch, setShowDriverCostModal, setShowLocalModal, setShowOutstationModal, showDriverCostModal, showLocalModal, showOutstationModal, vehicleTypeOptions, vendorId } = context;
  return (
    <Card>
      <CardHeader className="flex flex-col gap-1">
        <CardTitle className="text-pink-600 text-lg">
          Vehicle Type â€“ Driver Cost
        </CardTitle>
        {!vendorId && (
          <p className="text-xs text-red-500">
            Save <span className="font-semibold">Basic Info</span> and{" "}
            <span className="font-semibold">Branch</span> before configuring
            driver cost.
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {renderTopTabs()}

        {/* ---------- DRIVER COST TAB ---------- */}
        {activeTab === "driverCost" && (
          <div className="pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-700">
                List of Vehicle Type - Driver Cost
              </h2>
              <Button
                type="button"
                className="bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-full px-4 py-2 text-sm font-semibold"
                onClick={openAddDriverCost}
                disabled={!vendorId}
              >
                + Add Vehicle Type - Driver Cost
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span>Show</span>
                <select className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                </select>
                <span>entries</span>
              </div>

              <div className="flex items-center gap-2">
                <span>Search:</span>
                <Input
                  value={driverCostSearch}
                  onChange={(e) => setDriverCostSearch(e.target.value)}
                  className="h-8 w-48 text-sm"
                />
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                {renderTableHeader([
                  "S.NO",
                  "ACTION",
                  "VEHICLE TYPE",
                  "DRIVER BHATTA(â‚¹)",
                  "FOOD COST(â‚¹)",
                  "ACCOMODATION COST(â‚¹)",
                  "EXTRA COST(â‚¹)",
                  "MORNING CHARGES(â‚¹)",
                  "EVENING CHARGES(â‚¹)",
                ])}
                <tbody className="bg-white">
                  {filteredDriverCostRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-6 text-center text-sm text-gray-500"
                      >
                        No data available in table
                      </td>
                    </tr>
                  )}
                  {filteredDriverCostRows.map((row, index) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 border-b border-gray-100">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-3 text-xs"
                          type="button"
                          onClick={() => openEditDriverCost(row)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-3 text-xs text-red-600 border-red-200"
                          type="button"
                          onClick={() => setDeleteDriverCostId(row.id)}
                        >
                          Delete
                        </Button>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {vehicleTypeOptions.find(o => o.id === row.vehicleType)?.label || row.vehicleType}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {row.driverBhatta}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {row.foodCost}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {row.accommodationCost}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {row.extraCost}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {row.morningCharges}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {row.eveningCharges}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-500">
              <span>
                Showing 0 to {filteredDriverCostRows.length} of{" "}
                {driverCostRows.length} entries
              </span>
              <div className="flex items-center gap-2">

              <Button
  type="button"
  variant="outline"
  size="sm"
  className="h-8 px-3 text-xs"
  onClick={handleCopyDriverCost}
>
  Copy
</Button>
<Button
  type="button"
  variant="outline"
  size="sm"
  className="h-8 px-3 text-xs"
  onClick={handleDownloadDriverCostCsv}
>
  Excel
</Button>
<Button
  type="button"
  variant="outline"
  size="sm"
  className="h-8 px-3 text-xs"
  onClick={handleDownloadDriverCostCsv}
>
  CSV
</Button>

              </div>
            </div>
          </div>
        )}

        {/* ---------- OUTSTATION KM LIMIT TAB ---------- */}
        {activeTab === "outstation" && (
          <div className="pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-700">
                List of Outstation KM Limit
              </h2>
              <Button
                type="button"
                className="bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-full px-4 py-2 text-sm font-semibold"
                onClick={openAddOutstation}
                disabled={!vendorId}
              >
                + Add Outstation KM Limit
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span>Show</span>
                <select className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                </select>
                <span>entries</span>
              </div>

              <div className="flex items-center gap-2">
                <span>Search:</span>
                <Input
                  value={outstationSearch}
                  onChange={(e) => setOutstationSearch(e.target.value)}
                  className="h-8 w-48 text-sm"
                />
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                {renderTableHeader([
                  "S.NO",
                  "ACTION",
                  "VENDOR",
                  "VEHICLE TYPE",
                  "OUTSTATION KM LIMIT TITLE",
                  "OUTSTATION KM LIMIT",
                  "STATUS",
                ])}
                <tbody className="bg-white">
                  {filteredOutstationRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-6 text-center text-sm text-gray-500"
                      >
                        No data available in table
                      </td>
                    </tr>
                  )}
                  {filteredOutstationRows.map((row, index) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 border-b border-gray-100">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-3 text-xs"
                          type="button"
                          onClick={() => openEditOutstation(row)}
                        >
                          Edit
                        </Button>
                     <Button
  variant="outline"
  size="sm"
  className="h-7 px-3 text-xs text-red-600 border-red-200"
  type="button"
  onClick={() => setDeleteOutstationId(row.id)}
>
  Delete
</Button>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {/* Vendor column: in PHP this is vendor name; here just show current vendorId */}
                        {vendorId ?? "-"}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {vehicleTypeOptions.find(o => o.id === row.vehicleType)?.label || row.vehicleType}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {row.title}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {row.limit}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {row.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-500">
              <span>
                Showing 0 to {filteredOutstationRows.length} of{" "}
                {outstationRows.length} entries
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                >
                  Copy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                >
                  Excel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                >
                  CSV
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ---------- LOCAL KM LIMIT TAB ---------- */}
        {activeTab === "local" && (
          <div className="pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-base font-semibold text-gray-700">
                List of Local KM Limit
              </h2>
              <Button
                type="button"
                className="bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-full px-4 py-2 text-sm font-semibold"
                onClick={openAddLocal}
                disabled={!vendorId}
              >
                + Add Local KM Limit
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span>Show</span>
                <select className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500">
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                </select>
                <span>entries</span>
              </div>

              <div className="flex items-center gap-2">
                <span>Search:</span>
                <Input
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  className="h-8 w-48 text-sm"
                />
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                {renderTableHeader([
                  "S.NO",
                  "ACTION",
                  "VENDOR",
                  "VEHICLE TYPE",
                  "TITLE",
                  "HOURS",
                  "KM",
                  "STATUS",
                ])}
                <tbody className="bg-white">
                  {filteredLocalRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-6 text-center text-sm text-gray-500"
                      >
                        No data available in table
                      </td>
                    </tr>
                  )}
                  {filteredLocalRows.map((row, index) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 border-b border-gray-100">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100 space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-3 text-xs"
                          type="button"
                          onClick={() => openEditLocal(row)}
                        >
                          Edit
                        </Button>
                       <Button
  variant="outline"
  size="sm"
  className="h-7 px-3 text-xs text-red-600 border-red-200"
  type="button"
  onClick={() => setDeleteLocalId(row.id)}
>
  Delete
</Button>
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {vendorId ?? "-"}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {vehicleTypeOptions.find(o => o.id === row.vehicleType)?.label || row.vehicleType}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {row.title}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {row.hours}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {row.km}
                      </td>
                      <td className="px-4 py-3 border-b border-gray-100">
                        {row.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-500">
              <span>
                Showing 0 to {filteredLocalRows.length} of {localRows.length}{" "}
                entries
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                >
                  Copy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                >
                  Excel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                >
                  CSV
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER BUTTONS */}
        <div className="mt-6 flex justify-between">
          <Button variant="outline" type="button" onClick={onBack}>
            Back
          </Button>
          <Button
            type="button"
            onClick={onNext}
            disabled={!vendorId}
            className="bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600"
          >
            Continue
          </Button>
        </div>
      </CardContent>

      {/* ============================================================
          MODALS
          ============================================================ */}

      {/* DRIVER COST MODAL */}
      <Dialog
  open={showDriverCostModal}
  onOpenChange={(open) => {
    setShowDriverCostModal(open);
    if (!open) {
      setEditingDriverRow(null);
    }
  }}
>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-800">
              Vehicle Type - Driver Cost
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                Vehicle type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={driverFormVehicleType}
                onValueChange={(value) => {
                  setDriverFormVehicleType(value);
                  setDriverFieldErrors((prev) => ({ ...prev, vehicleType: undefined }));
                }}
              >
                <SelectTrigger
                  className={`w-full ${driverFieldErrors.vehicleType ? "border-red-400 focus-visible:ring-red-300" : ""}`}
                >
                  <SelectValue placeholder="Choose Any One" />
                </SelectTrigger>
   <SelectContent>
  {vehicleTypeOptions.map((v) => (
    <SelectItem key={v.id} value={v.id}>
      {v.label}
    </SelectItem>
  ))}
</SelectContent>
              </Select>
              {driverFieldErrors.vehicleType ? (
                <p className="text-xs text-red-600">{driverFieldErrors.vehicleType}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-1">
  <Label>Driver Bhatta (â‚¹)</Label>
  <Input
    placeholder="Driver Bhatta"
    value={driverFormFields.driverBhatta}
    onChange={(e) => {
      setDriverFormFields((prev) => ({
        ...prev,
        driverBhatta: e.target.value,
      }));
    }}
  />
</div>
            <div className="space-y-1">
  <Label>Driver Food Cost (â‚¹)</Label>
  <Input
    placeholder="Food Cost"
    value={driverFormFields.foodCost}
    onChange={(e) => {
      setDriverFormFields((prev) => ({
        ...prev,
        foodCost: e.target.value,
      }));
    }}
  />
</div>
            <div className="space-y-1">
  <Label>Driver Accomodation Cost (â‚¹)</Label>
  <Input
    placeholder="Accomodation Cost"
    value={driverFormFields.accommodationCost}
    onChange={(e) => {
      setDriverFormFields((prev) => ({
        ...prev,
        accommodationCost: e.target.value,
      }));
    }}
  />
</div>
            <div className="space-y-1">
  <Label>Extra Cost (â‚¹)</Label>
  <Input
    placeholder="Extra Cost"
    value={driverFormFields.extraCost}
    onChange={(e) => {
      setDriverFormFields((prev) => ({
        ...prev,
        extraCost: e.target.value,
      }));
    }}
  />
</div>
              <div className="space-y-1">
  <Label>Early Morning Charges Per Hour (Before 6 AM) (â‚¹)</Label>
  <Input
    placeholder="Early Morning Charges"
    value={driverFormFields.morningCharges}
    onChange={(e) => {
      setDriverFormFields((prev) => ({
        ...prev,
        morningCharges: e.target.value,
      }));
    }}
  />
</div>
              <div className="space-y-1">
  <Label>Evening Charges Per Hour (After 8 PM) (â‚¹)</Label>
  <Input
    placeholder="Evening Charges"
    value={driverFormFields.eveningCharges}
    onChange={(e) => {
      setDriverFormFields((prev) => ({
        ...prev,
        eveningCharges: e.target.value,
      }));
    }}
  />
</div>
            </div>
          </div>

          <DialogFooter className="mt-6 flex justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              className="bg-gray-100 text-gray-700 px-6"
              onClick={() => setShowDriverCostModal(false)}
            >
              Cancel
            </Button>
           <Button
  type="button"
  className="bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 px-8"
  onClick={handleSaveDriverCost}
  disabled={saving}
>
  {saving ? "Saving..." : editingDriverRow ? "Update" : "Save"}
</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OUTSTATION KM LIMIT MODAL */}
      <Dialog
        open={showOutstationModal}
        onOpenChange={(open) => {
          setShowOutstationModal(open);
          if (!open) {
            setOutstationSaveLocked(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-800">
              {editingOutstationRow
                ? "Update Outstation KM Limit"
                : "Add Outstation KM Limit"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label>
                Vehicle type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={outstationFormVehicleType}
                onValueChange={(value) => {
                  setOutstationSaveLocked(false);
                  setOutstationFormVehicleType(value);
                  setOutstationFieldErrors((prev) => ({ ...prev, vehicleType: undefined }));
                }}
              >
                <SelectTrigger
                  className={`w-full ${outstationFieldErrors.vehicleType ? "border-red-400 focus-visible:ring-red-300" : ""}`}
                >
                  <SelectValue placeholder="Choose Vehicle Type" />
                </SelectTrigger>
                <SelectContent>
  {driverCostVehicleTypeOptions.length === 0 ? (
    <div className="px-3 py-2 text-sm text-gray-500">
      Add vehicle type in Driver Cost first
    </div>
  ) : (
    driverCostVehicleTypeOptions.map((v) => (
      <SelectItem key={v.id} value={v.id}>
        {v.label}
      </SelectItem>
    ))
  )}
</SelectContent>
              </Select>
              {outstationFieldErrors.vehicleType ? (
                <p className="text-xs text-red-600">{outstationFieldErrors.vehicleType}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <Label>
                Outstation KM Limit Title{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Outstation KM Limit Title"
                className={outstationFieldErrors.title ? "border-red-400 focus-visible:ring-red-300" : ""}
                value={outstationFormFields.title}
                onChange={(e) => {
                  setOutstationSaveLocked(false);
                  setOutstationFormFields((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }));
                  setOutstationFieldErrors((prev) => ({ ...prev, title: undefined }));
                }}
              />
              {outstationFieldErrors.title ? (
                <p className="text-xs text-red-600">{outstationFieldErrors.title}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <Label>
                Outstation KM Limit <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Outstation KM Limit"
                className={outstationFieldErrors.limit ? "border-red-400 focus-visible:ring-red-300" : ""}
                value={outstationFormFields.limit}
                onChange={(e) => {
                  setOutstationSaveLocked(false);
                  setOutstationFormFields((prev) => ({
                    ...prev,
                    limit: e.target.value,
                  }));
                  setOutstationFieldErrors((prev) => ({ ...prev, limit: undefined }));
                }}
              />
              {outstationFieldErrors.limit ? (
                <p className="text-xs text-red-600">{outstationFieldErrors.limit}</p>
              ) : null}
            </div>
          </div>

          <DialogFooter className="mt-6 flex justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              className="bg-gray-100 text-gray-700 px-6"
              onClick={() => setShowOutstationModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 px-8"
              onClick={handleSaveOutstation}
              disabled={saving || outstationSaveLocked}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LOCAL KM LIMIT MODAL */}
      <Dialog
        open={showLocalModal}
        onOpenChange={(open) => {
          setShowLocalModal(open);
          if (!open) {
            setLocalSaveLocked(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-gray-800">
              {editingLocalRow ? "Update Local KM Limit" : "Add Local KM Limit"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label>
                Vehicle type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={localFormVehicleType}
                onValueChange={(value) => {
                  setLocalSaveLocked(false);
                  setLocalFormVehicleType(value);
                  setLocalFieldErrors((prev) => ({ ...prev, vehicleType: undefined }));
                }}
              >
                <SelectTrigger
                  className={`w-full ${localFieldErrors.vehicleType ? "border-red-400 focus-visible:ring-red-300" : ""}`}
                >
                  <SelectValue placeholder="Choose Vehicle Type" />
                </SelectTrigger>
                <SelectContent>
  {driverCostVehicleTypeOptions.length === 0 ? (
    <div className="px-3 py-2 text-sm text-gray-500">
      Add vehicle type in Driver Cost first
    </div>
  ) : (
    driverCostVehicleTypeOptions.map((v) => (
      <SelectItem key={v.id} value={v.id}>
        {v.label}
      </SelectItem>
    ))
  )}
</SelectContent>
              </Select>
              {localFieldErrors.vehicleType ? (
                <p className="text-xs text-red-600">{localFieldErrors.vehicleType}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <Label>
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Enter Title"
                className={localFieldErrors.title ? "border-red-400 focus-visible:ring-red-300" : ""}
                value={localFormFields.title}
                onChange={(e) => {
                  setLocalSaveLocked(false);
                  setLocalFormFields((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }));
                  setLocalFieldErrors((prev) => ({ ...prev, title: undefined }));
                }}
              />
              {localFieldErrors.title ? (
                <p className="text-xs text-red-600">{localFieldErrors.title}</p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>
                  Hours <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Enter Hours"
                  className={localFieldErrors.hours ? "border-red-400 focus-visible:ring-red-300" : ""}
                value={localFormFields.hours}
                onChange={(e) => {
                  setLocalSaveLocked(false);
                  setLocalFormFields((prev) => ({
                    ...prev,
                    hours: e.target.value,
                  }));
                    setLocalFieldErrors((prev) => ({ ...prev, hours: undefined }));
                  }}
                />
                {localFieldErrors.hours ? (
                  <p className="text-xs text-red-600">{localFieldErrors.hours}</p>
                ) : null}
              </div>
              <div className="space-y-1">
                <Label>
                  Kilometer(KM) <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="KM Limit"
                  className={localFieldErrors.km ? "border-red-400 focus-visible:ring-red-300" : ""}
                value={localFormFields.km}
                onChange={(e) => {
                  setLocalSaveLocked(false);
                  setLocalFormFields((prev) => ({
                    ...prev,
                    km: e.target.value,
                  }));
                    setLocalFieldErrors((prev) => ({ ...prev, km: undefined }));
                  }}
                />
                {localFieldErrors.km ? (
                  <p className="text-xs text-red-600">{localFieldErrors.km}</p>
                ) : null}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 flex justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              className="bg-gray-100 text-gray-700 px-6"
              onClick={() => setShowLocalModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 px-8"
              onClick={handleSaveLocal}
              disabled={saving || localSaveLocked}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>

        
           </Dialog>

      <VendorStepVehicleTypeCostDeleteDialogs context={context} />
    
</Card>
  );
}

