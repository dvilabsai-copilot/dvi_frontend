import {
  useEffect,
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
}: {
  segment: PublicSegment;
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
      <div className="relative flex gap-4 py-3">
        <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f5f4f7] text-[#625a73]">
          <BedDouble className="h-5 w-5" />
        </div>

        <div className="pt-1">
          <div className="text-[17px] font-medium text-[#4c4658]">
            {segment.title ||
              "Start your Journey"}
          </div>

          {segment.timeRange && (
            <div className="mt-1 flex items-center gap-2 text-[15px] text-[#575065]">
              <Clock3 className="h-4 w-4" />

              {
                segment.timeRange
              }
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
<div className="relative flex gap-4 py-2">
  <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#6125ba] shadow-sm ring-4 ring-white">
    <CarFront className="h-5 w-5" />
  </div>

  <div className="-ml-12 flex-1 rounded-xl bg-[#d4f5fa] py-4 pl-16 pr-5 text-[#4e4659]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[16px]">
            <span>
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
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <Clock3 className="h-4 w-4" />
                {
                  segment.timeRange
                }
              </span>
            )}

            {segment.distance && (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <Route className="h-4 w-4" />
                {
                  segment.distance
                }
              </span>
            )}

            {segment.duration && (
              <span className="whitespace-nowrap">
                ⌛{" "}
                {
                  segment.duration
                }
              </span>
            )}

            {segment.note && (
              <span>
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

 return (
  <div className="relative flex gap-4 py-2">
  <div className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#7e48c9] shadow-sm ring-4 ring-white">
    <MapPin className="h-5 w-5" />
  </div>

  <div className="-ml-12 flex-1 overflow-hidden rounded-xl bg-[#f0dcf8]">
    <div className="grid md:grid-cols-[1fr_245px]">
      <div className="py-5 pl-16 pr-6">
              <h3 className="text-[20px] font-medium text-[#4d4658]">
                {segment.name ||
                  "Attraction"}
              </h3>

              {segment.description && (
                <p className="mt-3 max-w-4xl text-[15px] leading-7 text-[#5e5767]">
                  {
                    segment.description
                  }
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-[15px] text-[#62596b]">
                {segment.visitTime && (
                  <span className="inline-flex items-center gap-2">
                    <Clock3 className="h-4 w-4" />

                    {
                      segment.visitTime
                    }
                  </span>
                )}

                {segment.duration && (
                  <span>
                    ⌛{" "}
                    {
                      segment.duration
                    }
                  </span>
                )}
              </div>
            </div>

            {image && (
              <div className="relative m-4 min-h-[145px] overflow-hidden rounded-xl bg-white">
                <img
                  src={image}
                  alt={
                    segment.name ||
                    "Attraction"
                  }
                  className="h-full min-h-[145px] w-full object-cover"
                />

                <div className="absolute right-2 top-2 flex flex-col gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-black shadow">
                    <ImageIcon className="h-4 w-4" />
                  </span>

                  {segment.videoUrl && (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-black shadow">
                      <Video className="h-4 w-4" />
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (
    type === "checkin"
  ) {
   return (
  <div className="relative flex gap-4 py-3">
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
    <div className="relative flex gap-4 py-3">
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

  const element =
    document.getElementById(
      "public-itinerary-pdf",
    );

if (!element) {
  console.error("Public itinerary PDF container not found");
  return;
}

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const html2canvas =
    (
      await import(
        "html2canvas"
      )
    ).default;

  const {
    jsPDF,
  } =
    await import("jspdf");

  const canvas =
    await html2canvas(
      element,
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

          clonedDocument
            .querySelectorAll(
              "[data-pdf-expand]",
            )
            .forEach(
              (node) => {
                const htmlNode =
                  node as HTMLElement;

                htmlNode.style.maxHeight =
                  "none";

                htmlNode.style.height =
                  "auto";

                htmlNode.style.overflow =
                  "visible";
              },
            );
clonedDocument
  .querySelectorAll(
    "[data-pdf-recommendation-web]",
  )
  .forEach((node) => {
    node.remove();
  });

clonedDocument
  .querySelectorAll(
    "[data-pdf-recommendation-only]",
  )
  .forEach((node) => {
    const htmlNode =
      node as HTMLElement;

    htmlNode.style.display =
      "block";
  });
        },
      },
    );

  const pdf =
    new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

  const pageWidth =
    pdf.internal.pageSize.getWidth();

  const pageHeight =
    pdf.internal.pageSize.getHeight();

  const pageHeightPx =
    Math.floor(
      canvas.width *
        (pageHeight /
          pageWidth),
    );

  let offsetY = 0;
  let pageIndex = 0;

  while (
    offsetY <
    canvas.height
  ) {
    const sliceHeight =
      Math.min(
        pageHeightPx,
        canvas.height -
          offsetY,
      );

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

    if (pageIndex > 0) {
      pdf.addPage();
    }

    const imageHeight =
      (sliceHeight *
        pageWidth) /
      canvas.width;

    pdf.addImage(
      imageData,
      "JPEG",
      0,
      0,
      pageWidth,
      imageHeight,
    );

    offsetY +=
      sliceHeight;

    pageIndex += 1;
  }

  const fileName =
    `${itinerary?.quoteId || "itinerary"}.pdf`;

  pdf.save(fileName);
};

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

const baseNetPay =
  Number(
    itinerary.costSummary?.netPay ??
      itinerary.finalTotal ??
      itinerary.overallCost ??
      0,
  );

const safeProfitAmount =
  Math.max(
    0,
    Number(profitAmount || 0),
  );

const totalPay =
  baseNetPay + safeProfitAmount;

const displayTotalPay =
  isCustomerView &&
  Number.isFinite(
    sharedCustomerTotal,
  ) &&
  sharedCustomerTotal >= 0
    ? sharedCustomerTotal
    : totalPay;

const agentLogoFile =
  String(
    itinerary.agentLogo || "",
  ).trim();

const headerLogoSrc =
  agentLogoFile
    ? "https://www.b2b.dvi.co.in/head/uploads/agent_gallery/67dbb86236e26.jpg"
    : "/assets/img/DVi-Logo1-2048x1860.png";

return (
  <main
    id="public-itinerary-pdf"
    className="min-h-screen bg-[#fff9ff] text-[#514a5d]"
  >
  <div className="w-full px-4 py-6 sm:px-6 lg:px-16 xl:px-28 2xl:px-32">

        {/* =================================================
            B2B HEADER
        ================================================= */}

        <header className="relative grid min-h-[145px] grid-cols-[150px_1fr_150px] items-center rounded-lg bg-white px-5 py-4 shadow-md">

          <div>
  <img
    src={headerLogoSrc}
    alt={
      agentLogoFile
        ? "Agent Logo"
        : "DVI Holidays"
    }
    className="h-[110px] w-[105px] object-contain"
    onError={(event) => {
      event.currentTarget.onerror =
        null;

      event.currentTarget.src =
        "/assets/img/DVi-Logo1-2048x1860.png";
    }}
  />
</div>

        <h1 className="text-center text-[22px] font-semibold text-[#605a6c]">
  Tour Itinerary Plan
</h1>

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

        </header>

        {/* =================================================
            SUMMARY STRIP
        ================================================= */}

        <section className="mt-4 bg-[#ffebfb] px-5 py-5 shadow-sm">

          <div className="grid gap-x-5 gap-y-3 md:grid-cols-[1fr_auto]">

            <div className="flex flex-wrap items-center gap-x-7 gap-y-3 text-[17px]">

              <span className="font-medium text-[#5c326f]">
                #
                {
                  itinerary.quoteId
                }
              </span>

              <span className="inline-flex items-center gap-2 font-semibold text-[#5a5363]">
                <CalendarDays className="h-5 w-5" />

                {summaryDate(
                  itinerary.dateRange,
                )}

                <span>
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

            </div>

            <div className="flex flex-wrap items-center justify-end gap-4 text-[16px]">

              <span>
                Adults{" "}
                <b className="ml-1 inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-white px-2 font-medium">
                  {itinerary.adults ??
                    0}
                </b>
              </span>

              <span>
                Child{" "}
                <b className="ml-1 inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-white px-2 font-medium">
                  {itinerary.children ??
                    0}
                </b>
              </span>

              <span>
                Infants{" "}
                <b className="ml-1 inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-white px-2 font-medium">
                  {itinerary.infants ??
                    0}
                </b>
              </span>

            </div>

           <div
  className={`flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-[16px] ${
    isCustomerView
      ? "border-2 border-[#d853d7] bg-white shadow-sm"
      : ""
  }`}
>
  <span className="flex items-center gap-2 font-medium text-[#50365f]">
    Room Count

    <b className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-[#f4e8ff] px-2 font-semibold text-[#7d3fc4]">
      {itinerary.roomCount ?? 0}
    </b>
  </span>

  <span className="flex items-center gap-2 font-medium text-[#50365f]">
    Extra Bed

    <b className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-[#f4e8ff] px-2 font-semibold text-[#7d3fc4]">
      {itinerary.extraBed ?? 0}
    </b>
  </span>

  <span className="flex items-center gap-2 font-medium text-[#50365f]">
    Child with bed

    <b className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-[#f4e8ff] px-2 font-semibold text-[#7d3fc4]">
      {itinerary.childWithBed ?? 0}
    </b>
  </span>

  <span className="flex items-center gap-2 font-medium text-[#50365f]">
    Child without bed

    <b className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-[#f4e8ff] px-2 font-semibold text-[#7d3fc4]">
      {itinerary.childWithoutBed ?? 0}
    </b>
  </span>
</div>

           <div className="text-right text-[20px]">

  Overall Trip Cost :{" "}

<strong className="text-[27px] font-bold text-[#c531bf]">
  ₹ {money(displayTotalPay)}
</strong>

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

              return (
                <section
                  key={
                    day.id ||
                    day.dayNumber
                  }
                  className="rounded-lg bg-white px-7 pb-7 pt-7 shadow-sm"
                >

                  {/* B2B DAY BAR */}

                  <div className="grid min-h-[72px] items-center rounded-xl border-[3px] border-[#0ab4e5] px-5 md:grid-cols-[280px_1fr_160px]">

                    <div className="flex items-center gap-3">

                      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f2f1f4]">
                        <CalendarDays className="h-5 w-5" />
                      </span>

                      <span className="text-[17px]">
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

                  <div className="ml-7 mt-7 flex items-center gap-6 text-[18px] font-semibold text-[#d132ba]">

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

                      {segments.map(
                        (
                          segment,
                          index,
                        ) => (
                          <TimelineSegment
                            key={`${day.id}-${index}`}
                            segment={
                              segment
                            }
                          />
                        ),
                      )}

                    </div>

                  </div>

                </section>
              );
            },
          )}

        </div>

      {/* =================================================
    HOTEL LIST
================================================= */}

{Array.isArray(itinerary.hotelGroups) &&
  itinerary.hotelGroups.length > 0 && (
    <section className="mt-5 rounded-lg bg-white px-7 py-7 shadow-sm">
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
  <span className="flex w-full items-center justify-between gap-4">
    <span className="font-semibold">
      {group.label ||
        `Recommended #${group.groupType}`}
    </span>

    {!isCustomerView && (
      <span className="shrink-0 whitespace-nowrap">
        ₹ {money(group.totalAmount)}
      </span>
    )}
  </span>
</button>

{/* PDF RECOMMENDATION HEADER */}
<div
  data-pdf-recommendation-only
  style={{ display: "none" }}
  className="w-full rounded-md border border-[#d9c8ef] bg-[#f8f4ff] px-6 py-4 text-left text-[16px] font-semibold text-[#5a5364]"
>
  {group.label ||
    `Recommended #${group.groupType}`}
</div>

              {/* HOTEL DETAILS FOR THIS RECOMMENDATION */}

              <div className="mt-4 overflow-x-auto rounded-md border-[2px] border-[#8353e7] p-3">
                <table className="w-full min-w-[900px] border-collapse">
                  <thead className="bg-[#fbf9ff]">
                    <tr className="text-left text-[14px] uppercase tracking-[0.08em] text-[#5e5865]">
                      <th className="px-6 py-4">
                        Day
                      </th>

                      <th className="px-6 py-4">
                        Destination
                      </th>

                      <th className="px-6 py-4">
                        Hotel Name - Category
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
                            className="border-t text-[15px]"
                          >
                            <td className="px-6 py-4">
                              {hotel.day ||
                                "-"}

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
                              {hotel.hotelName ? (
                                <>
                                  🏨{" "}
                                  {
                                    hotel.hotelName
                                  }

                                  {hotel.category && (
                                    <>
                                      {" - "}
                                      {hotelCategory(
                                        hotel.category,
                                      )}
                                    </>
                                  )}
                                </>
                              ) : (
                                "--"
                              )}
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
                      <tr className="border-t text-[15px]">
                        <td
                          colSpan={5}
                          className="px-6 py-6 text-center text-[#746d7d]"
                        >
                          Hotel details are not available.
                        </td>
                      </tr>
                    )}
                  </tbody>

          {!isCustomerView && (
  <tfoot data-pdf-ignore>
    <tr className="border-t">
      <td
        colSpan={4}
        className="px-6 py-4 text-right font-semibold"
      >
        Hotel Total :
      </td>

      <td className="px-6 py-4 font-semibold">
        ₹ {money(group.totalAmount)}
      </td>
    </tr>
  </tfoot>
)}
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

    <section className="mt-5 rounded-lg bg-white shadow-sm">
  <div className="grid md:h-[390px] md:grid-cols-2">

    {/* Package Includes */}
    <div className="px-7 py-7 md:border-r md:border-[#e4e1e7] md:px-8">
      <h2 className="text-[20px] font-medium text-[#553677]">
        Package Includes
      </h2>

      <div
  data-pdf-expand
  className="mt-6 max-h-[295px] overflow-y-auto pr-5 text-[16px] leading-7 text-[#17356d]"
>

       {itinerary.packageIncludes?.description && (
  <div className="whitespace-pre-line">
    {itinerary.packageIncludes.description}
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

  {/* Overall Cost */}
<div className="px-7 py-7 md:px-10">
  <h2 className="text-[20px] font-semibold uppercase text-[#625a68]">
    Overall Cost
  </h2>

<div className="mt-5 space-y-4 text-[16px]">

  {!isCustomerView && (
    <>
     <div
  data-pdf-ignore
  className="flex items-center justify-between font-semibold"
>
  <span>Total Amount</span>

  <span>
    ₹{" "}
    {money(
      itinerary.costSummary?.totalAmount,
    )}
  </span>
</div>

      <div
  data-pdf-ignore
  className="flex items-center justify-between"
>
  <span>Total Round Off</span>

  <span>
    {Number(
      itinerary.costSummary?.totalRoundOff || 0,
    ) < 0
      ? "-₹ "
      : "₹ "}

    {money(
      Math.abs(
        Number(
          itinerary.costSummary?.totalRoundOff || 0,
        ),
      ),
    )}
  </span>
</div>

      <div
        data-pdf-ignore
        className="flex items-center justify-between font-semibold"
      >
        <span>Net Pay</span>

        <span>
          ₹{" "}
          {money(
            itinerary.costSummary?.netPay,
          )}
        </span>
      </div>

      {!shareOpen && (
        <div
          data-pdf-ignore
          className="flex items-center justify-between"
        >
          <span className="font-semibold">
            Add Your Profit
          </span>

          <div className="flex h-10 overflow-hidden rounded-md border border-[#bba4e3] bg-white">
            <input
              type="number"
              min="0"
              step="1"
              value={profitAmount}
              onChange={(event) => {
                const value =
                  event.target.value;

                const numericValue =
                  Number(value);

                if (
                  value === "" ||
                  (
                    Number.isFinite(
                      numericValue,
                    ) &&
                    numericValue >= 0
                  )
                ) {
                  setProfitAmount(value);

                  if (profitStorageKey) {
                    if (value === "") {
                      window.localStorage.removeItem(
                        profitStorageKey,
                      );
                    } else {
                      window.localStorage.setItem(
                        profitStorageKey,
                        value,
                      );
                    }
                  }
                }
              }}
              placeholder="0"
              className="w-24 bg-transparent px-3 text-right outline-none"
            />

            <span className="flex w-10 items-center justify-center border-l border-[#bba4e3] font-semibold text-[#625a68]">
              ₹
            </span>
          </div>
        </div>
      )}
    </>
  )}

  <div
    className={`${
      isCustomerView
        ? ""
        : "border-t border-[#e4e1e7] pt-4"
    }`}
  >
    <div className="flex items-center justify-between text-[18px] font-semibold text-[#4f4859]">
      <span>
        Total Pay
      </span>

      <span>
        ₹ {money(displayTotalPay)}
      </span>
    </div>
  </div>

</div>
</div>

  </div>
</section>

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

<footer className="pb-5 pt-6 text-center text-[15px] text-[#6e6675]">
  DVI Holidays @ {new Date().getFullYear()}
</footer>

      </div>

      {/* B2B FLOATING TOP BUTTON */}

      <button
        type="button"
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