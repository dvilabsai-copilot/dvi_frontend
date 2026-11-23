import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { offlineBookingStatusLabels, type OfflineBookingStatus } from "./hotel-list/offlineHotelBooking";

type SupplierVoucher = {
  kind: "hotel" | "vehicle";
  reference: string;
  supplierName: string;
  status: string;
  canConfirm: boolean;
  vehicleType?: string;
  startDate?: string;
  endDate?: string;
  reservationNo?: string | null;
  stays?: Array<{ checkIn?: string; checkOut?: string; roomCount: number }>;
  rooms?: Array<{ category: string; quantity: number; rate: number }>;
  cancellationPolicies?: Array<{ beforeDate: string; percentage: number }>;
};

const date = (value?: string) => value
  ? new Date(value + "T00:00:00Z").toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "UTC" })
  : "—";
const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const unavailable = "This voucher link is unavailable. Ask your DVi Travel contact to send a new one.";

export default function SupplierVoucherPage() {
  const { hash } = useLocation();
  const token = new URLSearchParams(hash.slice(1)).get("token") ?? "";
  const [voucher, setVoucher] = useState<SupplierVoucher | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setVoucher(null);
    setConfirmed(false);
    setError("");
    if (!token) {
      setError(unavailable);
      setLoading(false);
      return () => controller.abort();
    }
    setLoading(true);
    void api("/supplier-vouchers/open", {
      method: "POST", auth: false, redirectOnForbidden: false, cache: "no-store",
      body: { token }, signal: controller.signal,
    }).then((result: SupplierVoucher) => {
      if (!controller.signal.aborted) setVoucher(result);
    }).catch(() => {
      if (!controller.signal.aborted) setError(unavailable);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [token]);

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !voucher?.canConfirm) return;
    const fields = new FormData(event.currentTarget);
    const confirmedBy = String(fields.get("confirmedBy") ?? "").trim();
    const phone = String(fields.get("phone") ?? "").trim();
    const reservationNo = String(fields.get("reservationNo") ?? "").trim();
    const hotelContact = voucher.kind === "hotel" ? {
      email: String(fields.get("email") ?? "").trim(),
      remarks: String(fields.get("remarks") ?? "").trim(),
    } : {};
    setSubmitting(true);
    setError("");
    try {
      await api("/supplier-vouchers/confirm", {
        method: "POST", auth: false, redirectOnForbidden: false, cache: "no-store",
        body: { token, confirmedBy, phone, reservationNo, ...hotelContact },
      });
      setConfirmed(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the confirmation. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-4 py-8 text-[#1e1b4b] sm:px-8">
      <div className="mx-auto max-w-2xl">
        <header className="border-b border-slate-200 pb-5">
          <p className="text-sm font-bold text-[#5f129e]">DVi Travel</p>
          <h1 className="mt-2 text-2xl font-bold">
            {voucher?.kind === "hotel" ? "Hotel voucher" : voucher?.kind === "vehicle" ? "Vehicle voucher" : "Supplier voucher"}
          </h1>
        </header>
        {loading && <p className="py-6 text-sm text-slate-600" role="status">Loading voucher…</p>}
        {error && <p className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{error}</p>}
        {voucher && (
          <article className="mt-5 rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-xl font-semibold">{voucher.supplierName}</h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div><dt className="text-slate-600">Booking reference</dt><dd className="font-medium">{voucher.reference}</dd></div>
              <div><dt className="text-slate-600">Status</dt><dd className="font-medium capitalize">{
                confirmed ? "Confirmed" : voucher.kind === "hotel"
                  ? offlineBookingStatusLabels[voucher.status as OfflineBookingStatus] ?? voucher.status
                  : voucher.status
              }</dd></div>
              {voucher.vehicleType && <div><dt className="text-slate-600">Vehicle type</dt><dd>{voucher.vehicleType}</dd></div>}
              {(voucher.startDate || voucher.endDate) && <div><dt className="text-slate-600">Travel dates</dt><dd>{date(voucher.startDate)} to {date(voucher.endDate)}</dd></div>}
              {voucher.reservationNo && <div><dt className="text-slate-600">Reservation number</dt><dd>{voucher.reservationNo}</dd></div>}
            </dl>
            {Boolean(voucher.stays?.length) && (
              <section className="mt-5 border-t border-slate-200 pt-4">
                <h3 className="font-semibold">Stay details</h3>
                <ul className="mt-2 divide-y divide-slate-100 text-sm">
                  {voucher.stays!.map((stay, i) => (
                    <li className="py-2" key={i}>{date(stay.checkIn)} to {date(stay.checkOut)} · {stay.roomCount} {stay.roomCount === 1 ? "room" : "rooms"}</li>
                  ))}
                </ul>
                {voucher.rooms?.map((room, index) => (
                  <p key={index} className="mt-2 text-sm">{room.category} · {room.quantity} × {rupees.format(room.rate)} per night</p>
                ))}
              </section>
            )}
            {Boolean(voucher.cancellationPolicies?.length) && (
              <section className="mt-5 border-t border-slate-200 pt-4">
                <h3 className="font-semibold">Cancellation policy</h3>
                {voucher.cancellationPolicies!.map((policy, i) => (
                  <p key={i} className="mt-2 text-sm">{date(policy.beforeDate)} · {policy.percentage}% charge</p>
                ))}
              </section>
            )}
            {confirmed && <p className="mt-5 text-sm font-medium text-green-800" role="status">Your confirmation was saved.</p>}
            {voucher.canConfirm && !confirmed && (
              <form className="mt-5 space-y-4 border-t border-slate-200 pt-5" onSubmit={confirm}>
                <h3 className="font-semibold">Confirm booking</h3>
                <div className="space-y-1.5"><Label htmlFor="reservationNo">Reservation number</Label><Input id="reservationNo" name="reservationNo" required maxLength={100} /></div>
                <div className="space-y-1.5"><Label htmlFor="confirmedBy">Confirmed by</Label><Input id="confirmedBy" name="confirmedBy" required maxLength={100} autoComplete="name" /></div>
                <div className="space-y-1.5"><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" required type="tel" maxLength={32} autoComplete="tel" /></div>
                {voucher.kind === "hotel" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Hotel email</Label>
                      <Input id="email" name="email" required type="email" maxLength={254} autoComplete="email" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="remarks">Remarks (optional)</Label>
                      <Textarea id="remarks" name="remarks" maxLength={2000} />
                    </div>
                  </>
                )}
                <Button className="bg-[#5f129e] text-white hover:bg-[#4b0f7c]" type="submit" disabled={submitting}>
                  {submitting ? "Saving…" : "Confirm Book"}
                </Button>
              </form>
            )}
          </article>
        )}
      </div>
    </main>
  );
}
