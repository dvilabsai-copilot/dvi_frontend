import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Edit, Eye, Search } from "lucide-react";
import { listTboMasterHotels, setTboMasterPriority, TboMasterHotel } from "@/services/tboMasterHotels";

export default function TboMasterHotels() {
  const [items, setItems] = useState<TboMasterHotel[]>([]);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingCode, setSavingCode] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await listTboMasterHotels({ page, limit, search, priority });
      setItems(result.items); setTotal(result.total);
    } catch (err: any) { setError(err?.message || "Unable to load TBO master hotels"); }
    finally { setLoading(false); }
  }, [page, limit, search, priority]);

  useEffect(() => { void load(); }, [load]);

  const togglePriority = async (hotel: TboMasterHotel) => {
    setSavingCode(hotel.hotelCode);
    try {
      const updated = await setTboMasterPriority(hotel.hotelCode, !hotel.isPriority);
      setItems((current) => current.map((item) => item.hotelCode === updated.hotelCode ? updated : item));
    } catch (err: any) { setError(err?.message || "Unable to update priority"); }
    finally { setSavingCode(""); }
  };

  const pageCount = Math.max(1, Math.ceil(total / limit));
  return <div className="min-h-screen bg-white p-6 md:p-8">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-semibold text-slate-800">TBO Master Hotels</h1><p className="mt-1 text-sm text-slate-500">Manage TBO catalogue content separately from operational hotels.</p></div>
      <Link className="rounded-md bg-slate-800 px-4 py-2 text-sm text-white" to="/hotels">Operational Hotels</Link>
    </div>
    <div className="mb-4 flex flex-wrap gap-3 rounded-lg border bg-slate-50 p-4">
      <label className="flex items-center gap-2 rounded-md border bg-white px-3"><Search size={16} className="text-slate-400" /><input className="w-64 py-2 text-sm outline-none" placeholder="Search name, code or city" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} /></label>
      <select className="rounded-md border bg-white px-3 text-sm" value={priority} onChange={(e) => { setPage(1); setPriority(e.target.value); }}><option value="">All priority</option><option value="1">Priority only</option><option value="0">Non-priority</option></select>
      <select className="rounded-md border bg-white px-3 text-sm" value={limit} onChange={(e) => { setPage(1); setLimit(Number(e.target.value)); }}><option value={20}>20 rows</option><option value={50}>50 rows</option><option value={100}>100 rows</option></select>
    </div>
    {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="overflow-x-auto rounded-lg border">
      <table className="min-w-full text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-600"><tr><th className="p-3">#</th><th className="p-3">Actions</th><th className="p-3">Hotel</th><th className="p-3">TBO code</th><th className="p-3">City</th><th className="p-3">Rating</th><th className="p-3">Priority</th></tr></thead>
        <tbody>{loading ? <tr><td className="p-6 text-center" colSpan={7}>Loading TBO master hotels…</td></tr> : items.map((hotel, index) => <tr className="border-t" key={hotel.hotelCode}><td className="p-3">{(page - 1) * limit + index + 1}</td><td className="p-3"><div className="flex gap-2"><Link aria-label={`View ${hotel.name}`} to={`/hotels/tbo-master/${encodeURIComponent(hotel.hotelCode)}`} className="rounded border p-2 text-slate-600"><Eye size={16} /></Link><Link aria-label={`Edit ${hotel.name}`} to={`/hotels/tbo-master/${encodeURIComponent(hotel.hotelCode)}`} className="rounded border p-2 text-blue-600"><Edit size={16} /></Link></div></td><td className="p-3 font-medium text-slate-800">{hotel.name}</td><td className="p-3 font-mono text-xs">{hotel.hotelCode}</td><td className="p-3">{hotel.city || "—"}</td><td className="p-3">{hotel.rating ?? "—"}</td><td className="p-3"><button type="button" disabled={savingCode === hotel.hotelCode} onClick={() => void togglePriority(hotel)} className={`relative h-6 w-11 rounded-full transition ${hotel.isPriority ? "bg-violet-600" : "bg-slate-300"}`} aria-label={`Set ${hotel.name} priority`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${hotel.isPriority ? "left-6" : "left-1"}`} /></button></td></tr>)}{!loading && !items.length && <tr><td className="p-8 text-center text-slate-500" colSpan={7}>No TBO master hotels found.</td></tr>}</tbody>
      </table>
    </div>
    <div className="mt-4 flex items-center justify-between text-sm text-slate-600"><span>{total.toLocaleString()} hotels</span><div className="flex items-center gap-3"><button className="rounded border px-3 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button className="rounded border px-3 py-1 disabled:opacity-40" disabled={page >= pageCount} onClick={() => setPage((value) => value + 1)}>Next</button></div></div>
  </div>;
}
