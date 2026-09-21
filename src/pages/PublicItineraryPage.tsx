import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useParams,
} from "react-router-dom";

import {
  BedDouble,
  CalendarDays,
  CarFront,
  ChevronDown,
  Clock3,
  Copy,
  FileDown,
  Hotel,
  Hourglass,
  Image as ImageIcon,
  MapPin,
  Route,
  Share2,
  Video,
} from "lucide-react";

import {
  ApiError,
} from "@/lib/api";

import {
  ItineraryService,
} from "@/services/itinerary";

/* -------------------------------------------------------
 * TYPES
 * ----------------------------------------------------- */

type PublicActivity = {
  id?: number;
  title?: string;
  description?: string;
  amount?: number;
  startTime?: string | null;
  endTime?: string | null;
  duration?: string | null;
  image?: string | null;
};

type PublicSegment = {
  type?: string | null;

  title?: string | null;
  text?: string | null;

  from?: string | null;
  to?: string | null;
  location?: string | null;

  name?: string | null;
  description?: string | null;

  hotelName?: string | null;
  hotelAddress?: string | null;

  time?: string | null;
  timeRange?: string | null;
  visitTime?: string | null;

  duration?: string | null;
  distance?: string | null;

  image?: string | null;
  galleryImages?: string[];

  videoUrl?: string | null;
  note?: string | null;

  activities?: PublicActivity[];
};

type PublicDay = {
  id?: number;
  dayNumber?: number;

  date?: string | null;

  departure?: string | null;
  arrival?: string | null;

  distance?: string | null;

  startTime?: string | null;
  endTime?: string | null;

  segments?: PublicSegment[];
};

type PublicHotel = {
  day?: string | null;
  date?: string | null;

  destination?: string | null;

  hotelName?: string | null;

  category?:
    | string
    | number
    | null;

  roomType?: string | null;
  mealPlan?: string | null;

  totalAmount?: number;
};

type PublicHotelGroup = {
  groupType: number;

  label?: string;

  totalAmount?: number;

  vehicleCost?: number;

  hotelCost?: number;

  totalPackageCost?: number;

  hotels?: PublicHotel[];
};

type PublicItinerary = {
  quoteId?: string;

  dateRange?: string;

  agentLogo?: string | null;

  dayCount?: number;
  nightCount?: number;

  adults?: number;
  children?: number;
  infants?: number;

  roomCount?: number;
  extraBed?: number;

  childWithBed?: number;
  childWithoutBed?: number;

  overallCost?:
    | string
    | number;

  finalTotal?:
    | string
    | number;

  days?: PublicDay[];

  selectedHotelGroup?: number;

  hotelGroups?:
    PublicHotelGroup[];

  packageIncludes?: {
    description?: string;
    houseBoatNote?: string;
    rateNote?: string;
  };

  costSummary?: {
    totalAmount?: number;
    totalRoundOff?: number;
    netPay?: number;
  };
};

type PublicResponse = {
  itinerary?: PublicItinerary;

  expiresAt?: string;
};

/* -------------------------------------------------------
 * HELPERS
 * ----------------------------------------------------- */

const API_ORIGIN = String(
  import.meta.env
    .VITE_API_DVI_BASE_URL ?? "",
)
  .trim()
  .replace(/\/api\/v1\/?$/i, "")
  .replace(/\/+$/, "");

  function resolveAgentLogo(
  value?: string | null,
) {
  const raw =
    String(value ?? "").trim();

  if (!raw) {
    return "";
  }

  /*
   * Already a complete URL.
   */
  if (
    /^https?:\/\//i.test(raw) ||
    raw.startsWith("//") ||
    raw.startsWith("data:") ||
    raw.startsWith("blob:")
  ) {
    return raw;
  }

  /*
   * Backend may already return:
   *
   * /uploads/agent_gallery/file.jpg
   * uploads/agent_gallery/file.jpg
   */
  if (
    raw.startsWith("/uploads/")
  ) {
    return API_ORIGIN
      ? `${API_ORIGIN}${raw}`
      : raw;
  }

  if (
    raw.startsWith("uploads/")
  ) {
    return API_ORIGIN
      ? `${API_ORIGIN}/${raw}`
      : `/${raw}`;
  }

  /*
   * dvi_agent_configuration.site_logo
   * normally stores only the filename.
   */
  const fileName =
    encodeURIComponent(raw);

  return API_ORIGIN
    ? `${API_ORIGIN}/uploads/agent_gallery/${fileName}`
    : `/uploads/agent_gallery/${fileName}`;
}

function mediaUrl(
  value?: string | null,
) {
  const raw =
    String(value || "").trim();

  if (!raw) {
    return "";
  }

  if (
    /^https?:\/\//i.test(raw)
  ) {
    return raw;
  }

  if (!API_ORIGIN) {
    return raw;
  }

  return `${API_ORIGIN}${
    raw.startsWith("/")
      ? raw
      : `/${raw}`
  }`;
}

function decodeHtmlEntities(
  value?: string | null,
) {
  const raw = String(value || "");

  if (!raw || !raw.includes("&")) {
    return raw;
  }

  return (
    new DOMParser()
      .parseFromString(raw, "text/html")
      .documentElement.textContent || raw
  );
}

function waitForImages(
  root: HTMLElement,
) {
  const images = Array.from(
    root.querySelectorAll("img"),
  );

  return Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          let settled = false;

          const finish = () => {
            if (settled) {
              return;
            }

            settled = true;
            window.clearTimeout(timeoutId);
            image.removeEventListener(
              "load",
              finish,
            );
            image.removeEventListener(
              "error",
              finish,
            );
            resolve();
          };

          const timeoutId = window.setTimeout(
            finish,
            5000,
          );

          if (image.complete) {
            finish();
            return;
          }

          image.addEventListener(
            "load",
            finish,
            { once: true },
          );
          image.addEventListener(
            "error",
            finish,
            { once: true },
          );
        }),
    ),
  );
}

function money(
  value: unknown,
) {
  const amount =
    Number(value || 0);

  if (
    !Number.isFinite(amount)
  ) {
    return "0.00";
  }

  return amount.toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );
}

function humanDate(
  value?: string | null,
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-US",
    {
      weekday: "short",
      month: "short",
      day: "2-digit",
      year: "numeric",
    },
  );
}

function summaryDate(
  value?: string,
) {
  const raw =
    String(value || "").trim();

  if (!raw) {
    return "";
  }

  const parts =
    raw.split(
      /\s+to\s+/i,
    );

  if (
    parts.length !== 2
  ) {
    return raw;
  }

  const start =
    humanDate(parts[0])
      .replace(
        /^[A-Za-z]{3},\s*/,
        "",
      );

  const end =
    humanDate(parts[1])
      .replace(
        /^[A-Za-z]{3},\s*/,
        "",
      );

  return `${start} To ${end}`;
}

function hotelCategory(
  value: unknown,
) {
  const raw =
    String(
      value ?? "",
    ).trim();

  if (!raw) {
    return "";
  }

  const numeric =
    Number(raw);

  if (
    Number.isInteger(numeric) &&
    numeric >= 1 &&
    numeric <= 5
  ) {
    return `${numeric}*`;
  }

  return raw;
}

/* -------------------------------------------------------
 * SEGMENT
 * ----------------------------------------------------- */

function TimelineSegment({
  segment,
  isCustomerView,
}: {
  segment: PublicSegment;
  isCustomerView: boolean;
}) {
  const type =
    String(
      segment.type || "",
    ).toLowerCase();

  /*
   * Public page must never show
   * "Click to Add Hotspot".
   */
  if (
    type === "hotspot"
  ) {
    return null;
  }

  if (
    type === "start"
  ) {
    return (
     <div
  data-pdf-keep-together
  className="relative flex items-center gap-4 py-3"
>
        <div className="relative z-10 grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f5f4f7] text-[#625a73]">
          <BedDouble className="block h-5 w-5 shrink-0" />
        </div>

        <div className="flex min-h-11 flex-col justify-center overflow-visible leading-none">
          <div className="text-[17px] font-medium leading-none text-[#4c4658]">
            {segment.title ||
              "Start your Journey"}
          </div>

          {segment.timeRange && (
            <div className="mt-1 flex h-4 items-center gap-2 overflow-visible text-[15px] leading-none text-[#575065]">
              <span
                aria-hidden="true"
                className="relative top-[8.7px] block h-4 w-4 shrink-0 overflow-visible"
              >
                <Clock3 className="block h-4 w-4" />
              </span>

              <span className="inline-flex h-5 items-center overflow-visible leading-5">
                {
                  segment.timeRange
                }
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (
    type === "travel"
  ) {
   return (
<div
  data-pdf-keep-together
  className="relative flex gap-4 py-2"
>
  <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#6125ba] shadow-sm ring-4 ring-white">
    <CarFront className="h-5 w-5" />
  </div>

  <div className="-ml-12 flex-1 rounded-xl bg-[#d4f5fa] py-4 pl-16 pr-5 text-[#4e4659]">
      <div className="grid grid-cols-1 gap-y-2 text-[16px] md:grid-cols-[minmax(0,1fr)_190px_100px_120px] md:items-center md:gap-x-3">
            <span className="min-w-0">
              Travelling from{" "}
              <strong className="text-[#db35c8]">
                {segment.from ||
                  "Location"}
              </strong>{" "}
              to{" "}
              <strong className="text-[#db35c8]">
                {segment.to ||
                  "Location"}
              </strong>
            </span>

            {segment.timeRange && (
              <span className="inline-flex h-5 items-center gap-1.5 whitespace-nowrap leading-5">
                <span
                  aria-hidden="true"
                  className="relative top-[7px] flex h-5 w-4 shrink-0 items-center justify-center leading-none"
                >
                  <Clock3 className="block h-4 w-4" />
                </span>
                {segment.timeRange}
              </span>
            )}

            {segment.distance && (
              <span className="inline-flex h-5 items-center gap-1.5 whitespace-nowrap leading-5">
                <span
                  aria-hidden="true"
                  className="relative top-[7px] flex h-5 w-4 shrink-0 items-center justify-center leading-none"
                >
                  <Route className="block h-4 w-4" />
                </span>
                {segment.distance}
              </span>
            )}

            {segment.duration && (
              <span className="inline-flex h-5 items-center gap-1.5 whitespace-nowrap leading-5">
                <span
                  aria-hidden="true"
                  className="relative top-[7px] flex h-5 w-4 shrink-0 items-center justify-center leading-none"
                >
                  <Hourglass className="block h-4 w-4" />
                </span>
                {segment.duration}
              </span>
            )}

            {segment.note && (
              <span className="col-span-full">
                (
                {segment.note}
                )
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (
    type === "attraction"
  ) {
  const image =
    mediaUrl(
      segment.image,
    );
  const attractionName =
    decodeHtmlEntities(
      segment.name,
    ) || "Attraction";
  const attractionDescription =
    decodeHtmlEntities(
      segment.description,
    );

  return (
    <div
      data-pdf-keep-together
      className="relative flex gap-4 py-2"
    >
  <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#7e48c9] shadow-sm ring-4 ring-white">
    <MapPin className="h-5 w-5" />
  </div>

  <div className="-ml-12 flex-1 overflow-hidden rounded-xl bg-[#f0dcf8] md:min-h-[194px]">
    <div className="grid min-h-[194px] md:grid-cols-[minmax(0,1fr)_245px]">
      <div className="flex min-w-0 flex-col py-5 pl-16 pr-6">
              <h3
                className="min-h-[30px] min-w-0 break-words text-[20px] font-medium leading-[30px] text-[#4d4658]"
                title={attractionName}
              >
                {attractionName}
              </h3>

              <p
                className="mt-3 min-h-[56px] max-w-4xl line-clamp-2 text-[15px] leading-7 text-[#5e5767]"
                style={{
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 2,
                }}
              >
                  {
                    attractionDescription
                  }
              </p>

              <div className="mt-auto flex flex-wrap gap-x-8 gap-y-2 text-[15px] text-[#62596b]">
                {segment.visitTime && (
                  <span className="inline-flex h-5 items-center gap-2 whitespace-nowrap align-middle leading-5">
                    <span
                      aria-hidden="true"
                      className="relative top-[7px] flex h-5 w-4 shrink-0 items-center justify-center leading-none"
                    >
                      <Clock3 className="block h-4 w-4" />
                    </span>

                    {
                      segment.visitTime
                    }
                  </span>
                )}

                {segment.duration && (
                  <span className="inline-flex h-5 items-center gap-1.5 whitespace-nowrap align-middle leading-5">
                    <span
                      aria-hidden="true"
                      className="relative top-[7px] flex h-5 w-4 shrink-0 items-center justify-center leading-none"
                    >
                      <Hourglass className="block h-4 w-4" />
                    </span>
                    {
                      segment.duration
                    }
                  </span>
                )}
              </div>
            </div>

            <div className="relative m-4 h-[145px] self-center overflow-hidden rounded-xl bg-white md:h-[162px]">
              {image && (
                <img
                  src={image}
                  alt={
                    attractionName
                  }
                  className="h-full w-full object-cover"
                />
              )}

             {!isCustomerView && image && (
  <div
    data-pdf-ignore
    className="absolute right-2 top-2 flex flex-col gap-2"
  >
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-black shadow">
      <ImageIcon className="h-4 w-4" />
    </span>

    {segment.videoUrl && (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-black shadow">
        <Video className="h-4 w-4" />
      </span>
    )}
  </div>
)}
            </div>
          </div>
        </div>
      </div>
    );
  }

 if (
  type === "checkin"
) {
  return (
    <div
      data-pdf-keep-together
      className="relative flex gap-4 py-3"
    >
  <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#7b45c1] shadow-sm ring-4 ring-white">
    <Hotel className="h-5 w-5" />
  </div>

  <div className="-ml-12 flex-1 rounded-xl bg-[#f5e9fb] py-4 pl-16 pr-5">
          <div className="font-medium text-[#4e4659]">
            Hotel Check-in
          </div>

          {segment.hotelName && (
            <div className="mt-1 text-[16px]">
              {
                segment.hotelName
              }
            </div>
          )}

          {segment.time && (
            <div className="mt-2 text-sm text-[#62596b]">
              {
                segment.time
              }
            </div>
          )}
        </div>
      </div>
    );
  }

 return (
  <div
    data-pdf-keep-together
    className="relative flex gap-4 py-3"
  >
      <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f5f4f7]">
        <MapPin className="h-5 w-5" />
      </div>

      <div className="flex-1 pt-1">
        <div className="font-medium text-[#4e4659]">
          {segment.title ||
            segment.name ||
            segment.text ||
            segment.location ||
            "Itinerary Detail"}
        </div>

        {(segment.timeRange ||
          segment.visitTime ||
          segment.time) && (
          <div className="mt-1 text-sm text-[#62596b]">
            {segment.timeRange ||
              segment.visitTime ||
              segment.time}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------
 * PAGE
 * ----------------------------------------------------- */

export default function PublicItineraryPage() {
  const {
    token,
  } =
    useParams<{
      token: string;
    }>();

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    itinerary,
    setItinerary,
  ] =
    useState<PublicItinerary | null>(
      null,
    );

  const [
    shareOpen,
    setShareOpen,
  ] =
    useState(false);
const [
  bottomShareOpen,
  setBottomShareOpen,
] =
  useState(false);

const [
  copied,
  setCopied,
] =
  useState(false);

const automaticPdfDownloadStartedRef =
  useRef(false);

const [
  selectedHotelGroup,
  setSelectedHotelGroup,
] =
  useState(1);

const [
  profitAmount,
  setProfitAmount,
] =
  useState("");

const customerParams =
  new URLSearchParams(
    window.location.search,
  );

const isCustomerView =
  customerParams.get("customer") === "1";

const sharedCustomerTotal =
  Number(
    customerParams.get(
      "customerTotal",
    ),
  );

const profitStorageKey =
  itinerary?.quoteId
    ? `public-itinerary-profit:${itinerary.quoteId}`
    : "";

useEffect(() => {
  if (!profitStorageKey) {
    return;
  }

  const savedProfit =
    window.localStorage.getItem(
      profitStorageKey,
    );

  if (savedProfit === null) {
    setProfitAmount("");
    return;
  }

  const parsedProfit =
    Number(savedProfit);

  if (
    Number.isFinite(parsedProfit) &&
    parsedProfit >= 0
  ) {
    setProfitAmount(
      String(parsedProfit),
    );
  } else {
    setProfitAmount("");
  }
}, [profitStorageKey]);

useEffect(() => {
    if (!token) {
      setMessage(
        "This itinerary link is not available.",
      );

      setLoading(false);

      return;
    }

    let cancelled =
      false;

    const load =
      async () => {
        try {
          setLoading(true);

          setMessage("");

          const response =
            (await ItineraryService.getPublicItinerary(
              token,
            )) as PublicResponse;

          if (cancelled) {
            return;
          }

          if (
            !response
              ?.itinerary
          ) {
            setMessage(
              "This itinerary link is not available.",
            );

            return;
          }

          setItinerary(
            response.itinerary,
          );

          setSelectedHotelGroup(
            Number(
              response
                .itinerary
                .selectedHotelGroup ||
                response
                  .itinerary
                  .hotelGroups?.[0]
                  ?.groupType ||
                1,
            ),
          );
        } catch (error) {
          if (cancelled) {
            return;
          }

          if (
            error instanceof
              ApiError &&
            error.status === 410
          ) {
            setMessage(
              "This itinerary link has expired. Please request a new link.",
            );
          } else {
            setMessage(
              "This itinerary link is not available.",
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
  }, [token]);

const getCustomerShareUrl =
  () => {
    const baseNetPay =
      Number(
        itinerary?.costSummary?.netPay ??
          itinerary?.finalTotal ??
          itinerary?.overallCost ??
          0,
      );

    const currentSharedTotal =
      isCustomerView &&
      Number.isFinite(
        sharedCustomerTotal,
      ) &&
      sharedCustomerTotal >= 0
        ? sharedCustomerTotal
        : baseNetPay +
          Math.max(
            0,
            Number(
              profitAmount || 0,
            ),
          );

    const url =
      new URL(
        window.location.href,
      );

    url.searchParams.set(
      "customer",
      "1",
    );

    url.searchParams.set(
      "customerTotal",
      String(
        currentSharedTotal,
      ),
    );

    return url.toString();
  };

const copyLink =
  async () => {
    await navigator.clipboard.writeText(
      getCustomerShareUrl(),
    );

    setCopied(true);

    setShareOpen(false);

    setTimeout(
      () =>
        setCopied(false),
      1500,
    );
  };

const shareWhatsApp = () => {
  const customerUrl =
    getCustomerShareUrl();

  const text =
    `Check out this itinerary:\n${customerUrl}`;

  window.open(
    `https://wa.me/?text=${encodeURIComponent(
      text,
    )}`,
    "_blank",
    "noopener,noreferrer",
  );

  setShareOpen(false);
};

const downloadPdf = async () => {
  setShareOpen(false);
  setBottomShareOpen(false);

  /*
   * Only the visual itinerary timeline is rendered
   * through html2canvas.
   *
   * Hotel tables and Package Includes are written
   * directly into jsPDF below. That is important:
   * a very tall screenshot will always risk either
   * cutting content or leaving large blank spaces.
   */
  const mainElement =
    document.getElementById(
      "public-itinerary-main-pdf",
    );

  if (!mainElement) {
    console.error(
      "Public itinerary PDF main container not found",
    );

    return;
  }

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  await waitForImages(
    mainElement,
  );

  const html2canvas =
    (
      await import(
        "html2canvas"
      )
    ).default;

  const {
    jsPDF,
  } =
    await import(
      "jspdf"
    );

  const autoTableModule =
    await import(
      "jspdf-autotable"
    );

  const autoTable =
    (
      (autoTableModule as any)
        .autoTable ??
      (autoTableModule as any)
        .default
    ) as (
      doc: any,
      options: any,
    ) => void;

  if (!autoTable) {
    console.error(
      "jspdf-autotable is not available",
    );

    return;
  }

  let pdfKeepRanges: Array<{
    top: number;
    bottom: number;
  }> = [];

  let pdfCloneWidth = 0;

  /*
   * ==================================================
   * 1. HEADER + SUMMARY + DAY TIMELINE
   * ==================================================
   *
   * We still use html2canvas here because these cards
   * contain the visual timeline, icons and images.
   *
   * data-pdf-keep-together is applied only to SMALL
   * atomic blocks, so an individual card is never cut.
   */
  const canvas =
    await html2canvas(
      mainElement,
      {
        scale: 2,
        useCORS: true,
        backgroundColor:
          "#fff9ff",
        logging: false,

        onclone: (
          clonedDocument,
        ) => {
          clonedDocument
            .querySelectorAll(
              "[data-pdf-ignore]",
            )
            .forEach(
              (node) =>
                node.remove(),
            );

          const clonedRoot =
            clonedDocument
              .getElementById(
                "public-itinerary-main-pdf",
              );

          if (!clonedRoot) {
            return;
          }

          const rootRect =
            clonedRoot
              .getBoundingClientRect();

          pdfCloneWidth =
            rootRect.width;

          pdfKeepRanges =
            Array.from(
              clonedRoot
                .querySelectorAll(
                  "[data-pdf-keep-together]",
                ),
            )
              .map((node) => {
                const rect =
                  (
                    node as HTMLElement
                  ).getBoundingClientRect();

                return {
                  top:
                    rect.top -
                    rootRect.top,

                  bottom:
                    rect.bottom -
                    rootRect.top,
                };
              })
              .filter(
                (range) =>
                  range.bottom >
                  range.top,
              )
              .sort(
                (a, b) =>
                  a.top - b.top,
              );
        },
      },
    );

  const pdf =
    new jsPDF({
      orientation:
        "portrait",
      unit:
        "mm",
      format:
        "a4",
    });

  const pageWidth =
    pdf.internal
      .pageSize
      .getWidth();

  const pageHeight =
    pdf.internal
      .pageSize
      .getHeight();

  const pageHeightPx =
    Math.floor(
      canvas.width *
        (
          pageHeight /
          pageWidth
        ),
    );

  const cloneToCanvasScale =
    pdfCloneWidth > 0
      ? canvas.width /
        pdfCloneWidth
      : 1;

  const keepRanges =
    pdfKeepRanges
      .map(
        (range) => ({
          top:
            range.top *
            cloneToCanvasScale,

          bottom:
            range.bottom *
            cloneToCanvasScale,
        }),
      )
      .filter(
        (range) => {
          const height =
            range.bottom -
            range.top;

          /*
           * An atomic card must be smaller
           * than one PDF page to be protected.
           */
          return (
            height > 0 &&
            height <
              pageHeightPx *
                0.95
          );
        },
      );

  let offsetY = 0;
  let pageIndex = 0;

  /*
   * Tracks how much of the LAST PDF page is used.
   * Hotel List will continue from this Y position
   * when enough room remains.
   */
  let currentPdfY = 0;

  while (
    offsetY <
    canvas.height
  ) {
    let sliceHeight =
      Math.min(
        pageHeightPx,
        canvas.height -
          offsetY,
      );

    if (
      canvas.height -
        offsetY >
      pageHeightPx
    ) {
      const intendedCut =
        offsetY +
        pageHeightPx;

      /*
       * If the natural A4 cut crosses an atomic
       * timeline card, move the cut to immediately
       * before that card.
       *
       * Because only SMALL blocks are protected,
       * this avoids a chopped card without creating
       * the huge gaps caused by protecting a full day
       * or a full recommendation.
       */
      const crossingBlock =
        keepRanges
          .filter(
            (range) =>
              range.top <
                intendedCut &&
              range.bottom >
                intendedCut &&
              range.top >
                offsetY,
          )
          .sort(
            (a, b) =>
              b.top - a.top,
          )[0];

      if (crossingBlock) {
        const padding =
          4 *
          cloneToCanvasScale;

        const safeCut =
          Math.floor(
            crossingBlock.top -
              padding,
          );

        const safeHeight =
          safeCut -
          offsetY;

        /*
         * Never create a tiny mostly-empty PDF page.
         * If the safe area is too small, keep the
         * natural cut instead.
         */
        const minimumSlice =
          pageHeightPx *
          0.12;

        if (
          safeHeight >
          minimumSlice
        ) {
          sliceHeight =
            Math.min(
              sliceHeight,
              safeHeight,
            );
        }
      }
    }

    const pageCanvas =
      document.createElement(
        "canvas",
      );

    pageCanvas.width =
      canvas.width;

    pageCanvas.height =
      sliceHeight;

    const context =
      pageCanvas.getContext(
        "2d",
      );

    if (!context) {
      return;
    }

    context.drawImage(
      canvas,

      0,
      offsetY,

      canvas.width,
      sliceHeight,

      0,
      0,

      canvas.width,
      sliceHeight,
    );

    const imageData =
      pageCanvas.toDataURL(
        "image/jpeg",
        0.95,
      );

    if (
      pageIndex >
      0
    ) {
      pdf.addPage();
    }

    const imageHeight =
      (
        sliceHeight *
        pageWidth
      ) /
      canvas.width;

    pdf.addImage(
      imageData,
      "JPEG",

      0,
      0,

      pageWidth,
      imageHeight,
    );

    currentPdfY =
      imageHeight;

    offsetY +=
      sliceHeight;

    pageIndex += 1;
  }

  /*
   * ==================================================
   * SHARED PDF LAYOUT HELPERS
   * ==================================================
   */

  const marginX = 12;

  const bottomMargin =
    12;

  const contentWidth =
    pageWidth -
    marginX * 2;

  const addPdfPage =
    () => {
      pdf.addPage();

      currentPdfY =
        12;
    };

  const ensureSpace =
    (
      requiredHeight:
        number,
    ) => {
      if (
        currentPdfY +
          requiredHeight >
        pageHeight -
          bottomMargin
      ) {
        addPdfPage();
      }
    };

  /*
   * Small visual separation from the end of the
   * itinerary. If enough room exists, Hotel List
   * starts on the SAME page instead of forcing a
   * blank page.
   */
  currentPdfY +=
    5;

  /*
   * ==================================================
   * 2. HOTEL LIST
   * ==================================================
   *
   * Hotel recommendations are NOT screenshots.
   *
   * jspdf-autotable paginates at row boundaries,
   * repeats the table heading, and avoids chopping
   * an individual hotel row.
   *
   * This scales naturally for 2, 3, 5, 9, 15...
   * itinerary days without day-count-specific logic.
   */
  const hotelGroups =
    Array.isArray(
      itinerary?.hotelGroups,
    )
      ? itinerary.hotelGroups
      : [];

  if (
    hotelGroups.length >
    0
  ) {
    /*
     * HOTEL LIST heading + enough room to begin
     * the first recommendation.
     */
    ensureSpace(28);

    pdf.setFont(
      "helvetica",
      "bold",
    );

    pdf.setFontSize(
      13,
    );

    pdf.setTextColor(
      98,
      91,
      112,
    );

    pdf.text(
      "HOTEL LIST",
      marginX,
      currentPdfY,
    );

    currentPdfY +=
      8;

    for (
      const group
      of hotelGroups
    ) {
      const hotels =
        Array.isArray(
          group.hotels,
        )
          ? group.hotels
          : [];

      /*
       * Do not leave a Recommendation title alone
       * at the bottom of a page. Reserve enough
       * room for title + table heading + first row.
       */
      ensureSpace(34);

      /*
       * Recommendation title.
       */
      pdf.setFillColor(
        248,
        244,
        255,
      );

      pdf.setDrawColor(
        217,
        200,
        239,
      );

      pdf.roundedRect(
        marginX,
        currentPdfY,
        contentWidth,
        10,
        1.5,
        1.5,
        "FD",
      );

      pdf.setFont(
        "helvetica",
        "bold",
      );

      pdf.setFontSize(
        10,
      );

      pdf.setTextColor(
        90,
        83,
        100,
      );

      pdf.text(
        group.label ||
          `Recommended #${group.groupType}`,

        marginX + 4,
        currentPdfY + 6.5,
      );

      currentPdfY +=
        13;

      const tableBody:
        string[][] =
        hotels.length >
        0
          ? hotels.map(
              (hotel) => [
                `${
                  hotel.day ||
                  "Day"
                }${
                  hotel.date
                    ? ` | ${humanDate(
                        hotel.date,
                      ).replace(
                        /^[A-Za-z]{3},\s*/,
                        "",
                      )}`
                    : ""
                }`,

                hotel.destination ||
                  "--",

                hotel.hotelName ||
                  "--",

                hotel.roomType ||
                  "--",

                hotel.mealPlan ||
                  "--",
              ],
            )
          : [
              [
                "--",
                "--",
                "Hotel details are not available.",
                "--",
                "--",
              ],
            ];

      autoTable(
        pdf,
        {
          startY:
            currentPdfY,

          margin: {
            left:
              marginX,

            right:
              marginX,

            top:
              12,

            bottom:
              bottomMargin,
          },

          tableWidth:
            contentWidth,

          head: [
            [
              "DAY",
              "DESTINATION",
              "HOTEL NAME",
              "HOTEL ROOM TYPE",
              "MEAL PLAN",
            ],
          ],

          body:
            tableBody,

          /*
           * Keep the package total inside the
           * recommendation table itself.
           */
          foot: [
            [
              {
                content:
                  `Total Package Cost : Rs. ${money(
                    group.totalPackageCost,
                  )}`,

                colSpan:
                  5,
              },
            ],
          ],

          theme:
            "grid",

          pageBreak:
            "auto",

          rowPageBreak:
            "avoid",

          showHead:
            "everyPage",

          showFoot:
            "lastPage",

          styles: {
            font:
              "helvetica",

            fontSize:
              8.5,

            cellPadding:
              2.4,

            overflow:
              "linebreak",

            valign:
              "middle",

            textColor: [
              81,
              74,
              93,
            ],

            lineColor: [
              226,
              220,
              234,
            ],

            lineWidth:
              0.12,
          },

          headStyles: {
            fillColor: [
              251,
              249,
              255,
            ],

            textColor: [
              94,
              88,
              101,
            ],

            fontStyle:
              "bold",
          },

          footStyles: {
            fillColor: [
              251,
              249,
              255,
            ],

            textColor: [
              197,
              49,
              191,
            ],

            fontStyle:
              "bold",

            halign:
              "right",
          },

          columnStyles: {
            0: {
              cellWidth:
                34,
            },

            1: {
              cellWidth:
                38,
            },

            2: {
              cellWidth:
                46,
            },

            3: {
              cellWidth:
                44,
            },

            4: {
              cellWidth:
                24,
            },
          },

          tableLineColor: [
            131,
            83,
            231,
          ],

          tableLineWidth:
            0.3,
        },
      );

      const finalY =
        Number(
          (pdf as any)
            .lastAutoTable
            ?.finalY,
        );

      currentPdfY =
        (
          Number.isFinite(
            finalY,
          )
            ? finalY
            : currentPdfY
        ) + 6;
    }
  }

  /*
   * ==================================================
   * 3. PACKAGE INCLUDES
   * ==================================================
   *
   * Rendered as real PDF text instead of a screenshot.
   * Text lines can continue to the next page without
   * ever being chopped through the middle.
   */
  const packageParts =
    [
      itinerary
        ?.packageIncludes
        ?.description,

      itinerary
        ?.packageIncludes
        ?.houseBoatNote,

      itinerary
        ?.packageIncludes
        ?.rateNote,
    ]
      .map(
        (value) =>
          String(
            value ||
              "",
          ).trim(),
      )
      .filter(
        Boolean,
      );

  const packageText =
    packageParts.length >
    0
      ? packageParts.join(
          "\n\n",
        )
      : "Package inclusion details are not available.";

  /*
   * Heading + at least a few lines.
   */
  ensureSpace(24);

  pdf.setFont(
    "helvetica",
    "bold",
  );

  pdf.setFontSize(
    13,
  );

  pdf.setTextColor(
    85,
    54,
    119,
  );

  pdf.text(
    "Package Includes",
    marginX,
    currentPdfY,
  );

  currentPdfY +=
    9;

  pdf.setFont(
    "helvetica",
    "normal",
  );

  pdf.setFontSize(
    9,
  );

  pdf.setTextColor(
    23,
    53,
    109,
  );

  const paragraphs =
    packageText
      .split(
        /\n+/,
      )
      .map(
        (paragraph) =>
          paragraph.trim(),
      )
      .filter(
        Boolean,
      );

  const lineHeight =
    5;

  for (
    const paragraph
    of paragraphs
  ) {
    const lines =
      pdf.splitTextToSize(
        paragraph,
        contentWidth,
      ) as string[];

    /*
     * If the whole paragraph fits on a fresh page,
     * avoid starting it with only one line remaining.
     */
    const paragraphHeight =
      lines.length *
      lineHeight;

    if (
      paragraphHeight <
        (
          pageHeight -
          24
        ) &&
      currentPdfY +
        Math.min(
          paragraphHeight,
          lineHeight * 2,
        ) >
        pageHeight -
          bottomMargin
    ) {
      addPdfPage();
    }

    for (
      const line
      of lines
    ) {
      ensureSpace(
        lineHeight +
          1,
      );

      pdf.text(
        line,
        marginX,
        currentPdfY,
      );

      currentPdfY +=
        lineHeight;
    }

    currentPdfY +=
      2;
  }

  /*
   * ==================================================
   * 4. FOOTER
   * ==================================================
   */
  ensureSpace(12);

  currentPdfY +=
    3;

  pdf.setFont(
    "helvetica",
    "normal",
  );

  pdf.setFontSize(
    9,
  );

  pdf.setTextColor(
    110,
    102,
    117,
  );

  pdf.text(
    `DVI Holidays @ ${new Date().getFullYear()}`,

    pageWidth / 2,

    currentPdfY,

    {
      align:
        "center",
    },
  );

  const fileName =
    `${
      itinerary
        ?.quoteId ||
      "itinerary"
    }.pdf`;

  pdf.save(
    fileName,
  );
};

useEffect(() => {
  if (
    loading ||
    !itinerary ||
    automaticPdfDownloadStartedRef.current
  ) {
    return;
  }

  const params =
    new URLSearchParams(
      window.location.search,
    );

  if (
    params.get("download") !== "1"
  ) {
    return;
  }

  automaticPdfDownloadStartedRef.current =
    true;

  const timer =
    window.setTimeout(() => {
      void downloadPdf();
    }, 500);

  return () => {
    window.clearTimeout(timer);
  };
}, [
  loading,
  itinerary,
]);

if (loading) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fff9ff]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#eadcf5] border-t-[#8b55dd]" />
      </div>
    );
  }

  if (message) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fff9ff] p-6">
        <p className="text-lg font-medium text-[#4e4659]">
          {message}
        </p>
      </div>
    );
  }

if (!itinerary) {
  return null;
}

const agentLogoFile =
  String(
    itinerary.agentLogo || "",
  ).trim();

const resolvedAgentLogo =
  resolveAgentLogo(
    agentLogoFile,
  );

const headerLogoSrc =
  resolvedAgentLogo ||
  "/assets/img/DVi-Logo1-2048x1860.png";

return (
  <main
    id="public-itinerary-pdf"
    className="min-h-screen bg-[#fff9ff] text-[#514a5d]"
  >
  <div className="w-full px-4 py-6 sm:px-6 lg:px-16 xl:px-28 2xl:px-32">

       <div id="public-itinerary-main-pdf">

  {/* =================================================
      B2B HEADER
  ================================================= */}

  <header className="relative grid min-h-[145px] grid-cols-[150px_1fr_150px] items-center rounded-lg bg-white px-5 py-4 shadow-md">

          <div>
 <img
  src={headerLogoSrc}
  crossOrigin="anonymous"
  alt={
    resolvedAgentLogo
      ? "Agent Logo"
      : "DVI Holidays"
  }
  className="h-[110px] w-[105px] object-contain"
  onError={(event) => {
    event.currentTarget.onerror =
      null;

    event.currentTarget.removeAttribute(
      "crossorigin",
    );

    event.currentTarget.src =
      "/assets/img/DVi-Logo1-2048x1860.png";
  }}
/>
</div>

        <h1 className="text-center text-[22px] font-semibold text-[#605a6c]">
  Tour Itinerary Plan
</h1>

  {!isCustomerView && (
  <div
    data-pdf-ignore
    className="relative justify-self-end"
  >
    <button
      type="button"
      onClick={() =>
        setShareOpen(
          (value) =>
            !value,
        )
      }
      className="flex items-center gap-2 rounded-lg bg-[#f5edff] px-7 py-3 text-[17px] font-medium text-[#8a4edc]"
    >
      Share

      <ChevronDown className="h-4 w-4" />
    </button>

    {shareOpen && (
      <div className="absolute right-0 top-[56px] z-50 w-48 overflow-hidden rounded-lg border bg-white shadow-xl">

        <button
          type="button"
          onClick={() =>
            void copyLink()
          }
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-[#faf5ff]"
        >
          <Copy className="h-4 w-4" />

          {copied
            ? "Copied"
            : "Copy Link"}
        </button>

        <button
          type="button"
          onClick={
            shareWhatsApp
          }
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-[#faf5ff]"
        >
          <Share2 className="h-4 w-4" />

          WhatsApp
        </button>

        <button
          type="button"
          onClick={() =>
            void downloadPdf()
          }
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-[#faf5ff]"
        >
          <FileDown className="h-4 w-4" />

          Download PDF
        </button>

      </div>
    )}
  </div>
)}

        </header>

        {/* =================================================
            SUMMARY STRIP
        ================================================= */}

        <section className="mt-4 bg-[#ffebfb] px-5 py-5 shadow-sm">

          <div className="grid gap-x-5 gap-y-3 md:grid-cols-[1fr_auto]">

              <div className="flex min-h-8 flex-wrap items-center gap-x-7 gap-y-3 text-[17px] leading-none">

              <span className="inline-flex h-8 items-center font-medium text-[#5c326f]">
                #
                {
                  itinerary.quoteId
                }
              </span>

              <span className="inline-flex h-8 items-center gap-2 overflow-visible whitespace-nowrap font-semibold leading-none text-[#5a5363]">
                <span
                  aria-hidden="true"
                  className="relative top-[12.2px] block h-5 w-5 shrink-0 overflow-visible"
                >
                  <CalendarDays className="block h-5 w-5" />
                </span>

                <span className="inline-flex h-8 items-center gap-1 overflow-visible whitespace-nowrap leading-6">
                  {summaryDate(
                    itinerary.dateRange,
                  )}

                  <span className="inline-flex items-center">
                    (
                    {
                      itinerary.nightCount ??
                      0
                    }{" "}
                    N,{" "}
                    {
                      itinerary.dayCount ??
                      0
                    }{" "}
                    D)
                  </span>
                </span>
              </span>

            </div>

            <div className="flex flex-wrap items-center justify-end gap-4 text-[16px] leading-none">

              <span className="inline-flex h-8 items-center gap-2 whitespace-nowrap">
                <span className="inline-flex h-8 items-center leading-none">Adults</span>
                <b className="relative top-[8.2px] inline-grid h-8 min-w-8 shrink-0 place-items-center rounded-full bg-white px-2 font-medium leading-none">
                  <span className="relative -top-[8.2px] block leading-none">
                    {itinerary.adults ??
                      0}
                  </span>
                </b>
              </span>

              <span className="inline-flex h-8 items-center gap-2 whitespace-nowrap">
                <span className="inline-flex h-8 items-center leading-none">Child</span>
                <b className="relative top-[8.2px] inline-grid h-8 min-w-8 shrink-0 place-items-center rounded-full bg-white px-2 font-medium leading-none">
                  <span className="relative -top-[8.2px] block leading-none">
                    {itinerary.children ??
                      0}
                  </span>
                </b>
              </span>

              <span className="inline-flex h-8 items-center gap-2 whitespace-nowrap">
                <span className="inline-flex h-8 items-center leading-none">Infants</span>
                <b className="relative top-[8.2px] inline-grid h-8 min-w-8 shrink-0 place-items-center rounded-full bg-white px-2 font-medium leading-none">
                  <span className="relative -top-[8.2px] block leading-none">
                    {itinerary.infants ??
                      0}
                  </span>
                </b>
              </span>

            </div>

           <div
  className={`flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-[16px] ${
    isCustomerView
      ? "rounded-xl border-2 border-[#d853d7] bg-white px-4 py-3 shadow-sm"
      : ""
  }`}
>
  <span className="inline-flex h-8 items-center gap-2 whitespace-nowrap font-medium text-[#50365f]">
    <span className="inline-flex h-8 items-center leading-none">Room Count</span>

    <b className="relative top-[8.2px] inline-grid h-8 min-w-8 shrink-0 place-items-center rounded-full bg-[#f4e8ff] px-2 font-semibold leading-none text-[#7d3fc4]">
      <span className="relative -top-[8.2px] block leading-none">
        {itinerary.roomCount ?? 0}
      </span>
    </b>
  </span>

  <span className="inline-flex h-8 items-center gap-2 whitespace-nowrap font-medium text-[#50365f]">
    <span className="inline-flex h-8 items-center leading-none">Extra Bed</span>

    <b className="relative top-[8.2px] inline-grid h-8 min-w-8 shrink-0 place-items-center rounded-full bg-[#f4e8ff] px-2 font-semibold leading-none text-[#7d3fc4]">
      <span className="relative -top-[8.2px] block leading-none">
        {itinerary.extraBed ?? 0}
      </span>
    </b>
  </span>

  <span className="inline-flex h-8 items-center gap-2 whitespace-nowrap font-medium text-[#50365f]">
    <span className="inline-flex h-8 items-center leading-none">Child with bed</span>

    <b className="relative top-[8.2px] inline-grid h-8 min-w-8 shrink-0 place-items-center rounded-full bg-[#f4e8ff] px-2 font-semibold leading-none text-[#7d3fc4]">
      <span className="relative -top-[8.2px] block leading-none">
        {itinerary.childWithBed ?? 0}
      </span>
    </b>
  </span>

  <span className="inline-flex h-8 items-center gap-2 whitespace-nowrap font-medium text-[#50365f]">
    <span className="inline-flex h-8 items-center leading-none">Child without bed</span>

    <b className="relative top-[8.2px] inline-grid h-8 min-w-8 shrink-0 place-items-center rounded-full bg-[#f4e8ff] px-2 font-semibold leading-none text-[#7d3fc4]">
      <span className="relative -top-[8.2px] block leading-none">
        {itinerary.childWithoutBed ?? 0}
      </span>
    </b>
  </span>
</div>

          </div>

        </section>

        {/* =================================================
            DAY TIMELINE
        ================================================= */}

        <div className="mt-5 space-y-5">

          {itinerary.days?.map(
            (day) => {

              const segments =
                Array.isArray(
                  day.segments,
                )
                  ? day.segments.filter(
                      (segment) =>
                        String(
                          segment.type ||
                            "",
                        ).toLowerCase() !==
                        "hotspot",
                    )
                  : [];

              const segmentGroups: PublicSegment[][] = [];

              for (
                let index = 0;
                index < segments.length;
                index += 1
              ) {
                const current =
                  segments[index];

                const next =
                  segments[index + 1];

                const currentType =
                  String(
                    current?.type || "",
                  ).toLowerCase();

                const nextType =
                  String(
                    next?.type || "",
                  ).toLowerCase();

                if (
                  currentType === "travel" &&
                  nextType === "attraction"
                ) {
                  segmentGroups.push([
                    current,
                    next,
                  ]);
                  index += 1;
                  continue;
                }

                segmentGroups.push([
                  current,
                ]);
              }

              return (
                <section
                  key={
                    day.id ||
                    day.dayNumber
                  }
                  className="rounded-lg bg-white px-7 pb-7 pt-7 shadow-sm"
                >

                  {/* B2B DAY BAR */}

                 <div
  data-pdf-keep-together
  className="grid min-h-[72px] items-center rounded-xl border-[3px] border-[#0ab4e5] px-5 md:grid-cols-[280px_1fr_160px]"
>

                    <div className="flex h-11 items-center gap-3">

                      <span className="relative top-[12px] grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f2f1f4]">
                        <CalendarDays className="block h-5 w-5 shrink-0" />
                      </span>

                      <span className="inline-flex h-11 items-center text-[17px] leading-none">
                        <strong>
                          DAY{" "}
                          {
                            day.dayNumber
                          } -
                        </strong>

                        {humanDate(
                          day.date,
                        )}
                      </span>

                    </div>

                    <div className="text-center text-[17px]">
                      {day.departure ||
                        "Start"}
                      {" ⇥ "}
                      {day.arrival ||
                        "Destination"}
                    </div>

                    <div className="text-right text-[17px] font-medium text-[#5b3372]">
                      🧳{" "}
                      {day.distance ||
                        "0 KM"}
                    </div>

                  </div>

                  {/* DAY START / END */}

                  <div
  data-pdf-keep-together
  className="ml-7 mt-7 flex items-center gap-6 text-[18px] font-semibold text-[#d132ba]"
>

                    <span>
                      {day.startTime}
                    </span>

                    <span className="text-[#655d6d]">
                      ⇄
                    </span>

                    <span>
                      {day.endTime}
                    </span>

                  </div>

                  {/* TIMELINE */}

                  <div className="relative ml-7 mt-4">

                   <div className="absolute bottom-3 left-[21px] top-3 border-l-2 border-dotted border-[#756d80]" />

                    <div className="space-y-1">

                      {segmentGroups.map(
                        (group, index) => (
                          <div
                            key={`${day.id}-${index}`}
                          >
                            {group.map(
                              (
                                segment,
                                segmentIndex,
                              ) => (
                              <TimelineSegment
                                key={`${day.id}-${index}-${segmentIndex}`}
                                segment={
                                  segment
                                }
                                isCustomerView={
                                  isCustomerView
                                }
                              />
                              ),
                            )}
                          </div>
                        ),
                      )}

                    </div>

                  </div>

                </section>
              );
            },
          )}

        </div>

  </div>

{/* =================================================
    HOTEL LIST
================================================= */}

{Array.isArray(itinerary.hotelGroups) &&
  itinerary.hotelGroups.length > 0 && (
    <section
  data-pdf-hotel-list
  className="mt-5 rounded-lg bg-white px-7 py-7 shadow-sm"
>
      <h2 className="text-[21px] font-semibold text-[#625b70]">
        HOTEL LIST
      </h2>

      <div className="mt-5 space-y-7">
        {itinerary.hotelGroups.map((group) => {
          const active =
            Number(group.groupType) ===
            Number(selectedHotelGroup);

          const hotels =
            Array.isArray(group.hotels)
              ? group.hotels
              : [];

       return (
  <div
    key={group.groupType}
    data-pdf-hotel-recommendation
    className="w-full"
  >
              {/* RECOMMENDATION HEADER */}

 {/* WEB RECOMMENDATION HEADER */}
<button
  type="button"
  data-pdf-recommendation-web
  aria-pressed={active}
  onClick={() =>
    setSelectedHotelGroup(
      group.groupType,
    )
  }
  className={`w-full rounded-md border px-6 py-4 text-left text-[16px] transition-colors ${
    active
      ? "border-[#d853d7] bg-gradient-to-r from-[#874ee5] to-[#e953d6] text-white"
      : "border-[#e5d9f2] bg-white text-[#5a5364] hover:bg-[#faf7ff]"
  }`}
>
 <span className="flex w-full items-center gap-4">
  <span className="font-semibold">
    {group.label ||
      `Recommended #${group.groupType}`}
  </span>
</span>
</button>

{/* PDF RECOMMENDATION HEADER */}
<div
  data-pdf-recommendation-only
  data-pdf-keep-together
  data-pdf-hotel-header
  style={{ display: "none" }}
  className="w-full rounded-md border border-[#d9c8ef] bg-[#f8f4ff] px-6 py-4 text-left text-[16px] font-semibold text-[#5a5364]"
>
  {group.label ||
    `Recommended #${group.groupType}`}
</div>

              {/* HOTEL DETAILS FOR THIS RECOMMENDATION */}

              <div className="mt-4 overflow-x-auto rounded-md border-[2px] border-[#8353e7] p-3">
               <table
  data-pdf-hotel-table
  className="w-full min-w-[900px] border-collapse"
>
                  <thead
  data-pdf-keep-together
  className="bg-[#fbf9ff]"
>
                    <tr className="text-left text-[14px] uppercase tracking-[0.08em] text-[#5e5865]">
                      <th className="px-6 py-4">
                        Day
                      </th>

                      <th className="px-6 py-4">
                        Destination
                      </th>

                      <th className="px-6 py-4">
                        Hotel Name
                      </th>

                      <th className="px-6 py-4">
                        Hotel Room Type
                      </th>

                      <th className="px-6 py-4">
                        Meal Plan
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {hotels.length > 0 ? (
                      hotels.map(
                        (
                          hotel,
                          index,
                        ) => (
                    <tr
  key={`${group.groupType}-${hotel.day ?? "day"}-${hotel.date ?? "date"}-${index}`}
  data-pdf-keep-together
  data-pdf-hotel-first-row={
    index === 0
      ? "true"
      : undefined
  }
  data-pdf-hotel-last-row={
    index ===
    hotels.length - 1
      ? "true"
      : undefined
  }
  className="border-t text-[15px]"
>
                       <td className="px-6 py-4">
  {hotel.day || "Day"}{" "}
  {hotel.date
    ? ` | ${humanDate(
        hotel.date,
      ).replace(
        /^[A-Za-z]{3},\s*/,
        "",
      )}`
    : ""}
</td>

                            <td className="px-6 py-4">
                              {hotel.destination ||
                                "--"}
                            </td>

                          <td className="px-6 py-4">
                            {hotel.hotelName || "--"}
                          </td>

                            <td className="px-6 py-4">
                              {hotel.roomType ||
                                "--"}
                            </td>

                            <td className="px-6 py-4">
                              {hotel.mealPlan ||
                                "--"}
                            </td>
                          </tr>
                        ),
                      )
                    ) : (
                      <tr
  data-pdf-keep-together
  className="border-t text-[15px]"
>
                        <td
                          colSpan={5}
                          className="px-6 py-6 text-center text-[#746d7d]"
                        >
                          Hotel details are not available.
                        </td>
                      </tr>
                    )}
                  </tbody>
<tfoot>
  <tr
    data-pdf-keep-together
    data-pdf-hotel-total-row
    className="border-t bg-[#fbf9ff]"
  >
    <td
      colSpan={5}
      className="px-6 py-4"
    >
      <div className="flex items-center justify-end gap-3 text-[16px] font-semibold text-[#4f4859]">
        <span>
          Total Package Cost :
        </span>

        <span className="text-[18px] font-bold text-[#c531bf]">
          ₹{" "}
          {money(
            group.totalPackageCost,
          )}
        </span>
      </div>
    </td>
  </tr>
</tfoot>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  )}
      
        {/* =================================================
            PACKAGE + OVERALL COST
        ================================================= */}

<section
  className="mt-5 rounded-lg bg-white shadow-sm"
>
  <div
    data-pdf-auto-height
    className="px-7 py-7 md:px-8"
  >
    <h2
      data-pdf-package-heading
      className="text-[20px] font-medium text-[#553677]"
    >
      Package Includes
    </h2>

    <div
      data-pdf-expand
      data-pdf-package-content
      className="mt-6 max-h-[295px] overflow-y-auto pr-5 text-[16px] leading-7 text-[#17356d]"
    >
      {itinerary.packageIncludes?.description && (
        <div className="whitespace-pre-line">
          {
            itinerary.packageIncludes
              .description
          }
        </div>
      )}

      {!itinerary.packageIncludes?.description &&
        !itinerary.packageIncludes?.houseBoatNote &&
        !itinerary.packageIncludes?.rateNote && (
          <p className="text-[#5f5a67]">
            Package inclusion details are not available.
          </p>
        )}
    </div>
  </div>
</section>

{!isCustomerView && (
  <div
    data-pdf-ignore
    className="relative mt-5 flex justify-end"
  >
    <div className="relative">
      <button
        type="button"
        onClick={() =>
          setBottomShareOpen(
            (value) => !value,
          )
        }
        className="flex items-center gap-2 rounded-lg bg-[#f5edff] px-7 py-3 text-[17px] font-medium text-[#8a4edc] shadow-sm"
      >
        Share

        <ChevronDown className="h-4 w-4" />
      </button>

      {bottomShareOpen && (
        <div className="absolute bottom-[56px] right-0 z-50 w-48 overflow-hidden rounded-lg border bg-white shadow-xl">

          <button
            type="button"
            onClick={async () => {
              setBottomShareOpen(false);

              await copyLink();
            }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-[#faf5ff]"
          >
            <Copy className="h-4 w-4" />

            {copied
              ? "Copied"
              : "Copy Link"}
          </button>

          <button
            type="button"
            onClick={() => {
              setBottomShareOpen(false);

              shareWhatsApp();
            }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-[#faf5ff]"
          >
            <Share2 className="h-4 w-4" />

            WhatsApp
          </button>

          <button
            type="button"
            onClick={() => {
              setBottomShareOpen(false);

              void downloadPdf();
            }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-[#faf5ff]"
          >
            <FileDown className="h-4 w-4" />

            Download PDF
          </button>

        </div>
      )}
    </div>
  </div>
)}

<footer
  data-pdf-keep-together
  data-pdf-footer
  className="pb-5 pt-6 text-center text-[15px] text-[#6e6675]"
>
  DVI Holidays @ {new Date().getFullYear()}
</footer>
      </div>

      {/* B2B FLOATING TOP BUTTON */}

     <button
  type="button"
  data-pdf-ignore
  aria-label="Scroll to top"
  onClick={() =>
    window.scrollTo({
      top: 0,
      behavior:
        "smooth",
    })
  }
  className="fixed bottom-16 right-8 z-50 flex h-12 w-16 items-center justify-center rounded-lg bg-gradient-to-r from-[#8053db] to-[#e33cc1] text-2xl text-white shadow-xl"
>
  ↑
</button>

    </main>
  );
}
