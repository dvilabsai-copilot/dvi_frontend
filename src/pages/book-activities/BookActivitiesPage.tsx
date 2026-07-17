/* eslint-disable no-unsafe-finally */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  Compass,
  Gamepad2,
  Heart,
  Landmark,
  MapPin,
  Martini,
  PawPrint,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TicketCheck,
  User,
  Users,
  Waves,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  BookActivitiesAPI,
  type StorefrontActivity,
  type StorefrontAgent,
  type StorefrontBooking,
  type StorefrontWishlistItem,
} from "@/services/bookActivities";
import {
  AutoSuggestSelect,
  type AutoSuggestOption,
} from "@/components/AutoSuggestSelect";
import { locationsApi } from "@/services/locations";
import "./BookActivitiesPage.css";
import { BookActivitiesPageView } from "./BookActivitiesPageView";
type Category = {
  name: string;
  icon: LucideIcon;
  color: string;
};
type Activity = StorefrontActivity;
const fallbackCategories: Category[] = [
  { name: "Adventure", icon: Compass, color: "#178bd6" },
  { name: "Water Activities", icon: Waves, color: "#0e91c3" },
  { name: "Sightseeing", icon: Camera, color: "#1c9d75" },
  { name: "Wildlife", icon: PawPrint, color: "#26a269" },
  { name: "Cultural", icon: Landmark, color: "#d7821f" },
  { name: "Food & Drink", icon: Martini, color: "#cf6f1e" },
  { name: "Wellness", icon: Sparkles, color: "#c42aa5" },
  { name: "Fun & Leisure", icon: Gamepad2, color: "#5969d8" },
];
const categoryIconMap = new Map(
  fallbackCategories.map((category) => [category.name.toLowerCase(), category]),
);
const fallbackPopularActivities: Activity[] = [
  {
    id: 0,
    activityId: 0,
    title: "Paragliding",
    category: "Adventure",
    location: "Bir Billing, Himachal Pradesh",
    duration: "15-20 mins",
    rating: "4.8 (120)",
    price: 3499,
    priceLabel: "Rs. 3,499",
    image:
      "https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 0,
    activityId: 0,
    title: "Scuba Diving",
    category: "Water Activities",
    location: "Andaman Islands",
    duration: "30-40 mins",
    rating: "4.7 (98)",
    price: 4999,
    priceLabel: "Rs. 4,999",
    image:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 0,
    activityId: 0,
    title: "Taj Mahal Tour",
    category: "Sightseeing",
    location: "Agra, Uttar Pradesh",
    duration: "3-4 hrs",
    rating: "4.6 (76)",
    price: 1299,
    priceLabel: "Rs. 1,299",
    image:
      "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 0,
    activityId: 0,
    title: "Jeep Safari",
    category: "Wildlife",
    location: "Ranthambore, Rajasthan",
    duration: "3-4 hrs",
    rating: "4.9 (88)",
    price: 2499,
    priceLabel: "Rs. 2,499",
    image:
      "https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 0,
    activityId: 0,
    title: "Kayaking",
    category: "Fun & Leisure",
    location: "Nainital, Uttarakhand",
    duration: "1-2 hrs",
    rating: "4.5 (64)",
    price: 1199,
    priceLabel: "Rs. 1,199",
    image:
      "https://images.unsplash.com/photo-1521336575822-6da63fb45455?auto=format&fit=crop&w=900&q=80",
  },
];
const benefits = [
  {
    title: "Best Price Guarantee",
    text: "Get the best price or we match it",
    icon: TicketCheck,
  },
  {
    title: "Instant Confirmation",
    text: "Book in seconds, get instant voucher",
    icon: ShieldCheck,
  },
  {
    title: "Trusted Partners",
    text: "Verified and top-rated experience providers",
    icon: Users,
  },
  {
    title: "24/7 Support",
    text: "We are here anytime for you",
    icon: CheckCircle2,
  },
];
const steps = [
  { title: "1. Search", text: "Find activities at your favorite destination", icon: Search },
  { title: "2. Choose", text: "Select your activity, date and time", icon: CalendarDays },
  { title: "3. Book", text: "Secure your spot with easy payment", icon: WalletCards },
  { title: "4. Enjoy", text: "Show your voucher and enjoy the experience", icon: TicketCheck },
];
function toCategory(name: string): Category {
  const match = categoryIconMap.get(name.toLowerCase());
  if (match) return { ...match, name };
  return { name, icon: Compass, color: "#178bd6" };
}
function parsePriceLabel(priceLabel?: string) {
  if (!priceLabel) return 0;
  const normalized = priceLabel.replace(/[^0-9.]/g, "");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}
function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount || 0);
}
function formatDisplayDate(dateText?: string | null) {
  if (!dateText) return "";
  const value = new Date(dateText);
  if (Number.isNaN(value.getTime())) return dateText;
  return value.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const apiPrefix = "failed:";
    const idx = error.message.toLowerCase().indexOf(apiPrefix);
    return idx >= 0 ? error.message.slice(idx + apiPrefix.length).trim() : error.message;
  }
  return "Something went wrong";
}
function toRouteLocationOption(name: string): AutoSuggestOption {
  const label = String(name || "").trim();
  return {
    label,
    value: label,
  };
}
export default function BookActivitiesPage() {
  const [searchText, setSearchText] = useState("");
  const [sourceValue, setSourceValue] = useState("");
  const [sourceOptions, setSourceOptions] = useState<AutoSuggestOption[]>([]);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [destinationValue, setDestinationValue] = useState("");
  const [destinationOptions, setDestinationOptions] = useState<AutoSuggestOption[]>([]);
  const [destinationLoading, setDestinationLoading] = useState(false);
  const [activityType, setActivityType] = useState("All Activities");
  const [activityDate, setActivityDate] = useState("");
  const [guests, setGuests] = useState(1);
  const [categories, setCategories] = useState<Category[]>(fallbackCategories);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoadedActivities, setHasLoadedActivities] = useState(false);
  const [showFallbackActivities, setShowFallbackActivities] = useState(false);
  const [bookingActivityId, setBookingActivityId] = useState<number | null>(null);
  const [hasShownLoadError, setHasShownLoadError] = useState(false);
  const [agents, setAgents] = useState<StorefrontAgent[]>([]);
  const [wishlistItems, setWishlistItems] = useState<StorefrontWishlistItem[]>([]);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistSavingId, setWishlistSavingId] = useState<number | null>(null);
  const [myBookings, setMyBookings] = useState<StorefrontBooking[]>([]);
  const [myBookingsOpen, setMyBookingsOpen] = useState(false);
  const [myBookingsLoading, setMyBookingsLoading] = useState(false);
  const [bookingSearchText, setBookingSearchText] = useState("");
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [agentQuery, setAgentQuery] = useState("");
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    agentId: "",
    salutation: "Mr",
    name: "",
    age: "",
    contactNo: "",
    alternativeContactNo: "",
    emailId: "",
    nationality: "IN",
    panNo: "",
    passportNo: "",
    travelDate: "",
    guests: "1",
    remarks: "",
  });
  const sourceRequestRef = useRef(0);
  const destinationRequestRef = useRef(0);
  const agentComboboxRef = useRef<HTMLDivElement | null>(null);
  const visibleActivities = useMemo(
    () => (showFallbackActivities ? fallbackPopularActivities : activities),
    [activities, showFallbackActivities],
  );
  const hasActiveActivityFilters = useMemo(
    () =>
      Boolean(
        searchText.trim() ||
          sourceValue.trim() ||
          destinationValue.trim() ||
          activityDate ||
          guests > 1 ||
          (activityType && activityType !== "All Activities"),
      ),
    [activityDate, activityType, destinationValue, guests, searchText, sourceValue],
  );
  const wishlistActivityIds = useMemo(
    () => new Set(wishlistItems.map((item) => Number(item.activityId))),
    [wishlistItems],
  );
  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === Number(bookingForm.agentId)) ?? null,
    [agents, bookingForm.agentId],
  );
  const sortedAgents = useMemo(() => {
    return [...agents].sort((a, b) => {
      const walletDiff = Number(b.walletBalance || 0) - Number(a.walletBalance || 0);
      if (walletDiff !== 0) return walletDiff;
      return a.name.localeCompare(b.name);
    });
  }, [agents]);
  const filteredAgents = useMemo(() => {
    const q = agentQuery.trim().toLowerCase();
    if (!q) return sortedAgents;
    return sortedAgents.filter((agent) =>
      [
        agent.name,
        agent.email || "",
        agent.phone || "",
        agent.walletBalanceLabel || "",
      ].some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [agentQuery, sortedAgents]);
  const bookingGuests = useMemo(() => Math.max(Number(bookingForm.guests) || 1, 1), [bookingForm.guests]);
  const bookingPricingUnitType =
    selectedActivity?.pricingUnitType === "UNIT" ? "UNIT" : "PER_ADULT";
  const bookingUnitPrice = useMemo(() => {
    if (!selectedActivity) return 0;
    return selectedActivity.price ?? parsePriceLabel(selectedActivity.priceLabel);
  }, [selectedActivity]);
  const bookingTotalAmount = useMemo(
    () =>
      bookingPricingUnitType === "UNIT"
        ? bookingUnitPrice
        : bookingUnitPrice * bookingGuests,
    [bookingGuests, bookingPricingUnitType, bookingUnitPrice],
  );
  const walletAfterBooking = useMemo(
    () => (selectedAgent ? selectedAgent.walletBalance - bookingTotalAmount : 0),
    [bookingTotalAmount, selectedAgent],
  );
  const walletSufficient = !selectedAgent || walletAfterBooking >= 0;
  const loadCategories = useCallback(async () => {
    try {
      const rows = await BookActivitiesAPI.categories();
      if (!rows.length) return;
      setCategories(rows.map((row) => toCategory(row.name)));
    } catch (error) {
      console.error("Failed to load activity categories", error);
    }
  }, []);
  const loadActivities = useCallback(async (
    overrides?: Partial<{
      searchText: string;
      source: string;
      destination: string;
      activityType: string;
      activityDate: string;
      guests: number;
    }>,
  ) => {
    const next = {
      searchText,
      source: sourceValue,
      destination: destinationValue,
      activityType,
      activityDate,
      guests,
      ...(overrides || {}),
    };
    try {
      setLoading(true);
      const rows = await BookActivitiesAPI.list({
        q: next.searchText || undefined,
        source: next.source || undefined,
        destination: next.destination || undefined,
        activityType:
          next.activityType === "All Activities" ? undefined : next.activityType,
        date: next.activityDate || undefined,
        guests: next.guests,
        limit: 12,
      });
      setActivities(rows);
      setShowFallbackActivities(false);
      setHasShownLoadError(false);
    } catch (error) {
      console.error("Failed to load book activities", error);
      if (!hasShownLoadError) {
        toast.error("Failed to load live activities. Showing sample activities.");
        setHasShownLoadError(true);
      }
      setActivities([]);
      setShowFallbackActivities(true);
    } finally {
      setHasLoadedActivities(true);
      setLoading(false);
    }
  }, [activityDate, activityType, destinationValue, guests, hasShownLoadError, searchText, sourceValue]);
  const loadDestinationOptions = useCallback(async () => {
    const source = sourceValue.trim();
    const requestId = destinationRequestRef.current + 1;
    destinationRequestRef.current = requestId;
    if (!source) {
      setDestinationOptions([]);
      return;
    }
    try {
      setDestinationLoading(true);
      const response = await locationsApi.list({
        itineraryMode: true,
        type: "destination",
        source,
      });
      if (destinationRequestRef.current !== requestId) return;
      const options = response.rows
        .map((row) => toRouteLocationOption(row.destination_location))
        .filter((option) => option.value);
      setDestinationOptions(options);
    } catch (error) {
      if (destinationRequestRef.current !== requestId) return;
      console.error("Failed to load destination route locations", error);
      setDestinationOptions([]);
    } finally {
      if (destinationRequestRef.current !== requestId) return;
      setDestinationLoading(false);
    }
  }, [sourceValue]);
  const loadSourceOptions = useCallback(async () => {
    const requestId = sourceRequestRef.current + 1;
    sourceRequestRef.current = requestId;
    try {
      setSourceLoading(true);
      const response = await locationsApi.list({
        itineraryMode: true,
        type: "source",
      });
      if (sourceRequestRef.current !== requestId) return;
      const options = response.rows
        .map((row) => toRouteLocationOption(row.source_location))
        .filter((option) => option.value);
      setSourceOptions(options);
    } catch (error) {
      if (sourceRequestRef.current !== requestId) return;
      console.error("Failed to load source route locations", error);
      setSourceOptions([]);
    } finally {
      if (sourceRequestRef.current !== requestId) return;
      setSourceLoading(false);
    }
  }, []);
  function applyAgentSelection(agent: StorefrontAgent) {
    updateBookingForm("agentId", String(agent.id));
    setAgentQuery(agent.name);
    setAgentDropdownOpen(false);
  }
  const runActivitySearch = useCallback(async (
    overrides?: Partial<{
      searchText: string;
      source: string;
      destination: string;
      activityType: string;
      activityDate: string;
      guests: number;
    }>,
  ) => {
    await loadActivities({
      source: overrides?.source ?? sourceValue,
      destination: overrides?.destination ?? destinationValue,
      ...overrides,
    });
  }, [destinationValue, loadActivities, sourceValue]);
  const loadAgents = useCallback(async () => {
    try {
      const rows = await BookActivitiesAPI.agents();
      setAgents(rows);
    } catch (error) {
      console.error("Failed to load agents", error);
      toast.error("Failed to load agents for activity booking");
    }
  }, []);
  const loadWishlist = useCallback(async () => {
    try {
      setWishlistLoading(true);
      const rows = await BookActivitiesAPI.wishlist("admin");
      setWishlistItems(rows);
    } catch (error) {
      console.error("Failed to load wishlist", error);
      toast.error("Failed to load wishlist");
    } finally {
      setWishlistLoading(false);
    }
  }, []);
  const loadMyBookings = useCallback(async (q?: string) => {
    try {
      setMyBookingsLoading(true);
      const response = await BookActivitiesAPI.myBookings({
        q: q || undefined,
        limit: 50,
      });
      setMyBookings(response.items || []);
    } catch (error) {
      console.error("Failed to load activity bookings", error);
      toast.error("Failed to load activity bookings");
    } finally {
      setMyBookingsLoading(false);
    }
  }, []);
  async function toggleWishlist(activity: Activity) {
    if (!activity.activityId) {
      toast.info("Sample activity cannot be added to wishlist");
      return;
    }
    try {
      setWishlistSavingId(activity.activityId);
      const response = await BookActivitiesAPI.toggleWishlist({
        activityId: activity.activityId,
        userKey: "admin",
      });
      toast.success(response.message);
      if (response.wished) {
        setWishlistItems((prev) => {
          const exists = prev.some((item) => Number(item.activityId) === activity.activityId);
          if (exists) return prev;
          return [{ ...activity, wishlistId: 0, wishlistedAt: new Date().toISOString() }, ...prev];
        });
      } else {
        setWishlistItems((prev) =>
          prev.filter((item) => Number(item.activityId) !== activity.activityId),
        );
      }
    } catch (error) {
      console.error("Failed to update wishlist", error);
      toast.error(getErrorMessage(error) || "Failed to update wishlist");
    } finally {
      setWishlistSavingId(null);
    }
  }
  async function removeWishlistItem(activityId: number) {
    try {
      setWishlistSavingId(activityId);
      const response = await BookActivitiesAPI.removeWishlist(activityId, "admin");
      toast.success(response.message);
      setWishlistItems((prev) =>
        prev.filter((item) => Number(item.activityId) !== Number(activityId)),
      );
    } catch (error) {
      console.error("Failed to remove wishlist item", error);
      toast.error(getErrorMessage(error) || "Failed to remove wishlist item");
    } finally {
      setWishlistSavingId(null);
    }
  }
  function openWishlistPanel() {
    setWishlistOpen(true);
    void loadWishlist();
  }
  function openMyBookingsPanel() {
    setMyBookingsOpen(true);
    void loadMyBookings(bookingSearchText);
  }
  function updateBookingForm<K extends keyof typeof bookingForm>(
    key: K,
    value: (typeof bookingForm)[K],
  ) {
    setBookingForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }
  function handleBookNow(activity: Activity) {
    if (!activity.activityId) {
      toast.info("This sample card cannot create a live booking request.");
      return;
    }
    const nextGuests = String(Math.max(1, activity.maxGuests ? Math.min(guests, activity.maxGuests) : guests));
    setSelectedActivity(activity);
    setBookingForm((prev) => ({
      ...prev,
      travelDate: activityDate || prev.travelDate,
      guests: nextGuests,
      remarks: "",
    }));
    setAgentQuery(selectedAgent?.name || "");
    setAgentDropdownOpen(false);
    setBookingModalOpen(true);
  }
  function closeBookingModal() {
    if (bookingSubmitting) return;
    setBookingModalOpen(false);
    setAgentDropdownOpen(false);
    setSelectedActivity(null);
  }
  async function submitActivityBooking() {
    if (!selectedActivity) return;
    if (!bookingForm.agentId) {
      toast.error("Please select an agent");
      return;
    }
    if (!bookingForm.name.trim()) {
      toast.error("Please enter primary guest name");
      return;
    }
    if (!bookingForm.contactNo.trim()) {
      toast.error("Please enter primary contact number");
      return;
    }
    if (!bookingForm.travelDate) {
      toast.error("Please select activity date");
      return;
    }
    if (bookingTotalAmount <= 0) {
      toast.error("Activity price is missing. Please update activity pricebook first.");
      return;
    }
    if (!walletSufficient) {
      toast.error("Agent wallet balance is insufficient for this booking");
      return;
    }
    try {
      setBookingSubmitting(true);
      setBookingActivityId(selectedActivity.activityId);
      const response = await BookActivitiesAPI.createBooking({
        activityId: selectedActivity.activityId,
        agentId: Number(bookingForm.agentId),
        activityTitle: selectedActivity.title,
        destination: selectedActivity.location,
        activityDate: bookingForm.travelDate,
        guests: bookingGuests,
        totalAmount: bookingTotalAmount,
        salutation: bookingForm.salutation,
        customerName: bookingForm.name.trim(),
        customerPhone: bookingForm.contactNo.trim(),
        alternativePhone: bookingForm.alternativeContactNo.trim() || undefined,
        customerEmail: bookingForm.emailId.trim() || undefined,
        customerAge: bookingForm.age.trim() || undefined,
        nationality: bookingForm.nationality || "IN",
        panNo: bookingForm.panNo.trim() || undefined,
        passportNo: bookingForm.passportNo.trim() || undefined,
        remarks: bookingForm.remarks.trim() || undefined,
        notes: "Created from Book Activities page",
      });
      toast.success(
        `Activity booking confirmed${response.bookingRequestId ? ` #${response.bookingRequestId}` : ""}. Wallet balance: ${response.walletBalanceAfterLabel}`,
      );
      setAgents((prev) =>
        prev.map((agent) =>
          agent.id === Number(bookingForm.agentId)
            ? {
                ...agent,
                walletBalance: response.walletBalanceAfter,
                walletBalanceLabel: response.walletBalanceAfterLabel,
              }
            : agent,
        ),
      );
      setBookingForm((prev) => ({
        ...prev,
        remarks: "",
      }));
      void loadMyBookings(bookingSearchText);
      closeBookingModal();
    } catch (error) {
      console.error("Failed to confirm activity booking", error);
      toast.error(getErrorMessage(error) || "Failed to confirm activity booking");
    } finally {
      setBookingSubmitting(false);
      setBookingActivityId(null);
    }
  }
  useEffect(() => {
    void loadCategories();
    void loadActivities();
    void loadAgents();
    void loadWishlist();
    void loadMyBookings();
  }, [loadActivities, loadCategories, loadAgents, loadWishlist, loadMyBookings]);
  useEffect(() => {
    if (!bookingModalOpen || !bookingForm.agentId) return;
    let cancelled = false;
    const syncWallet = async () => {
      try {
        const wallet = await BookActivitiesAPI.agentWallet(Number(bookingForm.agentId));
        if (cancelled) return;
        setAgents((prev) =>
          prev.map((agent) =>
            agent.id === wallet.agentId
              ? {
                  ...agent,
                  walletBalance: wallet.balance,
                  walletBalanceLabel: wallet.formattedBalance,
                }
              : agent,
          ),
        );
      } catch (error) {
        if (cancelled) return;
        console.error("Failed to refresh agent wallet", error);
        toast.error("Failed to refresh agent wallet balance");
      }
    };
    void syncWallet();
    return () => {
      cancelled = true;
    };
  }, [bookingForm.agentId, bookingModalOpen]);
  useEffect(() => {
    if (!bookingModalOpen) return;
    setAgentQuery(selectedAgent?.name || "");
  }, [bookingModalOpen, selectedAgent]);
  useEffect(() => {
    void loadSourceOptions();
  }, [loadSourceOptions]);
  useEffect(() => {
    const source = sourceValue.trim();
    if (!source) {
      setDestinationOptions([]);
      setDestinationValue("");
      setDestinationLoading(false);
      return;
    }
    setDestinationValue("");
    void loadDestinationOptions();
  }, [loadDestinationOptions, sourceValue]);
  useEffect(() => {
    if (!agentDropdownOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (
        agentComboboxRef.current &&
        !agentComboboxRef.current.contains(event.target as Node)
      ) {
        setAgentDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [agentDropdownOpen]);
  const bookActivitiesViewContext = {
    activities,
    activityDate,
    activityType,
    agentComboboxRef,
    agentDropdownOpen,
    agentQuery,
    agents,
    applyAgentSelection,
    benefits,
    bookingActivityId,
    bookingForm,
    bookingGuests,
    bookingModalOpen,
    bookingPricingUnitType,
    bookingSearchText,
    bookingSubmitting,
    bookingTotalAmount,
    categories,
    closeBookingModal,
    destinationLoading,
    destinationOptions,
    destinationValue,
    filteredAgents,
    formatDisplayDate,
    formatMoney,
    guests,
    handleBookNow,
    toggleWishlist,
    removeWishlistItem,
    submitActivityBooking,
    hasActiveActivityFilters,
    hasLoadedActivities,
    loadActivities,
    loadMyBookings,
    loading,
    myBookings,
    myBookingsLoading,
    myBookingsOpen,
    openMyBookingsPanel,
    openWishlistPanel,
    runActivitySearch,
    searchText,
    selectedActivity,
    selectedAgent,
    setActivityDate,
    setActivityType,
    setAgentDropdownOpen,
    setAgentQuery,
    setBookingSearchText,
    setDestinationValue,
    setGuests,
    setMyBookingsOpen,
    setSearchText,
    setSourceValue,
    setWishlistOpen,
    sourceLoading,
    sourceOptions,
    sourceValue,
    steps,
    updateBookingForm,
    visibleActivities,
    walletAfterBooking,
    walletSufficient,
    wishlistActivityIds,
    wishlistItems,
    wishlistLoading,
    wishlistOpen,
    wishlistSavingId
  };
  return <BookActivitiesPageView context={bookActivitiesViewContext} />;
}
