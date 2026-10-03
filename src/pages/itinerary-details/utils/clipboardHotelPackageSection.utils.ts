import { escapeHtml } from './clipboardFormatting.utils';
import {
  expandHotelRowsForClipboard,
  getClipboardHotelDayLabel,
} from './clipboardHotelRows.utils';

export const buildClipboardHotelPackageSectionHtml = ({
  hotels,
  roomCount,
  groupIndex,
  sectionTitle,
  vehicleSectionHtml,
  packageTotalHtml,
  costSectionHtml,
  styles,
}: {
  hotels: unknown[];
  roomCount: unknown;
  groupIndex: number;
  sectionTitle: string;
  vehicleSectionHtml: string;
  packageTotalHtml: string;
  costSectionHtml: string;
  styles: {
    tableStyle: string;
    cellStyle: string;
    headerCellStyle: string;
    centerTitleStyle: string;
  };
}): string => {
const normalizeClipboardDate = (value: unknown): string => {
  const raw = String(value ?? '').trim();

  if (!raw) {
    return '';
  }

  return raw.slice(0, 10);
};

const clipboardHotels = hotels.flatMap((hotel: any) => {
  const legItinerary = hotel?.__clipboardLegItinerary;

  const expandedRows = expandHotelRowsForClipboard([hotel]);

  return expandedRows.map((expandedHotel: any) => {
    const hotelDate = normalizeClipboardDate(
      expandedHotel.startDate ??
      expandedHotel.date ??
      expandedHotel.checkInDate ??
      expandedHotel.hotelCheckInDate
    );

    const matchingDay = Array.isArray(legItinerary?.days)
      ? legItinerary.days.find((day: any) => {
          const dayDate = normalizeClipboardDate(
            day.startDate ??
            day.date ??
            day.travelDate
          );

          return Boolean(
            hotelDate &&
            dayDate &&
            hotelDate === dayDate
          );
        })
      : undefined;

    const stayDestination =
      String(
        expandedHotel.destination ??
        expandedHotel.destinationName ??
        expandedHotel.hotelDestination ??
        expandedHotel.cityName ??
        expandedHotel.city ??
        ''
      ).trim() ||
      String(
        matchingDay?.destination ??
        matchingDay?.destinationName ??
        matchingDay?.cityName ??
        matchingDay?.city ??
        ''
      ).trim();

    return {
      ...expandedHotel,
      destination: stayDestination,
    };
  });
});

const formatLegDropDate = (
  value: unknown,
): string => {
  const normalized =
    normalizeClipboardDate(value);

  if (!normalized) {
    return "";
  }

  const [year, month, day] =
    normalized.split("-").map(Number);

  if (!year || !month || !day) {
    return normalized;
  }

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return `${day} ${
    monthNames[month - 1] || ""
  } ${String(year).slice(-2)}`;
};

const rowsHtml =
  clipboardHotels.length > 0
    ? clipboardHotels
        .map((hotel: any, index) => {
          const previousHotel: any =
            index > 0
              ? clipboardHotels[index - 1]
              : null;

          const nextHotel: any =
            index <
            clipboardHotels.length - 1
              ? clipboardHotels[index + 1]
              : null;

          const currentLegLabel =
            String(
              hotel.__clipboardLegLabel ||
                "Leg 1",
            ).trim();

          const previousLegLabel =
            String(
              previousHotel
                ?.__clipboardLegLabel ||
                "",
            ).trim();

          const nextLegLabel =
            String(
              nextHotel?.__clipboardLegLabel ||
                "",
            ).trim();

          const isFirstRowOfLeg =
            index === 0 ||
            currentLegLabel !==
              previousLegLabel;

          const isLastRowOfLeg =
            index ===
              clipboardHotels.length - 1 ||
            currentLegLabel !==
              nextLegLabel;

          const isDayZero =
            hotel.__clipboardDayZero ===
              true ||
            hotel.previousDayBillingSynthetic ===
              true;

          const hotelName = isDayZero
            ? `${String(
                hotel.hotelName || "--",
              )} (Early check-in room block)`
            : String(
                hotel.hotelName || "--",
              );

          const rawHotelCategory =
            String(
              hotel.category ?? "",
            ).trim();

          const hotelCategorySuffix =
            rawHotelCategory &&
            Number(rawHotelCategory) !== 0
              ? ` - ${escapeHtml(
                  rawHotelCategory,
                )}`
              : "";

          const legArrival =
            String(
              hotel.__clipboardLegArrival ||
                "",
            ).trim();

          const legDeparture =
            String(
              hotel
                .__clipboardLegDeparture ||
                "",
            ).trim();

          const dropDate =
            formatLegDropDate(
              hotel
                .__clipboardLegDropDate,
            );

          const legHeaderHtml =
            isFirstRowOfLeg
              ? `
                <tr>
                  <td
                    colspan="5"
                    style="
                      ${styles.cellStyle}
                      font-weight:400;
                      text-align:left;
                      padding:4px 6px;
                      background:#ffffff;
                    "
                  >
                    ${escapeHtml(
                      currentLegLabel,
                    )}
                    - Arrival at ::
                    ${escapeHtml(
                      legArrival || "--",
                    )}
                    :
                    Departure ::
                    ${escapeHtml(
                      legDeparture || "--",
                    )}
                  </td>
                </tr>
              `
              : "";

          const hotelRowHtml = `
            <tr>
              <td
                style="
                  ${styles.cellStyle}
                  white-space:nowrap;
                "
              >
                ${escapeHtml(
                  getClipboardHotelDayLabel(
                    hotel,
                    index + 1,
                  ),
                )}
              </td>

              <td
                style="${styles.cellStyle}"
              >
                ${escapeHtml(
                  hotel.destination,
                )}
              </td>

              <td
                style="${styles.cellStyle}"
              >
                ${escapeHtml(
                  hotelName,
                )}${hotelCategorySuffix}
              </td>

              <td
                style="${styles.cellStyle}"
              >
                ${escapeHtml(
                  hotel.roomType,
                )} - ${escapeHtml(
                  roomCount,
                )}
              </td>

              <td
                style="${styles.cellStyle}"
              >
                ${escapeHtml(
                  String(
                    hotel.mealPlan || "",
                  ).trim() || "CP",
                )}
              </td>
            </tr>
          `;

          const dropRowHtml =
            isLastRowOfLeg
              ? `
                <tr>
                  <td
                    colspan="5"
                    style="
                      ${styles.cellStyle}
                      padding:4px 6px;
                      text-align:left;
                      background:#eeeeee;
                    "
                  >
                   ${escapeHtml(
  dropDate || "--",
)}
&nbsp;&nbsp; - Drop at
${escapeHtml(
  legDeparture || "--",
)}
                  </td>
                </tr>
              `
              : "";

          return [
            legHeaderHtml,
            hotelRowHtml,
            dropRowHtml,
          ].join("");
        })
        .join("")
    : `
        <tr>
          <td
            colspan="5"
            style="
              ${styles.cellStyle}
              text-align:center;
            "
          >
            No hotel available
          </td>
        </tr>
      `;

return `
  ${
    groupIndex > 0
      ? `
        <div
          style="
            ${styles.centerTitleStyle}
            line-height:24px;
            padding:2px 0;
            margin:2px 0;
          "
        >
          Travel Plan ${groupIndex + 1}
        </div>
      `
      : ''
  }

  ${vehicleSectionHtml}

  <div
    style="
      ${styles.centerTitleStyle}
      line-height:24px;
      padding:2px 0;
      margin:2px 0;
    "
  >
    Hotels Curated Choice:${groupIndex + 1}
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
        style="${styles.headerCellStyle}width:20%;"
      >
        Day
      </th>

      <th
        style="${styles.headerCellStyle}width:20%;"
      >
        Destination
      </th>

      <th
        style="${styles.headerCellStyle}width:20%;"
      >
        Hotel Name -<br/>Category
      </th>

      <th
        style="${styles.headerCellStyle}width:20%;"
      >
        Room Type -<br/>Count
      </th>

      <th
        style="${styles.headerCellStyle}width:20%;"
      >
        Meal Plan
      </th>
    </tr>

    ${rowsHtml}
  </table>

  ${packageTotalHtml}

  ${costSectionHtml}
`;
};