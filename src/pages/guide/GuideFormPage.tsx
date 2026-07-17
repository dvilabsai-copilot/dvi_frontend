/* eslint-disable @typescript-eslint/no-explicit-any */
// FILE: src/pages/guide/GuideFormPage.tsx

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight,Copy,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  Eye,
  EyeOff,
  Star,
  Pencil,
  Trash2,
  Calendar as CalendarIcon,
  CheckCircle2,
  X,
} from "lucide-react";
import { addYears, format, isValid, parseISO } from "date-fns";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GuideAPI } from "@/services/guideService";
import type {
  GuideBankDetails,
  GuidePreferredFor,
  GuidePricebook,
  GuideReview,
} from "@/types/guide";
import { BLOOD_GROUPS, GENDERS, GUIDE_SLOTS } from "@/types/guide";
import { api } from "@/lib/api";
import { SlotMultiSelect } from "./GuideSlotMultiSelect";
import { GuideFormView } from "./GuideFormView";

/* ------------------------------------------------------------------
   Dynamic option types (all dropdowns pull from backend)
-------------------------------------------------------------------*/
type Opt = { id: string | number; name: string };
type CountryOpt = { id: number; name: string };
type StateOpt = { id: number; name: string; countryId?: number };
type CityOpt = { id: number; name: string; stateId?: number };

/** Fixed GST Type mapping: UI shows label, payload must send 1/2 */
const GST_TYPE_OPTIONS: Opt[] = [
  { id: "1", name: "Included" },
  { id: "2", name: "Excluded" },
];

const STEPS = [
  { id: 1, label: "Guide Basic Info" },
  { id: 2, label: "Pricebook" },
  { id: 3, label: "FeedBack & Review" },
  { id: 4, label: "Guide Preview" },
];

/* ------------------------------------------------------------------
   SlotMultiSelect â€” Select2-style multi-select for Guide Available Slots
   Keyboard: â†“/â†‘ navigate, Enter/Space toggle, Backspace remove last chip,
             Escape close, Tab close (blur)
-------------------------------------------------------------------*/
const defaultBankDetails: GuideBankDetails = {
  bankName: "",
  branchName: "",
  ifscCode: "",
  accountNumber: "",
  confirmAccountNumber: "",
};

const defaultPreferredFor: GuidePreferredFor = {
  hotspot: false,
  activity: false,
  itinerary: false,
};

const makeDefaultPricebook = (): GuidePricebook => ({
  startDate: "",
  endDate: "",
  pax1to5: { slot1: 0, slot2: 0, slot3: 0, slot4: 0 },
  pax6to14: { slot1: 0, slot2: 0, slot3: 0, slot4: 0 },
  pax15to40: { slot1: 0, slot2: 0, slot3: 0, slot4: 0 },
});

const withDefaultPricebookDates = (value?: GuidePricebook | null): GuidePricebook => {
  const fallback = makeDefaultPricebook();
  const incoming = value ?? ({} as GuidePricebook);
  return {
    ...fallback,
    ...incoming,
    startDate: incoming.startDate?.trim() ? incoming.startDate : "",
    endDate: incoming.endDate?.trim() ? incoming.endDate : "",
    pax1to5: { ...fallback.pax1to5, ...(incoming.pax1to5 ?? {}) },
    pax6to14: { ...fallback.pax6to14, ...(incoming.pax6to14 ?? {}) },
    pax15to40: { ...fallback.pax15to40, ...(incoming.pax15to40 ?? {}) },
  };
};

const toPickerDate = (value: string) => {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
};

export default function GuideFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [topSuccessMessage, setTopSuccessMessage] = useState("");

  // Basic Info state
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [gender, setGender] = useState("");
  const [primaryMobile, setPrimaryMobile] = useState("");
  const [alternativeMobile, setAlternativeMobile] = useState("");
  const [email, setEmail] = useState("");
  const [emergencyMobile, setEmergencyMobile] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(""); // value = role_id (string) from dvi_rolemenu
  const [experience, setExperience] = useState<number>(0);
  const [aadharCardNo, setAadharCardNo] = useState("");
  const [languageProficiency, setLanguageProficiency] = useState(""); // value = language_id (string)
  const [country, setCountry] = useState(""); // value = country_id (string)
  const [state, setState] = useState(""); // value = state_id (string)
  const [city, setCity] = useState(""); // value = city_id (string)
  const [gstType, setGstType] = useState(""); // "1" | "2"
  const [gstPercentage, setGstPercentage] = useState(""); // value = gst_title (string)
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [bankDetails, setBankDetails] = useState<GuideBankDetails>(defaultBankDetails);
  const [preferredFor, setPreferredFor] = useState<GuidePreferredFor>(defaultPreferredFor);
  const [hotspotPlaces, setHotspotPlaces] = useState<string[]>([]);
  const [activityPlaces, setActivityPlaces] = useState<string[]>([]);
  const [hotspotDropdownOpen, setHotspotDropdownOpen] = useState(false);
  const [activityDropdownOpen, setActivityDropdownOpen] = useState(false);
  const [activeHotspotToken, setActiveHotspotToken] = useState<string | null>(null);
  const [activeActivityToken, setActiveActivityToken] = useState<string | null>(null);

  // Pricebook state
  const [pricebook, setPricebook] = useState<GuidePricebook>(makeDefaultPricebook);

  // Pricebook price inputs â€” always empty (no pre-fill from DB, matching PHP)
  const [priceInputs, setPriceInputs] = useState({
    pax1_slot1: "", pax1_slot2: "", pax1_slot3: "", pax1_slot4: "",
    pax2_slot1: "", pax2_slot2: "", pax2_slot3: "", pax2_slot4: "",
    pax3_slot1: "", pax3_slot2: "", pax3_slot3: "", pax3_slot4: "",
  });

  // Pricebook display rows (fetched from backend for the per-day table)
  const [pricebookDisplayRows, setPricebookDisplayRows] = useState<any[]>([]);

  // Reviews state
  const [reviews, setReviews] = useState<GuideReview[]>([]);
  const [newRating, setNewRating] = useState<number>(0);
  const [newFeedback, setNewFeedback] = useState("");
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
const [searchReview, setSearchReview] = useState("");
  const [emailDuplicateError, setEmailDuplicateError] = useState(false);

  // Field-level validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Refs for focusing errored fields
  const nameRef = useRef<HTMLInputElement>(null);
  const primaryMobileRef = useRef<HTMLInputElement>(null);
  const alternativeMobileRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const emergencyMobileRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const aadharRef = useRef<HTMLInputElement>(null);

  /* ------------------------------------------------------------------
     Dynamic dropdown option state
  -------------------------------------------------------------------*/
  const [roleOptions, setRoleOptions] = useState<Opt[]>([]);
  const [languageOptions, setLanguageOptions] = useState<Opt[]>([]);
  const [countryOptions, setCountryOptions] = useState<CountryOpt[]>([]);
  const [stateOptions, setStateOptions] = useState<StateOpt[]>([]);
  const [cityOptions, setCityOptions] = useState<CityOpt[]>([]);
  const [gstPercentOptions, setGstPercentOptions] = useState<Opt[]>([]);
  const [hotspotOptions, setHotspotOptions] = useState<Opt[]>([]);
  const [activityOptions, setActivityOptions] = useState<Opt[]>([]);

  const pendingStateRef = useRef<string>("");
  const pendingCityRef = useRef<string>("");
  const topSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originalEmailRef = useRef<string>("");
  const selectedDob = useMemo(() => toPickerDate(dateOfBirth), [dateOfBirth]);

  const showTopSuccess = (message: string) => {
    setTopSuccessMessage(message);
    if (topSuccessTimerRef.current) {
      clearTimeout(topSuccessTimerRef.current);
    }
    topSuccessTimerRef.current = setTimeout(() => {
      setTopSuccessMessage("");
      topSuccessTimerRef.current = null;
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (topSuccessTimerRef.current) {
        clearTimeout(topSuccessTimerRef.current);
      }
    };
  }, []);

  const removeHotspotToken = (id: string) => {
    setHotspotPlaces((prev) => prev.filter((x) => x !== id));
    setActiveHotspotToken((prev) => (prev === id ? null : prev));
  };

  const removeActivityToken = (id: string) => {
    setActivityPlaces((prev) => prev.filter((x) => x !== id));
    setActiveActivityToken((prev) => (prev === id ? null : prev));
  };

  // Fetch pricebook display rows whenever guide id + dates are set
  const fetchPricebookDisplay = useCallback(async () => {
    if (!id || !pricebook.startDate || !pricebook.endDate) {
      setPricebookDisplayRows([]);
      return;
    }
    try {
      const rows = await GuideAPI.getPricebook(Number(id), pricebook.startDate, pricebook.endDate);
      setPricebookDisplayRows(rows);
    } catch {
      // silently ignore â€” display table stays empty
    }
  }, [id, pricebook.startDate, pricebook.endDate]);

  useEffect(() => {
    fetchPricebookDisplay();
  }, [fetchPricebookDisplay]);

  const handleHotspotControlKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === "Backspace" || e.key === "Delete") && hotspotPlaces.length > 0) {
      e.preventDefault();
      if (activeHotspotToken && hotspotPlaces.includes(activeHotspotToken)) {
        removeHotspotToken(activeHotspotToken);
      } else {
        removeHotspotToken(hotspotPlaces[hotspotPlaces.length - 1]);
      }
    }
  };

  const handleActivityControlKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === "Backspace" || e.key === "Delete") && activityPlaces.length > 0) {
      e.preventDefault();
      if (activeActivityToken && activityPlaces.includes(activeActivityToken)) {
        removeActivityToken(activeActivityToken);
      } else {
        removeActivityToken(activityPlaces[activityPlaces.length - 1]);
      }
    }
  };

  /* ------------------------------------------------------------------
     Bootstrap dropdowns on page load
  -------------------------------------------------------------------*/
  useEffect(() => {
    (async () => {
      try {
        // roles: dvi_rolemenu.role_name
        const roles = await api("/guides/dropdowns/roles", { method: "GET" }).catch(() => []);
        setRoleOptions(
          (Array.isArray(roles) ? roles : [])
            .map((r: any) => {
              const id = String(r?.role_id ?? r?.id ?? r?.ROLE_ID ?? r?.value ?? "").trim();
              const name = String(r?.role_name ?? r?.name ?? r?.ROLE_NAME ?? "").trim();
              return { id, name };
            })
            .filter((o: Opt) => o.id !== "" && o.name !== "")
        );

        // languages: dvi_language.language
        const languages = await api("/guides/dropdowns/languages", { method: "GET" }).catch(() => []);
        setLanguageOptions(
          (Array.isArray(languages) ? languages : [])
            .map((l: any) => {
              const id = String(l?.language_id ?? l?.id ?? l?.LANGUAGE_ID ?? l?.value ?? "").trim();
              const name = String(l?.language ?? l?.name ?? l?.LANGUAGE ?? "").trim();
              return { id, name };
            })
            .filter((o: Opt) => o.id !== "" && o.name !== "")
        );

        // countries
        const countries = await api("/guides/dropdowns/countries", { method: "GET" }).catch(() => []);
        setCountryOptions(
          (Array.isArray(countries) ? countries : [])
            .map((c: any) => {
              const idRaw = c?.country_id ?? c?.id ?? c?.COUNTRY_ID ?? 0;
              const id = Number(idRaw);
              const name = String(c?.country_name ?? c?.name ?? c?.COUNTRY_NAME ?? "").trim();
              return { id, name };
            })
            .filter((o: CountryOpt) => !!o.id && o.name !== "")
        );

        // GST %: dvi_gst_setting.gst_title
        const gst = await api("/guides/dropdowns/gst-percentages", { method: "GET" }).catch(() => []);
        setGstPercentOptions(
          (Array.isArray(gst) ? gst : [])
            .map((g: any) => {
              // Keep value as gst_title (string) for payload, but ensure it's not empty
              const title = String(g?.gst_title ?? g?.title ?? g?.name ?? "").trim();
              const id = title; // use title as value consistently
              return { id, name: title };
            })
            .filter((o: Opt) => o.id !== "" && o.name !== "")
        );

        const hotspots = await api("/guides/dropdowns/hotspots", { method: "GET" }).catch(() => []);
        setHotspotOptions(
          (Array.isArray(hotspots) ? hotspots : [])
            .map((h: any) => {
              const id = String(h?.hotspot_ID ?? h?.id ?? h?.value ?? "").trim();
              const name = String(h?.hotspot_name ?? h?.name ?? h?.label ?? "").trim();
              return { id, name };
            })
            .filter((o: Opt) => o.id !== "" && o.name !== "")
        );

        const activities = await api("/guides/dropdowns/activities", { method: "GET" }).catch(() => []);
        setActivityOptions(
          (Array.isArray(activities) ? activities : [])
            .map((a: any) => {
              const id = String(a?.activity_id ?? a?.id ?? a?.value ?? "").trim();
              const name = String(a?.activity_title ?? a?.name ?? a?.label ?? "").trim();
              return { id, name };
            })
            .filter((o: Opt) => o.id !== "" && o.name !== "")
        );
      } catch {
        // never block the page for options; user can still type/save
      }
    })();
  }, []);

  // Default country for new guide = India
  useEffect(() => {
    if (isEdit || country || countryOptions.length === 0) return;
    const india =
      countryOptions.find((c) => Number(c.id) === 101) ??
      countryOptions.find((c) => c.name.trim().toLowerCase() === "india");
    if (india) setCountry(String(india.id));
  }, [isEdit, country, countryOptions]);

  /* ------------------------------------------------------------------
     When country changes â†’ fetch states
  -------------------------------------------------------------------*/
  useEffect(() => {
    if (!country) {
      setStateOptions([]);
      setState("");
      setCityOptions([]);
      setCity("");
      return;
    }
    (async () => {
      try {
        const states = await api(`/guides/dropdowns/states?countryId=${country}`, { method: "GET" }).catch(
          () => []
        );
        setStateOptions(
          Array.isArray(states)
            ? states.map((s: any) => ({
                id: Number(s?.state_id ?? s?.id ?? s?.STATE_ID ?? 0),
                name: String(s?.state_name ?? s?.name ?? s?.STATE_NAME ?? ""),
                countryId: Number(s?.country_id ?? s?.COUNTRY_ID ?? 0),
              }))
            : []
        );
        const nextStates = Array.isArray(states)
          ? states.map((s: any) => ({
              id: Number(s?.state_id ?? s?.id ?? s?.STATE_ID ?? 0),
              name: String(s?.state_name ?? s?.name ?? s?.STATE_NAME ?? ""),
              countryId: Number(s?.country_id ?? s?.COUNTRY_ID ?? 0),
            }))
          : [];

        if (pendingStateRef.current) {
          const keep = nextStates.some((s) => String(s.id) === pendingStateRef.current);
          setState(keep ? pendingStateRef.current : "");
          pendingStateRef.current = "";
        } else {
          setState("");
        }
        setCityOptions([]);
        setCity("");
      } catch {
        setStateOptions([]);
        setState("");
        setCityOptions([]);
        setCity("");
      }
    })();
  }, [country]);

  /* ------------------------------------------------------------------
     When state changes â†’ fetch cities
  -------------------------------------------------------------------*/
  useEffect(() => {
    if (!state) {
      setCityOptions([]);
      setCity("");
      return;
    }
    (async () => {
      try {
        const cities = await api(`/guides/dropdowns/cities?stateId=${state}`, { method: "GET" }).catch(
          () => []
        );
        setCityOptions(
          Array.isArray(cities)
            ? cities.map((c: any) => ({
                id: Number(c?.city_id ?? c?.id ?? c?.CITY_ID ?? 0),
                name: String(c?.city_name ?? c?.name ?? c?.CITY_NAME ?? ""),
                stateId: Number(c?.state_id ?? c?.STATE_ID ?? 0),
              }))
            : []
        );
        const nextCities = Array.isArray(cities)
          ? cities.map((c: any) => ({
              id: Number(c?.city_id ?? c?.id ?? c?.CITY_ID ?? 0),
              name: String(c?.city_name ?? c?.name ?? c?.CITY_NAME ?? ""),
              stateId: Number(c?.state_id ?? c?.STATE_ID ?? 0),
            }))
          : [];

        if (pendingCityRef.current) {
          const keep = nextCities.some((c) => String(c.id) === pendingCityRef.current);
          setCity(keep ? pendingCityRef.current : "");
          pendingCityRef.current = "";
        } else {
          setCity("");
        }
      } catch {
        setCityOptions([]);
        setCity("");
      }
    })();
  }, [state]);

  /* ------------------------------------------------------------------
     Load guide for edit
  -------------------------------------------------------------------*/
  useEffect(() => {
    if (isEdit && id) {
      (async () => {
        setLoading(true);
        try {
          const guide = await GuideAPI.get(Number(id));
          if (guide) {
            setName(guide.name);
            setDateOfBirth(guide.dateOfBirth);
            const bloodIdx = Number(guide.bloodGroup || 0);
            setBloodGroup(
              bloodIdx > 0 && bloodIdx <= BLOOD_GROUPS.length
                ? BLOOD_GROUPS[bloodIdx - 1]
                : guide.bloodGroup
            );
            const g = String(guide.gender || "").toLowerCase();
            setGender(
              g === "1" || g === "male"
                ? "Male"
                : g === "2" || g === "female"
                ? "Female"
                : g === "3" || g === "other"
                ? "Other"
                : guide.gender
            );
            setPrimaryMobile(guide.primaryMobile);
            setAlternativeMobile(guide.alternativeMobile);
            setEmail(guide.email);
            originalEmailRef.current = guide.email || "";
            setEmergencyMobile(guide.emergencyMobile);
            setPassword(guide.password);
            setRole(String(guide.role ?? "")); // keep as string id
            setExperience(guide.experience);
            setAadharCardNo(guide.aadharCardNo);
            setLanguageProficiency(String(guide.languageProficiency ?? ""));
            pendingStateRef.current = String(guide.state ?? "");
            pendingCityRef.current = String(guide.city ?? "");
            setCountry(String(guide.country ?? ""));
            setState("");
            setCity("");
            setGstType(String(guide.gstType ?? "")); // "1"/"2"
            setGstPercentage(String(guide.gstPercentage ?? ""));
            setAvailableSlots(guide.availableSlots || []);
            setBankDetails(guide.bankDetails || defaultBankDetails);
            setPreferredFor(guide.preferredFor || defaultPreferredFor);
            setHotspotPlaces(Array.isArray((guide as any).hotspotPlaces) ? (guide as any).hotspotPlaces : []);
            setActivityPlaces(Array.isArray((guide as any).activityPlaces) ? (guide as any).activityPlaces : []);
            setPricebook(withDefaultPricebookDates(guide.pricebook));
            setReviews(guide.reviews || []);
          }
        } catch {
          toast.error("Failed to load guide");
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [id, isEdit]);

  // Normalize GST selection value to the dropdown option text (e.g., "5%") when API returns a raw number.
  useEffect(() => {
    if (!gstPercentage || gstPercentOptions.length === 0) return;

    const current = String(gstPercentage).trim();
    const exact = gstPercentOptions.some((g) => String(g.id) === current || g.name === current);
    if (exact) return;

    const numeric = Number((current.match(/\d+(?:\.\d+)?/) ?? [""])[0]);
    if (!Number.isFinite(numeric)) return;

    const match = gstPercentOptions.find((g) => {
      const n = Number((String(g.name).match(/\d+(?:\.\d+)?/) ?? [""])[0]);
      return Number.isFinite(n) && n === numeric;
    });
    if (match) setGstPercentage(String(match.id));
  }, [gstPercentage, gstPercentOptions]);

  const handleEmailBlur = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || isEdit) return;
    try {
      const result = await api("/guides/ajax/check-guide-email", {
        method: "POST",
        body: JSON.stringify({
          guide_email_id: trimmedEmail,
          old_guide_email_id: originalEmailRef.current,
        }),
      });
      if (!result?.success) {
        setEmailDuplicateError(true);
        setFieldErrors((prev) => ({ ...prev, email: "Email Address already Exists" }));
      } else {
        setEmailDuplicateError(false);
        setFieldErrors((prev) => { const next = { ...prev }; delete next.email; return next; });
      }
    } catch {
      // ignore network errors during blur check
    }
  };

  const setFieldError = (field: string, msg: string, ref?: React.RefObject<HTMLInputElement | null>) => {
    setFieldErrors((prev) => ({ ...prev, [field]: msg }));
    ref?.current?.focus();
    ref?.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const clearFieldError = (field: string) =>
    setFieldErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });

  const handleSaveBasicInfo = async () => {
    // Run all validations, collect first error to focus
    const errors: Record<string, string> = {};
    let firstRef: React.RefObject<HTMLInputElement | null> | null = null;

    if (!name.trim()) {
      errors.name = "Guide Name is required";
      if (!firstRef) firstRef = nameRef;
    }
    if (!gender) {
      errors.gender = "Gender is required";
    }
    if (!primaryMobile.trim()) {
      errors.primaryMobile = "Primary Mobile Number is required";
      if (!firstRef) firstRef = primaryMobileRef;
    } else if (!/^\d{10}$/.test(primaryMobile.trim())) {
      errors.primaryMobile = "Please enter a valid 10-digit number";
      if (!firstRef) firstRef = primaryMobileRef;
    }
    if (alternativeMobile && !/^\d{10}$/.test(alternativeMobile.trim())) {
      errors.alternativeMobile = "Please enter a valid 10-digit number";
      if (!firstRef) firstRef = alternativeMobileRef;
    }
    if (!email.trim()) {
      errors.email = "Email ID is required";
      if (!firstRef) firstRef = emailRef;
    } else if (emailDuplicateError) {
      errors.email = "Email Address already Exists";
      if (!firstRef) firstRef = emailRef;
    }
    if (emergencyMobile && emergencyMobile.trim() === primaryMobile.trim()) {
      errors.emergencyMobile = "Emergency mobile number and primary mobile number should not be same";
      if (!firstRef) firstRef = emergencyMobileRef;
    } else if (emergencyMobile && !/^\d{10}$/.test(emergencyMobile.trim())) {
      errors.emergencyMobile = "Please enter a valid 10-digit number";
      if (!firstRef) firstRef = emergencyMobileRef;
    }
    if (!isEdit && !password.trim()) {
      errors.password = "Password is required";
      if (!firstRef) firstRef = passwordRef;
    }
    if (!role) {
      errors.role = "Role is required";
    }
    if (!languageProficiency) {
      errors.languageProficiency = "Language Proficiency is required";
    }
    if (aadharCardNo && !/^\d{12}$/.test(aadharCardNo.trim())) {
      errors.aadharCardNo = "Please enter a valid 12-digit Aadhar number";
      if (!firstRef) firstRef = aadharRef;
    }
    if (!gstType) {
      errors.gstType = "GST Type is required";
    }
    if (!gstPercentage) {
      errors.gstPercentage = "GST% is required";
    }
    if (availableSlots.length === 0) {
      errors.availableSlots = "At least one slot is required";
    }
    if (preferredFor.hotspot && hotspotPlaces.length === 0) {
      errors.hotspotPlaces = "Hotspot Place is required";
    }
    if (preferredFor.activity && activityPlaces.length === 0) {
      errors.activityPlaces = "Activity is required";
    }
    if (bankDetails.accountNumber && bankDetails.confirmAccountNumber &&
        bankDetails.accountNumber !== bankDetails.confirmAccountNumber) {
      errors.confirmAccountNumber = "Account number and confirm account number should be same";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      firstRef?.current?.focus();
      firstRef?.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setFieldErrors({});

    setLoading(true);
    try {
      const guideData = {
        name,
        dateOfBirth,
        bloodGroup,
        gender,
        primaryMobile,
        alternativeMobile,
        email,
        emergencyMobile,
        password,
        role, // role_id string
        experience,
        aadharCardNo,
        languageProficiency, // language_id string
        country, // country_id string
        state, // state_id string
        city, // city_id string
        gstType, // "1" | "2" as required
        gstPercentage, // gst_title string
        availableSlots,
        bankDetails,
        preferredFor,
        hotspotPlaces,
        activityPlaces,
        pricebook,
        reviews,
        status: 1 as const,
      };

      if (isEdit && id) {
        await GuideAPI.update(Number(id), guideData);
        showTopSuccess("Guide Basic Details Updated");
      } else {
        const created = await GuideAPI.create(guideData);
        navigate(`/guide/${created.id}/edit`, { replace: true });
        showTopSuccess("Guide Basic Details Added");
      }
      setCurrentStep(2);
    } catch {
      toast.error(isEdit ? "Unable to Update Guide Basic Details" : "Unable to Add Guide Basic Details");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePricebook = async () => {
    if (!id) {
      toast.error("Guide is Required");
      return;
    }
    if (!pricebook.startDate || !pricebook.endDate) {
      toast.error("Start Date and End Date are required");
      return;
    }
    if (new Date(pricebook.endDate) < new Date(pricebook.startDate)) {
      toast.error("End Date must be on or after Start Date");
      return;
    }
    setLoading(true);
    try {
      await GuideAPI.updatePricebook(Number(id), {
        startDate: pricebook.startDate,
        endDate: pricebook.endDate,
        priceInputs,
      });
      // Clear inputs (PHP behavior: clears all .amount fields after submit)
      setPriceInputs({
        pax1_slot1: "", pax1_slot2: "", pax1_slot3: "", pax1_slot4: "",
        pax2_slot1: "", pax2_slot2: "", pax2_slot3: "", pax2_slot4: "",
        pax3_slot1: "", pax3_slot2: "", pax3_slot3: "", pax3_slot4: "",
      });
      // Refresh the per-day display table
      await fetchPricebookDisplay();
      toast.success("Guide Price Book Details Updated Successfully");
    } catch {
      toast.error("Unable to Update Guide Price Book Details");
    } finally {
      setLoading(false);
    }
  };

  const handleAddReview = async () => {
    if (!newRating) {
      toast.error("Rating is Required");
      return;
    }
    if (!newFeedback.trim()) {
      toast.error("Description is Required");
      return;
    }
    if (!id) {
      toast.error("Guide is Required");
      return;
    }

    try {
      if (editingReviewId) {
        await GuideAPI.updateReview(Number(id), editingReviewId, {
          rating: newRating,
          description: newFeedback,
        });
        setReviews((prev) =>
          prev.map((r) =>
            r.id === editingReviewId ? { ...r, rating: newRating, description: newFeedback } : r
          )
        );
        setEditingReviewId(null);
        setNewRating(0);
        setNewFeedback("");
        toast.success("Feedback Details Updated");
        return;
      }

      const now = new Date();
      const createdOn = now.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const review = await GuideAPI.addReview(Number(id), {
        rating: newRating,
        description: newFeedback,
        createdOn,
      });
      setReviews((prev) => [...prev, review]);
      setNewRating(0);
      setNewFeedback("");
      toast.success("Feedback Details Created Successfully");
    } catch {
      toast.error(editingReviewId ? "Unable to Update Feedback Details" : "Unable to Add Feedback  Details");
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!id) return;
    try {
      await GuideAPI.deleteReview(Number(id), reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      toast.success("Deleted Successfully");
    } catch {
      toast.error("Unable to delete the Rating");
    }
  };

  const handleEditReview = (review: GuideReview) => {
    setEditingReviewId(review.id);
    setNewRating(Number(review.rating || 0));
    setNewFeedback(review.description || "");
  };
const handleCopyReviews = async () => {
  const text = filteredReviews
    .map(
      (r, i) =>
        `${i + 1}. Rating: ${r.rating} | Description: ${r.description} | Created: ${r.createdOn}`
    )
    .join("\n");

  await navigator.clipboard.writeText(text);

  toast.success("Copied Successfully");
};

const handleDownloadCSV = () => {
  const headers = ["S.NO", "RATING", "DESCRIPTION", "CREATED ON"];

  const rows = filteredReviews.map((r, i) => [
    i + 1,
    r.rating,
    r.description,
    r.createdOn,
  ]);

  const csvContent = [headers, ...rows]
    .map((e) => e.join(","))
    .join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = "guide_reviews.csv";

  link.click();

  toast.success("CSV Downloaded");
};

const handleDownloadExcel = () => {
  handleDownloadCSV();

  toast.success("Excel Downloaded");
};

  const handleConfirm = async () => {
    toast.success("Guide saved successfully");
    navigate("/guide");
  };

  const filteredReviews = reviews.filter((review) =>
  review.description
    ?.toLowerCase()
    .includes(searchReview.toLowerCase())
);

  const renderStars = (count: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={cn(
          "h-4 w-4",
          i < count ? "fill-purple-500 text-purple-500" : "text-gray-300"
        )}
      />
    ));
  };

  // derive labels for preview
  const gstTypeLabel = useMemo(
    () => GST_TYPE_OPTIONS.find((g) => String(g.id) === String(gstType))?.name ?? "",
    [gstType]
  );
  const countryLabel = useMemo(
    () => countryOptions.find((c) => String(c.id) === String(country))?.name ?? "",
    [country, countryOptions]
  );
  const stateLabel = useMemo(
    () => stateOptions.find((s) => String(s.id) === String(state))?.name ?? "",
    [state, stateOptions]
  );
  const cityLabel = useMemo(
    () => cityOptions.find((c) => String(c.id) === String(city))?.name ?? "",
    [city, cityOptions]
  );

  if (loading && isEdit && currentStep === 1) {
    return (
      <div className="p-6">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <GuideFormView
      context={{
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
        setNewFeedback, editingReviewId, setEditingReviewId, emailDuplicateError, fieldErrors,
        nameRef, primaryMobileRef, alternativeMobileRef, emailRef, emergencyMobileRef, passwordRef,
        aadharRef, roleOptions, languageOptions, countryOptions, stateOptions, cityOptions,
        gstPercentOptions, hotspotOptions, activityOptions, selectedDob, showTopSuccess,
        removeHotspotToken, removeActivityToken, fetchPricebookDisplay, handleHotspotControlKeyDown,
        handleActivityControlKeyDown, handleEmailBlur, setFieldError, clearFieldError,
        handleSaveBasicInfo, handleUpdatePricebook, handleAddReview, handleDeleteReview,
        handleEditReview, searchReview, setSearchReview, handleCopyReviews, handleDownloadExcel,
        handleDownloadCSV, handleConfirm, filteredReviews, renderStars, gstTypeLabel,
        countryLabel, stateLabel, cityLabel, loading, isEdit,
      }}
    />
  );

}
