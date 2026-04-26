// FILE: src/pages/guide/GuideFormPage.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight,
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

const makeDefaultPricebook = (): GuidePricebook => {
  const today = new Date();
  return {
    startDate: format(today, "yyyy-MM-dd"),
    endDate: format(addYears(today, 1), "yyyy-MM-dd"),
    pax1to5: { slot1: 0, slot2: 0, slot3: 0 },
    pax6to14: { slot1: 0, slot2: 0, slot3: 0 },
    pax15to40: { slot1: 0, slot2: 0, slot3: 0 },
  };
};

const withDefaultPricebookDates = (value?: GuidePricebook | null): GuidePricebook => {
  const fallback = makeDefaultPricebook();
  const incoming = value ?? ({} as GuidePricebook);
  return {
    ...fallback,
    ...incoming,
    startDate: incoming.startDate?.trim() ? incoming.startDate : fallback.startDate,
    endDate: incoming.endDate?.trim() ? incoming.endDate : fallback.endDate,
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

  // Reviews state
  const [reviews, setReviews] = useState<GuideReview[]>([]);
  const [newRating, setNewRating] = useState<number>(0);
  const [newFeedback, setNewFeedback] = useState("");
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [emailDuplicateError, setEmailDuplicateError] = useState(false);
  const [pricebookSaved, setPricebookSaved] = useState(false);

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
     When country changes → fetch states
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
     When state changes → fetch cities
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
        toast.error("Email Address already Exists");
      } else {
        setEmailDuplicateError(false);
      }
    } catch {
      // ignore network errors during blur check
    }
  };

  const handleSaveBasicInfo = async () => {
    if (!name.trim()) {
      toast.error("Guide Name Required");
      return;
    }
    if (!gender) {
      toast.error("Guide Gender Required");
      return;
    }
    if (!primaryMobile.trim()) {
      toast.error("Guide Primart Mobile no Required");
      return;
    }
    if (!/^\d{10}$/.test(primaryMobile.trim())) {
      toast.error("Please enter a valid 10-digit primary mobile number.");
      return;
    }
    if (alternativeMobile && !/^\d{10}$/.test(alternativeMobile.trim())) {
      toast.error("Please enter a valid 10-digit alternative mobile number.");
      return;
    }
    if (aadharCardNo && !/^\d{12}$/.test(aadharCardNo.trim())) {
      toast.error("Please enter a Valid Aadhar Number.");
      return;
    }
    if (!email.trim()) {
      toast.error("Email ID Required");
      return;
    }
    if (emailDuplicateError) {
      toast.error("Email Address already Exists");
      return;
    }
    if (emergencyMobile && emergencyMobile.trim() === primaryMobile.trim()) {
      toast.error("Emeregency mobile number and primary mobile number should not be same");
      return;
    }
    if (emergencyMobile && !/^\d{10}$/.test(emergencyMobile.trim())) {
      toast.error("Please enter a valid 10-digit emergency mobile number.");
      return;
    }
    if (!role) {
      toast.error("Role Required");
      return;
    }
    if (!isEdit && !password.trim()) {
      toast.error("Password Required");
      return;
    }
    if (!languageProficiency) {
      toast.error("Language Proficiency Required");
      return;
    }
    if (!gstType) {
      toast.error("GST Type Required");
      return;
    }
    if (!gstPercentage) {
      toast.error("GST% Required");
      return;
    }
    if (availableSlots.length === 0) {
      toast.error("Guide Slot Required");
      return;
    }
    if (preferredFor.hotspot && hotspotPlaces.length === 0) {
      toast.error("Hotspot Place Required");
      return;
    }
    if (preferredFor.activity && activityPlaces.length === 0) {
      toast.error("Activity Required");
      return;
    }
    if (bankDetails.accountNumber && bankDetails.confirmAccountNumber && bankDetails.accountNumber !== bankDetails.confirmAccountNumber) {
      toast.error("Account number and confirm account number should be same");
      return;
    }

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
      await GuideAPI.updatePricebook(Number(id), pricebook);
      setPricebookSaved(true);
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

  const handleConfirm = async () => {
    toast.success("Guide saved successfully");
    navigate("/guide");
  };

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
          {isEdit ? `Edit Guide » ${name}` : "Add Guide"}
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
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
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
                    render={({ ...props }, ref) => (
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
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger>
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
                </div>
                <div>
                  <Label>Primary Mobile Number *</Label>
                  <Input
                    value={primaryMobile}
                    maxLength={10}
                    onChange={(e) => setPrimaryMobile(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Alternative Mobile Number</Label>
                  <Input
                    value={alternativeMobile}
                    maxLength={10}
                    onChange={(e) => setAlternativeMobile(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Email ID *</Label>
                  <Input
                    type="email"
                    value={email}
                    readOnly={isEdit}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailDuplicateError) setEmailDuplicateError(false);
                    }}
                    onBlur={handleEmailBlur}
                  />
                  {emailDuplicateError && (
                    <p className="mt-1 text-xs text-red-500">Email Address already Exists</p>
                  )}
                </div>
                <div>
                  <Label>Emergency Mobile Number</Label>
                  <Input
                    value={emergencyMobile}
                    maxLength={10}
                    onChange={(e) => setEmergencyMobile(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Password *</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                </div>

                <div>
                  <Label>Role *</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
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
                </div>
                <div>
                  <Label>Aadhar Card No</Label>
                  <Input
                    value={aadharCardNo}
                    maxLength={12}
                    onChange={(e) => setAadharCardNo(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Language Proficiency *</Label>
                  <Select
                    value={languageProficiency}
                    onValueChange={setLanguageProficiency}
                  >
                    <SelectTrigger>
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
                  <Select value={gstType} onValueChange={setGstType}>
                    <SelectTrigger>
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
                </div>
                <div>
                  <Label>GST% *</Label>
                  <Select value={gstPercentage} onValueChange={setGstPercentage}>
                    <SelectTrigger>
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
                </div>
              </div>

              {/* Available Slots */}
              <div>
                <Label className="mb-2 block">Guide Available Slots *</Label>
                <div className="flex flex-wrap gap-6">
                  {GUIDE_SLOTS.map((slot) => (
                    <div key={slot.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`guide-slot-${slot.id}`}
                        checked={availableSlots.includes(slot.id)}
                        onCheckedChange={(checked) => {
                          setAvailableSlots((prev) => {
                            if (checked) {
                              return prev.includes(slot.id) ? prev : [...prev, slot.id];
                            }
                            return prev.filter((s) => s !== slot.id);
                          });
                        }}
                      />
                      <Label htmlFor={`guide-slot-${slot.id}`}>{slot.label}</Label>
                    </div>
                  ))}
                </div>
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
                      onChange={(e) =>
                        setBankDetails((prev) => ({
                          ...prev,
                          confirmAccountNumber: e.target.value,
                        }))
                      }
                    />
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
                          className="min-h-10 h-auto w-full rounded-md border border-input bg-background px-3 py-2 text-left"
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
                                }
                              }}
                            >
                              <span>{h.name}</span>
                            </button>
                          );
                        })}
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {preferredFor.activity && (
                  <div className="mt-4 w-full max-w-[440px]">
                    <Label className="mb-2 block">Activity *</Label>
                    <Popover open={activityDropdownOpen} onOpenChange={setActivityDropdownOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="min-h-10 h-auto w-full rounded-md border border-input bg-background px-3 py-2 text-left"
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
                                }
                              }}
                            >
                              <span>{a.name}</span>
                            </button>
                          );
                        })}
                      </PopoverContent>
                    </Popover>
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

          {/* STEP 2: Pricebook */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Guide Cost Details</h3>
                <div className="flex items-center gap-3">
                  <Input
                    type="date"
                    placeholder="Start Date"
                    value={pricebook.startDate}
                    onChange={(e) =>
                      setPricebook((prev) => ({ ...prev, startDate: e.target.value }))
                    }
                    className="w-36"
                  />
                  <Input
                    type="date"
                    placeholder="End date"
                    value={pricebook.endDate}
                    onChange={(e) =>
                      setPricebook((prev) => ({ ...prev, endDate: e.target.value }))
                    }
                    className="w-36"
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

              {/* Price Grid */}
              <div className="space-y-6">
                {/* 1-5 Pax */}
                <div className="grid grid-cols-4 gap-4 items-end">
                  <div>
                    <p className="text-sm text-gray-500">Pax Count</p>
                    <p className="font-semibold">1-5 Pax</p>
                  </div>
                  <div>
                    <p className="text-sm text-pink-500">Slot 1: 9 AM to 1 PM</p>
                    <Input
                      placeholder="Enter Price"
                      type="number"
                      value={pricebook.pax1to5.slot1 || ""}
                      onChange={(e) =>
                        setPricebook((prev) => ({
                          ...prev,
                          pax1to5: { ...prev.pax1to5, slot1: Number(e.target.value) },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <p className="text-sm text-pink-500">Slot 2: 9 AM to 4 PM</p>
                    <Input
                      placeholder="Enter Price"
                      type="number"
                      value={pricebook.pax1to5.slot2 || ""}
                      onChange={(e) =>
                        setPricebook((prev) => ({
                          ...prev,
                          pax1to5: { ...prev.pax1to5, slot2: Number(e.target.value) },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <p className="text-sm text-pink-500">Slot 3: 6 PM to 9 PM</p>
                    <Input
                      placeholder="Enter Price"
                      type="number"
                      value={pricebook.pax1to5.slot3 || ""}
                      onChange={(e) =>
                        setPricebook((prev) => ({
                          ...prev,
                          pax1to5: { ...prev.pax1to5, slot3: Number(e.target.value) },
                        }))
                      }
                    />
                  </div>
                </div>

                {/* 6-14 Pax */}
                <div className="grid grid-cols-4 gap-4 items-end">
                  <div>
                    <p className="text-sm text-gray-500">Pax Count</p>
                    <p className="font-semibold">6-14 Pax</p>
                  </div>
                  <div>
                    <p className="text-sm text-pink-500">Slot 1: 9 AM to 1 PM</p>
                    <Input
                      placeholder="Enter Price"
                      type="number"
                      value={pricebook.pax6to14.slot1 || ""}
                      onChange={(e) =>
                        setPricebook((prev) => ({
                          ...prev,
                          pax6to14: { ...prev.pax6to14, slot1: Number(e.target.value) },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <p className="text-sm text-pink-500">Slot 2: 9 AM to 4 PM</p>
                    <Input
                      placeholder="Enter Price"
                      type="number"
                      value={pricebook.pax6to14.slot2 || ""}
                      onChange={(e) =>
                        setPricebook((prev) => ({
                          ...prev,
                          pax6to14: { ...prev.pax6to14, slot2: Number(e.target.value) },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <p className="text-sm text-pink-500">Slot 3: 6 PM to 9 PM</p>
                    <Input
                      placeholder="Enter Price"
                      type="number"
                      value={pricebook.pax6to14.slot3 || ""}
                      onChange={(e) =>
                        setPricebook((prev) => ({
                          ...prev,
                          pax6to14: { ...prev.pax6to14, slot3: Number(e.target.value) },
                        }))
                      }
                    />
                  </div>
                </div>

                {/* 15-40 Pax */}
                <div className="grid grid-cols-4 gap-4 items-end">
                  <div>
                    <p className="text-sm text-gray-500">Pax Count</p>
                    <p className="font-semibold">15-40 Pax</p>
                  </div>
                  <div>
                    <p className="text-sm text-pink-500">Slot 1: 9 AM to 1 PM</p>
                    <Input
                      placeholder="Enter Price"
                      type="number"
                      value={pricebook.pax15to40.slot1 || ""}
                      onChange={(e) =>
                        setPricebook((prev) => ({
                          ...prev,
                          pax15to40: { ...prev.pax15to40, slot1: Number(e.target.value) },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <p className="text-sm text-pink-500">Slot 2: 9 AM to 4 PM</p>
                    <Input
                      placeholder="Enter Price"
                      type="number"
                      value={pricebook.pax15to40.slot2 || ""}
                      onChange={(e) =>
                        setPricebook((prev) => ({
                          ...prev,
                          pax15to40: { ...prev.pax15to40, slot2: Number(e.target.value) },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <p className="text-sm text-pink-500">Slot 3: 6 PM to 9 PM</p>
                    <Input
                      placeholder="Enter Price"
                      type="number"
                      value={pricebook.pax15to40.slot3 || ""}
                      onChange={(e) =>
                        setPricebook((prev) => ({
                          ...prev,
                          pax15to40: { ...prev.pax15to40, slot3: Number(e.target.value) },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Pricebook Summary Table - shown after save */}
              {pricebookSaved && (
                <div className="mt-4 rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-purple-700 via-pink-600 to-fuchsia-500 text-white">
                        <th className="p-2 text-left font-semibold">Pax Count</th>
                        <th className="p-2 text-center font-semibold">Slot 1: 9 AM – 1 PM</th>
                        <th className="p-2 text-center font-semibold">Slot 2: 9 AM – 4 PM</th>
                        <th className="p-2 text-center font-semibold">Slot 3: 6 PM – 9 PM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {([
                        { label: "1–5 Pax", key: "pax1to5" },
                        { label: "6–14 Pax", key: "pax6to14" },
                        { label: "15–40 Pax", key: "pax15to40" },
                      ] as { label: string; key: keyof Pick<GuidePricebook, "pax1to5" | "pax6to14" | "pax15to40"> }[]).map((row) => (
                        <tr key={row.key} className="border-t bg-gray-50">
                          <td className="p-2 font-medium text-purple-700">{row.label}</td>
                          <td className="p-2 text-center">₹{pricebook[row.key].slot1 || 0}</td>
                          <td className="p-2 text-center">₹{pricebook[row.key].slot2 || 0}</td>
                          <td className="p-2 text-center">₹{pricebook[row.key].slot3 || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-gray-500 px-3 py-1">
                    Period: {pricebook.startDate} to {pricebook.endDate}
                  </p>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="secondary" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button
                    onClick={handleUpdatePricebook}
                    disabled={loading}
                    className="bg-gradient-to-r from-primary to-pink-500"
                  >
                    {loading ? "Saving..." : "Update"}
                  </Button>
                  {pricebookSaved && (
                    <Button
                      onClick={() => setCurrentStep(3)}
                      className="bg-gradient-to-r from-primary to-pink-500"
                    >
                      Continue →
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Feedback & Review */}
          {currentStep === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Add Review */}
              <div className="bg-white border rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold text-pink-500">Rating</h3>
                <Select value={String(newRating)} onValueChange={(v) => setNewRating(Number(v))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Rating" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((r) => (
                      <SelectItem key={r} value={String(r)}>
                        {r} Star{r > 1 ? "s" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <p className="text-sm text-gray-500">All reviews are from genuine customers</p>

                <div>
                  <Label>Feedback *</Label>
                  <textarea
                    className="w-full border rounded-lg p-3 min-h-[120px]"
                    value={newFeedback}
                    onChange={(e) => setNewFeedback(e.target.value)}
                    placeholder="Enter feedback..."
                  />
                </div>

                <Button
                  onClick={handleAddReview}
                  className="bg-gradient-to-r from-primary to-pink-500"
                >
                  {editingReviewId ? "Update" : "Save"}
                </Button>
                {editingReviewId && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditingReviewId(null);
                      setNewRating(0);
                      setNewFeedback("");
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>

              {/* Right: Reviews List */}
              <div className="bg-white border rounded-lg p-6 space-y-4">
                <h3 className="text-lg font-semibold">List of Reviews</h3>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>S.NO</TableHead>
                      <TableHead>RATING</TableHead>
                      <TableHead>DESCRIPTION</TableHead>
                      <TableHead>CREATED ON</TableHead>
                      <TableHead>ACTION</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviews.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          No reviews yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      reviews.map((review, idx) => (
                        <TableRow key={review.id}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell>
                            <div className="flex">{renderStars(review.rating)}</div>
                          </TableCell>
                          <TableCell>{review.description}</TableCell>
                          <TableCell>{review.createdOn}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => handleEditReview(review)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteReview(review.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Buttons */}
              <div className="col-span-full flex justify-between pt-4">
                <Button variant="secondary" onClick={() => setCurrentStep(2)}>
                  Back
                </Button>
                <Button
                  onClick={() => setCurrentStep(4)}
                  className="bg-gradient-to-r from-primary to-pink-500"
                >
                  Skip and Continue
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: Preview */}
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
}