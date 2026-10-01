import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  Car,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Search,
  UserRound,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { ItineraryService } from "@/services/itinerary";
import {
  assignVehicle,
  fetchAllocationDrivers,
  fetchAllocationVehicles,
  type AllocationDriver,
  type AllocationVehicle,
}
from "@/services/vehicle-availability";

type ConfirmedBooking = {
  itinerary_plan_ID: number;
  confirmed_itinerary_plan_ID?: number | null;
  booking_quote_id: string;
  agent_name?: string;
  primary_customer_name: string;
  primary_contact_no: string;
  arrival_location: string;
  departure_location: string;
  arrival_date: string;
  departure_date: string;
  nights: number;
  days: number;
};

type ConfirmedDetail = {
  id?: string;
  quoteId?: string;
  primaryCustomer?: string;
  arrivalLocation?: string;
  departureLocation?: string;
  startDate?: string;
  endDate?: string;
  nights?: number;
  days?: number;
  adults?: number;
  children?: number;
  infants?: number;
  plan?: {
    itinerary_plan_ID?: number;
    confirmed_itinerary_plan_ID?: number;
  };
};

type WizardStep = 1 | 2 | 3 | 4;

const steps: Array<{
  id: WizardStep;
  title: string;
}> = [
  { id: 1, title: "Select Vehicle & Driver" },
  { id: 2, title: "Assign to Itinerary" },
  { id: 3, title: "Review & Confirm" },
  { id: 4, title: "Share with Driver" },
];

function toDateOnly(value?: string) {
  if (!value) return "";

  const direct = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (direct) return direct;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function vehicleKey(row: AllocationVehicle) {
  return `${row.vendorId}:${row.vehicleTypeId}:${row.vehicleId}`;
}


/* TRANSPORT ALLOCATION VISUAL HELPERS */

type TransportAllocationRoute = {
  itinerary_route_ID?: number;
  location_name?: string;
  next_visiting_location?: string;
  itinerary_route_date?: string;
  no_of_days?: number;
  no_of_km?: string | number;
  direct_to_next_visiting_place?: number;
  via_route?: string;
  via_routes?: Array<{
    itinerary_via_location_ID?: number;
    itinerary_via_location_name?: string;
  }>;

  // Only displayed when the real API supplies one.
  usage_type?: string;
  usageType?: string;
  vehicle_usage_type?: string;
  trip_type?: string;
  route_type?: string;
};

const svgDataUrl = (
  svg: string,
) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

const vehicleImageDataUrl = (
  vehicle?: AllocationVehicle | null,
) => {
  const row = vehicle as any;

  const realImage =
    row?.imageUrl ||
    row?.image_url ||
    row?.vehicleImage ||
    row?.vehicle_image ||
    row?.photo ||
    row?.photo_url;

  if (realImage) {
    return String(realImage);
  }

  const title =
    String(
      vehicle?.vehicleTypeTitle || "",
    ).toLowerCase();

  const registration =
    String(
      vehicle?.registrationNumber || "",
    );

  const seed =
    Number(
      vehicle?.vehicleId ||
        vehicle?.id ||
        1,
    ) || 1;

  const accentPalette = [
    "#6f3cc3",
    "#3f6fc6",
    "#2f8798",
    "#7e669b",
    "#667085",
  ];

  const accent =
    accentPalette[
      Math.abs(seed) %
        accentPalette.length
    ];

  const isBus =
    /bus|coach|minibus|traveller|traveler|tempo|van/.test(
      title,
    );

  const isMpv =
    /innova|crysta|ertiga|mpv|muv|suv|xylo|tavera/.test(
      title,
    );

  const vehicleBody = isBus
    ? `
      <rect x="28" y="30" width="124" height="43" rx="9"
        fill="#f8fafc" stroke="${accent}" stroke-width="3"/>
      <path d="M39 34h79v21H39z"
        fill="#dceafa"/>
      <path d="M123 34h18l8 21h-26z"
        fill="#dceafa"/>
      <path d="M83 31v41M121 31v41"
        stroke="#d4d9e2" stroke-width="2"/>
      <rect x="34" y="60" width="112" height="8" rx="3"
        fill="${accent}" opacity=".18"/>
    `
    : isMpv
      ? `
        <path
          d="M24 62 L34 45 Q38 37 49 35
             L105 31 Q119 31 129 42
             L151 52 Q158 55 158 64
             L158 69 L22 69 Q20 66 24 62Z"
          fill="#f8fafc"
          stroke="${accent}"
          stroke-width="3"
        />
        <path
          d="M48 39 L81 36 L81 52 L38 52Z"
          fill="#dceafa"
        />
        <path
          d="M86 36 L105 35 Q115 35 123 44
             L130 52 H86Z"
          fill="#dceafa"
        />
        <path d="M83 35v30"
          stroke="#d4d9e2" stroke-width="2"/>
        <path d="M31 58h117"
          stroke="${accent}" stroke-width="3" opacity=".25"/>
      `
      : `
        <path
          d="M21 63 L37 51 L62 47
             L78 34 L112 34
             L132 49 L152 54
             Q160 57 158 67
             L22 67Z"
          fill="#f8fafc"
          stroke="${accent}"
          stroke-width="3"
        />
        <path
          d="M65 47 L80 38 H108
             L124 49Z"
          fill="#dceafa"
        />
        <path d="M94 37v13"
          stroke="#c8d2df" stroke-width="2"/>
      `;

  return svgDataUrl(`
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="180"
      height="100"
      viewBox="0 0 180 100"
    >
      <defs>
        <linearGradient id="ground" x1="0" x2="1">
          <stop offset="0" stop-color="#f9f7fc"/>
          <stop offset="1" stop-color="#eef4fb"/>
        </linearGradient>
      </defs>

      <rect
        width="180"
        height="100"
        rx="16"
        fill="url(#ground)"
      />

      <ellipse
        cx="90"
        cy="78"
        rx="66"
        ry="7"
        fill="#cbd5e1"
        opacity=".4"
      />

      ${vehicleBody}

      <circle
        cx="50"
        cy="69"
        r="12"
        fill="#2f3440"
      />
      <circle
        cx="50"
        cy="69"
        r="5"
        fill="#c7ced8"
      />

      <circle
        cx="135"
        cy="69"
        r="12"
        fill="#2f3440"
      />
      <circle
        cx="135"
        cy="69"
        r="5"
        fill="#c7ced8"
      />

      <text
        x="90"
        y="93"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="9"
        font-weight="700"
        fill="#667085"
      >
        ${registration.replace(/[<>&]/g, "")}
      </text>
    </svg>
  `);
};

const driverAvatarDataUrl = (
  driver?: AllocationDriver | null,
) => {
  const row = driver as any;

  const realImage =
    row?.imageUrl ||
    row?.image_url ||
    row?.profileImage ||
    row?.profile_image ||
    row?.driverImage ||
    row?.driver_image ||
    row?.photo ||
    row?.photo_url;

  if (realImage) {
    return String(realImage);
  }

  const seed =
    Number(
      driver?.driverId ||
        driver?.id ||
        1,
    ) || 1;

  const skins = [
    "#8d5524",
    "#a86f42",
    "#c68642",
    "#d39b68",
    "#e0ac69",
    "#f1c27d",
  ];

  const shirts = [
    "#6f3cc3",
    "#2457a6",
    "#0f766e",
    "#9a5b28",
    "#475467",
    "#8b4c70",
  ];

  const backgrounds = [
    "#f1e9ff",
    "#e8f1ff",
    "#e9f7f4",
    "#fff1e8",
    "#edf0f5",
    "#f8eafa",
  ];

  const skin =
    skins[
      Math.abs(seed) %
        skins.length
    ];

  const shirt =
    shirts[
      Math.abs(seed * 3) %
        shirts.length
    ];

  const background =
    backgrounds[
      Math.abs(seed * 5) %
        backgrounds.length
    ];

  const hairVariant =
    Math.abs(seed) % 4;

  const hair =
    hairVariant === 0
      ? `
        <path d="M29 38 Q31 18 52 18 Q72 18 75 39
          Q63 30 51 31 Q40 30 29 38Z"
          fill="#1d1b1b"/>
      `
      : hairVariant === 1
        ? `
          <path d="M27 39 Q28 21 48 17 Q69 17 76 37
            L68 33 Q55 25 42 31 Q34 32 27 39Z"
            fill="#231f20"/>
        `
        : hairVariant === 2
          ? `
            <path d="M29 39 Q29 20 51 19 Q72 20 74 39
              Q66 27 56 29 Q48 24 38 31Z"
              fill="#181717"/>
          `
          : `
            <path d="M28 39 Q30 18 50 17 Q67 17 76 34
              Q64 30 57 27 Q43 24 28 39Z"
              fill="#282323"/>
          `;

  const moustache =
    seed % 2 === 0
      ? `
        <path
          d="M42 56 Q48 52 51 56 Q55 52 61 56
             Q57 61 51 59 Q45 61 42 56Z"
          fill="#2a2220"
        />
      `
      : "";

  const glasses =
    seed % 3 === 0
      ? `
        <g
          fill="none"
          stroke="#343a46"
          stroke-width="1.8"
        >
          <rect x="34" y="43" width="13" height="8" rx="3"/>
          <rect x="55" y="43" width="13" height="8" rx="3"/>
          <path d="M47 46.5h8"/>
        </g>
      `
      : "";

  return svgDataUrl(`
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="104"
      height="104"
      viewBox="0 0 104 104"
    >
      <rect
        width="104"
        height="104"
        rx="20"
        fill="${background}"
      />

      <path
        d="M18 104 Q21 77 51 75 Q82 77 86 104Z"
        fill="${shirt}"
      />

      <path
        d="M42 69h19v15H42z"
        fill="${skin}"
      />

      <ellipse
        cx="51"
        cy="47"
        rx="24"
        ry="29"
        fill="${skin}"
      />

      <ellipse
        cx="27"
        cy="49"
        rx="4"
        ry="7"
        fill="${skin}"
      />

      <ellipse
        cx="75"
        cy="49"
        rx="4"
        ry="7"
        fill="${skin}"
      />

      ${hair}

      <path
        d="M36 42 Q41 39 46 42"
        fill="none"
        stroke="#2a2422"
        stroke-width="2"
        stroke-linecap="round"
      />

      <path
        d="M56 42 Q62 39 67 42"
        fill="none"
        stroke="#2a2422"
        stroke-width="2"
        stroke-linecap="round"
      />

      <circle cx="41" cy="47" r="2" fill="#201d1c"/>
      <circle cx="62" cy="47" r="2" fill="#201d1c"/>

      <path
        d="M51 48 L48 55 Q51 57 54 55"
        fill="none"
        stroke="#8c5c45"
        stroke-width="1.6"
        stroke-linecap="round"
      />

      ${moustache}
      ${glasses}

      <path
        d="M44 63 Q51 67 59 63"
        fill="none"
        stroke="#7d423d"
        stroke-width="2"
        stroke-linecap="round"
      />

      <path
        d="M39 79 L51 91 L64 79"
        fill="#ffffff"
        opacity=".92"
      />

      <circle
        cx="78"
        cy="85"
        r="8"
        fill="#ffffff"
        opacity=".92"
      />

      <path
        d="M75 85l2 2 4-5"
        fill="none"
        stroke="${shirt}"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `);
};

const formatTransportRouteDate = (
  value?: string,
) => {
  if (!value) return "—";

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return String(value);
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
};

const transportRouteLabel = (
  route: TransportAllocationRoute,
) => {
  const from =
    String(
      route.location_name || "",
    ).trim();

  const to =
    String(
      route.next_visiting_location || "",
    ).trim();

  const viaFromArray =
    Array.isArray(route.via_routes)
      ? route.via_routes
          .map((item) =>
            String(
              item?.itinerary_via_location_name ||
                "",
            ).trim(),
          )
          .filter(Boolean)
      : [];

  const viaFromText =
    String(
      route.via_route || "",
    )
      .split(/[,>|]/)
      .map((item) =>
        item.trim(),
      )
      .filter(Boolean);

  const via =
    viaFromArray.length
      ? viaFromArray
      : viaFromText;

  const locations = [
    from,
    ...via,
    to,
  ].filter(Boolean);

  return locations.length
    ? locations.join("  →  ")
    : "—";
};

const transportUsageLabel = (
  route: TransportAllocationRoute,
) =>
  String(
    route.usage_type ||
      route.usageType ||
      route.vehicle_usage_type ||
      route.trip_type ||
      route.route_type ||
      "",
  ).trim() || "—";


/* FINAL TRANSPORT UI FIXES */

const transportFullRouteLabel = (
  routes: TransportAllocationRoute[],
) => {
  const locations: string[] = [];

  const pushLocation = (
    value?: string,
  ) => {
    const clean =
      String(value || "").trim();

    if (!clean) return;

    if (
      locations[
        locations.length - 1
      ] !== clean
    ) {
      locations.push(clean);
    }
  };

  routes.forEach((route) => {
    pushLocation(
      route.location_name,
    );

    const viaLocations =
      Array.isArray(
        route.via_routes,
      )
        ? route.via_routes
            .map((item) =>
              String(
                item
                  ?.itinerary_via_location_name ||
                  "",
              ).trim(),
            )
            .filter(Boolean)
        : [];

    if (viaLocations.length) {
      viaLocations.forEach(
        (location) =>
          pushLocation(location),
      );
    }
    else {
      String(
        route.via_route || "",
      )
        .split(/[,>|]/)
        .map((location) =>
          location.trim(),
        )
        .filter(Boolean)
        .forEach(
          (location) =>
            pushLocation(location),
        );
    }

    pushLocation(
      route.next_visiting_location,
    );
  });

  return locations.join(" → ");
};

export default function TransportAllocationPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [currentStep, setCurrentStep] =
    useState<WizardStep>(1);
  const [
    driverAssignmentId,
    setDriverAssignmentId,
  ] = useState<number | null>(null);

  const [
    isConfirming,
    setIsConfirming,
  ] = useState(false);

  const [bookings, setBookings] =
    useState<ConfirmedBooking[]>([]);

  const [selectedPlanId, setSelectedPlanId] =
    useState<number>(0);

  const [bookingLoading, setBookingLoading] =
    useState(true);

  const [bookingSearch, setBookingSearch] =
    useState("");

  const [bookingDropdownOpen, setBookingDropdownOpen] =
    useState(false);

  const bookingDropdownRef =
    useRef<HTMLDivElement | null>(null);

  const [detail, setDetail] =
    useState<ConfirmedDetail | null>(null);

  const [detailLoading, setDetailLoading] =
    useState(false);

  const [vehicles, setVehicles] =
    useState<AllocationVehicle[]>([]);

  const [vehicleLoading, setVehicleLoading] =
    useState(false);

  const [vehicleSearch, setVehicleSearch] =
    useState("");

  const [selectedVehicleKey, setSelectedVehicleKey] =
    useState("");

  const [drivers, setDrivers] =
    useState<AllocationDriver[]>([]);

  const [driverLoading, setDriverLoading] =
    useState(false);

  const [driverSearch, setDriverSearch] =
    useState("");

  const [selectedDriverId, setSelectedDriverId] =
    useState<number>(0);

  const [shareMethod, setShareMethod] =
    useState<"whatsapp" | "email" | "sms">(
      "whatsapp",
    );

  const selectedBooking = useMemo(
    () =>
      bookings.find(
        (booking) =>
          Number(booking.itinerary_plan_ID) ===
          Number(selectedPlanId),
      ) ?? null,
    [bookings, selectedPlanId],
  );

  const filteredBookings = useMemo(() => {
    const query = bookingSearch
      .trim()
      .toLowerCase();

    if (!query) {
      return bookings;
    }

    return bookings.filter((booking) => {
      const searchableText = [
        booking.booking_quote_id,
        booking.primary_customer_name,
        booking.primary_contact_no,
        booking.arrival_location,
        booking.departure_location,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [bookings, bookingSearch]);
  const selectedVehicle = useMemo(
    () =>
      vehicles.find(
        (vehicle) =>
          vehicleKey(vehicle) === selectedVehicleKey,
      ) ?? null,
    [vehicles, selectedVehicleKey],
  );

  const selectedDriver = useMemo(
    () =>
      drivers.find(
        (driver) =>
          Number(driver.id) === Number(selectedDriverId),
      ) ?? null,
    [drivers, selectedDriverId],
  );


  const [
    itineraryRoutes,
    setItineraryRoutes,
  ] = useState<
    TransportAllocationRoute[]
  >([]);

  const [
    itineraryRoutesLoading,
    setItineraryRoutesLoading,
  ] = useState(false);

  const [
    itineraryGuestCounts,
    setItineraryGuestCounts,
  ] = useState<{
    adults: number | null;
    children: number | null;
    infants: number | null;
  }>({
    adults: null,
    children: null,
    infants: null,
  });

  useEffect(() => {
    if (!selectedPlanId) {
      setItineraryRoutes([]);

      setItineraryGuestCounts({
        adults: null,
        children: null,
        infants: null,
      });

      return;
    }

    let alive = true;

    const loadTransportRoutes =
      async () => {
        try {
          setItineraryRoutesLoading(true);

          const response: any =
            await ItineraryService.getOne(
              Number(selectedPlanId),
            );

          if (!alive) return;

          const countOrNull = (
            value: unknown,
          ) => {
            if (
              value === null ||
              value === undefined ||
              value === ""
            ) {
              return null;
            }

            const numberValue =
              Number(value);

            return Number.isFinite(
              numberValue,
            )
              ? numberValue
              : null;
          };

          setItineraryGuestCounts({
            adults: countOrNull(
              response?.plan?.total_adult ??
                response?.plan?.adult_count,
            ),

            children: countOrNull(
              response?.plan?.total_children ??
                response?.plan?.child_count,
            ),

            infants: countOrNull(
              response?.plan?.total_infants ??
                response?.plan?.infant_count,
            ),
          });

          setItineraryRoutes(
            Array.isArray(
              response?.routes,
            )
              ? response.routes
              : [],
          );
        }
        catch (error) {
          console.error(
            "Unable to load itinerary routes for transport allocation",
            error,
          );

          if (alive) {
            setItineraryRoutes([]);

            setItineraryGuestCounts({
              adults: null,
              children: null,
              infants: null,
            });
          }
        }
        finally {
          if (alive) {
            setItineraryRoutesLoading(
              false,
            );
          }
        }
      };

    void loadTransportRoutes();

    return () => {
      alive = false;
    };
  }, [selectedPlanId]);


  const visibleVehicles = useMemo(() => {
    const query = vehicleSearch
      .trim()
      .toLowerCase();

    const availableVehicles =
      vehicles.filter(
        (vehicle) =>
          vehicle.isAvailable,
      );

    if (!query) {
      return availableVehicles;
    }

    return availableVehicles.filter(
      (vehicle) =>
        [
          vehicle.registrationNumber,
          vehicle.vehicleTypeTitle,
          vehicle.vendorName,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
    );
  }, [vehicles, vehicleSearch]);

  const visibleDrivers = useMemo(() => {
    const query = driverSearch
      .trim()
      .toLowerCase();

    const availableDrivers =
      drivers.filter(
        (driver) =>
          driver.isAvailable,
      );

    if (!query) {
      return availableDrivers;
    }

    return availableDrivers.filter(
      (driver) =>
        [
          driver.label,
          driver.name,
          driver.mobile,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query),
    );
  }, [drivers, driverSearch]);

  useEffect(() => {
    if (!selectedBooking) {
      return;
    }

    if (!bookingDropdownOpen) {
      setBookingSearch(
        `${selectedBooking.booking_quote_id} - ${selectedBooking.primary_customer_name}`,
      );
    }
  }, [
    selectedBooking,
    bookingDropdownOpen,
  ]);

  useEffect(() => {
    if (!bookingDropdownOpen) {
      return;
    }

    const handleOutsideClick = (
      event: MouseEvent,
    ) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        bookingDropdownRef.current &&
        !bookingDropdownRef.current.contains(
          target,
        )
      ) {
        setBookingDropdownOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );
    };
  }, [bookingDropdownOpen]);

  useEffect(() => {
    let alive = true;

    const loadBookings = async () => {
      try {
        setBookingLoading(true);

        const response =
          (await ItineraryService
            .getConfirmedItineraries({
              draw: 1,
              start: 0,
              length: 100,
            })) as {
            data?: ConfirmedBooking[];
          };

        if (!alive) return;

        const rows = Array.isArray(response?.data)
          ? response.data
          : [];

        setBookings(rows);

        const requestedPlanId = Number(
          searchParams.get("planId") || 0,
        );

        const requestedExists = rows.some(
          (row) =>
            Number(row.itinerary_plan_ID) ===
            requestedPlanId,
        );

        const initialPlanId = requestedExists
          ? requestedPlanId
          : Number(
              rows[0]?.itinerary_plan_ID || 0,
            );

        setSelectedPlanId(initialPlanId);
      } catch (error) {
        console.error(
          "Failed to load confirmed bookings",
          error,
        );

        toast.error(
          "Unable to load confirmed bookings",
        );
      } finally {
        if (alive) {
          setBookingLoading(false);
        }
      }
    };

    void loadBookings();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedBooking) {
      setDetail(null);
      return;
    }

    let alive = true;

    const loadDetail = async () => {
      try {
        setDetailLoading(true);

        const confirmedId = Number(
          selectedBooking
            .confirmed_itinerary_plan_ID ||
            selectedBooking
              .itinerary_plan_ID ||
            0,
        );

        if (!confirmedId) {
          setDetail(null);
          return;
        }

        const response =
          (await ItineraryService
            .getConfirmedItineraryDetails(
              String(confirmedId),
            )) as ConfirmedDetail;

        if (alive) {
          setDetail(response ?? null);
        }
      } catch (error) {
        console.error(
          "Failed to load confirmed itinerary details",
          error,
        );

        if (alive) {
          setDetail(null);
        }
      } finally {
        if (alive) {
          setDetailLoading(false);
        }
      }
    };

    void loadDetail();

    return () => {
      alive = false;
    };
  }, [selectedBooking]);


  useEffect(() => {
    if (!selectedPlanId) {
      setVehicles([]);
      setSelectedVehicleKey("");
      return;
    }

    let alive = true;

    const loadVehicles = async () => {
      try {
        setVehicleLoading(true);

        const rows =
          await fetchAllocationVehicles(
            selectedPlanId,
          );

        if (!alive) return;

        setVehicles(rows);

        const currentAssignment =
          rows.find(
            (row) =>
              row.isAssignedToCurrent,
          );

        if (currentAssignment) {
          setSelectedVehicleKey(
            vehicleKey(
              currentAssignment,
            ),
          );

          return;
        }

        setSelectedVehicleKey(
          (currentKey) => {
            const stillValid =
              rows.some(
                (row) =>
                  row.isAvailable &&
                  vehicleKey(row) ===
                    currentKey,
              );

            return stillValid
              ? currentKey
              : "";
          },
        );
      }
      catch (error) {
        console.error(
          "Unable to load allocation vehicles",
          error,
        );

        if (alive) {
          setVehicles([]);
          setSelectedVehicleKey("");
        }
      }
      finally {
        if (alive) {
          setVehicleLoading(false);
        }
      }
    };

    void loadVehicles();

    const vehicleRefreshTimer =
      window.setInterval(
        () => {
          void loadVehicles();
        },
        15000,
      );

    return () => {
      alive = false;

      window.clearInterval(
        vehicleRefreshTimer,
      );
    };
  }, [selectedPlanId]);


  useEffect(() => {
    if (
      !selectedVehicle ||
      !selectedPlanId
    ) {
      setDrivers([]);
      setSelectedDriverId(0);
      return;
    }

    let alive = true;

    const loadDrivers = async () => {
      try {
        setDriverLoading(true);

        const rows =
          await fetchAllocationDrivers(
            selectedPlanId,
            selectedVehicle.vendorId,
            selectedVehicle.vehicleTypeId,
          );

        if (!alive) return;

        setDrivers(rows);

        const currentAssignment =
          rows.find(
            (row) =>
              row.isAssignedToCurrent,
          );

        if (currentAssignment) {
          setSelectedDriverId(
            Number(
              currentAssignment.id,
            ),
          );

          return;
        }

        setSelectedDriverId(
          (currentDriverId) => {
            const stillValid =
              rows.some(
                (row) =>
                  row.isAvailable &&
                  Number(row.id) ===
                    Number(
                      currentDriverId,
                    ),
              );

            return stillValid
              ? currentDriverId
              : 0;
          },
        );
      }
      catch (error) {
        console.error(
          "Unable to load allocation drivers",
          error,
        );

        if (alive) {
          setDrivers([]);
          setSelectedDriverId(0);
        }
      }
      finally {
        if (alive) {
          setDriverLoading(false);
        }
      }
    };

    void loadDrivers();

    const driverRefreshTimer =
      window.setInterval(
        () => {
          void loadDrivers();
        },
        15000,
      );

    return () => {
      alive = false;

      window.clearInterval(
        driverRefreshTimer,
      );
    };
  }, [
    selectedVehicle,
    selectedPlanId,
  ]);

  const changeBooking = (
    planId: number,
  ) => {
    const booking =
      bookings.find(
        (row) =>
          Number(row.itinerary_plan_ID) ===
          Number(planId),
      );

    setSelectedPlanId(planId);

    if (booking) {
      setBookingSearch(
        `${booking.booking_quote_id} - ${booking.primary_customer_name}`,
      );
    }

    setBookingDropdownOpen(false);
    setSelectedVehicleKey("");
    setSelectedDriverId(0);
    setDriverAssignmentId(null);
    setCurrentStep(1);

    setSearchParams(
      {
        planId: String(planId),
      },
      {
        replace: true,
      },
    );
  };


  const isVehicleBusy = (
    vehicle: AllocationVehicle,
  ) => !vehicle.isAvailable;

  const goToStep = (
    step: WizardStep,
  ) => {
    if (
      step > 1 &&
      (!selectedVehicle ||
        !selectedDriver)
    ) {
      toast.error(
        "Select a vehicle and driver first",
      );
      return;
    }

    setCurrentStep(step);
  };

  const confirmAllocation = async () => {
    if (
      !selectedPlanId ||
      !selectedVehicle ||
      !selectedDriver
    ) {
      toast.error(
        "Select a vehicle and driver first",
      );
      return;
    }

    if (isConfirming) {
      return;
    }

    setIsConfirming(true);

    try {
      const result = (await assignVehicle({
        itineraryPlanId:
          Number(selectedPlanId),

        vendor_id:
          Number(selectedVehicle.vendorId),

        vehicle_type_id:
          Number(selectedVehicle.vehicleTypeId),

        vehicle_id:
          Number(selectedVehicle.vehicleId),

        driver_id:
          Number(selectedDriver.id),
      })) as any;

      const assignmentId =
        Number(
          result?.driverAssignmentId ??
            result?.driver_assignment_id ??
            0,
        );

      if (!assignmentId) {
        throw new Error(
          "Driver assignment ID was not returned by the backend",
        );
      }

      setDriverAssignmentId(
        assignmentId,
      );

      toast.success(
        "Vehicle and driver assigned successfully",
      );

      setCurrentStep(4);
    }
    catch (error: any) {
      console.error(
        "Transport allocation failed",
        error,
      );

      const message =
        error?.response?.data?.message ??
        error?.data?.message ??
        error?.message ??
        "Unable to confirm transport allocation";

      toast.error(
        Array.isArray(message)
          ? message.join(", ")
          : String(message),
      );
    }
    finally {
      setIsConfirming(false);
    }
  };

  const shareDriverItinerary = () => {
    if (!driverAssignmentId) {
      toast.error(
        "Confirm the transport allocation first",
      );
      return;
    }

    const shareUrl =
      `${window.location.origin}/daily-moment/driver/${driverAssignmentId}`;

    const bookingId =
      selectedBooking?.booking_quote_id ||
      "DVI Booking";

    const message =
      `Driver itinerary for ${bookingId}: ${shareUrl}`;

    const driverLabel =
      selectedDriver?.label || "";

    const mobileMatch =
      driverLabel.match(
        /(\+?\d[\d\s-]{7,}\d)\s*$/,
      );

    const mobile =
      mobileMatch?.[1]
        ?.replace(/[^\d+]/g, "") ||
      "";

    if (shareMethod === "whatsapp") {
      window.open(
        `https://wa.me/?text=${encodeURIComponent(
          message,
        )}`,
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }

    if (shareMethod === "email") {
      window.location.href =
        `mailto:?subject=${encodeURIComponent(
          `Driver Itinerary - ${bookingId}`,
        )}` +
        `&body=${encodeURIComponent(
          message,
        )}`;
      return;
    }

    if (!mobile) {
      toast.error(
        "Driver mobile number is not available",
      );
      return;
    }

    window.location.href =
      `sms:${mobile}?body=${encodeURIComponent(
        message,
      )}`;
  };
  const adults =
    Number(
      itineraryGuestCounts.adults ??
        detail?.adults ??
        0,
    );

  const children =
    Number(
      itineraryGuestCounts.children ??
        detail?.children ??
        0,
    );

  const infants =
    Number(
      itineraryGuestCounts.infants ??
        detail?.infants ??
        0,
    );

  const paxParts = [
    adults
      ? `${adults} Adult${
          adults === 1 ? "" : "s"
        }`
      : "",
    children
      ? `${children} Child${
          children === 1 ? "" : "ren"
        }`
      : "",
    infants
      ? `${infants} Infant${
          infants === 1 ? "" : "s"
        }`
      : "",
  ].filter(Boolean);

  return (
    <div className="w-full max-w-full space-y-5 pb-8">
      {/* PAGE INTRO */}
      <div>
        <h2 className="text-xl font-semibold text-[#6535bd]">
          Transport Allocation & Driver Itinerary
        </h2>

        <p className="mt-1 text-sm text-[#777080]">
          Allocate a vehicle and driver to a confirmed booking,
          review the assignment and then share it with the driver.
        </p>
      </div>

      {/* REAL BOOKING SELECTOR */}
      <div className="rounded-xl border border-[#e9e4ef] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="w-full max-w-xl">
            <label className="mb-2 block text-sm font-medium text-[#62596d]">
              Confirmed Booking
            </label>

            <div ref={bookingDropdownRef} className="relative">
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setBookingDropdownOpen(
                      (open) => !open,
                    )
                  }
                  className="absolute left-3 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center text-[#746c7b] hover:text-[#6f3cc3]"
                  aria-label="Search confirmed bookings"
                >
                  <Search className="h-4 w-4" />
                </button>

                <input
                  type="text"
                  value={bookingSearch}
                  disabled={bookingLoading}
                  onFocus={() =>
                    setBookingDropdownOpen(true)
                  }
                  onChange={(event) => {
                    setBookingSearch(
                      event.target.value,
                    );

                    setBookingDropdownOpen(true);
                  }}
                  placeholder={
                    bookingLoading
                      ? "Loading confirmed bookings..."
                      : "Search Booking ID, customer, phone or route..."
                  }
                  className="h-11 w-full rounded-lg border border-[#ddd6e6] bg-white pl-10 pr-4 text-sm text-[#3f3748] outline-none transition focus:border-[#7b3fc6] focus:ring-1 focus:ring-[#7b3fc6]/20"
                />
              </div>

              {bookingDropdownOpen &&
                !bookingLoading && (
                  <div className="absolute left-0 right-0 top-[48px] z-50 max-h-[320px] overflow-y-auto rounded-lg border border-[#ded6e6] bg-white shadow-xl">
                    {filteredBookings.length ===
                    0 ? (
                      <div className="px-4 py-8 text-center">
                        <Search className="mx-auto h-6 w-6 text-[#aaa2b1]" />

                        <p className="mt-2 text-sm font-medium text-[#62596d]">
                          No confirmed booking found
                        </p>

                        <p className="mt-1 text-xs text-[#958d9d]">
                          Search using Booking ID,
                          customer name, phone or route.
                        </p>
                      </div>
                    ) : (
                      filteredBookings.map(
                        (booking) => {
                          const active =
                            Number(
                              booking.itinerary_plan_ID,
                            ) ===
                            Number(
                              selectedPlanId,
                            );

                          return (
                            <button
                              key={
                                booking.itinerary_plan_ID
                              }
                              type="button"
                              onClick={() =>
                                changeBooking(
                                  Number(
                                    booking.itinerary_plan_ID,
                                  ),
                                )
                              }
                              className={[
                                "flex w-full items-start justify-between gap-4 border-b border-[#f0ebf3] px-4 py-3 text-left last:border-b-0 hover:bg-[#faf7fd]",
                                active
                                  ? "bg-[#f8f3fc]"
                                  : "bg-white",
                              ].join(" ")}
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-[#3d3447]">
                                    {
                                      booking.booking_quote_id
                                    }
                                  </span>

                                  {active && (
                                    <span className="rounded-full bg-[#eee5fa] px-2 py-0.5 text-[10px] font-medium text-[#6f3cc3]">
                                      Selected
                                    </span>
                                  )}
                                </div>

                                <p className="mt-1 text-sm text-[#62596d]">
                                  {
                                    booking.primary_customer_name
                                  }
                                </p>

                                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#91889a]">
                                  {booking.primary_contact_no && (
                                    <span>
                                      {
                                        booking.primary_contact_no
                                      }
                                    </span>
                                  )}

                                  <span>
                                    {
                                      booking.arrival_location
                                    }
                                    {" → "}
                                    {
                                      booking.departure_location
                                    }
                                  </span>
                                </div>
                              </div>

                              <div className="shrink-0 text-right text-xs text-[#807789]">
                                <div>
                                  {formatDate(
                                    booking.arrival_date,
                                  )}
                                </div>

                                <div className="mt-1">
                                  {booking.days} Days
                                </div>
                              </div>
                            </button>
                          );
                        },
                      )
                    )}
                  </div>
                )}
            </div>
          </div>

          {selectedBooking && (
            <div className="flex flex-wrap items-center justify-end gap-3">
              {/* Dynamic breadcrumb - real selected booking */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#756d7d]">
                <span className="font-medium">
                  Bookings
                </span>

                <ChevronRight className="h-3.5 w-3.5 text-[#aaa2b1]" />

                <span className="font-medium text-[#5e5667]">
                  {selectedBooking.booking_quote_id}
                </span>

                <ChevronRight className="h-3.5 w-3.5 text-[#aaa2b1]" />

                <span className="font-semibold text-[#332b3c]">
                  Transport Allocation
                </span>
              </div>

              {/* Confirmed status */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8fff4] px-3 py-2 text-xs font-medium text-[#16875d]">
                <CheckCircle2 className="h-4 w-4" />
                Confirmed
              </span>
            </div>
          )}
        </div>

        {/* REAL BOOKING SUMMARY */}
        {selectedBooking && (
          <div className="mt-5 grid overflow-hidden rounded-lg border border-[#eee9f3] md:grid-cols-2 xl:grid-cols-5">
            <div className="border-b border-[#eee9f3] p-4 xl:border-b-0 xl:border-r">
              <p className="text-xs text-[#8a8192]">
                Booking / Quote ID
              </p>

              <p className="mt-1 font-semibold text-[#332b3c]">
                {selectedBooking.booking_quote_id ||
                  "-"}
              </p>
            </div>

            <div className="border-b border-[#eee9f3] p-4 xl:border-b-0 xl:border-r">
              <p className="text-xs text-[#8a8192]">
                Customer
              </p>

              <p className="mt-1 font-semibold text-[#332b3c]">
                {detail?.primaryCustomer ||
                  selectedBooking
                    .primary_customer_name ||
                  "-"}
              </p>

              {selectedBooking.primary_contact_no && (
                <p className="mt-1 text-xs text-[#817889]">
                  {
                    selectedBooking
                      .primary_contact_no
                  }
                </p>
              )}
            </div>

            <div className="border-b border-[#eee9f3] p-4 xl:border-b-0 xl:border-r">
              <p className="text-xs text-[#8a8192]">
                Travel Period
              </p>

              <div className="mt-1 flex gap-2">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[#6f3cc3]" />

                <div>
                  <p className="font-semibold text-[#332b3c]">
                    {formatDate(
                      detail?.startDate ||
                        selectedBooking
                          .arrival_date,
                    )}
                    {" - "}
                    {formatDate(
                      detail?.endDate ||
                        selectedBooking
                          .departure_date,
                    )}
                  </p>

                  <p className="mt-1 text-xs text-[#817889]">
                    {detail?.nights ??
                      selectedBooking.nights ??
                      0}{" "}
                    Nights /{" "}
                    {detail?.days ??
                      selectedBooking.days ??
                      0}{" "}
                    Days
                  </p>
                </div>
              </div>
            </div>

            <div className="border-b border-[#eee9f3] p-4 md:border-b-0 xl:border-r">
              <p className="text-xs text-[#8a8192]">
                Route
              </p>

              <div className="mt-1 flex gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#d546ab]" />

                <p className="font-semibold text-[#332b3c]">
                  {detail?.arrivalLocation ||
                    selectedBooking
                      .arrival_location ||
                    "-"}
                  {" → "}
                  {detail?.departureLocation ||
                    selectedBooking
                      .departure_location ||
                    "-"}
                </p>
              </div>
            </div>

            <div className="p-4">
              <p className="text-xs text-[#8a8192]">
                Guests
              </p>

              <div className="mt-1 flex gap-2">
                <Users className="mt-0.5 h-4 w-4 shrink-0 text-[#6f3cc3]" />

                <p className="font-semibold text-[#332b3c]">
                  {detailLoading
                    ? "Loading..."
                    : paxParts.length
                      ? paxParts.join(", ")
                      : "-"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* WIZARD */}
      <div className="rounded-xl border border-[#e9e4ef] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {steps.map((step, index) => {
            const active =
              currentStep === step.id;

            const completed =
              currentStep > step.id;

            return (
              <div
                key={step.id}
                className="flex min-w-0 flex-1 items-center"
              >
                <button
                  type="button"
                  onClick={() =>
                    goToStep(step.id)
                  }
                  className="flex items-center gap-3 text-left"
                >
                  <span
                    className={[
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition",
                      active
                        ? "bg-[#6f3cc3] text-white"
                        : completed
                          ? "bg-[#d546ab] text-white"
                          : "bg-[#f0edf4] text-[#817889]",
                    ].join(" ")}
                  >
                    {completed ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      step.id
                    )}
                  </span>

                  <span
                    className={[
                      "text-sm font-medium",
                      active
                        ? "text-[#6f3cc3]"
                        : completed
                          ? "text-[#d546ab]"
                          : "text-[#6f6777]",
                    ].join(" ")}
                  >
                    {step.title}
                  </span>
                </button>

                {index <
                  steps.length - 1 && (
                  <div className="mx-4 hidden h-px flex-1 bg-[#e3dce9] lg:block" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1 ONLY */}
      {currentStep === 1 && (
        <div className="grid gap-5 xl:grid-cols-2">
          <section className="rounded-xl border border-[#e9e4ef] bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-[#4a4260]">
              Select Vehicle
            </h3>

            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#958d9d]" />

              <input
                value={vehicleSearch}
                onChange={(event) =>
                  setVehicleSearch(
                    event.target.value,
                  )
                }
                placeholder="Search vehicle number, type or vendor"
                className="h-10 w-full rounded-lg border border-[#ddd6e6] pl-9 pr-3 text-sm outline-none focus:border-[#7b3fc6]"
              />
            </div>

            <div className="mt-4 max-h-[430px] space-y-3 overflow-y-auto pr-1">
              {vehicleLoading ? (
                <div className="rounded-lg border border-dashed border-[#ded7e5] p-8 text-center text-sm text-[#807789]">
                  Loading available vehicles...
                </div>
              ) : visibleVehicles.length ===
                0 ? (
                <div className="rounded-lg border border-dashed border-[#ded7e5] p-8 text-center text-sm text-[#807789]">
                  No vehicles found for this travel period.
                </div>
              ) : (
                visibleVehicles.map(
                  (vehicle) => {
                    const key =
                      vehicleKey(vehicle);

                    const selected =
                      selectedVehicleKey ===
                      key;

                    const busy =
                      isVehicleBusy(vehicle);

                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          setSelectedVehicleKey(
                            key,
                          )
                        }
                        className={[
                          "flex w-full items-center gap-3 rounded-lg border p-4 text-left transition",
                          selected
                            ? "border-[#7b3fc6] bg-[#faf7ff] ring-1 ring-[#7b3fc6]/20"
                            : "border-[#e4dee9] hover:border-[#b8a6cb]",
                          busy
                            ? "cursor-not-allowed opacity-55"
                            : "",
                        ].join(" ")}
                      >
                        <div
                          className={[
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                            selected
                              ? "border-[#6f3cc3] bg-[#6f3cc3] text-white"
                              : "border-[#bdb4c7]",
                          ].join(" ")}
                        >
                          {selected && (
                            <Check className="h-3 w-3" />
                          )}
                        </div>

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#f3eff7]">
                          <img
                          src={vehicleImageDataUrl(vehicle)}
                          alt={`${vehicle.vehicleTypeTitle || "Vehicle"} ${vehicle.registrationNumber || ""}`}
                          className="h-10 w-10 rounded-md object-contain"
                        />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[#332b3c]">
                            {
                              vehicle.registrationNumber
                            }
                          </p>

                          <p className="mt-0.5 text-xs text-[#746c7b]">
                            {
                              vehicle.vehicleTypeTitle
                            }
                          </p>

                          <p className="mt-1 text-xs text-[#958d9d]">
                            {vehicle.vendorName}
                          </p>
                        </div>

                        <span
                          className={[
                            "rounded-full px-3 py-1 text-[11px] font-medium",
                            busy
                              ? "bg-[#fff3df] text-[#a86a10]"
                              : "bg-[#e6faef] text-[#178154]",
                          ].join(" ")}
                        >
                          {busy
                            ? "On Trip"
                            : "Available"}
                        </span>
                      </button>
                    );
                  },
                )
              )}
            </div>
          </section>

          <section className="rounded-xl border border-[#e9e4ef] bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-[#4a4260]">
              Select Driver
            </h3>

            {!selectedVehicle ? (
              <div className="mt-4 rounded-lg border border-dashed border-[#ded7e5] p-10 text-center">
                <UserRound className="mx-auto h-8 w-8 text-[#a49bad]" />

                <p className="mt-3 text-sm text-[#746c7b]">
                  Select a vehicle first to load
                  drivers.
                </p>
              </div>
            ) : (
              <>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#958d9d]" />

                  <input
                    value={driverSearch}
                    onChange={(event) =>
                      setDriverSearch(
                        event.target.value,
                      )
                    }
                    placeholder="Search driver"
                    className="h-10 w-full rounded-lg border border-[#ddd6e6] pl-9 pr-3 text-sm outline-none focus:border-[#7b3fc6]"
                  />
                </div>

                <div className="mt-4 max-h-[430px] space-y-3 overflow-y-auto pr-1">
                  {driverLoading ? (
                    <div className="rounded-lg border border-dashed border-[#ded7e5] p-8 text-center text-sm text-[#807789]">
                      Loading drivers...
                    </div>
                  ) : visibleDrivers.length ===
                    0 ? (
                    <div className="rounded-lg border border-dashed border-[#ded7e5] p-8 text-center text-sm text-[#807789]">
                      No drivers found.
                    </div>
                  ) : (
                    visibleDrivers.map(
                      (driver) => {
                        const selected =
                          selectedDriverId ===
                          Number(driver.id);

                    const busy =
                      !driver.isAvailable;

                        return (
                          <button
                            key={driver.id}
                            type="button"
                        disabled={busy}
                            onClick={() =>
                              setSelectedDriverId(
                                Number(
                                  driver.id,
                                ),
                              )
                            }
                            className={[
                              "flex w-full items-center gap-3 rounded-lg border p-4 text-left transition",
                              selected
                                ? "border-[#7b3fc6] bg-[#faf7ff] ring-1 ring-[#7b3fc6]/20"
                                : "border-[#e4dee9] hover:border-[#b8a6cb]",
                          busy
                            ? "cursor-not-allowed opacity-55"
                            : "",
                            ].join(" ")}
                          >
                            <div
                              className={[
                                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                                selected
                                  ? "border-[#6f3cc3] bg-[#6f3cc3] text-white"
                                  : "border-[#bdb4c7]",
                              ].join(" ")}
                            >
                              {selected && (
                                <Check className="h-3 w-3" />
                              )}
                            </div>

                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f3eff7]">
                              <img
                              src={driverAvatarDataUrl(driver)}
                              alt={driver.name || driver.label || "Driver"}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                            </div>

                            <div>
                              <p className="font-semibold text-[#332b3c]">
                                {driver.label}
                              </p>

                              <p className="mt-1 text-xs text-[#958d9d]">
                                Driver ID:{" "}
                                {driver.id}
                              </p>
                            </div>
                          </button>
                        );
                      },
                    )
                  )}
                </div>
              </>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                disabled={
                  !selectedVehicle ||
                  !selectedDriver
                }
                onClick={() =>
                  goToStep(2)
                }
                className="inline-flex items-center gap-2 rounded-lg bg-[#6f3cc3] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#5f2ead] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        </div>
      )}


  {/* STEP 2 ONLY */}
  {currentStep === 2 && (
    <section className="overflow-hidden rounded-xl border border-[#e5dfeb] bg-white shadow-sm">

      <div className="border-b border-[#ebe6f0] px-6 py-5">
        <h3 className="text-xl font-semibold text-[#27213a]">
          Assigned Itinerary
        </h3>

        <p className="mt-1 text-sm text-[#7f7689]">
          Confirm the actual route plan before reviewing the transport allocation.
        </p>
      </div>

      <div className="overflow-x-auto px-6 pt-5">
        <div className="overflow-hidden rounded-lg border border-[#dfe5ee]">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="bg-[#eef6ff] text-sm font-semibold text-[#31364b]">
              <tr>
                <th className="w-[72px] border-r border-[#dfe5ee] px-4 py-3 text-center">
                  Day
                </th>

                <th className="w-[160px] border-r border-[#dfe5ee] px-4 py-3">
                  Date
                </th>

                <th className="border-r border-[#dfe5ee] px-4 py-3">
                  From → To
                </th>

                <th className="w-[150px] border-r border-[#dfe5ee] px-4 py-3 text-center">
                  KM (Approx.)
                </th>

                <th className="w-[170px] px-4 py-3">
                  Usage Type
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#e7ebf1] text-sm text-[#323746]">
              {itineraryRoutesLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-[#7d8490]"
                  >
                    Loading itinerary legs...
                  </td>
                </tr>
              ) : itineraryRoutes.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-[#7d8490]"
                  >
                    No itinerary legs were returned for this booking.
                  </td>
                </tr>
              ) : (
                itineraryRoutes.map(
                  (route, index) => (
                    <tr
                      key={
                        route.itinerary_route_ID ||
                        `route-${index}`
                      }
                      className="bg-white"
                    >
                      <td className="border-r border-[#e7ebf1] px-4 py-3 text-center font-semibold">
                        {Number(
                          route.no_of_days ||
                            index + 1,
                        )}
                      </td>

                      <td className="border-r border-[#e7ebf1] px-4 py-3 font-medium">
                        {formatTransportRouteDate(
                          route.itinerary_route_date,
                        )}
                      </td>

                      <td className="border-r border-[#e7ebf1] px-4 py-3 font-medium">
                        {transportRouteLabel(
                          route,
                        )}
                      </td>

                      <td className="border-r border-[#e7ebf1] px-4 py-3 text-center">
                        {route.no_of_km ===
                          undefined ||
                        route.no_of_km ===
                          null ||
                        String(
                          route.no_of_km,
                        ).trim() === ""
                          ? "—"
                          : route.no_of_km}
                      </td>

                      <td className="px-4 py-3">
                        {transportUsageLabel(
                          route,
                        )}
                      </td>
                    </tr>
                  ),
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="px-6 pb-6 pt-6">
        <h4 className="text-lg font-semibold text-[#332b3c]">
          Vehicle & Driver Details
        </h4>

        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div className="flex min-h-[128px] items-center gap-4 rounded-xl border border-[#e5dfeb] bg-white p-4 shadow-sm">
            <div className="flex h-[92px] w-[142px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f7f8fb]">
              <img
                src={vehicleImageDataUrl(
                  selectedVehicle,
                )}
                alt={
                  selectedVehicle
                    ?.vehicleTypeTitle ||
                  "Selected vehicle"
                }
                className="h-full w-full object-contain"
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-[#29233b]">
                {selectedVehicle
                  ?.vehicleTypeTitle ||
                  "Selected Vehicle"}
              </p>

              <p className="mt-1 font-medium text-[#565064]">
                {selectedVehicle
                  ?.registrationNumber ||
                  "—"}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {selectedVehicle
                  ?.vendorName ? (
                  <span className="rounded-full bg-[#f3eff9] px-2.5 py-1 text-xs font-medium text-[#64479a]">
                    {
                      selectedVehicle.vendorName
                    }
                  </span>
                ) : null}

                <span
                  className={[
                    "rounded-full px-2.5 py-1 text-xs font-medium",
                    selectedVehicle
                      ?.isAssignedToCurrent
                      ? "bg-[#eee8ff] text-[#6641c4]"
                      : selectedVehicle
                            ?.isAvailable
                        ? "bg-[#eaf9ef] text-[#16875d]"
                        : "bg-[#fff0f0] text-[#b42318]",
                  ].join(" ")}
                >
                  {selectedVehicle
                    ?.isAssignedToCurrent
                    ? "Assigned"
                    : selectedVehicle
                          ?.isAvailable
                      ? "Available"
                      : "On Trip"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex min-h-[128px] items-center gap-4 rounded-xl border border-[#e5dfeb] bg-white p-4 shadow-sm">
            <img
              src={driverAvatarDataUrl(
                selectedDriver,
              )}
              alt={
                selectedDriver?.name ||
                selectedDriver?.label ||
                "Selected driver"
              }
              className="h-[82px] w-[82px] shrink-0 rounded-xl object-cover"
            />

            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-[#29233b]">
                {selectedDriver?.name ||
                  selectedDriver?.label ||
                  "Selected Driver"}
              </p>

              <p className="mt-1 text-sm text-[#7c7483]">
                Driver ID:{" "}
                {selectedDriver
                  ?.driverId ||
                  selectedDriver?.id ||
                  "—"}
              </p>

              <div className="mt-3 flex items-center gap-2 text-sm font-medium text-[#40394a]">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4 text-[#5f3db3]"
                  aria-hidden="true"
                >
                  <path
                    d="M22 16.92v3a2 2 0 0 1-2.18 2
                       19.79 19.79 0 0 1-8.63-3.07
                       19.5 19.5 0 0 1-6-6
                       19.79 19.79 0 0 1-3.07-8.67
                       A2 2 0 0 1 4.11 2h3
                       a2 2 0 0 1 2 1.72
                       12.84 12.84 0 0 0 .7 2.81
                       2 2 0 0 1-.45 2.11
                       L8.09 9.91a16 16 0 0 0 6 6
                       l1.27-1.27
                       a2 2 0 0 1 2.11-.45
                       12.84 12.84 0 0 0 2.81.7
                       A2 2 0 0 1 22 16.92Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <span>
                  {selectedDriver?.mobile ||
                    "Mobile not available"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-[#eee9f2] pt-5">
          <button
            type="button"
            onClick={() =>
              goToStep(1)
            }
            className="inline-flex items-center gap-2 rounded-lg border border-[#d9d1e1] bg-white px-4 py-2.5 text-sm font-medium text-[#5f5668] hover:bg-[#faf8fc]"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>

          <button
            type="button"
            onClick={() =>
              goToStep(3)
            }
            className="inline-flex items-center gap-2 rounded-lg bg-[#6f3cc3] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5f2ead]"
          >
            Review
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  )}

{/* STEP 3 ONLY */}
      {currentStep === 3 && (
        <section className="rounded-xl border border-[#e9e4ef] bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#4a4260]">
            Review & Confirm
          </h3>

          <p className="mt-1 text-sm text-[#807789]">
            Review the transport allocation before
            confirmation.
          </p>

          <div className="mt-5 divide-y divide-[#eee9f2] rounded-lg border border-[#e8e1ed]">
            <div className="grid gap-2 p-4 md:grid-cols-[180px_1fr]">
              <span className="text-sm text-[#8b8293]">
                Booking
              </span>
              <span className="font-medium text-[#332b3c]">
                {selectedBooking
                  ?.booking_quote_id || "-"}
              </span>
            </div>

            <div className="grid gap-2 p-4 md:grid-cols-[180px_1fr]">
              <span className="text-sm text-[#8b8293]">
                Customer
              </span>
              <span className="font-medium text-[#332b3c]">
                {
                  selectedBooking
                    ?.primary_customer_name
                }
              </span>
            </div>

            <div className="grid gap-2 p-4 md:grid-cols-[180px_1fr]">
              <span className="text-sm text-[#8b8293]">
                Vehicle
              </span>
              <span className="font-medium text-[#332b3c]">
                {
                  selectedVehicle
                    ?.registrationNumber
                }{" "}
                -{" "}
                {
                  selectedVehicle
                    ?.vehicleTypeTitle
                }
              </span>
            </div>

            <div className="grid gap-2 p-4 md:grid-cols-[180px_1fr]">
              <span className="text-sm text-[#8b8293]">
                Driver
              </span>
              <span className="font-medium text-[#332b3c]">
                {selectedDriver?.label}
              </span>
            </div>


            <div className="p-4">
              <p className="mb-3 text-sm font-medium text-[#8b8293]">
                Assigned Itinerary
              </p>

              <div className="overflow-x-auto">
                <div className="overflow-hidden rounded-lg border border-[#dfe5ee]">
                  <table className="w-full min-w-[760px] border-collapse text-left">
                    <thead className="bg-[#eef6ff] text-sm font-semibold text-[#31364b]">
                      <tr>
                        <th className="w-[72px] border-r border-[#dfe5ee] px-4 py-3 text-center">
                          Day
                        </th>

                        <th className="w-[160px] border-r border-[#dfe5ee] px-4 py-3">
                          Date
                        </th>

                        <th className="border-r border-[#dfe5ee] px-4 py-3">
                          From → To
                        </th>

                        <th className="w-[150px] border-r border-[#dfe5ee] px-4 py-3 text-center">
                          KM (Approx.)
                        </th>

                        <th className="w-[170px] px-4 py-3">
                          Usage Type
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#e7ebf1] text-sm text-[#323746]">
                      {itineraryRoutesLoading ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-center text-[#7d8490]"
                          >
                            Loading itinerary...
                          </td>
                        </tr>
                      ) : itineraryRoutes.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-center text-[#7d8490]"
                          >
                            No itinerary route data available.
                          </td>
                        </tr>
                      ) : (
                        itineraryRoutes.map(
                          (route, index) => (
                            <tr
                              key={
                                route.itinerary_route_ID ||
                                `review-route-${index}`
                              }
                              className="bg-white"
                            >
                              <td className="border-r border-[#e7ebf1] px-4 py-3 text-center font-semibold">
                                {Number(
                                  route.no_of_days ||
                                    index + 1,
                                )}
                              </td>

                              <td className="border-r border-[#e7ebf1] px-4 py-3 font-medium">
                                {formatTransportRouteDate(
                                  route.itinerary_route_date,
                                )}
                              </td>

                              <td className="border-r border-[#e7ebf1] px-4 py-3 font-medium">
                                {transportRouteLabel(
                                  route,
                                )}
                              </td>

                              <td className="border-r border-[#e7ebf1] px-4 py-3 text-center">
                                {route.no_of_km ===
                                  undefined ||
                                route.no_of_km ===
                                  null ||
                                String(
                                  route.no_of_km,
                                ).trim() === ""
                                  ? "-"
                                  : route.no_of_km}
                              </td>

                              <td className="px-4 py-3">
                                {transportUsageLabel(
                                  route,
                                )}
                              </td>
                            </tr>
                          ),
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={() =>
                setCurrentStep(2)
              }
              className="inline-flex items-center gap-2 rounded-lg border border-[#d8d0df] px-4 py-2.5 text-sm font-medium text-[#5f5767] hover:bg-[#faf8fc]"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>

            <button
              type="button"
              onClick={() => { void confirmAllocation(); }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#6f3cc3] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#5f2ead]"
            >
              <CheckCircle2 className="h-4 w-4" />
              Confirm & Continue
            </button>
          </div>
        </section>
      )}

      {/* STEP 4 ONLY */}
      {currentStep === 4 && (
        <section className="rounded-xl border border-[#e9e4ef] bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#4a4260]">
            Share with Driver
          </h3>

          <p className="mt-1 text-sm text-[#807789]">
            Choose how the driver itinerary should
            be shared.
          </p>

          <div className="mt-5 rounded-lg bg-[#f3fff8] p-4">
            <div className="flex gap-3">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-[#16875d]" />

              <div>
                <p className="font-medium text-[#286447]">
                  Driver itinerary ready
                </p>

                <p className="mt-1 text-sm text-[#5f7468]">
                  {selectedDriver?.label}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-sm font-medium text-[#4a4260]">
              Share Option
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                {
                  id: "whatsapp" as const,
                  label: "WhatsApp",
                  icon: MessageCircle,
                },
                {
                  id: "email" as const,
                  label: "Email",
                  icon: Mail,
                },
                {
                  id: "sms" as const,
                  label: "SMS",
                  icon: MessageSquare,
                },
              ].map((option) => {
                const Icon = option.icon;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      setShareMethod(
                        option.id,
                      )
                    }
                    className={[
                      "flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium",
                      shareMethod ===
                      option.id
                        ? "border-[#6f3cc3] bg-[#faf7ff] text-[#6f3cc3]"
                        : "border-[#dfd8e6] text-[#655d6d] hover:bg-[#faf8fc]",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              type="button"
              onClick={() =>
                setCurrentStep(3)
              }
              className="inline-flex items-center gap-2 rounded-lg border border-[#d8d0df] px-4 py-2.5 text-sm font-medium text-[#5f5767] hover:bg-[#faf8fc]"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>

            <button
              type="button"
              onClick={shareDriverItinerary}
              className="inline-flex items-center gap-2 rounded-lg bg-[#6f3cc3] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#5f2ead]"
            >
              <MessageCircle className="h-4 w-4" />
              Share with Driver
            </button>
          </div>
        </section>
      )}
    </div>
  );
}