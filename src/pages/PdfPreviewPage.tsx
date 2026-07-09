import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { Loader2, FileText, Receipt, Ticket, Hotel } from "lucide-react";
import { ItineraryService } from "@/services/itinerary";
import { clearToken } from "@/lib/api";

type PdfDocType = "invoice" | "travel-voucher" | "hotel-voucher" | "pluck-card";

const DOC_META: Record<PdfDocType, { title: string; subtitle: string; authRequired: boolean }> = {
  invoice: {
    title: "Invoice Viewer",
    subtitle: "Public invoice opened in the browser.",
    authRequired: false,
  },
  "travel-voucher": {
    title: "Transport Voucher Viewer",
    subtitle: "Protected travel voucher opened in the browser.",
    authRequired: true,
  },
  "hotel-voucher": {
    title: "Hotel Voucher Viewer",
    subtitle: "Protected hotel voucher opened in the browser.",
    authRequired: true,
  },
  "pluck-card": {
    title: "Pluck Card Viewer",
    subtitle: "Protected pluck card opened in the browser.",
    authRequired: true,
  },
};

function getRouteIcon(docType: PdfDocType) {
  switch (docType) {
    case "invoice":
      return Receipt;
    case "travel-voucher":
      return Ticket;
    case "hotel-voucher":
      return Hotel;
    default:
      return FileText;
  }
}

export default function PdfPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const objectUrlRef = useRef<string | null>(null);
  const preserveObjectUrlRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const invoiceType = searchParams.get("type") === "proforma" ? "proforma" : "tax";
  const docType = useMemo<PdfDocType | null>(() => {
    const segments = location.pathname.split("/").filter(Boolean);
    const candidate = segments[1] as PdfDocType | undefined;
    if (candidate && candidate in DOC_META) return candidate;
    return null;
  }, [location.pathname]);

  const meta = useMemo(() => {
    if (!docType || !(docType in DOC_META)) return null;
    return DOC_META[docType as PdfDocType];
  }, [docType]);

  const Icon = meta ? getRouteIcon(docType as PdfDocType) : FileText;

  useEffect(() => {
    let cancelled = false;

    const cleanupObjectUrl = () => {
      if (!preserveObjectUrlRef.current && objectUrlRef.current) {
        window.URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };

    const openPdf = async () => {
      setLoading(true);
      setError(null);
      cleanupObjectUrl();

      const itineraryId = Number(id || 0);
      if (!meta || !Number.isFinite(itineraryId) || itineraryId <= 0) {
        if (!cancelled) {
          setError("Invalid preview request.");
          setLoading(false);
        }
        return;
      }

      try {
        let result;
        if (docType === "invoice") {
          result = await ItineraryService.fetchPdfDocument(
            `itineraries/${itineraryId}/invoice-pdf?type=${encodeURIComponent(invoiceType)}`,
            `${invoiceType}-invoice-${itineraryId}.pdf`,
            { auth: false },
          );
        } else if (docType === "travel-voucher") {
          result = await ItineraryService.fetchPdfDocument(
            `itineraries/${itineraryId}/vehicle-voucher-pdf`,
            `transport-voucher-${itineraryId}.pdf`,
            { auth: true },
          );
        } else if (docType === "hotel-voucher") {
          result = await ItineraryService.fetchPdfDocument(
            `itineraries/${itineraryId}/hotel-voucher-pdf`,
            `hotel-voucher-${itineraryId}.pdf`,
            { auth: true },
          );
        } else {
          result = await ItineraryService.fetchPdfDocument(
            `itineraries/${itineraryId}/pluck-card-pdf`,
            `pluck-card-${itineraryId}.pdf`,
            { auth: true },
          );
        }

        if (cancelled) {
          window.URL.revokeObjectURL(result.objectUrl);
          return;
        }

        preserveObjectUrlRef.current = true;
        objectUrlRef.current = result.objectUrl;
        const viewerUrl = `${result.objectUrl}#zoom=100`;
        window.location.replace(viewerUrl);
      } catch (err: any) {
        const message = err?.message || "Failed to load the PDF.";
        if (String(message).toLowerCase().includes("session expired")) {
          clearToken();
          window.location.href = "/login";
          return;
        }
        if (!cancelled) {
          setError(message);
          setLoading(false);
        }
      }
    };

    void openPdf();

    return () => {
      cancelled = true;
      cleanupObjectUrl();
    };
  }, [docType, id, invoiceType, meta]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,_#fdf7ff,_#fff_45%,_#f8fafc_100%)] text-slate-900">
      {loading ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#8c52ff]" />
          <div>
            <p className="text-base font-medium text-[#352b53]">{meta?.title || "Loading PDF"}</p>
            <p className="text-sm text-[#6c6c6c]">{meta?.subtitle || "The PDF is being prepared for browser viewing."}</p>
          </div>
        </div>
      ) : error ? (
        <div className="mx-auto flex max-w-lg flex-col items-center gap-4 p-8 text-center">
          <div className="rounded-full bg-red-50 p-4 text-red-500">
            <Icon className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold text-[#352b53]">Failed to load PDF</p>
            <p className="text-sm text-[#6c6c6c]">{error}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
