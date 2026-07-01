import { api } from "@/lib/api";

function toQuery(params?: Record<string, unknown>) {
  if (!params) return "";
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

async function request<T>(path: string, opts?: { method?: string; body?: unknown }) {
  const res = await api(path, opts);
  if (res && typeof res === "object" && "data" in res) {
    return (res as { data: T }).data;
  }
  return res as T;
}

export type ActivityPricingUnitType = "PER_ADULT" | "UNIT";

export type StorefrontActivity = {
  id: number;
  activityId: number;
  title: string;
  category: string;
  location: string;
  destination?: string;
  duration: string;
  rating: string;
  ratingValue?: number;
  reviewCount?: number;
  price?: number;
  pricingUnitType?: ActivityPricingUnitType;
  priceUnitLabel?: string;
  priceLabel: string;
  availableDate?: string | null;
  availableOnSelectedDate?: boolean;
  selectedDatePrice?: number | null;
  image: string;
  maxGuests?: number;
  hotspotId?: number;
  timeSlots?: Array<{
    startTime: string | null;
    endTime: string | null;
    type: "default" | "special";
    specialDate: string | null;
  }>;
};

export type StorefrontWishlistItem = StorefrontActivity & {
  wishlistId?: number;
  wishlistedAt?: string | null;
};

export type StorefrontBooking = {
  bookingRequestId: number;
  activityId: number;
  activityTitle: string;
  agentId: number;
  agentName: string;
  activityDate?: string | null;
  guests: number;
  totalAmount: number;
  totalAmountLabel: string;
  walletBalanceBefore: number;
  walletBalanceBeforeLabel: string;
  walletBalanceAfter: number;
  walletBalanceAfterLabel: string;
  salutation?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  destination?: string;
  status: string;
  createdOn?: string | null;
};

export type StorefrontAgent = {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  walletBalance: number;
  walletBalanceLabel: string;
};

export type StorefrontActivityLocation = {
  label: string;
  value: string;
  activityCount?: number;
};

export type StorefrontActivityQuery = {
  source?: string;
  destination?: string;
  activityType?: string;
  q?: string;
  date?: string;
  guests?: number;
  limit?: number;
};

export type CreateActivityBookingPayload = {
  activityId: number;
  agentId: number;
  activityTitle?: string;
  destination?: string;
  activityDate?: string;
  travelDate?: string;
  guests: number;
  totalAmount: number;
  salutation?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAge?: string;
  nationality?: string;
  panNo?: string;
  passportNo?: string;
  alternativePhone?: string;
  notes?: string;
  remarks?: string;
};

export type ToggleWishlistPayload = {
  activityId: number;
  userKey?: string;
};

export const BookActivitiesAPI = {
  categories: async () =>
    request<Array<{ name: string }>>("/activities/storefront/categories", {
      method: "GET",
    }),

  list: async (params?: StorefrontActivityQuery) =>
    request<StorefrontActivity[]>(`/activities/storefront${toQuery(params)}`, {
      method: "GET",
    }),

  activityLocations: async (q?: string) =>
    request<StorefrontActivityLocation[]>(
      `/activities/storefront/locations${toQuery({ q })}`,
      {
        method: "GET",
      },
    ),

  agents: async () =>
    request<StorefrontAgent[]>("/activities/storefront/agents", {
      method: "GET",
    }),

  agentWallet: async (agentId: number) =>
    request<{
      agentId: number;
      agentName: string;
      balance: number;
      formattedBalance: string;
    }>(`/activities/storefront/agents/${agentId}/wallet`, {
      method: "GET",
    }),

  wishlist: async (userKey?: string) =>
    request<StorefrontWishlistItem[]>(
      `/activities/storefront/wishlist${toQuery({ userKey })}`,
      {
        method: "GET",
      },
    ),

  toggleWishlist: async (payload: ToggleWishlistPayload) =>
    request<{
      activityId: number;
      wished: boolean;
      message: string;
    }>("/activities/storefront/wishlist/toggle", {
      method: "POST",
      body: payload,
    }),

  removeWishlist: async (activityId: number, userKey?: string) =>
    request<{
      activityId: number;
      wished: boolean;
      message: string;
    }>(`/activities/storefront/wishlist/${activityId}${toQuery({ userKey })}`, {
      method: "DELETE",
    }),

  myBookings: async (params?: {
    agentId?: number;
    status?: string;
    q?: string;
    limit?: number;
  }) =>
    request<{ items: StorefrontBooking[]; total: number }>(
      `/activities/storefront/bookings${toQuery(params)}`,
      {
        method: "GET",
      },
    ),

  createBooking: async (payload: CreateActivityBookingPayload) =>
    request<{
      ok: boolean;
      bookingRequestId?: number;
      status: string;
      activityId: number;
      activityTitle?: string | null;
      agentId: number;
      agentName: string;
      guests: number;
      totalAmount: number;
      totalAmountLabel: string;
      walletBalanceBefore: number;
      walletBalanceAfter: number;
      walletBalanceAfterLabel: string;
      activityDate?: string | null;
      message: string;
    }>("/activities/storefront/bookings", {
      method: "POST",
      body: payload,
    }),
};
