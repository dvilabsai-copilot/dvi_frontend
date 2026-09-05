import { api } from "@/lib/api";

export type HotelAdminPermissionKey =
  | "hotels"
  | "hotel_details"
  | "rooms"
  | "rates"
  | "availability"
  | "bookings"
  | "hotel_users"
  | "permissions"
  | "gallery";

export type HotelAdminPermission = {
  key: HotelAdminPermissionKey | string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
};

export type HotelAdminHotel = {
  hotel_id: number;
  hotel_name: string | null;
  hotel_code: string | null;
  hotel_email: string | null;
  hotel_mobile: string | null;
  hotel_city: string | null;
  hotel_state: string | null;
  hotel_address: string | null;
  status: number | boolean | null;
};

export type HotelAdminContext = {
  user: {
    id: string;
    email: string;
    fullName: string;
    roleID: number;
  };
  assignedHotelCount: number;
  defaultHotel: HotelAdminHotel | null;
  permissions: HotelAdminPermission[];
};

export type HotelAdminDashboard = {
  hotels: number;
  hotelUsers: number;
  rooms: number;
  activeBookings: number;
};

export type HotelAdminHotelListResponse = {
  items: HotelAdminHotel[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  search: string;
};

export type HotelAdminHotelListQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

const SELECTED_HOTEL_KEY =
  "hotelAdminSelectedHotelId";

function buildQuery(
  values: Record<string, string | number | undefined>,
) {
  const params = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      params.set(key, String(value));
    }
  });

  const query = params.toString();

  return query ? `?${query}` : "";
}

export function setHotelAdminSelectedHotelId(
  hotelId: number,
) {
  if (
    typeof window === "undefined" ||
    !Number.isFinite(hotelId) ||
    hotelId <= 0
  ) {
    return;
  }

  window.localStorage.setItem(
    SELECTED_HOTEL_KEY,
    String(hotelId),
  );
}

export function getHotelAdminSelectedHotelId():
  number | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = Number(
    window.localStorage.getItem(
      SELECTED_HOTEL_KEY,
    ),
  );

  return Number.isFinite(value) && value > 0
    ? value
    : null;
}

export function clearHotelAdminSelectedHotelId() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(
      SELECTED_HOTEL_KEY,
    );
  }
}

export function hasHotelAdminPermission(
  context: HotelAdminContext | null,
  key: HotelAdminPermissionKey,
  action:
    | "view"
    | "create"
    | "edit"
    | "delete" = "view",
) {
  const permission =
    context?.permissions?.find(
      (item) => item.key === key,
    );

  return Boolean(permission?.[action]);
}

export const HotelAdminAPI = {
  async me(): Promise<HotelAdminContext> {
    return (await api(
      "/hotel-admin/me",
    )) as HotelAdminContext;
  },

  async dashboard():
    Promise<HotelAdminDashboard> {
    return (await api(
      "/hotel-admin/dashboard",
    )) as HotelAdminDashboard;
  },

  async hotels(
    query: HotelAdminHotelListQuery = {},
  ): Promise<HotelAdminHotelListResponse> {
    const suffix = buildQuery({
      page: query.page ?? 1,
      limit: query.limit ?? 25,
      search: query.search?.trim() || undefined,
    });

    return (await api(
      `/hotel-admin/hotels${suffix}`,
    )) as HotelAdminHotelListResponse;
  },

  async hotel(
    hotelId: number,
  ): Promise<Record<string, unknown>> {
    return (await api(
      `/hotel-admin/hotels/${hotelId}`,
    )) as Record<string, unknown>;
  },

  async updateHotel(
    hotelId: number,
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return (await api(
      `/hotel-admin/hotels/${hotelId}`,
      {
        method: "PATCH",
        body,
      },
    )) as Record<string, unknown>;
  },

  async rooms(
    hotelId: number,
  ): Promise<unknown> {
    return api(
      `/hotel-admin/hotels/${hotelId}/rooms`,
    );
  },

  async createRoom(
    hotelId: number,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    return api(
      `/hotel-admin/hotels/${hotelId}/rooms`,
      {
        method: "POST",
        body,
      },
    );
  },

  async updateRoom(
    hotelId: number,
    roomId: number,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    return api(
      `/hotel-admin/hotels/${hotelId}/rooms/${roomId}`,
      {
        method: "PATCH",
        body,
      },
    );
  },

  async deleteRoom(
    hotelId: number,
    roomId: number,
  ): Promise<unknown> {
    return api(
      `/hotel-admin/hotels/${hotelId}/rooms/${roomId}`,
      {
        method: "DELETE",
      },
    );
  },

  async ratePlans(
    hotelId: number,
    roomId: number,
  ): Promise<{
    room: {
      id: number;
      name: string;
    };
    items: Array<{
      id: number;
      rateplanId: string;
      name: string;
      code: string | null;
      mealPlan: string | null;
      currency: string | null;
      occupancy: unknown;
    }>;
  }> {
    return (await api(
      `/hotel-admin/hotels/${hotelId}/rooms/${roomId}/rate-plans`,
    )) as {
      room: {
        id: number;
        name: string;
      };
      items: Array<{
        id: number;
        rateplanId: string;
        name: string;
        code: string | null;
        mealPlan: string | null;
        currency: string | null;
        occupancy: unknown;
      }>;
    };
  },
  async rates(
    hotelId: number,
    query: {
      startDate?: string;
      endDate?: string;
      roomId?: number;
      rateplanId?: string | number;
    },
  ): Promise<unknown> {
    const suffix = buildQuery({
      startDate: query.startDate,
      endDate: query.endDate,
      roomId: query.roomId,
      rateplanId: query.rateplanId,
    });

    return api(
      `/hotel-admin/hotels/${hotelId}/rates${suffix}`,
    );
  },

  async saveRates(
    hotelId: number,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    return api(
      `/hotel-admin/hotels/${hotelId}/rates`,
      {
        method: "POST",
        body,
      },
    );
  },

  async availability(
    hotelId: number,
    roomId: number,
    startDate: string,
    endDate: string,
  ): Promise<unknown> {
    const suffix = buildQuery({
      startDate,
      endDate,
    });

    return api(
      `/hotel-admin/hotels/${hotelId}/rooms/${roomId}/availability${suffix}`,
    );
  },

  async saveAvailability(
    hotelId: number,
    roomId: number,
    items: Array<{
      startDate: string;
      endDate: string;
      freeRooms: number;
    }>,
  ): Promise<unknown> {
    return api(
      `/hotel-admin/hotels/${hotelId}/rooms/${roomId}/availability`,
      {
        method: "POST",
        body: { items },
      },
    );
  },

  async bookings(): Promise<unknown> {
    return api("/hotel-admin/bookings");
  },

  async users(): Promise<unknown> {
    return api("/hotel-admin/users");
  },

  async createUser(
    body: Record<string, unknown>,
  ): Promise<unknown> {
    return api("/hotel-admin/users", {
      method: "POST",
      body,
    });
  },

  async updateUser(
    userId: string | number,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    return api(
      `/hotel-admin/users/${userId}`,
      {
        method: "PATCH",
        body,
      },
    );
  },

  async deleteUser(
    userId: string | number,
  ): Promise<unknown> {
    return api(
      `/hotel-admin/users/${userId}`,
      {
        method: "DELETE",
      },
    );
  },

  async userPermissions(
    userId: string | number,
  ): Promise<unknown> {
    return api(
      `/hotel-admin/users/${userId}/permissions`,
    );
  },

  async saveUserPermissions(
    userId: string | number,
    permissions: Array<{
      key: string;
      view: boolean;
      create: boolean;
      edit: boolean;
      delete: boolean;
    }>,
  ): Promise<unknown> {
    return api(
      `/hotel-admin/users/${userId}/permissions`,
      {
        method: "PATCH",
        body: { permissions },
      },
    );
  },
};