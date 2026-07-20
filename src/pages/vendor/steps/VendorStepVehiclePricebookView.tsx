/* eslint-disable @typescript-eslint/no-explicit-any */
import { Calendar as CalendarIcon, ChevronDown, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { addDays } from "date-fns";

export function VendorStepVehiclePricebookView({ context }: { context: Record<string, any> }) {
  const { PricebookDatePicker, deleteConfirm, driverCosts, editableDriverRows, filteredLocalPreviewRows, filteredOutstationPreviewRows, gradientButton, groupedExtraRows, groupedLocalRows, groupedOutstationRows, gstPercentOptions, gstTypes, handleDeleteKmLimit, handleLocalKmChange, handleLocalKmSave, handleLocalPricebookUpdate, handleOpenLocalKmModal, handleOpenOutKmModal, handleOutKmChange, handleOutKmSave, handleOutstationPricebookUpdate, handleUpdateDriverAndExtraCosts, handleUpdateMargin, handleUpdateVehicleExtraCosts, localEndDate, localKmForm, localKmOpen, localKmSaveLocked, localPreview, localRentalByRow, localStartDate, localVehicleFilter, localVehicleTypeOptions, onBack, onFinish, open, outKmForm, outKmOpen, outKmSaveLocked, outstationEndDate, outstationPreview, outstationRentalByRow, outstationStartDate, outstationVehicleFilter, outstationVehicleTypeOptions, rowKey, saving, setDeleteConfirm, setDriverCell, setExtraCell, setLocalEndDate, setLocalKmForm, setLocalKmOpen, setLocalKmSaveLocked, setLocalRentalByRow, setLocalStartDate, setLocalVehicleFilter, setOutKmForm, setOutKmOpen, setOutKmSaveLocked, setOutstationEndDate, setOutstationRentalByRow, setOutstationStartDate, setOutstationVehicleFilter, setVendorMarginGstPercent, setVendorMarginGstType, setVendorMarginPercent, toPickerDate, vehicleExtraRows, vehicleTypeOptions, vendorId, vendorMarginGstPercent, vendorMarginGstType, vendorMarginPercent } = context;
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-pink-600">Vehicle Pricebook</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          {!vendorId && (
            <p className="text-sm text-red-500">
              Save Basic Info first before editing pricebook.
            </p>
          )}

          {/* ========== Vendor Margin Details ========== */}
          <section className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                Vendor Margin Details
              </h2>
              <Button
                type="button"
                className={`${gradientButton} px-6`}
                disabled={!vendorId || saving}
                onClick={handleUpdateMargin}
              >
                {saving ? "Updating..." : "Update"}
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <Label>Vendor Margin %</Label>
                <Input
                    value={vendorMarginPercent}
                    onChange={(e) => {
                      const value = e.target.value;

                      if (/^\d{0,3}(\.\d{0,2})?$/.test(value) && Number(value || 0) <= 100) {
                        setVendorMarginPercent(value);
                      }
                    }}
                  />
              </div>

              <div className="space-y-1">
                <Label>Vendor Margin GST Type</Label>
                <Select
                  value={vendorMarginGstType}
                  onValueChange={setVendorMarginGstType}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose GST Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {gstTypes.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Vendor Margin GST Percentage</Label>
                <Select
                  value={vendorMarginGstPercent}
                  onValueChange={setVendorMarginGstPercent}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose GST %" />
                  </SelectTrigger>
                  <SelectContent>
                    {gstPercentOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* ========== Driver Cost Details (PHP style) ========== */}
          <section className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                Driver Cost Details
              </h2>
              <Button
                type="button"
                className={`${gradientButton} px-6`}
                disabled={!vendorId || saving}
                onClick={handleUpdateDriverAndExtraCosts}
              >
                Update
              </Button>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">
                      VEHICLE TYPE
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      DRIVER COST(({"\u20B9"}))
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      FOOD COST(({"\u20B9"}))
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      ACCOMMODATION COST(({"\u20B9"}))
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      EXTRA COST(({"\u20B9"}))
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      MORNING CHARGE(({"\u20B9"}))
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      EVENING CHARGE(({"\u20B9"}))
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {driverCosts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-6 text-center text-sm text-gray-500"
                      >
                        No more records found.
                      </td>
                    </tr>
                  ) : (
                    editableDriverRows.map((dc, idx) => (
                      <tr key={dc.vendor_vehicle_type_ID ?? dc.vehicle_type_id}>
                        <td className="px-4 py-3 border-b border-gray-100">
                          {vehicleTypeOptions.find((o) => o.id === String(dc.vehicle_type_id))?.label || dc.vehicle_type_title || dc.vehicle_type_id}
                        </td>
                        <td className="px-2 py-2 border-b border-gray-100"><Input value={dc.driver_batta} onChange={(e) => setDriverCell(idx, "driver_batta", e.target.value)} /></td>
                        <td className="px-2 py-2 border-b border-gray-100"><Input value={dc.food_cost} onChange={(e) => setDriverCell(idx, "food_cost", e.target.value)} /></td>
                        <td className="px-2 py-2 border-b border-gray-100"><Input value={dc.accomodation_cost} onChange={(e) => setDriverCell(idx, "accomodation_cost", e.target.value)} /></td>
                        <td className="px-2 py-2 border-b border-gray-100"><Input value={dc.extra_cost} onChange={(e) => setDriverCell(idx, "extra_cost", e.target.value)} /></td>
                        <td className="px-2 py-2 border-b border-gray-100"><Input value={dc.driver_early_morning_charges} onChange={(e) => setDriverCell(idx, "driver_early_morning_charges", e.target.value)} /></td>
                        <td className="px-2 py-2 border-b border-gray-100"><Input value={dc.driver_evening_charges} onChange={(e) => setDriverCell(idx, "driver_evening_charges", e.target.value)} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ========== Vehicle Extra Cost Details (PHP style rows by vehicle type) ========== */}
          <section className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                Vehicle Extra Cost Details
              </h2>
              <Button
                type="button"
                className={`${gradientButton} px-6`}
                disabled={!vendorId || saving}
                onClick={handleUpdateVehicleExtraCosts}
              >
                Update
              </Button>
            </div>

            {Object.entries(groupedExtraRows).length === 0 ? (
              <p className="text-sm text-gray-500">
                No vehicles found for this branch.
              </p>
            ) : (
              (Object.entries(groupedExtraRows) as [string, any[]][]).map(([branchKey, rows], idx) => {
                const branchName = rows[0]?.vendor_branch_name || `Branch #${idx + 1}`;
                return (
                  <div key={branchKey} className="mb-5">
                    <p className="mb-3 text-[28px] leading-none text-pink-600">Branch #{idx + 1} - {branchName}</p>
                    <div className="space-y-3">
                      {rows.map((row: any) => {
                        const absoluteIndex = vehicleExtraRows.findIndex(
                          (r) =>
                            r.vendor_branch_id === row.vendor_branch_id &&
                            String(r.vehicle_type_id) === String(row.vehicle_type_id),
                        );

                        return (
                          <div key={`extra-${row.vendor_branch_id}-${row.vehicle_type_id}`} className="grid grid-cols-12 gap-3 items-end">
                            <div className="col-span-2">
                              <Label className="text-xs">Vehicle Type</Label>
                              <p className="text-purple-600">
                                {row.vehicle_type_title || row.vehicle_type_name || row.vehicle_type_id}
                              </p>
                                </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Extra KM Charge(({"\u20B9"}))</Label>
                              <Input
                                value={row.extra_km_charge}
                                onChange={(e) => setExtraCell(absoluteIndex, "extra_km_charge", e.target.value)}
                              />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs">Extra Hour Charge(({"\u20B9"}))</Label>
                              <Input
                                value={row.extra_hour_charge}
                                onChange={(e) => setExtraCell(absoluteIndex, "extra_hour_charge", e.target.value)}
                              />
                            </div>
                            <div className="col-span-3">
                              <Label className="text-xs">Early Morning Charges (({"\u20B9"}))(Before 6 AM)</Label>
                              <Input
                                value={row.early_morning_charges}
                                onChange={(e) => setExtraCell(absoluteIndex, "early_morning_charges", e.target.value)}
                              />
                            </div>
                            <div className="col-span-3">
                              <Label className="text-xs">Evening Charges (({"\u20B9"}))(After 8 PM)</Label>
                              <Input
                                value={row.evening_charges}
                                onChange={(e) => setExtraCell(absoluteIndex, "evening_charges", e.target.value)}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}

          </section>

          {/* ========== Local Pricebook (PHP parity) ========== */}
          <section className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                Vehicle Rental Cost Details | Local Pricebook
              </h2>
              <div className="flex items-center gap-3">
                <Select value={localVehicleFilter} onValueChange={setLocalVehicleFilter}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="All Vehicle Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vehicle Types</SelectItem>
                    {localVehicleTypeOptions.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  className="bg-purple-100 px-6 text-sm font-semibold text-purple-700 hover:bg-purple-200"
                  onClick={handleOpenLocalKmModal}
                  disabled={!vendorId}
                >
                  + Add KM Limit
                </Button>
                <div className="hidden items-center gap-2 sm:flex">
            <PricebookDatePicker
  value={localStartDate}
  onChange={(value) => {
    setLocalStartDate(value);
  }}
  placeholder="Start Date"
/>
<PricebookDatePicker
  value={localEndDate}
  onChange={setLocalEndDate}
  placeholder="End Date"
  defaultMonth={
    localStartDate ? addDays(toPickerDate(localStartDate)!, 1) : undefined
  }
  minDate={
    localStartDate ? addDays(toPickerDate(localStartDate)!, 1) : undefined
  }
/>
                </div>
                <Button
                  type="button"
                  className={`${gradientButton} px-6`}
                  disabled={!vendorId || saving}
                  onClick={handleLocalPricebookUpdate}
                >
                  Update
                </Button>
              </div>
            </div>

            {Object.entries(groupedLocalRows).length === 0 ? (
              <p className="text-sm text-gray-500">No local pricebook base rows found.</p>
            ) : (
             (Object.entries(groupedLocalRows) as [string, any[]][]).map(([branchKey, rows], idx) => {
                const branchName = rows[0]?.vendor_branch_name || `Branch #${idx + 1}`;
                return (
                  <div key={branchKey} className="mb-6 rounded-lg border border-gray-200 p-4">
                    <p className="mb-3 text-base font-semibold text-pink-600">Branch #{idx + 1} - {branchName}</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      {rows.map((r: any) => {
                        const k = rowKey(r, "local");
                        return (
                          <div key={k} className="relative grid grid-cols-3 gap-3 rounded-md border border-gray-100 p-3">
                            <button
                              type="button"
                              className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200"
                              title="Delete this KM limit"
                              onClick={() => setDeleteConfirm({ open: true, type: "local", id: r.time_limit_id, label: `${r.vehicle_type_title} \u2014 ${r.time_limit_title}` })}
                            >
                              <X className="h-3 w-3" />
                            </button>
                            <div>
                              <Label className="text-xs">Vehicle Type</Label>
                              <p className="text-sm text-purple-600">{r.vehicle_type_title}</p>
                            </div>
                            <div>
                              <Label className="text-xs">Local KM Limit</Label>
                              <p className="text-sm text-purple-600">{r.time_limit_title}</p>
                            </div>
                            <div>
                              <Label className="text-xs">Rental Charge(({"\u20B9"}))</Label>
                              <Input
                                placeholder="Enter the Rental Charge"
                                value={localRentalByRow[k] ?? ""}
                                onChange={(e) =>
                                  setLocalRentalByRow((prev) => ({ ...prev, [k]: e.target.value }))
                                }
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}

            {localStartDate && localEndDate && (
              <div className="mt-5 overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Vehicle Type</th>
                      <th className="px-3 py-2 text-left">KM Limit</th>
                      {localPreview.days.map((d) => (
                        <th key={d.key} className="px-3 py-2 text-center whitespace-nowrap">{d.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {filteredLocalPreviewRows.length === 0 ? (
                      <tr>
                        <td colSpan={Math.max(3, localPreview.days.length + 2)} className="px-4 py-4 text-center text-gray-500">
                          No data found
                        </td>
                      </tr>
                    ) : (
                      filteredLocalPreviewRows.map((r, i) => (
                        <tr key={`${r.vehicle_type_title}-${r.time_limit_title}-${i}`}>
                          <td className="px-3 py-2 border-b border-gray-100 text-purple-600">{r.vehicle_type_title}</td>
                          <td className="px-3 py-2 border-b border-gray-100 text-purple-600">{r.time_limit_title}</td>
                          {r.prices.map((p, pi) => (
                            <td key={`${i}-${pi}`} className="px-3 py-2 border-b border-gray-100 text-center">
                              {p == null ? "No Price" : `INR ${p.toFixed(2)}`}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ========== Outstation Pricebook (PHP parity) ========== */}
          <section className="rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                Vehicle Rental Cost Details | Outstation Pricebook
              </h2>
              <div className="flex items-center gap-3">
                <Select value={outstationVehicleFilter} onValueChange={setOutstationVehicleFilter}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="All Vehicle Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vehicle Types</SelectItem>
                    {outstationVehicleTypeOptions.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  className="bg-purple-100 px-6 text-sm font-semibold text-purple-700 hover:bg-purple-200"
                  onClick={handleOpenOutKmModal}
                  disabled={!vendorId}
                >
                  + Add KM Limit
                </Button>
                <div className="hidden items-center gap-2 sm:flex">
                <PricebookDatePicker
  value={outstationStartDate}
  onChange={(value) => {
    setOutstationStartDate(value);
  }}
  placeholder="Start Date"
/>
<PricebookDatePicker
  value={outstationEndDate}
  onChange={setOutstationEndDate}
  placeholder="End Date"
  defaultMonth={
    outstationStartDate ? addDays(toPickerDate(outstationStartDate)!, 1) : undefined
  }
  minDate={
    outstationStartDate ? addDays(toPickerDate(outstationStartDate)!, 1) : undefined
  }
/>
                </div>
                <Button
                  type="button"
                  className={`${gradientButton} px-6`}
                  disabled={!vendorId || saving}
                  onClick={handleOutstationPricebookUpdate}
                >
                  Update
                </Button>
              </div>
            </div>

            {Object.entries(groupedOutstationRows).length === 0 ? (
              <p className="text-sm text-gray-500">No outstation pricebook base rows found.</p>
            ) : (
              (Object.entries(groupedOutstationRows) as [string, any[]][]).map(([branchKey, rows], idx) => {
                const branchName = rows[0]?.vendor_branch_name || `Branch #${idx + 1}`;
                return (
                  <div key={branchKey} className="mb-6 rounded-lg border border-gray-200 p-4">
                    <p className="mb-3 text-base font-semibold text-pink-600">Branch #{idx + 1} - {branchName}</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      {rows.map((r: any) => {
                        const k = rowKey(r, "out");
                        return (
                          <div key={k} className="relative grid grid-cols-3 gap-3 rounded-md border border-gray-100 p-3">
                            <button
                              type="button"
                              className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-500 hover:bg-red-200"
                              title="Delete this KM limit"
                              onClick={() => setDeleteConfirm({ open: true, type: "outstation", id: r.kms_limit_id, label: `${r.vehicle_type_title} \u2014 ${r.kms_limit_title ?? r.kms_limit + " KM"}` })}
                            >
                              <X className="h-3 w-3" />
                            </button>
                            <div>
                              <Label className="text-xs">Vehicle Type</Label>
                              <p className="text-sm text-purple-600">{r.vehicle_type_title}</p>
                            </div>
                            <div>
                              <Label className="text-xs">Outstation KM Limit</Label>
                              <p className="text-sm text-purple-600">{r.kms_limit} KM</p>
                            </div>
                            <div>
                              <Label className="text-xs">Rental Charge(({"\u20B9"}))</Label>
                              <Input
                                placeholder="Enter the Rental Charge"
                                value={outstationRentalByRow[k] ?? ""}
                                onChange={(e) =>
                                  setOutstationRentalByRow((prev) => ({ ...prev, [k]: e.target.value }))
                                }
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}

            {outstationStartDate && outstationEndDate && (
              <div className="mt-5 overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Vehicle Type</th>
                      <th className="px-3 py-2 text-left">KM Limit</th>
                      {outstationPreview.days.map((d) => (
                        <th key={d.key} className="px-3 py-2 text-center whitespace-nowrap">{d.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {filteredOutstationPreviewRows.length === 0 ? (
                      <tr>
                        <td colSpan={Math.max(3, outstationPreview.days.length + 2)} className="px-4 py-4 text-center text-gray-500">
                          No data found
                        </td>
                      </tr>
                    ) : (
                      filteredOutstationPreviewRows.map((r, i) => (
                        <tr key={`${r.vehicle_type_title}-${r.kms_limit_title}-${i}`}>
                          <td className="px-3 py-2 border-b border-gray-100 text-purple-600">{r.vehicle_type_title}</td>
                          <td className="px-3 py-2 border-b border-gray-100 text-purple-600">{r.kms_limit_title}</td>
                          {r.prices.map((p, pi) => (
                            <td key={`${i}-${pi}`} className="px-3 py-2 border-b border-gray-100 text-center">
                              {p == null ? "No Price" : `INR ${p.toFixed(2)}`}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Wizard navigation */}
          <div className="mt-4 flex justify-between">
            <Button variant="outline" type="button" onClick={onBack}>
              Back
            </Button>
            <Button
              type="button"
              onClick={onFinish}
              disabled={!vendorId}
              className={gradientButton}
            >
              Save & Finish
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ========== Delete Confirm Dialog ========== */}
      <Dialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ open: false, type: null, id: null, label: "" })}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete KM Limit</DialogTitle>
          </DialogHeader>
          <p className="mt-2 text-sm text-gray-700">
            Are you sure you want to delete <strong>{deleteConfirm.label}</strong>? This action cannot be undone.
          </p>
          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteConfirm({ open: false, type: null, id: null, label: "" })}>
              Cancel
            </Button>
            <Button type="button" className="bg-red-500 text-white hover:bg-red-600" onClick={handleDeleteKmLimit} disabled={saving}>
              {saving ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== Local KM Limit Modal ========== */}
      <Dialog
        open={localKmOpen}
        onOpenChange={(open) => {
          setLocalKmOpen(open);
          if (!open) {
            setLocalKmSaveLocked(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Local KM Limit</DialogTitle>
          </DialogHeader>

          <div className="mt-2 space-y-4">
            <div className="space-y-1">
              <Label>
                Vehicle type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={localKmForm.vehicleType}
                onValueChange={(vehicleType) => {
                  setLocalKmSaveLocked(false);
                  setLocalKmForm((prev) => ({ ...prev, vehicleType }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose Vehicle Type" />
                </SelectTrigger>
                <SelectContent>
                  {vehicleTypeOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Enter Title"
                value={localKmForm.title}
                onChange={(e) => handleLocalKmChange("title", e.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <Label>
                  Hours <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="Enter Hours"
                  value={localKmForm.hours}
                  onChange={(e) =>
                    handleLocalKmChange("hours", e.target.value)
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>
                  Kilometer(KM) <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="KM Limit"
                  value={localKmForm.kmLimit}
                  onChange={(e) =>
                    handleLocalKmChange("kmLimit", e.target.value)
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 flex justify-between">
            <Button
              type="button"
              variant="outline"
              className="px-6"
              onClick={() => setLocalKmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={`${gradientButton} px-8`}
              onClick={handleLocalKmSave}
              disabled={!vendorId || localKmSaveLocked || saving}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== Outstation KM Limit Modal ========== */}
      <Dialog
        open={outKmOpen}
        onOpenChange={(open) => {
          setOutKmOpen(open);
          if (!open) {
            setOutKmSaveLocked(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Outstation KM Limit</DialogTitle>
          </DialogHeader>

          <div className="mt-2 space-y-4">
            <div className="space-y-1">
              <Label>
                Vehicle type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={outKmForm.vehicleType}
                onValueChange={(vehicleType) => {
                  setOutKmSaveLocked(false);
                  setOutKmForm((prev) => ({ ...prev, vehicleType }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose Vehicle Type" />
                </SelectTrigger>
                <SelectContent>
                  {vehicleTypeOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>
                Outstation KM Limit Title{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Outstation KM Limit Title"
                value={outKmForm.title}
                onChange={(e) => handleOutKmChange("title", e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>
                Outstation KM Limit <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="Outstation KM Limit"
                value={outKmForm.kmLimit}
                onChange={(e) =>
                  handleOutKmChange("kmLimit", e.target.value)
                }
              />
            </div>
          </div>

          <DialogFooter className="mt-4 flex justify-between">
            <Button
              type="button"
              variant="outline"
              className="px-6"
              onClick={() => setOutKmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className={`${gradientButton} px-8`}
              onClick={handleOutKmSave}
              disabled={!vendorId || outKmSaveLocked || saving}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
