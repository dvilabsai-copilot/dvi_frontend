import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Loader2,
  Pencil,
  Plus,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  getHotelAdminSelectedHotelId,
  hasHotelAdminPermission,
  HotelAdminAPI,
  type HotelAdminContext,
  type HotelAdminHotel,
} from "@/services/hotelAdminService";

type HotelUser = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  hotelIds: number[];
};

type UserForm = {
  name: string;
  email: string;
  password: string;
  active: boolean;
  hotelIds: number[];
};

const EMPTY_FORM: UserForm = {
  name: "",
  email: "",
  password: "",
  active: true,
  hotelIds: [],
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
                  (hotelId) =>
                    Number.isInteger(
                      hotelId,
                    ) &&
                    hotelId > 0,
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

export default function HotelAdminUsers() {
  const navigate =
    useNavigate();

  const [context, setContext] =
    useState<HotelAdminContext | null>(
      null,
    );

  const [users, setUsers] =
    useState<HotelUser[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [accessDenied, setAccessDenied] =
    useState(false);

  const [dialogOpen, setDialogOpen] =
    useState(false);

  const [
    editingUser,
    setEditingUser,
  ] = useState<HotelUser | null>(
    null,
  );

  const [form, setForm] =
    useState<UserForm>(EMPTY_FORM);

  const [saving, setSaving] =
    useState(false);

  const [
    hotelSearch,
    setHotelSearch,
  ] = useState("");

  const [
    hotelResults,
    setHotelResults,
  ] = useState<HotelAdminHotel[]>(
    [],
  );

  const [
    searchingHotels,
    setSearchingHotels,
  ] = useState(false);

  const [
    deletingUser,
    setDeletingUser,
  ] = useState<HotelUser | null>(
    null,
  );

  const [deleting, setDeleting] =
    useState(false);

  const canCreate =
    hasHotelAdminPermission(
      context,
      "hotel_users",
      "create",
    );

  const canEdit =
    hasHotelAdminPermission(
      context,
      "hotel_users",
      "edit",
    );

  const canDelete =
    hasHotelAdminPermission(
      context,
      "hotel_users",
      "delete",
    );

  const canManagePermissions =
    hasHotelAdminPermission(
      context,
      "permissions",
      "view",
    );

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const [
        me,
        userResponse,
      ] = await Promise.all([
        HotelAdminAPI.me(),
        HotelAdminAPI.users(),
      ]);

      setContext(me);

      if (
        !hasHotelAdminPermission(
          me,
          "hotel_users",
          "view",
        )
      ) {
        setAccessDenied(true);
        setUsers([]);
        return;
      }

      setUsers(
        normalizeUsers(
          userResponse,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load Hotel Admin users.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  useEffect(() => {
    if (!dialogOpen) {
      return;
    }

    let cancelled = false;

    const timer =
      window.setTimeout(
        async () => {
          try {
            setSearchingHotels(
              true,
            );

            const response =
              await HotelAdminAPI.hotels(
                {
                  page: 1,
                  limit: 25,
                  search:
                    hotelSearch,
                },
              );

            if (!cancelled) {
              setHotelResults(
                response.items ?? [],
              );
            }
          } catch {
            if (!cancelled) {
              setHotelResults([]);
            }
          } finally {
            if (!cancelled) {
              setSearchingHotels(
                false,
              );
            }
          }
        },
        300,
      );

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    dialogOpen,
    hotelSearch,
  ]);

  const filtered =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase();

      if (!term) {
        return users;
      }

      return users.filter(
        (user) =>
          [
            user.name,
            user.email,
            user.id,
            user.hotelIds.join(
              " ",
            ),
          ].some((value) =>
            value
              .toLowerCase()
              .includes(term),
          ),
      );
    }, [users, search]);

  function openCreate() {
    if (!canCreate) return;

    const selectedHotelId =
      getHotelAdminSelectedHotelId();

    setEditingUser(null);

    setForm({
      ...EMPTY_FORM,
      hotelIds:
        selectedHotelId
          ? [selectedHotelId]
          : [],
    });

    setHotelSearch("");
    setDialogOpen(true);
  }

  function openEdit(
    user: HotelUser,
  ) {
    if (!canEdit) return;

    setEditingUser(user);

    setForm({
      name: user.name,
      email: user.email,
      password: "",
      active:
        user.active,
      hotelIds:
        [...user.hotelIds],
    });

    setHotelSearch("");
    setDialogOpen(true);
  }

  function toggleHotel(
    hotelId: number,
  ) {
    setForm((current) => ({
      ...current,

      hotelIds:
        current.hotelIds.includes(
          hotelId,
        )
          ? current.hotelIds.filter(
              (id) =>
                id !== hotelId,
            )
          : [
              ...current.hotelIds,
              hotelId,
            ],
    }));
  }

  async function saveUser() {
    if (!form.name.trim()) {
      toast.error(
        "Name is required.",
      );
      return;
    }

    if (!editingUser) {
      if (
        !form.email.trim() ||
        !form.email.includes("@")
      ) {
        toast.error(
          "A valid email is required.",
        );
        return;
      }

      if (
        form.password.length < 8
      ) {
        toast.error(
          "Password must contain at least 8 characters.",
        );
        return;
      }
    }

    if (
      form.hotelIds.length === 0
    ) {
      toast.error(
        "Assign at least one hotel.",
      );
      return;
    }

    try {
      setSaving(true);

      if (editingUser) {
        const body:
          Record<
            string,
            unknown
          > = {
          name:
            form.name.trim(),

          active:
            form.active,

          hotelIds:
            form.hotelIds,
        };

        if (
          form.password.trim()
        ) {
          body.password =
            form.password;
        }

        await HotelAdminAPI.updateUser(
          editingUser.id,
          body,
        );

        toast.success(
          "Hotel Admin user updated successfully",
        );
      } else {
        await HotelAdminAPI.createUser(
          {
            name:
              form.name.trim(),

            email:
              form.email
                .trim()
                .toLowerCase(),

            password:
              form.password,

            hotelIds:
              form.hotelIds,
          },
        );

        toast.success(
          "Hotel Admin user created successfully",
        );
      }

      setDialogOpen(false);
      setEditingUser(null);

      await loadUsers();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to save Hotel Admin user",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (
      !deletingUser ||
      !canDelete
    ) {
      return;
    }

    try {
      setDeleting(true);

      await HotelAdminAPI.deleteUser(
        deletingUser.id,
      );

      toast.success(
        "Hotel Admin user deleted successfully",
      );

      setDeletingUser(null);

      await loadUsers();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to delete Hotel Admin user",
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" />

        <span className="ml-2 text-sm text-muted-foreground">
          Loading Hotel Admin users...
        </span>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        You do not have permission to view Hotel Admin users.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Hotel Users
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Manage real role-10 Hotel Admin accounts and hotel assignments.
            </p>
          </div>

          {canCreate ? (
            <Button
              onClick={openCreate}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Hotel User
            </Button>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search users..."
                className="pl-9"
              />
            </div>

            <div className="text-sm text-muted-foreground">
              {filtered.length} user
              {filtered.length === 1
                ? ""
                : "s"}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-muted/40 text-left">
                <tr>
                  <th className="px-5 py-3">
                    User
                  </th>

                  <th className="px-5 py-3">
                    Assigned Hotels
                  </th>

                  <th className="px-5 py-3">
                    Role
                  </th>

                  <th className="px-5 py-3">
                    Status
                  </th>

                  <th className="px-5 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-12 text-center text-muted-foreground"
                    >
                      No Hotel Admin users found.
                    </td>
                  </tr>
                ) : null}

                {filtered.map(
                  (user) => (
                    <tr key={user.id}>
                      <td className="px-5 py-4">
                        <div className="font-medium">
                          {user.name ||
                            `User #${user.id}`}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {user.email}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {user.hotelIds
                            .slice(0, 4)
                            .map(
                              (hotelId) => (
                                <span
                                  key={hotelId}
                                  className="rounded-full bg-muted px-2 py-1 text-xs"
                                >
                                  #{hotelId}
                                </span>
                              ),
                            )}

                          {user.hotelIds.length >
                          4 ? (
                            <span className="rounded-full bg-muted px-2 py-1 text-xs">
                              +
                              {user.hotelIds.length -
                                4}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        Hotel Admin
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={
                            user.active
                              ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                              : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                          }
                        >
                          {user.active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          {canManagePermissions ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                navigate(
                                  `/hotel-admin/permissions?userId=${encodeURIComponent(
                                    user.id,
                                  )}`,
                                )
                              }
                            >
                              <Settings2 className="mr-1 h-4 w-4" />
                              Permissions
                            </Button>
                          ) : null}

                          {canEdit ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                openEdit(
                                  user,
                                )
                              }
                            >
                              <Pencil className="mr-1 h-4 w-4" />
                              Edit
                            </Button>
                          ) : null}

                          {canDelete &&
                          user.id !==
                            context?.user.id ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                setDeletingUser(
                                  user,
                                )
                              }
                            >
                              <Trash2 className="mr-1 h-4 w-4" />
                              Delete
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!saving) {
            setDialogOpen(open);

            if (!open) {
              setEditingUser(null);
            }
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingUser
                ? "Edit Hotel Admin User"
                : "Add Hotel Admin User"}
            </DialogTitle>

            <DialogDescription>
              Create or update a real DVI role-10 account and restrict it to assigned hotels.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Name *
              </label>

              <Input
                value={form.name}
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,
                      name:
                        event.target.value,
                    }),
                  )
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Email *
              </label>

              <Input
                type="email"
                value={form.email}
                disabled={Boolean(
                  editingUser,
                )}
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,
                      email:
                        event.target.value,
                    }),
                  )
                }
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                {editingUser
                  ? "New Password"
                  : "Password *"}
              </label>

              <Input
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(event) =>
                  setForm(
                    (current) => ({
                      ...current,
                      password:
                        event.target.value,
                    }),
                  )
                }
                placeholder={
                  editingUser
                    ? "Leave blank to keep existing"
                    : "Minimum 8 characters"
                }
              />
            </div>

            {editingUser ? (
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Status
                </label>

                <select
                  value={
                    form.active
                      ? "1"
                      : "0"
                  }
                  onChange={(event) =>
                    setForm(
                      (current) => ({
                        ...current,
                        active:
                          event.target
                            .value ===
                          "1",
                      }),
                    )
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="1">
                    Active
                  </option>

                  <option value="0">
                    Inactive
                  </option>
                </select>
              </div>
            ) : null}

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium">
                Assigned Hotels *
              </label>

              <div className="rounded-lg border">
                <div className="border-b p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                    <Input
                      value={
                        hotelSearch
                      }
                      onChange={(
                        event,
                      ) =>
                        setHotelSearch(
                          event.target
                            .value,
                        )
                      }
                      placeholder="Search assigned hotels..."
                      className="pl-9"
                    />
                  </div>
                </div>

                {form.hotelIds.length >
                0 ? (
                  <div className="flex flex-wrap gap-2 border-b p-3">
                    {form.hotelIds.map(
                      (hotelId) => {
                        const found =
                          hotelResults.find(
                            (hotel) =>
                              Number(
                                hotel.hotel_id,
                              ) ===
                              hotelId,
                          );

                        return (
                          <span
                            key={hotelId}
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary"
                          >
                            {found?.hotel_name ||
                              `Hotel #${hotelId}`}

                            <button
                              type="button"
                              onClick={() =>
                                toggleHotel(
                                  hotelId,
                                )
                              }
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      },
                    )}
                  </div>
                ) : null}

                <div className="max-h-56 overflow-y-auto">
                  {searchingHotels ? (
                    <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </div>
                  ) : null}

                  {!searchingHotels &&
                  hotelResults.length ===
                    0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      No assigned hotels found.
                    </div>
                  ) : null}

                  {!searchingHotels &&
                    hotelResults.map(
                      (hotel) => {
                        const hotelId =
                          Number(
                            hotel.hotel_id,
                          );

                        const checked =
                          form.hotelIds.includes(
                            hotelId,
                          );

                        return (
                          <label
                            key={
                              hotelId
                            }
                            className="flex cursor-pointer items-center gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-muted/30"
                          >
                            <input
                              type="checkbox"
                              checked={
                                checked
                              }
                              onChange={() =>
                                toggleHotel(
                                  hotelId,
                                )
                              }
                              className="h-4 w-4 accent-primary"
                            />

                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">
                                {hotel.hotel_name ||
                                  `Hotel #${hotelId}`}
                              </div>

                              <div className="text-xs text-muted-foreground">
                                ID:{" "}
                                {hotelId}
                                {hotel.hotel_code
                                  ? ` · ${hotel.hotel_code}`
                                  : ""}
                              </div>
                            </div>
                          </label>
                        );
                      },
                    )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() =>
                setDialogOpen(false)
              }
            >
              Cancel
            </Button>

            <Button
              disabled={saving}
              onClick={() =>
                void saveUser()
              }
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}

              {saving
                ? "Saving..."
                : editingUser
                  ? "Save User"
                  : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(
          deletingUser,
        )}
        onOpenChange={(open) => {
          if (
            !open &&
            !deleting
          ) {
            setDeletingUser(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete Hotel Admin User
            </DialogTitle>

            <DialogDescription>
              This deactivates the user's DVI account, hotel assignments, and Hotel Admin permissions.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md bg-muted/40 p-4 text-sm">
            {deletingUser?.name}
            {deletingUser?.email
              ? ` · ${deletingUser.email}`
              : ""}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={deleting}
              onClick={() =>
                setDeletingUser(null)
              }
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() =>
                void confirmDelete()
              }
            >
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}

              {deleting
                ? "Deleting..."
                : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}