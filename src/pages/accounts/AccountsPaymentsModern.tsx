import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, CreditCard, Download, Eye, Users, Wallet } from "lucide-react";
import { fetchAccountsList, fetchPaymentModes, postPayment, postBulkPayment, type AccountsRow, type AccountsComponentType, type PaymentModeOption } from "@/services/accountsManagerApi";
import { ItineraryService } from "@/services/itinerary";

const n = (value: unknown) => { const v = Number(value); return Number.isFinite(v) ? v : 0; };
const cents = (value: unknown) => Math.round(n(value) * 100);
const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const key = (r: AccountsRow) => `${r.componentType}:${r.headerId}:${r.id}`;
const name = (r: AccountsRow) => String(r.vendorName || r.hotelName || "Unknown supplier").trim();
const group = (r: AccountsRow) => `${r.componentType}:${r.vendorId && r.vendorId > 0 ? `id:${r.vendorId}` : `name:${name(r).toLowerCase()}`}`;
const norm = (v: unknown) => String(v ?? "").trim().toLowerCase();
const eligible = (r: AccountsRow) => r.status === "due" && cents(r.payable) > 0 && r.id > 0 && r.headerId > 0 && r.componentType !== "all";
const statusOf = (r: AccountsRow) => cents(r.payable) <= 0 ? "Paid" : cents(r.payout) > 0 ? "Partial" : "Pending";
const iso = (v?: string | null) => { const s = String(v || ""); const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s); return m ? `${m[3]}-${m[2]}-${m[1]}` : /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0,10) : ""; };
const dateText = (v?: string) => { const d=iso(v); return d ? new Date(d + "T00:00:00").toLocaleDateString("en-GB", {day:"2-digit",month:"short",year:"numeric"}) : "-"; };
const today = () => new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const kinds: AccountsComponentType[] = ["all","vehicle","hotel","guide","hotspot","activity"];
type Filter = { booking: string; supplier: string; from: string; to: string; status: string; type: AccountsComponentType; search: string };
type Scope = {records: Array<{quoteId:string;componentType:string;componentDetailId?:number}>};
const matchesScope = (r: AccountsRow, scope: Scope | null) => !scope || scope.records.some(x => norm(x.quoteId) === norm(r.quoteId) && (x.componentType === "agent" || (x.componentType === r.componentType && Number(x.componentDetailId) === r.id)));
const empty = (type: AccountsComponentType = "vehicle"): Filter => ({booking:"",supplier:"all",from:"",to:"",status:"all",type,search:""});



const field = "h-10 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-100";
const btn = "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";
const primary = `${btn} bg-violet-700 text-white hover:bg-violet-800`;
const secondary = `${btn} border border-violet-200 bg-white text-violet-700 hover:bg-violet-50`;
const badge = {Paid:"bg-emerald-100 text-emerald-800",Partial:"bg-amber-100 text-amber-800",Pending:"bg-rose-100 text-rose-800"};

export default function AccountsPaymentsModern() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const preview = false;
  const initialType = kinds.includes(params.get("componentType") as AccountsComponentType) ? params.get("componentType") as AccountsComponentType : "all";
  const [draft,setDraft] = useState<Filter>(()=>({...empty(initialType),booking:params.get("quoteId")||"",search:params.get("search")?.trim()||""}));
  const [applied,setApplied] = useState(draft);
  const [scope,setScope] = useState<Scope|null>(()=>{ const s=(location.state as {ledgerPaymentScope?:Scope}|null)?.ledgerPaymentScope; return Array.isArray(s?.records)&&s.records.length?s:null; });
  const [rows,setRows] = useState<AccountsRow[]>([]);

  const [modes,setModes] = useState<PaymentModeOption[]>([]);
  const [customers,setCustomers] = useState<Record<string,string>>({});
  const [picked,setPicked] = useState<string[]>([]);
  const [payment,setPayment] = useState("");
  const [mode,setMode] = useState("");
  const [reference,setReference] = useState("");
  const [processor,setProcessor] = useState("");
  const [receipt,setReceipt] = useState<File|null>(null);
  const [receiptKey,setReceiptKey] = useState(0);
  const [busy,setBusy] = useState(false);
  const [saving,setSaving] = useState(false);
  const [exporting,setExporting] = useState(false);
  const [blocked,setBlocked] = useState(false);
  const [error,setError] = useState("");
  const [modeError,setModeError] = useState("");
  const [message,setMessage] = useState("");
  const [page,setPage] = useState(1);
  const [size,setSize] = useState(10);
  const [sort,setSort] = useState<{field:"booking"|"customer"|"supplier"|"date"|"purchase"|"paid"|"balance"|"status";asc:boolean}>({field:"date",asc:false});
  const [view,setView] = useState<AccountsRow|null>(null);
  const [reload,setReload] = useState(0);
  const request = useRef(0);
  const lock = useRef(false);
  const quick = useRef<HTMLElement>(null);

  const customerCache = useRef(new Map<string,string>());
  const pendingCustomer = useRef(new Map<string,Promise<string>>());
  const clearSelection = () => {setPicked([]);setPayment("");setMode("");setReference("");setProcessor("");setReceipt(null);setReceiptKey(v=>v+1);};
  const getRows = async (f:Filter) => {

    const result=await fetchAccountsList({componentType:f.type==="all"?undefined:f.type,status:"all",quoteId:f.booking.trim()||undefined,search:f.search.trim()||undefined});
    if(!Array.isArray(result)) throw Error("Unexpected Accounts API response.");
    return Array.from(new Map(result.filter(r=>r.componentType!=="all").map(r=>[key(r),r])).values());
  };
  useEffect(()=>{ let active=true; setModeError("");  setModes([]); fetchPaymentModes().then(v=>{if(active)setModes(v);}).catch(()=>{if(active)setModeError("Payment methods could not be loaded. Refresh before recording a payment.");});return()=>{active=false;}; },[preview,reload]);
  useEffect(()=>{const id=++request.current;setBusy(true);setError("");setRows([]);getRows(applied).then(data=>{if(id===request.current){setRows(data.filter(r=>matchesScope(r,scope)));setBlocked(false);}}).catch(e=>{if(id===request.current){setError(e instanceof Error?e.message:"Unable to load payment records.");setBlocked(true);}}).finally(()=>{if(id===request.current)setBusy(false);});return()=>{request.current++;};},[applied,scope,reload,preview]);
  const suppliers = useMemo(()=>Array.from(new Map(rows.map(r=>[group(r),name(r)])).entries()).sort((a,b)=>a[1].localeCompare(b[1])),[rows]);
  const filtered=useMemo(()=>rows.filter(r=>{
    if(applied.type!=="all"&&r.componentType!==applied.type)return false;
    if(preview&&applied.search.trim()&&![name(r),r.agent,r.componentType,r.quoteId].some(v=>norm(v).includes(norm(applied.search))))return false;
    if(applied.booking.trim()&&norm(r.quoteId)!==norm(applied.booking))return false;
    if(applied.supplier!=="all"&&group(r)!==applied.supplier)return false;
    if(applied.status!=="all"&&norm(statusOf(r))!==applied.status)return false;
    const start=iso(r.startDate||r.routeDate),end=iso(r.endDate)||start;
    return !(applied.from&&(!end||end<applied.from))&&!(applied.to&&(!start||start>applied.to));
  }),[rows,applied,preview]);
  const customerFor=async (id:string):Promise<string>=>{
    const k=norm(id);
    if(customerCache.current.has(k))return customerCache.current.get(k)!;
    const pending=pendingCustomer.current.get(k);if(pending)return pending;
    const task=(async()=>{try{const list=await ItineraryService.getConfirmedItineraries({start:0,length:50,search:id});const match=(list?.data||[]).find((x:{booking_quote_id?:string;itinerary_quote_ID?:string})=>[x.booking_quote_id,x.itinerary_quote_ID].some(v=>norm(v)===k));const raw=String(match?.primary_customer_name||"").trim();const result=raw&&!/^(n\/a|-|unknown)$/i.test(raw)?raw:"Unavailable";customerCache.current.set(k,result);return result;}catch{return "Unavailable";}finally{pendingCustomer.current.delete(k);}})();pendingCustomer.current.set(k,task);return task;
  };
  const sorted=useMemo(()=>[...filtered].sort((a,b)=>{const value=(r:AccountsRow)=>({booking:r.quoteId,customer:customers[norm(r.quoteId)]||"",supplier:name(r),date:iso(r.startDate||r.routeDate),purchase:n(r.amount),paid:n(r.payout),balance:n(r.payable),status:statusOf(r)})[sort.field];const x=value(a),y=value(b);const c=typeof x==="number"&&typeof y==="number"?x-y:String(x).localeCompare(String(y));return sort.asc?c:-c;}),[filtered,sort,customers]);
  const pages=Math.max(1,Math.ceil(sorted.length/size)), current=Math.min(page,pages);
  const visible=sorted.slice((current-1)*size,current*size);
  const visibleIds=JSON.stringify(Array.from(new Set(visible.map(r=>r.quoteId))));
  useEffect(()=>{let live=true;const ids=JSON.parse(visibleIds) as string[];void(async()=>{for(let i=0;i<ids.length;i+=4){const pairs=await Promise.all(ids.slice(i,i+4).map(async id=>[norm(id),await customerFor(id)] as const));if(live)setCustomers(old=>({...old,...Object.fromEntries(pairs)}));}})();return()=>{live=false;};},[visibleIds,preview]);
  const selected=filtered.filter(r=>picked.includes(key(r))&&eligible(r));
  const totalCents=selected.reduce((s,r)=>s+cents(r.payable),0);
  const total=totalCents/100;
  const selectionKey=selected.map(key).sort().join("|");
  useEffect(()=>{setPayment(total?total.toFixed(2):"");setReference("");setReceipt(null);setReceiptKey(v=>v+1);},[selectionKey,total]);
  const stats=filtered.reduce((a,r)=>({purchase:a.purchase+cents(r.amount),paid:a.paid+cents(r.payout),balance:a.balance+cents(r.payable),today:a.today+(iso(r.startDate||r.routeDate)===today()?cents(r.payable):0)}),{purchase:0,paid:0,balance:0,today:0});
  const due=filtered.filter(eligible);
  const vendorCount=new Set(due.map(group)).size;
  const selectionGroup=selected.length?group(selected[0]):"";
  const groupDue=due.filter(r=>!selectionGroup||group(r)===selectionGroup);
  const allChecked=groupDue.length>0&&groupDue.every(r=>picked.includes(key(r)));
  const toggle=(r:AccountsRow)=>{if(!eligible(r)||saving||busy||blocked)return;setError("");setMessage("");if(picked.includes(key(r))){setPicked(old=>old.filter(k=>k!==key(r)));return;}if(selected.length&&group(r)!==selectionGroup){setError("Select payment records from one supplier at a time.");return;}if(selected.length>=100){setError("Maximum 100 payment records per bulk payment.");return;}setPicked(old=>[...old,key(r)]);};
  const selectAll=()=>{if(!groupDue.length||saving||busy||blocked)return;setError("");if(new Set(groupDue.map(group)).size!==1){setError("Select a supplier first, then select all its due records.");return;}if(groupDue.length>100){setError("Select at most 100 payment records.");return;}setPicked(allChecked?[]:groupDue.map(key));};
  // Quick Pay is visible only while eligible payment records are selected.
  const quickOpen=selected.length>0;
  useEffect(()=>{
    if(quickOpen) quick.current?.scrollIntoView({block:"nearest",inline:"nearest",behavior:"smooth"});
  },[quickOpen]);
  const closeQuick=()=>{if(!saving&&!lock.current)clearSelection();};
  // Apply the remaining filters automatically; no Search/Reset controls needed.
  const refresh=()=>{clearSelection();setReload(x=>x+1);setMessage("");};
  const change=(k:keyof Filter,v:string)=>setDraft(old=>({...old,[k]:v,...(k==="type"?{supplier:"all"}:{})}));
  useEffect(()=>{
    if(saving || JSON.stringify(draft)===JSON.stringify(applied)) return;
    const timer=window.setTimeout(()=>{
      clearSelection();setPage(1);setMessage("");
      if(draft.booking!==applied.booking||draft.type!==applied.type)setScope(null);
      setApplied({...draft});
    },draft.booking!==applied.booking?350:0);
    return()=>window.clearTimeout(timer);
  },[draft,applied,saving]);
  const submit=async(e:FormEvent)=>{
    e.preventDefault(); if(lock.current||busy||blocked||JSON.stringify(draft)!==JSON.stringify(applied)||!selected.length)return;
    const requested=cents(payment);const modeId=Number(mode);
    if(!/^\d+(?:\.\d{1,2})?$/.test(payment.trim())||requested<=0||requested>totalCents||(selected.length>1&&requested!==totalCents)||!modes.some(m=>m.id===modeId)||!reference.trim()||!processor.trim()){setError("Enter a valid amount, payment mode, processor and transaction reference. Bulk payments settle the full selected balance.");return;}
    if(selected.length>100||new Set(selected.map(group)).size!==1){setError("Select up to 100 records for the same supplier.");return;}
    if(!window.confirm(`${preview?"Simulate":"Record"} ${money(requested/100)} for ${selected.length} booking record(s)? ${preview?"No API will be called.":"Confirm funds have already been transferred. This records payment only."}`))return;
    lock.current=true;setSaving(true);setError("");setMessage("");let sent=false;
    try{
      {
        const latest=await getRows(applied);const lookup=new Map(latest.map(r=>[key(r),r]));const fresh=selected.map(r=>lookup.get(key(r)));
        if(fresh.some((r,i)=>!r||!eligible(r)||group(r)!==group(selected[i])||cents(r.payable)!==cents(selected[i].payable)))throw Error("Payment balances changed. Refresh and select the records again.");
        const tasks=selected.map(r=>({componentType:r.componentType as Exclude<AccountsComponentType,"all">,accountsItineraryDetailsId:r.headerId,componentDetailId:r.id,routeDate:r.routeDate,amount:(selected.length>1?cents(r.payable):requested)/100}));
        const common={modeOfPaymentId:modeId,utrNumber:reference.trim(),processedBy:processor.trim(),paymentScreenshot:receipt||undefined};
        sent=true;if(tasks.length===1)await postPayment({...tasks[0],...common});else await postBulkPayment({payments:tasks,...common});
      }
      clearSelection();setMessage(preview?"Test payment simulated. No database changes.":"Payment recorded. Refreshing balances...");setReload(v=>v+1);
    }catch(err){setBlocked(true);setError((err instanceof Error?err.message:"Payment could not be confirmed.")+(sent?" Verify the transaction reference in the ledger before retrying. Refresh required.":" Refresh required."));}
    finally{lock.current=false;setSaving(false);}
  };
  const exportRows=async(onlySelected:boolean)=>{
    const data=onlySelected?selected:sorted;if(!data.length||exporting)return;setExporting(true);setError("");
    try{const XLSX=await import("xlsx");const ids=Array.from(new Set(data.map(r=>r.quoteId)));const names:Record<string,string>={};for(let i=0;i<ids.length;i+=4)await Promise.all(ids.slice(i,i+4).map(async id=>{names[norm(id)]=await customerFor(id);}));const header=["Booking ID","Customer","Supplier / Vendor","Component","Start Date","End Date","Purchase (INR)","Paid (INR)","Balance (INR)","Status"];const body=data.map(r=>[r.quoteId,names[norm(r.quoteId)],name(r),r.componentType,iso(r.startDate),iso(r.endDate),n(r.amount),n(r.payout),n(r.payable),statusOf(r)]);const sum=(k:"amount"|"payout"|"payable")=>data.reduce((s,r)=>s+cents(r[k]),0)/100;const ws=XLSX.utils.aoa_to_sheet([[preview?"PAYMENT RECORDS - TEST DATA":"PAYMENT RECORDS"],header,...body,["TOTAL","","","","","",sum("amount"),sum("payout"),sum("payable"),""]]);ws["!merges"]=[{s:{r:0,c:0},e:{r:0,c:9}}];ws["!cols"]=[18,24,28,15,16,16,18,18,18,14].map(wch=>({wch}));ws["!autofilter"]={ref:`A2:J${data.length+2}`};for(let r=2;r<=data.length+2;r++)for(let c=6;c<=8;c++){const cell=ws[XLSX.utils.encode_cell({r,c})];if(cell)cell.z="#,##0.00";}const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Payments");XLSX.writeFile(wb,`${preview?"TEST-":""}Payments-${today()}.xlsx`);}
    catch(e){setError(e instanceof Error?e.message:"Unable to export payments.");}finally{setExporting(false);}
  };
  const th=(label:string,fieldName:typeof sort.field)=><button type="button" className="whitespace-nowrap hover:text-violet-700" onClick={()=>{setSort(s=>({field:fieldName,asc:s.field===fieldName?!s.asc:true}));setPage(1);}}>{label}{sort.field===fieldName?(sort.asc?" ^":" v"):""}</button>;
  const filtersPending=JSON.stringify(draft)!==JSON.stringify(applied);
  const disabled=busy||saving||blocked||filtersPending;
  return <main className="min-h-screen bg-[#f7f7fc] p-4 text-slate-800 lg:p-6">
    <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-violet-100 p-3 text-violet-700"><Wallet size={27}/></div>
          <div><h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Payments</h1><p className="text-sm text-slate-500">Track dues, review balances, and record supplier payments faster.</p></div>
          </div>
          <div className="flex flex-wrap gap-2"><button className={secondary} onClick={()=>navigate("/accounts-transporter-ledger")} disabled={saving}><ArrowLeft size={16}/> Ledger</button></div>
          </header>

    <section className="mb-4 rounded-xl border border-violet-100 bg-white p-4 shadow-sm" aria-label="Payment filters">
          <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="space-y-1 text-xs font-semibold">Booking ID<input className={field} placeholder="Search booking ID" value={draft.booking} disabled={saving} onChange={e=>change("booking",e.target.value)}/></label>
          <label className="space-y-1 text-xs font-semibold">Supplier / Vendor<select className={field} value={draft.supplier} disabled={saving} onChange={e=>change("supplier",e.target.value)}><option value="all">All Suppliers</option>{suppliers.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
          <label className="space-y-1 text-xs font-semibold">Payment Status<select className={field} value={draft.status} disabled={saving} onChange={e=>change("status",e.target.value)}><option value="all">All Status</option><option value="pending">Pending</option><option value="partial">Partial</option><option value="paid">Paid</option></select></label>
          <label className="space-y-1 text-xs font-semibold">Component<select className={field} value={draft.type} disabled={saving} onChange={e=>change("type",e.target.value)}>{kinds.map(k=><option key={k} value={k}>{k==="all"?"All components":k[0].toUpperCase()+k.slice(1)}</option>)}</select></label></div>
          {scope&&<p className="mt-2 text-xs text-violet-700">Showing records selected from the ledger. <button type="button" className="underline" disabled={saving} onClick={()=>{clearSelection();setScope(null);setDraft(empty(initialType));setApplied(empty(initialType));setPage(1);}}>Show all records</button></p>}</section>
    {modeError&&<div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{modeError}</div>}{error&&<div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}{message&&<div role="status" className="mb-3 rounded-lg border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800">{message}</div>}
    {(blocked||modeError)&&<div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-600"><span>Check any attempted transaction in the ledger before reloading.</span><button type="button" className={secondary} disabled={busy||saving} onClick={refresh}>Reload records</button></div>}
    <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">{[{title:"Total Payable",value:money(stats.purchase/100),icon:Wallet,style:"bg-violet-50 text-violet-700 border-violet-100"},{title:"Total Paid",value:money(stats.paid/100),icon:CheckCircle2,style:"bg-emerald-50 text-emerald-700 border-emerald-100"},{title:"Outstanding",value:money(stats.balance/100),icon:Clock,style:"bg-orange-50 text-orange-700 border-orange-100"},{title:"Travel Today - Due",value:money(stats.today/100),icon:CalendarDays,style:"bg-sky-50 text-sky-700 border-sky-100"},{title:"Vendors to Pay",value:String(vendorCount),icon:Users,style:"bg-purple-50 text-purple-700 border-purple-100"}].map(({title,value,icon:Icon,style})=>
          <div key={title} className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 shadow-sm ${style}`}>
          <div className="rounded-lg bg-white/75 p-2"><Icon size={20}/></div>
          <div className="min-w-0"><p className="text-xs font-medium text-slate-600">{title}</p><p className="mt-1 break-words text-lg font-bold text-slate-900">{busy?"-":value}</p></div>
          </div>)}</section>
    <div className={`grid items-start gap-4 ${quickOpen?"2xl:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_290px]":"grid-cols-1"}`}>
      <section className="min-w-0 overflow-hidden rounded-xl border border-violet-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4"><h2 className="font-bold text-slate-900">Payment Records ({filtered.length})</h2><button type="button" className={secondary} disabled={disabled||exporting||!sorted.length} onClick={()=>void exportRows(false)}><Download size={16}/> {exporting?"Exporting...":"Download Excel"}</button></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-[#f2effa] text-slate-700"><tr><th className="p-2"><input aria-label="Select all due records for supplier" type="checkbox" checked={allChecked} disabled={disabled||!groupDue.length} onChange={selectAll}/></th>{[["Booking ID","booking"],["Customer","customer"],["Supplier / Vendor","supplier"],["Travel Date","date"],["Purchase","purchase"],["Paid","paid"],["Balance","balance"],["Status","status"]].map(([label,k])=><th key={k} className="px-2 py-3">{th(label,k as typeof sort.field)}</th>)}<th className="px-2 py-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{busy?<tr><td colSpan={10} className="p-10 text-center text-slate-500">Loading payment records...</td></tr>:!visible.length?<tr><td colSpan={10} className="p-10 text-center text-slate-500">{blocked?"Unable to load records. Refresh and retry.":"No payment records match the filters."}</td></tr>:visible.map(r=><tr key={key(r)} className={picked.includes(key(r))?"bg-violet-50":"hover:bg-slate-50"}><td className="p-2"><input aria-label={`Select ${r.quoteId}`} type="checkbox" checked={picked.includes(key(r))} onChange={()=>toggle(r)} disabled={disabled||!eligible(r)}/></td>
          <td className="whitespace-nowrap p-2 font-semibold text-violet-700">{r.quoteId}</td><td className="p-2">{customers[norm(r.quoteId)]||"Loading..."}</td><td className="p-2">{name(r)}<span className="block capitalize text-[10px] text-slate-500">{r.componentType}</span></td>
          <td className="whitespace-nowrap p-2">{dateText(r.startDate||r.routeDate)}</td><td className="whitespace-nowrap p-2">{money(n(r.amount))}</td><td className="whitespace-nowrap p-2">{money(n(r.payout))}</td><td className="whitespace-nowrap p-2 font-bold">{money(n(r.payable))}</td><td className="p-2"><span className={`rounded-md px-2 py-1 font-medium ${badge[statusOf(r)]}`}>{statusOf(r)}</span></td>
          <td className="p-2"><button type="button" disabled={disabled} className="inline-flex items-center gap-1 rounded-md border border-violet-200 px-2 py-1.5 font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-40" onClick={()=>{if(eligible(r)){setPicked([key(r)]);setError("");setMessage("");}else setView(r);}}>{eligible(r)?<CreditCard size={13}/>:<Eye size={13}/>} {eligible(r)?"Pay":"View"}</button></td>
          </tr>)}</tbody></table></div>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-3 text-xs text-slate-500"><span>{filtered.length?`Showing ${(current-1)*size+1} - ${Math.min(current*size,filtered.length)} of ${filtered.length} records`:"Showing 0 records"}</span>
          <div className="flex items-center gap-1"><select aria-label="Rows per page" value={size} onChange={e=>{setSize(Number(e.target.value));setPage(1);}} className="rounded-md border p-2">{[10,25,50,100].map(v=><option key={v} value={v}>{v} per page</option>)}</select><button className="rounded-md border p-2 disabled:opacity-30" aria-label="Previous page" disabled={current<=1} onClick={()=>setPage(current-1)}><ChevronLeft size={14}/></button>
          <span className="rounded-md bg-violet-700 px-3 py-2 text-white">{current} / {pages}</span><button className="rounded-md border p-2 disabled:opacity-30" aria-label="Next page" disabled={current>=pages} onClick={()=>setPage(current+1)}><ChevronRight size={14}/></button>
          </div>
          </footer></section>
      {quickOpen&&<aside ref={quick} aria-label="Quick Pay" className="rounded-xl border border-violet-200 bg-white shadow-sm xl:sticky xl:top-3">
          <div className="flex gap-3 rounded-t-xl bg-violet-50 p-4">
          <div className="rounded-lg bg-violet-100 p-2 text-violet-700"><CreditCard size={24}/></div>
          <div className="min-w-0 flex-1"><h2 className="font-bold text-slate-900">Quick Pay</h2><p className="text-xs text-slate-500">Record a payment for selected bookings</p></div>
          <button type="button" aria-label="Close Quick Pay" disabled={saving} onClick={closeQuick} className="self-start rounded-md border border-violet-200 bg-white px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-40">Close</button>
          </div><form className="space-y-3 p-4" onSubmit={submit}>
          <div className="flex justify-between text-sm font-semibold"><span>Selected Bookings ({selected.length})</span><button type="button" className="text-xs text-violet-700 disabled:opacity-40" disabled={saving||!selected.length} onClick={closeQuick}>Clear</button></div>{selected.length?<div className="max-h-40 space-y-2 overflow-auto">{selected.map(r=>
          <div key={key(r)} className="flex justify-between gap-2 text-xs"><span className="min-w-0 break-words">{r.quoteId} - {name(r)}</span><strong className="whitespace-nowrap">{money(n(r.payable))}</strong></div>)}</div>:<p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">Select a due booking using its checkbox or Pay button.</p>}<div className="flex items-center justify-between gap-2 rounded-lg bg-violet-50 p-3 text-sm font-bold text-violet-700"><span>Total Balance Due</span><span>{money(total)}</span></div>
          <label className="block space-y-1 text-xs font-semibold">Payment Amount *<input type="number" min="0.01" step="0.01" max={total} value={payment} onChange={e=>setPayment(e.target.value)} readOnly={selected.length>1} disabled={!selected.length||disabled} className={field} required/></label>{selected.length>1&&<p className="text-xs text-slate-500">Bulk payments settle the full balance of every selected booking.</p>}<label className="block space-y-1 text-xs font-semibold">Processed By *<input value={processor} onChange={e=>setProcessor(e.target.value)} className={field} required disabled={disabled||!selected.length}/></label>
          <label className="block space-y-1 text-xs font-semibold">Payment Mode *<select value={mode} onChange={e=>setMode(e.target.value)} className={field} required disabled={disabled||!selected.length}><option value="">Select Payment Method</option>{modes.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
          <label className="block space-y-1 text-xs font-semibold">Transaction Reference *<input value={reference} onChange={e=>setReference(e.target.value)} className={field} placeholder="Enter transaction / UTR" required disabled={disabled||!selected.length}/></label>
          <label className="block space-y-2 text-xs font-semibold">Upload Receipt (Optional)<div className="rounded-lg border border-dashed border-violet-200 bg-violet-50/50 p-3"><input key={receiptKey} type="file" accept="image/*" className="w-full text-xs" disabled={disabled||!selected.length} onChange={e=>{const file=e.target.files?.[0]||null;if(file&&(file.size>5*1024*1024||!file.type.startsWith("image/"))){setError("Choose an image receipt up to 5 MB.");setReceipt(null);setReceiptKey(v=>v+1);return;}setReceipt(file);}}/><span className="mt-2 block font-normal text-slate-500">Image, max 5 MB</span></div>
          </label><p className="text-[11px] text-slate-500">{preview?"Test only. No real payment.":"Record an already completed transfer. This does not initiate a bank payment."}</p><button type="submit" className={`${primary} w-full`} disabled={disabled||!selected.length||!mode||!reference.trim()||!processor.trim()||cents(payment)<=0||cents(payment)>totalCents}><CreditCard size={16}/>{saving?"Saving...":`${preview?"Simulate":"Pay Now"} (${money(cents(payment)/100)})`}</button></form></aside>}
    </div>{view&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"><section role="dialog" aria-modal="true" aria-label="Payment record details" className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
          <div className="flex justify-between"><h2 className="font-bold">Payment Details</h2><button onClick={()=>setView(null)} aria-label="Close details">Close</button></div>
          <p className="my-2 text-sm text-violet-700">{view.quoteId} - {name(view)}</p>
          <div className="grid grid-cols-3 gap-2 text-sm">{[["Purchase",view.amount],["Paid",view.payout],["Balance",view.payable]].map(([label,value])=>
          <div key={label} className="rounded-lg bg-slate-50 p-3">{label}<p className="font-bold">{money(n(value))}</p></div>)}</div><p className="my-3 text-sm">Status: {statusOf(view)}</p>{!preview&&<button className={secondary} onClick={()=>navigate(`/accounts-ledger?componentType=${view.componentType}&quoteId=${encodeURIComponent(view.quoteId)}`)}>View Full Ledger</button>}</section></div>}
  </main>;
}
