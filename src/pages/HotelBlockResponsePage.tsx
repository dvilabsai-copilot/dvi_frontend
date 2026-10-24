import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Clock3, Hotel, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ItineraryService } from "@/services/itinerary";

type HotelBlock = {
  bookingReference?: string | number;
  hotelName?: string;
  provider?: string;
  checkIn?: string;
  checkOut?: string;
  roomType?: string;
  mealPlan?: string;
  roomCount?: number;
  status?: string;
};

const formatDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-IN", { dateStyle: "medium" });
};

export default function HotelBlockResponsePage() {
  const { token = "" } = useParams();
  const [request, setRequest] = useState<HotelBlock | null>(null);
  const [status, setStatus] = useState("CONFIRMED");
  const [respondentName, setRespondentName] = useState("");
  const [confirmationReference, setConfirmationReference] = useState("");
  const [cutoffAt, setCutoffAt] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    if (!token) {
      setError("This hotel response link is invalid.");
      setLoading(false);
      return () => { active = false; };
    }
    void ItineraryService.getPublicHotelBlock(token)
      .then((result) => {
        if (active) setRequest(result as HotelBlock);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "This hotel response link is invalid or expired.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [token]);

  const submit = async () => {
    if (!token || !respondentName.trim()) {
      setError("Respondent name is required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await ItineraryService.respondPublicHotelBlock(token, {
        status,
        respondentName: respondentName.trim(),
        confirmationReference: confirmationReference.trim(),
        cutoffAt: cutoffAt || undefined,
        notes: notes.trim(),
        communicationChannel: "EMAIL",
      });
      setSuccess("Your hotel response was recorded. DVi Travel will update the booking status.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to submit the hotel response.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f7fb] px-4 py-8 text-[#1e1b4b] sm:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-5 rounded-xl bg-[#151d4d] px-6 py-5 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ffbd4a]">DVI Travel</p>
          <h1 className="mt-2 text-2xl font-extrabold">Hotel Blocking Response</h1>
          <p className="mt-1 text-sm text-indigo-100">Please confirm the availability and hold details for this request.</p>
        </header>

        {loading && <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-12 text-sm text-slate-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Loading request...</div>}
        {!loading && error && !request && <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>}
        {!loading && request && (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f3eeff] text-[#5c24e5]"><Hotel className="h-5 w-5" /></span>
                <div><h2 className="font-bold">Booking Reference: {request.bookingReference || "—"}</h2><p className="text-xs text-slate-500">Provider: {request.provider || "—"}</p></div>
              </div>
              <div className="grid gap-4 text-sm sm:grid-cols-2">
                <div><span className="block text-xs text-slate-400">Hotel</span><strong>{request.hotelName || "—"}</strong></div>
                <div><span className="block text-xs text-slate-400">Rooms</span><strong>{request.roomCount || 0}</strong></div>
                <div><span className="block text-xs text-slate-400">Check-in</span><strong>{formatDate(request.checkIn)}</strong></div>
                <div><span className="block text-xs text-slate-400">Check-out</span><strong>{formatDate(request.checkOut)}</strong></div>
                <div><span className="block text-xs text-slate-400">Room category</span><strong>{request.roomType || "—"}</strong></div>
                <div><span className="block text-xs text-slate-400">Meal plan</span><strong>{request.mealPlan || "—"}</strong></div>
              </div>
            </section>

            <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3"><Clock3 className="h-5 w-5 text-[#5c24e5]" /><div><h2 className="font-bold">Hotel response</h2><p className="text-xs text-slate-500">This response is recorded against this request only.</p></div></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">Response<select className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)} disabled={Boolean(success)}><option value="BLOCKED">Rooms blocked / held</option><option value="CONFIRMED">Final booking confirmed</option><option value="WAITLISTED">Waitlisted</option><option value="UNAVAILABLE">Unavailable</option></select></label>
                <label className="text-xs font-semibold text-slate-600">Respondent name *<input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={respondentName} onChange={(event) => setRespondentName(event.target.value)} disabled={Boolean(success)} /></label>
                <label className="text-xs font-semibold text-slate-600">Confirmation reference<input className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={confirmationReference} onChange={(event) => setConfirmationReference(event.target.value)} disabled={Boolean(success)} /></label>
                <label className="text-xs font-semibold text-slate-600">Cutoff date and time<input type="datetime-local" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={cutoffAt} onChange={(event) => setCutoffAt(event.target.value)} disabled={Boolean(success)} /></label>
              </div>
              <label className="mt-4 block text-xs font-semibold text-slate-600">Remarks<textarea className="mt-1 min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" value={notes} onChange={(event) => setNotes(event.target.value)} disabled={Boolean(success)} /></label>
              {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              {success && <p className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />{success}</p>}
              <div className="mt-5 flex justify-end"><Button type="button" onClick={() => void submit()} disabled={submitting || Boolean(success)} className="bg-[#5c24e5] hover:bg-[#4d1ecc]">{submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : "Submit Hotel Response"}</Button></div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
