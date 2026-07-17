/* eslint-disable @typescript-eslint/no-explicit-any */
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Check, ChevronsUpDown, ChevronRight, X, Pencil, Trash2, Star, Copy, FileSpreadsheet, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime24As12 } from "@/components/itinerary/TimePickerPopover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ActivityDatePickerField, ActivityTimePickerField } from "./ActivityFormFields";
import { TABS, buildActivityImageUrl, buildDuration, durationHours, durationMinutes, durationSeconds, splitDuration, formatReviewDateTime, formatYmdLabel } from "./activityForm.utils";
import type { ActivityPricingUnitType } from "./activityForm.utils";

type ActivityFormViewProps = { context: Record<string, any> };

export function ActivityFormView({ context }: ActivityFormViewProps) {
  const {
    activeTab,
    addDefaultTime,
    addSpecialDay,
    cancelEditReview,
    deleteImageIndex,
    deleteReview,
    e,
    editingReviewId,
    end,
    filteredReviews,
    formData,
    formatDMY,
    goToNextTab,
    goToPrevTab,
    handleImageUpload,
    handleInputChange,
    handlePricingChange,
    handleReviewCSV,
    handleReviewCopy,
    handleReviewExcel,
    handleSaveReview,
    handleSubmit,
    handleUpdatePricing,
    hotspotLabel,
    hotspotOptions,
    id,
    imagePreviews,
    img,
    isEdit,
    isHotspotOpen,
    isPriceEndOpen,
    isPriceStartOpen,
    isReadonly,
    loading,
    navigate,
    paginatedReviews,
    parseDMY,
    preview,
    priceBookDates,
    priceBookRows,
    priceEndDate,
    priceStartDate,
    removeDefaultTime,
    removeImage,
    removeServerImage,
    removeSpecialDay,
    renderStars,
    reviewFeedback,
    reviewPage,
    reviewPageSize,
    reviewRating,
    reviewSearch,
    reviews,
    serverImages,
    setActiveTab,
    setDeleteImageIndex,
    setIsHotspotOpen,
    setIsPriceEndOpen,
    setIsPriceStartOpen,
    setPriceEndDate,
    setPriceStartDate,
    setReviewFeedback,
    setReviewPage,
    setReviewPageSize,
    setReviewRating,
    setReviewSearch,
    start,
    startEditReview,
    totalReviewPages,
    updateDefaultTime,
    updateSpecialDayDate,
    updateSpecialDayTime,
    uploaded,
    y
  } = context;

  if (loading) {
    return (
      <div className="p-6 bg-pink-50/30 min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  /* ----------------------------------- UI ----------------------------------- */

  return (
    <div className="p-6 bg-pink-50/30 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          {isEdit ? `Edit Activity Â» ${formData.title}` : "Add Activity"}
        </h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link to="/" className="text-primary hover:underline">
            Dashboard
          </Link>
          <span>&gt;</span>
          <Link to="/activities" className="text-primary hover:underline">
            List of Activity
          </Link>
          <span>&gt;</span>
          <span className="text-primary">
            {isEdit ? "Edit Activity" : "Add Activity"}
          </span>
        </div>
      </div>

      {/* Card with Tabs */}
      <Card className="shadow-sm">
        {/* Tab Header */}
        <div className="border-b px-6 pt-4">
          <div className="flex items-center gap-2 flex-wrap">
            {TABS.map((tab, index) => (
              <div key={tab.id} className="flex items-center">
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-t-lg transition",
                    activeTab === tab.id
                      ? "bg-primary text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}
                  disabled={isReadonly && tab.id !== 4}
                >
                  <span
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium",
                      activeTab === tab.id
                        ? "bg-white text-primary"
                        : "bg-gray-300 text-gray-600"
                    )}
                  >
                    {tab.id}
                  </span>
                  <span className="text-sm font-medium">{tab.name}</span>
                </button>
                {index < TABS.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-gray-400 mx-2" />
                )}
              </div>
            ))}
          </div>
        </div>

        <CardContent className="p-6">
          {/* Tab 1: Basic Details */}
          {activeTab === 1 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label>
                    Activity Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="Enter activity title"
                    disabled={isReadonly}
                  />
                </div>
                <div>
                  <Label>
                    Hotspot Places <span className="text-red-500">*</span>
                  </Label>
                  <Popover open={isHotspotOpen} onOpenChange={setIsHotspotOpen}>
                    <PopoverTrigger asChild>


                      <Button
  type="button"
  variant="outline"
  role="combobox"
  aria-expanded={isHotspotOpen}
  className="w-full justify-between overflow-hidden"
  disabled={isReadonly}
>
  <span className="truncate">
    {formData.hotspotId
      ? hotspotOptions.find((opt) => opt.id === formData.hotspotId)?.label || "Select hotspot"
      : "Select hotspot"}
  </span>
  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
</Button>


                    </PopoverTrigger>
                    <PopoverContent className="w-[420px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search hotspot..." className="h-9" />
                        <CommandList>
                          <CommandEmpty>No hotspot found.</CommandEmpty>
                          <CommandGroup>
                            {hotspotOptions.map((opt) => (
                              <CommandItem
                                key={opt.id}
                                value={`${opt.label} ${opt.id}`}
                                onSelect={() => {
                                  const idNum = opt.id;
                                  handleInputChange("hotspotId", idNum);
                                  const separator = opt.label.includes("â€”") ? "â€”" : ",";
                                  const [name, ...placeParts] = opt.label.split(separator);
                                  handleInputChange("hotspot", name?.trim() || "");
                                  handleInputChange("hotspotPlace", placeParts.join(separator).trim() || "");
                                  setIsHotspotOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.hotspotId === opt.id ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                {opt.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>
                    Max Allowed Person Count{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    value={formData.maxAllowedPersonCount}
                    onChange={(e) =>
                      handleInputChange(
                        "maxAllowedPersonCount",
                        Number(e.target.value)
                      )
                    }
                    disabled={isReadonly}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>
                    Duration <span className="text-red-500">*</span>
                  </Label>

                  {(() => {
  const duration = splitDuration(formData.duration);

  return (
    <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center rounded-md border border-[#e5d7f6] bg-white">
      <Select
        value={duration.hh}
        onValueChange={(hh) =>
          handleInputChange("duration", buildDuration(hh, duration.mm, duration.ss))
        }
        disabled={isReadonly}
      >
        <SelectTrigger className="border-0 shadow-none focus:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {durationHours.map((hh) => (
            <SelectItem key={hh} value={hh}>
              {hh}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-center text-lg">:</span>

      <Select
        value={duration.mm}
        onValueChange={(mm) =>
          handleInputChange("duration", buildDuration(duration.hh, mm, duration.ss))
        }
        disabled={isReadonly}
      >
        <SelectTrigger className="border-0 shadow-none focus:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {durationMinutes.map((mm) => (
            <SelectItem key={mm} value={mm}>
              {mm}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-center text-lg">:</span>

      <Select
        value={duration.ss}
        onValueChange={(ss) =>
          handleInputChange("duration", buildDuration(duration.hh, duration.mm, ss))
        }
        disabled={isReadonly}
      >
        <SelectTrigger className="border-0 shadow-none focus:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {durationSeconds.map((ss) => (
            <SelectItem key={ss} value={ss}>
              {ss}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
})()}

                </div>
                <div>
                  <Label>
                    Upload Images <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isReadonly}
                  />
                </div>
              </div>

              {/* Image Previews */}
              {/* Server images (already uploaded) */}
              {serverImages.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {serverImages.map((img, index) => (
                    <div key={img.id} className="relative">
                      <img
                          src={img.url}
                          alt={`Image ${index + 1}`}
                          className="w-20 h-20 object-cover rounded"
                          onError={() => {
                            console.log("Broken activity image URL:", img.url);
                          }}
                        />
                      {!isReadonly && (
                        <button
                          onClick={() => setDeleteImageIndex(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {/* Pending local previews (create-mode only) */}
              {imagePreviews.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index}`}
                        className="w-20 h-20 object-cover rounded"
                      />
                      {!isReadonly && (
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div>
                <Label>
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  rows={4}
                  disabled={isReadonly}
                />
              </div>

              {/* Default Available Time */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-primary mb-4">
                  Default Available Time
                </h3>
                {formData.defaultAvailableTimes.map((time, index) => (
                  <div key={index} className="flex items-end gap-4 mb-4 flex-wrap">
                    <div>
                      <Label>
                        Start Time<span className="text-red-500">*</span>
                      </Label>
                      <ActivityTimePickerField
                        label="Start Time"
                        value={time.startTime}
                        onChange={(value24) => updateDefaultTime(index, "startTime", value24)}
                        disabled={isReadonly}
                      />
                    </div>
                    <div>
                      <Label>
                        End Time<span className="text-red-500">*</span>
                      </Label>
                      <ActivityTimePickerField
                        label="End Time"
                        value={time.endTime}
                        onChange={(value24) => updateDefaultTime(index, "endTime", value24)}
                        disabled={isReadonly}
                      />
                    </div>
                    {!isReadonly && (
                      <Button
                        type="button"
                        variant="outline"
                        className="text-red-600 border-red-300"
                        onClick={() => removeDefaultTime(index)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                ))}
                {!isReadonly && (
                  <Button
                    variant="outline"
                    onClick={addDefaultTime}
                    className="text-primary border-primary hover:bg-primary/10"
                  >
                    +Add Default Time
                  </Button>
                )}
              </div>

              {/* Special Available Time */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-primary mb-4">
                  Special Available Time
                </h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.isSpecialDay}
                      onCheckedChange={(checked) =>
                        handleInputChange("isSpecialDay", !!checked)
                      }
                      disabled={isReadonly}
                    />
                    <Label>Special Day </Label>
                  </div>
                  {formData.isSpecialDay && !isReadonly && (
                    <Button
                      variant="outline"
                      className="text-primary border-primary hover:bg-primary/10"
                      onClick={addSpecialDay}
                    >
                      + Add Days
                    </Button>
                  )}
                </div>

                {formData.isSpecialDay && (
                  <div className="mt-4 space-y-3">
                    {formData.specialDays.length === 0 ? (
                      <p className="text-sm text-gray-500">No special days added</p>
                    ) : (
                      formData.specialDays.map((day, dayIndex) => (
                        <div key={`${day.date}-${dayIndex}`} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end border rounded-md p-3">
                          <div>
                            <Label>Date</Label>
                            <ActivityDatePickerField
                              value={day.date}
                              onChange={(valueYmd) => updateSpecialDayDate(dayIndex, valueYmd)}
                              disabled={isReadonly}
                            />
                          </div>
                          <div>
                            <Label>Start Time</Label>
                            <ActivityTimePickerField
                              label="Special Start"
                              value={day.timeSlots[0]?.startTime || ""}
                              onChange={(value24) => updateSpecialDayTime(dayIndex, 0, "startTime", value24)}
                              disabled={isReadonly}
                            />
                          </div>
                          <div>
                            <Label>End Time</Label>
                            <ActivityTimePickerField
                              label="Special End"
                              value={day.timeSlots[0]?.endTime || ""}
                              onChange={(value24) => updateSpecialDayTime(dayIndex, 0, "endTime", value24)}
                              disabled={isReadonly}
                            />
                          </div>
                          {!isReadonly && (
                            <div>
                              <Button variant="outline" className="text-red-600 border-red-300" onClick={() => removeSpecialDay(dayIndex)}>
                                Remove
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-between pt-6 border-t">
                <Button
                  variant="secondary"
                  onClick={() => navigate("/activities")}
                >
                  Back
                </Button>
                {!isReadonly && (
                  <Button onClick={goToNextTab}>Update & Continue</Button>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Price Book */}
          {activeTab === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium">Activity Cost Details</h3>
                <div className="flex items-center gap-2">
                  {/* Start Date Picker */}
                  <Popover open={isPriceStartOpen} onOpenChange={setIsPriceStartOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-[160px] justify-start text-left font-normal ${
                          !priceStartDate ? "text-muted-foreground" : ""
                        }`}
                        disabled={isReadonly}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                        {priceStartDate || "Start Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="z-50 w-auto p-0 bg-white border border-[#e5d7f6] rounded-xl shadow-xl">
                      <div className="px-4 py-2 border-b border-[#efe7fb] text-sm font-medium text-[#4a4260]">Start Date</div>
                      <Calendar
                        mode="single"
                        selected={parseDMY(priceStartDate) || undefined}
                        onSelect={(day) => {
                          if (!day) return;
                          setPriceStartDate(formatDMY(day));
                          setIsPriceStartOpen(false);
                        }}
                        initialFocus
                        classNames={{ day_today: "" }}
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground">â€”</span>
                  {/* End Date Picker */}
                  <Popover open={isPriceEndOpen} onOpenChange={setIsPriceEndOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-[160px] justify-start text-left font-normal ${
                          !priceEndDate ? "text-muted-foreground" : ""
                        }`}
                        disabled={isReadonly}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                        {priceEndDate || "End Date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="z-50 w-auto p-0 bg-white border border-[#e5d7f6] rounded-xl shadow-xl">
                      <div className="px-4 py-2 border-b border-[#efe7fb] text-sm font-medium text-[#4a4260]">End Date</div>
                      <Calendar
                        mode="single"
                        selected={parseDMY(priceEndDate) || undefined}
                        onSelect={(day) => {
                          if (!day) return;
                          setPriceEndDate(formatDMY(day));
                          setIsPriceEndOpen(false);
                        }}
                        defaultMonth={parseDMY(priceStartDate) || undefined}
                        disabled={parseDMY(priceStartDate) ? { before: parseDMY(priceStartDate)! } : undefined}
                        initialFocus
                        classNames={{ day_today: "" }}
                      />
                    </PopoverContent>
                  </Popover>
                  {!isReadonly && (
                    <Button onClick={handleUpdatePricing} className="bg-[#8b2fc9] hover:bg-[#7a27b3] text-white">Update</Button>
                  )}
                </div>
              </div>

                           {/* Pricing Type */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3 items-end">
                <div>
                  <Label className="text-primary">Pricing Type</Label>
                  <Select
                    value={formData.pricing.pricingUnitType}
                    onValueChange={(value: ActivityPricingUnitType) =>
                      handlePricingChange("pricingUnitType", value)
                    }
                    disabled={isReadonly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Pricing Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PER_ADULT">Per Adult Cost</SelectItem>
                      <SelectItem value="UNIT">Unit Cost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg border border-[#eadcff] bg-[#fff7fd] px-3 py-2 text-sm text-[#6b3a8d] md:col-span-2">
                  {formData.pricing.pricingUnitType === "UNIT"
                    ? "Use Unit Cost when the activity is charged once per private vehicle/unit, for example Mudumalai Jeep Safari private jeep."
                    : "Use Per Adult Cost for regular guest-wise activity pricing. Existing child and infant prices are kept for old pricebook compatibility."}
                </div>
              </div>

              {formData.pricing.pricingUnitType === "UNIT" ? (
                <div className="grid grid-cols-3 gap-6 items-end">
                  <div>
                    <Label className="text-gray-500">Nationality</Label>
                    <p className="text-primary font-medium">Indian / Non-Indian</p>
                  </div>

                  <div>
                    <Label className="text-primary">Indian Unit Cost</Label>
                    <Input
                      type="number"
                      placeholder="Enter Unit Cost"
                      value={formData.pricing.unitCost || ""}
                      onChange={(e) =>
                        handlePricingChange("unitCost", Number(e.target.value))
                      }
                      disabled={isReadonly}
                    />
                  </div>

                  <div>
                    <Label className="text-primary">Foreign Unit Cost</Label>
                    <Input
                      type="number"
                      placeholder="Enter Foreign Unit Cost"
                      value={formData.pricing.foreignUnitCost || ""}
                      onChange={(e) =>
                        handlePricingChange(
                          "foreignUnitCost",
                          Number(e.target.value)
                        )
                      }
                      disabled={isReadonly}
                    />
                  </div>
                </div>
              ) : (
                <>
                  {/* Indian Pricing */}
                  <div className="grid grid-cols-4 gap-6 items-end">
                    <div>
                      <Label className="text-gray-500">Nationality</Label>
                      <p className="text-primary font-medium">Indian</p>
                    </div>
                    <div>
                      <Label className="text-primary">Adult</Label>
                      <Input
                        type="number"
                        placeholder="Enter Price"
                        value={formData.pricing.adult || ""}
                        onChange={(e) =>
                          handlePricingChange("adult", Number(e.target.value))
                        }
                        disabled={isReadonly}
                      />
                    </div>
                    <div>
                      <Label className="text-primary">Children</Label>
                      <Input
                        type="number"
                        placeholder="Enter Price"
                        value={formData.pricing.children || ""}
                        onChange={(e) =>
                          handlePricingChange("children", Number(e.target.value))
                        }
                        disabled={isReadonly}
                      />
                    </div>
                    <div>
                      <Label className="text-primary">Infant</Label>
                      <Input
                        type="number"
                        placeholder="Enter Price"
                        value={formData.pricing.infant || ""}
                        onChange={(e) =>
                          handlePricingChange("infant", Number(e.target.value))
                        }
                        disabled={isReadonly}
                      />
                    </div>
                  </div>

                  {/* Non-Indian Pricing */}
                  <div className="grid grid-cols-4 gap-6 items-end">
                    <div>
                      <Label className="text-gray-500">Nationality</Label>
                      <p className="text-primary font-medium">Non-Indian</p>
                    </div>
                    <div>
                      <Label className="text-primary">Foreign Adult</Label>
                      <Input
                        type="number"
                        placeholder="Enter Price"
                        value={formData.pricing.foreignAdult || ""}
                        onChange={(e) =>
                          handlePricingChange(
                            "foreignAdult",
                            Number(e.target.value)
                          )
                        }
                        disabled={isReadonly}
                      />
                    </div>
                    <div>
                      <Label className="text-primary">Foreign Children</Label>
                      <Input
                        type="number"
                        placeholder="Enter Price"
                        value={formData.pricing.foreignChildren || ""}
                        onChange={(e) =>
                          handlePricingChange(
                            "foreignChildren",
                            Number(e.target.value)
                          )
                        }
                        disabled={isReadonly}
                      />
                    </div>
                    <div>
                      <Label className="text-primary">Foreign Infant</Label>
                      <Input
                        type="number"
                        placeholder="Enter Price"
                        value={formData.pricing.foreignInfant || ""}
                        onChange={(e) =>
                          handlePricingChange(
                            "foreignInfant",
                            Number(e.target.value)
                          )
                        }
                        disabled={isReadonly}
                      />
                    </div>
                  </div>
                </>
              )}

              {priceBookDates.length > 0 && (
                <div className="pt-6 border-t">
                  <div className="overflow-x-auto rounded-xl border bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-bold text-white uppercase bg-[#8b2fc9] whitespace-nowrap">
                            Hotspot
                          </TableHead>
                          <TableHead className="font-bold text-white uppercase bg-[#8b2fc9] whitespace-nowrap">
                            Nationality
                          </TableHead>
                          <TableHead className="font-bold text-white uppercase bg-[#8b2fc9] whitespace-nowrap">
                            Price Type
                          </TableHead>

                          {priceBookDates.map((date) => (
                            <TableHead
                              key={date.toISOString()}
                              className="text-center font-bold text-white uppercase bg-[#8b2fc9] whitespace-nowrap"
                            >
                              {format(date, "EEE").toUpperCase()} - {format(date, "dd MMM, yyyy").toUpperCase()}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {priceBookRows.map((row) => (
                          <TableRow key={`${row.nationality}-${row.priceType}`}>
                            <TableCell>{hotspotLabel}</TableCell>
                            <TableCell>{row.nationality}</TableCell>
                            <TableCell>{row.priceType}</TableCell>

                            {priceBookDates.map((date) => (
                              <TableCell
                                key={`${row.nationality}-${row.priceType}-${date.toISOString()}`}
                                className="text-center"
                              >
                                â‚¹ {Number(row.amount || 0).toFixed(2)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-between pt-6 border-t">
                <Button variant="secondary" onClick={goToPrevTab}>
                  Back
                </Button>
                {!isReadonly && (
                  <Button onClick={goToNextTab}>Update & Continue</Button>
                )}
              </div>
            </div>
          )}

{/* Tab 3: Feedback & Review */}
{activeTab === 3 && (
  <div className="mx-auto max-w-[929px] space-y-4">
    <h2 className="text-[18px] font-semibold text-primary">
      Review & Feedback
    </h2>

    <div className="grid grid-cols-[224px_1fr] gap-6 items-start">
      {/* Left: Rating */}
      <Card className="h-[413px] w-[224px] rounded-2xl border-[#eadcff] shadow-none">
        <CardContent className="p-4">
          <h3 className="mb-4 text-[18px] font-semibold text-[#1f2937]">
            Rating
          </h3>

          <Select
            value={reviewRating}
            onValueChange={setReviewRating}
            disabled={isReadonly}
          >
            <SelectTrigger className="h-[44px] rounded-xl border-[#eadcff] text-[14px]">
              <SelectValue placeholder="Select Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Star</SelectItem>
              <SelectItem value="2">2 Stars</SelectItem>
              <SelectItem value="3">3 Stars</SelectItem>
              <SelectItem value="4">4 Stars</SelectItem>
              <SelectItem value="5">5 Stars</SelectItem>
            </SelectContent>
          </Select>

          <p className="my-4 text-[13px] leading-5 text-[#8a86a3]">
            All reviews are from genuine customers
          </p>

          <Label className="text-[13px] font-semibold text-[#1f2937]">
            Feedback <span className="text-red-500">*</span>
          </Label>

          <Textarea
            value={reviewFeedback}
            onChange={(e) => setReviewFeedback(e.target.value)}
            disabled={isReadonly}
            className="mt-3 h-[120px] resize-none rounded-xl border-[#eadcff] px-3 py-2 text-[14px]"
          />

          {!isReadonly && (
            <div className="mt-3 flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={cancelEditReview}
                className="h-[38px] rounded-xl px-5 text-[14px]"
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={handleSaveReview}
                className="h-[38px] rounded-xl px-5 text-[14px]"
              >
                {editingReviewId ? "Update" : "Save"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Right: List of Reviews */}
      <Card className="h-[413px] min-w-0 rounded-2xl border-[#eadcff] shadow-none">
        <CardContent className="p-4">
          <h3 className="mb-4 text-[18px] font-semibold text-[#1f2937]">
            List of Reviews
          </h3>

          <div className="mb-3 flex items-center gap-2">
            <span className="text-[15px]">Show</span>

            <Select
              value={String(reviewPageSize)}
              onValueChange={(v) => setReviewPageSize(Number(v))}
            >
              <SelectTrigger className="h-[40px] w-[74px] rounded-xl border-[#eadcff]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>

            <span className="text-[15px]">entries</span>
          </div>

          <div className="mb-3 flex items-center gap-3">
            <span className="text-[15px]">Search:</span>

            <Input
              value={reviewSearch}
              onChange={(e) => setReviewSearch(e.target.value)}
              className="h-[42px] w-[220px] rounded-xl border-[#eadcff] text-[14px]"
            />

            <Button
              type="button"
              variant="outline"
              onClick={handleReviewCopy}
              className="h-[42px] min-w-[92px] rounded-xl border-[#7c5cff] text-[#4f46e5]"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleReviewExcel}
              className="h-[42px] min-w-[92px] rounded-xl border-green-500 text-green-600"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleReviewCSV}
              className="h-[42px] min-w-[84px] rounded-xl border-gray-300 text-gray-600"
            >
              <FileText className="mr-2 h-4 w-4" />
              CSV
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-[#eadcff]">
            <Table className="w-full text-[13px]">
              <TableHeader className="bg-[#fbf7ff]">
                <TableRow>
                  <TableHead className="w-[75px] px-3 py-2 font-semibold">
                    S.NO â†•
                  </TableHead>
                  <TableHead className="w-[95px] px-3 py-2 font-semibold">
                    RATING â†•
                  </TableHead>
                  <TableHead className="w-[135px] px-3 py-2 font-semibold">
                    DESCRIPTION â†•
                  </TableHead>
                  <TableHead className="w-[166px] px-3 py-2 font-semibold whitespace-nowrap">
                    CREATED ON â†•
                  </TableHead>
                  <TableHead className="w-[103px] px-3 py-2 text-center font-semibold whitespace-nowrap">
                    ACTIONS â†•
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedReviews.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                      No data available in table
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedReviews.map((review, index) => (
                    <TableRow key={review.id}>
                      <TableCell className="px-3 py-2">
                        {(reviewPage - 1) * reviewPageSize + index + 1}
                      </TableCell>

                      <TableCell className="px-3 py-2">
                        <div className="flex items-center gap-0.5">
                          {renderStars(review.rating)}
                        </div>
                      </TableCell>

                      <TableCell className="px-3 py-2">
                        {review.description}
                      </TableCell>

                      <TableCell className="px-3 py-2 whitespace-nowrap">
                        {formatReviewDateTime(review.createdOn)}
                      </TableCell>

                      <TableCell className="px-3 py-2">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-lg border-[#eadcff]"
                            onClick={() => startEditReview(review)}
                            disabled={isReadonly}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                         <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-lg border-[#eadcff]"
                          onClick={() => {
                            const confirmed = window.confirm("Delete this review?");
                            if (!confirmed) return;

                            deleteReview(review.id);
                          }}
                          disabled={isReadonly}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[14px] text-gray-500">
              Showing{" "}
              {filteredReviews.length > 0
                ? (reviewPage - 1) * reviewPageSize + 1
                : 0}{" "}
              to {Math.min(reviewPage * reviewPageSize, filteredReviews.length)} of{" "}
              {filteredReviews.length} entries
            </span>

            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={reviewPage <= 1}
                onClick={() => setReviewPage((p) => Math.max(1, p - 1))}
                className="h-[40px]"
              >
                Previous
              </Button>

              <Button
                variant="outline"
                disabled={reviewPage >= totalReviewPages}
                onClick={() =>
                  setReviewPage((p) => Math.min(totalReviewPages, p + 1))
                }
                className="h-[40px]"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <div className="flex items-center justify-between border-t pt-4">
      <Button variant="secondary" onClick={goToPrevTab}>
        Back
      </Button>

      {!isReadonly && (
        <Button onClick={goToNextTab}>
          Update & Continue
        </Button>
      )}
    </div>
  </div>
)}
          {/* Tab 4: Preview */}
          {activeTab === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-medium">Preview</h2>

              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-medium text-primary mb-4">
                  Basic Info
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-gray-500">Activity Title</Label>
                    <p className="font-medium">{formData.title || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Hotspot Places</Label>
                    <p className="font-medium">{formData.hotspot || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">
                      Max Allowed Person Count
                    </Label>
                    <p className="font-medium">
                      {formData.maxAllowedPersonCount}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Duration</Label>
                    <p className="font-medium">{formData.duration}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Label className="text-gray-500">Description</Label>
                  <p className="font-medium">{formData.description || "-"}</p>
                </div>
              </div>

              {/* Images */}
              {(serverImages.length > 0 || imagePreviews.length > 0) && (
                <div>
                  <h3 className="text-lg font-medium text-primary mb-4">
                    Images
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {serverImages.map((img, index) => (
                      <img
                        key={`sv-${img.id}`}
                        src={img.url}
                        alt={`Image ${index + 1}`}
                        className="w-20 h-20 object-cover rounded"
                      />
                    ))}
                    {imagePreviews.map((preview, index) => (
                      <img
                        key={index}
                        src={preview}
                        alt={`Preview ${index}`}
                        className="w-20 h-20 object-cover rounded"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Default Available Time */}
              <div>
                <h3 className="text-lg font-medium text-primary mb-4">
                  Default Available Time
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-pink-100">
                      <TableHead>S.NO</TableHead>
                      <TableHead>START TIME</TableHead>
                      <TableHead>END TIME</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.defaultAvailableTimes.map((time, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{time.startTime ? formatTime24As12(time.startTime) : "-"}</TableCell>
                        <TableCell>{time.endTime ? formatTime24As12(time.endTime) : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Special Day */}
              <div>
                <h3 className="text-lg font-medium text-primary mb-4">
                  Special Day
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-pink-100">
                      <TableHead>S.NO</TableHead>
                      <TableHead>DATE</TableHead>
                      <TableHead>START TIME</TableHead>
                      <TableHead>END TIME</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.specialDays.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-gray-500"
                        >
                          No Special Time Found !!!
                        </TableCell>
                      </TableRow>
                    ) : (
                      formData.specialDays.map((day, index) => (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{formatYmdLabel(day.date)}</TableCell>
                          <TableCell>
                            {day.timeSlots[0]?.startTime ? formatTime24As12(day.timeSlots[0].startTime) : "-"}
                          </TableCell>
                          <TableCell>
                            {day.timeSlots[0]?.endTime ? formatTime24As12(day.timeSlots[0].endTime) : "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Reviews */}
              <div>
                <h3 className="text-lg font-medium text-primary mb-4">Review</h3>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-pink-100">
                      <TableHead>S.NO</TableHead>
                      <TableHead>RATING</TableHead>
                      <TableHead>DESCRIPTION</TableHead>
                      <TableHead>CREATED ON</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.reviews.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-gray-500"
                        >
                          No reviews yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      formData.reviews.map((review, index) => (
                        <TableRow key={review.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{review.rating} STARS</TableCell>
                          <TableCell>{review.description}</TableCell>
                          <TableCell>{formatReviewDateTime(review.createdOn)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-between pt-6 border-t">
                <Button variant="secondary" onClick={goToPrevTab}>
                  Back
                </Button>
                <Button onClick={handleSubmit}>
                  {isEdit ? "Submit" : "Submit"}
                </Button>
              </div>
            </div>
          )}


        </CardContent>
         </Card>
      {deleteImageIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-xl">
            <Trash2 className="mx-auto mb-4 h-12 w-12 text-gray-500" />

            <h2 className="mb-3 text-xl font-semibold">Are you sure?</h2>

            <p className="mb-6 text-gray-500">
              Do you really want to delete this Image?
              <br />
              This process cannot be undone.
            </p>

            <div className="flex justify-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDeleteImageIndex(null)}
              >
                Close
              </Button>

              <Button
                type="button"
                className="bg-red-500 text-white hover:bg-red-600"
                onClick={async () => {
                  if (deleteImageIndex === null) return;
                  await removeServerImage(deleteImageIndex);
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
