import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ItineraryService } from "@/services/itinerary";
import { Loader2, Plane, Printer, Phone, MapPin, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_BASE_URL } from "@/lib/api";

interface PluckCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  itineraryPlanId: number;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const PluckCardModal: React.FC<PluckCardModalProps> = ({
  isOpen,
  onClose,
  itineraryPlanId,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (isOpen && itineraryPlanId) {
      void fetchData();
    }
  }, [isOpen, itineraryPlanId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await ItineraryService.getPluckCardData(itineraryPlanId);
      setData(res);
    } catch (error) {
      console.error("Error fetching pluck card data:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const companyLogoUrl = useMemo(() => {
    const raw = String(data?.companyLogoUrl || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    const base = API_BASE_URL.replace(/\/api\/v1$/i, '');
    return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
  }, [data]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Pluck Card</span>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#d546ab]" />
          </div>
        ) : data ? (
          <div className="bg-white p-4 text-black print:p-0">
            <div className="overflow-hidden rounded-[32px] border border-[#e7d9f4] bg-[radial-gradient(circle_at_top,_#fff5d9_0,_#fff8ec_28%,_#ffffff_62%,_#f7efff_100%)] shadow-[0_24px_80px_rgba(98,56,132,0.12)]">
              <div className="flex flex-col gap-6 px-6 pb-8 pt-6 md:px-10 md:pb-10">
                <div className="flex flex-col items-center justify-between gap-4 border-b border-[#ebddf8] pb-5 md:flex-row">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#8f6eb0]">
                      Arrival Welcome Card
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-[#3d3450]">
                      {data.companyName || 'Doview Holidays India Pvt Ltd'}
                    </h2>
                  </div>
                  {companyLogoUrl ? (
                    <img src={companyLogoUrl} alt="Company logo" className="h-16 w-auto object-contain" />
                  ) : null}
                </div>

                <div className="text-center">
                  <p className="text-sm font-medium uppercase tracking-[0.5em] text-[#b98d22]">
                    Welcome
                  </p>
                  <h1 className="mt-4 text-4xl font-semibold tracking-[0.1em] text-[#4a2d60] md:text-6xl">
                    {data.guestName || '--'}
                  </h1>
                  <div className="mx-auto mt-5 h-1.5 w-28 rounded-full bg-gradient-to-r from-[#b98d22] via-[#d8b156] to-[#9b6fd0]" />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-3xl border border-[#ecdff8] bg-white/90 p-5">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#8f6eb0]">
                      <MapPin className="h-4 w-4" />
                      Arrival
                    </p>
                    <p className="mt-3 text-2xl font-semibold text-[#3d3450]">
                      {data.arrivalLocation || '--'}
                    </p>
                    <p className="mt-2 flex items-center gap-2 text-sm text-[#5f556d]">
                      <CalendarDays className="h-4 w-4 text-[#b98d22]" />
                      {formatDateTime(data.arrivalDateTime)}
                    </p>
                    <p className="mt-3 flex items-start gap-2 text-sm text-[#5f556d]">
                      <Plane className="mt-0.5 h-4 w-4 text-[#b98d22]" />
                      <span>{data.arrivalFlightDetails || '--'}</span>
                    </p>
                  </div>

                  <div className="rounded-3xl border border-[#ecdff8] bg-white/90 p-5">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#8f6eb0]">
                      <MapPin className="h-4 w-4" />
                      Departure
                    </p>
                    <p className="mt-3 text-2xl font-semibold text-[#3d3450]">
                      {data.departureLocation || '--'}
                    </p>
                    <p className="mt-2 flex items-center gap-2 text-sm text-[#5f556d]">
                      <CalendarDays className="h-4 w-4 text-[#b98d22]" />
                      {formatDateTime(data.departureDateTime)}
                    </p>
                    <p className="mt-3 flex items-start gap-2 text-sm text-[#5f556d]">
                      <Plane className="mt-0.5 h-4 w-4 text-[#b98d22]" />
                      <span>{data.departureFlightDetails || '--'}</span>
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-dashed border-[#d8c1ee] bg-white/80 px-5 py-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8f6eb0]">
                    Contact Number
                  </p>
                  <p className="mt-3 inline-flex items-center gap-2 text-2xl font-semibold text-[#3d3450]">
                    <Phone className="h-5 w-5 text-[#b98d22]" />
                    {data.contactNo || '--'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center p-8 text-gray-500">
            Failed to load pluck card data.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
