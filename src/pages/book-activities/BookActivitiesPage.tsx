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

  const bookingUnitPrice = useMemo(() => {
    if (!selectedActivity) return 0;
    return selectedActivity.price ?? parsePriceLabel(selectedActivity.priceLabel);
  }, [selectedActivity]);

  const bookingTotalAmount = useMemo(
    () => bookingUnitPrice * bookingGuests,
    [bookingGuests, bookingUnitPrice],
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

  return (
    <main className="book-activities-page">
      <div className="book-activities-shell">
        <div className="ba-storefront-card">
          <header className="ba-header">
            <div className="ba-brand" aria-label="DVI Holidays">
              <img
                src="/assets/img/DVi-Logo1-2048x1860.png"
                alt="DVI Holidays"
                className="ba-brand-mark"
              />
              <div className="ba-brand-text">
                DVi
                <span>holidays</span>
              </div>
            </div>

            <div className="ba-top-search">
              <Search size={20} />
              <input
                type="search"
                placeholder="Search activities or destinations"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
            </div>

            <div className="ba-header-actions">
              <button
                type="button"
                className="ba-header-action"
                onClick={openWishlistPanel}
              >
                <span className="ba-header-action-icon">
                  <Heart size={22} />
                  {wishlistItems.length > 0 && (
                    <span className="ba-header-count">{wishlistItems.length}</span>
                  )}
                </span>
                Wishlist
              </button>
              <button
                type="button"
                className="ba-header-action"
                onClick={openMyBookingsPanel}
              >
                <span className="ba-header-action-icon">
                  <TicketCheck size={22} />
                  {myBookings.length > 0 && (
                    <span className="ba-header-count">{myBookings.length}</span>
                  )}
                </span>
                My Bookings
              </button>
            </div>
          </header>

          <section className="ba-hero">
            <div className="ba-hero-copy">
              <h1>
                Discover. Book.
                <span>Experience More!</span>
              </h1>
              <p className="ba-hero-subtitle">
                Handpicked activities and unforgettable experiences for every kind of traveler.
              </p>

              <div className="ba-trust-row">
                <div className="ba-trust-item">
                  <div className="ba-trust-icon"><Heart size={21} /></div>
                  <div>
                    <p className="ba-trust-title">Curated Activities</p>
                    <p className="ba-trust-text">Best experiences handpicked for you</p>
                  </div>
                </div>
                <div className="ba-trust-item">
                  <div className="ba-trust-icon"><CalendarDays size={21} /></div>
                  <div>
                    <p className="ba-trust-title">Instant Booking</p>
                    <p className="ba-trust-text">Confirm in seconds and enjoy</p>
                  </div>
                </div>
                <div className="ba-trust-item">
                  <div className="ba-trust-icon"><ShieldCheck size={21} /></div>
                  <div>
                    <p className="ba-trust-title">Trusted and Safe</p>
                    <p className="ba-trust-text">Verified partners and secure payments</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="ba-hero-visual" aria-hidden="true">
              <img
                src="https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=1600&q=85"
                alt="Paragliding over mountain valley"
              />
            </div>
          </section>

            <section className="ba-search-panel" aria-label="Search activities">
              <div className="ba-field">
                <label>Source Location</label>
                <div className="ba-input-wrap ba-location-picker">
                  <MapPin size={19} />
                  <AutoSuggestSelect
                    mode="single"
                    value={sourceValue}
                    onChange={(value) => {
                      const nextSource = String(value || "").trim();
                      setSourceValue(nextSource);
                    }}
                    options={sourceOptions}
                    placeholder={sourceLoading ? "Loading source locations..." : "Search source location"}
                  />
                </div>
              </div>
              <div className="ba-field">
                <label>Destination Location</label>
                <div className="ba-input-wrap ba-location-picker">
                  <MapPin size={19} />
                  <AutoSuggestSelect
                    mode="single"
                    value={destinationValue}
                    onChange={(value) => {
                      if (!sourceValue.trim()) {
                        toast.error("Please select a source location first");
                        return;
                      }

                      setDestinationValue(String(value || "").trim());
                    }}
                    options={destinationOptions}
                    placeholder={
                      !sourceValue.trim()
                        ? "Select source location first"
                        : destinationLoading
                        ? "Loading destination locations..."
                        : "Search destination location"
                    }
                    disabled={!sourceValue.trim()}
                  />
                </div>
              </div>
            <div className="ba-field">
              <label>Activity Type</label>
              <div className="ba-input-wrap">
                <Compass size={19} />
                <select
                  value={activityType}
                  onChange={(event) => setActivityType(event.target.value)}
                >
                  <option value="All Activities">All Activities</option>
                  {categories.map((category) => (
                    <option key={category.name} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="ba-field">
              <label>Date</label>
              <div className="ba-input-wrap">
                <CalendarDays size={19} />
                <input
                  type="date"
                  value={activityDate}
                  onChange={(event) => setActivityDate(event.target.value)}
                />
              </div>
            </div>
            <div className="ba-field">
              <label>Guests</label>
              <div className="ba-input-wrap">
                <User size={19} />
                <select
                  value={String(guests)}
                  onChange={(event) => setGuests(Number(event.target.value))}
                >
                  <option value="1">1 Guest</option>
                  <option value="2">2 Guests</option>
                  <option value="3">3 Guests</option>
                  <option value="4">4 Guests</option>
                </select>
              </div>
            </div>
            <button
              type="button"
              className="ba-search-button"
              onClick={() => void runActivitySearch()}
              disabled={loading}
            >
              {loading ? "Searching..." : "Search Activities"}
            </button>
          </section>

          <section className="ba-section">
            <div className="ba-section-header">
              <h2 className="ba-section-title">Browse by Category</h2>
              <button
                type="button"
                className="ba-view-all"
                onClick={() => {
                  setActivityType("All Activities");
                  void runActivitySearch({ activityType: "All Activities" });
                }}
              >
                View All
              </button>
            </div>
            <div className="ba-category-grid">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    type="button"
                    className="ba-category-card"
                    key={category.name}
                    onClick={() => {
                      setActivityType(category.name);
                      void runActivitySearch({ activityType: category.name });
                    }}
                  >
                    <span className="ba-category-icon">
                      <Icon size={25} color={category.color} />
                    </span>
                    <span className="ba-category-name">{category.name}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="ba-section">
            <div className="ba-section-header">
              <h2 className="ba-section-title">Popular Activities</h2>
              <button
                type="button"
                className="ba-view-all"
                onClick={() => void loadActivities()}
              >
                View All
              </button>
            </div>

            {hasLoadedActivities && !loading && visibleActivities.length === 0 ? (
              <div className="ba-empty-state">
                <Search size={34} />
                <h3>
                  {activityDate
                    ? "No activities are available for the selected date."
                    : hasActiveActivityFilters
                      ? "No matching activities found"
                      : "No live activities available"}
                </h3>
                <p>
                  {activityDate
                    ? "Try another date, destination, or activity category."
                    : hasActiveActivityFilters
                      ? "Try another destination, search term, or activity category."
                    : "Activity cards will appear here once live activities are available."}
                </p>
              </div>
            ) : (
              <div className="ba-activity-grid">
                {visibleActivities.map((activity) => (
                  <article
                    className="ba-activity-card"
                    key={`${activity.activityId || activity.title}-${activity.location}`}
                  >
                    <div className="ba-card-image-wrap">
                      <img src={activity.image} alt={activity.title} />
                      <button
                        type="button"
                        className={`ba-wishlist ${
                          wishlistActivityIds.has(Number(activity.activityId)) ? "is-active" : ""
                        }`}
                        aria-label={
                          wishlistActivityIds.has(Number(activity.activityId))
                            ? `Remove ${activity.title} from wishlist`
                            : `Add ${activity.title} to wishlist`
                        }
                        onClick={() => void toggleWishlist(activity)}
                        disabled={wishlistSavingId === Number(activity.activityId)}
                      >
                        <Heart
                          size={20}
                          fill={
                            wishlistActivityIds.has(Number(activity.activityId))
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>
                    </div>
                    <div className="ba-card-body">
                      <span className="ba-badge">{activity.category}</span>
                      <h3 className="ba-activity-title">{activity.title}</h3>
                      <p className="ba-location">{activity.location}</p>
                      {activity.availableDate && activity.availableOnSelectedDate && (
                        <div className="ba-meta-line">
                          <CalendarDays size={15} /> Available on {formatDisplayDate(activity.availableDate)}
                        </div>
                      )}
                      <div className="ba-meta-line"><Clock3 size={15} /> {activity.duration}</div>
                      <div className="ba-meta-line ba-rating"><Star size={15} className="ba-star" /> {activity.rating}</div>
                      <div className="ba-card-footer">
                        <div>
                          <p className="ba-price">{activity.priceLabel}</p>
                          <span className="ba-price-caption">per person</span>
                        </div>
                        <button
                          type="button"
                          className="ba-book-button"
                          onClick={() => handleBookNow(activity)}
                          disabled={bookingActivityId === activity.activityId}
                        >
                          {bookingActivityId === activity.activityId ? "Booking..." : "Book Now"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="ba-section">
            <h2 className="ba-section-title">Why Book Activities with DVI Holidays?</h2>
            <div className="ba-benefits ba-section-grid-spaced">
              {benefits.map((benefit) => {
                const Icon = benefit.icon;
                return (
                  <div className="ba-benefit-card" key={benefit.title}>
                    <div className="ba-benefit-icon"><Icon size={27} color="#168b72" /></div>
                    <div>
                      <h3>{benefit.title}</h3>
                      <p>{benefit.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="ba-section">
            <h2 className="ba-section-title">How It Works</h2>
            <div className="ba-steps ba-section-grid-spaced">
              {steps.map((step) => {
                const Icon = step.icon;
                return (
                  <div className="ba-step-card" key={step.title}>
                    <div className="ba-step-icon"><Icon size={31} color="#1d7fd0" /></div>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="ba-cta">
            <div>
              <h2>Make Every Moment Memorable</h2>
              <p>From thrill to culture, find activities that make your trip unforgettable.</p>
            </div>
            <button type="button" className="ba-cta-button">
              Explore Now <ArrowRight size={18} />
            </button>
          </section>

          <nav className="ba-mobile-nav" aria-label="Activities mobile navigation">
            <button type="button"><Compass size={21} />Home</button>
            <button type="button"><Camera size={21} />Categories</button>
            <button type="button"><TicketCheck size={21} />My Bookings</button>
            <button type="button"><Heart size={21} />Wishlist</button>
            <button type="button"><User size={21} />Profile</button>
          </nav>
        </div>
      </div>

      {wishlistOpen && (
        <div className="ba-modal-backdrop" role="presentation">
          <div className="ba-side-panel" role="dialog" aria-modal="true">
            <div className="ba-modal-header">
              <div>
                <h2>Wishlist</h2>
                <p>Shortlisted activities ready for booking</p>
              </div>
              <button
                type="button"
                className="ba-modal-close"
                onClick={() => setWishlistOpen(false)}
              >
                x
              </button>
            </div>

            <div className="ba-modal-body">
              {wishlistLoading ? (
                <div className="ba-empty-state">Loading wishlist...</div>
              ) : wishlistItems.length === 0 ? (
                <div className="ba-empty-state">
                  <Heart size={34} />
                  <h3>No wishlist items yet</h3>
                  <p>Click the heart icon on any activity to save it here.</p>
                </div>
              ) : (
                <div className="ba-mini-card-list">
                  {wishlistItems.map((item) => (
                    <div className="ba-mini-card" key={`wishlist-${item.activityId}`}>
                      <img src={item.image} alt={item.title} />
                      <div className="ba-mini-card-body">
                        <div className="ba-mini-card-top">
                          <span className="ba-badge">{item.category}</span>
                          <strong>{item.priceLabel}</strong>
                        </div>
                        <h3>{item.title}</h3>
                        <p><MapPin size={14} /> {item.location}</p>
                        <p><Clock3 size={14} /> {item.duration}</p>

                        <div className="ba-mini-card-actions">
                          <button
                            type="button"
                            className="ba-secondary-button"
                            onClick={() => void removeWishlistItem(item.activityId)}
                            disabled={wishlistSavingId === item.activityId}
                          >
                            Remove
                          </button>
                          <button
                            type="button"
                            className="ba-confirm-button"
                            onClick={() => {
                              setWishlistOpen(false);
                              handleBookNow(item);
                            }}
                          >
                            Book Now
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {myBookingsOpen && (
        <div className="ba-modal-backdrop" role="presentation">
          <div className="ba-side-panel ba-bookings-panel" role="dialog" aria-modal="true">
            <div className="ba-modal-header">
              <div>
                <h2>My Activity Bookings</h2>
                <p>Confirmed activity bookings with wallet deduction history</p>
              </div>
              <button
                type="button"
                className="ba-modal-close"
                onClick={() => setMyBookingsOpen(false)}
              >
                x
              </button>
            </div>

            <div className="ba-modal-body">
              <div className="ba-panel-toolbar">
                <div className="ba-panel-search">
                  <Search size={17} />
                  <input
                    value={bookingSearchText}
                    onChange={(event) => setBookingSearchText(event.target.value)}
                    placeholder="Search booking, passenger, phone, activity"
                  />
                </div>
                <button
                  type="button"
                  className="ba-confirm-button"
                  onClick={() => void loadMyBookings(bookingSearchText)}
                >
                  Search
                </button>
              </div>

              {myBookingsLoading ? (
                <div className="ba-empty-state">Loading bookings...</div>
              ) : myBookings.length === 0 ? (
                <div className="ba-empty-state">
                  <TicketCheck size={34} />
                  <h3>No activity bookings yet</h3>
                  <p>Bookings confirmed from this page will appear here.</p>
                </div>
              ) : (
                <div className="ba-booking-list">
                  {myBookings.map((booking) => (
                    <div className="ba-booking-row" key={booking.bookingRequestId}>
                      <div className="ba-booking-row-head">
                        <div>
                          <strong>#{booking.bookingRequestId}</strong>
                          <span>{booking.status}</span>
                        </div>
                        <strong className="ba-amount">{booking.totalAmountLabel}</strong>
                      </div>

                      <h3>{booking.activityTitle}</h3>

                      <div className="ba-booking-meta-grid">
                        <p><CalendarDays size={14} /> {booking.activityDate || "Date not set"}</p>
                        <p><Users size={14} /> {booking.guests} Guest{booking.guests > 1 ? "s" : ""}</p>
                        <p><User size={14} /> {booking.customerName}</p>
                        <p><MapPin size={14} /> {booking.destination || "Destination not set"}</p>
                      </div>

                      <div className="ba-booking-wallet-line">
                        <span>Agent: {booking.agentName}</span>
                        <span>Wallet after booking: {booking.walletBalanceAfterLabel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {bookingModalOpen && selectedActivity && (
        <div className="ba-modal-backdrop" role="presentation">
          <div className="ba-booking-modal" role="dialog" aria-modal="true" aria-labelledby="ba-booking-modal-title">
            <div className="ba-modal-header">
              <div>
                <h2 id="ba-booking-modal-title">Confirm Activity Booking</h2>
                <p>Select agent, verify wallet, and enter passenger details</p>
              </div>
              <button
                type="button"
                className="ba-modal-close"
                onClick={closeBookingModal}
                aria-label="Close booking modal"
              >
                x
              </button>
            </div>

            <div className="ba-modal-body">
              <div className="ba-booking-summary">
                <div>
                  <span>Activity</span>
                  <strong>{selectedActivity.title}</strong>
                </div>
                <div>
                  <span>Destination</span>
                  <strong>{selectedActivity.location}</strong>
                </div>
                <div>
                  <span>Unit Price</span>
                  <strong>{selectedActivity.priceLabel}</strong>
                </div>
                <div>
                  <span>Guests</span>
                  <strong>{bookingGuests}</strong>
                </div>
                <div>
                  <span>Total Amount</span>
                  <strong className="ba-amount">{formatMoney(bookingTotalAmount)}</strong>
                </div>
              </div>

              <div className="ba-modal-section">
                <h3>Agent Wallet</h3>
                <div className="ba-form-grid ba-form-grid-2">
                  <label className="ba-form-control">
                    <span>Agent *</span>
                    <div
                      ref={agentComboboxRef}
                      className="ba-agent-combobox"
                    >
                      <input
                        type="text"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={agentDropdownOpen}
                        aria-controls="ba-agent-dropdown"
                        aria-label="Agent"
                        value={agentQuery}
                        onChange={(event) => {
                          setAgentQuery(event.target.value);
                          setAgentDropdownOpen(true);
                          if (
                            selectedAgent &&
                            event.target.value.trim().toLowerCase() !== selectedAgent.name.trim().toLowerCase()
                          ) {
                            updateBookingForm("agentId", "");
                          }
                        }}
                        onFocus={() => setAgentDropdownOpen(true)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            setAgentDropdownOpen(false);
                            return;
                          }

                          if (event.key === "Enter" && agentDropdownOpen && filteredAgents.length > 0) {
                            event.preventDefault();
                            applyAgentSelection(filteredAgents[0]);
                          }
                        }}
                        placeholder="Search agent by name, email, phone, or wallet"
                      />
                      {agentDropdownOpen && (
                        <div
                          id="ba-agent-dropdown"
                          className="ba-agent-dropdown"
                          role="listbox"
                        >
                          {filteredAgents.length === 0 ? (
                            <div className="ba-agent-empty">No matching agents found</div>
                          ) : (
                            filteredAgents.map((agent) => {
                              const isSelected = Number(bookingForm.agentId) === agent.id;
                              return (
                                <button
                                  key={agent.id}
                                  type="button"
                                  role="option"
                                  aria-selected={isSelected}
                                  className={`ba-agent-option${isSelected ? " is-selected" : ""}`}
                                  onMouseDown={(event) => {
                                    event.preventDefault();
                                    applyAgentSelection(agent);
                                  }}
                                >
                                  <span className="ba-agent-option-main">
                                    <span className="ba-agent-option-name">{agent.name}</span>
                                    <span className="ba-agent-option-meta">
                                      {[agent.email, agent.phone].filter(Boolean).join(" • ") || "No contact details"}
                                    </span>
                                  </span>
                                  <span className="ba-agent-wallet-badge">{agent.walletBalanceLabel}</span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </label>

                  <div className="ba-wallet-card">
                    <span>Wallet Balance</span>
                    <strong>{selectedAgent?.walletBalanceLabel || "Select agent"}</strong>
                    {selectedAgent && (
                      <small className={walletSufficient ? "ba-wallet-ok" : "ba-wallet-danger"}>
                        After booking: {formatMoney(walletAfterBooking)}
                      </small>
                    )}
                  </div>
                </div>

                {selectedAgent && !walletSufficient && (
                  <div className="ba-warning">
                    Insufficient wallet balance. Please top up agent wallet before confirming this activity booking.
                  </div>
                )}
              </div>

              <div className="ba-modal-section">
                <h3>Primary Passenger Details</h3>

                <div className="ba-form-grid ba-form-grid-3">
                  <label className="ba-form-control">
                    <span>Salutation</span>
                    <select
                      value={bookingForm.salutation}
                      onChange={(event) => updateBookingForm("salutation", event.target.value)}
                    >
                      <option value="Mr">Mr</option>
                      <option value="Ms">Ms</option>
                      <option value="Mrs">Mrs</option>
                      <option value="Dr">Dr</option>
                    </select>
                  </label>

                  <label className="ba-form-control ba-form-wide">
                    <span>Name *</span>
                    <input
                      value={bookingForm.name}
                      onChange={(event) => updateBookingForm("name", event.target.value)}
                      placeholder="Enter guest name"
                    />
                  </label>

                  <label className="ba-form-control">
                    <span>Age</span>
                    <input
                      value={bookingForm.age}
                      onChange={(event) => updateBookingForm("age", event.target.value)}
                      placeholder="Age"
                    />
                  </label>

                  <label className="ba-form-control">
                    <span>Primary Contact No. *</span>
                    <input
                      value={bookingForm.contactNo}
                      onChange={(event) => updateBookingForm("contactNo", event.target.value)}
                      placeholder="Enter contact no"
                    />
                  </label>

                  <label className="ba-form-control">
                    <span>Alternative Contact No.</span>
                    <input
                      value={bookingForm.alternativeContactNo}
                      onChange={(event) => updateBookingForm("alternativeContactNo", event.target.value)}
                      placeholder="Alternative contact no"
                    />
                  </label>

                  <label className="ba-form-control">
                    <span>Email ID</span>
                    <input
                      value={bookingForm.emailId}
                      onChange={(event) => updateBookingForm("emailId", event.target.value)}
                      placeholder="Enter email"
                    />
                  </label>

                  <label className="ba-form-control">
                    <span>Nationality</span>
                    <input
                      value={bookingForm.nationality}
                      onChange={(event) => updateBookingForm("nationality", event.target.value)}
                      placeholder="IN"
                    />
                  </label>

                  <label className="ba-form-control">
                    <span>PAN Optional</span>
                    <input
                      value={bookingForm.panNo}
                      onChange={(event) => updateBookingForm("panNo", event.target.value)}
                      placeholder="ABCDE1234F"
                    />
                  </label>

                  <label className="ba-form-control">
                    <span>Passport Optional</span>
                    <input
                      value={bookingForm.passportNo}
                      onChange={(event) => updateBookingForm("passportNo", event.target.value)}
                      placeholder="Passport no"
                    />
                  </label>
                </div>
              </div>

              <div className="ba-modal-section">
                <h3>Travel Details</h3>

                <div className="ba-form-grid ba-form-grid-3">
                  <label className="ba-form-control">
                    <span>Activity Date *</span>
                    <input
                      type="date"
                      value={bookingForm.travelDate}
                      onChange={(event) => updateBookingForm("travelDate", event.target.value)}
                    />
                  </label>

                  <label className="ba-form-control">
                    <span>Guests *</span>
                    <select
                      value={bookingForm.guests}
                      onChange={(event) => updateBookingForm("guests", event.target.value)}
                    >
                      <option value="1">1 Guest</option>
                      <option value="2">2 Guests</option>
                      <option value="3">3 Guests</option>
                      <option value="4">4 Guests</option>
                    </select>
                  </label>

                  <label className="ba-form-control ba-form-wide">
                    <span>Remarks</span>
                    <input
                      value={bookingForm.remarks}
                      onChange={(event) => updateBookingForm("remarks", event.target.value)}
                      placeholder="Special request / pickup info"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="ba-modal-footer">
              <button type="button" className="ba-secondary-button" onClick={closeBookingModal}>
                Cancel
              </button>
              <button
                type="button"
                className="ba-confirm-button"
                onClick={() => void submitActivityBooking()}
                disabled={bookingSubmitting || !selectedAgent || !walletSufficient}
              >
                {bookingSubmitting ? "Confirming..." : `Confirm & Deduct ${formatMoney(bookingTotalAmount)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
