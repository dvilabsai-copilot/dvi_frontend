/* eslint-disable @typescript-eslint/no-explicit-any, no-irregular-whitespace */
import React from "react";
import Flatpickr from "react-flatpickr";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const GuideFormPricebookStep = ({ context }: { context: Record<string, any> }) => {
  const {
    pricebook,
    setPricebook,
    loading,
    handleUpdatePricebook,
    priceInputs,
    setPriceInputs,
    pricebookDisplayRows,
    setCurrentStep,
  } = context;

  return (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Guide Cost Details</h3>
                <div className="flex items-center gap-3">


                 <Flatpickr
  value={pricebook.startDate}
  options={{
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "d/m/Y",
    allowInput: false,
  }}
  onChange={(dates) => {
    const selected = dates?.[0];
    if (!selected) return;

    const newStart = format(selected, "yyyy-MM-dd");

    setPricebook((prev) => ({
      ...prev,
      startDate: newStart,
      endDate: prev.endDate && prev.endDate < newStart ? "" : prev.endDate,
    }));
  }}
  render={({ render: _render, ...props }, ref) => (
    <Input
      {...props}
      ref={ref as React.Ref<HTMLInputElement>}
      placeholder="Start Date"
      className="w-36 cursor-pointer"
      readOnly
    />
  )}
/>

<Flatpickr
  value={pricebook.endDate}
  options={{
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "d/m/Y",
    allowInput: false,
    minDate: pricebook.startDate || undefined,
  }}
  onChange={(dates) => {
    const selected = dates?.[0];
    if (!selected) return;

    setPricebook((prev) => ({
      ...prev,
      endDate: format(selected, "yyyy-MM-dd"),
    }));
  }}
  render={({ render: _render, ...props }, ref) => (
    <Input
      {...props}
      ref={ref as React.Ref<HTMLInputElement>}
      placeholder="End Date"
      className="w-36 cursor-pointer"
      readOnly
    />
  )}
/>


                  <Button
                    onClick={handleUpdatePricebook}
                    disabled={loading}
                    className="bg-gradient-to-r from-primary to-pink-500"
                  >
                    Update
                  </Button>
                </div>
              </div>

              {/* Price Input Grid Ã¢â‚¬â€ always empty, no pre-fill (PHP parity) */}
              <div className="space-y-4">
                {/* 1-5 Pax */}
                <div className="grid grid-cols-5 gap-4 items-end">
                  <div>
                    <p className="text-sm text-gray-500">Pax Count</p>
                    <p className="font-semibold">1-5 Pax</p>
                  </div>
                  <div>
                    <p className="text-sm text-pink-500">Slot 1: 8 AM to 1 PM</p>
                    <Input
                      placeholder="Enter Price"
                      type="number"
                      value={priceInputs.pax1_slot1}
                      onChange={(e) => setPriceInputs((p) => ({ ...p, pax1_slot1: e.target.value }))}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-pink-500">Slot 2: 1 PM to 6 PM</p>
                    <Input
                      placeholder="Enter Price"
                      type="number"
                      value={priceInputs.pax1_slot2}
                      onChange={(e) => setPriceInputs((p) => ({ ...p, pax1_slot2: e.target.value }))}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-pink-500">Slot 3: 8 AM to 6 PM</p>
                    <Input
                      placeholder="Enter Price"
                      type="number"
                      value={priceInputs.pax1_slot3}
                      onChange={(e) => setPriceInputs((p) => ({ ...p, pax1_slot3: e.target.value }))}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-pink-500">Slot 4: 6 PM to 9 PM</p>
                    <Input
                      placeholder="Enter Price"
                      type="number"
                      value={priceInputs.pax1_slot4}
                      onChange={(e) => setPriceInputs((p) => ({ ...p, pax1_slot4: e.target.value }))}
                    />
                  </div>
                </div>
                <hr className="my-1" />

                {/* 6-14 Pax */}
                <div className="grid grid-cols-5 gap-4 items-end">
                  <div>
                    <p className="text-sm text-gray-500">Pax Count</p>
                    <p className="font-semibold">6-14 Pax</p>
                  </div>
                  <div>
                    <p className="text-sm text-pink-500">Slot 1: 8 AM to 1 PM</p>
                    <Input
                      placeholder="Enter Price"
                      type="number"
                      value={priceInputs.pax2_slot1}
                      onChange={(e) => setPriceInputs((p) => ({ ...p, pax2_slot1: e.target.value }))}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-pink-500">Slot 2: 1 PM to 6 PM</p>
                    <Input
                      placeholder="Enter Price"
                      type="number"
                      value={priceInputs.pax2_slot2}
                      onChange={(e) => setPriceInputs((p) => ({ ...p, pax2_slot2: e.target.value }))}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-pink-500">Slot 3: 8 AM to 6 PM</p>
                    <Input
                      placeholder="Enter Price"
                      type="number"
                      value={priceInputs.pax2_slot3}
                      onChange={(e) => setPriceInputs((p) => ({ ...p, pax2_slot3: e.target.value }))}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-pink-500">Slot 4: 6 PM to 9 PM</p>
                    <Input
                      placeholder="Enter Price"
                      type="number"
                      value={priceInputs.pax2_slot4}
                      onChange={(e) => setPriceInputs((p) => ({ ...p, pax2_slot4: e.target.value }))}
                    />
                  </div>
                </div>
                <hr className="my-1" />

                {/* 15-40 Pax */}
                <div className="grid grid-cols-5 gap-4 items-end">
                  <div>
                    <p className="text-sm text-gray-500">Pax Count</p>
                    <p className="font-semibold">15-40 Pax</p>
                  </div>
                  <div>
                    <p className="text-sm text-pink-500">Slot 1: 8 AM to 1 PM</p>
                    <Input
                      placeholder="Enter Price"
                      type="number"
                      value={priceInputs.pax3_slot1}
                      onChange={(e) => setPriceInputs((p) => ({ ...p, pax3_slot1: e.target.value }))}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-pink-500">Slot 2: 1 PM to 6 PM</p>
                    <Input
                      placeholder="Enter Price"
                      type="number"
                      value={priceInputs.pax3_slot2}
                      onChange={(e) => setPriceInputs((p) => ({ ...p, pax3_slot2: e.target.value }))}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-pink-500">Slot 3: 8 AM to 6 PM</p>
                    <Input
                      placeholder="Enter Price"
                      type="number"
                      value={priceInputs.pax3_slot3}
                      onChange={(e) => setPriceInputs((p) => ({ ...p, pax3_slot3: e.target.value }))}
                    />
                  </div>
                  <div>
                    <p className="text-sm text-pink-500">Slot 4: 6 PM to 9 PM</p>
                    <Input
                      placeholder="Enter Price"
                      type="number"
                      value={priceInputs.pax3_slot4}
                      onChange={(e) => setPriceInputs((p) => ({ ...p, pax3_slot4: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Per-day pricebook display table (auto-loaded when dates are selected) */}
              {pricebook.startDate && pricebook.endDate && (() => {
                // Build list of dates in range
                const dayList: { label: string; year: string; month: string; dayNum: number }[] = [];
                const sd = new Date(pricebook.startDate + "T00:00:00Z");
                const ed = new Date(pricebook.endDate + "T00:00:00Z");
                for (let cur = new Date(sd); cur <= ed; cur.setUTCDate(cur.getUTCDate() + 1)) {
                  const dt = new Date(cur);
                  dayList.push({
                    label: dt.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }),
                    year: String(dt.getUTCFullYear()),
                    month: dt.toLocaleString("en-US", { month: "long", timeZone: "UTC" }),
                    dayNum: dt.getUTCDate(),
                  });
                }

                const PAX_LABELS = ["1-5 Pax", "6-14 Pax", "15-40 Pax"];
                const SLOT_LABELS = ["8AM-1PM", "1PM-6PM", "8AM-6PM", "6PM-9PM"];

                const getPrice = (paxIdx: number, slotIdx: number, year: string, month: string, dayNum: number) => {
                  const row = pricebookDisplayRows.find(
                    (r: any) =>
                      Number(r.pax_count) === paxIdx &&
                      Number(r.slot_type) === slotIdx &&
                      String(r.year) === year &&
                      String(r.month) === month
                  );
                  if (!row) return null;
                  const val = row[`day_${dayNum}`];
                  return val !== null && val !== undefined && String(val).trim() !== "" ? Number(val) : null;
                };

                return (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Current Price Schedule</h4>
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="border-collapse text-xs w-auto">
                        <thead>
                          <tr className="bg-gradient-to-r from-purple-700 via-pink-600 to-fuchsia-500 text-white uppercase tracking-wide">
                            <th className="p-2 border border-purple-500/40 whitespace-nowrap bg-gray-700 text-white">Pax Count</th>
                            <th className="p-2 border border-purple-500/40 whitespace-nowrap bg-gray-700 text-white">Slot Type</th>
                            {dayList.map((d) => (
                              <th key={d.label} className="p-2 border border-purple-500/40 whitespace-nowrap">
                                {d.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {([1, 2, 3] as const).flatMap((pax) =>
                            ([1, 2, 3, 4] as const).map((slot) => (
                              <tr key={`${pax}-${slot}`} className="even:bg-white odd:bg-gray-50">
                                <td className="p-2 border border-gray-200 font-medium text-purple-700 whitespace-nowrap bg-gray-100">
                                  {PAX_LABELS[pax - 1]}
                                </td>
                                <td className="p-2 border border-gray-200 whitespace-nowrap bg-gray-100">
                                  {SLOT_LABELS[slot - 1]}
                                </td>
                                {dayList.map((d) => {
                                  const price = getPrice(pax, slot, d.year, d.month, d.dayNum);
                                  return (
                                    <td key={d.label} className="p-2 border border-gray-200 text-center whitespace-nowrap">
                                      {price !== null
                                        ? <span className="text-gray-800">Ã¢â€šÂ¹ {price.toFixed(2)}</span>
                                        : <span className="text-gray-400">No Price</span>}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-between pt-4">
                <Button variant="secondary" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>

                <div className="flex gap-2">
                <Button
                  onClick={() => setCurrentStep(3)}
                  className="bg-gradient-to-r from-primary to-pink-500"
                >
                  Continue Ã¢â€ â€™
                </Button>
              </div>

              </div>
            </div>
  );
};
