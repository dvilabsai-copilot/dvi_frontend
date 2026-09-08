import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowLeft,
  Loader2,
  Save,
} from "lucide-react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  hasHotelAdminPermission,
  HotelAdminAPI,
  type HotelAdminContext,
} from "@/services/hotelAdminService";

type HotelUser = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  hotelIds: number[];
};

type PermissionRow = {
  key: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
};

type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "delete";

const PERMISSION_KEYS = [
  "hotels",
  "hotel_details",
  "rooms",
  "rates",
  "availability",
  "bookings",
  "hotel_users",
  "permissions",
  "gallery",
];

const LABELS:
  Record<string, string> = {
  hotels: "Hotels",
  hotel_details:
    "Hotel Details",
  rooms: "Rooms",
  rates: "Rates / Pricing",
  availability:
    "Availability",
  bookings: "Bookings",
  hotel_users:
    "Hotel Users",
  permissions:
    "Permissions",
  gallery:
    "Gallery / Images",
};

function normalizeUsers(
  value: unknown,
): HotelUser[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((raw) => {
      if (
        !raw ||
        typeof raw !== "object"
      ) {
        return null;
      }

      const row =
        raw as Record<
          string,
          unknown
        >;

      const id =
        String(
          row.id ?? "",
        ).trim();

      if (!id) {
        return null;
      }

      return {
        id,
        name:
          String(
            row.name ?? "",
          ),

        email:
          String(
            row.email ?? "",
          ),

        active:
          Boolean(
            row.active,
          ),

        hotelIds:
          Array.isArray(
            row.hotelIds,
          )
            ? row.hotelIds
                .map(Number)
                .filter(
                  Number.isFinite,
                )
            : [],
      };
    })
    .filter(
      (
        user,
      ): user is HotelUser =>
        Boolean(user),
    );
}

function normalizePermissions(
  value: unknown,
): PermissionRow[] {
  const source =
    Array.isArray(value)
      ? value
      : [];

  const map =
    new Map<
      string,
      PermissionRow
    >();

  source.forEach((raw) => {
    if (
      !raw ||
      typeof raw !== "object"
    ) {
      return;
    }

    const row =
      raw as Record<
        string,
        unknown
      >;

    const key =
      String(
        row.key ?? "",
      );

    if (!key) return;

    map.set(key, {
      key,
      view:
        Boolean(row.view),

      create:
        Boolean(row.create),

      edit:
        Boolean(row.edit),

      delete:
        Boolean(row.delete),
    });
  });

  return PERMISSION_KEYS.map(
    (key) =>
      map.get(key) ?? {
        key,
        view: false,
        create: false,
        edit: false,
        delete: false,
      },
  );
}

export default function HotelAdminPermissions() {
  const navigate =
    useNavigate();

  const [searchParams] =
    useSearchParams();

  const queryUserId =
    searchParams.get("userId");

  const [context, setContext] =
    useState<HotelAdminContext | null>(
      null,
    );

  const [users, setUsers] =
    useState<HotelUser[]>([]);

  const [
    selectedUserId,
    setSelectedUserId,
  ] = useState("");

  const [
    permissions,
    setPermissions,
  ] = useState<PermissionRow[]>(
    [],
  );

  const [loading, setLoading] =
    useState(true);

  const [
    loadingPermissions,
    setLoadingPermissions,
  ] = useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [accessDenied, setAccessDenied] =
    useState(false);

  const canEdit =
    hasHotelAdminPermission(
      context,
      "permissions",
      "edit",
    );

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        setLoading(true);

        const [
          me,
          userResponse,
        ] = await Promise.all([
          HotelAdminAPI.me(),
          HotelAdminAPI.users(),
        ]);

        if (cancelled) return;

        setContext(me);

        if (
          !hasHotelAdminPermission(
            me,
            "permissions",
            "view",
          )
        ) {
          setAccessDenied(true);
          return;
        }

        const nextUsers =
          normalizeUsers(
            userResponse,
          );

        setUsers(nextUsers);

        const requested =
          queryUserId &&
          nextUsers.some(
            (user) =>
              user.id ===
              queryUserId,
          )
            ? queryUserId
            : nextUsers[0]?.id ??
              "";

        setSelectedUserId(
          requested,
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load permissions.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void setup();

    return () => {
      cancelled = true;
    };
  }, [queryUserId]);

  const loadPermissions =
    useCallback(async () => {
      if (!selectedUserId) {
        setPermissions([]);
        return;
      }

      try {
        setLoadingPermissions(
          true,
        );

        setError("");

        const response =
          await HotelAdminAPI.userPermissions(
            selectedUserId,
          );

        setPermissions(
          normalizePermissions(
            response,
          ),
        );
      } catch (err) {
        setPermissions([]);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load user permissions.",
        );
      } finally {
        setLoadingPermissions(
          false,
        );
      }
    }, [selectedUserId]);

  useEffect(() => {
    if (!accessDenied) {
      void loadPermissions();
    }
  }, [
    loadPermissions,
    accessDenied,
  ]);

  const selectedUser =
    useMemo(
      () =>
        users.find(
          (user) =>
            user.id ===
            selectedUserId,
        ) ?? null,
      [
        users,
        selectedUserId,
      ],
    );

  function actorMayGrant(
    permissionKey: string,
    action:
      PermissionAction,
  ) {
    return hasHotelAdminPermission(
      context,
      permissionKey as any,
      action,
    );
  }

  function toggle(
    permissionKey: string,
    action:
      PermissionAction,
  ) {
    if (
      !canEdit ||
      !actorMayGrant(
        permissionKey,
        action,
      )
    ) {
      return;
    }

    setPermissions(
      (current) =>
        current.map(
          (permission) =>
            permission.key ===
            permissionKey
              ? {
                  ...permission,
                  [action]:
                    !permission[
                      action
                    ],
                }
              : permission,
        ),
    );
  }

  async function save() {
    if (
      !selectedUserId ||
      !canEdit
    ) {
      return;
    }

    try {
      setSaving(true);

      await HotelAdminAPI.saveUserPermissions(
        selectedUserId,
        permissions,
      );

      toast.success(
        "Permissions saved successfully",
      );

      await loadPermissions();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to save permissions",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />

        <span className="ml-2 text-sm text-muted-foreground">
          Loading permissions...
        </span>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        You do not have permission to view Hotel Admin user permissions.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            User Permissions
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Configure backend-enforced View/Create/Edit/Delete limitations.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() =>
            navigate(
              "/hotel-admin/users",
            )
          }
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Hotel Users
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <label className="mb-2 block text-sm font-medium">
          Hotel Admin User
        </label>

        <select
          value={selectedUserId}
          onChange={(event) =>
            setSelectedUserId(
              event.target.value,
            )
          }
          className="h-10 w-full max-w-xl rounded-md border border-input bg-background px-3 text-sm"
        >
          {users.length === 0 ? (
            <option value="">
              No manageable Hotel Admin users
            </option>
          ) : null}

          {users.map(
            (user) => (
              <option
                key={user.id}
                value={user.id}
              >
                {user.name ||
                  user.email ||
                  `User #${user.id}`}
              </option>
            ),
          )}
        </select>

        {selectedUser ? (
          <div className="mt-4 grid gap-4 rounded-lg bg-muted/30 p-4 sm:grid-cols-3">
            <div>
              <div className="text-xs uppercase text-muted-foreground">
                User
              </div>

              <div className="mt-1 font-medium">
                {selectedUser.name ||
                  "-"}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase text-muted-foreground">
                Email
              </div>

              <div className="mt-1 font-medium">
                {selectedUser.email ||
                  "-"}
              </div>
            </div>

            <div>
              <div className="text-xs uppercase text-muted-foreground">
                Assigned Hotels
              </div>

              <div className="mt-1 font-medium">
                {selectedUser.hotelIds.length}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <div className="font-semibold">
            Access Limitations
          </div>

          <div className="mt-1 text-xs text-muted-foreground">
            Backend authorization remains the final authority for every action.
          </div>
        </div>

        {loadingPermissions ? (
          <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading user permissions...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-5 py-3 text-left">
                    Module
                  </th>

                  <th className="px-5 py-3 text-center">
                    View
                  </th>

                  <th className="px-5 py-3 text-center">
                    Create
                  </th>

                  <th className="px-5 py-3 text-center">
                    Edit
                  </th>

                  <th className="px-5 py-3 text-center">
                    Delete
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {permissions.map(
                  (permission) => (
                    <tr
                      key={
                        permission.key
                      }
                    >
                      <td className="px-5 py-4 font-medium">
                        {LABELS[
                          permission.key
                        ] ||
                          permission.key}
                      </td>

                      {(
                        [
                          "view",
                          "create",
                          "edit",
                          "delete",
                        ] as PermissionAction[]
                      ).map(
                        (action) => {
                          const allowed =
                            actorMayGrant(
                              permission.key,
                              action,
                            );

                          return (
                            <td
                              key={
                                action
                              }
                              className="px-5 py-4 text-center"
                            >
                              <input
                                type="checkbox"
                                checked={
                                  permission[
                                    action
                                  ]
                                }
                                disabled={
                                  !canEdit ||
                                  !allowed
                                }
                                onChange={() =>
                                  toggle(
                                    permission.key,
                                    action,
                                  )
                                }
                                className="h-4 w-4 accent-primary disabled:opacity-40"
                              />
                            </td>
                          );
                        },
                      )}
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t px-5 py-4">
          {!canEdit ? (
            <span className="text-sm text-muted-foreground">
              View-only permission access
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              You cannot grant privileges that your own Hotel Admin account does not have.
            </span>
          )}

          <Button
            disabled={
              !canEdit ||
              !selectedUserId ||
              saving ||
              loadingPermissions
            }
            onClick={() =>
              void save()
            }
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}

            {saving
              ? "Saving..."
              : "Save Permissions"}
          </Button>
        </div>
      </div>
    </div>
  );
}