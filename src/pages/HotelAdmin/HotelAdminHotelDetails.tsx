import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  ArrowLeft,
  Building2,
  Loader2,
  Save,
} from "lucide-react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getHotelAdminSelectedHotelId,
  hasHotelAdminPermission,
  HotelAdminAPI,
  setHotelAdminSelectedHotelId,
  type HotelAdminContext,
} from "@/services/hotelAdminService";

type HotelRecord = Record<string, unknown>;

type HotelForm = {
  hotel_name: string;
  hotel_code: string;
  hotel_place: string;
  hotel_mobile: string;
  hotel_email: string;
  hotel_country: string;
  hotel_state: string;
  hotel_city: string;
  hotel_pincode: string;
  hotel_address: string;
  hotel_category: string;
  status: string;
  hotel_power_backup: string;
  hotel_margin: string;
  hotel_margin_gst_type: string;
  hotel_margin_gst_percentage: string;
};

const EMPTY_FORM: HotelForm = {
  hotel_name: "",
  hotel_code: "",
  hotel_place: "",
  hotel_mobile: "",
  hotel_email: "",
  hotel_country: "",
  hotel_state: "",
  hotel_city: "",
  hotel_pincode: "",
  hotel_address: "",
  hotel_category: "",
  status: "1",
  hotel_power_backup: "0",
  hotel_margin: "0",
  hotel_margin_gst_type: "1",
  hotel_margin_gst_percentage: "0",
};

function stringValue(
  value: unknown,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value);
}

function statusValue(
  value: unknown,
): string {
  if (
    value === true ||
    value === 1 ||
    value === "1"
  ) {
    return "1";
  }

  return "0";
}

function unwrapHotel(
  value: unknown,
): HotelRecord | null {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return null;
  }

  const record =
    value as HotelRecord;

  if (
    record.data &&
    typeof record.data === "object" &&
    !Array.isArray(record.data)
  ) {
    return record.data as HotelRecord;
  }

  return record;
}

function formFromHotel(
  hotel: HotelRecord,
): HotelForm {
  return {
    hotel_name:
      stringValue(hotel.hotel_name),

    hotel_code:
      stringValue(hotel.hotel_code),

    hotel_place:
      stringValue(hotel.hotel_place),

    hotel_mobile:
      stringValue(hotel.hotel_mobile),

    hotel_email:
      stringValue(hotel.hotel_email),

    hotel_country:
      stringValue(
        hotel.hotel_country_id ??
          hotel.hotel_country,
      ),

    hotel_state:
      stringValue(
        hotel.hotel_state_id ??
          hotel.hotel_state,
      ),

    hotel_city:
      stringValue(
        hotel.hotel_city_id ??
          hotel.hotel_city,
      ),

    hotel_pincode:
      stringValue(hotel.hotel_pincode),

    hotel_address:
      stringValue(hotel.hotel_address),

    hotel_category:
      stringValue(hotel.hotel_category),

    status:
      statusValue(hotel.status),

    hotel_power_backup:
      statusValue(
        hotel.hotel_power_backup,
      ),

    hotel_margin:
      stringValue(
        hotel.hotel_margin ?? 0,
      ),

    hotel_margin_gst_type:
      stringValue(
        hotel.hotel_margin_gst_type ??
          1,
      ),

    hotel_margin_gst_percentage:
      stringValue(
        hotel.hotel_margin_gst_percentage ??
          0,
      ),
  };
}

function positiveHotelId(
  value: unknown,
): number | null {
  const parsed = Number(value);

  return Number.isInteger(parsed) &&
    parsed > 0
    ? parsed
    : null;
}

export default function HotelAdminHotelDetails() {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const hotelIdParam =
    searchParams.get("hotelId");

  const [context, setContext] =
    useState<HotelAdminContext | null>(
      null,
    );

  const [hotelId, setHotelId] =
    useState<number | null>(null);

  const [hotel, setHotel] =
    useState<HotelRecord | null>(null);

  const [form, setForm] =
    useState<HotelForm>(EMPTY_FORM);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [accessDenied, setAccessDenied] =
    useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setAccessDenied(false);

      const nextContext =
        await HotelAdminAPI.me();

      setContext(nextContext);

      if (
        !hasHotelAdminPermission(
          nextContext,
          "hotel_details",
          "view",
        )
      ) {
        setAccessDenied(true);
        setHotel(null);
        return;
      }

      const queryHotelId =
        positiveHotelId(hotelIdParam);

      const storedHotelId =
        getHotelAdminSelectedHotelId();

      const defaultHotelId =
        positiveHotelId(
          nextContext.defaultHotel
            ?.hotel_id,
        );

      const selectedHotelId =
        queryHotelId ??
        storedHotelId ??
        defaultHotelId;

      if (!selectedHotelId) {
        setError(
          "No assigned hotel is available.",
        );
        return;
      }

      setHotelId(selectedHotelId);

      setHotelAdminSelectedHotelId(
        selectedHotelId,
      );

      const response =
        await HotelAdminAPI.hotel(
          selectedHotelId,
        );

      const record =
        unwrapHotel(response);

      if (!record) {
        setError(
          "Hotel details are unavailable.",
        );
        return;
      }

      setHotel(record);
      setForm(formFromHotel(record));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load hotel details.",
      );
    } finally {
      setLoading(false);
    }
  }, [hotelIdParam]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateField(
    key: keyof HotelForm,
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  const canEdit =
    hasHotelAdminPermission(
      context,
      "hotel_details",
      "edit",
    );

  async function save() {
    if (
      !hotelId ||
      !hotel ||
      !canEdit
    ) {
      return;
    }

    const requiredText: Array<
      keyof HotelForm
    > = [
      "hotel_name",
      "hotel_code",
      "hotel_place",
      "hotel_mobile",
      "hotel_email",
      "hotel_country",
      "hotel_state",
      "hotel_city",
      "hotel_pincode",
      "hotel_address",
      "hotel_category",
    ];

    const missing =
      requiredText.find(
        (key) =>
          !form[key].trim(),
      );

    if (missing) {
      toast.error(
        "Please complete all required hotel fields.",
      );
      return;
    }

    const category =
      Number(form.hotel_category);

    const margin =
      Number(form.hotel_margin);

    const gstType =
      Number(
        form.hotel_margin_gst_type,
      );

    const gstPercentage =
      Number(
        form.hotel_margin_gst_percentage,
      );

    if (
      !Number.isFinite(category) ||
      category <= 0
    ) {
      toast.error(
        "Hotel category must be a valid category ID.",
      );
      return;
    }

    if (
      !Number.isFinite(margin) ||
      !Number.isFinite(gstPercentage)
    ) {
      toast.error(
        "Margin and GST percentage must be valid numbers.",
      );
      return;
    }

    try {
      setSaving(true);

      await HotelAdminAPI.updateHotel(
        hotelId,
        {
          hotel_name:
            form.hotel_name.trim(),

          hotel_code:
            form.hotel_code.trim(),

          hotel_place:
            form.hotel_place.trim(),

          hotel_mobile:
            form.hotel_mobile.trim(),

          hotel_email:
            form.hotel_email.trim(),

          hotel_country:
            form.hotel_country.trim(),

          hotel_state:
            form.hotel_state.trim(),

          hotel_city:
            form.hotel_city.trim(),

          hotel_pincode:
            form.hotel_pincode.trim(),

          hotel_address:
            form.hotel_address.trim(),

          hotel_category:
            category,

          status:
            Number(form.status),

          hotel_power_backup:
            Number(
              form.hotel_power_backup,
            ),

          hotel_margin:
            margin,

          hotel_margin_gst_type:
            gstType,

          hotel_margin_gst_percentage:
            gstPercentage,
        },
      );

      const refreshed =
        unwrapHotel(
          await HotelAdminAPI.hotel(
            hotelId,
          ),
        );

      if (refreshed) {
        setHotel(refreshed);

        setForm(
          formFromHotel(refreshed),
        );
      }

      toast.success(
        "Hotel details updated successfully",
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to update hotel details",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading hotel details...
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        You do not have permission to view hotel details.
      </div>
    );
  }

  if (error || !hotel || !hotelId) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error ||
            "Hotel details are unavailable."}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            navigate(
              "/hotel-admin/hotels",
            )
          }
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Hotels
        </Button>
      </div>
    );
  }

  const cityName =
    stringValue(
      hotel.hotel_city_name ??
        hotel.city_name,
    );

  const stateName =
    stringValue(
      hotel.hotel_state_name ??
        hotel.state_name,
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Hotel Details
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage the real DVI hotel profile for the selected assigned hotel.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() =>
            navigate(
              "/hotel-admin/hotels",
            )
          }
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Change Hotel
        </Button>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="mb-6 flex items-center gap-3 border-b pb-4">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Building2 className="h-5 w-5" />
          </div>

          <div>
            <div className="font-semibold">
              {stringValue(
                hotel.hotel_name,
              ) ||
                `Hotel #${hotelId}`}
            </div>

            <div className="text-xs text-muted-foreground">
              Hotel ID: {hotelId}
              {stringValue(
                hotel.hotel_code,
              )
                ? ` · ${stringValue(
                    hotel.hotel_code,
                  )}`
                : ""}
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Hotel Name *
            </label>

            <Input
              value={form.hotel_name}
              disabled={!canEdit}
              onChange={(event) =>
                updateField(
                  "hotel_name",
                  event.target.value,
                )
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Hotel Code *
            </label>

            <Input
              value={form.hotel_code}
              disabled={!canEdit}
              onChange={(event) =>
                updateField(
                  "hotel_code",
                  event.target.value,
                )
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Place *
            </label>

            <Input
              value={form.hotel_place}
              disabled={!canEdit}
              onChange={(event) =>
                updateField(
                  "hotel_place",
                  event.target.value,
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
              value={form.hotel_email}
              disabled={!canEdit}
              onChange={(event) =>
                updateField(
                  "hotel_email",
                  event.target.value,
                )
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Mobile *
            </label>

            <Input
              value={form.hotel_mobile}
              disabled={!canEdit}
              onChange={(event) =>
                updateField(
                  "hotel_mobile",
                  event.target.value,
                )
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Postal Code *
            </label>

            <Input
              value={form.hotel_pincode}
              disabled={!canEdit}
              onChange={(event) =>
                updateField(
                  "hotel_pincode",
                  event.target.value,
                )
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Country *
            </label>

            <Input
              value={form.hotel_country}
              disabled={!canEdit}
              onChange={(event) =>
                updateField(
                  "hotel_country",
                  event.target.value,
                )
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              State *
            </label>

            <Input
              value={form.hotel_state}
              disabled={!canEdit}
              onChange={(event) =>
                updateField(
                  "hotel_state",
                  event.target.value,
                )
              }
            />

            {stateName &&
            stateName !== form.hotel_state ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {stateName}
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              City *
            </label>

            <Input
              value={form.hotel_city}
              disabled={!canEdit}
              onChange={(event) =>
                updateField(
                  "hotel_city",
                  event.target.value,
                )
              }
            />

            {cityName &&
            cityName !== form.hotel_city ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {cityName}
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Hotel Category ID *
            </label>

            <Input
              type="number"
              min="1"
              value={form.hotel_category}
              disabled={!canEdit}
              onChange={(event) =>
                updateField(
                  "hotel_category",
                  event.target.value,
                )
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Status
            </label>

            <select
              value={form.status}
              disabled={!canEdit}
              onChange={(event) =>
                updateField(
                  "status",
                  event.target.value,
                )
              }
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="1">
                Active
              </option>

              <option value="0">
                Inactive
              </option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Power Backup
            </label>

            <select
              value={
                form.hotel_power_backup
              }
              disabled={!canEdit}
              onChange={(event) =>
                updateField(
                  "hotel_power_backup",
                  event.target.value,
                )
              }
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="1">
                Available
              </option>

              <option value="0">
                Not Available
              </option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Hotel Margin
            </label>

            <Input
              type="number"
              step="0.01"
              value={form.hotel_margin}
              disabled={!canEdit}
              onChange={(event) =>
                updateField(
                  "hotel_margin",
                  event.target.value,
                )
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Margin GST Type
            </label>

            <select
              value={
                form.hotel_margin_gst_type
              }
              disabled={!canEdit}
              onChange={(event) =>
                updateField(
                  "hotel_margin_gst_type",
                  event.target.value,
                )
              }
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="1">
                Included
              </option>

              <option value="2">
                Excluded
              </option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Margin GST %
            </label>

            <Input
              type="number"
              min="0"
              step="0.01"
              value={
                form.hotel_margin_gst_percentage
              }
              disabled={!canEdit}
              onChange={(event) =>
                updateField(
                  "hotel_margin_gst_percentage",
                  event.target.value,
                )
              }
            />
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <label className="mb-2 block text-sm font-medium">
              Address *
            </label>

            <textarea
              value={form.hotel_address}
              disabled={!canEdit}
              onChange={(event) =>
                updateField(
                  "hotel_address",
                  event.target.value,
                )
              }
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 border-t pt-5">
          {!canEdit ? (
            <span className="text-sm text-muted-foreground">
              View-only access
            </span>
          ) : (
            <span />
          )}

          <Button
            type="button"
            disabled={
              !canEdit ||
              saving
            }
            onClick={() =>
              void save()
            }
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}

            {saving
              ? "Saving..."
              : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}