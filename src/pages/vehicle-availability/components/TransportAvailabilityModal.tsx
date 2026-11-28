import { useEffect, useRef, useState } from "react";

import {
  fetchAvailabilityResources,
  createAvailabilityPeriod,
  cancelAvailabilityPeriod,
  type TransportAvailabilityKind,
  type TransportAvailabilityPeriod,
  type TransportAvailabilityResources,
} from "@/services/vehicle-availability";

export const availabilityLabels: Record<
  TransportAvailabilityKind,
  string
> = {
  maintenance: "Maintenance",
  reserved: "Reserved",
  driver_leave: "Driver Leave",
  blocked: "Blocked",
};

export const availabilityColors: Record<
  TransportAvailabilityKind,
  string
> = {
  maintenance: "bg-slate-600 text-white",
  reserved: "bg-amber-500 text-white",
  driver_leave: "bg-purple-100 text-purple-800",
  blocked: "bg-red-100 text-red-800",
};

export function periodIncludesDate(
  period: TransportAvailabilityPeriod,
  date: string,
): boolean {
  const dayStart = Date.parse(
    `${date}T00:00:00.000Z`,
  );

  const dayEnd = new Date(dayStart);

  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  return (
    Date.parse(period.startsAt) < dayEnd.getTime() &&
    Date.parse(period.endsAt) > dayStart
  );
}

export function formatPeriodTime(value: string) {
  return value.slice(0, 16).replace("T", " ");
}

type Props = {
  periods?: TransportAvailabilityPeriod[];
  onClose: () => void;
  onChanged: () => Promise<void>;
};

const fieldClass =
  "mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm";

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  return error instanceof Error
    ? error.message
    : fallback;
}

export function TransportAvailabilityModal({
  periods,
  onClose,
  onChanged,
}: Props) {
  const dialogRef =
    useRef<HTMLDialogElement>(null);

  const [kind, setKind] =
    useState<TransportAvailabilityKind>(
      "maintenance",
    );

  const [resourceId, setResourceId] =
    useState("");

  const [startsAt, setStartsAt] =
    useState("");

  const [endsAt, setEndsAt] =
    useState("");

  const [reason, setReason] =
    useState("");

  const [resources, setResources] =
    useState<TransportAvailabilityResources>({
      vehicles: [],
      drivers: [],
    });

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    let active = true;

    fetchAvailabilityResources()
      .then(result => {
        if (
          !Array.isArray(result?.vehicles) ||
          !Array.isArray(result?.drivers)
        ) {
          throw new Error(
            "Invalid availability resource response",
          );
        }

        if (active) {
          setResources(result);
        }
      })
      .catch(error => {
        if (active) {
          setError(
            getErrorMessage(
              error,
              "Unable to load vehicles and drivers",
            ),
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const options =
    kind === "driver_leave"
      ? resources.drivers
      : resources.vehicles;

  const valid =
    options.some(
      option => String(option.id) === resourceId,
    ) &&
    startsAt !== "" &&
    endsAt !== "" &&
    endsAt > startsAt &&
    reason.trim().length > 0;

  async function save() {
    if (!valid || saving || loading) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await createAvailabilityPeriod({
        kind,
        resourceId: Number(resourceId),
        startsAt,
        endsAt,
        reason: reason.trim(),
      });

      setSuccess("Availability saved successfully.");

      setResourceId("");
      setStartsAt("");
      setEndsAt("");
      setReason("");

      await onChanged();
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "Unable to save availability",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function cancelPeriod(id: number) {
    if (
      saving ||
      !window.confirm(
        "Cancel this availability restriction?",
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await cancelAvailabilityPeriod(id);

      setSuccess("Availability restriction cancelled.");

      await onChanged();
    } catch (error) {
      setError(
        getErrorMessage(
          error,
          "Unable to cancel restriction",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="transport-availability-title"
      className="m-auto max-h-[90vh] w-11/12 max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl backdrop:bg-black/40"
      onCancel={event => {
        event.preventDefault();

        if (!saving) {
          onClose();
        }
      }}
    >
      <h2
        id="transport-availability-title"
        className="mb-4 text-lg font-semibold text-slate-900"
      >
        Manage Availability
      </h2>

      {error ? (
        <div
          role="alert"
          className="mb-3 rounded bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          role="status"
          className="mb-3 rounded bg-green-50 p-3 text-sm text-green-700"
        >
          {success}
        </div>
      ) : null}

      <form
        onSubmit={event => {
          event.preventDefault();
          void save();
        }}
      >
        <fieldset
          disabled={saving || loading}
          className="space-y-4"
        >
          <label className="block text-sm text-slate-700">
            Availability Status

            <select
              className={fieldClass}
              value={kind}
              onChange={event => {
                setKind(
                  event.target.value as
                    TransportAvailabilityKind,
                );

                setResourceId("");
              }}
            >
              <option value="maintenance">
                Vehicle Maintenance
              </option>

              <option value="reserved">
                Vehicle Reservation
              </option>

              <option value="driver_leave">
                Driver Leave
              </option>

              <option value="blocked">
                Block Vehicle
              </option>
            </select>
          </label>

          <label className="block text-sm text-slate-700">
            {kind === "driver_leave"
              ? "Choose Driver"
              : "Choose Vehicle"}

            <select
              required
              className={fieldClass}
              value={resourceId}
              onChange={event =>
                setResourceId(event.target.value)
              }
            >
              <option value="">
                {loading
                  ? "Loading..."
                  : "Choose"}
              </option>

              {options.map(option => (
                <option
                  key={option.id}
                  value={option.id}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm text-slate-700">
              Start Date & Time

              <input
                required
                type="datetime-local"
                className={fieldClass}
                value={startsAt}
                onChange={event =>
                  setStartsAt(event.target.value)
                }
              />
            </label>

            <label className="block text-sm text-slate-700">
              End Date & Time

              <input
                required
                type="datetime-local"
                className={fieldClass}
                min={startsAt || undefined}
                value={endsAt}
                onChange={event =>
                  setEndsAt(event.target.value)
                }
              />
            </label>
          </div>

          <label className="block text-sm text-slate-700">
            Reason

            <textarea
              required
              maxLength={255}
              className="mt-1 min-h-[80px] w-full rounded-md border border-slate-300 p-3 text-sm"
              placeholder="Enter reason"
              value={reason}
              onChange={event =>
                setReason(event.target.value)
              }
            />
          </label>
        </fieldset>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm"
          >
            Close
          </button>

          <button
            type="submit"
            disabled={
              saving || loading || !valid
            }
            className="rounded-md bg-purple-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>

      <div className="mt-5 border-t border-slate-200 pt-4">
        <h3 className="mb-3 text-sm font-semibold">
          Saved Restrictions — Selected Calendar Range
        </h3>

        {periods === undefined ? (
          <div className="text-xs text-amber-700">
            Availability records could not be verified.
          </div>
        ) : periods.length === 0 ? (
          <div className="text-xs text-slate-500">
            No restrictions recorded
          </div>
        ) : null}

        <div className="space-y-2">
          {(periods ?? []).map(period => (
            <div
              key={period.id}
              className="flex items-start justify-between gap-3 rounded-md border border-slate-200 p-3"
            >
              <div className="space-y-1 text-xs">
                <div className="font-semibold">
                  {availabilityLabels[period.kind]}
                </div>

                <div className="font-medium">
                  {period.kind === "driver_leave"
                    ? [
                        period.driverName,
                        period.driverMobile,
                      ].filter(Boolean).join(" — ") ||
                      "Driver details unavailable"
                    : period.vehicleKey ||
                      "Vehicle registration unavailable"}
                </div>

                <div>
                  {formatPeriodTime(period.startsAt)}
                  {" → "}
                  {formatPeriodTime(period.endsAt)}
                </div>

                <div className="text-slate-600">
                  {period.reason}
                </div>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  void cancelPeriod(period.id)
                }
                className="shrink-0 text-xs font-medium text-red-600 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          ))}
        </div>
      </div>
    </dialog>
  );
}