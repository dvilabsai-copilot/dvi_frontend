/* eslint-disable @typescript-eslint/no-explicit-any, no-irregular-whitespace */
import Flatpickr from "react-flatpickr";
import { format } from "date-fns";
import {
  ChevronRight, FileSpreadsheet, FileText, ChevronDown, Eye, EyeOff, Star, Pencil, Trash2,
  Calendar as CalendarIcon, CheckCircle2, X, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SlotMultiSelect } from "./GuideSlotMultiSelect";
import { GuideFormPricebookStep } from "./GuideFormPricebookStep";
import { GuideFormReviewStep } from "./GuideFormReviewStep";
import { BLOOD_GROUPS, GENDERS, GUIDE_SLOTS } from "@/types/guide";

const STEPS = [
  { id: 1, label: "Guide Basic Info" },
  { id: 2, label: "Pricebook" },
  { id: 3, label: "FeedBack & Review" },
  { id: 4, label: "Guide Preview" },
];

const GST_TYPE_OPTIONS = [
  { id: "1", name: "Included" },
  { id: "2", name: "Excluded" },
];

export const GuideFormView = ({ context }: { context: Record<string, any> }) => {
  const {
    currentStep, setCurrentStep, topSuccessMessage, setTopSuccessMessage, showPassword,
    setShowPassword, name, setName, dateOfBirth, setDateOfBirth, bloodGroup, setBloodGroup,
    gender, setGender, primaryMobile, setPrimaryMobile, alternativeMobile, setAlternativeMobile,
    email, setEmail, emergencyMobile, setEmergencyMobile, password, setPassword, role, setRole,
    experience, setExperience, aadharCardNo, setAadharCardNo, languageProficiency,
    setLanguageProficiency, country, setCountry, state, setState, city, setCity, gstType,
    setGstType, gstPercentage, setGstPercentage, availableSlots, setAvailableSlots,
    bankDetails, setBankDetails, preferredFor, setPreferredFor, hotspotPlaces, setHotspotPlaces,
    activityPlaces, setActivityPlaces, hotspotDropdownOpen, setHotspotDropdownOpen,
    activityDropdownOpen, setActivityDropdownOpen, activeHotspotToken, setActiveHotspotToken,
    activeActivityToken, setActiveActivityToken, pricebook, setPricebook, priceInputs,
    setPriceInputs, pricebookDisplayRows, reviews, newRating, setNewRating, newFeedback,
    setNewFeedback, editingReviewId, setEditingReviewId, emailDuplicateError, setEmailDuplicateError, fieldErrors,
    nameRef, primaryMobileRef, alternativeMobileRef, emailRef, emergencyMobileRef, passwordRef,
    aadharRef, roleOptions, languageOptions, countryOptions, stateOptions, cityOptions,
    gstPercentOptions, hotspotOptions, activityOptions, selectedDob, showTopSuccess,
    removeHotspotToken, removeActivityToken, fetchPricebookDisplay, handleHotspotControlKeyDown,
    handleActivityControlKeyDown, handleEmailBlur, setFieldError, clearFieldError,
    handleSaveBasicInfo, handleUpdatePricebook, handleAddReview, handleDeleteReview,
    handleEditReview, searchReview, setSearchReview, handleCopyReviews, handleDownloadExcel,
    handleDownloadCSV, handleConfirm, filteredReviews, renderStars, gstTypeLabel,
    countryLabel, stateLabel, cityLabel, loading, isEdit, navigate,
  } = context;

  return (

    <div className="p-6 space-y-6">
      {topSuccessMessage && (
        <div className="fixed top-20 left-1/2 z-50 w-[92vw] max-w-[680px] -translate-x-1/2">
          <div className="flex items-center justify-between rounded-md bg-green-600 px-4 py-3 text-white shadow-lg">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" />
              <span>{topSuccessMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setTopSuccessMessage("")}
              className="inline-flex h-6 w-6 items-center justify-center rounded text-white/90 transition hover:bg-white/15 hover:text-white"
              aria-label="Close success message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">
          {isEdit ? `Edit Guide \u00BB ${name}` : "Add Guide"}
        </h1>
        <div className="text-sm text-muted-foreground">
          Dashboard &gt; Guide &gt; {isEdit ? "Edit Guide" : "Add Guide"}
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-lg border shadow-sm">
        {/* Tabs */}
        <div className="flex items-center gap-2 p-4 border-b overflow-x-auto">
          {STEPS.map((step, idx) => (
            <div key={step.id} className="flex items-center">
              <button
                type="button"
                onClick={() => setCurrentStep(step.id)}
                disabled={!isEdit && step.id > 1}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors",
                  currentStep === step.id
                    ? "bg-purple-600 text-white"
                    : "text-gray-500 hover:bg-gray-100",
                  !isEdit && step.id > 1 && "opacity-50 cursor-not-allowed"
                )}
              >
                <span
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                    currentStep === step.id
                      ? "bg-white text-purple-600"
                      : "bg-gray-200 text-gray-600"
                  )}
                >
                  {step.id}
                </span>
                <span className="whitespace-nowrap">{step.label}</span>
              </button>
              {idx < STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 text-gray-400 mx-1" />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* STEP 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-8">
              {/* Basic Info Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Guide Name *</Label>
                  <Input
                    ref={nameRef}
                    value={name}
                    onChange={(e) => { setName(e.target.value); clearFieldError("name"); }}
                    className={fieldErrors.name ? "border-red-500 focus-visible:ring-red-400" : ""}
                  />
                  {fieldErrors.name && <p className="mt-1 text-xs text-red-500">{fieldErrors.name}</p>}
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Flatpickr
                    value={selectedDob}
                    options={{
                      dateFormat: "d/m/Y",
                      allowInput: true,
                      monthSelectorType: "dropdown",
                    }}
                    onChange={(dates) => {
                      const d = dates?.[0];
                      setDateOfBirth(d ? format(d, "yyyy-MM-dd") : "");
                    }}
                    render={({ render: _render, ...props }, ref) => (
                      <div className="relative">
                        <Input
                          {...props}
                          ref={ref as React.Ref<HTMLInputElement>}
                          placeholder="DD/MM/YYYY"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                          <CalendarIcon className="h-4 w-4 text-violet-600" />
                        </span>
                      </div>
                    )}
                  />
                </div>
                <div>
                  <Label>Blood Group *</Label>
                  <Select value={bloodGroup} onValueChange={setBloodGroup}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Blood Group" />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOOD_GROUPS.map((bg) => (
                        <SelectItem key={bg} value={bg}>
                          {bg}
</SelectItem>
                      ))}

                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Gender *</Label>
                  <Select value={gender} onValueChange={(v) => { setGender(v); clearFieldError("gender"); }}>
                    <SelectTrigger className={fieldErrors.gender ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDERS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.gender && <p className="mt-1 text-xs text-red-500">{fieldErrors.gender}</p>}
                </div>
                <div>
                  <Label>Primary Mobile Number *</Label>
                  <Input
                    ref={primaryMobileRef}
                    value={primaryMobile}
                    maxLength={10}
                    onChange={(e) => { setPrimaryMobile(e.target.value); clearFieldError("primaryMobile"); }}
                    className={fieldErrors.primaryMobile ? "border-red-500 focus-visible:ring-red-400" : ""}
                  />
                  {fieldErrors.primaryMobile && <p className="mt-1 text-xs text-red-500">{fieldErrors.primaryMobile}</p>}
                </div>
                <div>
                  <Label>Alternative Mobile Number</Label>
                  <Input
                    ref={alternativeMobileRef}
                    value={alternativeMobile}
                    maxLength={10}
                    onChange={(e) => { setAlternativeMobile(e.target.value); clearFieldError("alternativeMobile"); }}
                    className={fieldErrors.alternativeMobile ? "border-red-500 focus-visible:ring-red-400" : ""}
                  />
                  {fieldErrors.alternativeMobile && <p className="mt-1 text-xs text-red-500">{fieldErrors.alternativeMobile}</p>}
                </div>

                <div>
                  <Label>Email ID *</Label>
                  <Input
                    ref={emailRef}
                    type="email"
                    value={email}
                    readOnly={isEdit}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailDuplicateError) setEmailDuplicateError(false);
                      clearFieldError("email");
                    }}
                    onBlur={handleEmailBlur}
                    className={fieldErrors.email ? "border-red-500 focus-visible:ring-red-400" : ""}
                  />
                  {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>}
                </div>
                <div>
                  <Label>Emergency Mobile Number</Label>
                  <Input
                    ref={emergencyMobileRef}
                    value={emergencyMobile}
                    maxLength={10}
                    onChange={(e) => { setEmergencyMobile(e.target.value); clearFieldError("emergencyMobile"); }}
                    className={fieldErrors.emergencyMobile ? "border-red-500 focus-visible:ring-red-400" : ""}
                  />
                  {fieldErrors.emergencyMobile && <p className="mt-1 text-xs text-red-500">{fieldErrors.emergencyMobile}</p>}
                </div>
                <div>
                  <Label>Password *</Label>
                  <div className="relative">
                    <Input
                      ref={passwordRef}
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); clearFieldError("password"); }}
                      className={fieldErrors.password ? "border-red-500 focus-visible:ring-red-400" : ""}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-gray-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.password && <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>}
                </div>

                <div>
                  <Label>Role *</Label>
                  <Select value={role} onValueChange={(v) => { setRole(v); clearFieldError("role"); }}>
                    <SelectTrigger className={fieldErrors.role ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.role && <p className="mt-1 text-xs text-red-500">{fieldErrors.role}</p>}
                </div>
                <div>
                  <Label>Aadhar Card No</Label>
                  <Input
                    ref={aadharRef}
                    value={aadharCardNo}
                    maxLength={12}
                    onChange={(e) => { setAadharCardNo(e.target.value); clearFieldError("aadharCardNo"); }}
                    className={fieldErrors.aadharCardNo ? "border-red-500 focus-visible:ring-red-400" : ""}
                  />
                  {fieldErrors.aadharCardNo && <p className="mt-1 text-xs text-red-500">{fieldErrors.aadharCardNo}</p>}
                </div>
                <div>
                  <Label>Language Proficiency *</Label>
                  <Select
                    value={languageProficiency}
                    onValueChange={(v) => { setLanguageProficiency(v); clearFieldError("languageProficiency"); }}
                  >
                    <SelectTrigger className={fieldErrors.languageProficiency ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select Language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languageOptions.map((l) => (
                        <SelectItem key={l.id} value={String(l.id)}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.languageProficiency && <p className="mt-1 text-xs text-red-500">{fieldErrors.languageProficiency}</p>}
                </div>

                <div>
                  <Label>Experience</Label>
                  <Input
                    type="number"
                    value={experience}
                    onChange={(e) => setExperience(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Country</Label>
                  <Select
                    value={country}
                    onValueChange={(v) => {
                      setCountry(v);
                      // state / city cleared by effects
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countryOptions.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>State</Label>
                  <Select
                    value={state}
                    onValueChange={(v) => {
                      setState(v);
// city cleared by effect
}}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent>
                      {stateOptions.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>City</Label>
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select City" />
                    </SelectTrigger>
                    <SelectContent>
                      {cityOptions.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>GST Type *</Label>
                  <Select value={gstType} onValueChange={(v) => { setGstType(v); clearFieldError("gstType"); }}>
                    <SelectTrigger className={fieldErrors.gstType ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select GST Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {GST_TYPE_OPTIONS.map((g) => (
                        <SelectItem key={g.id} value={String(g.id)}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.gstType && <p className="mt-1 text-xs text-red-500">{fieldErrors.gstType}</p>}
                </div>
                <div>
                  <Label>GST% *</Label>
                  <Select value={gstPercentage} onValueChange={(v) => { setGstPercentage(v); clearFieldError("gstPercentage"); }}>
                    <SelectTrigger className={fieldErrors.gstPercentage ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select GST%" />
                    </SelectTrigger>
                    <SelectContent>
                      {gstPercentOptions.map((g) => (
                        <SelectItem key={g.id} value={g.name}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.gstPercentage && <p className="mt-1 text-xs text-red-500">{fieldErrors.gstPercentage}</p>}
                </div>
              </div>

              {/* Available Slots */}
              <div>
                <Label className="mb-2 block">Guide Available Slots *</Label>
                <SlotMultiSelect
                  options={GUIDE_SLOTS}
                  selected={availableSlots}
                  hasError={!!fieldErrors.availableSlots}
                  onChange={(next) => {
                    setAvailableSlots(next);
                    if (next.length > 0) clearFieldError("availableSlots");
                  }}
                />
                {fieldErrors.availableSlots && <p className="mt-1 text-xs text-red-500">{fieldErrors.availableSlots}</p>}
              </div>

              {/* Divider with star */}
              <div className="flex items-center justify-center">
                <div className="flex-1 border-t border-dashed border-gray-300" />
                <Star className="mx-4 h-5 w-5 text-gray-300" />
                <div className="flex-1 border-t border-dashed border-gray-300" />
              </div>

              {/* Bank Details */}
              <div>
                <h3 className="text-lg font-semibold text-pink-500 mb-4">Bank Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Bank Name</Label>
                    <Input
                      value={bankDetails.bankName}
                      onChange={(e) =>
                        setBankDetails((prev) => ({ ...prev, bankName: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Branch Name</Label>
                    <Input
                      value={bankDetails.branchName}
                      onChange={(e) =>
                        setBankDetails((prev) => ({ ...prev, branchName: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>IFSC Code</Label>
                    <Input
                      value={bankDetails.ifscCode}
                      onChange={(e) =>
                        setBankDetails((prev) => ({ ...prev, ifscCode: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Account Number</Label>
                    <Input
                      value={bankDetails.accountNumber}
                      onChange={(e) =>
                        setBankDetails((prev) => ({ ...prev, accountNumber: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Confirm Account Number</Label>
                    <Input
                      value={bankDetails.confirmAccountNumber}
                      onChange={(e) => {
                        setBankDetails((prev) => ({ ...prev, confirmAccountNumber: e.target.value }));
                        clearFieldError("confirmAccountNumber");
                      }}
                      className={fieldErrors.confirmAccountNumber ? "border-red-500 focus-visible:ring-red-400" : ""}
                    />
                    {fieldErrors.confirmAccountNumber && <p className="mt-1 text-xs text-red-500">{fieldErrors.confirmAccountNumber}</p>}
                  </div>
                </div>
              </div>

              {/* Divider with star */}
              <div className="flex items-center justify-center">
                <div className="flex-1 border-t border-dashed border-gray-300" />
                <Star className="mx-4 h-5 w-5 text-gray-300" />
                <div className="flex-1 border-t border-dashed border-gray-300" />
              </div>

              {/* Guide Preferred For */}
              <div>
                <h3 className="text-lg font-semibold text-pink-500 mb-4">Guide Prefered For</h3>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="hotspot"
                      checked={preferredFor.hotspot}
                      onCheckedChange={(v) => {
                        const next = Boolean(v);
                        setPreferredFor({ hotspot: next, activity: false, itinerary: false });
                      }}
                    />
                    <Label htmlFor="hotspot">Hotspot</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="activity"
                      checked={preferredFor.activity}
                      onCheckedChange={(v) => {
                        const next = Boolean(v);
                        setPreferredFor({ hotspot: false, activity: next, itinerary: false });
                      }}
                    />
                    <Label htmlFor="activity">Activity</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="itinerary"
                      checked={preferredFor.itinerary}
                      onCheckedChange={(v) => {
const next = Boolean(v);
setPreferredFor({ hotspot: false, activity: false, itinerary: next });
                      }}
                    />
                    <Label htmlFor="itinerary">Itinerary</Label>
                  </div>
                </div>

                {preferredFor.hotspot && (
                  <div className="mt-4 w-full max-w-[440px]">
                    <Label className="mb-2 block">Hotspot Place *</Label>
                    <Popover open={hotspotDropdownOpen} onOpenChange={setHotspotDropdownOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn("min-h-10 h-auto w-full rounded-md border px-3 py-2 text-left",
                            fieldErrors.hotspotPlaces ? "border-red-500" : "border-input"
                          )}
                          onKeyDown={handleHotspotControlKeyDown}
                          onClick={() => setActiveHotspotToken(null)}
                        >
                          <div className="flex flex-wrap items-center gap-1 w-full">
                            {hotspotPlaces.length ? (
                              hotspotPlaces.map((id) => {
                                const name = hotspotOptions.find((h) => String(h.id) === id)?.name ?? id;
                                return (
                                  <span
                                    key={id}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setActiveHotspotToken(id);
                                    }}
                                    className={cn(
                                      "inline-flex items-center rounded px-2 py-0.5 text-xs",
                                      activeHotspotToken === id
                                        ? "bg-gradient-to-r from-primary to-pink-500 text-white"
                                        : "bg-[#f3e8ff] text-violet-700"
                                    )}
                                  >
                                    <span>{name}</span>
                                    <span
                                      role="button"
                                      aria-label={`Remove ${name}`}
                                      className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded hover:bg-black/10"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        removeHotspotToken(id);
                                      }}
                                    >
                                      x
                                    </span>
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-muted-foreground">Select hotspot</span>
                            )}
                          </div>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        side="bottom"
                        sideOffset={4}
                        avoidCollisions={false}
                        className="w-[var(--radix-popover-trigger-width)] max-h-64 overflow-auto p-1"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        {hotspotOptions.map((h) => {
                          const val = String(h.id);
                          const checked = hotspotPlaces.includes(val);
                          return (
                            <button
                              key={val}
                              type="button"
                              className={cn(
                                "flex w-full items-center rounded px-2 py-1.5 text-sm",
                                checked
                                  ? "bg-gradient-to-r from-primary to-pink-500 text-white"
                                  : "hover:bg-violet-50"
                              )}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                if (checked) {
                                  removeHotspotToken(val);
                                } else {
                                  setHotspotPlaces((prev) => (prev.includes(val) ? prev : [...prev, val]));
                                  clearFieldError("hotspotPlaces");
                                }
                              }}
                            >
                              <span>{h.name}</span>
                            </button>
                          );
                        })}
                      </PopoverContent>
                    </Popover>
                    {fieldErrors.hotspotPlaces && <p className="mt-1 text-xs text-red-500">{fieldErrors.hotspotPlaces}</p>}
                  </div>
                )}

                {preferredFor.activity && (
                  <div className="mt-4 w-full max-w-[440px]">
                    <Label className="mb-2 block">Activity *</Label>
                    <Popover open={activityDropdownOpen} onOpenChange={setActivityDropdownOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn("min-h-10 h-auto w-full rounded-md border px-3 py-2 text-left",
                            fieldErrors.activityPlaces ? "border-red-500" : "border-input"
                          )}
                          onKeyDown={handleActivityControlKeyDown}
                          onClick={() => setActiveActivityToken(null)}
                        >
                          <div className="flex flex-wrap items-center gap-1 w-full">
                            {activityPlaces.length ? (
                              activityPlaces.map((id) => {
                                const name = activityOptions.find((a) => String(a.id) === id)?.name ?? id;
                                return (
                                  <span
                                    key={id}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setActiveActivityToken(id);
                                    }}
                                    className={cn(
                                      "inline-flex items-center rounded px-2 py-0.5 text-xs",
                                      activeActivityToken === id
                                        ? "bg-gradient-to-r from-primary to-pink-500 text-white"
                                        : "bg-[#f3e8ff] text-violet-700"
                                    )}
                                  >
                                    <span>{name}</span>
                                    <span
                                      role="button"
                                      aria-label={`Remove ${name}`}
                                      className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded hover:bg-black/10"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        removeActivityToken(id);
                                      }}
                                    >
                                      x
                                    </span>
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-muted-foreground">Select activity</span>
                            )}
                          </div>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        side="bottom"
                        sideOffset={4}
                        avoidCollisions={false}
                        className="w-[var(--radix-popover-trigger-width)] max-h-64 overflow-auto p-1"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        {activityOptions.map((a) => {
                          const val = String(a.id);
                          const checked = activityPlaces.includes(val);
                          return (
                            <button
                              key={val}
                              type="button"
                              className={cn(
                                "flex w-full items-center rounded px-2 py-1.5 text-sm",
                                checked
                                  ? "bg-gradient-to-r from-primary to-pink-500 text-white"
                                  : "hover:bg-violet-50"
                              )}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
if (checked) {
removeActivityToken(val);
                                } else {
                                  setActivityPlaces((prev) => (prev.includes(val) ? prev : [...prev, val]));
                                  clearFieldError("activityPlaces");
                                }
                              }}
                            >
                              <span>{a.name}</span>
                            </button>
                          );
                        })}
                      </PopoverContent>
                    </Popover>
                    {fieldErrors.activityPlaces && <p className="mt-1 text-xs text-red-500">{fieldErrors.activityPlaces}</p>}
                  </div>
                )}

                <div className="mt-4 bg-pink-50 border border-pink-200 rounded-lg p-4 text-pink-600 text-sm">
                  From the beginning to the end of each day, the itinerary and all the hotspots
                  serve as a guide for the entire journey.
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-between pt-4">
                <Button variant="secondary" onClick={() => navigate("/guide")}>
                  Back
                </Button>
                <Button
                  onClick={handleSaveBasicInfo}
                  disabled={loading}
                  className="bg-gradient-to-r from-primary to-pink-500"
                >
                  {loading ? "Saving..." : isEdit ? "Update & Continue" : "Save & Continue"}
                </Button>
              </div>
            </div>
          )}

          <GuideFormPricebookStep context={context} />
          <GuideFormReviewStep context={context} />
          {currentStep === 4 && (
            <div className="space-y-8">
              {/* Basic Info Preview */}
              <div>
                <h3 className="text-lg font-semibold text-pink-500 mb-4">Basic Info</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Guide Name</p>
                    <p className="font-medium">{name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Date of Birth</p>
                    <p className="font-medium">{dateOfBirth || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Blood Group</p>
                    <p className="font-medium">{bloodGroup || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Gender</p>
                    <p className="font-medium">{gender || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Primary Mobile Number</p>
                    <p className="font-medium">{primaryMobile}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Alternative Mobile Number</p>
                    <p className="font-medium">{alternativeMobile || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Email ID</p>
                    <p className="font-medium">{email}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Emergency Mobile Number</p>
                    <p className="font-medium">{emergencyMobile || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Aadhar Card Number</p>
                    <p className="font-medium">{aadharCardNo || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Language Preference</p>
                    <p className="font-medium">
                      {languageOptions.find((x) => String(x.id) === String(languageProficiency))
                        ?.name || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Experience</p>
                    <p className="font-medium">{experience}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Country</p>
                    <p className="font-medium">{countryLabel || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">State</p>
                    <p className="font-medium">{stateLabel || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">City</p>
                    <p className="font-medium">{cityLabel || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">GST Type</p>
                    <p className="font-medium">{gstTypeLabel || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">GST%</p>
                    <p className="font-medium">
                      {gstPercentage ? gstPercentage.split(" ")[0] : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Guide Available Slots</p>
                    <p className="font-medium">
{availableSlots
                        .map((s) => GUIDE_SLOTS.find((slot) => slot.id === s)?.label)
                        .filter(Boolean)
                        .join(", ") || "-"}
</p>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center justify-center">
                <div className="flex-1 border-t border-dashed border-gray-300" />
                <Star className="mx-4 h-5 w-5 text-gray-300" />
                <div className="flex-1 border-t border-dashed border-gray-300" />
              </div>

              {/* Bank Details Preview */}
              <div>
                <h3 className="text-lg font-semibold text-pink-500 mb-4">Bank Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Bank Name</p>
                    <p className="font-medium">{bankDetails.bankName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Branch Name</p>
                    <p className="font-medium">{bankDetails.branchName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">IFSC Code</p>
                    <p className="font-medium">{bankDetails.ifscCode || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Account Number</p>
                    <p className="font-medium">{bankDetails.accountNumber || "-"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Confirm Account Number</p>
                    <p className="font-medium">{bankDetails.confirmAccountNumber || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center justify-center">
                <div className="flex-1 border-t border-dashed border-gray-300" />
                <Star className="mx-4 h-5 w-5 text-gray-300" />
                <div className="flex-1 border-t border-dashed border-gray-300" />
              </div>

              {/* Preferred For Preview */}
              <div>
                <h3 className="text-lg font-semibold text-pink-500 mb-4">Feedback & Review</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S.NO</TableHead>
                      <TableHead>RATING</TableHead>
                      <TableHead>DESCRIPTION</TableHead>
                      <TableHead>CREATED ON</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          No reviews
                        </TableCell>
                      </TableRow>
                    ) : (
                      reviews.map((review, idx) => (
                        <TableRow key={review.id}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>{review.rating} STARS</TableCell>
                          <TableCell>{review.description}</TableCell>
                          <TableCell>{review.createdOn}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Buttons */}
              <div className="flex justify-between pt-4">
                <Button variant="secondary" onClick={() => setCurrentStep(3)}>
                  Back
                </Button>
                <Button
                  onClick={handleConfirm}
                  className="bg-gradient-to-r from-primary to-pink-500"
                >
                  Confirm
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
