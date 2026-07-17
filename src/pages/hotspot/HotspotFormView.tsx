/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
type OpeningSlot = { start: string; end: string };
type OpeningDay = { is24Hours?: boolean; closed24Hours?: boolean; timeSlots: OpeningSlot[] };
export const HotspotFormView = ({ context }: { context: Record<string, any> }) => {
  const { navigate, isEdit, form, setForm, options, loading, hotspotTypeInput, setHotspotTypeInput, locationInput, setLocationInput, locationOpen, setLocationOpen, toLocationInput, setToLocationInput, toLocationOpen, setToLocationOpen, pendingGalleryFiles, galleryInputRef, onUploadFiles, vehNamesById, locationOptionsFiltered, toLocationOptionsFiltered, addLocation, removeLocation, addToLocation, removeToLocation, normalizeDurationHHmm, DAYS, TimePickerField, specialOpeningDates, formatSpecialDateForDisplay, handleDeleteSpecialDate, showSpecialDateForm, setShowSpecialDateForm, specialDateForm, setSpecialDateForm, handleSaveSpecialDate, handleCancelSpecialDate, handleSubmit } = context;
  return (
    <div className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ----------------------------- Basic Info ---------------------------- */}
        <div className="bg-white rounded-lg border p-6 space-y-4" data-section="basic-info">
          <h2 className="text-lg font-semibold text-primary">Basic Info</h2>

          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="name">Hotspot Name *</Label>
              <Input
                id="name"
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Hotspot Name"
              />
            </div>
            <div>
              <Label htmlFor="type">Hotspot Type *</Label>
              <Input
                id="type"
                list="hotspot-type-options"
                value={hotspotTypeInput}
                onChange={(e) => {
                  const v = e.target.value;
                  setHotspotTypeInput(v);
                  setForm({ ...form, type: v || null });
                }}
                placeholder="Choose Hotspot Type"
                required
              />
              <datalist id="hotspot-type-options">
                {options.types.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <div>
              <Label htmlFor="adultCost">Adult Entry Cost (₹)*</Label>
              <Input
                id="adultCost"
                type="number"
                value={form.adultCost ?? 0}
                onChange={(e) => setForm({ ...form, adultCost: Number(e.target.value) })}
                placeholder="Adult Entry Cost"
                required
              />
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="childCost">Child Entry Cost (₹)*</Label>
              <Input
                id="childCost"
                type="number"
                value={form.childCost ?? 0}
                onChange={(e) => setForm({ ...form, childCost: Number(e.target.value) })}
                placeholder="Child Entry Cost"
                required
              />
            </div>
            <div>
              <Label htmlFor="infantCost">Infant Entry Cost (₹)*</Label>
              <Input
                id="infantCost"
                type="number"
                value={form.infantCost ?? 0}
                onChange={(e) => setForm({ ...form, infantCost: Number(e.target.value) })}
                placeholder="Infant Entry Cost"
                required
              />
            </div>
            <div>
              <Label htmlFor="foreignAdultCost">Foreign Adult Entry Cost (₹)*</Label>
              <Input
                id="foreignAdultCost"
                type="number"
                value={form.foreignAdultCost ?? 0}
                onChange={(e) =>
                  setForm({ ...form, foreignAdultCost: Number(e.target.value) })
                }
                placeholder="Foreign Adult Entry Cost"
                required
              />
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="foreignChildCost">Foreign Child Entry Cost (₹)*</Label>
              <Input
                id="foreignChildCost"
                type="number"
                value={form.foreignChildCost ?? 0}
                onChange={(e) =>
                  setForm({ ...form, foreignChildCost: Number(e.target.value) })
                }
                placeholder="Foreign Child Entry Cost"
                required
              />
            </div>
            <div>
              <Label htmlFor="foreignInfantCost">Foreign Infant Entry Cost (₹)*</Label>
              <Input
                id="foreignInfantCost"
                type="number"
                value={form.foreignInfantCost ?? 0}
                onChange={(e) =>
                  setForm({ ...form, foreignInfantCost: Number(e.target.value) })
                }
                placeholder="Foreign Infant Entry Cost"
                required
              />
            </div>
            <div>
              <Label htmlFor="rating">Rating *</Label>
              <Input
                id="rating"
                type="number"
                step={0.1}
                value={form.rating ?? 0}
                onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                placeholder="Rating"
                required
              />
            </div>
          </div>

          {/* Row 4 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="priority">Hotspot Priority *</Label>
              <Input
                id="priority"
                type="number"
                value={form.priority ?? 0}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
                placeholder="Hotspot Priority"
                required
              />
            </div>
            <div>
              <Label htmlFor="latitude">Latitude *</Label>
              <Input
                id="latitude"
                value={form.latitude || ""}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                placeholder="Latitude"
                required
              />
            </div>
            <div>
              <Label htmlFor="longitude">Longitude *</Label>
              <Input
                id="longitude"
                value={form.longitude || ""}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                placeholder="Longitude"
                required
              />
            </div>
            <div>
              <Label htmlFor="duration">Duration *</Label>
              <Input
                id="duration"
                type="text"
                value={form.duration || "01:00"}
                onChange={(e) =>
                  setForm({ ...form, duration: (e.target as HTMLInputElement).value })
                }
                onBlur={(e) => {
                  const normalized = normalizeDurationHHmm((e.target as HTMLInputElement).value);
                  if (normalized !== form.duration) {
                    setForm((f) => ({ ...f, duration: normalized }));
                  }
                }}
                placeholder="HH:mm"
                pattern="^([01]?\d|2[0-3]):[0-5]\d$"
                required
              />
            </div>
          </div>

          {/* Row 5 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="landmark">Hotspot Landmark *</Label>
              <Textarea
                id="landmark"
                value={form.landmark || ""}
                onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                placeholder="Hotspot Landmark"
                rows={3}
                required
              />
            </div>
            <div>
              <Label htmlFor="address">Address *</Label>
              <Textarea
                id="address"
                value={form.address || ""}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Address"
                rows={3}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Hotspot Description *</Label>
              <Textarea
                id="description"
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Hotspot Description"
                rows={3}
                required
              />
            </div>
          </div>

          {/* Row 6: Hotspot Location (multi-select with type/search) */}
          <div className="space-y-2">
            <Label htmlFor="hotspotLocation">Hotspot Location *</Label>
            <div className="rounded-md border p-2 space-y-2">
              <div className="flex flex-wrap gap-2">
                {(form.locations || []).map((loc) => (
                  <span
                    key={loc}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs"
                  >
                    {loc}
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => removeLocation(loc)}
                      aria-label={`Remove ${loc}`}
                    >
                      x
                    </button>
                  </span>
                ))}
              </div>

              <div className="relative">
                <Input
                  id="hotspotLocation"
                  value={locationInput}
                  onFocus={() => setLocationOpen(true)}
                  onChange={(e) => {
                    setLocationInput(e.target.value);
                    setLocationOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addLocation(locationInput.replace(/,+$/g, ""));
                    }
                    if (e.key === "Backspace" && !locationInput && (form.locations || []).length) {
                      const last = (form.locations || [])[form.locations!.length - 1];
                      if (last) removeLocation(last);
                    }
                  }}
                  placeholder="Type to search locations and press Enter to add"
                />
                {locationOpen && locationOptionsFiltered.length > 0 && (
                  <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-white p-1 shadow-md">
                    {locationOptionsFiltered.map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => addLocation(loc)}
                        className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addLocation(locationInput)}
                >
                  Add Location
                </Button>
              </div>
            </div>
            {(form.locations?.length ?? 0) === 0 && (
              <p className="text-xs text-destructive mt-1">Location is required.</p>
            )}
          </div>

<div>
  <Label>Hotspot To Location</Label>

  <div className="rounded-md border p-3 space-y-3">
    <div className="flex flex-wrap gap-2">
      {(form.toLocations || []).map((loc) => (
        <span
          key={loc}
          className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs"
        >
          {loc}
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => removeToLocation(loc)}
            aria-label={`Remove ${loc}`}
          >
            x
          </button>
        </span>
      ))}
    </div>

    <div className="relative">
      <Input
        id="hotspotToLocation"
        value={toLocationInput}
        onFocus={() => setToLocationOpen(true)}
        onChange={(e) => {
          setToLocationInput(e.target.value);
          setToLocationOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addToLocation(toLocationInput.replace(/,+$/g, ""));
          }
          if (
            e.key === "Backspace" &&
            !toLocationInput &&
            (form.toLocations || []).length
          ) {
            const last = (form.toLocations || [])[form.toLocations!.length - 1];
            if (last) removeToLocation(last);
          }
        }}
        placeholder="Type to search locations and press Enter to add"
      />

      {toLocationOpen && toLocationOptionsFiltered.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-white p-1 shadow-md">
          {toLocationOptionsFiltered.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => addToLocation(loc)}
              className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
            >
              {loc}
            </button>
          ))}
        </div>
      )}
    </div>

    <div className="flex justify-end">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => addToLocation(toLocationInput)}
      >
        Add Location
      </Button>
    </div>
  </div>
</div>
          {/* Row 7: Gallery | Video URL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Hotspot Gallery*</Label>
              <Input
                ref={galleryInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => onUploadFiles(e.target.files)}
              />
              {!!pendingGalleryFiles.length && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {pendingGalleryFiles.length} image(s) queued for upload on save.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="videoUrl">Hotspot Video URL *</Label>
              <Input
                id="videoUrl"
                value={form.videoUrl || ""}
                onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                placeholder="Hotspot Video URL"
                required
              />
            </div>
          </div>

          {/* Thumbnails preview */}
          <div className="mt-2">
            <p className="text-sm font-medium mb-2">Uploaded hotspot Gallery</p>
            <div className="flex gap-3 flex-wrap">
              {(form.galleryImages || []).map((img, i) => (
                <button
                  key={i}
                  type="button"
                  className="overflow-hidden rounded-md border bg-muted/20"
                  onClick={() => window.open(img, "_blank", "noopener,noreferrer")}
                  title="Open image preview"
                >
                  <img
                    src={img}
                    alt={`Hotspot Gallery ${i + 1}`}
                    className="h-24 w-36 object-cover"
                  />
                </button>
              ))}
              {(!form.galleryImages || form.galleryImages.length === 0) && (
                <p className="text-xs text-muted-foreground">No gallery images uploaded yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* ---------------------- Vehicle Parking Charge Details --------------------- */}
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-primary">Vehicle Parking Charge Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {options.vehicleTypes.map((v) => (
              <div key={v.id}>
                <Label>{v.name}</Label>
                <Input
                  type="number"
                  value={Number(form.parkingCharges?.[String(v.id)] ?? 0)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      parkingCharges: {
                        ...(form.parkingCharges || {}),
                        [String(v.id)]: Number(e.target.value),
                      },
                    })
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {/* ----------------------------- Opening Hours ------------------------------ */}
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="text-lg font-semibold text-primary">Opening Hours</h2>

          {/* header row */}
          <div className="hidden md:grid grid-cols-12 font-medium text-muted-foreground bg-muted/40 rounded-md px-4 py-2">
            <div className="col-span-3">DAY</div>
            <div className="col-span-2 text-center">OPENS 24 HOURS</div>
            <div className="col-span-2 text-center">CLOSES 24 HOURS</div>
            <div className="col-span-4 text-center">NEW TIMINGS</div>
            <div className="col-span-1 text-center">ACTION</div>
          </div>

          <div className="space-y-2">
            {DAYS.map((day) => {
              const current =
                (form.openingHours as Record<string, any> | undefined)?.[day] ??
                ({ is24Hours: false, closed24Hours: false, timeSlots: [] } as OpeningDay);

              const setDay = (next: any) =>
                setForm((prev) => ({
                  ...prev,
                  openingHours: {
                    ...((prev.openingHours as Record<string, any> | undefined) ?? {}),
                    [day]: next,
                  },
                }));

              const addSlot = () => {
                const next = {
                  ...current,
                  timeSlots: [...(current.timeSlots || []), { start: "", end: "" }],
                };
                setDay(next);
              };

              const removeSlot = (idx: number) => {
                const next = {
                  ...current,
                  timeSlots: (current.timeSlots || []).filter((_: any, i: number) => i !== idx),
                };
                setDay(next);
              };

              // materialize the first slot so edits persist
              const updateSlot = (idx: number, key: "start" | "end", val: string) => {
                const base =
                  current.timeSlots && current.timeSlots.length > 0
                    ? [...current.timeSlots]
                    : [{ start: "", end: "" }];

                if (!base[idx]) base[idx] = { start: "", end: "" };
                base[idx] = { ...base[idx], [key]: val };
                setDay({ ...current, timeSlots: base });
              };

              const disabled = !!current.is24Hours || !!current.closed24Hours;

              return (
                <div key={day} className="grid grid-cols-1 md:grid-cols-12 border rounded-md px-4 py-3 gap-3">
                  {/* Day */}
                  <div className="md:col-span-3 capitalize font-medium">{day}</div>

                  {/* Opens 24 Hours */}
                  <div className="md:col-span-2 flex md:justify-center items-center gap-2">
                    <span className="text-xs text-muted-foreground md:hidden">Opens 24 Hours</span>
                    <Switch
                      checked={!!current.is24Hours}
                      disabled={!!current.closed24Hours}
                      onCheckedChange={(checked) => {
                        setDay({
                          ...current,
                          is24Hours: checked,
                          timeSlots: checked ? [] : current.timeSlots ?? [],
                          closed24Hours: checked ? false : current.closed24Hours ?? false,
                        });
                      }}
                    />
                  </div>

                  {/* Closes 24 Hours */}
                  <div className="md:col-span-2 flex md:justify-center items-center gap-2">
                    <span className="text-xs text-muted-foreground md:hidden">Closes 24 Hours</span>
                    <Switch
                      checked={!!current.closed24Hours}
                      disabled={!!current.is24Hours}
                      onCheckedChange={(checked) => {
                        setDay({
                          ...current,
                          closed24Hours: checked,
                          timeSlots: checked ? [] : current.timeSlots ?? [],
                          is24Hours: checked ? false : current.is24Hours ?? false,
                        });
                      }}
                    />
                  </div>

                  {/* New Timings */}
                  <div className="md:col-span-4">
                    {current.is24Hours ? (
                      <span className="inline-block text-xs px-3 py-1 rounded-md bg-pink-50 text-pink-600 font-semibold">
                        Opens 24 Hours
                      </span>
                    ) : current.closed24Hours ? (
                      <span className="inline-block text-xs px-3 py-1 rounded-md bg-pink-50 text-pink-600 font-semibold">
                        Closed
                      </span>
                    ) : (
                      <div className="space-y-2">
                        {(current.timeSlots?.length ? current.timeSlots : [{ start: "", end: "" }]).map(
                          (slot: OpeningSlot, idx: number) => (
                            <div key={idx} className="flex flex-wrap items-center gap-3">
                              <TimePickerField
                                value={slot.start || ""}
                                onChange={(v) => updateSlot(idx, "start", v)}
                                disabled={disabled}
                              />
                              <span className="text-muted-foreground">TO</span>
                              <TimePickerField
                                value={slot.end || ""}
                                onChange={(v) => updateSlot(idx, "end", v)}
                                disabled={disabled}
                              />
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => removeSlot(idx)}
                                disabled={disabled || (current.timeSlots?.length ?? 0) === 0}
                                className="md:ml-1"
                              >
                                Remove
                              </Button>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action */}
                  <div className="md:col-span-1 flex md:justify-center md:items-start">
                    <Button
                      type="button"
                      size="sm"
                      onClick={addSlot}
                      disabled={!!current.is24Hours || !!current.closed24Hours}
                      className="bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white hover:opacity-90"
                    >
                      Add More
                    </Button>
                  </div>
                </div>
              );
            })}


                  </div>
        </div>

        {/* ---------------------- Monthly Calendar / Special Date Timings ---------------------- */}
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-primary">
              Monthly Calendar / Special Date Timings
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select a particular date and set custom opening timing or mark it closed for that date.
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <div className="hidden md:grid grid-cols-12 font-medium text-muted-foreground bg-muted/40 px-4 py-3 text-sm">
              <div className="col-span-3">DATE</div>
              <div className="col-span-2">STATUS</div>
              <div className="col-span-3">TIMING</div>
              <div className="col-span-3">NOTE</div>
              <div className="col-span-1 text-center">ACTION</div>
            </div>

            <div className="divide-y">
              {specialOpeningDates.length > 0 ? (
                specialOpeningDates.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 px-4 py-4 items-center"
                  >
                    <div className="md:col-span-3 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                        📅
                      </div>
                      <span className="font-semibold text-sm">
                        {formatSpecialDateForDisplay(item.date)}
                      </span>
                    </div>

                    <div className="md:col-span-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          item.isClosed
                            ? "bg-red-50 text-red-600"
                            : "bg-green-50 text-green-600"
                        }`}
                      >
                        {item.isClosed ? "Closed" : "Open"}
                      </span>
                    </div>

                    <div className="md:col-span-3 text-sm text-muted-foreground">
                      {item.isClosed ? "Full day closed" : `${item.start} TO ${item.end}`}
                    </div>

                    <div className="md:col-span-3 text-sm text-muted-foreground">
                      {item.note || "-"}
                    </div>

                    <div className="md:col-span-1 flex md:justify-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteSpecialDate(item.id)}
                        className="text-muted-foreground hover:text-red-500"
                        title="Delete special date"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No special date timings added yet.
                </div>
              )}
            </div>
          </div>

          {!showSpecialDateForm && (
            <Button
              type="button"
              onClick={() => setShowSpecialDateForm(true)}
              className="bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white hover:opacity-90"
            >
              + Add Special Date
            </Button>
          )}

          {showSpecialDateForm && (
            <div className="rounded-lg border bg-white p-5 space-y-4">
              {specialDateForm.date && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-semibold">
                    {formatSpecialDateForDisplay(specialDateForm.date)}
                  </span>
                  <span className="rounded bg-muted px-2 py-1 text-[10px] font-semibold uppercase">
                    Date Override
                  </span>
                </div>
              )}

              <div>
                <h3 className="text-base font-semibold">Add Special Date Timing</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This date-wise timing will override normal weekly opening hours.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="special-date">Select Date</Label>
                  <Input
                    id="special-date"
                    type="date"
                    value={specialDateForm.date}
                    onChange={(e) =>
                      setSpecialDateForm((prev) => ({
                        ...prev,
                        date: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex items-end gap-3">
                  <Switch
                    checked={specialDateForm.isClosed}
                    onCheckedChange={(checked) =>
                      setSpecialDateForm((prev) => ({
                        ...prev,
                        isClosed: checked,
                        start: checked ? "" : prev.start,
                        end: checked ? "" : prev.end,
                      }))
                    }
                  />
                  <span className="pb-2 text-sm font-medium">Closed Full Day</span>
                </div>

                <div>
                  <Label>Start Time</Label>
                  <TimePickerField
                    value={specialDateForm.start}
                    onChange={(value) =>
                      setSpecialDateForm((prev) => ({
                        ...prev,
                        start: value,
                      }))
                    }
                    disabled={specialDateForm.isClosed}
                  />
                </div>

                <div>
                  <Label>End Time</Label>
                  <TimePickerField
                    value={specialDateForm.end}
                    onChange={(value) =>
                      setSpecialDateForm((prev) => ({
                        ...prev,
                        end: value,
                      }))
                    }
                    disabled={specialDateForm.isClosed}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="special-date-note">Reason / Note</Label>
                <Textarea
                  id="special-date-note"
                  value={specialDateForm.note}
                  onChange={(e) =>
                    setSpecialDateForm((prev) => ({
                      ...prev,
                      note: e.target.value,
                    }))
                  }
                  placeholder="Example: Special temple timing, festival closure, maintenance..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={handleSaveSpecialDate}
                  className="bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white hover:opacity-90"
                >
                  Save
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancelSpecialDate}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={() => navigate("/hotspots")}>
            Back
          </Button>
          <Button type="submit" disabled={loading}>
            {isEdit ? "Update" : "Save"}
          </Button>
        </div>


      </form>
    </div>
  );
};

