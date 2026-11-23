import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { formatDisplayDate } from "./hotel-list/hotelList.utils";
import { offlineBookingStatusLabels, type OfflineBookingStatus } from "./hotel-list/offlineHotelBooking";

type Voucher = {
  quote: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  status: OfflineBookingStatus;
};

export default function HotelVoucherConfirmationPage() {
  const { token = "" } = useParams();
  const endpoint = `/public/hotel-voucher-confirmation/${encodeURIComponent(token)}`;
  const [voucher, setVoucher] = useState<Voucher>();
  const [status, setStatus] = useState<OfflineBookingStatus | "">("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const request = new AbortController();
    setVoucher(undefined);
    setStatus("");
    setError("");
    setSaved(false);
    void api<Voucher>(endpoint, { auth: false, redirectOnForbidden: false, cache: "no-store", signal: request.signal })
      .then((result) => { if (!request.signal.aborted) setVoucher(result); })
      .catch((failure) => {
        if (!request.signal.aborted) setError(failure instanceof Error ? failure.message : "Unable to open this voucher.");
      });
    return () => request.abort();
  }, [endpoint]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!status || saving) return;
    const body = Object.fromEntries(new FormData(event.currentTarget));
    setSaving(true);
    setError("");
    try {
      await api(`${endpoint}/respond`, { method: "POST", auth: false, redirectOnForbidden: false, body });
      setSaved(true);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to save your reservation response.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:py-12">
      <div className="mx-auto max-w-xl">
        <header className="mb-4 rounded-xl bg-indigo-950 px-6 py-5 text-white">
          <p className="text-sm font-semibold text-indigo-100">DVi Holidays</p>
          <h1 className="mt-1 text-2xl font-bold">Confirm hotel reservation</h1>
        </header>
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          {!voucher && !error && <p role="status">Loading voucher…</p>}
          {voucher && (
            <>
              <h2 className="text-lg font-semibold">{voucher.hotelName}</h2>
              <p className="mt-1 text-slate-700">Quote {voucher.quote}</p>
              <p className="text-slate-700">{formatDisplayDate(voucher.checkIn)} – {formatDisplayDate(voucher.checkOut)}</p>
              <p className="mt-2 text-sm text-slate-700" role={saved ? "status" : undefined}>
                {saved ? `Reservation response saved. Status ${offlineBookingStatusLabels[status as OfflineBookingStatus]}.`
                  : `Current status ${offlineBookingStatusLabels[voucher.status]}.`}
              </p>
              {!saved && (
                <form className="mt-5 space-y-4 border-t border-slate-200 pt-5" onSubmit={(event) => void submit(event)}>
                  <fieldset disabled={saving} className="space-y-4">
                    <label className="grid gap-1.5 font-medium">Booking status
                      <select name="status" required value={status} onChange={(event) => setStatus(event.target.value as typeof status)}
                        className="min-h-11 rounded-md border border-input bg-background px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
                        <option value="">Select status</option>
                        {Object.entries(offlineBookingStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-1.5 font-medium">Reservation number{status === "confirmed" ? "" : " (optional)"}
                      <Input className="min-h-11" name="reservationNumber" required={status === "confirmed"} maxLength={100} />
                    </label>
                    <label className="grid gap-1.5 font-medium">Verified by
                      <Input className="min-h-11" name="verifiedBy" required maxLength={100} autoComplete="name" />
                    </label>
                    <label className="grid gap-1.5 font-medium">Hotel phone
                      <Input className="min-h-11" name="phone" type="tel" required maxLength={32} autoComplete="tel" />
                    </label>
                    <label className="grid gap-1.5 font-medium">Hotel email
                      <Input className="min-h-11" name="email" type="email" required maxLength={254} autoComplete="email" />
                    </label>
                    <label className="grid gap-1.5 font-medium">Remarks (optional)
                      <Textarea name="remarks" maxLength={2000} />
                    </label>
                  </fieldset>
                  <Button className="min-h-11" type="submit" disabled={saving}>{saving ? "Saving…" : "Save reservation response"}</Button>
                </form>
              )}
            </>
          )}
          {error && <p className="mt-3 text-red-700" role="alert">{error}</p>}
        </section>
      </div>
    </main>
  );
}
