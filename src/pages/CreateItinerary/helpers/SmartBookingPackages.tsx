import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  Loader2,
  MapPin,
  Sparkles,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ItineraryService } from "@/services/itinerary";
import type {
  ItineraryDay,
  ItineraryDetailsResponse,
} from "@/pages/itinerary-details/itinerary-details.types";

import { locationsApi } from "@/services/locations";
import { hotspotService } from "@/services/hotspotService";
import { AutoSuggestSelect } from "@/components/AutoSuggestSelect";
import { calculateDaysBetweenDates } from "./createItinerary.utils";
import type { RouteData } from "@/components/DefaultRoutesSuggestions";
import { api } from "@/lib/api";

type SmartBookingPackagesProps = {
  arrivalLocation?: unknown;
  departureLocation?: unknown;
  locations?: any[];

  agentId?: number | null;

  itineraryPreference?:
    | "vehicle"
    | "hotel"
    | "both";

  tripStartDate?: string;
  tripEndDate?: string;

  selectedHotelCategoryIds?: number[];
  hotelCategoryOptions?: any[];
};

type SmartPackagePricing = {
  currency: string;
  adultRate: number;
  roomRatePerNight: number;
  extraBedRate: number;
  childWithBedRate: number;
  childWithoutBedRate: number;
  totalAmount: number;
  netPayable: number;
  packageTotal: number;
  hasRate: boolean;
};

type SmartPackage = {
  planId: number;
  quoteId: string;

  arrival: string;
  departure: string;

  region: string;
  hotelCategory: string;

  filterAgentId: number;

  filterPreference:
    | "vehicle"
    | "hotel"
    | "both"
    | "";

  filterTripStartDate: string;
  filterTripEndDate: string;

  filterHotelCategoryIds: number[];
  title: string;
  routeLabel: string;

  days: number;
  nights: number;

  adults: number;
  children: number;
  infants: number;

  pricing: SmartPackagePricing;

  image: string;
  fallbackImage: string;
  badge: string;

  stays: Array<{
    location: string;
    nights: number;
  }>;

  highlights: string[];
  themes: string[];
};

const API_BASE =
  ((import.meta.env.VITE_API_DVI_BASE_URL as string) || "")
    .replace(/\/$/, "");

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=82";

const SMART_LOCATION_IMAGES = [
  {
    keywords: [
      "pondicherry",
      "puducherry",
      "beach",
      "coast",
      "marina",
    ],
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=82",
  },
  {
    keywords: [
      "chennai",
      "mahabalipuram",
      "kanchipuram",
      "temple",
      "spiritual",
      "church",
    ],
    image:
      "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=900&q=82",
  },
  {
    keywords: [
      "coimbatore",
      "isha",
      "yoga",
      "ooty",
      "valparai",
      "hill",
      "nature",
    ],
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=82",
  },
  {
    keywords: [
      "bangalore",
      "bengaluru",
      "mysore",
      "mysuru",
      "coorg",
      "heritage",
      "palace",
    ],
    image:
      "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=900&q=82",
  },
  {
    keywords: [
      "kerala",
      "munnar",
      "alleppey",
      "alappuzha",
      "backwater",
      "houseboat",
    ],
    image:
      "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=900&q=82",
  },
  {
    keywords: [
      "andaman",
      "havelock",
      "neil island",
      "island",
    ],
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=82",
  },
] as const;

function cleanLabel(value: unknown) {
  return String(value ?? "").trim();
}

function toMediaUrl(value: unknown) {
  const path = cleanLabel(value);

  if (!path) return "";

  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("data:") ||
    path.startsWith("blob:")
  ) {
    return path;
  }

  if (path.startsWith("//")) {
    return `https:${path}`;
  }

  if (!API_BASE) {
    return path.startsWith("/")
      ? path
      : `/${path}`;
  }

  return path.startsWith("/")
    ? `${API_BASE}${path}`
    : `${API_BASE}/${path}`;
}

function normalizePlace(value: unknown) {
  return cleanLabel(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getLocationFallbackImage(
  ...values: unknown[]
) {
  const searchText =
    normalizePlace(
      values
        .map(cleanLabel)
        .filter(Boolean)
        .join(" "),
    );

  const matched =
    SMART_LOCATION_IMAGES.find(
      (item) =>
        item.keywords.some(
          (keyword) =>
            searchText.includes(
              normalizePlace(keyword),
            ),
        ),
    );

  return matched?.image || FALLBACK_IMAGE;
}

function cityComparable(value: unknown) {
  return normalizePlace(value)
    .replace(
      /\b(international|domestic|airport|railway|station|bus|stand|terminal)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function sameLocation(a: unknown, b: unknown) {
  const first = normalizePlace(a);
  const second = normalizePlace(b);

  if (!first || !second) return false;

  if (first === second) {
    return true;
  }

  const firstCity = cityComparable(first);
  const secondCity = cityComparable(second);

  if (!firstCity || !secondCity) {
    return false;
  }

  return (
    firstCity === secondCity ||
    firstCity.includes(secondCity) ||
    secondCity.includes(firstCity)
  );
}

function locationDisplayValue(location: any) {
  if (!location) return "";

  return cleanLabel(
    location.label ??
      location.name ??
      location.location_name ??
      location.locationName ??
      location.text ??
      "",
  );
}

function locationIdentityValue(location: any) {
  if (!location) return "";

  return cleanLabel(
    location.id ??
      location.value ??
      location.location_id ??
      location.locationId ??
      location.location_ID ??
      "",
  );
}

function resolveSelectedLocation(
  value: unknown,
  locations: any[] = [],
) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value === "object") {
    const direct = locationDisplayValue(value);

    if (direct) return direct;

    const identity = locationIdentityValue(value);

    if (identity) {
      const match = locations.find(
        (location) =>
          locationIdentityValue(location) === identity,
      );

      return locationDisplayValue(match) || identity;
    }

    return "";
  }

  const raw = cleanLabel(value);

  const match = locations.find((location) => {
    const identity =
      locationIdentityValue(location);

    const display =
      locationDisplayValue(location);

    return (
      identity === raw ||
      normalizePlace(display) === normalizePlace(raw)
    );
  });

  return locationDisplayValue(match) || raw;
}

function uniqueConsecutive(values: string[]) {
  return values.filter(
    (value, index) =>
      Boolean(value) &&
      (index === 0 || value !== values[index - 1]),
  );
}

function parseNightCount(value: unknown) {
  const raw = String(value ?? "0&0");
  const [nightPart] = raw.split("&");

  return Number(nightPart) || 0;
}

function buildRoute(days: ItineraryDay[]) {
  const ordered = [...days].sort(
    (a, b) =>
      Number(a.dayNumber || 0) -
      Number(b.dayNumber || 0),
  );

  const places: string[] = [];

  ordered.forEach((day, index) => {
    const departure =
      cleanLabel(day.departure);

    const arrival =
      cleanLabel(day.arrival);

    if (index === 0 && departure) {
      places.push(departure);
    }

    if (arrival) {
      places.push(arrival);
    }
  });

  return uniqueConsecutive(places);
}

function buildStays(
  days: ItineraryDay[],
  nightCount: number,
) {
  const ordered = [...days].sort(
    (a, b) =>
      Number(a.dayNumber || 0) -
      Number(b.dayNumber || 0),
  );

  const nightDays =
    nightCount > 0
      ? ordered.slice(
          0,
          Math.min(
            nightCount,
            ordered.length,
          ),
        )
      : ordered.slice(
          0,
          Math.max(
            0,
            ordered.length - 1,
          ),
        );

  const counts =
    new Map<string, number>();

  nightDays.forEach((day) => {
    const location =
      cleanLabel(day.arrival);

    if (!location) return;

    counts.set(
      location,
      (counts.get(location) || 0) + 1,
    );
  });

  return Array.from(counts.entries())
    .map(([location, nights]) => ({
      location,
      nights,
    }))
    .slice(0, 4);
}

function extractHighlights(
  days: ItineraryDay[],
) {
  const names: string[] = [];

  for (const day of days) {
    for (const segment of day.segments || []) {
      if (
        segment.type !== "attraction"
      ) {
        continue;
      }

      const name =
        cleanLabel(segment.name);

      if (
        name &&
        !names.includes(name)
      ) {
        names.push(name);
      }

      if (names.length >= 3) {
        return names;
      }
    }
  }

  return names;
}

/*
  Existing itinerary screens convert media paths to
  VITE_API_DVI_BASE_URL + path.

  Smart Booking now follows the same rule.
*/
function extractImage(
  days: ItineraryDay[],
) {
  for (const day of days) {
    for (const segment of day.segments || []) {
      if (
        segment.type !== "attraction"
      ) {
        continue;
      }

      const directImage =
        toMediaUrl(segment.image);

      if (directImage) {
        return directImage;
      }

      const galleryImage =
        Array.isArray(segment.galleryImages)
          ? segment.galleryImages
              .map(toMediaUrl)
              .find(Boolean)
          : "";

      if (galleryImage) {
        return galleryImage;
      }

      const activityImage =
        Array.isArray(segment.activities)
          ? segment.activities
              .map((activity) =>
                toMediaUrl(activity.image),
              )
              .find(Boolean)
          : "";

      if (activityImage) {
        return activityImage;
      }

      const activityGalleryImage =
        Array.isArray(segment.activities)
          ? segment.activities
              .flatMap((activity) =>
                Array.isArray(
                  activity.galleryImages,
                )
                  ? activity.galleryImages
                  : [],
              )
              .map(toMediaUrl)
              .find(Boolean)
          : "";

      if (activityGalleryImage) {
        return activityGalleryImage;
      }
    }
  }

  return "";
}

function inferPackageBadge(
  arrival: string,
  departure: string,
  routeLabel: string,
  highlights: string[],
) {
  const text = normalizePlace(
    [
      arrival,
      departure,
      routeLabel,
      ...highlights,
    ].join(" "),
  );

  if (
    /temple|ashram|church|mosque|spiritual|pilgrim|basilica|vinayagar/.test(
      text,
    )
  ) {
    return "Spiritual Journey";
  }

  if (
    /beach|island|sea|coast|marine|marina|pondicherry|andaman|havelock/.test(
      text,
    )
  ) {
    return "Coastal Escape";
  }

  if (
    /palace|heritage|museum|fort|monument|mysore|mahabalipuram/.test(
      text,
    )
  ) {
    return "Heritage Trail";
  }

  if (
    /hill|mountain|tea|garden|forest|waterfall|munnar|ooty|coorg|yoga/.test(
      text,
    )
  ) {
    return "Nature Escape";
  }

  return "Recommended";
}


/*
  Smart Booking supported regions ONLY:

  1. Andhra Pradesh
  2. Karnataka
  3. Kerala
  4. Tamil Nadu
  5. Telangana
  6. Pondicherry
*/
const SMART_REGION_RULES = [
  {
    name: "Andhra Pradesh",
    keywords: [
      "andhra pradesh",
      "tirupati",
      "chittoor",
      "srikalahasti",
      "vijayawada",
      "visakhapatnam",
      "vizag",
      "guntur",
      "nellore",
      "kurnool",
      "amaravati",
      "kakinada",
      "rajahmundry",
      "rajahmahendravaram",
      "eluru",
      "anantapur",
      "kadapa",
      "ongole",
    ],
  },

  {
    name: "Karnataka",
    keywords: [
      "karnataka",
      "bengaluru",
      "bangalore",
      "mysuru",
      "mysore",
      "hampi",
      "coorg",
      "madikeri",
      "mangalore",
      "mangaluru",
      "udupi",
      "chikmagalur",
      "chikkamagaluru",
      "hassan",
      "belur",
      "halebidu",
      "badami",
      "aihole",
      "pattadakal",
      "gokarna",
      "murudeshwar",
      "shivamogga",
      "shimoga",
    ],
  },

  {
    name: "Kerala",
    keywords: [
      "kerala",
      "kochi",
      "cochin",
      "ernakulam",
      "munnar",
      "thekkady",
      "periyar",
      "alleppey",
      "alappuzha",
      "kumarakom",
      "trivandrum",
      "thiruvananthapuram",
      "kovalam",
      "wayanad",
      "vagamon",
      "kozhikode",
      "calicut",
      "guruvayur",
      "thrissur",
      "palakkad",
      "kollam",
      "kannur",
      "varkala",
      "athirappilly",
      "athirapally",
    ],
  },

  {
    name: "Tamil Nadu",
    keywords: [
      "tamil nadu",
      "chennai",
      "kanchipuram",
      "mahabalipuram",
      "mamallapuram",
      "madurai",
      "rameswaram",
      "dhanushkodi",
      "thanjavur",
      "tanjore",
      "trichy",
      "tiruchirappalli",
      "coimbatore",
      "ooty",
      "udhagamandalam",
      "kodaikanal",
      "kanyakumari",
      "vellore",
      "tiruvannamalai",
      "chidambaram",
      "salem",
      "erode",
      "yercaud",
      "tirunelveli",
      "thoothukudi",
      "tuticorin",
      "nagapattinam",
      "velankanni",
      "kumbakonam",
      "karaikudi",
      "chettinad",
    ],
  },

  {
    name: "Telangana",
    keywords: [
      "telangana",
      "hyderabad",
      "secunderabad",
      "warangal",
      "nizamabad",
      "karimnagar",
      "khammam",
    ],
  },

  {
    name: "Pondicherry",
    keywords: [
      "pondicherry",
      "puducherry",
      "auroville",
      "karaikal",
      "mahe",
      "yanam",
    ],
  },
];

const SMART_REGION_IMAGES:
  Record<string, string> = {
    "Andhra Pradesh":
      "https://images.unsplash.com/photo-1627894483216-2138af692e32?auto=format&fit=crop&w=1000&q=84",

    Karnataka:
      "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=1000&q=84",

    Kerala:
      "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1000&q=84",

    "Tamil Nadu":
      "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1000&q=84",

    Telangana:
      "https://images.unsplash.com/photo-1576591201871-5d3c70e74f41?auto=format&fit=crop&w=1000&q=84",

    Pondicherry:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=84",
  };

function compactRoutePlace(
  value: unknown,
) {
  return cleanLabel(value)
    .replace(
      /,\s*(Andhra Pradesh|Karnataka|Kerala|Tamil Nadu|Telangana|Pondicherry|Puducherry)(?:,\s*India)?$/i,
      "",
    )
    .replace(
      /,\s*India$/i,
      "",
    )
    .replace(
      /\bInternational Airport\b/gi,
      "",
    )
    .replace(
      /\bDomestic Airport\b/gi,
      "",
    )
    .replace(
      /\bAirport\b/gi,
      "",
    )
    .replace(
      /\bRailway Station\b/gi,
      "",
    )
    .replace(
      /\bBus Stand\b/gi,
      "",
    )
    .replace(/\s*,\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferPackageRegion(
  values: unknown[],
) {
  const score =
    new Map<string, number>();

  SMART_REGION_RULES.forEach(
    (rule) =>
      score.set(rule.name, 0),
  );

  for (const value of values) {
    const normalized =
      normalizePlace(value);

    if (!normalized) continue;

    SMART_REGION_RULES.forEach(
      (rule) => {
        const matches =
          rule.keywords.filter(
            (keyword) =>
              normalized.includes(
                normalizePlace(keyword),
              ),
          ).length;

        if (matches > 0) {
          score.set(
            rule.name,
            (score.get(rule.name) || 0) +
              matches,
          );
        }
      },
    );
  }

  const result =
    Array.from(score.entries())
      .filter(([, points]) => points > 0)
      .sort(
        (a, b) => b[1] - a[1],
      );

  /*
    Do not falsely label an unknown
    destination as one of the six states.
  */
  return result[0]?.[0] || "South India";
}

function inferThemeTags(
  badge: string,
  values: unknown[],
) {
  const value =
    normalizePlace(
      values
        .map(cleanLabel)
        .filter(Boolean)
        .join(" "),
    );

  const result: string[] = [];

  const add = (
    label: string,
    matcher: RegExp,
  ) => {
    if (
      matcher.test(value) &&
      !result.includes(label)
    ) {
      result.push(label);
    }
  };

  add(
    "Temples",
    /temple|kovil|mandir|meenakshi|kanchipuram|rameswaram|tirupati/,
  );

  add(
    "Heritage",
    /heritage|fort|palace|museum|monument|mahabalipuram|hampi|mysore/,
  );

  add(
    "Beaches",
    /beach|coast|marina|pondicherry|puducherry|kovalam/,
  );

  add(
    "Backwaters",
    /backwater|alleppey|alappuzha|kumarakom/,
  );

  add(
    "Hills",
    /hill|mountain|munnar|ooty|kodaikanal|coorg|wayanad|vagamon/,
  );

  add(
    "Wildlife",
    /wildlife|sanctuary|national park|thekkady|periyar/,
  );

  add(
    "Tea Gardens",
    /tea|plantation/,
  );

  add(
    "Spiritual",
    /church|mosque|basilica|ashram|pilgrim/,
  );

  const defaults:
    Record<string, string[]> = {
      "Spiritual Journey": [
        "Temples",
        "Heritage",
        "Spiritual",
      ],

      "Nature Escape": [
        "Nature",
        "Hills",
        "Scenic",
      ],

      "Coastal Escape": [
        "Beaches",
        "Coastal",
        "Leisure",
      ],

      "Heritage Trail": [
        "Heritage",
        "Culture",
        "Landmarks",
      ],

      Recommended: [
        "Sightseeing",
        "Culture",
        "Experiences",
      ],
    };

  for (
    const label of defaults[badge] || []
  ) {
    if (result.length >= 3) break;

    if (!result.includes(label)) {
      result.push(label);
    }
  }

  return result.slice(0, 3);
}

function buildRegionalPackageTitle(
  region: string,
  badge: string,
  routeLabel: string,
  highlights: string[],
  arrival: string,
) {
  const destination =
    region === "South India"
      ? (
          compactRoutePlace(arrival) ||
          "South India"
        )
      : region;

  const value =
    normalizePlace(
      [
        routeLabel,
        ...highlights,
      ].join(" "),
    );

  if (
    /temple|kovil|mandir|tirupati|kanchipuram|rameswaram|meenakshi/.test(
      value,
    )
  ) {
    return (
      destination +
      " Temple Tour"
    );
  }

  if (
    badge === "Nature Escape"
  ) {
    return (
      destination +
      " Nature Escape"
    );
  }

  if (
    badge === "Coastal Escape"
  ) {
    return (
      destination +
      " Coastal Escape"
    );
  }

  if (
    badge === "Heritage Trail"
  ) {
    return (
      destination +
      " Heritage Tour"
    );
  }

  if (
    badge === "Spiritual Journey"
  ) {
    return (
      destination +
      " Spiritual Tour"
    );
  }

  return (
    destination +
    " Highlights Tour"
  );
}

function smartFallbackImage(
  region: string,
  ...values: unknown[]
) {
  return (
    SMART_REGION_IMAGES[region] ||
    getLocationFallbackImage(
      region,
      ...values,
    )
  );
}


function smartPositiveNumber(
  ...values: unknown[]
) {
  for (const value of values) {
    const numberValue =
      Number(value);

    if (
      Number.isFinite(numberValue) &&
      numberValue > 0
    ) {
      return numberValue;
    }
  }

  return 0;
}

function findSmartRateByKey(
  value: unknown,
  keys: string[],
): number {
  const source =
    value &&
    typeof value === "object"
      ? (value as any)
      : {};

  /*
    IMPORTANT:
    Do NOT recursively walk the complete
    itinerary-details response.

    Those responses can contain very large
    hotel/provider inventories.

    Scan only known pricing containers.
  */
  const candidates: any[] = [
    source,
    source?.pricing,
    source?.pricingSummary,
    source?.costSummary,
    source?.costing,
    source?.hotelPricing,
    source?.hotelCost,
    source?.hotelDetails,
    source?.hotelDetails?.pricing,
    source?.hotelDetails?.pricingSummary,
    source?.hotelDetails?.costSummary,
    source?.hotelDetails?.costing,
    source?.hotelDetails?.hotelPricing,
  ].filter(Boolean);

  const arrays = [
    source?.hotelPricingBreakdown,
    source?.hotelCostBreakdown,
    source?.hotelDetails?.pricingBreakdown,
    source?.hotelDetails?.hotelPricingBreakdown,
    source?.hotelDetails?.selectedHotels,
    source?.hotelDetails?.hotels,
  ];

  for (const rows of arrays) {
    if (Array.isArray(rows)) {
      /*
        Shallow inspection only.
        Never recursively traverse provider
        inventory / rateOptions.
      */
      candidates.push(
        ...rows.slice(0, 50),
      );
    }
  }

  for (const row of candidates) {
    if (
      !row ||
      typeof row !== "object"
    ) {
      continue;
    }

    for (const key of keys) {
      const numberValue =
        Number(row[key]);

      if (
        Number.isFinite(numberValue) &&
        numberValue > 0
      ) {
        return numberValue;
      }
    }
  }

  return 0;
}


function extractSmartHotelCategory(
  details: unknown,
): string {
  const source =
    (details || {}) as any;

  const value =
    source?.hotelCategory ??
    source?.hotel_category ??
    source?.hotelDetails?.hotelCategory ??
    source?.hotelDetails?.selectedHotels?.[0]?.category ??
    source?.hotelDetails?.hotels?.[0]?.category ??
    source?.hotels?.[0]?.category ??
    "";

  return (
    cleanLabel(value) ||
    "Not specified"
  );
}

function extractSmartPackagePricing(
  details: any,
  row?: any,
): SmartPackagePricing {
  const toMoney = (
    value: unknown,
  ) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return 0;
    }

    if (
      typeof value === "number"
    ) {
      return Number.isFinite(value)
        ? value
        : 0;
    }

    const cleaned =
      String(value)
        .replace(/[^0-9.-]/g, "")
        .trim();

    const parsed =
      Number(cleaned);

    return Number.isFinite(parsed)
      ? parsed
      : 0;
  };

  const firstPositive = (
    values: unknown[],
  ) => {
    for (
      const value of values
    ) {
      const amount =
        toMoney(value);

      if (amount > 0) {
        return amount;
      }
    }

    return 0;
  };

  const source =
    details?.data &&
    typeof details.data === "object"
      ? details.data
      : details;

  const pricing =
    source?.pricing &&
    typeof source.pricing === "object"
      ? source.pricing
      : {};

  const summary =
    source?.summary &&
    typeof source.summary === "object"
      ? source.summary
      : {};

  const totals =
    source?.totals &&
    typeof source.totals === "object"
      ? source.totals
      : {};

  const costing =
    source?.costing &&
    typeof source.costing === "object"
      ? source.costing
      : {};

  /*
    SMART_BOOKING_CANONICAL_COST_BREAKDOWN

    getItineraryDetails() already returns the
    authoritative final itinerary calculation in
    details.costBreakdown.

    Confirmation also uses:
      costBreakdown.netPayable

    Smart Booking must display that SAME amount.
  */
  const costBreakdown =
    source?.costBreakdown &&
    typeof source.costBreakdown === "object"
      ? source.costBreakdown
      : {};

  const payment =
    source?.paymentSummary &&
    typeof source.paymentSummary === "object"
      ? source.paymentSummary
      : {};

  /*
    IMPORTANT:
    Smart Booking package cost must use the SAME
    final itinerary amount already calculated for
    the saved route.

    Do not derive packageTotal from room rate,
    child rate, or vehicle rows.
  */
  const netPayable =
    firstPositive([
      source?.netPayable,
      source?.net_payable,
      pricing?.netPayable,
      pricing?.net_payable,
      pricing?.finalPayable,
      pricing?.final_payable,
      summary?.netPayable,
      summary?.net_payable,
      totals?.netPayable,
      totals?.net_payable,
      payment?.netPayable,
      payment?.net_payable,
      row?.netPayable,
      row?.net_payable,
    ]);

  const totalAmount =
    firstPositive([
      source?.totalAmount,
      source?.total_amount,
      source?.grandTotal,
      source?.grand_total,
      pricing?.totalAmount,
      pricing?.total_amount,
      pricing?.totalNetAmount,
      pricing?.total_net_amount,
      pricing?.grandTotal,
      pricing?.grand_total,
      summary?.totalAmount,
      summary?.total_amount,
      summary?.grandTotal,
      summary?.grand_total,
      totals?.totalAmount,
      totals?.total_amount,
      totals?.grandTotal,
      totals?.grand_total,
      costing?.totalAmount,
      costing?.total_amount,
      row?.totalAmount,
      row?.total_amount,
      row?.grandTotal,
      row?.grand_total,
    ]);

  const canonicalRouteTotal =
    firstPositive([
      /*
        Smart Booking must display the SAME
        Overall Trip Cost shown in Itinerary Details.

        Use itinerary trip total first.
        Final payable is fallback only.
      */
      costBreakdown?.totalAmount,
      costBreakdown?.total_amount,
      costBreakdown?.totalNetAmount,
      costBreakdown?.total_net_amount,
      costBreakdown?.grossTotal,
      costBreakdown?.gross_total,

      costBreakdown?.netPayable,
      costBreakdown?.net_payable,
      costBreakdown?.finalPayable,
      costBreakdown?.final_payable,
    ]);

  const packageTotal =
    canonicalRouteTotal > 0
      ? canonicalRouteTotal
      : netPayable > 0
        ? netPayable
        : totalAmount;

  const roomRatePerNight =
    firstPositive([
      source?.roomRatePerNight,
      source?.room_rate_per_night,
      pricing?.roomRatePerNight,
      pricing?.room_rate_per_night,
      costing?.roomRatePerNight,
      costing?.room_rate_per_night,
    ]);

  const adultRate =
    firstPositive([
      source?.adultRate,
      source?.adult_rate,
      source?.roomCostPerPerson,
      source?.room_cost_per_person,
      pricing?.adultRate,
      pricing?.adult_rate,
      pricing?.roomCostPerPerson,
      pricing?.room_cost_per_person,
    ]);

  const extraBedRate =
    firstPositive([
      source?.extraBedRate,
      source?.extra_bed_rate,
      pricing?.extraBedRate,
      pricing?.extra_bed_rate,
    ]);

  const childWithBedRate =
    firstPositive([
      source?.childWithBedRate,
      source?.child_with_bed_rate,
      pricing?.childWithBedRate,
      pricing?.child_with_bed_rate,
    ]);

  const childWithoutBedRate =
    firstPositive([
      source?.childWithoutBedRate,
      source?.child_without_bed_rate,
      pricing?.childWithoutBedRate,
      pricing?.child_without_bed_rate,
    ]);

  const currency =
    String(
      source?.currency ||
        pricing?.currency ||
        summary?.currency ||
        totals?.currency ||
        "INR",
    )
      .trim()
      .toUpperCase() ||
    "INR";

  return {
    currency,
    adultRate,
    roomRatePerNight,
    extraBedRate,
    childWithBedRate,
    childWithoutBedRate,
    totalAmount:
      totalAmount > 0
        ? totalAmount
        : firstPositive([
            costBreakdown?.totalAmount,
            costBreakdown?.total_amount,
            costBreakdown?.totalNetAmount,
          ]),

    netPayable:
      firstPositive([
        costBreakdown?.netPayable,
        costBreakdown?.net_payable,
        costBreakdown?.finalPayable,
        netPayable,
      ]),

    packageTotal,
    hasRate:
      packageTotal > 0,
  };
}
function formatSmartMoney(
  value: number,
) {
  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    },
  ).format(value);
}


function smartFilterDate(
  value: unknown,
) {
  const source =
    String(value || "").trim();

  if (!source) {
    return "";
  }

  const iso =
    source.match(
      /^(\d{4})-(\d{2})-(\d{2})/,
    );

  if (iso) {
    return (
      iso[1] +
      "-" +
      iso[2] +
      "-" +
      iso[3]
    );
  }

  const dmy =
    source.match(
      /^(\d{2})[-\/](\d{2})[-\/](\d{4})/,
    );

  if (dmy) {
    return (
      dmy[3] +
      "-" +
      dmy[2] +
      "-" +
      dmy[1]
    );
  }

  const parsed =
    new Date(source);

  if (
    !Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return parsed
      .toISOString()
      .slice(0, 10);
  }

  return source;
}

function smartFilterPreference(
  value: unknown,
):
  | "vehicle"
  | "hotel"
  | "both"
  | "" {
  const source =
    String(value ?? "")
      .trim()
      .toLowerCase();

  /*
    Persisted itinerary_preference:
    1 = Hotel
    2 = Vehicle
    3 = Both
  */
  if (
    source === "2" ||
    source === "vehicle" ||
    source === "vehicle only" ||
    source === "vehicle_only"
  ) {
    return "vehicle";
  }

  if (
    source === "1" ||
    source === "hotel" ||
    source === "hotel only" ||
    source === "hotel_only"
  ) {
    return "hotel";
  }

  if (
    source === "3" ||
    source === "both" ||
    source.includes(
      "hotel and vehicle",
    ) ||
    source.includes(
      "vehicle and hotel",
    )
  ) {
    return "both";
  }

  return "";
}

function smartFilterLabel(
  value: unknown,
) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function smartFilterNumberList(
  ...values: unknown[]
) {
  const result: number[] = [];

  const add = (
    value: unknown,
  ) => {
    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return;
    }

    if (Array.isArray(value)) {
      value
        .slice(0, 30)
        .forEach(add);

      return;
    }

    if (
      typeof value === "object"
    ) {
      const row =
        value as any;

      add(
        row?.id ??
          row?.value ??
          row?.categoryId ??
          row?.category_id ??
          row?.hotelCategoryId ??
          row?.hotel_category_id ??
          row?.hotel_category_ID,
      );

      return;
    }

    const numberValue =
      Number(value);

    if (
      Number.isFinite(
        numberValue,
      ) &&
      numberValue > 0 &&
      !result.includes(
        numberValue,
      )
    ) {
      result.push(
        numberValue,
      );
    }
  };

  values.forEach(add);

  return result;
}

function smartFirstFilterValue(
  containers: any[],
  keys: string[],
) {
  for (
    const container of containers
  ) {
    if (
      !container ||
      typeof container !==
        "object"
    ) {
      continue;
    }

    for (const key of keys) {
      const value =
        container[key];

      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        return value;
      }
    }
  }

  return undefined;
}

function extractSmartFilterMetadata(
  row: any,
  details: any,
) {
  /*
    Shallow metadata inspection only.
    Never recursively traverse provider
    hotel inventories.
  */
  const containers = [
    row,

    details,
    details?.data,
    details?.plan,
    details?.header,
    details?.agent,

    details?.itinerary,
    details?.itineraryDetails,
    details?.basicDetails,

    details?.hotelDetails,
  ].filter(Boolean);

  const rawAgentId =
    smartFirstFilterValue(
      containers,
      [
        "agentId",
        "agentID",
        "agent_ID",
        "agent_id",

        "agentAccountId",
        "agent_account_id",

        "itineraryAgentId",
        "itinerary_agent_id",
      ],
    );

  const agentId =
    Number(
      typeof rawAgentId ===
        "object"
        ? (
            rawAgentId as any
          )?.id
        : rawAgentId,
    ) || 0;

  const preference =
    smartFilterPreference(
      smartFirstFilterValue(
        containers,
        [
          "itineraryPreference",
          "itinerary_preference",

          "preference",
          "preferenceId",
          "preference_id",
        ],
      ),
    );

  const tripStartDate =
    smartFilterDate(
      smartFirstFilterValue(
        containers,
        [
          "tripStartDateAndTime",
          "trip_start_date_and_time",

          "tripStartDate",
          "trip_start_date",
        ],
      ),
    );

  const tripEndDate =
    smartFilterDate(
      smartFirstFilterValue(
        containers,
        [
          "tripEndDateAndTime",
          "trip_end_date_and_time",

          "tripEndDate",
          "trip_end_date",
        ],
      ),
    );

  const hotelCategoryIds =
    smartFilterNumberList(
      row?.selectedHotelCategoryIds,
      row?.hotelCategoryIds,
      row?.hotel_category_ids,
      row?.preferredHotelCategory,
      row?.preferred_hotel_category,
      row?.hotelCategoryId,
      row?.hotel_category_id,
      row?.hotel_category_ID,

      details?.selectedHotelCategoryIds,
      details?.hotelCategoryIds,
      details?.hotel_category_ids,
      details?.hotelCategoryId,
      details?.hotel_category_id,
      details?.hotel_category_ID,

      details?.data
        ?.selectedHotelCategoryIds,

      details?.data
        ?.hotelCategoryIds,

      details?.itinerary
        ?.selectedHotelCategoryIds,

      details?.itinerary
        ?.hotelCategoryIds,

      details?.hotelDetails
        ?.selectedHotelCategoryIds,

      details?.hotelDetails
        ?.hotelCategoryIds,

      details?.hotelDetails
        ?.selectedHotels,

      details?.hotelDetails
        ?.hotels,
    );

  return {
    agentId,
    preference,
    tripStartDate,
    tripEndDate,
    hotelCategoryIds,
  };
}

function buildPackage(
  row: any,
  details: ItineraryDetailsResponse & {
    itineraryType?: number;
  },
): SmartPackage | null {
  const itineraryType =
    Number(
      details?.itineraryType ??
        row?.itinerary_type ??
        0,
    );

  if (itineraryType !== 1) {
    return null;
  }

  const quoteId =
    cleanLabel(
      details?.quoteId ||
        row?.itinerary_quote_ID ||
        row?.itinerary_booking_ID,
    );

  const planId =
    Number(
      details?.planId ||
        row?.modify ||
        0,
    );

  if (!quoteId || !planId) {
    return null;
  }

  const itineraryDays =
    details.days || [];

  const rawRoutePlaces =
    buildRoute(itineraryDays);

  const routePlaces =
    uniqueConsecutive(
      rawRoutePlaces
        .map(compactRoutePlace)
        .filter(Boolean),
    );

  const rawArrival =
    cleanLabel(
      row?.arrival_location,
    ) ||
    rawRoutePlaces[0] ||
    "Trip";

  const rawDeparture =
    cleanLabel(
      row?.departure_location,
    ) ||
    rawRoutePlaces[
      rawRoutePlaces.length - 1
    ] ||
    "";

  const arrival =
    compactRoutePlace(
      rawArrival,
    ) ||
    "Trip";

  const departure =
    compactRoutePlace(
      rawDeparture,
    );

  const fallbackNights =
    parseNightCount(
      row?.no_of_days_and_nights,
    );

  const nights =
    Number(
      details?.nightCount ??
        fallbackNights,
    ) ||
    fallbackNights;

  const days =
    Number(
      details?.dayCount ?? 0,
    ) ||
    Math.max(
      1,
      nights + 1,
    );

  const routeLabel =
    routePlaces.length > 1
      ? routePlaces.join(" → ")
      : departure
        ? arrival +
          " → " +
          departure
        : arrival;

  const highlights =
    extractHighlights(
      itineraryDays,
    );

  const region =
    inferPackageRegion([
      rawArrival,
      rawDeparture,
      ...rawRoutePlaces,
      ...highlights,
    ]);

  const badge =
    inferPackageBadge(
      arrival,
      departure,
      routeLabel,
      highlights,
    );

  const themes =
    inferThemeTags(
      badge,
      [
        region,
        routeLabel,
        ...highlights,
      ],
    );

  const title =
    buildRegionalPackageTitle(
      region,
      badge,
      routeLabel,
      highlights,
      arrival,
    );

  const fallbackImage =
    smartFallbackImage(
      region,
      arrival,
      departure,
      routeLabel,
      highlights.join(" "),
    );

  const pricing =
    extractSmartPackagePricing(
      details,
    );

  const hotelCategory =
    extractSmartHotelCategory(
      details,
    );

  const smartFilterMetadata =
    extractSmartFilterMetadata(
      row,
      details,
    );

  return {
    filterAgentId:
      smartFilterMetadata.agentId,

    filterPreference:
      smartFilterMetadata.preference,

    filterTripStartDate:
      smartFilterMetadata.tripStartDate,

    filterTripEndDate:
      smartFilterMetadata.tripEndDate,

    filterHotelCategoryIds:
      smartFilterMetadata.hotelCategoryIds,

    planId,
    quoteId,

    arrival,
    departure,

    region,
    title,
    routeLabel,

    days,
    nights,

    adults:
      Number(
        details?.adults ??
          row?.total_adult ??
          0,
      ) || 0,

    children:
      Number(
        details?.children ??
          row?.total_children ??
          0,
      ) || 0,

    infants:
      Number(
        (details as any)?.infants ??
          row?.total_infants ??
          0,
      ) || 0,

    hotelCategory,

    pricing,

    fallbackImage,

    image:
      extractImage(
        itineraryDays,
      ) ||
      fallbackImage,

    badge,

    stays:
      buildStays(
        itineraryDays,
        nights,
      ),

    highlights,
    themes,
  };
}

function SmartPackageReferenceCard({
  item,
  onBookNow,
}: {
  item: SmartPackage;
  onBookNow: (
    item: SmartPackage,
  ) => void;
}) {
  return (
    <article className="group overflow-hidden rounded-[18px] border border-[#dce4ee] bg-white shadow-[0_4px_14px_rgba(15,42,86,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(15,42,86,0.16)]">

      <div className="relative h-48 overflow-hidden bg-slate-100">
        <img
          src={
            item.image ||
            item.fallbackImage ||
            FALLBACK_IMAGE
          }
          alt={item.title}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          onError={(event) => {
            const image =
              event.currentTarget;

            if (
              item.fallbackImage &&
              image.src !==
                item.fallbackImage
            ) {
              image.src =
                item.fallbackImage;
              return;
            }

            if (
              image.src !==
              FALLBACK_IMAGE
            ) {
              image.src =
                FALLBACK_IMAGE;
            }
          }}
        />

        <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-[#e31937] px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
          <Sparkles className="h-3.5 w-3.5" />
          {item.badge}
        </div>

        <div className="absolute right-3 top-3 rounded-xl bg-[#263a60]/95 px-3 py-2 text-right text-sm font-bold leading-tight text-white shadow-lg">
          <div>
            {item.nights} Night
            {item.nights === 1
              ? ""
              : "s"}
          </div>

          <div>
            {item.days} Day
            {item.days === 1
              ? ""
              : "s"}
          </div>
        </div>
      </div>

      <div className="relative -mt-5 rounded-t-[22px] bg-white px-4 pb-4 pt-4">

        <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-[#c21f42]">
          <MapPin className="h-4 w-4 shrink-0" />

          <span>
            {item.region}
          </span>
        </div>

        <h3 className="text-xl font-extrabold leading-tight text-[#102a56]">
          {item.title}
        </h3>

        <p className="mt-1.5 min-h-11 text-sm font-medium leading-5 text-[#24436d]">
          {item.routeLabel}
        </p>

        {item.stays.length > 0 && (
          <div className="mt-4 grid grid-cols-4 gap-2">
            {item.stays.map(
              (stay) => (
                <div
                  key={
                    item.quoteId +
                    "-" +
                    stay.location
                  }
                  className="min-w-0 text-center"
                >
                  <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#edf3f8]">
                    <BedDouble className="h-4 w-4 text-[#173f70]" />
                  </div>

                  <div className="mt-1 text-[11px] font-extrabold leading-none text-[#17345d]">
                    {stay.nights}N
                  </div>

                  <div
                    className="mt-1 truncate text-[10px] leading-tight text-slate-600"
                    title={compactRoutePlace(
                      stay.location,
                    )}
                  >
                    {compactRoutePlace(
                      stay.location,
                    )}
                  </div>
                </div>
              ),
            )}
          </div>
        )}

        {item.themes.length > 0 && (
          <div className="mt-4 flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-[#fff0f4] px-3 py-2.5 text-xs font-medium text-[#a52b4c]">
            {item.themes.map(
              (
                theme,
                index,
              ) => (
                <span
                  key={
                    item.quoteId +
                    "-theme-" +
                    theme
                  }
                >
                  {index > 0 && (
                    <span className="mr-2 text-[#d78da4]">
                      |
                    </span>
                  )}

                  {theme}
                </span>
              ),
            )}
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2">

          <Link
            to={
              "/itinerary-details/" +
              encodeURIComponent(
                item.quoteId,
              )
            }
            className="min-w-0 w-full"
          >
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full whitespace-nowrap rounded-lg border-[#17477e] px-2 text-xs font-semibold text-[#17477e] hover:bg-[#eef5fc]"
            >
              View Itinerary
            </Button>
          </Link>

          <Link
            to={
              "/create-itinerary?id=" +
              item.planId
            }
            className="min-w-0 w-full"
          >
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full whitespace-nowrap rounded-lg border-[#17477e] px-2 text-xs font-semibold text-[#17477e] hover:bg-[#eef5fc]"
            >
              Customize
            </Button>
          </Link>

          <button
            type="button"
            onClick={() =>
              onBookNow(item)
            }
            className="h-10 w-full whitespace-nowrap rounded-lg bg-[#e40b2f] px-2 text-xs font-semibold text-white transition hover:bg-[#c90929]"
          >
            Book Now
          </button>

        </div>
      </div>
    </article>
  );
}


type SmartBookingTab =
  | "packages"
  | "rates"
  | "bulk";





function SmartBookingTabs({
  activeTab,
  onChange,
}: {
  activeTab: SmartBookingTab;
  onChange: (tab: SmartBookingTab) => void;
}) {
  const tabs = [
    {
      key: "packages" as const,
      label: "Packages",
      icon: "grid" as BulkReferenceIconKind,
    },
    {
      key: "rates" as const,
      label: "Rates",
      icon: "tag" as BulkReferenceIconKind,
    },
    {
      key: "bulk" as const,
      label: "Bulk Booking",
      icon: "layers" as BulkReferenceIconKind,
    },
  ];

  return (
    <div className="mb-3 flex h-[42px] items-end gap-8 border-b border-[#dde7f2]">
      {tabs.map((tab) => {
        const active = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={[
              "relative flex h-[42px] items-center gap-2 px-1 text-[12px] font-semibold",
              active
                ? "text-[#1168ee]"
                : "text-[#405875]",
            ].join(" ")}
          >
            <BulkReferenceIcon
              kind={tab.icon}
              className="h-[15px] w-[15px]"
            />

            {tab.label}

            {active && (
              <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#1168ee]" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function SmartRateCell({
  value,
}: {
  value: number;
}) {
  return (
    <span
      className={
        value > 0
          ? "font-semibold text-[#17345d]"
          : "text-slate-400"
      }
    >
      {formatSmartMoney(value)}
    </span>
  );
}





function smartRateHotelStars(
  value: string,
) {
  const source =
    String(value || "")
      .toLowerCase();

  const numeric =
    Number(
      source.match(/[1-5]/)?.[0] || 0,
    );

  if (numeric >= 1 && numeric <= 5) {
    return numeric;
  }

  if (source.includes("premium")) {
    return 4;
  }

  if (source.includes("deluxe")) {
    return 4;
  }

  if (source.includes("standard")) {
    return 3;
  }

  return 0;
}

function SmartBookingRateView({
  packages,
}: {
  packages: SmartPackage[];
}) {
  const [
    rateManagerOpen,
    setRateManagerOpen,
  ] =
    useState(false);

  const [
    rateManagerQuoteId,
    setRateManagerQuoteId,
  ] =
    useState("");

  useEffect(() => {
    if (
      packages.length === 0
    ) {
      setRateManagerQuoteId("");
      return;
    }

    const stillExists =
      packages.some(
        (item) =>
          item.quoteId ===
          rateManagerQuoteId,
      );

    if (!stillExists) {
      setRateManagerQuoteId(
        packages[0].quoteId,
      );
    }
  }, [
    packages,
    rateManagerQuoteId,
  ]);

  const selectedRatePackage =
    packages.find(
      (item) =>
        item.quoteId ===
        rateManagerQuoteId,
    ) ||
    packages[0];

  return (
    <>
      <div className="overflow-hidden rounded-[18px] border border-[#dbe6f2] bg-white shadow-[0_5px_22px_rgba(31,76,125,0.07)]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 items-center justify-center text-xl font-bold text-[#7445ec]">
              ◇
            </div>

            <div>
              <h2 className="text-[22px] font-extrabold leading-none text-[#10265a]">
                Package Rates
              </h2>

              <p className="mt-1 text-[12px] text-[#62758f]">
                View and manage published rates for all smart packages across destinations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-full bg-[#edf5ff] px-4 py-2 text-[12px] font-bold text-[#1769df]">
              {packages.length} Packages
            </div>

            <button
              type="button"
              disabled={
                packages.length === 0
              }
              onClick={() =>
                setRateManagerOpen(true)
              }
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#1769e8] px-4 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#0f59c7] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="mr-2 text-lg leading-none">
                +
              </span>

              Add / Update Rates
            </button>
          </div>
        </div>

        <div className="mx-3 mb-3 overflow-x-auto rounded-xl border border-[#d8e3ef]">
          <table className="w-full min-w-[1110px] border-collapse">
            <thead>
              <tr className="bg-[#eff5fb] text-left text-[11px] font-bold text-[#17345d]">
                <th className="w-[300px] border-r border-[#d8e3ef] px-3 py-3">
                  Package
                </th>

                <th className="w-[150px] border-r border-[#d8e3ef] px-3 py-3">
                  Region
                </th>

                <th className="w-[145px] border-r border-[#d8e3ef] px-3 py-3">
                  Hotel Category
                </th>

                <th className="w-[105px] border-r border-[#d8e3ef] px-3 py-3 text-center">
                  Nights / Days
                </th>

                <th className="w-[115px] border-r border-[#d8e3ef] px-3 py-3 text-center">
                  Adult Rate
                  <div className="font-medium text-[#62758f]">
                    (per person)
                  </div>
                </th>

                <th className="w-[115px] border-r border-[#d8e3ef] px-3 py-3 text-center">
                  Child Rate
                  <div className="font-medium text-[#62758f]">
                    (5-11 yrs)
                  </div>
                </th>

                <th className="w-[115px] border-r border-[#d8e3ef] px-3 py-3 text-center">
                  Room Rate
                  <div className="font-medium text-[#62758f]">
                    (per night)
                  </div>
                </th>

                <th className="w-[145px] border-r border-[#d8e3ef] px-3 py-3 text-center">
                  Total Package Rate
                  <div className="font-medium text-[#62758f]">
                    (2 Adults)
                  </div>
                </th>

                <th className="w-[85px] px-3 py-3 text-center">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#dfe8f1]">
              {packages.map((item) => {
                const hotelStars =
                  smartRateHotelStars(
                    item.hotelCategory,
                  );

                return (
                  <tr
                    key={
                      "rate-" +
                      item.quoteId
                    }
                    className="bg-white text-[12px] transition hover:bg-[#fbfdff]"
                  >
                    <td className="border-r border-[#e0e8f1] px-2 py-2">
                      <div className="flex min-w-[270px] items-center gap-3">
                        <img
                          src={
                            item.image ||
                            item.fallbackImage ||
                            FALLBACK_IMAGE
                          }
                          alt=""
                          loading="lazy"
                          onError={(event) => {
                            const image =
                              event.currentTarget;

                            const attempt =
                              Number(
                                image.dataset
                                  .fallbackAttempt ||
                                  0,
                              );

                            if (
                              attempt === 0 &&
                              item.fallbackImage
                            ) {
                              image.dataset.fallbackAttempt =
                                "1";

                              image.src =
                                item.fallbackImage;

                              return;
                            }

                            if (attempt <= 1) {
                              image.dataset.fallbackAttempt =
                                "2";

                              image.onerror =
                                null;

                              image.src =
                                FALLBACK_IMAGE;
                            }
                          }}
                          className="h-[48px] w-[92px] shrink-0 rounded-lg bg-[#edf3f8] object-cover"
                        />

                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-extrabold text-[#10265a]">
                            {item.title}
                          </div>

                          <div className="mt-1 max-w-[165px] truncate text-[10px] text-[#62758f]">
                            {item.themes.join(
                              " • ",
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="border-r border-[#e0e8f1] px-3 py-2">
                      <div className="flex items-center gap-1.5 whitespace-nowrap font-medium text-[#17345d]">
                        <MapPin className="h-4 w-4 shrink-0 fill-[#f21f46] text-[#f21f46]" />

                        {item.region}
                      </div>
                    </td>

                    <td className="border-r border-[#e0e8f1] px-3 py-2">
                      <div className="font-semibold text-[#17345d]">
                        {item.hotelCategory}
                      </div>

                      {hotelStars > 0 && (
                        <div className="mt-1 whitespace-nowrap text-[13px] tracking-[1px]">
                          {Array.from(
                            {
                              length: 5,
                            },
                            (_, index) => (
                              <span
                                key={index}
                                className={
                                  index <
                                  hotelStars
                                    ? "text-[#ff9d00]"
                                    : "text-[#9eb1c9]"
                                }
                              >
                                {index <
                                hotelStars
                                  ? "★"
                                  : "☆"}
                              </span>
                            ),
                          )}
                        </div>
                      )}
                    </td>

                    <td className="border-r border-[#e0e8f1] px-3 py-2 text-center font-semibold leading-5 text-[#17345d]">
                      {item.nights} Nights
                      <br />
                      {item.days} Days
                    </td>

                    <td className="border-r border-[#e0e8f1] px-3 py-2 text-center">
                      <SmartRateCell
                        value={
                          item.pricing
                            .adultRate
                        }
                      />
                    </td>

                    <td className="border-r border-[#e0e8f1] px-3 py-2 text-center">
                      <SmartRateCell
                        value={
                          item.pricing
                            .childWithBedRate
                        }
                      />
                    </td>

                    <td className="border-r border-[#e0e8f1] px-3 py-2 text-center">
                      <SmartRateCell
                        value={
                          item.pricing
                            .roomRatePerNight
                        }
                      />
                    </td>

                    <td className="border-r border-[#e0e8f1] px-2 py-2 text-center">
                      <div className="rounded-lg bg-[#eaf5ff] px-3 py-3 text-[14px] font-extrabold text-[#1769df]">
                        {formatSmartMoney(
                          item.pricing
                            .packageTotal,
                        )}
                      </div>
                    </td>

                    <td className="px-2 py-2 text-center">
                      <Link
                        to={
                          "/itinerary-details/" +
                          encodeURIComponent(
                            item.quoteId,
                          )
                        }
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-[#1769e8] bg-white px-3 text-[12px] font-bold text-[#1769e8] transition hover:bg-[#eef6ff]"
                      >
                        <span className="mr-1.5">
                          ✎
                        </span>

                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {packages.length === 0 && (
            <div className="px-6 py-14 text-center text-sm text-[#62758f]">
              No Smart Booking packages match the current filters.
            </div>
          )}
        </div>
      </div>

      {rateManagerOpen &&
        selectedRatePackage && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#10213d]/45 p-4"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                setRateManagerOpen(
                  false,
                );
              }
            }}
          >
            <div className="w-full max-w-xl rounded-2xl border border-[#dbe6f2] bg-white p-5 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-extrabold text-[#10265a]">
                    Add / Update Rates
                  </h3>

                  <p className="mt-1 text-sm text-[#62758f]">
                    Select a Smart Package and open its persisted rate setup.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setRateManagerOpen(
                      false,
                    )
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1f5f9] text-lg font-bold text-[#52667f]"
                >
                  ×
                </button>
              </div>

              <label className="mt-5 block">
                <span className="mb-2 block text-xs font-bold text-[#24436d]">
                  Package
                </span>

                <select
                  value={
                    selectedRatePackage
                      .quoteId
                  }
                  onChange={(event) =>
                    setRateManagerQuoteId(
                      event.target.value,
                    )
                  }
                  className="h-11 w-full rounded-lg border border-[#d7e1ef] bg-white px-3 text-sm text-[#17345d] outline-none focus:border-[#1769e0]"
                >
                  {packages.map(
                    (item) => (
                      <option
                        key={
                          item.quoteId
                        }
                        value={
                          item.quoteId
                        }
                      >
                        {item.title} —{" "}
                        {item.region}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#f5f8fc] p-3">
                  <div className="text-[11px] text-[#62758f]">
                    Room / Night
                  </div>

                  <div className="mt-1 font-extrabold text-[#17345d]">
                    {formatSmartMoney(
                      selectedRatePackage
                        .pricing
                        .roomRatePerNight,
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-[#edf6ff] p-3">
                  <div className="text-[11px] text-[#62758f]">
                    Package Total
                  </div>

                  <div className="mt-1 font-extrabold text-[#1769e0]">
                    {formatSmartMoney(
                      selectedRatePackage
                        .pricing
                        .packageTotal,
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setRateManagerOpen(
                      false,
                    )
                  }
                  className="h-10 rounded-lg border border-[#cfdcec] bg-white px-5 text-sm font-bold text-[#52667f]"
                >
                  Cancel
                </button>

                <Link
                  to={
                    "/itinerary-details/" +
                    encodeURIComponent(
                      selectedRatePackage
                        .quoteId,
                    )
                  }
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-[#1769e8] px-5 text-sm font-bold text-white transition hover:bg-[#0f59c7]"
                >
                  Open Rate Setup
                </Link>
              </div>
            </div>
          </div>
        )}
    </>
  );
}




type SmartBookingUiIconKind =
  | "layers"
  | "bed"
  | "user"
  | "users"
  | "child"
  | "baby"
  | "receipt";

function SmartBookingUiIcon({
  kind,
  className = "h-4 w-4",
}: {
  kind: SmartBookingUiIconKind;
  className?: string;
}) {
  if (kind === "layers") {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m12 2.8 8 4.2-8 4.2L4 7l8-4.2Z" />
        <path d="m4 12 8 4.2 8-4.2" />
        <path d="m4 17 8 4.2 8-4.2" />
      </svg>
    );
  }

  if (kind === "bed") {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 18v-7" />
        <path d="M21 18v-5a2 2 0 0 0-2-2H9" />
        <path d="M3 14h18" />
        <path d="M6 11V8.5A1.5 1.5 0 0 1 7.5 7h3A1.5 1.5 0 0 1 12 8.5V11" />
        <path d="M3 18v2" />
        <path d="M21 18v2" />
      </svg>
    );
  }

  if (kind === "user") {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="7" r="3" />
        <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
      </svg>
    );
  }

  if (kind === "users") {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20v-1.5A5.5 5.5 0 0 1 9 13h1" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M14 14.5a5 5 0 0 1 6.5 4.8V20" />
      </svg>
    );
  }

  if (kind === "child") {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="7" r="2.5" />
        <path d="M8 13c1.1-1.2 2.4-1.8 4-1.8s2.9.6 4 1.8" />
        <path d="M9 13v3" />
        <path d="M15 13v3" />
        <path d="M7 20c.7-2.7 2.4-4 5-4s4.3 1.3 5 4" />
      </svg>
    );
  }

  if (kind === "baby") {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 4c0-1.2 1-2 2.2-2" />
        <circle cx="12" cy="13" r="7" />
        <circle cx="9.5" cy="12" r=".7" fill="currentColor" stroke="none" />
        <circle cx="14.5" cy="12" r=".7" fill="currentColor" stroke="none" />
        <path d="M9.5 15.5c1.4 1 3.6 1 5 0" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 3h12a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2-2-1.4V5a2 2 0 0 1 2-2Z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </svg>
  );
}


type BulkReferenceIconKind =
  | "grid"
  | "tag"
  | "layers"
  | "pin"
  | "calendar"
  | "hotel"
  | "bed"
  | "adult"
  | "child"
  | "baby"
  | "users"
  | "receipt";

function BulkReferenceIcon({
  kind,
  className = "h-4 w-4",
}: {
  kind: BulkReferenceIconKind;
  className?: string;
}) {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
  };

  if (kind === "grid") {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </svg>
    );
  }

  if (kind === "tag") {
    return (
      <svg {...common}>
        <path d="M20 13 13 20 4 11V4h7l9 9Z" />
        <circle cx="8.5" cy="8.5" r="1" />
      </svg>
    );
  }

  if (kind === "layers") {
    return (
      <svg {...common}>
        <path d="m12 3 8 4-8 4-8-4 8-4Z" />
        <path d="m4 12 8 4 8-4" />
        <path d="m4 17 8 4 8-4" />
      </svg>
    );
  }

  if (kind === "pin") {
    return (
      <svg {...common}>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    );
  }

  if (kind === "calendar") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </svg>
    );
  }

  if (kind === "hotel") {
    return (
      <svg {...common}>
        <path d="M5 21V4h10v17" />
        <path d="M15 9h4v12" />
        <path d="M8 8h2M8 12h2M8 16h2" />
        <path d="M3 21h18" />
      </svg>
    );
  }

  if (kind === "bed") {
    return (
      <svg {...common}>
        <path d="M3 19v-8" />
        <path d="M21 19v-5a2 2 0 0 0-2-2H8" />
        <path d="M3 15h18" />
        <path d="M6 12V9a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 12 9v3" />
      </svg>
    );
  }

  if (kind === "adult") {
    return (
      <svg {...common}>
        <circle cx="12" cy="7" r="3" />
        <path d="M6 20v-2a6 6 0 0 1 12 0v2" />
      </svg>
    );
  }

  if (kind === "child") {
    return (
      <svg {...common}>
        <circle cx="12" cy="7" r="2.5" />
        <path d="M8 13c1.1-1.2 2.4-1.8 4-1.8s2.9.6 4 1.8" />
        <path d="M9 13v3M15 13v3" />
        <path d="M7 20c.8-2.7 2.4-4 5-4s4.2 1.3 5 4" />
      </svg>
    );
  }

  if (kind === "baby") {
    return (
      <svg {...common}>
        <path d="M12 4c0-1.2 1-2 2.2-2" />
        <circle cx="12" cy="13" r="7" />
        <circle cx="9.5" cy="12" r=".7" fill="currentColor" stroke="none" />
        <circle cx="14.5" cy="12" r=".7" fill="currentColor" stroke="none" />
        <path d="M9.5 15.5c1.4 1 3.6 1 5 0" />
      </svg>
    );
  }

  if (kind === "users") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20v-1.5A5.5 5.5 0 0 1 9 13h1" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M14 14.5a5 5 0 0 1 6.5 4.8V20" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M6 3h12a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2-2-1.5V5a2 2 0 0 1 2-2Z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </svg>
  );
}


function SmartCountControl({
  label,
  value,
  min = 0,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  const lower = label.toLowerCase();

  const kind: BulkReferenceIconKind =
    lower.includes("room") ||
    lower.includes("extra")
      ? "bed"
      : lower.includes("infant")
        ? "baby"
        : lower.includes("child")
          ? "child"
          : "adult";

  const tone =
    lower.includes("room")
      ? "bg-[#eaf3ff] text-[#1168ee]"
      : lower.includes("adult")
        ? "bg-[#eef8ff] text-[#1168ee]"
        : lower.includes("extra")
          ? "bg-[#fff0f4] text-[#e91d4d]"
          : lower.includes("infant")
            ? "bg-[#eafafd] text-[#0098ab]"
            : "bg-[#f6efff] text-[#7b39d1]";

  return (
    <div className="h-[53px] rounded-lg border border-[#dce6f2] bg-white px-[9px] py-[6px]">
      <div className="mb-[5px] h-[11px] text-[9px] font-bold leading-[11px] text-[#24436d]">
        {label}

        {(label === "Number of Rooms" ||
          label === "Adults") && (
          <span className="ml-[2px] text-[#ec1643]">
            *
          </span>
        )}
      </div>

      <div className="flex h-[28px] items-center gap-[7px]">
        <div
          className={[
            "flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[7px]",
            tone,
          ].join(" ")}
        >
          <BulkReferenceIcon
            kind={kind}
            className="h-[14px] w-[14px]"
          />
        </div>

        <div className="flex h-[28px] min-w-0 flex-1 items-center justify-between rounded-[7px] border border-[#d9e4f0] bg-[#fbfdff] px-[4px]">
          <button
            type="button"
            onClick={() =>
              onChange(
                Math.max(
                  min,
                  value - 1,
                ),
              )
            }
            className="flex h-[21px] w-[21px] items-center justify-center rounded-[6px] bg-[#f1f5f9] text-[13px] font-bold text-[#91a3b7]"
          >
            −
          </button>

          <span className="text-[11px] font-extrabold text-[#17345d]">
            {value}
          </span>

          <button
            type="button"
            onClick={() =>
              onChange(value + 1)
            }
            className="flex h-[21px] w-[21px] items-center justify-center rounded-[6px] border border-[#cfe0f4] bg-white text-[13px] font-bold text-[#1168ee]"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}


function SmartBookingSummary({
  rooms,
  adults,
  childWithBed,
  childWithoutBed,
  extraBeds,
  infants,
}: {
  rooms: number;
  adults: number;
  childWithBed: number;
  childWithoutBed: number;
  extraBeds: number;
  infants: number;
}) {
  const totalPax =
    adults +
    childWithBed +
    childWithoutBed +
    infants;

  const chargeablePax =
    adults +
    childWithBed +
    childWithoutBed;

  const items = [
    {
      label: "Total Rooms",
      value: rooms,
      kind: "bed" as BulkReferenceIconKind,
      box: "border-[#d7e5fb] bg-[#f7faff]",
      icon: "bg-[#eaf3ff] text-[#1168ee]",
      valueClass: "text-[#17345d]",
    },
    {
      label: "Total Adults",
      value: adults,
      kind: "adult" as BulkReferenceIconKind,
      box: "border-[#d3ecdc] bg-[#f5fcf7]",
      icon: "bg-[#eaf8ef] text-[#14924e]",
      valueClass: "text-[#168044]",
    },
    {
      label: "Child With Bed",
      value: childWithBed,
      kind: "bed" as BulkReferenceIconKind,
      box: "border-[#f0dcc3] bg-[#fff9f1]",
      icon: "bg-[#fff0db] text-[#e97a13]",
      valueClass: "text-[#bd620f]",
    },
    {
      label: "Child No Bed",
      value: childWithoutBed,
      kind: "child" as BulkReferenceIconKind,
      box: "border-[#e4d7f4] bg-[#fbf7ff]",
      icon: "bg-[#f3eaff] text-[#7337c9]",
      valueClass: "text-[#6530ad]",
    },
    {
      label: "Extra Beds",
      value: extraBeds,
      kind: "bed" as BulkReferenceIconKind,
      box: "border-[#f2d7de] bg-[#fff6f7]",
      icon: "bg-[#ffebf0] text-[#e91d4d]",
      valueClass: "text-[#bf2347]",
    },
    {
      label: "Infants",
      value: infants,
      kind: "baby" as BulkReferenceIconKind,
      box: "border-[#cde9ee] bg-[#f2fcfd]",
      icon: "bg-[#e6f9fb] text-[#008c9d]",
      valueClass: "text-[#007986]",
    },
  ];

  return (
    <div className="h-[164px] rounded-xl border border-[#dce6f2] bg-white px-[12px] py-[10px] shadow-[0_3px_14px_rgba(40,76,130,0.05)]">
      <div className="flex h-[31px] items-center gap-[9px]">
        <div className="flex h-[31px] w-[31px] items-center justify-center rounded-[9px] bg-[#eaf3ff] text-[#1168ee]">
          <BulkReferenceIcon
            kind="users"
            className="h-[16px] w-[16px]"
          />
        </div>

        <div>
          <h3 className="text-[13px] font-extrabold leading-[14px] text-[#102a56]">
            Booking Summary
          </h3>

          <p className="mt-[2px] text-[8px] leading-[9px] text-[#60738e]">
            Auto-updates as you modify room details
          </p>
        </div>
      </div>

      <div className="mt-[8px] grid h-[49px] grid-cols-6 gap-[7px]">
        {items.map((item) => (
          <div
            key={item.label}
            className={[
              "rounded-[8px] border px-[7px] py-[6px]",
              item.box,
            ].join(" ")}
          >
            <div className="whitespace-nowrap text-[7px] font-semibold leading-[8px] text-[#53657c]">
              {item.label}
            </div>

            <div className="mt-[5px] flex items-center justify-between">
              <div
                className={[
                  "flex h-[24px] w-[24px] items-center justify-center rounded-[7px]",
                  item.icon,
                ].join(" ")}
              >
                <BulkReferenceIcon
                  kind={item.kind}
                  className="h-[12px] w-[12px]"
                />
              </div>

              <div
                className={[
                  "text-[17px] font-extrabold leading-none",
                  item.valueClass,
                ].join(" ")}
              >
                {item.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-[8px] grid h-[56px] grid-cols-[0.8fr_1.35fr] items-center rounded-[8px] border border-[#f19fc1] bg-[#fff0f6] px-[14px]">
        <div className="flex items-center gap-[11px]">
          <div className="flex h-[32px] w-[32px] items-center justify-center rounded-[9px] bg-[#ffdceb] text-[#e72466]">
            <BulkReferenceIcon
              kind="users"
              className="h-[16px] w-[16px]"
            />
          </div>

          <div>
            <div className="text-[8px] font-bold leading-[9px] text-[#6f3551]">
              Total Pax
            </div>

            <div className="mt-[2px] text-[21px] font-extrabold leading-none text-[#102a56]">
              {totalPax}
            </div>
          </div>
        </div>

        <div className="border-l border-[#efbad0] pl-[15px] text-[8px] leading-[17px] text-[#30496d]">
          <div>
            Chargeable Pax:{" "}
            <strong>{chargeablePax}</strong>
          </div>

          <div>
            Room Occupancy:{" "}
            <strong>
              {rooms}{" "}
              {rooms === 1
                ? "Room"
                : "Rooms"}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function estimateSmartBookingRate(
  item: SmartPackage,
  rooms: number,
  childWithBed: number,
  childWithoutBed: number,
  extraBeds: number,
) {
  const rates =
    item.pricing;

  const nights =
    Math.max(
      1,
      item.nights,
    );

  const roomCost =
    rates.roomRatePerNight > 0
      ? rates.roomRatePerNight *
        nights *
        rooms
      : 0;

  const supplementCost =
    rates.extraBedRate *
      extraBeds *
      nights +
    rates.childWithBedRate *
      childWithBed *
      nights +
    rates.childWithoutBedRate *
      childWithoutBed *
      nights;

  const calculated =
    roomCost +
    supplementCost;

  return calculated > 0
    ? calculated
    : rates.packageTotal;
}






function SmartBookingRateSummary({
  item,
  rooms,
  childWithBed,
  childWithoutBed,
  extraBeds,
}: {
  item: SmartPackage;
  rooms: number;
  childWithBed: number;
  childWithoutBed: number;
  extraBeds: number;
}) {
  const nights =
    Math.max(
      1,
      item.nights,
    );

  const packageRate =
    item.pricing.packageTotal > 0
      ? item.pricing.packageTotal
      : item.pricing.roomRatePerNight > 0
        ? item.pricing.roomRatePerNight *
          nights
        : 0;

  const supplements =
    item.pricing.extraBedRate *
      extraBeds *
      nights +
    item.pricing.childWithBedRate *
      childWithBed *
      nights +
    item.pricing.childWithoutBedRate *
      childWithoutBed *
      nights;

  const subtotal =
    packageRate *
      rooms +
    supplements;

  const tax =
    subtotal > 0
      ? subtotal * 0.12
      : 0;

  const total =
    subtotal + tax;

  return (
    <div className="h-[135px] rounded-xl border border-[#dce6f2] bg-white px-[12px] py-[10px] shadow-[0_3px_14px_rgba(40,76,130,0.05)]">
      <div className="flex h-[31px] items-center gap-[9px]">
        <div className="flex h-[31px] w-[31px] items-center justify-center rounded-[9px] bg-[#eaf3ff] text-[#1168ee]">
          <BulkReferenceIcon
            kind="receipt"
            className="h-[15px] w-[15px]"
          />
        </div>

        <div>
          <h3 className="text-[13px] font-extrabold leading-[14px] text-[#102a56]">
            Rates Summary
          </h3>

          <p className="mt-[2px] text-[8px] leading-[9px] text-[#60738e]">
            Estimated cost based on selected package and occupancy
          </p>
        </div>
      </div>

      <div className="mt-[7px] text-[8px] leading-[13px] text-[#30496d]">
        <div className="flex justify-between">
          <span>Package Rate (per room)</span>
          <strong>{formatSmartMoney(packageRate)}</strong>
        </div>

        <div className="flex justify-between">
          <span>Total Rooms</span>
          <strong>{rooms}</strong>
        </div>

        <div className="mt-[2px] flex justify-between border-t border-[#e2eaf2] pt-[2px] font-bold">
          <span>Subtotal</span>
          <strong>{formatSmartMoney(subtotal)}</strong>
        </div>

        <div className="flex justify-between">
          <span>Taxes & Fees (12%)</span>
          <strong>{formatSmartMoney(tax)}</strong>
        </div>

        <div className="mt-[3px] flex h-[26px] items-center justify-between rounded-[6px] bg-[#e8f4ff] px-[9px]">
          <span className="font-extrabold text-[#1168ee]">
            Total Amount
          </span>

          <strong className="text-[12px] font-extrabold text-[#1168ee]">
            {formatSmartMoney(total)}
          </strong>
        </div>
      </div>
    </div>
  );
}


function SmartBookingBulkBooking({
  packages,
  onContinue,
}: {
  packages: SmartPackage[];
  onContinue: (item: SmartPackage) => void;
}) {
  const [quoteId, setQuoteId] =
    useState("");

  const [travelDate, setTravelDate] =
    useState("");

  const [rooms, setRooms] =
    useState(1);

  const [adults, setAdults] =
    useState(2);

  const [
    childWithBed,
    setChildWithBed,
  ] = useState(0);

  const [
    childWithoutBed,
    setChildWithoutBed,
  ] = useState(0);

  const [
    extraBeds,
    setExtraBeds,
  ] = useState(0);

  const [
    infants,
    setInfants,
  ] = useState(0);

  const [
    validationError,
    setValidationError,
  ] = useState("");

  const selected =
    packages.find(
      (item) =>
        item.quoteId === quoteId,
    );

  const regions =
    Array.from(
      new Set(
        packages
          .map((item) => item.region)
          .filter(Boolean),
      ),
    );

  const categories =
    Array.from(
      new Set(
        packages
          .map(
            (item) =>
              item.hotelCategory,
          )
          .filter(Boolean),
      ),
    );

  const proceed = () => {
    if (!selected) {
      setValidationError(
        "Please select a Package before proceeding.",
      );
      return;
    }

    if (!travelDate) {
      setValidationError(
        "Please select the Travel Date before proceeding.",
      );
      return;
    }

    setValidationError("");

    onContinue({
      ...selected,
      _bulkBooking: {
        travelDate,
        rooms,
        adults,
        childWithBed,
        childWithoutBed,
        extraBeds,
        infants,
      },
    } as SmartPackage);
  };

  return (
    <div className="space-y-[10px]">
      <div className="rounded-xl border border-[#dce6f2] bg-white px-[12px] py-[10px] shadow-[0_3px_14px_rgba(40,76,130,0.05)]">
        <div className="flex h-[30px] items-center gap-[9px]">
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-[#eaf3ff] text-[#1168ee]">
            <BulkReferenceIcon
              kind="layers"
              className="h-[16px] w-[16px]"
            />
          </div>

          <div>
            <h2 className="text-[14px] font-extrabold leading-[15px] text-[#102a56]">
              Bulk Booking
            </h2>

            <p className="mt-[1px] text-[8px] leading-[9px] text-[#60738e]">
              Create multiple room bookings for a package in one go
            </p>
          </div>
        </div>

        <div className="mt-[8px] grid grid-cols-4 gap-[9px]">
          <label className="h-[51px] rounded-lg border border-[#dce6f2] bg-[#fbfdff] px-[8px] py-[6px]">
            <span className="block text-[8px] font-bold leading-[9px] text-[#24436d]">
              Package
              <span className="text-[#ed1645]">*</span>
            </span>

            <div className="mt-[5px] flex h-[28px] items-center gap-[6px]">
              <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[7px] bg-[#eaf3ff] text-[#1168ee]">
                <BulkReferenceIcon
                  kind="pin"
                  className="h-[13px] w-[13px]"
                />
              </div>

              <select
                value={quoteId}
                onChange={(event) => {
                  setQuoteId(
                    event.target.value,
                  );
                  setValidationError("");
                }}
                className="h-[28px] min-w-0 flex-1 rounded-[7px] border border-[#d8e3ef] bg-white px-[7px] text-[9px] text-[#17345d] outline-none"
              >
                <option value="">
                  Select Package
                </option>

                {packages.map((item) => (
                  <option
                    key={item.quoteId}
                    value={item.quoteId}
                  >
                    {item.title}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="h-[51px] rounded-lg border border-[#dce6f2] bg-[#fbfdff] px-[8px] py-[6px]">
            <span className="block text-[8px] font-bold leading-[9px] text-[#24436d]">
              Region
              <span className="text-[#ed1645]">*</span>
            </span>

            <div className="mt-[5px] flex h-[28px] items-center gap-[6px]">
              <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[7px] bg-[#eaf3ff] text-[#1168ee]">
                <BulkReferenceIcon
                  kind="pin"
                  className="h-[13px] w-[13px]"
                />
              </div>

              <select
                value={
                  selected?.region || ""
                }
                onChange={(event) => {
                  const match =
                    packages.find(
                      (item) =>
                        item.region ===
                        event.target.value,
                    );

                  setQuoteId(
                    match?.quoteId || "",
                  );
                }}
                className="h-[28px] min-w-0 flex-1 rounded-[7px] border border-[#d8e3ef] bg-white px-[7px] text-[9px] text-[#17345d] outline-none"
              >
                <option value="">
                  Select Region
                </option>

                {regions.map((region) => (
                  <option
                    key={region}
                    value={region}
                  >
                    {region}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="h-[51px] rounded-lg border border-[#dce6f2] bg-[#fbfdff] px-[8px] py-[6px]">
            <span className="block text-[8px] font-bold leading-[9px] text-[#24436d]">
              Travel Date
              <span className="text-[#ed1645]">*</span>
            </span>

            <div className="mt-[5px] flex h-[28px] items-center gap-[6px]">
              <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[7px] bg-[#eaf3ff] text-[#1168ee]">
                <BulkReferenceIcon
                  kind="calendar"
                  className="h-[13px] w-[13px]"
                />
              </div>

              <input
                type="date"
                value={travelDate}
                onChange={(event) => {
                  setTravelDate(
                    event.target.value,
                  );
                  setValidationError("");
                }}
                className="h-[28px] min-w-0 flex-1 rounded-[7px] border border-[#d8e3ef] bg-white px-[7px] text-[9px] text-[#17345d] outline-none"
              />
            </div>
          </label>

          <label className="h-[51px] rounded-lg border border-[#dce6f2] bg-[#fbfdff] px-[8px] py-[6px]">
            <span className="block text-[8px] font-bold leading-[9px] text-[#24436d]">
              Hotel Category
              <span className="text-[#ed1645]">*</span>
            </span>

            <div className="mt-[5px] flex h-[28px] items-center gap-[6px]">
              <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[7px] bg-[#eaf3ff] text-[#1168ee]">
                <BulkReferenceIcon
                  kind="hotel"
                  className="h-[13px] w-[13px]"
                />
              </div>

              <select
                value={
                  selected?.hotelCategory ||
                  ""
                }
                onChange={(event) => {
                  const match =
                    packages.find(
                      (item) =>
                        item.hotelCategory ===
                        event.target.value,
                    );

                  setQuoteId(
                    match?.quoteId || "",
                  );
                }}
                className="h-[28px] min-w-0 flex-1 rounded-[7px] border border-[#d8e3ef] bg-white px-[7px] text-[9px] text-[#17345d] outline-none"
              >
                <option value="">
                  Select Category
                </option>

                {categories.map(
                  (category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  ),
                )}
              </select>
            </div>
          </label>
        </div>

        <div className="mt-[8px] grid grid-cols-6 gap-[9px]">
          <SmartCountControl
            label="Number of Rooms"
            value={rooms}
            min={1}
            onChange={setRooms}
          />

          <SmartCountControl
            label="Adults"
            value={adults}
            min={1}
            onChange={setAdults}
          />

          <SmartCountControl
            label="Child With Bed"
            value={childWithBed}
            onChange={setChildWithBed}
          />

          <SmartCountControl
            label="Child No Bed"
            value={childWithoutBed}
            onChange={setChildWithoutBed}
          />

          <SmartCountControl
            label="Extra Beds"
            value={extraBeds}
            onChange={setExtraBeds}
          />

          <SmartCountControl
            label="Infants"
            value={infants}
            onChange={setInfants}
          />
        </div>

        {validationError && (
          <div className="mt-[7px] rounded-[6px] border border-red-200 bg-red-50 px-[9px] py-[5px] text-[8px] font-medium text-red-600">
            {validationError}
          </div>
        )}
      </div>

      <div className="grid items-start gap-[10px] xl:grid-cols-[1.46fr_0.94fr]">
        <SmartBookingSummary
          rooms={rooms}
          adults={adults}
          childWithBed={childWithBed}
          childWithoutBed={childWithoutBed}
          extraBeds={extraBeds}
          infants={infants}
        />

        <div>
          {selected ? (
            <SmartBookingRateSummary
              item={selected}
              rooms={rooms}
              childWithBed={childWithBed}
              childWithoutBed={childWithoutBed}
              extraBeds={extraBeds}
            />
          ) : (
            <div className="h-[135px] rounded-xl border border-[#dce6f2] bg-white px-[12px] py-[10px] shadow-[0_3px_14px_rgba(40,76,130,0.05)]">
              <div className="flex h-[31px] items-center gap-[9px]">
                <div className="flex h-[31px] w-[31px] items-center justify-center rounded-[9px] bg-[#eaf3ff] text-[#1168ee]">
                  <BulkReferenceIcon
                    kind="receipt"
                    className="h-[15px] w-[15px]"
                  />
                </div>

                <div>
                  <h3 className="text-[13px] font-extrabold text-[#102a56]">
                    Rates Summary
                  </h3>

                  <p className="text-[8px] text-[#60738e]">
                    Estimated cost based on selected package and occupancy
                  </p>
                </div>
              </div>

              <div className="mt-[8px] space-y-[4px] text-[8px] text-[#30496d]">
                <div className="flex justify-between">
                  <span>Package Rate (per room)</span>
                  <strong>—</strong>
                </div>

                <div className="flex justify-between">
                  <span>Total Rooms</span>
                  <strong>{rooms}</strong>
                </div>

                <div className="flex justify-between border-t border-[#e3eaf2] pt-[3px] font-bold">
                  <span>Subtotal</span>
                  <strong>—</strong>
                </div>

                <div className="flex justify-between">
                  <span>Taxes & Fees (12%)</span>
                  <strong>—</strong>
                </div>

                <div className="flex h-[26px] items-center justify-between rounded-[6px] bg-[#e8f4ff] px-[9px]">
                  <strong className="text-[#1168ee]">
                    Total Amount
                  </strong>

                  <strong className="text-[12px] text-[#1168ee]">
                    —
                  </strong>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={proceed}
            className="mt-[7px] flex h-[36px] w-full items-center justify-center rounded-[7px] bg-[#ef061d] text-[10px] font-bold text-white hover:bg-[#d7051a]"
          >
            <span className="mr-[8px] text-[15px]">
              →
            </span>

            Proceed to Bulk Booking
          </button>
        </div>
      </div>
    </div>
  );
}

function SmartBookingCheckout({
  item,
  onBack,
}: {
  item: SmartPackage;
  onBack: () => void;
}) {
  const draft =
    (item as any)
      ?._bulkBooking ||
    {};

  const rooms =
    Math.max(
      1,
      Number(
        draft.rooms || 1,
      ),
    );

  const adults =
    Math.max(
      1,
      Number(
        draft.adults ||
          item.adults ||
          2,
      ),
    );

  const childWithBed =
    Math.max(
      0,
      Number(
        draft.childWithBed ??
          item.children ??
          0,
      ),
    );

  const childWithoutBed =
    Math.max(
      0,
      Number(
        draft.childWithoutBed ??
          0,
      ),
    );

  const extraBeds =
    Math.max(
      0,
      Number(
        draft.extraBeds ??
          0,
      ),
    );

  const infants =
    Math.max(
      0,
      Number(
        draft.infants ??
          item.infants ??
          0,
      ),
    );

  const travelDate =
    String(
      draft.travelDate || "",
    );

  const nights =
    Math.max(
      1,
      item.nights,
    );

  const roomRate =
    item.pricing
      .roomRatePerNight > 0
      ? item.pricing
          .roomRatePerNight
      : item.pricing
            .packageTotal > 0
        ? item.pricing
            .packageTotal /
          nights
        : 0;

  const roomTotal =
    roomRate *
    nights *
    rooms;

  const extraBedTotal =
    item.pricing
      .extraBedRate *
    extraBeds *
    nights;

  const childTotal =
    item.pricing
        .childWithBedRate *
      childWithBed *
      nights +
    item.pricing
        .childWithoutBedRate *
      childWithoutBed *
      nights;

  const subtotal =
    roomTotal +
    extraBedTotal +
    childTotal;

  const tax =
    subtotal > 0
      ? subtotal * 0.12
      : 0;

  const finalTotal =
    subtotal + tax;

  const highlights =
    Array.from(
      new Set([
        ...(
          Array.isArray(
            (item as any)
              .highlights,
          )
            ? (item as any)
                .highlights
            : []
        ),
        ...item.themes,
        "Comfortable stays",
      ]),
    ).slice(0, 6);

  return (
    <div className="mt-4">
      {/* HEADER + STEPPER */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[28px] font-extrabold leading-tight text-[#102a56]">
            Book Smart Package
          </h2>

          <p className="mt-1 text-[12px] text-[#60738e]">
            Complete the booking details, review rates and confirm your booking
          </p>
        </div>

        <div className="flex min-w-[380px] items-start">
          {[
            [
              "1",
              "Package",
              "View Details",
            ],
            [
              "2",
              "Details",
              "Guest & Rooms",
            ],
            [
              "3",
              "Confirm",
              "Review & Book",
            ],
          ].map(
            (
              [
                number,
                label,
                sub,
              ],
              index,
            ) => (
              <div
                key={number}
                className="relative flex flex-1 justify-center"
              >
                {index < 2 && (
                  <div className="absolute left-[60%] top-[16px] w-[80%] border-t border-dashed border-[#bfd0e5]" />
                )}

                <div className="relative z-10 text-center">
                  <div
                    className={[
                      "mx-auto flex h-8 w-8 items-center justify-center rounded-full border text-xs font-extrabold",
                      index === 0
                        ? "border-[#1769e0] bg-[#1769e0] text-white"
                        : "border-[#bed0e6] bg-white text-[#17345d]",
                    ].join(" ")}
                  >
                    {number}
                  </div>

                  <div
                    className={[
                      "mt-1 text-[11px] font-bold",
                      index === 0
                        ? "text-[#1769e0]"
                        : "text-[#17345d]",
                    ].join(" ")}
                  >
                    {label}
                  </div>

                  <div className="text-[9px] text-[#75869c]">
                    {sub}
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.9fr]">
        {/* LEFT SELECTED PACKAGE */}
        <div className="rounded-2xl border border-[#dce6f2] bg-white p-3 shadow-[0_5px_20px_rgba(40,76,130,0.06)]">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef4ff] text-sm font-extrabold text-[#1769e0]">
              1
            </div>

            <div>
              <h3 className="text-[16px] font-extrabold text-[#102a56]">
                Selected Package
              </h3>

              <p className="text-[10px] text-[#60738e]">
                Review the package details
              </p>
            </div>
          </div>

          <div className="relative h-[205px] overflow-hidden rounded-xl bg-[#eef3f8]">
            <img
              src={
                item.image ||
                item.fallbackImage ||
                FALLBACK_IMAGE
              }
              alt={item.title}
              onError={(event) => {
                const image =
                  event.currentTarget;

                if (
                  item.fallbackImage &&
                  image.src !==
                    item.fallbackImage
                ) {
                  image.src =
                    item.fallbackImage;

                  return;
                }

                image.onerror =
                  null;

                image.src =
                  FALLBACK_IMAGE;
              }}
              className="h-full w-full object-cover"
            />

            <div className="absolute left-3 top-3 rounded-lg bg-[#e31937] px-3 py-1.5 text-[10px] font-bold text-white">
              {item.badge}
            </div>

            <div className="absolute right-3 top-3 rounded-lg bg-[#263a60]/95 px-3 py-1.5 text-center text-[10px] font-bold leading-4 text-white">
              {item.nights} Nights
              <br />
              {item.days} Days
            </div>
          </div>

          <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#17345d]">
            <MapPin className="h-4 w-4 fill-[#ef1745] text-[#ef1745]" />
            {item.region}
          </div>

          <h3 className="mt-1 text-[18px] font-extrabold text-[#102a56]">
            {item.title}
          </h3>

          <p className="mt-1 text-[11px] font-medium leading-5 text-[#24436d]">
            {item.routeLabel}
          </p>

          <p className="mt-3 text-[10px] leading-5 text-[#60738e]">
            {item.themes.length > 0
              ? "Explore " +
                item.themes
                  .join(", ")
                  .toLowerCase() +
                " across this curated Smart Package."
              : "Review the selected Smart Package itinerary and booking details."}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5 border-y border-[#edf1f6] py-3">
            {item.stays
              .slice(0, 4)
              .map((stay) => (
                <div
                  key={
                    item.quoteId +
                    "-" +
                    stay.location
                  }
                  className="flex items-center gap-1 rounded-full bg-[#f2f6fb] px-2 py-1 text-[9px] font-semibold text-[#24436d]"
                >
                  <BedDouble className="h-3 w-3" />

                  {compactRoutePlace(
                    stay.location,
                  )}
                </div>
              ))}
          </div>

          <div className="mt-3 rounded-xl bg-[#fff2f6] p-3">
            <div className="text-[11px] font-extrabold text-[#d51a42]">
              Key Highlights
            </div>

            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-[9px] text-[#24436d]">
              {highlights.map(
                (highlight) => (
                  <div
                    key={highlight}
                    className="flex items-start gap-1.5"
                  >
                    <span className="font-bold text-green-600">
                      ✓
                    </span>

                    <span>
                      {highlight}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-[#f6f9fc] p-2">
              <div className="text-[9px] text-[#75869c]">
                Package Category
              </div>

              <div className="mt-0.5 line-clamp-2 text-[9px] font-bold text-[#17345d]">
                {item.themes.length
                  ? item.themes.join(
                      " | ",
                    )
                  : "—"}
              </div>
            </div>

            <div className="rounded-lg bg-[#f6f9fc] p-2">
              <div className="text-[9px] text-[#75869c]">
                Suitable For
              </div>

              <div className="mt-0.5 text-[9px] font-bold text-[#17345d]">
                —
              </div>
            </div>

            <div className="rounded-lg bg-[#f6f9fc] p-2">
              <div className="text-[9px] text-[#75869c]">
                Best Time
              </div>

              <div className="mt-0.5 text-[9px] font-bold text-[#17345d]">
                {travelDate || "—"}
              </div>
            </div>

            <div className="rounded-lg bg-[#f6f9fc] p-2">
              <div className="text-[9px] text-[#75869c]">
                Transport Type
              </div>

              <div className="mt-0.5 text-[9px] font-bold text-[#17345d]">
                —
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-3">
          {/* RATES */}
          <div className="rounded-2xl border border-[#dce6f2] bg-white p-3 shadow-[0_5px_20px_rgba(40,76,130,0.06)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef4ff] text-sm font-extrabold text-[#1769e0]">
                  2
                </div>

                <div>
                  <h3 className="text-[16px] font-extrabold text-[#102a56]">
                    Rates
                  </h3>

                  <p className="text-[10px] text-[#60738e]">
                    Package cost breakdown (per room basis)
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-[#d7e2ef] bg-[#f8fbff] px-3 py-2 text-[10px] font-semibold text-[#17345d]">
                Currency: INR (₹)
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-[#dce6f2]">
              <div className="grid grid-cols-[2fr_0.8fr_0.6fr_0.6fr_0.9fr] bg-[#eff5fb] px-3 py-2 text-[10px] font-bold text-[#17345d]">
                <div>
                  Item
                </div>

                <div className="text-right">
                  Rate (₹)
                </div>

                <div className="text-center">
                  Nights
                </div>

                <div className="text-center">
                  Rooms
                </div>

                <div className="text-right">
                  Total (₹)
                </div>
              </div>

              <div className="grid grid-cols-[2fr_0.8fr_0.6fr_0.6fr_0.9fr] border-t border-[#e1e9f2] px-3 py-2 text-[10px] text-[#24436d]">
                <div>
                  {item.hotelCategory &&
                  item.hotelCategory !==
                    "Not specified"
                    ? item.hotelCategory +
                      " Room (Double Occupancy)"
                    : "Room (Double Occupancy)"}
                </div>

                <div className="text-right font-bold">
                  {formatSmartMoney(
                    roomRate,
                  )}
                </div>

                <div className="text-center">
                  {nights}
                </div>

                <div className="text-center">
                  {rooms}
                </div>

                <div className="text-right font-bold">
                  {formatSmartMoney(
                    roomTotal,
                  )}
                </div>
              </div>

              <div className="grid grid-cols-[2fr_0.8fr_0.6fr_0.6fr_0.9fr] border-t border-[#e1e9f2] px-3 py-2 text-[10px] text-[#24436d]">
                <div>
                  Extra Bed (Optional)
                </div>

                <div className="text-right font-bold">
                  {formatSmartMoney(
                    item.pricing
                      .extraBedRate,
                  )}
                </div>

                <div className="text-center">
                  {nights}
                </div>

                <div className="text-center">
                  {extraBeds}
                </div>

                <div className="text-right font-bold">
                  {formatSmartMoney(
                    extraBedTotal,
                  )}
                </div>
              </div>

              <div className="grid grid-cols-[2fr_0.8fr_0.6fr_0.6fr_0.9fr] border-t border-[#e1e9f2] px-3 py-2 text-[10px] text-[#24436d]">
                <div>
                  Taxes & Service Charges (12%)
                </div>

                <div className="text-right">
                  -
                </div>

                <div className="text-center">
                  -
                </div>

                <div className="text-center">
                  -
                </div>

                <div className="text-right font-bold">
                  {formatSmartMoney(
                    tax,
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#dce6f2] bg-[#eaf5ff] px-3 py-2.5">
                <strong className="text-[12px] text-[#102a56]">
                  Total Package Cost
                </strong>

                <strong className="text-[17px] font-extrabold text-[#102a56]">
                  {formatSmartMoney(
                    finalTotal,
                  )}
                </strong>
              </div>
            </div>
          </div>

          {/* BOOKING SUMMARY */}
          <SmartBookingSummary
            rooms={rooms}
            adults={adults}
            childWithBed={
              childWithBed
            }
            childWithoutBed={
              childWithoutBed
            }
            extraBeds={extraBeds}
            infants={infants}
          />

          {/* GUEST DETAILS */}
          <div className="rounded-2xl border border-[#dce6f2] bg-white p-3 shadow-[0_5px_20px_rgba(40,76,130,0.06)]">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef4ff] text-sm font-extrabold text-[#1769e0]">
                4
              </div>

              <div>
                <h3 className="text-[16px] font-extrabold text-[#102a56]">
                  Guest / Room Details
                </h3>

                <p className="text-[10px] text-[#60738e]">
                  Enter guest details for the booking
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-[#dce6f2]">
              <div className="flex items-center justify-between bg-[#eff5fb] px-3 py-2">
                <div>
                  <div className="text-[11px] font-bold text-[#17345d]">
                    Room 1
                  </div>

                  <div className="text-[9px] text-[#60738e]">
                    {item.hotelCategory &&
                    item.hotelCategory !==
                      "Not specified"
                      ? item.hotelCategory +
                        " Room (Double Occupancy)"
                      : "Room (Double Occupancy)"}
                  </div>
                </div>

                <div className="text-[10px] font-bold text-[#1769e0]">
                  <span className="inline-flex items-center gap-1">
                    <SmartBookingUiIcon
                      kind="users"
                      className="h-3.5 w-3.5"
                    />
                    {adults} Adults
                  </span>
                </div>
              </div>

              <div className="grid gap-2 p-3 md:grid-cols-2 xl:grid-cols-4">
                <label>
                  <span className="mb-1 block text-[9px] font-bold text-[#24436d]">
                    Guest Name (Primary)
                    <span className="ml-0.5 text-[#ef1745]">
                      *
                    </span>
                  </span>

                  <input
                    type="text"
                    placeholder="Enter full name"
                    className="h-9 w-full rounded-md border border-[#d7e1ef] px-2.5 text-[10px] outline-none focus:border-[#1769e0]"
                  />
                </label>

                <label>
                  <span className="mb-1 block text-[9px] font-bold text-[#24436d]">
                    Email
                  </span>

                  <input
                    type="email"
                    placeholder="Enter email address"
                    className="h-9 w-full rounded-md border border-[#d7e1ef] px-2.5 text-[10px] outline-none focus:border-[#1769e0]"
                  />
                </label>

                <label>
                  <span className="mb-1 block text-[9px] font-bold text-[#24436d]">
                    Phone Number
                  </span>

                  <input
                    type="tel"
                    placeholder="Enter number"
                    className="h-9 w-full rounded-md border border-[#d7e1ef] px-2.5 text-[10px] outline-none focus:border-[#1769e0]"
                  />
                </label>

                <label>
                  <span className="mb-1 block text-[9px] font-bold text-[#24436d]">
                    Special Requests (Optional)
                  </span>

                  <input
                    type="text"
                    placeholder="E.g. ground floor, extra bed, etc."
                    className="h-9 w-full rounded-md border border-[#d7e1ef] px-2.5 text-[10px] outline-none focus:border-[#1769e0]"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* TOTAL */}
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#dce6f2] bg-[#f4f8fc] px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eaf4ff] text-[#1769e0]">
              <SmartBookingUiIcon
                kind="receipt"
                className="h-4 w-4"
              />
            </div>

            <div>
              <div className="text-[12px] font-extrabold text-[#102a56]">
                Total Amount Payable
              </div>

              <div className="text-[9px] text-[#60738e]">
                Inclusive of all taxes and charges
              </div>
            </div>

            <div className="ml-auto text-right">
              <div className="text-[22px] font-extrabold text-[#102a56]">
                {formatSmartMoney(
                  finalTotal,
                )}
              </div>

              <div className="text-[9px] text-[#60738e]">
                for {rooms}{" "}
                {rooms === 1
                  ? "Room"
                  : "Rooms"}{" "}
                ·{" "}
                {adults +
                  childWithBed +
                  childWithoutBed +
                  infants}{" "}
                Guests
              </div>
            </div>

            <button
              type="button"
              onClick={onBack}
              className="h-10 rounded-lg border border-[#1769e0] bg-white px-6 text-[11px] font-bold text-[#1769e0]"
            >
              Back
            </button>

            <Link
              to={
                "/itinerary-details/" +
                encodeURIComponent(
                  item.quoteId,
                )
              }
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#ed071f] px-6 text-[11px] font-bold text-white transition hover:bg-[#cf061b]"
            >
              Confirm Booking
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/*
  Smart Booking details are queued one-at-a-time
  below to keep memory usage stable.
*/

let smartBookingDetailsQueue:
  Promise<void> =
    Promise.resolve();

async function getSmartBookingDetailsSafe(
  quoteId: string,
): Promise<any> {
  const run =
    smartBookingDetailsQueue.then(
      async () => {
        try {
          return await ItineraryService.getDetails(
            quoteId,
          );
        } catch (error) {
          console.warn(
            "[SmartBooking] details unavailable:",
            quoteId,
          );

          return null;
        }
      },
    );

  /*
    Never retain the large API response
    inside the queue itself.
  */
  smartBookingDetailsQueue =
    run.then(
      () => undefined,
      () => undefined,
    );

  return run;
}


/* SMART_MULTI_ROUTE_SELECTION_V2_REAL_CONFIRM */

function smartBookingConfirmationDateTime(
  rawValue: unknown,
  timeValue: string,
) {
  const raw =
    String(
      rawValue ?? "",
    ).trim();

  const time =
    String(
      timeValue || "",
    ).trim();

  if (!raw || !time) {
    return "";
  }

  let year = "";
  let month = "";
  let day = "";

  const isoMatch =
    raw.match(
      /^(\d{4})-(\d{2})-(\d{2})/,
    );

  const dmyMatch =
    raw.match(
      /^(\d{2})[\/-](\d{2})[\/-](\d{4})/,
    );

  if (isoMatch) {
    year = isoMatch[1];
    month = isoMatch[2];
    day = isoMatch[3];
  } else if (dmyMatch) {
    day = dmyMatch[1];
    month = dmyMatch[2];
    year = dmyMatch[3];
  } else {
    const parsed =
      new Date(raw);

    if (
      Number.isNaN(
        parsed.getTime(),
      )
    ) {
      return "";
    }

    year =
      String(
        parsed.getFullYear(),
      );

    month =
      String(
        parsed.getMonth() + 1,
      ).padStart(
        2,
        "0",
      );

    day =
      String(
        parsed.getDate(),
      ).padStart(
        2,
        "0",
      );
  }

  const [
    hourRaw,
    minuteRaw,
  ] =
    time.split(":");

  let hour =
    Number(
      hourRaw,
    );

  const minute =
    String(
      minuteRaw || "00",
    ).padStart(
      2,
      "0",
    );

  if (
    !Number.isFinite(hour)
  ) {
    return "";
  }

  const period =
    hour >= 12
      ? "PM"
      : "AM";

  hour =
    hour % 12;

  if (hour === 0) {
    hour = 12;
  }

  return (
    day +
    "-" +
    month +
    "-" +
    year +
    " " +
    hour +
    ":" +
    minute +
    " " +
    period
  );
}

function SmartBookingMultiRouteReview({
  packages,
  onBack,
  onRemove,
}: {
  packages: SmartPackage[];
  onBack: () => void;
  onRemove: (
    quoteId: string,
  ) => void;
}) {
  const [
    salutation,
    setSalutation,
  ] =
    useState("");

  const [
    guestName,
    setGuestName,
  ] =
    useState("");

  const [
    guestContact,
    setGuestContact,
  ] =
    useState("");

  const [
    guestAge,
    setGuestAge,
  ] =
    useState("");

  const [
    guestEmail,
    setGuestEmail,
  ] =
    useState("");

  const [
    arrivalTime,
    setArrivalTime,
  ] =
    useState("");

  const [
    departureTime,
    setDepartureTime,
  ] =
    useState("");

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    bookingError,
    setBookingError,
  ] =
    useState("");

  const [
    bookingProgress,
    setBookingProgress,
  ] =
    useState("");

  const [
    confirmedQuoteIds,
    setConfirmedQuoteIds,
  ] =
    useState<string[]>([]);

  const totalCost =
    packages.reduce(
      (sum, item) =>
        sum +
        (
          item.pricing?.hasRate
            ? Number(
                item.pricing
                  .packageTotal ||
                  0,
              )
            : 0
        ),
      0,
    );

  const allRoutesConfirmed =
    packages.length > 0 &&
    packages.every(
      (item) =>
        confirmedQuoteIds.includes(
          item.quoteId,
        ),
    );

  const bookingSucceeded =
    allRoutesConfirmed &&
    !bookingError;

  const confirmSelectedRoutes =
    async () => {
      if (
        packages.length < 1 ||
        packages.length > 4
      ) {
        setBookingError(
          "Select between 1 and 4 routes.",
        );
        return;
      }

      if (!salutation) {
        setBookingError(
          "Select guest salutation.",
        );
        return;
      }

      if (
        guestName.trim().length <
        2
      ) {
        setBookingError(
          "Enter the primary guest name.",
        );
        return;
      }

      if (
        guestContact.trim().length <
        7
      ) {
        setBookingError(
          "Enter the primary guest contact number.",
        );
        return;
      }

      const age =
        Number(
          guestAge,
        );

      if (
        !Number.isFinite(age) ||
        age < 1 ||
        age > 120
      ) {
        setBookingError(
          "Enter a valid primary guest age.",
        );
        return;
      }

      if (
        !arrivalTime ||
        !departureTime
      ) {
        setBookingError(
          "Select arrival and departure time.",
        );
        return;
      }

      setBookingError("");
      setSubmitting(true);

      const completed =
        new Set(
          confirmedQuoteIds,
        );

      try {
        for (
          let index = 0;
          index <
          packages.length;
          index += 1
        ) {
          const item =
            packages[index];

          if (
            completed.has(
              item.quoteId,
            )
          ) {
            continue;
          }

          const source =
            item as any;

          const planId =
            Number(
              item.planId ||
                source.itinerary_plan_ID ||
                0,
            );

          const agentId =
            Number(
              source.filterAgentId ||
                source.agentId ||
                source.agent_id ||
                0,
            );

          const tripStart =
            source.filterTripStartDate ||
            source.tripStartDate ||
            source.tripStartDateAndTime ||
            source.trip_start_date_and_time ||
            "";

          const tripEnd =
            source.filterTripEndDate ||
            source.tripEndDate ||
            source.tripEndDateAndTime ||
            source.trip_end_date_and_time ||
            "";

          const arrivalDateTime =
            smartBookingConfirmationDateTime(
              tripStart,
              arrivalTime,
            );

          const departureDateTime =
            smartBookingConfirmationDateTime(
              tripEnd,
              departureTime,
            );

          if (
            !planId ||
            !agentId
          ) {
            throw new Error(
              "Saved route is missing plan or agent information: " +
                item.quoteId,
            );
          }

          if (
            !arrivalDateTime ||
            !departureDateTime
          ) {
            throw new Error(
              "Saved route is missing valid trip dates: " +
                item.quoteId,
            );
          }

          if (
            !item.arrival ||
            !item.departure
          ) {
            throw new Error(
              "Saved route is missing arrival or departure location: " +
                item.quoteId,
            );
          }

          if (
            !item.pricing?.hasRate ||
            Number(
              item.pricing
                .packageTotal ||
                0,
            ) <= 0
          ) {
            throw new Error(
              "Package rate is unavailable for: " +
                item.title,
            );
          }

          setBookingProgress(
            "Confirming route " +
              (index + 1) +
              " of " +
              packages.length +
              ": " +
              item.title,
          );

          await ItineraryService
            .confirmSmartBookingQuotation(
              {
                itinerary_plan_ID:
                  planId,

                agent:
                  agentId,

                primary_guest_salutation:
                  salutation,

                primary_guest_name:
                  guestName.trim(),

                primary_guest_contact_no:
                  guestContact.trim(),

                primary_guest_age:
                  String(age),

                primary_guest_email_id:
                  guestEmail.trim() ||
                  undefined,

                arrival_date_time:
                  arrivalDateTime,

                arrival_place:
                  item.arrival,

                departure_date_time:
                  departureDateTime,

                departure_place:
                  item.departure,

                price_confirmation_type:
                  "old",
              },
            );

          completed.add(
            item.quoteId,
          );

          setConfirmedQuoteIds(
            Array.from(
              completed,
            ),
          );
        }

        setBookingProgress(
          "All selected routes confirmed successfully.",
        );

        window.setTimeout(
          () => {
window.location.assign(
              "/confirmed-itinerary",
            );
          },
          800,
        );
      } catch (
        error: any
      ) {
        const alreadyConfirmed =
          completed.size;

        setBookingError(
          (
            alreadyConfirmed > 0
              ? alreadyConfirmed +
                " route(s) were confirmed successfully before the next route failed. "
              : ""
          ) +
            (
              error?.message ||
              "Unable to confirm selected routes."
            ),
        );

        setBookingProgress(
          "",
        );
      } finally {
        setSubmitting(
          false,
        );
      }
    };

  return (
    <div className="mt-5">
      <div className="mb-5">
        <h2 className="text-3xl font-extrabold text-[#102a56]">
          Selected Routes Confirmation
        </h2>

        <p className="mt-1 text-sm text-[#60738e]">
          Review the selected routes, total package cost and primary guest details.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_0.8fr]">
        <div className="overflow-hidden rounded-2xl border border-[#dce6f2] bg-white shadow-[0_6px_24px_rgba(25,55,95,0.08)]">
          <div className="flex items-center justify-between border-b border-[#e3eaf2] px-6 py-4">
            <div>
              <h3 className="text-lg font-extrabold text-[#102a56]">
                Selected Routes
              </h3>

              <p className="mt-0.5 text-xs text-[#60738e]">
                {packages.length} of 4 routes selected
              </p>
            </div>

            {!submitting &&
              !bookingSucceeded && (
                <button
                  type="button"
                  onClick={onBack}
                  className="rounded-lg border border-[#17477e] bg-white px-4 py-2 text-sm font-semibold text-[#17477e]"
                >
                  Back
                </button>
              )}
          </div>

          <div className="divide-y divide-[#e3eaf2]">
            {packages.map(
              (
                item,
                index,
              ) => {
                const confirmed =
                  confirmedQuoteIds.includes(
                    item.quoteId,
                  );

                return (
                  <div
                    key={
                      item.quoteId
                    }
                    className="grid gap-4 px-5 py-4 md:grid-cols-[35px_70px_minmax(0,1fr)_125px_125px_42px] md:items-center"
                  >
                    <div className="text-sm font-bold text-[#60738e]">
                      {index + 1}
                    </div>

                    <img
                      src={
                        item.image ||
                        item.fallbackImage ||
                        FALLBACK_IMAGE
                      }
                      alt={item.title}
                      className="h-14 w-[70px] rounded-lg object-cover"
                      onError={(event) => {
                        const image =
                          event.currentTarget;

                        if (
                          image.dataset
                            .fallbackApplied ===
                          "1"
                        ) {
                          return;
                        }

                        image.dataset
                          .fallbackApplied =
                          "1";

                        image.src =
                          item.fallbackImage ||
                          FALLBACK_IMAGE;
                      }}
                    />

                    <div className="min-w-0">
                      <div className="font-extrabold text-[#102a56]">
                        {item.title}
                      </div>

                      <div className="mt-1 truncate text-xs text-[#60738e]">
                        {item.routeLabel}
                      </div>

                      <div className="mt-1 text-xs font-semibold text-[#315173]">
                        {item.nights} Nights /{" "}
                        {item.days} Days
                      </div>
                    </div>

                    <div className="text-sm font-semibold text-[#315173]">
                      {confirmed
                        ? "Confirmed"
                        : item.region}
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-[#8090a5]">
                        Package Rate
                      </div>

                      <div className="mt-1 text-base font-extrabold text-[#e40b2f]">
                        {formatSmartMoney(
                          item.pricing
                            .packageTotal,
                        )}
                      </div>
                    </div>

                    {!confirmed &&
                      !submitting ? (
                        <button
                          type="button"
                          onClick={() =>
                            onRemove(
                              item.quoteId,
                            )
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-lg font-bold text-red-600"
                        >
                          ×
                        </button>
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-sm font-black text-green-700">
                          {confirmed
                            ? "✓"
                            : ""}
                        </div>
                      )}
                  </div>
                );
              },
            )}
          </div>

          <div className="border-t border-[#dce6f2] bg-[#f8fbff] px-6 py-5">
            <div className="text-sm font-bold text-[#52667f]">
              Total Cost (
              {packages.length}{" "}
              {packages.length ===
              1
                ? "Route"
                : "Routes"}
              )
            </div>

            <div className="mt-1 text-3xl font-extrabold text-[#0b63d8]">
              {formatSmartMoney(
                totalCost,
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#dce6f2] bg-white p-5 shadow-[0_6px_24px_rgba(25,55,95,0.08)]">
          <h3 className="text-lg font-extrabold text-[#102a56]">
            Guest / Booking Details
          </h3>

          <p className="mt-1 text-xs text-[#60738e]">
            These details will be used for every selected route.
          </p>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-[#52667f]">
                Salutation *
              </span>

              <select
                value={
                  salutation
                }
                disabled={
                  submitting ||
                  bookingSucceeded
                }
                onChange={(event) =>
                  setSalutation(
                    event.target
                      .value,
                  )
                }
                className="h-11 w-full rounded-lg border border-[#cdd9e8] bg-white px-3 text-sm"
              >
                <option value="">
                  Select
                </option>
                <option value="Mr">
                  Mr
                </option>
                <option value="Mrs">
                  Mrs
                </option>
                <option value="Ms">
                  Ms
                </option>
                <option value="Miss">
                  Miss
                </option>
                <option value="Mx">
                  Mx
                </option>
                <option value="Dr">
                  Dr
                </option>
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-bold text-[#52667f]">
                Primary Guest Name *
              </span>

              <input
                value={
                  guestName
                }
                disabled={
                  submitting ||
                  bookingSucceeded
                }
                onChange={(event) =>
                  setGuestName(
                    event.target
                      .value,
                  )
                }
                className="h-11 w-full rounded-lg border border-[#cdd9e8] px-3 text-sm"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="mb-1 block text-xs font-bold text-[#52667f]">
                  Contact *
                </span>

                <input
                  value={
                    guestContact
                  }
                  disabled={
                    submitting ||
                    bookingSucceeded
                  }
                  onChange={(event) =>
                    setGuestContact(
                      event.target
                        .value,
                    )
                  }
                  className="h-11 w-full rounded-lg border border-[#cdd9e8] px-3 text-sm"
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-bold text-[#52667f]">
                  Age *
                </span>

                <input
                  type="number"
                  min="1"
                  max="120"
                  value={
                    guestAge
                  }
                  disabled={
                    submitting ||
                    bookingSucceeded
                  }
                  onChange={(event) =>
                    setGuestAge(
                      event.target
                        .value,
                    )
                  }
                  className="h-11 w-full rounded-lg border border-[#cdd9e8] px-3 text-sm"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-bold text-[#52667f]">
                Email
              </span>

              <input
                type="email"
                value={
                  guestEmail
                }
                disabled={
                  submitting ||
                  bookingSucceeded
                }
                onChange={(event) =>
                  setGuestEmail(
                    event.target
                      .value,
                  )
                }
                className="h-11 w-full rounded-lg border border-[#cdd9e8] px-3 text-sm"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="mb-1 block text-xs font-bold text-[#52667f]">
                  Arrival Time *
                </span>

                <input
                  type="time"
                  value={
                    arrivalTime
                  }
                  disabled={
                    submitting ||
                    bookingSucceeded
                  }
                  onChange={(event) =>
                    setArrivalTime(
                      event.target
                        .value,
                    )
                  }
                  className="h-11 w-full rounded-lg border border-[#cdd9e8] px-3 text-sm"
                />
              </label>

              <label>
                <span className="mb-1 block text-xs font-bold text-[#52667f]">
                  Departure Time *
                </span>

                <input
                  type="time"
                  value={
                    departureTime
                  }
                  disabled={
                    submitting ||
                    bookingSucceeded
                  }
                  onChange={(event) =>
                    setDepartureTime(
                      event.target
                        .value,
                    )
                  }
                  className="h-11 w-full rounded-lg border border-[#cdd9e8] px-3 text-sm"
                />
              </label>
            </div>

            {bookingError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold leading-5 text-red-700">
                {bookingError}
              </div>
            )}

            {bookingProgress && (
              <div
                className={[
                  "rounded-lg border px-4 py-3 text-xs font-semibold",
                  bookingSucceeded
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-blue-200 bg-blue-50 text-blue-700",
                ].join(
                  " ",
                )}
              >
                {bookingProgress}
              </div>
            )}

            <button
              type="button"
              disabled={
                submitting ||
                bookingSucceeded
              }
              onClick={() => {
                if (
                  allRoutesConfirmed &&
                  bookingError
                ) {
                  window.location.assign(
                    "/confirmed-itinerary",
                  );
                  return;
                }

                void confirmSelectedRoutes();
              }}
              className={[
                "flex h-12 w-full items-center justify-center rounded-xl px-5 text-sm font-extrabold text-white transition",
                bookingSucceeded
                  ? "cursor-default bg-green-600"
                  : allRoutesConfirmed &&
                      bookingError
                    ? "bg-[#17477e] hover:bg-[#103864]"
                    : submitting
                    ? "cursor-wait bg-[#9c4c57]"
                    : "bg-[#ed071f] hover:bg-[#cf061b]",
              ].join(
                " ",
              )}
            >
              {bookingSucceeded
                ? "Booking Confirmed"
                : allRoutesConfirmed &&
                    bookingError
                  ? "View Confirmed Itineraries"
                  : submitting
                    ? "Confirming..."
                    : "Confirm Booking"}
            </button>

            {!bookingSucceeded && (
              <button
                type="button"
                disabled={
                  submitting
                }
                onClick={
                  onBack
                }
                className="h-11 w-full rounded-xl border border-[#17477e] bg-white px-5 text-sm font-bold text-[#17477e]"
              >
                Back to Route Selection
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type SmartBookingRouteSuggestion = {
  key: string;
  locationId: number;
  source: string;
  destination: string;
  title: string;
  routeDetails: string;
  routeLabel: string;
  stops: string[];
  nights: number;
  days: number;
  routeData?: RouteData;
};


/* =========================================================
   SMART BOOKING EDITABLE BOOKING SUMMARY

   Displayed immediately below:
   Trip Dates + Hotel Category

   Values remain editable and totals auto-update.
   ========================================================= */
type BookingSummaryState = {
  rooms: number;
  adults: number;
  childWithBed: number;
  childWithoutBed: number;
  extraBeds: number;
  infants: number;
};

const SMART_BOOKING_SUMMARY_STORAGE_KEY =
  "dvi-smart-booking-booking-summary";

const DEFAULT_SMART_BOOKING_SUMMARY: BookingSummaryState = {
  rooms: 1,
  adults: 2,
  childWithBed: 0,
  childWithoutBed: 0,
  extraBeds: 0,
  infants: 0,
};

type SmartBookingEditableSummaryProps = {
  summary: BookingSummaryState;
  setSummary: React.Dispatch<
    React.SetStateAction<BookingSummaryState>
  >;
};

function SmartBookingEditableSummary({
  summary,
  setSummary,
}: SmartBookingEditableSummaryProps) {
  const updateValue = (
    field: keyof BookingSummaryState,
    difference: number,
  ) => {
    setSummary((previous) => {
      const minimum =
        field === "rooms" || field === "adults"
          ? 1
          : 0;

      return {
        ...previous,
        [field]: Math.max(
          minimum,
          previous[field] + difference,
        ),
      };
    });
  };
  const totalPax =
    summary.adults +
    summary.childWithBed +
    summary.childWithoutBed +
    summary.infants;

  const chargeablePax =
    summary.adults +
    summary.childWithBed +
    summary.childWithoutBed;

  const cards = [
    {
      field:
        "rooms" as const,
      label:
        "Total Rooms",
      value:
        summary.rooms,
      box:
        "border-[#cbd9fb] bg-[#f4f7ff]",
      valueClass:
        "text-[#315db8]",
    },

    {
      field:
        "adults" as const,
      label:
        "Total Adults",
      value:
        summary.adults,
      box:
        "border-[#caead7] bg-[#f0fbf5]",
      valueClass:
        "text-[#178447]",
    },

    {
      field:
        "childWithBed" as const,
      label:
        "Child With Bed",
      value:
        summary.childWithBed,
      box:
        "border-[#f0d4b0] bg-[#fff8ef]",
      valueClass:
        "text-[#c86c12]",
    },

    {
      field:
        "childWithoutBed" as const,
      label:
        "Child No Bed",
      value:
        summary.childWithoutBed,
      box:
        "border-[#e3d2f5] bg-[#faf5ff]",
      valueClass:
        "text-[#7141b5]",
    },

    {
      field:
        "extraBeds" as const,
      label:
        "Extra Beds",
      value:
        summary.extraBeds,
      box:
        "border-[#f0d2dc] bg-[#fff4f6]",
      valueClass:
        "text-[#cb3153]",
    },

    {
      field:
        "infants" as const,
      label:
        "Infants",
      value:
        summary.infants,
      box:
        "border-[#c7e8ed] bg-[#effbfc]",
      valueClass:
        "text-[#087d8d]",
    },
  ];

  return (
    <div
      data-smart-booking-summary
      className="mb-5 rounded-xl border border-[#cbdcf4] bg-[#f6f9ff] p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#e9f1ff] text-base font-black text-[#2763c4]">
          ◉
        </div>

        <div>
          <h3 className="text-sm font-bold text-[#102a56]">
            Booking Summary
          </h3>

          <p className="mt-0.5 text-[10px] text-[#71819b]">
            Auto-updates as you modify rooms and passengers
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-[repeat(6,minmax(0,1fr))_1.65fr]">
        {cards.map(
          (card) => (
            <div
              key={card.field}
              className={[
                "rounded-xl border px-3 py-2.5",
                card.box,
              ].join(" ")}
            >
              <div className="text-[10px] font-medium text-[#52667f]">
                {card.label}
              </div>

              <div className="mt-2 flex items-center justify-between gap-1">
                <button
                  type="button"
                  aria-label={
                    "Decrease " +
                    card.label
                  }
                  onClick={() =>
                    updateValue(
                      card.field,
                      -1,
                    )
                  }
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-black/10 bg-white text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  −
                </button>

                <div
                  className={[
                    "min-w-6 text-center text-lg font-extrabold",
                    card.valueClass,
                  ].join(" ")}
                >
                  {card.value}
                </div>

                <button
                  type="button"
                  aria-label={
                    "Increase " +
                    card.label
                  }
                  onClick={() =>
                    updateValue(
                      card.field,
                      1,
                    )
                  }
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-black/10 bg-white text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  +
                </button>
              </div>
            </div>
          ),
        )}

        <div className="rounded-xl border border-[#f1a4c4] bg-[#fff0f7] px-4 py-3">
          <div className="grid grid-cols-[auto_1fr] items-center gap-4">
            <div>
              <div className="text-[10px] font-semibold text-[#793652]">
                Total Pax
              </div>

              <div className="mt-1 text-xl font-extrabold text-[#102a56]">
                {totalPax}
              </div>
            </div>

            <div className="border-l border-[#efbad0] pl-4 text-[10px] leading-5 text-[#425a78]">
              <div>
                Chargeable Pax:{" "}
                <strong>
                  {chargeablePax}
                </strong>
              </div>

              <div>
                Room Occupancy:{" "}
                <strong>
                  {summary.rooms}{" "}
                  {summary.rooms === 1
                    ? "Room"
                    : "Rooms"}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   SMART BOOKING HOTSPOT STATE IMAGE DEFINITIONS

   Images come from the existing Hotspot master.
   No external/random image is used for these states.
   ========================================================= */
const SMART_BOOKING_ROUTE_STATES = [
  {
    state: "Andhra Pradesh",
    stateAliases: ["andhra pradesh"],
    placeHints: [
      "visakhapatnam",
      "vizag",
      "vijayawada",
      "tirupati",
    ],
  },
  {
    state: "Karnataka",
    stateAliases: ["karnataka"],
    placeHints: [
      "bangalore",
      "bengaluru",
      "mysore",
      "mysuru",
      "coorg",
      "madikeri",
      "hampi",
    ],
  },
  {
    state: "Kerala",
    stateAliases: ["kerala"],
    placeHints: [
      "kochi",
      "cochin",
      "munnar",
      "alleppey",
      "alappuzha",
      "thekkady",
      "trivandrum",
      "thiruvananthapuram",
    ],
  },
  {
    state: "Tamil Nadu",
    stateAliases: ["tamil nadu"],
    placeHints: [
      "chennai",
      "madurai",
      "coimbatore",
      "ooty",
      "udagamandalam",
      "kanchipuram",
      "mahabalipuram",
      "tiruvannamalai",
    ],
  },
  {
    state: "Telangana",
    stateAliases: ["telangana"],
    placeHints: [
      "hyderabad",
      "secunderabad",
    ],
  },
  {
    state: "Pondicherry",
    stateAliases: [
      "pondicherry",
      "puducherry",
    ],
    placeHints: [
      "pondicherry",
      "puducherry",
      "auroville",
    ],
  },
] as const;

function getSmartBookingCanonicalState(
  value: unknown,
) {
  const normalized =
    normalizePlace(value);

  if (!normalized) return "";

  for (
    const definition of
    SMART_BOOKING_ROUTE_STATES
  ) {
    if (
      definition.stateAliases.some(
        (alias) =>
          normalized.includes(
            normalizePlace(alias),
          ),
      )
    ) {
      return definition.state;
    }
  }

  return "";
}
/* =========================================================
   SMART BOOKING FIXED STATE FAMOUS IMAGES

   One distinct famous-place photo per supported region.
   This takes priority over Hotspot/fallback image matching.
   ========================================================= */
const SMART_BOOKING_STATE_FAMOUS_IMAGES:
  Record<string, string[]> = {
  "Andhra Pradesh": [
    "https://commons.wikimedia.org/wiki/Special:Redirect/file/Tirupati_temple.jpg?width=1200",
    "https://commons.wikimedia.org/wiki/Special:Redirect/file/Araku_Valley.jpg?width=1200",
    "https://commons.wikimedia.org/wiki/Special:Redirect/file/RK_beach.jpg?width=1200",
    "https://commons.wikimedia.org/wiki/Special:Redirect/file/Kanaka_Durga_Temple.jpg?width=1200",
  ],

  Karnataka: [
    "https://commons.wikimedia.org/wiki/Special:Redirect/file/Mysore_palace%2C_karnataka.jpg?width=1200",
    "https://commons.wikimedia.org/wiki/Special:Redirect/file/Vidhana_Souda_Bangalore.jpg?width=1200",
    "https://commons.wikimedia.org/wiki/Special:Redirect/file/Bangalore_Mysore_Maharaja_Palace.jpg?width=1200",
    "https://commons.wikimedia.org/wiki/Special:Redirect/file/Karnataka_palace.jpg?width=1200",
  ],

  Kerala: [
    "https://commons.wikimedia.org/wiki/Special:Redirect/file/Kerala_back_waters.jpg?width=1200",
    "https://commons.wikimedia.org/wiki/Special:Redirect/file/Kerala_Backwaters_in_Kochi.jpg?width=1200",
    "https://commons.wikimedia.org/wiki/Special:Redirect/file/The_Backwaters_of_Alleppey.jpg?width=1200",
    "https://commons.wikimedia.org/wiki/Special:Redirect/file/Backwaters_of_Alleppey.jpg?width=1200",
  ],

  "Tamil Nadu": [
    "https://commons.wikimedia.org/wiki/Special:Redirect/file/Meenakshi_Temple.jpg?width=1200",
    "https://commons.wikimedia.org/wiki/Special:Redirect/file/Seashore_Temple_at_Mahabalipuram.jpg?width=1200",
    "https://commons.wikimedia.org/wiki/Special:Redirect/file/Shore_Temple_Mahabalipuram_Tamil-Nadu_India.jpg?width=1200",
    "https://commons.wikimedia.org/wiki/Special:Redirect/file/Thanjavur_brihadeeswarar_temple.jpg?width=1200",
  ],

  Telangana: [
    "https://commons.wikimedia.org/wiki/Special:Redirect/file/Charminar_of_Hyderabad_Telangana.jpg?width=1200",
    "https://commons.wikimedia.org/wiki/Special:Redirect/file/Golconda_fort%2C_Hyderabad%2C_Telengana.jpg?width=1200",
    "https://commons.wikimedia.org/wiki/Special:Redirect/file/Charminar%2C_Hyderabad%2C_Telengana.jpg?width=1200",
    "https://commons.wikimedia.org/wiki/Special:Redirect/file/Hussain_sagar_hyderabad.jpg?width=1200",
  ],

  Pondicherry: [
    "https://commons.wikimedia.org/wiki/Special:Redirect/file/Beach_Promenade_in_Pondicherry.jpg?width=1200",
    "https://commons.wikimedia.org/wiki/Special:Redirect/file/Promenade_at_Puducherry.jpg?width=1200",
    "https://commons.wikimedia.org/wiki/Special:Redirect/file/Matri_mandir_of_auroville.jpg?width=1200",
    "https://commons.wikimedia.org/wiki/Special:Redirect/file/Auroville_-_Matrimandir.jpg?width=1200",
  ],
};
/* =========================================================
   SMART BOOKING STATE IMAGE SLIDESHOW
   ========================================================= */
type SmartBookingStateImageSlideshowProps = {
  images: string[];
  alt: string;
  fallbackImage: string;
  startIndex?: number;
};

const SmartBookingStateImageSlideshow = ({
  images,
  alt,
  fallbackImage,
  startIndex = 0,
}: SmartBookingStateImageSlideshowProps) => {
  const uniqueImages = Array.from(
    new Set(
      (images || []).filter(Boolean),
    ),
  ).slice(0, 4);

  const slides =
    uniqueImages.length > 0
      ? uniqueImages
      : [fallbackImage];

  const normalizedStart =
    slides.length > 0
      ? ((startIndex % slides.length) +
          slides.length) %
        slides.length
      : 0;

  const orderedSlides = [
    ...slides.slice(normalizedStart),
    ...slides.slice(0, normalizedStart),
  ];

  if (orderedSlides.length === 1) {
    return (
      <img
        src={orderedSlides[0]}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        onError={(event) => {
          const element = event.currentTarget;

          if (
            element.dataset.fallbackApplied === "1"
          ) {
            return;
          }

          element.dataset.fallbackApplied = "1";
          element.src = fallbackImage;
        }}
      />
    );
  }

  const secondsPerSlide = 3;
  const duration =
    orderedSlides.length * secondsPerSlide;

  return (
    <div className="absolute inset-0">
      <style>{`
        @keyframes smartBookingStateSlide {
          0% { opacity: 1; }
          24% { opacity: 1; }
          25% { opacity: 0; }
          100% { opacity: 0; }
        }
      `}</style>

      {orderedSlides.map(
        (image, imageIndex) => (
          <img
            key={`${image}-${imageIndex}`}
            src={image}
            alt={`${alt} - ${imageIndex + 1}`}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            style={{
              opacity:
                imageIndex === 0 ? 1 : 0,
              animationName: "smartBookingStateSlide",
              animationDuration:
                `${duration}s`,
              animationTimingFunction: "linear",
              animationIterationCount: "infinite",
              animationDelay:
                `${imageIndex * secondsPerSlide}s`,
            }}
            onError={(event) => {
              const element =
                event.currentTarget;

              if (
                element.dataset.fallbackApplied === "1"
              ) {
                return;
              }

              element.dataset.fallbackApplied = "1";
              element.src = fallbackImage;
            }}
          />
        ),
      )}

      <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/35 px-2 py-1">
        {orderedSlides.map(
          (_, dotIndex) => (
            <span
              key={`state-slide-dot-${dotIndex}`}
              className="h-1.5 w-1.5 rounded-full bg-white/85"
            />
          ),
        )}
      </div>
    </div>
  );
};
export const SmartBookingPackages = ({
  arrivalLocation,
  departureLocation,
  locations = [],

  agentId = null,

  itineraryPreference =
    "both",

  tripStartDate = "",
  tripEndDate = "",

  selectedHotelCategoryIds = [],
  hotelCategoryOptions = [],
}: SmartBookingPackagesProps) => {

  /* =====================================================
     SMART BOOKING HOTSPOT STATE IMAGE LOADER
     ===================================================== */
  const [
    smartRouteStateImages,
    setSmartRouteStateImages,
  ] = useState<Record<string, string[]>>({});

  const smartRouteStatePlaceIndex =
    useMemo(() => {
      const result: Record<string, Set<string>> = {};

      for (
        const definition of
        SMART_BOOKING_ROUTE_STATES
      ) {
        result[definition.state] = new Set(
          [
            ...definition.stateAliases,
            ...definition.placeHints,
          ].map(normalizePlace),
        );
      }

      const addPlace = (
        stateValue: unknown,
        placeValue: unknown,
      ) => {
        const state =
          getSmartBookingCanonicalState(
            stateValue,
          );

        const place =
          normalizePlace(placeValue);

        if (
          state &&
          place &&
          place.length >= 3
        ) {
          result[state]?.add(place);
        }
      };

      for (const row of locations || []) {
        addPlace(
          row?.source_state ||
            row?.source_location_state,
          row?.source_location,
        );
        addPlace(
          row?.source_state ||
            row?.source_location_state,
          row?.source_city ||
            row?.source_location_city,
        );

        addPlace(
          row?.destination_state ||
            row?.destination_location_state,
          row?.destination_location,
        );
        addPlace(
          row?.destination_state ||
            row?.destination_location_state,
          row?.destination_city ||
            row?.destination_location_city,
        );
      }

      return result;
    }, [locations]);

  const resolveSmartRouteState = (
    sourceValue: unknown,
    destinationValue: unknown,
    routeValue: unknown,
  ) => {
    const sourceText =
      normalizePlace(sourceValue);

    const destinationText =
      normalizePlace(destinationValue);

    const routeText =
      normalizePlace(routeValue);

    const resolveFromLocation = (
      searchText: string,
    ) => {
      if (!searchText) return "";

      for (const row of locations || []) {
        const sourceCandidates = [
          row?.source_location,
          row?.source_city,
          row?.source_location_city,
        ]
          .map(normalizePlace)
          .filter(Boolean);

        if (
          sourceCandidates.some(
            (candidate) =>
              searchText.includes(candidate) ||
              candidate.includes(searchText),
          )
        ) {
          const state =
            getSmartBookingCanonicalState(
              row?.source_state ||
                row?.source_location_state,
            );

          if (state) return state;
        }

        const destinationCandidates = [
          row?.destination_location,
          row?.destination_city,
          row?.destination_location_city,
        ]
          .map(normalizePlace)
          .filter(Boolean);

        if (
          destinationCandidates.some(
            (candidate) =>
              searchText.includes(candidate) ||
              candidate.includes(searchText),
          )
        ) {
          const state =
            getSmartBookingCanonicalState(
              row?.destination_state ||
                row?.destination_location_state,
            );

          if (state) return state;
        }
      }

      return "";
    };

    const sourceLocationState =
      resolveFromLocation(sourceText);

    if (sourceLocationState) {
      return sourceLocationState;
    }

    for (
      const definition of
      SMART_BOOKING_ROUTE_STATES
    ) {
      if (
        definition.placeHints.some(
          (hint) =>
            sourceText.includes(
              normalizePlace(hint),
            ),
        )
      ) {
        return definition.state;
      }
    }

    const destinationLocationState =
      resolveFromLocation(
        destinationText,
      );

    if (destinationLocationState) {
      return destinationLocationState;
    }

    const directState =
      getSmartBookingCanonicalState(
        [
          sourceValue,
          destinationValue,
          routeValue,
        ].join(" "),
      );

    if (directState) return directState;

    for (
      const definition of
      SMART_BOOKING_ROUTE_STATES
    ) {
      if (
        definition.placeHints.some(
          (hint) =>
            routeText.includes(
              normalizePlace(hint),
            ),
        )
      ) {
        return definition.state;
      }
    }

    return "";
  };

  useEffect(() => {
    let cancelled = false;

    const loadHotspotStateImages =
      async () => {
        try {
          const hotspots =
            await hotspotService.listHotspots();

          const usableHotspots =
            hotspots
              .filter(
                (item) =>
                  Boolean(item.imageUrl),
              )
              .sort(
                (left, right) =>
                  Number(right.priority || 0) -
                  Number(left.priority || 0),
              );

          const nextImages: Record<string, string[]> = {};

          for (
            const definition of
            SMART_BOOKING_ROUTE_STATES
          ) {
            const stateAliases =
              definition.stateAliases.map(
                normalizePlace,
              );

            const placeKeys =
              Array.from(
                smartRouteStatePlaceIndex[
                  definition.state
                ] || [],
              )
                .filter(
                  (value) =>
                    value.length >= 3,
                )
                .sort(
                  (a, b) =>
                    b.length - a.length,
                );

            const exactStateHotspot =
              usableHotspots.find(
                (hotspot) => {
                  const name =
                    normalizePlace(
                      hotspot.name,
                    );

                  const fullText =
                    normalizePlace(
                      [
                        hotspot.name,
                        ...(hotspot.places || []),
                      ].join(" "),
                    );

                  return stateAliases.some(
                    (alias) =>
                      name === alias ||
                      fullText.includes(alias),
                  );
                },
              );

            /* SMART BOOKING STRICT HOTSPOT STATE MATCH */
            const scoredHotspots =
              usableHotspots
                .map((hotspot) => {
                  const name =
                    normalizePlace(hotspot.name);

                  const placeTexts =
                    (hotspot.places || [])
                      .map(normalizePlace)
                      .filter(Boolean);

                  const searchableValues = [
                    name,
                    ...placeTexts,
                  ].filter(Boolean);

                  let score = 0;

                  for (const alias of stateAliases) {
                    if (
                      searchableValues.some(
                        (value) =>
                          value === alias ||
                          value.includes(alias),
                      )
                    ) {
                      score += 1000;
                    }
                  }

                  for (const place of placeKeys) {
                    if (!place || place.length < 3) {
                      continue;
                    }

                    if (
                      searchableValues.some(
                        (value) =>
                          Boolean(value) &&
                          (value === place ||
                            value.includes(place) ||
                            place.includes(value)),
                      )
                    ) {
                      score += Math.max(
                        10,
                        place.length,
                      );
                    }
                  }

                  return {
                    hotspot,
                    score,
                  };
                })
                .filter(
                  (entry) => entry.score > 0,
                )
                .sort((left, right) => {
                  if (right.score !== left.score) {
                    return right.score - left.score;
                  }

                  return (
                    Number(
                      right.hotspot.priority || 0,
                    ) -
                    Number(
                      left.hotspot.priority || 0,
                    )
                  );
                });

            /* SMART BOOKING MULTI STATE HOTSPOT IMAGES */
            const matchedStateImages =
              Array.from(
                new Set(
                  [
                    exactStateHotspot?.imageUrl,
                    ...scoredHotspots.map(
                      (entry) =>
                        entry.hotspot?.imageUrl,
                    ),
                  ].filter(
                    (value): value is string =>
                      Boolean(value),
                  ),
                ),
              ).slice(0, 6);

            if (matchedStateImages.length > 0) {
              nextImages[definition.state] =
                matchedStateImages;
            }
          }

          if (!cancelled) {
            setSmartRouteStateImages(
              nextImages,
            );
          }
        } catch (error) {
          console.warn(
            "[SmartBooking] Could not load Hotspot state images.",
            error,
          );
        }
      };

    void loadHotspotStateImages();

    return () => {
      cancelled = true;
    };
  }, [smartRouteStatePlaceIndex]);

  /* =========================================================
     SMART BOOKING SAVE CONTINUE FLOW
     ========================================================= */
  const [
    bookingSummary,
    setBookingSummary,
  ] = useState<BookingSummaryState>(() => {
    try {
      const raw = sessionStorage.getItem(
        SMART_BOOKING_SUMMARY_STORAGE_KEY,
      );

      if (!raw) {
        return { ...DEFAULT_SMART_BOOKING_SUMMARY };
      }

      const parsed = JSON.parse(raw);

      return {
        rooms: Math.max(
          1,
          Number(parsed?.rooms ?? 1) || 1,
        ),
        adults: Math.max(
          1,
          Number(parsed?.adults ?? 2) || 2,
        ),
        childWithBed: Math.max(
          0,
          Number(parsed?.childWithBed ?? 0) || 0,
        ),
        childWithoutBed: Math.max(
          0,
          Number(parsed?.childWithoutBed ?? 0) || 0,
        ),
        extraBeds: Math.max(
          0,
          Number(parsed?.extraBeds ?? 0) || 0,
        ),
        infants: Math.max(
          0,
          Number(parsed?.infants ?? 0) || 0,
        ),
      };
    } catch {
      return { ...DEFAULT_SMART_BOOKING_SUMMARY };
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(
        SMART_BOOKING_SUMMARY_STORAGE_KEY,
        JSON.stringify(bookingSummary),
      );
    } catch {
      // Continue even when storage is unavailable.
    }
  }, [bookingSummary]);

  const [
    smartBookingSubmitted,
    setSmartBookingSubmitted,
  ] = useState(false);

  const [
    smartBookingSubmitError,
    setSmartBookingSubmitError,
  ] = useState("");

  const [
    recommendedSmartRouteSuggestions,
    setRecommendedSmartRouteSuggestions,
  ] = useState<SmartBookingRouteSuggestion[]>([]);

  const [
    submittedSmartBookingSignature,
    setSubmittedSmartBookingSignature,
  ] = useState("");
  const [
    packages,
    setPackages,
  ] =
    useState<SmartPackage[]>([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<SmartBookingTab>(
      "packages",
    );


  const [
    selectedPackageIds,
    setSelectedPackageIds,
  ] =
    useState<string[]>([]);

  const [
    multiRouteReview,
    setMultiRouteReview,
  ] =
    useState(false);

  const [
    multiRouteMessage,
    setMultiRouteMessage,
  ] =
    useState("");
const [
    bookingPackage,
    setBookingPackage,
  ] =
    useState<SmartPackage | null>(
      null,
    );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const persistedResponse: any =
          await ItineraryService.getSmartBookingPackages();

        const persistedRows =
          Array.isArray(persistedResponse)
            ? persistedResponse
            : Array.isArray(
                persistedResponse?.data,
              )
              ? persistedResponse.data
              : [];

        /*
          Every persisted route variant becomes
          its OWN Smart Booking card.

          R1 -> Card 1
          R2 -> Card 2
          R3 -> Card 3
          R4 -> Card 4
          R5 -> Card 5
        */
        const candidates =
          persistedRows
            .map((row: any) => ({

              /* SMART BOOKING ORIGINAL ROW PRESERVED */
              ...row,
modify:
                Number(
                  row?.planId || 0,
                ),

              itinerary_quote_ID:
                cleanLabel(
                  row?.quoteId,
                ),

              arrival_location:
                cleanLabel(
                  row?.arrivalLocation,
                ),

              departure_location:
                cleanLabel(
                  row?.departureLocation,
                ),

              itinerary_type:
                Number(
                  row?.itineraryType ??
                    1,
                ),

              itinerary_preference:
                Number(
                  row?.itineraryPreference ??
                    0,
                ),

              no_of_days_and_nights:
                String(
                  Number(
                    row?.noOfNights ||
                      0,
                  ),
                ) +
                "&" +
                String(
                  Number(
                    row?.noOfDays ||
                      0,
                  ),
                ),

              total_adult:
                Number(
                  row?.adults || 0,
                ),

              total_children:
                Number(
                  row?.children || 0,
                ),

              total_infants:
                Number(
                  row?.infants || 0,
                ),

              trip_start_date_and_time:
                row?.tripStartDateAndTime,

              trip_end_date_and_time:
                row?.tripEndDateAndTime,

              route_family_base_quote_id:
                cleanLabel(
                  row?.routeFamilyBaseQuoteId,
                ),

              route_variant_index:
                Number(
                  row?.routeVariantIndex ||
                    1,
                ),
            }))
            .filter(
              (row: any) =>
                row.modify > 0 &&
                Boolean(
                  row.itinerary_quote_ID,
                ),
            );

        const results =
          await Promise.allSettled(
            candidates.map(
              async (row: any) => {
                const quoteId =
                  cleanLabel(
                    row?.itinerary_quote_ID ||
                      row?.itinerary_booking_ID,
                  );

                if (!quoteId) {
                  return null;
                }

                const details =
                  (await getSmartBookingDetailsSafe(
                    quoteId,
                  )) as ItineraryDetailsResponse & {
                    itineraryType?: number;
                  };

                return buildPackage(
                  row,
                  details,
                );
              },
            ),
          );

        const cards =
          results
            .filter(
              (
                result,
              ): result is PromiseFulfilledResult<SmartPackage | null> =>
                result.status ===
                "fulfilled",
            )
            .map(
              (result) =>
                result.value,
            )
            .filter(
              (
                item,
              ): item is SmartPackage =>
                Boolean(item),
            );

        if (!cancelled) {
          setPackages(cards);
        }
      } catch (err) {
        console.error(
          "[SMART_BOOKING_PACKAGES_LOAD_FAILED]",
          err,
        );

        if (!cancelled) {
          setError(
            "Unable to load Smart Packages right now.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedArrival =
    useMemo(
      () =>
        resolveSelectedLocation(
          arrivalLocation,
          locations,
        ),
      [
        arrivalLocation,
        locations,
      ],
    );

  const selectedDeparture =
    useMemo(
      () =>
        resolveSelectedLocation(
          departureLocation,
          locations,
        ),
      [
        departureLocation,
        locations,
      ],
    );

  /*
    IMPORTANT:
    Route filtering is only presentation filtering.
    No Create Itinerary data is modified.
  */
  const filteredPackages =
    useMemo(() => {
      const selectedAgentId =
        Number(agentId || 0);

      const selectedPreference =
        smartFilterPreference(
          itineraryPreference,
        );

      const selectedStartDate =
        smartFilterDate(
          tripStartDate,
        );

      const selectedEndDate =
        smartFilterDate(
          tripEndDate,
        );

      /*
        Smart Booking maximum four
        Hotel Categories.
      */
      const selectedCategoryIds =
        selectedHotelCategoryIds
          .slice(0, 4)
          .map(Number)
          .filter(
            (value) =>
              Number.isFinite(value) &&
              value > 0,
          );

      const selectedCategoryLabels =
        selectedCategoryIds
          .map((id) => {
            const option =
              hotelCategoryOptions.find(
                (item: any) =>
                  Number(
                    item?.id ??
                      item?.value,
                  ) === id,
              );

            return smartFilterLabel(
              option?.name ??
                option?.label ??
                option?.title ??
                option?.value,
            );
          })
          .filter(Boolean);

      return packages.filter(
        (item) => {
          const arrivalMatches =
            !selectedArrival ||
            sameLocation(
              item.arrival,
              selectedArrival,
            );

          const departureMatches =
            !selectedDeparture ||
            sameLocation(
              item.departure,
              selectedDeparture,
            );

          const agentMatches =
            selectedAgentId <= 0 ||
            Number(
              item.filterAgentId,
            ) === selectedAgentId;

          const preferenceMatches =
            !selectedPreference ||
            item.filterPreference ===
              selectedPreference;

          const startDateMatches =
            !selectedStartDate ||
            item.filterTripStartDate ===
              selectedStartDate;

          const endDateMatches =
            !selectedEndDate ||
            item.filterTripEndDate ===
              selectedEndDate;

          let categoryMatches =
            true;

          if (
            selectedCategoryIds.length >
            0
          ) {
            const idMatches =
              item.filterHotelCategoryIds.some(
                (id) =>
                  selectedCategoryIds.includes(
                    Number(id),
                  ),
              );

            const packageCategoryLabel =
              smartFilterLabel(
                item.hotelCategory,
              );

            const labelMatches =
              selectedCategoryLabels.some(
                (label) =>
                  Boolean(
                    label &&
                      packageCategoryLabel &&
                      (
                        packageCategoryLabel ===
                          label ||
                        packageCategoryLabel.includes(
                          label,
                        ) ||
                        label.includes(
                          packageCategoryLabel,
                        )
                      ),
                  ),
              );

            categoryMatches =
              idMatches ||
              labelMatches;
          }

          return (
            arrivalMatches &&
            departureMatches &&
            agentMatches &&
            preferenceMatches &&
            startDateMatches &&
            endDateMatches &&
            categoryMatches
          );
        },
      );
    }, [
      packages,

      selectedArrival,
      selectedDeparture,

      agentId,
      itineraryPreference,

      tripStartDate,
      tripEndDate,

      selectedHotelCategoryIds,
      hotelCategoryOptions,
    ]);

  const visiblePackages =
    filteredPackages;

  const selectedPackages =
    useMemo(
      () =>
        selectedPackageIds
          .map((quoteId) =>
            packages.find(
              (item) =>
                item.quoteId ===
                quoteId,
            ),
          )
          .filter(
            (
              item,
            ): item is SmartPackage =>
              Boolean(item),
          ),
      [
        packages,
        selectedPackageIds,
      ],
    );

  useEffect(() => {
    const allowed =
      new Set(
        filteredPackages.map(
          (item) => item.quoteId,
        ),
      );

    setSelectedPackageIds(
      (current) =>
        current.filter((quoteId) =>
          allowed.has(quoteId),
        ),
    );
  }, [filteredPackages]);

  const toggleSmartPackageSelection =
    (item: SmartPackage) => {
      const hasUsableRate =
        Boolean(
          item.pricing?.hasRate &&
            Number(
              item.pricing
                .packageTotal || 0,
            ) > 0,
        );

      if (!hasUsableRate) {
        setMultiRouteMessage(
          "This route cannot be selected until a package rate is available.",
        );
        return;
      }

      setSelectedPackageIds(
        (current) => {
          if (
            current.includes(
              item.quoteId,
            )
          ) {
            setMultiRouteMessage(
              "",
            );

            return current.filter(
              (quoteId) =>
                quoteId !==
                item.quoteId,
            );
          }

          if (
            current.length >= 4
          ) {
            setMultiRouteMessage(
              "You can select maximum 4 routes.",
            );

            return current;
          }

          setMultiRouteMessage(
            "",
          );

          return [
            ...current,
            item.quoteId,
          ];
        },
      );
    };

  const removeSelectedSmartPackage =
    (quoteId: string) => {
      setSelectedPackageIds(
        (current) =>
          current.filter(
            (value) =>
              value !== quoteId,
          ),
      );
    };



  /*
    =========================================================
    SMART BOOKING ADD ROUTE CATALOG

    Existing Smart Packages stay unchanged.

    Additional saved route suggestions come from the REAL
    Locations -> Suggested Routes backend.

    + Add Route writes through:
    locationsApi.addSuggestedRoute(...)
    =========================================================
  */

  /*
    SMART BOOKING SESSION ROUTES FINAL

    ONLY routes created from + Add Route
    are restored after browser refresh.
  */
  const [
    smartRouteSuggestions,
    setSmartRouteSuggestions,
  ] = useState<
    SmartBookingRouteSuggestion[]
  >(() => {
    try {
      const raw =
        sessionStorage.getItem(
          "dvi-smart-booking-added-routes",
        );

      const parsed =
        raw
          ? JSON.parse(raw)
          : [];

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(
        "dvi-smart-booking-added-routes",
        JSON.stringify(
          smartRouteSuggestions,
        ),
      );
    } catch {
      // Browser storage unavailable.
    }
  }, [smartRouteSuggestions]);

  const [
    selectedSuggestedRouteKeys,
    setSelectedSuggestedRouteKeys,
  ] = useState<string[]>(() => {
    try {
      const raw =
        sessionStorage.getItem(
          "dvi-smart-booking-added-route-keys",
        );

      const parsed =
        raw
          ? JSON.parse(raw)
          : [];

      return Array.isArray(parsed)
        ? parsed.slice(0, 4)
        : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(
        "dvi-smart-booking-added-route-keys",
        JSON.stringify(
          selectedSuggestedRouteKeys,
        ),
      );
    } catch {
      // Browser storage unavailable.
    }
  }, [selectedSuggestedRouteKeys]);

  const [
    smartRouteCatalogLoading,
    setSmartRouteCatalogLoading,
  ] = useState(false);

  const [
    smartAddRouteOpen,
    setSmartAddRouteOpen,
  ] = useState(false);

  const [
    smartAddRouteSaving,
    setSmartAddRouteSaving,
  ] = useState(false);

  const [
    smartAddRouteError,
    setSmartAddRouteError,
  ] = useState("");

  const [
    smartAddRouteSource,
    setSmartAddRouteSource,
  ] = useState("");

  const [
    smartAddRouteDestination,
    setSmartAddRouteDestination,
  ] = useState("");

  const [
    smartAddRouteNights,
    setSmartAddRouteNights,
  ] = useState(4);

  const [
    smartAddRouteStops,
    setSmartAddRouteStops,
  ] = useState<string[]>(
    ["", "", "", ""],
  );

  const [
    smartRouteLocationOptions,
    setSmartRouteLocationOptions,
  ] = useState<string[]>([]);

  const [
    smartAddRouteSourceOptions,
    setSmartAddRouteSourceOptions,
  ] = useState<string[]>([]);

  const [
    smartAddRouteDestinationOptions,
    setSmartAddRouteDestinationOptions,
  ] = useState<string[]>([]);

  const totalSmartRouteSelections =
    selectedSuggestedRouteKeys.length;

  /*
    =========================================================
    SMART ADD ROUTE DIRECT MASTER OPTIONS

    Do not depend on async dropdown state for Source.
    Use the existing Create Itinerary Locations master
    already passed into SmartBookingPackages.
    =========================================================
  */
  const smartAddRouteMasterOptions =
    useMemo(() => {
      const names =
        new Map<
          string,
          string
        >();

      const add = (
        value: unknown,
      ) => {
        const name =
          String(
            value ?? "",
          ).trim();

        if (!name) {
          return;
        }

        const key =
          name.toLowerCase();

        if (
          !names.has(key)
        ) {
          names.set(
            key,
            name,
          );
        }
      };

      for (
        const item of
          locations || []
      ) {
        if (
          typeof item ===
          "string"
        ) {
          add(item);
          continue;
        }

        add(item?.name);
        add(
          item?.location_name,
        );
        add(
          item?.source_location,
        );
        add(
          item?.destination_location,
        );
        add(
          item?.sourceLocation,
        );
        add(
          item?.destinationLocation,
        );
      }

      for (
        const item of
          smartRouteSuggestions
      ) {
        add(item.source);
        add(item.destination);

        for (
          const stop of
            item.stops || []
        ) {
          add(stop);
        }
      }

      for (
        const item of
          packages
      ) {
        add(item.arrival);
        add(item.departure);
      }

      return Array.from(
        names.values(),
      )
        .sort(
          (
            left,
            right,
          ) =>
            left.localeCompare(
              right,
            ),
        )
        .map(
          (item) => ({
            value: item,
            label: item,
          }),
        );
    }, [
      locations,
      smartRouteSuggestions,
      packages,
    ]);


  const smartRouteCatalogSource =
    String(
      selectedArrival ||
        arrivalLocation ||
        "",
    ).trim();

  const smartRouteCatalogDestination =
    String(
      selectedDeparture ||
        departureLocation ||
        "",
    ).trim();

  const smartRoutePairReady =
    Boolean(
      smartRouteCatalogSource &&
        smartRouteCatalogDestination,
    );

  const normalizeSmartRouteValue = (
    value: unknown,
  ) =>
    String(value ?? "")
      .trim()
      .toLowerCase();

  const splitSmartRouteStops = (
    value: unknown,
  ) =>
    String(value ?? "")
      .split("→")
      .map((item) =>
        item.trim(),
      )
      .filter(Boolean);

  const mapSmartRouteSuggestionRows = (
    locationId: number,
    source: string,
    destination: string,
    rows: any[],
  ): SmartBookingRouteSuggestion[] =>
    (
      Array.isArray(rows)
        ? rows
        : []
    ).map(
      (row: any, index: number) => {
        const nights =
          Math.max(
            1,
            Number(
              row?.no_of_nights ||
                1,
            ) || 1,
          );

        const routeDetails =
          String(
            row?.route_details ||
              "",
          ).trim();

        const stops =
          splitSmartRouteStops(
            routeDetails,
          );

        const routeLabel =
          [
            source,
            ...stops,
            destination,
          ]
            .map((item) =>
              String(item || "")
                .trim(),
            )
            .filter(Boolean)
            .filter(
              (
                item,
                itemIndex,
                values,
              ) =>
                itemIndex === 0 ||
                normalizeSmartRouteValue(
                  item,
                ) !==
                  normalizeSmartRouteValue(
                    values[
                      itemIndex - 1
                    ],
                  ),
            )
            .join(" → ");

        return {
          key: [
            "suggested",
            locationId,
            String(
              row?.count ??
                index,
            ),
            nights,
            routeDetails,
          ].join(":"),

          locationId,

          source,

          destination,

          title:
            String(
              row?.routes ||
                source +
                  " - " +
                  destination,
            ).trim(),

          routeDetails,

          routeLabel,

          stops,

          nights,

          days:
            nights + 1,
        };
      },
    );

  const smartBookingSearchSignature = JSON.stringify({
    source: normalizeSmartRouteValue(
      smartRouteCatalogSource,
    ),
    destination: normalizeSmartRouteValue(
      smartRouteCatalogDestination,
    ),
    agentId: Number(agentId || 0),
    itineraryPreference,
    tripStartDate,
    tripEndDate,
    hotelCategoryIds: [...selectedHotelCategoryIds]
      .map(Number)
      .filter(Number.isFinite)
      .sort((left, right) => left - right),
    bookingSummary,
  });

  useEffect(() => {
    if (
      submittedSmartBookingSignature &&
      submittedSmartBookingSignature !==
        smartBookingSearchSignature
    ) {
      setSmartBookingSubmitted(false);
      setRecommendedSmartRouteSuggestions([]);
      setSelectedSuggestedRouteKeys([]);
      setSmartBookingSubmitError("");
      setMultiRouteMessage(
        "Smart Booking details changed. Recommended Smart Routes will refresh automatically.",
      );
    }
  }, [
    smartBookingSearchSignature,
    submittedSmartBookingSignature,
  ]);

  const visibleSmartRouteSuggestions =
    useMemo(() => {
      if (!smartBookingSubmitted) {
        return [];
      }

      const requestSource =
        normalizeSmartRouteValue(
          smartRouteCatalogSource,
        );

      const requestDestination =
        normalizeSmartRouteValue(
          smartRouteCatalogDestination,
        );

      const currentManualRoutes =
        smartRouteSuggestions.filter(
          (item) =>
            normalizeSmartRouteValue(
              item.source,
            ) === requestSource &&
            normalizeSmartRouteValue(
              item.destination,
            ) === requestDestination,
        );

      const unique = new Map<
        string,
        SmartBookingRouteSuggestion
      >();

      for (const item of [
        ...recommendedSmartRouteSuggestions,
        ...currentManualRoutes,
      ]) {
        unique.set(item.key, item);
      }

      return Array.from(unique.values());
    }, [
      smartBookingSubmitted,
      recommendedSmartRouteSuggestions,
      smartRouteSuggestions,
      smartRouteCatalogSource,
      smartRouteCatalogDestination,
    ]);
  const resolveSmartRouteLocationPair =
    async (
      source: string,
      destination: string,
    ) => {
      const result =
        await locationsApi.list({
          source,
          destination,
          page: 1,
          pageSize: 200,
        });

      const rows =
        Array.isArray(
          result?.rows,
        )
          ? result.rows
          : [];

      return (
        rows.find(
          (row: any) =>
            normalizeSmartRouteValue(
              row?.source_location,
            ) ===
              normalizeSmartRouteValue(
                source,
              ) &&
            normalizeSmartRouteValue(
              row?.destination_location,
            ) ===
              normalizeSmartRouteValue(
                destination,
              ),
        ) || null
      );
    };

  const loadSmartRouteSuggestionsForPair =
    async (
      source: string,
      destination: string,
    ) => {
      const locationRow =
        await resolveSmartRouteLocationPair(
          source,
          destination,
        );

      if (!locationRow) {
        return [];
      }

      const locationId =
        Number(
          locationRow.location_ID,
        );

      if (
        !Number.isFinite(
          locationId,
        ) ||
        locationId <= 0
      ) {
        return [];
      }

      const response =
        await locationsApi.getSuggestedRoutes(
          locationId,
        );

      return mapSmartRouteSuggestionRows(
        locationId,
        source,
        destination,
        response?.data || [],
      );
    };

  /* =========================================================
     SMART BOOKING DEFAULT ROUTE RECOMMENDATIONS

     Uses the SAME route recommendation endpoint as
     Create Itinerary / DefaultRoutesSuggestions.
     ========================================================= */
  const loadSmartBookingRecommendedRoutes =
    async (
      sourceLocation: string,
      destinationLocation: string,
    ) => {
      const routeDays = Math.max(
        1,
        calculateDaysBetweenDates(
          tripStartDate,
          tripEndDate,
        ),
      );

      const response = await api(
        "/itineraries/default-route-suggestions/v2",
        {
          method: "POST",
          body: {
            _no_of_route_days:
              routeDays,
            _arrival_location:
              sourceLocation,
            _departure_location:
              destinationLocation,
            _formattedStartDate:
              tripStartDate,
            _formattedEndDate:
              tripEndDate,
          },
        },
      ) as {
        success?: boolean;
        no_routes_found?: boolean;
        no_matching_routes_found?: boolean;
        no_routes_message?: string;
        routes?: RouteData[];
      };

      const routeRows =
        response?.success &&
        Array.isArray(response?.routes)
          ? response.routes
          : [];

      const mappedRoutes =
        routeRows.map(
          (route, routeIndex) => {
            const days =
              Array.isArray(route?.days)
                ? route.days
                : [];

            const places: string[] = [];

            const addPlace = (
              value: unknown,
            ) => {
              const name = String(
                value || "",
              ).trim();

              if (!name) return;

              if (
                places.length === 0 ||
                normalizeSmartRouteValue(
                  places[
                    places.length - 1
                  ],
                ) !==
                  normalizeSmartRouteValue(
                    name,
                  )
              ) {
                places.push(name);
              }
            };

            for (const day of days) {
              addPlace(
                day?.sourceLocation,
              );

              addPlace(
                day?.nextLocation,
              );
            }

            if (places.length === 0) {
              addPlace(sourceLocation);
              addPlace(destinationLocation);
            }

            const totalDays =
              Math.max(
                1,
                Number(
                  route?.noOfDays ||
                    days.length ||
                    routeDays,
                ) || 1,
              );

            const overnightStops =
              days
                .slice(0, -1)
                .map((day) =>
                  String(
                    day?.nextLocation ||
                      "",
                  ).trim(),
                )
                .filter(Boolean);

            return {
              key:
                "default-route:" +
                String(
                  route?.routeId ||
                    routeIndex + 1,
                ),

              locationId: 0,

              source:
                sourceLocation,

              destination:
                destinationLocation,

              title:
                sameLocation(
                  sourceLocation,
                  destinationLocation,
                )
                  ? (
                      compactRoutePlace(
                        sourceLocation,
                      ) ||
                      sourceLocation
                    ) +
                    " Round Trip"
                  : (
                      compactRoutePlace(
                        sourceLocation,
                      ) ||
                      sourceLocation
                    ) +
                    " - " +
                    (
                      compactRoutePlace(
                        destinationLocation,
                      ) ||
                      destinationLocation
                    ),

              routeDetails:
                JSON.stringify(days),

              routeLabel:
                places.join(" \u2192 "),

              stops:
                overnightStops.length > 0
                  ? overnightStops
                  : places.slice(
                      0,
                      Math.max(
                        0,
                        places.length - 1,
                      ),
                    ),

              nights:
                Math.max(
                  0,
                  totalDays - 1,
                ),

              days: totalDays,

              routeData: route,
            } satisfies SmartBookingRouteSuggestion;
          },
        );

      return {
        routes: mappedRoutes,
        message: String(
          response?.no_routes_message ||
            "",
        ).trim(),
      };
    };
  const loadSmartBookingRecommendations =
    async () => {
      setSmartBookingSubmitError("");
      setMultiRouteMessage("");

      const preference = String(
        itineraryPreference || "",
      ).trim();

      const sourceLocation = String(
        smartRouteCatalogSource || "",
      ).trim();

      const destinationLocation = String(
        smartRouteCatalogDestination || "",
      ).trim();

      if (
        !["vehicle", "hotel", "both"].includes(
          preference,
        )
      ) {
        setSmartBookingSubmitError(
          "Select Itinerary Preference.",
        );
        return;
      }

      if (
        !Number.isFinite(Number(agentId)) ||
        Number(agentId) <= 0
      ) {
        setSmartBookingSubmitError(
          "Select Agent.",
        );
        return;
      }

      if (!sourceLocation) {
        setSmartBookingSubmitError(
          "Select Arrival.",
        );
        return;
      }

      if (!destinationLocation) {
        setSmartBookingSubmitError(
          "Select Departure.",
        );
        return;
      }

      if (!tripStartDate || !tripEndDate) {
        setSmartBookingSubmitError(
          "Select Trip Dates.",
        );
        return;
      }

      if (tripEndDate < tripStartDate) {
        setSmartBookingSubmitError(
          "Trip end date cannot be before the start date.",
        );
        return;
      }

      if (
        (preference === "hotel" ||
          preference === "both") &&
        selectedHotelCategoryIds.length === 0
      ) {
        setSmartBookingSubmitError(
          "Select at least one Hotel Category.",
        );
        return;
      }

      if (selectedHotelCategoryIds.length > 4) {
        setSmartBookingSubmitError(
          "Maximum 4 Hotel Categories can be selected.",
        );
        return;
      }

      if (bookingSummary.rooms < 1) {
        setSmartBookingSubmitError(
          "Total Rooms must be at least 1.",
        );
        return;
      }

      if (bookingSummary.adults < 1) {
        setSmartBookingSubmitError(
          "Total Adults must be at least 1.",
        );
        return;
      }

      if (
        bookingSummary.childWithBed < 0 ||
        bookingSummary.childWithoutBed < 0 ||
        bookingSummary.extraBeds < 0 ||
        bookingSummary.infants < 0
      ) {
        setSmartBookingSubmitError(
          "Passenger and extra-bed values cannot be negative.",
        );
        return;
      }

      setSmartRouteCatalogLoading(true);

      try {
        const recommendation =
          await loadSmartBookingRecommendedRoutes(
            sourceLocation,
            destinationLocation,
          );

        const recommendedRoutes =
          sortSmartRouteCatalog(
            recommendation.routes,
          );

        setRecommendedSmartRouteSuggestions(
          recommendedRoutes,
        );

        setSelectedSuggestedRouteKeys([]);
        setSubmittedSmartBookingSignature(
          smartBookingSearchSignature,
        );
        setSmartBookingSubmitted(true);

        if (recommendedRoutes.length === 0) {
          setMultiRouteMessage(
            recommendation.message || "No Recommended Smart Routes were found for these itinerary details. You can use + Add Route to create a custom route.",
          );
        }
      } catch (error) {
        console.error(
          "[SmartBooking] recommendation loading failed:",
          error,
        );

        setRecommendedSmartRouteSuggestions([]);
        setSmartBookingSubmitted(false);
        setSmartBookingSubmitError(
          "Unable to prepare Recommended Smart Routes. Please try again.",
        );
      } finally {
        setSmartRouteCatalogLoading(false);
      }
    };

  /* =========================================================
     SMART BOOKING AUTO RECOMMENDATION FLOW

     Same workflow concept as Create Itinerary:
     complete required details -> recommendations appear.
     Save & Continue remains ONLY at the final step.
     ========================================================= */
  useEffect(() => {
    const preference = String(
      itineraryPreference || "",
    ).trim();

    const sourceLocation = String(
      smartRouteCatalogSource || "",
    ).trim();

    const destinationLocation = String(
      smartRouteCatalogDestination || "",
    ).trim();

    const validPreference =
      ["vehicle", "hotel", "both"].includes(
        preference,
      );

    const validAgent =
      Number.isFinite(Number(agentId)) &&
      Number(agentId) > 0;

    const requiresHotelCategory =
      preference === "hotel" ||
      preference === "both";

    const validHotelCategory =
      !requiresHotelCategory ||
      selectedHotelCategoryIds.length > 0;

    const readyForRecommendations =
      validPreference &&
      validAgent &&
      Boolean(sourceLocation) &&
      Boolean(destinationLocation) &&
      Boolean(tripStartDate) &&
      Boolean(tripEndDate) &&
      validHotelCategory;

    if (!readyForRecommendations) {
      setSmartBookingSubmitted(false);
      setSubmittedSmartBookingSignature("");
      setRecommendedSmartRouteSuggestions([]);
      setSelectedSuggestedRouteKeys([]);
      setSmartBookingSubmitError("");
      return;
    }

    void loadSmartBookingRecommendations();
  }, [
    smartBookingSearchSignature,
    smartRouteCatalogSource,
    smartRouteCatalogDestination,
    itineraryPreference,
    agentId,
    tripStartDate,
    tripEndDate,
  ]);
  /*
    =========================================================
    LOAD THE COMPLETE SAVED ROUTE MASTER

    Source:
    Locations -> Suggested Routes

    Requests remain SERIAL to avoid unnecessary load.
    =========================================================
  */
  /*
    =========================================================
    SMART ROUTE FAST PROGRESSIVE LOADER

    Previous version:
    - queried every location serially
    - waited for ALL requests
    - only then rendered cards

    New version:
    - location pages remain controlled
    - suggested-route requests use bounded batches
    - first completed batch renders immediately
    - one slow request cannot freeze the entire catalog
    =========================================================
  */

  const sortSmartRouteCatalog = (
    routes: SmartBookingRouteSuggestion[],
  ) =>
    [...routes].sort(
      (left, right) => {
        const sourceCompare =
          left.source.localeCompare(
            right.source,
          );

        if (
          sourceCompare !== 0
        ) {
          return sourceCompare;
        }

        const destinationCompare =
          left.destination.localeCompare(
            right.destination,
          );

        if (
          destinationCompare !== 0
        ) {
          return destinationCompare;
        }

        return left.title.localeCompare(
          right.title,
        );
      },
    );

  /*
    =========================================================
    SMART BOOKING SINGLE-REQUEST ROUTE CATALOG

    One HTTP call.
    One DB query.
    No per-location browser scan.
    =========================================================
  */
  const loadAllSmartRouteSuggestions =
    async (
      onProgress?: (
        routes:
          SmartBookingRouteSuggestion[],
      ) => void,
    ) => {
      /*
        SMART BOOKING ADD-ROUTE-ONLY MODE

        Do NOT load historical Suggested Routes.
        Smart Booking begins empty.
        Only routes added from + Add Route
        during this page session are displayed.
      */
      const response = {
        data: [] as any[],
      };

      const rawRows =
        Array.isArray(
          response?.data,
        )
          ? response.data
          : [];

      const grouped =
        new Map<
          string,
          {
            locationId: number;
            source: string;
            destination: string;
            rows: any[];
          }
        >();

      for (
        const row of rawRows
      ) {
        const locationId =
          Number(
            row?.location_id ??
              0,
          );

        const source =
          String(
            row?.source_location ??
              "",
          ).trim();

        const destination =
          String(
            row?.destination_location ??
              "",
          ).trim();

        if (
          !locationId ||
          !source ||
          !destination
        ) {
          continue;
        }

        const key =
          [
            locationId,
            source.toLowerCase(),
            destination.toLowerCase(),
          ].join("|");

        if (
          !grouped.has(key)
        ) {
          grouped.set(
            key,
            {
              locationId,
              source,
              destination,
              rows: [],
            },
          );
        }

        grouped
          .get(key)!
          .rows.push({
            count:
              row?.count,

            routes:
              row?.routes,

            no_of_nights:
              row?.no_of_nights,

            route_details:
              row?.route_details,

            modify:
              row?.modify,
          });
      }

      const catalog =
        Array.from(
          grouped.values(),
        )
          .flatMap(
            (group) =>
              mapSmartRouteSuggestionRows(
                group.locationId,
                group.source,
                group.destination,
                group.rows,
              ),
          )
          .sort(
            (
              left,
              right,
            ) => {
              const sourceCompare =
                left.source.localeCompare(
                  right.source,
                );

              if (
                sourceCompare !== 0
              ) {
                return sourceCompare;
              }

              return left.title.localeCompare(
                right.title,
              );
            },
          );

      onProgress?.(
        catalog,
      );

      return catalog;
    };

  /*
    Historical route loading intentionally disabled.

    Smart Booking shows ONLY + Add Route
    routes from the current browser session.
  */
  useEffect(() => {
    setSmartRouteCatalogLoading(
      false,
    );
  }, []);

  /*
    Keep combined Smart Package +
    Suggested Route selection at max 4.

    Existing package selector already
    limits package selection itself.
  */
  useEffect(() => {
    const availableSuggestedSlots =
      Math.max(
        0,
        4 -
          selectedPackageIds.length,
      );

    setSelectedSuggestedRouteKeys(
      (previous) =>
        previous.length >
        availableSuggestedSlots
          ? previous.slice(
              0,
              availableSuggestedSlots,
            )
          : previous,
    );
  }, [
    selectedPackageIds.length,
  ]);

  const toggleSmartSuggestedRoute = (
    key: string,
  ) => {
    const alreadySelected =
      selectedSuggestedRouteKeys.includes(
        key,
      );

    if (alreadySelected) {
      setSelectedSuggestedRouteKeys(
        (previous) =>
          previous.filter(
            (item) =>
              item !== key,
          ),
      );

      setMultiRouteMessage(
        "",
      );

      return;
    }

    if (
      totalSmartRouteSelections >=
      4
    ) {
      setMultiRouteMessage(
        "Maximum 4 routes can be selected.",
      );
      return;
    }

    setSelectedSuggestedRouteKeys(
      (previous) => [
        ...previous,
        key,
      ],
    );

    setMultiRouteMessage("");
  };

  const openSmartAddRoute =
    async () => {
      const source =
        smartRouteCatalogSource;

      const destination =
        smartRouteCatalogDestination;

      setSmartAddRouteSource(
        source,
      );

      setSmartAddRouteDestination(
        destination,
      );

      setSmartAddRouteNights(
        4,
      );

      setSmartAddRouteStops(
        ["", "", "", ""],
      );

      setSmartAddRouteError(
        "",
      );

      setSmartAddRouteOpen(
        true,
      );

      try {
        const dropdowns =
          await locationsApi.dropdowns();

        const values =
          [
            ...(
              Array.isArray(
                dropdowns?.sources,
              )
                ? dropdowns.sources
                : []
            ),
            ...(
              Array.isArray(
                dropdowns?.destinations,
              )
                ? dropdowns.destinations
                : []
            ),
            ...packages.map(
              (item) =>
                item.arrival,
            ),
            ...packages.map(
              (item) =>
                item.departure,
            ),
            source,
            destination,
          ]
            .map((item) =>
              String(item || "")
                .trim(),
            )
            .filter(Boolean);

        const seen =
          new Set<string>();

        const unique =
          values.filter(
            (value) => {
              const key =
                normalizeSmartRouteValue(
                  value,
                );

              if (
                !key ||
                seen.has(key)
              ) {
                return false;
              }

              seen.add(key);
              return true;
            },
          );

        unique.sort(
          (left, right) =>
            left.localeCompare(
              right,
            ),
        );

        setSmartRouteLocationOptions(
          unique,
        );

        const sourceValues =
          [
            ...(
              Array.isArray(
                dropdowns?.sources,
              )
                ? dropdowns.sources
                : []
            ),
            source,
          ]
            .map((item) =>
              String(item || "")
                .trim(),
            )
            .filter(Boolean);

        const uniqueSources =
          Array.from(
            new Map(
              sourceValues.map(
                (item) => [
                  item.toLowerCase(),
                  item,
                ],
              ),
            ).values(),
          ).sort(
            (left, right) =>
              left.localeCompare(
                right,
              ),
          );

        const destinationValues =
          [
            ...(
              Array.isArray(
                dropdowns?.destinations,
              )
                ? dropdowns.destinations
                : []
            ),
            destination,
          ]
            .map((item) =>
              String(item || "")
                .trim(),
            )
            .filter(Boolean);

        const uniqueDestinations =
          Array.from(
            new Map(
              destinationValues.map(
                (item) => [
                  item.toLowerCase(),
                  item,
                ],
              ),
            ).values(),
          ).sort(
            (left, right) =>
              left.localeCompare(
                right,
              ),
          );

        setSmartAddRouteSourceOptions(
          uniqueSources,
        );

        setSmartAddRouteDestinationOptions(
          uniqueDestinations,
        );
      } catch (error) {
        console.warn(
          "[SmartBooking] location dropdowns unavailable:",
          error,
        );
      }
    };

  const handleSmartAddRouteSourceSelect =
    async (
      value: string,
    ) => {
      const source =
        String(
          value || "",
        ).trim();

      setSmartAddRouteSource(
        source,
      );

      setSmartAddRouteDestination(
        "",
      );

      setSmartAddRouteError(
        "",
      );

      if (!source) {
        setSmartAddRouteDestinationOptions(
          [],
        );
        return;
      }

      try {
        const dropdowns =
          await locationsApi.dropdowns({
            source,
          });

        const destinations =
          (
            Array.isArray(
              dropdowns?.destinations,
            )
              ? dropdowns.destinations
              : []
          )
            .map((item) =>
              String(item || "")
                .trim(),
            )
            .filter(Boolean);

        const unique =
          Array.from(
            new Map(
              destinations.map(
                (item) => [
                  item.toLowerCase(),
                  item,
                ],
              ),
            ).values(),
          ).sort(
            (left, right) =>
              left.localeCompare(
                right,
              ),
          );

        setSmartAddRouteDestinationOptions(
          unique,
        );
      } catch (error) {
        console.warn(
          "[SmartBooking] destination dropdown unavailable:",
          error,
        );

        setSmartAddRouteDestinationOptions(
          [],
        );
      }
    };

  /*
    =========================================================
    SMART ADD ROUTE LOCATION MASTER FALLBACK

    Source/Destination options come directly from
    the existing Locations master.

    This avoids an empty dropdown even if the
    lightweight dropdown endpoint returns nothing.
    =========================================================
  */

  useEffect(() => {
    if (!smartAddRouteOpen) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const names =
          new Map<string, string>();

        const addName = (
          value: unknown,
        ) => {
          const name =
            String(
              value ?? "",
            ).trim();

          if (!name) {
            return;
          }

          const key =
            name.toLowerCase();

          if (
            !names.has(key)
          ) {
            names.set(
              key,
              name,
            );
          }
        };

        /*
          First use data already present
          in the Smart Booking screen.
        */
        for (
          const item of
            smartRouteSuggestions
        ) {
          addName(
            item.source,
          );

          addName(
            item.destination,
          );

          for (
            const stop of
              item.stops || []
          ) {
            addName(stop);
          }
        }

        for (
          const item of packages
        ) {
          addName(
            item.arrival,
          );

          addName(
            item.departure,
          );
        }

        for (
          const item of
            locations || []
        ) {
          if (
            typeof item ===
            "string"
          ) {
            addName(item);
            continue;
          }

          addName(
            item?.name,
          );

          addName(
            item?.location_name,
          );

          addName(
            item?.source_location,
          );

          addName(
            item?.destination_location,
          );
        }

        /*
          Then load the REAL Locations master.
        */
        const pageSize = 200;

        let page = 1;
        let totalPages = 1;

        do {
          const response =
            await locationsApi.list({
              page,
              pageSize,
            });

          const rows =
            Array.isArray(
              response?.rows,
            )
              ? response.rows
              : [];

          for (
            const row of rows
          ) {
            addName(
              row?.source_location,
            );

            addName(
              row?.destination_location,
            );
          }

          const total =
            Number(
              response?.total ??
                rows.length,
            ) || rows.length;

          totalPages =
            Math.max(
              1,
              Math.ceil(
                total /
                  pageSize,
              ),
            );

          page += 1;

          /*
            Safety guard.
            Locations normally needs only
            a small number of pages.
          */
          if (page > 30) {
            break;
          }
        } while (
          page <= totalPages
        );

        if (cancelled) {
          return;
        }

        const options =
          Array.from(
            names.values(),
          ).sort(
            (
              left,
              right,
            ) =>
              left.localeCompare(
                right,
              ),
          );

        setSmartAddRouteSourceOptions(
          options,
        );

        setSmartRouteLocationOptions(
          options,
        );

        console.log(
          "[SmartBooking] Add Route source locations loaded:",
          options.length,
        );
      } catch (error) {
        console.error(
          "[SmartBooking] Locations master load failed:",
          error,
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    smartAddRouteOpen,
  ]);

  /*
    Load destinations from the actual
    Location rows for the chosen source.
  */
  useEffect(() => {
    if (
      !smartAddRouteOpen ||
      !smartAddRouteSource.trim()
    ) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const source =
        smartAddRouteSource.trim();

      try {
        const destinationMap =
          new Map<
            string,
            string
          >();

        const addDestination = (
          value: unknown,
        ) => {
          const name =
            String(
              value ?? "",
            ).trim();

          if (!name) {
            return;
          }

          const key =
            name.toLowerCase();

          if (
            !destinationMap.has(
              key,
            )
          ) {
            destinationMap.set(
              key,
              name,
            );
          }
        };

        /*
          Existing saved routes first.
        */
        for (
          const item of
            smartRouteSuggestions
        ) {
          if (
            normalizeSmartRouteValue(
              item.source,
            ) ===
            normalizeSmartRouteValue(
              source,
            )
          ) {
            addDestination(
              item.destination,
            );
          }
        }

        /*
          Existing itinerary data fallback.
        */
        for (
          const item of packages
        ) {
          if (
            normalizeSmartRouteValue(
              item.arrival,
            ) ===
            normalizeSmartRouteValue(
              source,
            )
          ) {
            addDestination(
              item.departure,
            );
          }
        }

        /*
          Real Locations master rows.
        */
        const pageSize = 200;

        let page = 1;
        let totalPages = 1;

        do {
          const response =
            await locationsApi.list({
              page,
              pageSize,
              source,
            });

          const rows =
            Array.isArray(
              response?.rows,
            )
              ? response.rows
              : [];

          for (
            const row of rows
          ) {
            if (
              normalizeSmartRouteValue(
                row?.source_location,
              ) ===
              normalizeSmartRouteValue(
                source,
              )
            ) {
              addDestination(
                row?.destination_location,
              );
            }
          }

          const total =
            Number(
              response?.total ??
                rows.length,
            ) || rows.length;

          totalPages =
            Math.max(
              1,
              Math.ceil(
                total /
                  pageSize,
              ),
            );

          page += 1;

          if (page > 30) {
            break;
          }
        } while (
          page <= totalPages
        );

        if (cancelled) {
          return;
        }

        const destinations =
          Array.from(
            destinationMap.values(),
          ).sort(
            (
              left,
              right,
            ) =>
              left.localeCompare(
                right,
              ),
          );

        setSmartAddRouteDestinationOptions(
          destinations,
        );

        console.log(
          "[SmartBooking] Add Route destinations loaded:",
          source,
          destinations.length,
        );
      } catch (error) {
        console.error(
          "[SmartBooking] destination master load failed:",
          error,
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    smartAddRouteOpen,
    smartAddRouteSource,
  ]);

  const resizeSmartAddRouteStops =
    (nextNights: number) => {
      const safeNights =
        Math.max(
          1,
          Math.min(
            30,
            Math.trunc(
              nextNights ||
                1,
            ),
          ),
        );

      setSmartAddRouteNights(
        safeNights,
      );

      setSmartAddRouteStops(
        (previous) =>
          Array.from(
            {
              length:
                safeNights,
            },
            (
              _,
              index,
            ) =>
              previous[index] ||
              "",
          ),
      );
    };

  const saveSmartAddedRoute =
    async () => {
      const source =
        smartAddRouteSource.trim();

      const destination =
        smartAddRouteDestination.trim();

      const nights =
        Math.max(
          1,
          Number(
            smartAddRouteNights ||
              1,
          ) || 1,
        );

      const stops =
        smartAddRouteStops
          .slice(
            0,
            nights,
          )
          .map((item) =>
            item.trim(),
          );

      setSmartAddRouteError(
        "",
      );

      if (
        !source ||
        !destination
      ) {
        setSmartAddRouteError(
          "Source and destination are required.",
        );
        return;
      }

      if (
        stops.length !== nights ||
        stops.some(
          (item) =>
            !item,
        )
      ) {
        setSmartAddRouteError(
          "Please fill every night-wise route location.",
        );
        return;
      }

      try {
        setSmartAddRouteSaving(
          true,
        );

        const locationRow =
          await resolveSmartRouteLocationPair(
            source,
            destination,
          );

        if (!locationRow) {
          throw new Error(
            "This source/destination pair is not configured in Locations.",
          );
        }

        const locationId =
          Number(
            locationRow.location_ID,
          );

        if (
          !Number.isFinite(
            locationId,
          ) ||
          locationId <= 0
        ) {
          throw new Error(
            "Invalid Locations route record.",
          );
        }

        const routeName =
          source +
          " - " +
          destination;

        const routeDetails =
          stops.join(" → ");

        const saveResult =
          await locationsApi.addSuggestedRoute(
            locationId,
            {
              routes:
                routeName,

              no_of_nights:
                String(
                  nights,
                ),

              route_details:
                routeDetails,
            },
          );

        let savedRows =
          Array.isArray(
            saveResult?.data,
          )
            ? saveResult.data
            : [];

        if (
          savedRows.length ===
          0
        ) {
          const refreshed =
            await locationsApi.getSuggestedRoutes(
              locationId,
            );

          savedRows =
            Array.isArray(
              refreshed?.data,
            )
              ? refreshed.data
              : [];
        }

        /*
          Backend may return older routes for
          this Location pair.

          Smart Booking must display ONLY
          the route just created here.
        */
        /*
          =====================================================
          SMART BOOKING DIRECT NEW ROUTE CARD

          The backend save has already succeeded at this point.

          Do not depend on the backend response having exactly
          the same route_details formatting before displaying
          the newly created route.

          Prefer the persisted mapped row when it can be found.
          Otherwise construct the Smart Booking card directly
          from the values the user just saved.
          =====================================================
        */
        const mappedSavedRoutes =
          mapSmartRouteSuggestionRows(
            locationId,
            source,
            destination,
            savedRows,
          );

        const persistedAddedRoute =
          [...mappedSavedRoutes]
            .reverse()
            .find(
              (item) =>
                item.nights ===
                  nights &&
                normalizeSmartRouteValue(
                  item.routeDetails,
                ) ===
                  normalizeSmartRouteValue(
                    routeDetails,
                  ),
            );

        const directAddedRoute:
          SmartBookingRouteSuggestion =
          persistedAddedRoute || {
            key:
              [
                "smart-new",
                locationId,
                Date.now(),
              ].join(":"),

            locationId,

            source,

            destination,

            title:
              routeName,

            routeDetails,

            routeLabel:
              [
                source,
                ...stops,
                destination,
              ]
                .map(
                  (item) =>
                    String(
                      item || "",
                    ).trim(),
                )
                .filter(Boolean)
                .filter(
                  (
                    item,
                    index,
                    values,
                  ) =>
                    index === 0 ||
                    normalizeSmartRouteValue(
                      item,
                    ) !==
                      normalizeSmartRouteValue(
                        values[
                          index - 1
                        ],
                      ),
                )
                .join(" → "),

            stops:
              [...stops],

            nights,

            days:
              nights + 1,
          };

        const next = [
          directAddedRoute,
        ];

        /*
          Keep only routes added during THIS
          Smart Booking page session.
        */
        setSmartRouteSuggestions(
          (previous) => {
            const combined = [
              ...previous,
              ...next,
            ];

            const unique =
              new Map<
                string,
                SmartBookingRouteSuggestion
              >();

            for (
              const route of combined
            ) {
              unique.set(
                route.key,
                route,
              );
            }

            return Array.from(
              unique.values(),
            );
          },
        );

        const added =
          [...next]
            .reverse()
            .find(
              (item) =>
                item.nights ===
                  nights &&
                normalizeSmartRouteValue(
                  item.routeDetails,
                ) ===
                  normalizeSmartRouteValue(
                    routeDetails,
                  ),
            );

        /*
          Newly created route can be
          selected immediately if space
          remains in max-4 selection.
        */
        setSelectedSuggestedRouteKeys(
          (previous) => {
            if (
              !added ||
              previous.includes(
                added.key,
              )
            ) {
              return previous.slice(
                0,
                4,
              );
            }

            if (
              previous.length >=
              4
            ) {
              return previous.slice(
                0,
                4,
              );
            }

            return [
              ...previous,
              added.key,
            ].slice(
              0,
              4,
            );
          },
        );

        setMultiRouteMessage(
          "Route added. Select up to 4 routes and continue to Create Itinerary.",
        );

        setSmartAddRouteOpen(
          false,
        );
      } catch (error) {
        console.error(
          "[SmartBooking] Add Route failed:",
          error,
        );

        setSmartAddRouteError(
          error instanceof Error
            ? error.message
            : "Failed to add route.",
        );
      } finally {
        setSmartAddRouteSaving(
          false,
        );
      }
    };

  const [
    smartRouteHandoffLoading,
    setSmartRouteHandoffLoading,
  ] = useState(false);

  const continueSmartRoutesToCreateItinerary =
    async () => {
      const selectedPackages =
        packages.filter((item) =>
          selectedPackageIds.includes(
            item.quoteId,
          ),
        );

      const selectedSuggestedRoutes =
        visibleSmartRouteSuggestions.filter(
          (item) =>
            selectedSuggestedRouteKeys.includes(
              item.key,
            ),
        );

      const totalSelectedRoutes =
        selectedPackages.length +
        selectedSuggestedRoutes.length;

      if (
        totalSelectedRoutes < 1 ||
        totalSelectedRoutes > 4
      ) {
        setMultiRouteMessage(
          "Select between 1 and 4 routes.",
        );
        return;
      }

      try {
        setSmartRouteHandoffLoading(true);
        setMultiRouteMessage("");

        /*
          IMPORTANT:
          Detail requests stay SERIAL.
          Never Promise.all() the whole catalog.
        */
        const routePayloads: any[] = [];

        for (
          let index = 0;
          index < selectedPackages.length;
          index += 1
        ) {
          const item =
            selectedPackages[index];

          const details =
            await getSmartBookingDetailsSafe(
              item.quoteId,
            );

          if (!details) {
            throw new Error(
              "Unable to load route details for " +
                item.quoteId,
            );
          }

          const rawDays =
            Array.isArray(details?.days)
              ? details.days
              : [];

          const routeDays =
            rawDays.map(
              (day: any, dayIndex: number) => {
                const source =
                  String(
                    day?.sourceLocation ??
                      day?.source ??
                      day?.location_name ??
                      day?.locationName ??
                      "",
                  ).trim();

                const next =
                  String(
                    day?.nextLocation ??
                      day?.next ??
                      day?.next_visiting_location ??
                      day?.nextVisitingLocation ??
                      "",
                  ).trim();

                const via =
                  String(
                    day?.viaRoute ??
                      day?.via ??
                      day?.via_route ??
                      "",
                  ).trim();

                const directValue =
                  day?.directVisit ??
                  day?.direct_to_next_visiting_place ??
                  false;

                return {
                  dayNo:
                    Number(
                      day?.dayNo ??
                        day?.day ??
                        dayIndex + 1,
                    ) ||
                    dayIndex + 1,

                  date:
                    String(
                      day?.date ??
                        day?.itinerary_route_date ??
                        "",
                    ).trim(),

                  sourceLocation:
                    source ||
                    (dayIndex === 0
                      ? item.arrival
                      : ""),

                  nextLocation:
                    next ||
                    (dayIndex ===
                    rawDays.length - 1
                      ? item.departure
                      : ""),

                  viaRoute: via,

                  directVisit:
                    directValue === true ||
                    directValue === 1 ||
                    String(
                      directValue,
                    )
                      .trim()
                      .toLowerCase() ===
                      "yes",
                };
              },
            );

          /*
            Fallback for an older details response:
            construct route rows from the visible route label.
          */
          if (routeDays.length === 0) {
            const places =
              String(
                item.routeLabel || "",
              )
                .split("→")
                .map((value) =>
                  value.trim(),
                )
                .filter(Boolean);

            const totalDays =
              Math.max(
                1,
                Number(item.days || 1),
              );

            for (
              let dayIndex = 0;
              dayIndex < totalDays;
              dayIndex += 1
            ) {
              routeDays.push({
                dayNo: dayIndex + 1,
                date: "",
                sourceLocation:
                  places[
                    Math.min(
                      dayIndex,
                      Math.max(
                        0,
                        places.length - 1,
                      ),
                    )
                  ] ||
                  (dayIndex === 0
                    ? item.arrival
                    : ""),
                nextLocation:
                  places[
                    Math.min(
                      dayIndex + 1,
                      Math.max(
                        0,
                        places.length - 1,
                      ),
                    )
                  ] ||
                  (dayIndex ===
                  totalDays - 1
                    ? item.departure
                    : ""),
                viaRoute: "",
                directVisit: false,
              });
            }
          }

          routePayloads.push({
            routeId:
              Number(item.planId) ||
              index + 1,

            routeName:
              String(
                item.title ||
                  item.routeLabel ||
                  item.quoteId,
              ),

            noOfDays:
              Math.max(
                1,
                Number(
                  item.days ||
                    routeDays.length ||
                    1,
                ),
              ),

            days: routeDays,

            smartBooking: {
              quoteId: item.quoteId,
              planId: item.planId,
              title: item.title,
              routeLabel:
                item.routeLabel,
              arrival: item.arrival,
              departure: item.departure,
              region: item.region,
              image:
                item.image ||
                item.fallbackImage ||
                "",
              badge: item.badge,
              nights: item.nights,
              days: item.days,
              packageRate:
                Number(
                  item.pricing
                    ?.packageTotal || 0,
                ),
            },
          });
        }

        /*
          Add persisted Locations Suggested Routes
          to the SAME Create Itinerary RouteData handoff.
        */
        selectedSuggestedRoutes.forEach(
          (
            suggestion,
            suggestionIndex,
          ) => {
            const chain =
              [
                suggestion.source,
                ...suggestion.stops,
                suggestion.destination,
              ]
                .map((item) =>
                  String(
                    item || "",
                  ).trim(),
                )
                .filter(Boolean)
                .filter(
                  (
                    item,
                    itemIndex,
                    values,
                  ) =>
                    itemIndex === 0 ||
                    normalizeSmartRouteValue(
                      item,
                    ) !==
                      normalizeSmartRouteValue(
                        values[
                          itemIndex -
                            1
                        ],
                      ),
                );

            const noOfDays =
              Math.max(
                1,
                suggestion.nights +
                  1,
              );

            const days =
              Array.from(
                {
                  length:
                    noOfDays,
                },
                (
                  _,
                  dayIndex,
                ) => {
                  const sourceIndex =
                    Math.min(
                      dayIndex,
                      Math.max(
                        0,
                        chain.length -
                          2,
                      ),
                    );

                  const nextIndex =
                    Math.min(
                      dayIndex + 1,
                      Math.max(
                        0,
                        chain.length -
                          1,
                      ),
                    );

                  return {
                    dayNo:
                      dayIndex + 1,

                    date: "",

                    sourceLocation:
                      chain[
                        sourceIndex
                      ] ||
                      suggestion.source,

                    nextLocation:
                      dayIndex ===
                      noOfDays - 1
                        ? suggestion.destination
                        : chain[
                            nextIndex
                          ] ||
                          suggestion.destination,

                    viaRoute: "",

                    directVisit:
                      false,
                  };
                },
              );

            routePayloads.push({
              routeId:
                suggestion.locationId *
                  1000 +
                suggestionIndex +
                1,

              routeName:
                suggestion.title ||
                "Smart Suggested Route",

              noOfDays,

              days,

              smartBooking: {
                quoteId: "",
                planId: 0,

                title:
                  suggestion.title ||
                  "Smart Suggested Route",

                routeLabel:
                  suggestion.routeLabel,

                arrival:
                  suggestion.source,

                departure:
                  suggestion.destination,

                region: "",

                image: "",

                badge:
                  "Suggested Route",

                nights:
                  suggestion.nights,

                days:
                  noOfDays,

                packageRate: 0,
              },
            });
          },
        );

        const first =
          selectedPackages[0];

        const firstSuggested =
          selectedSuggestedRoutes[0];

        const handoff = {
          version: 1,
          source: "smart-booking",
          autoSaveRequested: false,
          createdAt:
            new Date().toISOString(),

          arrival:
            first?.arrival ||
            firstSuggested?.source ||
            "",

          departure:
            first?.departure ||
            firstSuggested?.destination ||
            "",

          agentId:
            Number(
              agentId ||
                first?.filterAgentId ||
                0,
            ) || null,
          itineraryPreference:
            itineraryPreference ??
            first?.filterPreference ??
            null,
          tripStartDate:
            tripStartDate ||
            first?.filterTripStartDate ||
            "",
          tripEndDate:
            tripEndDate ||
            first?.filterTripEndDate ||
            "",
          hotelCategoryIds:
            selectedHotelCategoryIds.length > 0
              ? selectedHotelCategoryIds.slice(0, 4)
              : Array.isArray(
                    first?.filterHotelCategoryIds,
                  )
                ? first.filterHotelCategoryIds.slice(
                    0,
                    4,
                  )
                : [],

          bookingSummary: {
            ...bookingSummary,
          },
          routes: routePayloads,
        };

        sessionStorage.setItem(
          "dvi-smart-booking-create-itinerary",
          JSON.stringify(handoff),
        );

        window.location.assign(
          "/create-itinerary?from=smart-booking",
        );
      } catch (error) {
        console.error(
          "[SmartBooking] Create Itinerary handoff failed:",
          error,
        );

        setMultiRouteMessage(
          error instanceof Error
            ? error.message
            : "Unable to continue to Create Itinerary.",
        );
      } finally {
        setSmartRouteHandoffLoading(false);
      }
    };

  /*
    SMART BOOKING REVIEW -> CREATE ITINERARY
    Existing selection button may still open the old review flag.
    Convert that action into the new Create Itinerary workflow.
  */
  useEffect(() => {
    if (!multiRouteReview) {
      return;
    }

    setMultiRouteReview(false);

    void continueSmartRoutesToCreateItinerary();
  }, [multiRouteReview]);

  const routeFilterActive =
    Boolean(
      selectedArrival ||
        selectedDeparture ||
        Number(agentId || 0) >
          0 ||
        tripStartDate ||
        tripEndDate ||
        selectedHotelCategoryIds.length >
          0,
    );


  if (multiRouteReview) {
    return (
      <SmartBookingMultiRouteReview
        packages={
          selectedPackages
        }
        onBack={() =>
          setMultiRouteReview(
            false,
          )
        }
        onRemove={
          removeSelectedSmartPackage
        }
      />
    );
  }

  if (bookingPackage) {
    return (
      <SmartBookingCheckout
        item={bookingPackage}
        onBack={() =>
          setBookingPackage(null)
        }
      />
    );
  }

  return (
    <section
      className="mt-5"
      data-smart-booking-packages
    >

      <SmartBookingEditableSummary
        summary={bookingSummary}
        setSummary={setBookingSummary}
      />

      <div className="mb-5">
        {smartBookingSubmitError && (
          <div className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {smartBookingSubmitError}
          </div>
        )}

        {smartRouteCatalogLoading && (
          <div className="w-full rounded-xl border border-[#dce6f2] bg-[#f8fbff] px-4 py-3 text-sm font-semibold text-[#17477e]">
            Preparing Recommended Smart Routes...
          </div>
        )}
      </div>

      {/* =====================================================
          SMART BOOKING ROUTE-MASTER CATALOG UI

          Old itinerary/rates catalog is intentionally
          NOT rendered here.

          Smart Booking now uses:
          OLD saved Suggested Routes
          + NEW routes created through + Add Route.
          ===================================================== */}

      {smartBookingSubmitted && (
      <div
        data-smart-route-master-catalog
        className="mb-5"
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-[#102a56]">
              Recommended Smart Routes
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Choose up to 4 routes recommended for this Smart Booking request, or add a custom route.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void openSmartAddRoute()
            }
            className="rounded-xl bg-[#ed071f] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#cf061b]"
          >
            + Add Route
          </button>
        </div>

        {smartRouteCatalogLoading && (
          <div className="flex min-h-56 items-center justify-center rounded-2xl border border-[#dce6f2] bg-white">
            <div className="text-sm font-semibold text-slate-500">
              Preparing Smart Booking...
            </div>
          </div>
        )}

        {!smartRouteCatalogLoading &&
          visibleSmartRouteSuggestions.length ===
            0 && (
            <div className="rounded-2xl border border-dashed border-[#d6dfeb] bg-white px-6 py-12 text-center">
              <div className="text-lg font-extrabold text-[#102a56]">
                No Recommended Smart Routes found
              </div>

              <p className="mt-1 text-sm text-slate-500">
                No saved routes match this Smart Booking request. You can use + Add Route to create a custom route.
              </p>
            </div>
          )}

        {!smartRouteCatalogLoading &&
          visibleSmartRouteSuggestions.length >
            0 && (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {visibleSmartRouteSuggestions.map(
                (
                  item,
                  index,
                ) => {
                  const isSelected =
                    selectedSuggestedRouteKeys.includes(
                      item.key,
                    );

                  const routeState =
                    resolveSmartRouteState(
                      item.source,
                      item.destination,
                      item.routeLabel,
                    );

                  /* SMART BOOKING ROUTE STATE IMAGES */
                  const fixedStateImages =
                    routeState
                      ? SMART_BOOKING_STATE_FAMOUS_IMAGES[
                          routeState
                        ] || []
                      : [];

                  const hotspotStateImages =
                    routeState
                      ? smartRouteStateImages[
                          routeState
                        ] || []
                      : [];

                  const routeImages =
                    Array.from(
                      new Set(
                        (fixedStateImages.length > 0
                          ? fixedStateImages
                          : hotspotStateImages
                        ).filter(Boolean),
                      ),
                    ).slice(0, 4);

                  if (routeImages.length === 0) {
                    routeImages.push(
                      FALLBACK_IMAGE,
                    );
                  }
                  /*
                    SMART BOOKING ROUTE CARD STAYS

                    Recommended routes already expose one
                    overnight destination per night in
                    item.stops.

                    Do not build the night cards from the
                    deduplicated route label because repeated
                    hotel nights disappear from that label.
                  */
                  const routeChain =
                    String(
                      item.routeLabel || "",
                    )
                      .replace(/->/g, "\u2192")
                      .split("\u2192")
                      .map((value) =>
                        value.trim(),
                      )
                      .filter(Boolean);

                  const nightCount =
                    Math.max(
                      Number(item.nights) || 0,
                      0,
                    );

                  const rawStayStops =
                    (
                      item.stops.length > 0
                        ? item.stops
                        : routeChain.slice(1)
                    )
                      .map((value) =>
                        compactRoutePlace(
                          value,
                        ),
                      )
                      .filter(Boolean)
                      .slice(
                        0,
                        nightCount,
                      );

                  /*
                    Example for 4 nights:

                    Mahabalipuram
                    Pondicherry
                    Chennai International Airport
                    Chennai International Airport

                    becomes:

                    1N Mahabalipuram
                    1N Pondicherry
                    2N Chennai
                  */
                  const stayStops =
                    rawStayStops.reduce<
                      Array<{
                        location: string;
                        nights: number;
                      }>
                    >(
                      (
                        result,
                        location,
                      ) => {
                        const previous =
                          result[
                            result.length - 1
                          ];

                        if (
                          previous &&
                          normalizeSmartRouteValue(
                            previous.location,
                          ) ===
                            normalizeSmartRouteValue(
                              location,
                            )
                        ) {
                          previous.nights += 1;
                        } else {
                          result.push({
                            location,
                            nights: 1,
                          });
                        }

                        return result;
                      },
                      [],
                    );
                  return (
                    <article
                      key={
                        item.key
                      }
                      className={[
                        "group overflow-hidden rounded-[18px] border bg-white shadow-[0_4px_14px_rgba(15,42,86,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(15,42,86,0.14)]",
                        isSelected
                          ? "border-[#d546ab] ring-2 ring-[#efb4dc]"
                          : "border-[#dce4ee]",
                      ].join(
                        " ",
                      )}
                    >
                      <button
                        type="button"
                        aria-pressed={
                          isSelected
                        }
                        onClick={() =>
                          toggleSmartSuggestedRoute(
                            item.key,
                          )
                        }
                        className="block w-full text-left"
                      >
                        <div className="relative h-44 overflow-hidden bg-slate-100">
                          <SmartBookingStateImageSlideshow
                            images={
                              routeImages
                            }
                            alt={item.title}
                            startIndex={index}
                            fallbackImage={
                              FALLBACK_IMAGE
                            }
                          />

                          <div className="absolute left-3 top-3 rounded-md bg-[#ed071f] px-3 py-1.5 text-xs font-bold text-white shadow">
                            {item.routeData ? "Recommended Route" : "Saved Route"}
                          </div>

                          <div className="absolute right-3 top-3 rounded-lg bg-[#102a56]/90 px-3 py-2 text-right text-xs font-bold leading-tight text-white shadow">
                            <div>
                              {
                                item.nights
                              }{" "}
                              Night
                              {item.nights ===
                              1
                                ? ""
                                : "s"}
                            </div>

                            <div>
                              {
                                item.days
                              }{" "}
                              Days
                            </div>
                          </div>


                        </div>

                        <div className="p-4">
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#fff0f3] px-2.5 py-1 text-xs font-bold text-[#d10b2c]">
                            ●{" "}
                            {
                              item.source
                            }
                          </div>

                          <h3 className="mt-2 break-words text-[17px] font-extrabold leading-snug text-[#102a56]">
                            {
                              item.title ||
                              "Smart Route"
                            }
                          </h3>

                          <p className="mt-2 min-h-[40px] break-words text-sm font-medium leading-5 text-[#17477e]">
                            {
                              item.routeLabel
                            }
                          </p>

                          {stayStops.length >
                            0 && (
                            <div className="mt-4 grid grid-cols-2 gap-2">
                              {stayStops.map(
                                (
                                  stop,
                                  stopIndex,
                                ) => (
                                  <div
                                    key={
                                      item.key +
                                      "-stop-" +
                                      stopIndex
                                    }
                                    className="rounded-xl bg-[#f3f7fb] px-3 py-2"
                                  >
                                    <div className="text-[10px] font-extrabold uppercase text-[#60738e]">
                                      {stop.nights}N
                                    </div>

                                    <div className="mt-0.5 break-words text-xs font-bold leading-4 text-[#102a56]">
                                      {stop.location}
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          )}

                          <div className="mt-4 rounded-xl bg-[#fff0f4] px-3 py-3 text-xs font-semibold text-[#b51e42]">
                            {item.routeData ? "Recommended Route" : "Saved Route"}
                            <span className="px-2 text-[#e5a9b8]">
                              |
                            </span>
                            Multi City
                            <span className="px-2 text-[#e5a9b8]">
                              |
                            </span>
                            Customizable
                          </div>

                          <div
                            className={[
                              "mt-4 flex h-10 items-center justify-center rounded-xl border text-sm font-extrabold transition",
                              isSelected
                                ? "border-[#d546ab] bg-[#fff1fa] text-[#c72f93]"
                                : "border-[#17477e] bg-white text-[#17477e]",
                            ].join(
                              " ",
                            )}
                          >
                            {isSelected
                              ? "✓ Route Selected"
                              : "Select Route"}
                          </div>
                        </div>
                      </button>
                    </article>
                  );
                },
              )}
            </div>
          )}

        {multiRouteMessage && (
          <div className="mt-4 rounded-xl border border-[#dce6f2] bg-[#f8fbff] px-4 py-3 text-sm font-semibold text-[#17477e]">
            {
              multiRouteMessage
            }
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dce6f2] bg-white p-4 shadow-sm">
          <div>
            <div className="text-sm font-extrabold text-[#102a56]">
              {
                totalSmartRouteSelections
              }{" "}
              of 4 routes selected
            </div>

            <div className="mt-0.5 text-xs text-slate-500">
              Select 1 to 4 routes, then Create Itinerary.
            </div>
          </div>

          <button
            type="button"
            disabled={
              totalSmartRouteSelections ===
                0 ||
              smartRouteHandoffLoading
            }
            onClick={() =>
              void continueSmartRoutesToCreateItinerary()
            }
            className={[
              "h-11 rounded-xl px-6 text-sm font-bold transition",
              totalSmartRouteSelections >
                0 &&
              !smartRouteHandoffLoading
                ? "bg-[#ed071f] text-white shadow-sm hover:bg-[#cf061b]"
                : "cursor-not-allowed bg-slate-200 text-slate-500",
            ].join(
              " ",
            )}
          >
            {smartRouteHandoffLoading
              ? "Preparing Routes..."
              : "Create Itinerary (" +
                totalSmartRouteSelections +
                "/4)"}
          </button>
        </div>
      </div>
      )}

      {smartAddRouteOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-xl font-extrabold text-[#102a56]">
                  Add Route Suggestion Details
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Create the route here. It will be saved to Locations Suggested Routes and shown in Smart Booking.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  !smartAddRouteSaving &&
                  setSmartAddRouteOpen(
                    false,
                  )
                }
                className="rounded-lg px-3 py-1.5 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <datalist id="smart-route-location-options">
              {smartAddRouteMasterOptions.map(
                (item) => (
                  <option
                    key={
                      item.value
                    }
                    value={
                      item.value
                    }
                  />
                ),
              )}
            </datalist>

            <div className="space-y-5 p-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-sm font-bold text-[#273b5d]">
                    Source Location *
                  </span>

                  <AutoSuggestSelect
                    mode="single"
                    value={
                      smartAddRouteSource
                    }
                    onChange={(value) =>
                      void handleSmartAddRouteSourceSelect(
                        String(
                          value || "",
                        ),
                      )
                    }
                    options={
                      smartAddRouteMasterOptions
                    }
                    placeholder="Choose Source Location"
                    openOnFocus={true}
                    stackingZIndex={150}
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-sm font-bold text-[#273b5d]">
                    Destination Location *
                  </span>

                  <AutoSuggestSelect
                    mode="single"
                    value={
                      smartAddRouteDestination
                    }
                    onChange={(value) =>
                      setSmartAddRouteDestination(
                        String(
                          value || "",
                        ),
                      )
                    }
                    options={
                      smartAddRouteDestinationOptions.length > 0
                        ? smartAddRouteDestinationOptions.map(
                            (item) => ({
                              value: item,
                              label: item,
                            }),
                          )
                        : smartAddRouteMasterOptions
                    }
                    placeholder={
                      smartAddRouteSource
                        ? "Choose Destination Location"
                        : "Select Source First"
                    }
                    disabled={
                      !smartAddRouteSource
                    }
                    openOnFocus={true}
                    stackingZIndex={150}
                  />
                </label>
              </div>

              <label className="block max-w-xs space-y-1.5">
                <span className="text-sm font-bold text-[#273b5d]">
                  Total No. of Nights *
                </span>

                <input
                  type="number"
                  min={1}
                  max={30}
                  value={
                    smartAddRouteNights
                  }
                  onChange={(
                    event,
                  ) =>
                    resizeSmartAddRouteStops(
                      Number(
                        event
                          .target
                          .value,
                      ),
                    )
                  }
                  className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-[#d546ab] focus:ring-2 focus:ring-[#f4d8eb]"
                />
              </label>

              <div>
                <div className="mb-3">
                  <h3 className="text-sm font-extrabold text-[#102a56]">
                    Night-wise Route Locations
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    Enter the overnight / route location for every night.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {smartAddRouteStops.map(
                    (
                      value,
                      index,
                    ) => (
                      <label
                        key={
                          index
                        }
                        className="space-y-1.5"
                      >
                        <span className="text-xs font-bold text-[#60738e]">
                          Night{" "}
                          {
                            index +
                            1
                          }{" "}
                          Location *
                        </span>

                        <input
                          list="smart-route-location-options"
                          value={
                            value
                          }
                          onChange={(
                            event,
                          ) =>
                            setSmartAddRouteStops(
                              (
                                previous,
                              ) => {
                                const next =
                                  [
                                    ...previous,
                                  ];

                                next[
                                  index
                                ] =
                                  event
                                    .target
                                    .value;

                                return next;
                              },
                            )
                          }
                          placeholder={
                            "Night " +
                            (index +
                              1) +
                            " location"
                          }
                          className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-[#d546ab] focus:ring-2 focus:ring-[#f4d8eb]"
                        />
                      </label>
                    ),
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-[#dce6f2] bg-[#f8fbff] p-4">
                <div className="text-xs font-extrabold uppercase tracking-wide text-[#60738e]">
                  Route Preview
                </div>

                <div className="mt-2 text-sm font-semibold leading-6 text-[#102a56]">
                  {[
                    smartAddRouteSource,
                    ...smartAddRouteStops,
                    smartAddRouteDestination,
                  ]
                    .map(
                      (
                        item,
                      ) =>
                        item.trim(),
                    )
                    .filter(
                      Boolean,
                    )
                    .join(
                      " → ",
                    ) ||
                    "Select locations to preview the route"}
                </div>
              </div>

              {smartAddRouteError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {
                    smartAddRouteError
                  }
                </div>
              )}

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  disabled={
                    smartAddRouteSaving
                  }
                  onClick={() =>
                    setSmartAddRouteOpen(
                      false,
                    )
                  }
                  className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={
                    smartAddRouteSaving
                  }
                  onClick={() =>
                    void saveSmartAddedRoute()
                  }
                  className="rounded-lg bg-[#e40b2f] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#c90929] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {smartAddRouteSaving
                    ? "Saving Route..."
                    : "Save Route"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </section>
  );
};
