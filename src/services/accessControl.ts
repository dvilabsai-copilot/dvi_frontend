import { getToken } from "@/lib/api";

export type AuthTokenPayload = {
  sub?: string | number;
  email?: string;
  role?: string | number;
  roleID?: string | number;
  agentId?: string | number;
  staffId?: string | number;
  staff_id?: string | number;
  guideId?: string | number;
  name?: string;
  fullName?: string;
  permissionRoleId?: string | number;
  allowedAccessKeys?: string[];
  configuredAccessKeys?: string[];
};

type AccessMenuEntry = {
  id: string;
  title: string;
  path: string;
};

type AccessMenuItem = AccessMenuEntry & {
  children?: AccessMenuEntry[];
};

type RouteAccessRule = {
  matches: (pathname: string) => boolean;
  accessGroups: string[][];
};

export function normalizeAccessKey(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

export function parseAuthToken(
  token = getToken(),
): AuthTokenPayload | null {
  if (!token) return null;

  try {
    const payload = token.split(".")[1];

    if (!payload) return null;

    const normalized = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "=",
    );

    return JSON.parse(atob(padded)) as AuthTokenPayload;
  } catch {
    return null;
  }
}

export function getAuthenticatedUser(): AuthTokenPayload | null {
  return parseAuthToken();
}

export function getAuthenticatedRoleId(
  user: AuthTokenPayload | null = getAuthenticatedUser(),
): number {
  return Number(user?.roleID ?? user?.role ?? 0) || 0;
}

function getAllowedKeySet(
  user: AuthTokenPayload | null,
): Set<string> {
  return new Set(
    (user?.allowedAccessKeys ?? [])
      .map(normalizeAccessKey)
      .filter(Boolean),
  );
}

function getConfiguredKeySet(
  user: AuthTokenPayload | null,
): Set<string> {
  return new Set(
    (user?.configuredAccessKeys ?? [])
      .map(normalizeAccessKey)
      .filter(Boolean),
  );
}

function getMenuEntryKeys(
  entry: AccessMenuEntry,
): string[] {
  const lastPathPart =
    entry.path.split("/").filter(Boolean).pop() ?? "";

  return [entry.id, entry.title, lastPathPart]
    .map(normalizeAccessKey)
    .filter(Boolean);
}

function keySetContainsEntry(
  keySet: Set<string>,
  entry: AccessMenuEntry,
): boolean {
  return getMenuEntryKeys(entry).some((key) =>
    keySet.has(key),
  );
}

function isMenuEntryConfigured(
  entry: AccessMenuEntry,
  user: AuthTokenPayload | null,
): boolean {
  return keySetContainsEntry(
    getConfiguredKeySet(user),
    entry,
  );
}

function hasMenuEntryAccess(
  entry: AccessMenuEntry,
  user: AuthTokenPayload | null,
): boolean {
  return keySetContainsEntry(
    getAllowedKeySet(user),
    entry,
  );
}

export function filterMenuItemsForStaff<
  T extends AccessMenuItem,
>(
  items: T[],
  user: AuthTokenPayload | null = getAuthenticatedUser(),
): T[] {
  if (getAuthenticatedRoleId(user) !== 3) {
    return items;
  }

  return items.reduce<T[]>((visibleItems, item) => {
    const selfAllowed = hasMenuEntryAccess(item, user);
    const children = item.children ?? [];

    const hasConfiguredChildren = children.some((child) =>
      isMenuEntryConfigured(child, user),
    );

    const visibleChildren = hasConfiguredChildren
      ? children.filter((child) =>
          hasMenuEntryAccess(child, user),
        )
      : selfAllowed
        ? children
        : children.filter((child) =>
            hasMenuEntryAccess(child, user),
          );

    if (
      (item.children && visibleChildren.length === 0) ||
      (!selfAllowed && visibleChildren.length === 0)
    ) {
      return visibleItems;
    }

    visibleItems.push({
      ...item,
      ...(item.children
        ? { children: visibleChildren }
        : {}),
    } as T);

    return visibleItems;
  }, []);
}

const isPath = (
  pathname: string,
  prefix: string,
) =>
  pathname === prefix ||
  pathname.startsWith(`${prefix}/`);

const STAFF_ROUTE_ACCESS_RULES: RouteAccessRule[] = [
  {
    matches: (path) => path === "/",
    accessGroups: [["dashboard", "home"]],
  },
  {
    matches: (path) =>
      isPath(path, "/itinerary-details"),
    accessGroups: [
      [
        "latestitinerary",
        "confirmeditinerary",
        "createitinerary",
      ],
    ],
  },
  {
    matches: (path) =>
      isPath(path, "/create-itinerary"),
    accessGroups: [["createitinerary"]],
  },
  {
    matches: (path) =>
      isPath(path, "/download-packages"),
    accessGroups: [["downloadpackages"]],
  },
  {
    matches: (path) =>
      isPath(path, "/latest-itinerary"),
    accessGroups: [["latestitinerary"]],
  },
  {
    matches: (path) =>
      isPath(path, "/confirmed-itinerary") ||
      isPath(path, "/cancelled-itinerary"),
    accessGroups: [
      ["confirmeditinerary", "cancelleditinerary"],
    ],
  },
  {
    matches: (path) =>
      isPath(path, "/pdf-preview/travel-voucher") ||
      isPath(path, "/pdf-preview/hotel-voucher") ||
      isPath(path, "/pdf-preview/pluck-card"),
    accessGroups: [["confirmeditinerary"]],
  },
  {
    matches: (path) =>
      isPath(path, "/book-activities"),
    accessGroups: [["bookactivities"]],
  },
  {
    matches: (path) =>
      isPath(path, "/accounts-manager"),
    accessGroups: [
      ["accountsmanager"],
      ["accounts"],
    ],
  },
  {
    matches: (path) =>
      isPath(path, "/accounts-ledger"),
    accessGroups: [
      ["accountsledger"],
      ["accounts"],
    ],
  },
  {
    matches: (path) =>
      isPath(path, "/daily-moment") ||
      isPath(path, "/daily-moment-tracker"),
    accessGroups: [
      ["dailymoment", "dailymomenttracker"],
    ],
  },
  {
    matches: (path) =>
      isPath(path, "/hotels/axisrooms"),
    accessGroups: [
      ["axisroomshotels", "axisrooms"],
      ["hotels"],
    ],
  },
  {
    matches: (path) =>
      isPath(path, "/hotels"),
    accessGroups: [["hotels", "hotel"]],
  },
  {
    matches: (path) =>
      isPath(path, "/vehicle-availability"),
    accessGroups: [
      [
        "vehicleavailability",
        "vehicleavailabilitychart",
      ],
      ["vendormanagement"],
    ],
  },
  {
    matches: (path) =>
      isPath(path, "/driver") ||
      isPath(path, "/drivers"),
    accessGroups: [
      ["driver", "drivers"],
      ["vendormanagement"],
    ],
  },
  {
    matches: (path) =>
      isPath(path, "/vendor"),
    accessGroups: [
      ["vendor", "vendors"],
      ["vendormanagement"],
    ],
  },
  {
    matches: (path) =>
      isPath(path, "/hotspot-distance-cache") ||
      isPath(path, "/hotspots"),
    accessGroups: [
      [
        "hotspotdistancecache",
        "newhotspot",
        "hotspots",
      ],
      ["hotspot"],
    ],
  },
  {
    matches: (path) =>
      isPath(path, "/parking-charge-bulk-import"),
    accessGroups: [
      ["parkingcharge"],
      ["hotspot"],
    ],
  },
  {
    matches: (path) =>
      isPath(path, "/activities"),
    accessGroups: [["activity", "activities"]],
  },
  {
    matches: (path) =>
      isPath(path, "/staff"),
    accessGroups: [["staff", "staffmanagement"]],
  },
  {
    matches: (path) =>
      isPath(path, "/agent"),
    accessGroups: [["agent", "agents"]],
  },
  {
    matches: (path) =>
      isPath(path, "/guide"),
    accessGroups: [["guide", "guides"]],
  },
  {
    matches: (path) =>
      isPath(path, "/wallet") ||
      isPath(path, "/wallet-history"),
    accessGroups: [["wallet", "wallethistory"]],
  },
  {
    matches: (path) =>
      isPath(path, "/subscription-history"),
    accessGroups: [["subscriptionhistory"]],
  },
  {
    matches: (path) =>
      isPath(path, "/locations/between-hotspots"),
    accessGroups: [
      ["betweenhotspots"],
      ["locations"],
    ],
  },
  {
    matches: (path) =>
      isPath(
        path,
        "/locations/vehicle-route-restrictions",
      ),
    accessGroups: [
      ["vehiclerouterestrictions"],
      ["locations"],
    ],
  },
  {
    matches: (path) =>
      isPath(path, "/toll-charge"),
    accessGroups: [
      ["tollcharge"],
      ["locations"],
    ],
  },
  {
    matches: (path) =>
      isPath(path, "/locations"),
    accessGroups: [["locations", "location"]],
  },
  {
    matches: (path) =>
      isPath(path, "/pricebook-export"),
    accessGroups: [
      ["pricebookexport", "pricebook"],
    ],
  },
  {
    matches: (path) =>
      isPath(path, "/settings/global"),
    accessGroups: [
      ["globalsettings"],
      ["settings"],
    ],
  },
  {
    matches: (path) =>
      isPath(path, "/settings/cities"),
    accessGroups: [
      ["cities", "city"],
      ["settings"],
    ],
  },
  {
    matches: (path) =>
      isPath(path, "/settings/hotel-category"),
    accessGroups: [
      ["hotelcategory"],
      ["settings"],
    ],
  },
  {
    matches: (path) =>
      isPath(path, "/settings/gst"),
    accessGroups: [
      ["gstsetting", "gstsettings", "gst"],
      ["settings"],
    ],
  },
  {
    matches: (path) =>
      isPath(path, "/settings/amenities"),
    accessGroups: [
      [
        "inbuildamenities",
        "inbuiltamenities",
        "amenities",
      ],
      ["settings"],
    ],
  },
  {
    matches: (path) =>
      isPath(path, "/settings/vehicle-type"),
    accessGroups: [
      ["vehicletype"],
      ["settings"],
    ],
  },
  {
    matches: (path) =>
      isPath(path, "/settings/language"),
    accessGroups: [
      ["language", "languages"],
      ["settings"],
    ],
  },
  {
    matches: (path) =>
      isPath(path, "/settings/role-permission") ||
      isPath(path, "/role-permission"),
    accessGroups: [
      ["rolepermission", "rolepermissions"],
      ["settings"],
    ],
  },
  {
    matches: (path) =>
      isPath(path, "/settings/subscription-plan") ||
      isPath(path, "/agent-subscription-plan"),
    accessGroups: [
      [
        "agentsubscriptionplan",
        "subscriptionplan",
      ],
      ["settings"],
    ],
  },
];

function canAccessByGroups(
  accessGroups: string[][],
  user: AuthTokenPayload | null,
): boolean {
  const configuredKeys = getConfiguredKeySet(user);
  const allowedKeys = getAllowedKeySet(user);

  for (const group of accessGroups) {
    const normalizedGroup =
      group.map(normalizeAccessKey);

    const hasConfiguredKey =
      normalizedGroup.some((key) =>
        configuredKeys.has(key),
      );

    if (hasConfiguredKey) {
      return normalizedGroup.some((key) =>
        allowedKeys.has(key),
      );
    }
  }

  return accessGroups
    .flat()
    .map(normalizeAccessKey)
    .some((key) => allowedKeys.has(key));
}

export function canCurrentUserAccessRoute(
  pathname: string,
  user: AuthTokenPayload | null =
    getAuthenticatedUser(),
): boolean {
  if (getAuthenticatedRoleId(user) !== 3) {
    return true;
  }

  const cleanPath =
    pathname
      .split("?")[0]
      .replace(/\/+$/, "") || "/";

  if (
    cleanPath === "/restricted" ||
    isPath(cleanPath, "/profile") ||
    isPath(cleanPath, "/payments/success")
  ) {
    return true;
  }

  const rule = STAFF_ROUTE_ACCESS_RULES.find(
    ({ matches }) => matches(cleanPath),
  );

  return rule
    ? canAccessByGroups(rule.accessGroups, user)
    : false;
}