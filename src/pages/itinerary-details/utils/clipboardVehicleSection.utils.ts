import { formatHeaderDate } from './timeline.utils';
import { escapeHtml } from './clipboardFormatting.utils';
import {
  formatClipboardMoneyWithSymbol,
} from './clipboardItineraryTotals.utils';
type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value !== null && typeof value === 'object'
    ? (value as UnknownRecord)
    : {};

const formatClipboardTransportTime = (
  value: unknown,
): string => {
  const raw = String(value ?? "").trim();

  if (!raw) {
    return "";
  }

  /*
   * Already formatted time:
   * 05:30 PM
   */
  if (
    /^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(raw)
  ) {
    return raw.toUpperCase();
  }

  /*
   * Backend/day values can be:
   * 17:30
   * 17:30:00
   * or contain a HH:mm:ss time portion.
   *
   * Read the time directly instead of using Date(),
   * so clipboard display does not get timezone shifted.
   */
  const match = raw.match(
    /(?:T|\s|^)(\d{1,2}):(\d{2})(?::\d{2})?/,
  );

  if (!match) {
    return raw;
  }

  const hours = Number(match[1]);
  const minutes = match[2];

  if (
    !Number.isFinite(hours) ||
    hours < 0 ||
    hours > 23
  ) {
    return raw;
  }

  const suffix =
    hours >= 12 ? "PM" : "AM";

  const hour12 =
    hours % 12 || 12;

  return `${hour12}:${minutes} ${suffix}`;
};

const getVehicleDateRange = (
  vehicle: UnknownRecord,
  days: UnknownRecord[],
): string => {
  const startDate =
    vehicle.startDate ??
    vehicle.fromDate ??
    vehicle.start_date;

  const endDate =
    vehicle.endDate ??
    vehicle.toDate ??
    vehicle.end_date;

  if (startDate || endDate) {
    const start = startDate
      ? formatHeaderDate(String(startDate))
      : '';

    const end = endDate
      ? formatHeaderDate(String(endDate))
      : '';

    if (start && end) {
      return `${start} ==> ${end}`;
    }

    return start || end;
  }

  if (!days.length) {
    return '';
  }

  const firstDay = days[0];
  const lastDay = days[days.length - 1];

  const firstDate =
    firstDay.date ??
    firstDay.itineraryDate ??
    firstDay.travelDate;

  const lastDate =
    lastDay.date ??
    lastDay.itineraryDate ??
    lastDay.travelDate;

  if (!firstDate && !lastDate) {
    return '';
  }

  const start = firstDate
    ? formatHeaderDate(String(firstDate))
    : '';

  const end = lastDate
    ? formatHeaderDate(String(lastDate))
    : '';

  if (start && end) {
    return `${start} ==> ${end}`;
  }

  return start || end;
};

export const buildClipboardVehicleSectionHtml = ({
  vehiclesValue,
  daysValue,
  transportLegs = [],
  shouldShowVehicles,
  packageTotalHtml = '',
  layout = 'default',
  styles,
}: {
  vehiclesValue: unknown;
  daysValue: unknown;

  transportLegs?: Array<{
    vehicles: unknown;
    days: unknown;
  }>;

  shouldShowVehicles: boolean;
  packageTotalHtml?: string;
  layout?: 'default' | 'hotelVehicle';

  styles: {
    tableStyle: string;
    cellStyle: string;
    headerCellStyle: string;
    centerTitleStyle: string;
  };
}): string => {
  if (!shouldShowVehicles) return '';

  const vehicles = Array.isArray(vehiclesValue)
    ? vehiclesValue.map(asRecord)
    : [];

  const days = Array.isArray(daysValue)
    ? daysValue.map(asRecord)
    : [];
    /*
 * Senior Hotel + Vehicle clipboard format.
 *
 * This branch is used only when the caller explicitly sends:
 *
 *   layout: "hotelVehicle"
 *
 * The existing/default vehicle clipboard stays unchanged.
 */
if (layout === "hotelVehicle") {
  /*
   * Single and multi-leg use exactly the same
   * Transportation Details table.
   *
   * Single itinerary:
   *   one transport leg -> one table row
   *
   * Multi-leg:
   *   multiple transport legs -> multiple rows
   */
  const effectiveTransportLegs =
    transportLegs.length > 0
      ? transportLegs
      : [
          {
            vehicles,
            days,
          },
        ];

  const transportationRowsHtml =
    effectiveTransportLegs
      .map((transportLeg) => {
        /*
         * vehiclesValue passed by the clipboard builder
         * is already filtered to selected vehicles.
         *
         * Do not filter it again here because that can
         * incorrectly remove a persisted selected row.
         */
        const legVehicles = Array.isArray(
          transportLeg.vehicles,
        )
          ? transportLeg.vehicles.map(asRecord)
          : [];

        const legDays = Array.isArray(
          transportLeg.days,
        )
          ? transportLeg.days.map(asRecord)
          : [];

        if (
          legVehicles.length === 0 &&
          legDays.length === 0
        ) {
          return "";
        }

        const vehicleLabel =
          legVehicles.length > 0
            ? legVehicles
                .map((vehicle) => {
                  const vehicleName = String(
                    vehicle.vehicleTypeName ??
                      vehicle.vehicleName ??
                      "Vehicle",
                  ).trim();

                  const quantityValue = Number(
                    vehicle.totalQty ??
                      vehicle.quantity ??
                      1,
                  );

                  const quantity =
                    Number.isFinite(
                      quantityValue,
                    ) &&
                    quantityValue > 0
                      ? quantityValue
                      : 1;

                  return `${quantity} ${vehicleName}`;
                })
                .join(" & ")
            : "--";

        /*
         * Same existing KM business data.
         *
         * Prefer totalAllowedKm.
         * Fall back to day-wise totalKms.
         */
 const readKmValue = (
  value: unknown,
): number => {
  if (
    value === null ||
    value === undefined
  ) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : 0;
  }

  const match = String(value)
    .replace(/,/g, "")
    .match(/-?\d+(?:\.\d+)?/);

  if (!match) {
    return 0;
  }

  const amount = Number(match[0]);

  return Number.isFinite(amount)
    ? amount
    : 0;
};

const vehicleKmFromVehicle =
  legVehicles.reduce(
    (maxKm, vehicle) => {
      /*
       * First priority:
       * actual Garage-to-Garage / used KM returned
       * by vehicle pricing.
       */
      const outstationUsedKm =
        readKmValue(
          vehicle.outstationUsedKm,
        );

      if (outstationUsedKm > 0) {
        return Math.max(
          maxKm,
          outstationUsedKm,
        );
      }

      const totalUsedKm =
        readKmValue(
          vehicle.totalUsedKm,
        );

      if (totalUsedKm > 0) {
        return Math.max(
          maxKm,
          totalUsedKm,
        );
      }

      /*
       * Older vehicle responses:
       * sum the day-wise pricing KM.
       */
      const dayWisePricing =
        Array.isArray(
          vehicle.dayWisePricing,
        )
          ? vehicle.dayWisePricing
          : [];

      const dayWiseTotalKm =
        dayWisePricing.reduce(
          (sum, dayValue) => {
            const day =
              asRecord(dayValue);

            return (
              sum +
              readKmValue(
                day.totalKms,
              )
            );
          },
          0,
        );

      return Math.max(
        maxKm,
        dayWiseTotalKm,
      );
    },
    0,
  );

/*
 * Some itinerary-details responses do not carry
 * used-KM fields on the selected vehicle row.
 *
 * In that case use the actual itinerary route KM
 * rather than displaying "--".
 */
const dayLevelKm =
  legDays.reduce(
    (sum, day) => {
      const distance =
        readKmValue(
          day.distance ??
            day.totalDistance ??
            day.total_distance ??
            day.totalKm ??
            day.totalKms,
        );

      return sum + distance;
    },
    0,
  );

/*
 * If day-level distance is unavailable too,
 * fall back to travel-segment distances.
 *
 * Do not add both day-level and segment-level KM,
 * because that would double-count the same route.
 */
const segmentLevelKm =
  dayLevelKm > 0
    ? 0
    : legDays.reduce(
        (total, day) => {
          const segments =
            Array.isArray(day.segments)
              ? day.segments
              : [];

          const daySegmentKm =
            segments.reduce(
              (
                segmentTotal,
                segmentValue,
              ) => {
                const segment =
                  asRecord(
                    segmentValue,
                  );

                const segmentType =
                  String(
                    segment.type ??
                      segment.itemType ??
                      segment.item_type ??
                      "",
                  )
                    .trim()
                    .toLowerCase();

                if (
                  segmentType !==
                    "travel" &&
                  segmentType !==
                    "transport"
                ) {
                  return segmentTotal;
                }

                return (
                  segmentTotal +
                  readKmValue(
                    segment.distance ??
                      segment.totalDistance ??
                      segment.total_distance ??
                      segment.km ??
                      segment.kms,
                  )
                );
              },
              0,
            );

          return (
            total +
            daySegmentKm
          );
        },
        0,
      );

const vehicleKmBlock =
  vehicleKmFromVehicle > 0
    ? vehicleKmFromVehicle
    : dayLevelKm > 0
      ? dayLevelKm
      : segmentLevelKm;
        const firstDay =
          legDays[0] ?? {};

        const lastDay =
          legDays[legDays.length - 1] ??
          firstDay;

        const arrivalDateRaw =
          firstDay.date ??
          firstDay.routeDate ??
          firstDay.startDate ??
          firstDay.itineraryDate ??
          firstDay.travelDate;

        const departureDateRaw =
          lastDay.date ??
          lastDay.routeDate ??
          lastDay.startDate ??
          lastDay.itineraryDate ??
          lastDay.travelDate;

     const arrivalDate =
  arrivalDateRaw
    ? formatHeaderDate(
        String(arrivalDateRaw),
      )
    : "";

const departureDate =
  departureDateRaw
    ? formatHeaderDate(
        String(departureDateRaw),
      )
    : "";

const arrivalLocation =
  String(
    firstDay.departure ??
      firstDay.source ??
      firstDay.from ??
      firstDay.locationName ??
      firstDay.arrival ??
      "",
  ).trim();

const departureLocation =
  String(
    lastDay.arrival ??
      lastDay.destination ??
      lastDay.to ??
      lastDay
        .nextVisitingLocation ??
      lastDay.departure ??
      "",
  ).trim();

/*
 * Senior Transportation Details format:
 *
 * Arrival column uses first itinerary day's start time.
 * Departure column uses final itinerary day's end time.
 */
const arrivalTime =
  formatClipboardTransportTime(
    firstDay.startTime ??
      firstDay.start_time ??
      firstDay.arrivalTime ??
      firstDay.arrival_time,
  );

const departureTime =
  formatClipboardTransportTime(
    lastDay.endTime ??
      lastDay.end_time ??
      lastDay.departureTime ??
      lastDay.departure_time,
  );

        return `
          <tr>
          <td
  style="
    ${styles.cellStyle}
    vertical-align:top;
  "
>
  ${escapeHtml(
    [
      arrivalDate,
      arrivalLocation,
    ]
      .filter(Boolean)
      .join(" at "),
  )}

  ${
    arrivalTime
      ? `
        <br/>
        Arrival Time :: ${escapeHtml(
          arrivalTime,
        )}
      `
      : ""
  }
</td>

        <td
  style="
    ${styles.cellStyle}
    vertical-align:top;
  "
>
  ${escapeHtml(
    [
      departureDate,
      departureLocation,
    ]
      .filter(Boolean)
      .join(" at "),
  )}

  ${
    departureTime
      ? `
        <br/>
        Departure Time :: ${escapeHtml(
          departureTime,
        )}
      `
      : ""
  }
</td>

            <td
              style="
                ${styles.cellStyle}
                vertical-align:top;
              "
            >
              ${escapeHtml(
                vehicleLabel,
              )}
            </td>

            <td
              style="
                ${styles.cellStyle}
                vertical-align:top;
                text-align:center;
              "
            >
              ${
                vehicleKmBlock > 0
                  ? escapeHtml(
                      String(
                        vehicleKmBlock,
                      ),
                    )
                  : "--"
              }
            </td>
          </tr>
        `;
      })
      .filter(Boolean)
      .join("");

  return `
<div
  style="
    ${styles.centerTitleStyle}
    line-height:24px;
    padding:2px 0;
    margin:2px 0;
  "
>
  Transportation Details
</div>

    <table
      width="700"
      border="1"
      cellpadding="0"
      cellspacing="0"
      style="${styles.tableStyle}"
    >
      <tr>
        <th
          style="
            ${styles.headerCellStyle}
            width:24%;
          "
        >
          Arrival
        </th>

        <th
          style="
            ${styles.headerCellStyle}
            width:24%;
          "
        >
          Departure Date
        </th>

        <th
          style="
            ${styles.headerCellStyle}
            width:32%;
          "
        >
          Vehicles
        </th>

        <th
          style="
            ${styles.headerCellStyle}
            width:20%;
          "
        >
          Vehicle KM Block<br/>
          (Garage to Garage)
        </th>
      </tr>

      ${
        transportationRowsHtml ||
        `
          <tr>
            <td
              colspan="4"
              style="
                ${styles.cellStyle}
                text-align:center;
              "
            >
              No Vehicle available
            </td>
          </tr>
        `
      }
    </table>

    ${packageTotalHtml}
  `;
}

  const vehicleRows = vehicles
    .map((vehicle) => {
      const vehicleName = String(
        vehicle.vehicleTypeName ??
          vehicle.vehicleName ??
          'Vehicle',
      ).trim();

      const quantityValue = Number(
        vehicle.totalQty ?? vehicle.quantity ?? 1,
      );

      const quantity =
        Number.isFinite(quantityValue) &&
        quantityValue > 0
          ? quantityValue
          : 1;

const detailText =
  `${vehicleName} (${quantity})`;

const amount = Number(
  vehicle.totalAmount ??
    vehicle.amount ??
    vehicle.totalCost ??
    0,
);

const safeAmount = Number.isFinite(amount)
  ? amount
  : 0;

      return `
        <tr>
          <td style="${styles.cellStyle}font-weight:700;">
            ${escapeHtml(detailText)}
          </td>

          <td style="${styles.cellStyle}font-weight:700;">
           ${escapeHtml(
  formatClipboardMoneyWithSymbol(safeAmount),
)}
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <div style="${styles.centerTitleStyle}margin-top:22px;">
      Vehicle Details
    </div>

    <table
      width="700"
      border="1"
      cellpadding="0"
      cellspacing="0"
      style="${styles.tableStyle}"
    >
      <tr>
        <th style="${styles.headerCellStyle}width:85%;">
          Vehicle Details
        </th>

        <th style="${styles.headerCellStyle}width:15%;">
          Total Amount
        </th>
      </tr>

      ${packageTotalHtml}

      ${
        vehicleRows ||
        `
          <tr>
            <td
              colspan="2"
              style="${styles.cellStyle}text-align:center;"
            >
              No Vehicle available
            </td>
          </tr>
        `
      }
    </table>
  `;
};