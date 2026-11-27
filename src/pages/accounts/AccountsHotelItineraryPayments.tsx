// DVI_HOTEL_DIRECT_PURCHASE_V8
// DVI_HOTEL_AUTO_FINANCE_V5
// DVI_HOTEL_COMMON_REVIEW_V4
import { resolveHotelFinanceIdentities, postHotelFinancePayment } from './HotelFinanceReview';
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BedDouble, ChevronRight, Download, Wallet, CheckCircle2, Clock, CalendarDays, Hotel, X, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { ItineraryService } from '@/services/itinerary';
import { fetchPaymentModes, type PaymentModeOption } from '@/services/accountsManagerApi';
import { bulkHotelTasks, bulkSelectionHotel, allocate, belongs, dateOnly, hotelGroups, id, matchedStay, norm, nextDay, paise, readConfirmed, readFinance, readStays, sameFinance, status, str, totals, summarizeStays, matchesStayFilters, itineraryPaymentStatus, individualStayRows, readGuestCounts, confirmedPendingPayment, enrichConfirmedStaysFromOriginal, hotelLocalToday, hotelStayDateWindow, hotelStayMayBePaid, hotelPaymentDateStatus, type GuestCounts, type Confirmed, type HotelFinance, type Raw, type Stay } from './hotelItineraryPaymentsLogic';

const money=(p:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2,maximumFractionDigits:2}).format(p/100);
const date=(s:string)=>s?new Date(s+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'Unavailable';
// DVI_HOTEL_PAYMENT_HISTORY_TIME_V1: display the persisted transaction timestamp, never the stay date.
function hotelPaymentRecordedAt(raw: unknown): {date: string; time: string} {
  const value = str(raw);
  const unavailable = {date: 'Unavailable', time: 'Unavailable'};
  if (!value) return unavailable;
  const day = dateOnly(value);
  // Legacy date-only rows do not contain a recorded time. Never invent one.
  if (/^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$/.test(value)) return {date: day ? date(day) : 'Unavailable', time: 'Unavailable'};
  // The API serializes Prisma DateTime as ISO timestamps with a timezone.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.test(value) || !day) return {date: day ? date(day) : 'Unavailable', time: 'Unavailable'};
  const instant = new Date(value);
  if (!Number.isFinite(instant.getTime())) return unavailable;
  return {
    date: instant.toLocaleDateString('en-GB', {timeZone:'Asia/Kolkata', day:'2-digit',month:'short',year:'numeric'}),
    time: instant.toLocaleTimeString('en-IN', {timeZone:'Asia/Kolkata', hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true}) + ' IST',
  };
}
const field='h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-violet-200 disabled:bg-slate-100';
const button='inline-flex items-center justify-center gap-2 rounded-lg border border-violet-200 px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-40 disabled:cursor-not-allowed';
const primary='inline-flex items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-40 disabled:cursor-not-allowed';
const card='rounded-xl border border-violet-100 bg-white shadow-sm';
const pill=(s:string)=>`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${s==='Paid'?'bg-emerald-100 text-emerald-800':s==='Partial'?'bg-amber-100 text-amber-800':s==='Pending'?'bg-rose-100 text-rose-800':'bg-slate-100 text-slate-700'}`;
const errText=(e:unknown)=>e instanceof Error?e.message:'Request failed.';
const PAGE_LIMIT=100, MAX_CONFIRMED=2000;
// DVI_HOTEL_BANK_CONTACT_V1: session-only supplier details; never submit them to payment APIs.
type HotelBankDraft = { accountNumber?: string; ifsc?: string; phone?: string };
type HotelBankDrafts = Record<number, HotelBankDraft>;
function hotelBankExportFields(drafts: HotelBankDrafts, hotelId: number): string[] {
  const d = hotelId > 0 ? drafts[hotelId] : undefined;
  return [d?.accountNumber?.trim() || '', d?.ifsc?.trim() || '', d?.phone?.trim() || ''];
}
function updateHotelBankDraft(drafts: HotelBankDrafts, hotelId: number, key: keyof HotelBankDraft, value: string): HotelBankDrafts {
  if (!Number.isSafeInteger(hotelId) || hotelId <= 0) return drafts;
  return {...drafts, [hotelId]: {...drafts[hotelId], [key]: key === 'ifsc' ? value.toUpperCase() : value}};
}
function HotelBankFields({hotelId, drafts, onChange, disabled, preview=false}: {hotelId:number; drafts:HotelBankDrafts; onChange:(hotelId:number,key:keyof HotelBankDraft,value:string)=>void; disabled:boolean; preview?:boolean}) {
  const d=drafts[hotelId] || {};
  return <fieldset className="rounded-lg border border-violet-100 bg-violet-50/30 p-3" disabled={disabled || !hotelId}>
    <legend className="px-1 text-xs font-semibold text-violet-800">Hotel bank &amp; contact details</legend>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <label className="min-w-0 text-xs font-semibold">Account Number<input type="text" inputMode="numeric" autoComplete="off" maxLength={34} className={field} placeholder="Account number" value={d.accountNumber ?? ''} onChange={e=>onChange(hotelId,'accountNumber',e.target.value)}/></label>
      <label className="min-w-0 text-xs font-semibold">IFSC Code<input type="text" autoComplete="off" maxLength={11} className={`${field} uppercase`} placeholder="IFSC code" value={d.ifsc ?? ''} onChange={e=>onChange(hotelId,'ifsc',e.target.value)}/></label>
      <label className="min-w-0 text-xs font-semibold">Phone Number<input type="tel" autoComplete="off" maxLength={100} className={field} placeholder="Hotel phone number" value={d.phone ?? ''} onChange={e=>onChange(hotelId,'phone',e.target.value)}/></label>
    </div>
    <p className="mt-2 text-[11px] text-slate-600">{preview?'Test details only. ':'Verify supplier details independently before transferring funds. '}Optional, for this page session and Excel only; not stored in payment history. Refreshing clears entries.</p>
  </fieldset>;
}

async function confirmedList(search:string, active:()=>boolean){
  const items=new Map<number,Confirmed>();let capped=false;
  for(let start=0;start<MAX_CONFIRMED;start+=PAGE_LIMIT){
    if(!active())return {items:[],capped:false};
    const res=await ItineraryService.getConfirmedItineraries({start,length:PAGE_LIMIT,search:search||undefined});
    if(!Array.isArray(res?.data))throw Error('Unexpected confirmed itinerary list response.');
    for(const raw of res.data){const c=readConfirmed(raw);if(c)items.set(c.id,c);}
    const count=Number(res.recordsFiltered);
    if(res.data.length<PAGE_LIMIT||(Number.isFinite(count)&&start+res.data.length>=count))return {items:[...items.values()],capped:false};
    if(start+PAGE_LIMIT>=MAX_CONFIRMED)capped=true;
  }
  return {items:[...items.values()],capped};
}
async function ledger(){await loadHotelAutoReport();return readFinance(await api('/accounts-ledger?componentType=hotel',{method:'GET',auth:true,cache:'no-store',redirectOnForbidden:false}));}
async function details(c:Confirmed,auditOriginal=false){
 const data=await api(`itineraries/confirmed/${c.id}`,{method:'GET',auth:true,cache:'no-store',redirectOnForbidden:false});
 const confirmed=await resolveHotelFinanceIdentities(c,readStays(data,c));
 const incomplete=confirmed.some(s=>/name missing/i.test(s.name)||s.quoted===null||s.quoted<=0);
 if(!auditOriginal&&!incomplete)return confirmed;
 // Failure of the original source must not erase confirmed hotel details.
 try{
  const old=await api(`itineraries/hotel_details/${encodeURIComponent(c.quote)}`,{method:'GET',auth:true,cache:'no-store',redirectOnForbidden:false});
  return enrichConfirmedStaysFromOriginal(confirmed,old,c);
 }catch(e){console.warn('[DVI_HOTEL_CONSISTENCY_V13] Original hotel comparison unavailable',e);return confirmed;}
}
async function options(){const r=await api('/accounts-ledger/options?componentType=hotel',{method:'GET',auth:true,redirectOnForbidden:false});if(!Array.isArray(r?.hotels))return new Map<number,string>();return new Map<number,string>(r.hotels.map((h:Raw)=>[id(h.id),str(h.label)] as [number,string]).filter(([i,n]:[number,string])=>i>0&&!!n));}
function Summary({rows}:{rows:HotelFinance[]}){const t=totals(rows);return <div className="grid grid-cols-3 gap-2">{[['Total Purchase',t.purchase,'bg-violet-50 text-violet-800'],['Paid',t.paid,'bg-emerald-50 text-emerald-800'],['Outstanding',t.balance,'bg-rose-50 text-rose-800']].map(([l,p,c])=><div key={String(l)} className={`rounded-lg p-3 ${c}`}><div className="text-xs">{l}</div><strong className="break-words">{money(Number(p))}</strong></div>)}</div>}

function AccountsHotelItineraryPaymentsLive(){
 // DVI_HOTEL_DATEWISE_V14: date-wise payment eligibility; paid history and amounts stay untouched.
 const today=hotelLocalToday();
 const navigate=useNavigate();const [params]=useSearchParams();
 const [booking,setBooking]=useState(params.get('quoteId')||'');const [query,setQuery]=useState(booking);const [hotel,setHotel]=useState('all');const [filter,setFilter]=useState('all');
 const [checkIn,setCheckIn]=useState('');const [checkOut,setCheckOut]=useState('');const [locationFilter,setLocationFilter]=useState('all');
 const [metadata,setMetadata]=useState<{source:Confirmed[]; byId:Record<number,{stays?:Stay[]; error?:string}>}>({source:[],byId:{}});
 const [confirmed,setConfirmed]=useState<Confirmed[]>([]);const [finance,setFinance]=useState<HotelFinance[]>([]);const [names,setNames]=useState(new Map<number,string>());const [modes,setModes]=useState<PaymentModeOption[]>([]);
 const [selectedKey,setSelectedKey]=useState('');const [stays,setStays]=useState<Stay[]>([]);const [detailBusy,setDetailBusy]=useState(false);const [detailError,setDetailError]=useState('');const [detailReady,setDetailReady]=useState(false);const [verifiedId,setVerifiedId]=useState(0);const [detailLoadedKey,setDetailLoadedKey]=useState('');
 const [busy,setBusy]=useState(true);const [error,setError]=useState('');const [notice,setNotice]=useState('');const [modeError,setModeError]=useState('');const [capped,setCapped]=useState(false);const [reload,setReload]=useState(0);const [detailReload,setDetailReload]=useState(0);const [page,setPage]=useState(1);const [size,setSize]=useState(10);
 const [guestPopup,setGuestPopup]=useState<{c:Confirmed;rooms:string}|null>(null);
 const [guestData,setGuestData]=useState<GuestCounts|null>(null);const [guestError,setGuestError]=useState('');const [guestBusy,setGuestBusy]=useState(false);
 useEffect(()=>{if(!guestPopup)return;let live=true;setGuestData(null);setGuestError('');setGuestBusy(true);const c=guestPopup.c;api(`itineraries/details/${encodeURIComponent(c.quote)}`,{method:'GET',auth:true,cache:'no-store',redirectOnForbidden:false}).then(v=>{if(live)setGuestData(readGuestCounts(v,c));}).catch(e=>{if(live)setGuestError(errText(e));}).finally(()=>{if(live)setGuestBusy(false);});const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setGuestPopup(null);};window.addEventListener('keydown',escape);return()=>{live=false;window.removeEventListener('keydown',escape);};},[guestPopup]);
 const [bankDrafts,setBankDrafts]=useState<HotelBankDrafts>({});
 const changeBankDraft=(hotelId:number,key:keyof HotelBankDraft,value:string)=>setBankDrafts(old=>updateHotelBankDraft(old,hotelId,key,value));
 const [bulkKeys,setBulkKeys]=useState<string[]>([]);const [bulkOpen,setBulkOpen]=useState(false);const [bulkError,setBulkError]=useState('');
 // DVI_HOTEL_VIEW_PAY_DIRECT_V15: clicking View / Pay opens the existing manual-payment form directly.
 const [payFromAction,setPayFromAction]=useState('');
 const [manualPayOpen,setManualPayOpen]=useState(false);
 const [payKey,setPayKey]=useState('');const [amount,setAmount]=useState('');const [processor,setProcessor]=useState('');const [mode,setMode]=useState('');const [reference,setReference]=useState('');const [receipt,setReceipt]=useState<File|null>(null);const [receiptKey,setReceiptKey]=useState(0);const [saving,setSaving]=useState(false);const [syncing]=useState(false);const [syncResult,setSyncResult]=useState('');const [blocked,setBlocked]=useState(false);const [exporting,setExporting]=useState(false);const [payError,setPayError]=useState('');const lock=useRef(false);
 const resetBulk=()=>{setBulkKeys([]);setBulkOpen(false);setBulkError('');};
 const resetPay=()=>{setPayFromAction('');setManualPayOpen(false);setPayKey('');setAmount('');setProcessor('');setMode('');setReference('');setReceipt(null);setReceiptKey(x=>x+1);setPayError('');};
 useEffect(()=>{if(saving||syncing)return;const timer=window.setTimeout(()=>{if(query!==booking.trim()){resetBulk();resetPay();setSelectedKey('');setQuery(booking.trim());setPage(1);}},400);return()=>window.clearTimeout(timer);},[booking,query,saving,syncing]);
 useEffect(()=>{let live=true;setBusy(true);setError('');setBlocked(true);Promise.allSettled([confirmedList(query,()=>live),ledger()]).then(async ([c,f])=>{if(!live)return;const initialConfirmed=c.status==='fulfilled'?c.value.items:[];if(c.status==='fulfilled'&&f.status==='fulfilled'&&query&&f.value.some(r=>norm(r.quote)===norm(query)&&!initialConfirmed.some(x=>belongs(r,x)))){try{const all=await confirmedList('',()=>live);if(live)c={status:'fulfilled',value:{items:[...new Map([...initialConfirmed,...all.items].map(x=>[x.id,x])).values()],capped:all.capped}};}catch{/* Exact search results remain visible. */}}if(!live)return;setConfirmed(c.status==='fulfilled'?c.value.items:[]);setCapped(c.status==='fulfilled'&&c.value.capped);setFinance(f.status==='fulfilled'?f.value:[]);const errors=[c.status==='rejected'?'Confirmed itineraries: '+errText(c.reason):'',f.status==='rejected'?'Hotel finance: '+errText(f.reason):''].filter(Boolean);setError(errors.join(' | '));setBlocked(errors.length>0);}).finally(()=>{if(live)setBusy(false);});return()=>{live=false;};},[query,reload]);
 useEffect(()=>{let live=true;options().then(n=>{if(live)setNames(n);}).catch(()=>{});setModeError('');fetchPaymentModes().then(m=>{if(live){if(!Array.isArray(m)||!m.length){setModes([]);setModeError('No payment methods available.');}else setModes(m);}}).catch(e=>{if(live){setModes([]);setModeError('Payment methods: '+errText(e));}});return()=>{live=false;};},[reload]);
 // Load persisted confirmed hotel details independently of finance, at most three concurrent requests.
 useEffect(()=>{let live=true;setMetadata({source:confirmed,byId:{}});let cursor=0;
   const worker=async()=>{while(live&&cursor<confirmed.length){const c=confirmed[cursor++];let entry:{stays?:Stay[];error?:string};try{entry={stays:await details(c)};}catch(e){entry={error:errText(e)};}if(live)setMetadata(old=>old.source===confirmed?{source:confirmed,byId:{...old.byId,[c.id]:entry}}:old);}};
   void Promise.all(Array.from({length:Math.min(3,confirmed.length)},worker));return()=>{live=false;};
 },[confirmed]);
 const entries=useMemo(()=>confirmed.map(c=>{const rows=finance.filter(r=>belongs(r,c));const meta=metadata.source===confirmed?metadata.byId[c.id]:undefined;return {c,rows,meta,display:summarizeStays(meta?.stays||[],names),overall:itineraryPaymentStatus(rows,meta?.stays,!!meta?.error)};}),[confirmed,finance,metadata,names]);
 const metadataPending=entries.filter(e=>!e.meta).length;const metadataFailed=entries.filter(e=>!!e.meta?.error).length;
 const hotelRows=useMemo(()=>entries.flatMap(e=>individualStayRows(e.c,e.rows,e.meta?.stays,names,!!e.meta?.error)),[entries,names]);
 const hotelChoices=useMemo(()=>Array.from(new Map(hotelRows.filter(s=>s.hotelKey).map(s=>[s.hotelKey,s.name])).entries()).sort((a,b)=>a[1].localeCompare(b[1])),[hotelRows]);
 const locationChoices=useMemo(()=>Array.from(new Map(entries.flatMap(e=>e.display).filter(s=>s.location).map(s=>[norm(s.location),s.location])).entries()).sort((a,b)=>a[1].localeCompare(b[1])),[entries]);
 const filtered=useMemo(()=>hotelRows.filter(({c,rows,stays,display,overall,hotelKey})=>(!query||norm(c.quote)===norm(query)||entries.some(e=>e.c.id===c.id&&e.rows.some(r=>norm(r.quote)===norm(query))))&&(hotel==='all'||hotelKey===hotel)&&matchesStayFilters(display,{checkIn,checkOut,location:locationFilter,hotel:'all'})&&(filter==='all'||norm(hotelPaymentDateStatus(stays,rows,overall,today))===filter)),[hotelRows,entries,query,hotel,filter,checkIn,checkOut,locationFilter,today]);
 const updateFilter=(change:()=>void)=>{resetBulk();resetPay();setSelectedKey('');setPage(1);change();};
 const posted=filtered.filter(e=>e.rows.every(r=>r.valid)).flatMap(e=>e.rows);const invalidGroups=filtered.filter(e=>e.rows.some(r=>!r.valid)).length;const t=totals(posted);const unposted=filtered.filter(e=>!e.rows.length).length;const unmatched=finance.filter(r=>!confirmed.some(c=>belongs(r,c))).length;const pages=Math.max(1,Math.ceil(filtered.length/size));const current=Math.min(page,pages);const visible=filtered.slice((current-1)*size,current*size);
 const selected=filtered.find(e=>e.key===selectedKey);const selectedC=selected?.c;const selectedId=selectedC?.id||0;const selectedRows=selected?.rows||[];
 useEffect(()=>{let live=true;setStays([]);setDetailLoadedKey('');setDetailReady(false);setVerifiedId(0);setDetailError('');if(!selectedC){setDetailBusy(false);return;}setDetailBusy(true);details(selectedC,true).then(s=>{if(live){setStays(s);setDetailLoadedKey(selectedKey);setMetadata(old=>old.source===confirmed?{...old,byId:{...old.byId,[selectedC.id]:{stays:s}}}:old);setDetailReady(true);setVerifiedId(selectedC.id);}}).catch(e=>{if(live)setDetailError(errText(e));}).finally(()=>{if(live)setDetailBusy(false);});return()=>{live=false;};},[selectedKey,selectedC?.id,selectedC?.planId,detailReload]);
 useEffect(()=>{setSyncResult('');},[selectedKey]);
 useEffect(()=>{if(!selectedKey)return;const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!saving&&!syncing){resetPay();setSelectedKey('');}};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[selectedKey,saving,syncing]);
 const verified=detailReady&&verifiedId===selectedId&&!detailBusy;const freshSelected=verified&&selected?individualStayRows(selected.c,finance.filter(r=>belongs(r,selected.c)),stays,names).find(e=>e.key===selected.key):undefined;const actualStays=freshSelected?.stays||[];const groups=hotelGroups(selectedRows,actualStays);const payGroup=groups.find(g=>g.key===payKey);const pending=busy||saving||syncing||blocked||booking.trim()!==query;
 const modalWindow=hotelStayDateWindow(actualStays,today);const modalExpired=modalWindow==='expired';
 const manualPending=verified&&selected&&hotelStayMayBePaid(actualStays,today)?confirmedPendingPayment(actualStays,selected.rows):null;
 const hotelName=(i:number)=>names.get(i)||`Hotel #${i||'unverified'}`;
 const groupName=(g:typeof groups[number])=>g.meta.find(s=>s.name&&!/name missing/i.test(s.name))?.name||hotelName(g.hotelId);
 const missing=actualStays.filter(s=>!selectedRows.some(r=>matchedStay(r,actualStays)===s));
 const submitManual=async(e:FormEvent)=>{e.preventDefault();if(!hotelStayMayBePaid(actualStays,hotelLocalToday())||!manualPending||!manualPayOpen||!selectedC||pending||lock.current||!processor.trim()||!reference.trim()||!modes.some(m=>m.id===Number(mode)))return;
   const n=paise(amount);if(n===null||n<=0||n>manualPending.balance){setPayError('Enter an amount within the outstanding balance.');return;}
   const c=selectedC,ids=[...manualPending.ids],expected=manualPending.balance;
   if(!window.confirm('Confirm this transfer has ALREADY been completed for the selected confirmed hotel stay(s). No bank transfer will be initiated.'))return;
   lock.current=true;setSaving(true);setPayError('');let sent=false;
   try{
     const [latest,actual]=await Promise.all([ledger(),details(c,true)]);
     if(!hotelStayMayBePaid(actual,hotelLocalToday()))throw Error('Check-out has passed or dates are unavailable. This stay is view-only.');
     const freshItem=individualStayRows(c,latest.filter(r=>belongs(r,c)),actual,names).find(x=>x.key===selectedKey);
     const fresh=freshItem?confirmedPendingPayment(freshItem.stays,freshItem.rows):null;
     if(!fresh||fresh.balance!==expected||fresh.paid!==manualPending.paid||JSON.stringify(fresh.ids)!==JSON.stringify(ids))throw Error('Confirmed stay or finance status changed. Reload and review.');
     const fd=new FormData();fd.append('planId',String(c.planId));fd.append('confirmedId',String(c.id));fd.append('confirmedHotelIds',JSON.stringify(ids));fd.append('amount',(n/100).toFixed(2));fd.append('expectedBalance',(expected/100).toFixed(2));fd.append('modeOfPaymentId',mode);fd.append('processedBy',processor.trim());fd.append('utrNumber',reference.trim());fd.append('transferAlreadyCompleted','true');if(receipt)fd.append('paymentScreenshot',receipt);
     sent=true;await api('/accounts-manager/hotel-confirmed-manual-pay',{method:'POST',auth:true,body:fd,redirectOnForbidden:false});
     resetBulk();resetPay();setNotice('Completed payment recorded. Refreshing saved Accounts balances.');setReload(v=>v+1);setDetailReload(v=>v+1);
   }catch(e){setPayError(errText(e)+(sent?' Verify this transaction reference in Accounts before retrying.':' Reload and review current balances.'));}
   finally{lock.current=false;setSaving(false);}
 };
 const groupPayable=(g:typeof groups[number])=>verified&&hotelStayMayBePaid(actualStays,today)&&!actualStays.some(s=>s.sourceMismatch)&&!!selected&&(selected.hotelId>0||selected.rows.every(r=>r.hotelId===0&&r.payeeKey?.startsWith('code:')))&&!!freshSelected&&freshSelected.overall!=='Review'&&sameFinance(selectedRows,freshSelected.rows)&&g.hotelId===selected.hotelId&&g.complete&&(g.meta.some(s=>s.name&&!/name missing|^hotel$|^unknown/i.test(s.name))||names.has(g.hotelId))&&g.items.every(r=>r.headerId===g.items[0].headerId)&&totals(g.items).balance>0;
 const openPay=(g:typeof groups[number])=>{if(pending||!groupPayable(g))return;resetBulk();resetPay();setPayKey(g.key);setAmount((totals(g.items).balance/100).toFixed(2));};
 // DVI_HOTEL_VIEW_PAY_DIRECT_V15: only display the form; NEVER record or submit a payment automatically.
 // Confirmed original/booking identity, current dates and amounts are checked again by
 // the existing submit handlers before any API request is sent by the user's click.
 useEffect(()=>{
  if(!payFromAction||payFromAction!==selectedKey||detailLoadedKey!==selectedKey||!verified||pending)return;
  if(!selected||!hotelStayMayBePaid(actualStays,today)||actualStays.some(s=>s.sourceMismatch)){
   setPayFromAction('');return;
  }
  const postedGroup=groups.find(g=>groupPayable(g));
  if(postedGroup){
   setPayKey(postedGroup.key);
   setAmount((totals(postedGroup.items).balance/100).toFixed(2));
  }else if(manualPending&&manualPending.balance>0&&groups.every(g=>!groupPayable(g))){
   setManualPayOpen(true);
   setAmount((manualPending.balance/100).toFixed(2));
  }
  setPayFromAction('');
 },[payFromAction,selectedKey,detailLoadedKey,verified,pending,today,finance,stays]);

 const refresh=()=>{resetBulk();resetPay();setNotice('');setSyncResult('');setReload(v=>v+1);setDetailReload(v=>v+1);};
 // DVI_HOTEL_FINANCE_RETRY_V1: invoke the existing booking search reconciliation only on explicit request.
 

 let allocations:ReturnType<typeof allocate>=[];if(payGroup&&/^\d+(?:\.\d{1,2})?$/.test(amount.trim())){try{allocations=allocate(payGroup.items,paise(amount)??0);}catch{/* form remains disabled */}}
 const submit=async(e:FormEvent)=>{e.preventDefault();if(!hotelStayMayBePaid(actualStays,hotelLocalToday())||!selectedC||!payGroup||!groupPayable(payGroup)||pending||lock.current||!allocations.length||!processor.trim()||!reference.trim()||!modes.some(m=>m.id===Number(mode)))return;const payment=paise(amount)!;const c=selectedC;const before=payGroup.items;if(!window.confirm(`Record ${money(payment)} for ${groupName(payGroup)} only? Confirm the transfer has already been completed. Allocation: ${allocations.map(a=>`${date(a.row.date)} ${money(a.amount)}`).join('; ')}.`))return;lock.current=true;setSaving(true);setPayError('');let sent=false;try{const [latest,actualStays]=await Promise.all([ledger(),details(c)]);if(!hotelStayMayBePaid(actualStays,hotelLocalToday()))throw Error('Hotel check-out is past or dates are unavailable; payment is disabled.');const freshItem=individualStayRows(c,latest.filter(r=>belongs(r,c)),actualStays,names).find(r=>r.key===selectedKey);const freshGroup=freshItem&&freshItem.overall!=='Review'?hotelGroups(freshItem.rows,freshItem.stays).find(g=>g.key===payGroup.key):undefined;if(!freshGroup?.complete||!sameFinance(before,freshGroup.items))throw Error('Hotel details or balances changed. Reload and review before recording payment.');const tasks=allocate(freshGroup.items,payment).map(a=>({componentType:'hotel' as const,accountsItineraryDetailsId:a.row.headerId,componentDetailId:a.row.id,amount:a.amount/100}));sent=true;await postHotelFinancePayment({payments:tasks,modeOfPaymentId:Number(mode),processedBy:processor.trim(),utrNumber:reference.trim(),paymentScreenshot:receipt||undefined});resetBulk();resetPay();setNotice('Payment recorded. Reloading actual Accounts balances.');setReload(v=>v+1);setDetailReload(v=>v+1);}catch(e){setBlocked(true);setPayError(errText(e)+(sent?' Verify the transaction reference in Accounts before retrying.':' Reload and review the latest records.'));}finally{lock.current=false;setSaving(false);}};
 // Bulk settlement only after one actual hotel ID is selected. Selection spans pages.
 const selectedHotelId=bulkSelectionHotel(hotel,bulkKeys,filtered);
 const bankPhoneHotelId=bulkOpen?selectedHotelId:(payGroup?.hotelId||0);
 useEffect(()=>{if(!bankPhoneHotelId)return;let live=true;const hotelId=bankPhoneHotelId;
   api(`/hotels/${hotelId}`,{method:'GET',auth:true,cache:'no-store',redirectOnForbidden:false}).then((raw:unknown)=>{
     const r=raw as Raw;if(!live||id(r?.hotel_id)!==hotelId||typeof r?.hotel_mobile!=='string'||!r.hotel_mobile.trim())return;
     const phone=r.hotel_mobile.trim();setBankDrafts(old=>old[hotelId]?.phone!==undefined?old:updateHotelBankDraft(old,hotelId,'phone',phone));
   }).catch(()=>{/* Master phone unavailable: leave manual entry available. */});return()=>{live=false;};
 },[bankPhoneHotelId]);
 const firstChosenPayee=filtered.find(e=>e.key===bulkKeys[0])?.rows[0]?.payeeKey;
 const bulkEligible=(e:typeof filtered[number])=>hotelStayMayBePaid(e.stays,today)&&!e.stays.some(s=>s.sourceMismatch)&&(e.hotelId>0||e.rows.every(r=>r.hotelId===0&&r.payeeKey?.startsWith('code:')))&&(!selectedHotelId||e.hotelId===selectedHotelId)&&(!firstChosenPayee||e.rows.every(r=>r.payeeKey===firstChosenPayee))&&(e.overall==='Pending'||e.overall==='Partial')&&e.rows.length>0&&e.rows.every(r=>r.valid&&belongs(r,e.c))&&hotelGroups(e.rows,e.stays).some(g=>g.hotelId===selectedHotelId&&g.complete&&g.items.every(r=>r.headerId===g.items[0].headerId));
 const chosen=filtered.filter(e=>bulkKeys.includes(e.key)&&bulkEligible(e));
 const chosenGroups=chosen.flatMap(e=>hotelGroups(e.rows,e.stays));
 let bulkTasks:ReturnType<typeof bulkHotelTasks>=[];try{if(chosen.length===bulkKeys.length&&chosen.length)bulkTasks=bulkHotelTasks(chosenGroups,selectedHotelId);}catch{/* selection limit or invalid finance */}
 const bulkTotal=bulkTasks.reduce((n,a)=>n+a.amount,0);
 const toggleBulk=(key:string)=>{const item=filtered.find(e=>e.key===key);if(pending||bulkOpen||!item||!bulkEligible(item))return;setBulkError('');setBulkKeys(old=>old.includes(key)?old.filter(k=>k!==key):[...old,key]);};
 const startBulk=()=>{if(pending||!bulkTasks.length||!modes.length)return;resetPay();setSelectedKey('');setBulkOpen(true);setBulkError('');};
 const submitBulk=async(e:FormEvent)=>{e.preventDefault();if(!bulkOpen||pending||lock.current||!bulkTasks.length||!processor.trim()||!reference.trim()||!modes.some(m=>m.id===Number(mode)))return;
  if(!window.confirm(`Record a completed transfer of ${money(bulkTotal)} for ${chosen.length} selected stay(s), to ${chosen[0].name} only?`))return;
  lock.current=true;setSaving(true);setBulkError('');let sent=false;
  try{const latest=await ledger();const freshGroups:typeof chosenGroups=[];
   for(const item of chosen){const actual=await details(item.c);if(!hotelStayMayBePaid(actual,hotelLocalToday()))throw Error('Hotel check-out is past or its dates are unavailable; remove it from bulk payment.');const freshItem=individualStayRows(item.c,latest.filter(r=>belongs(r,item.c)),actual,names).find(r=>r.key===item.key);const g=freshItem&&freshItem.overall!=='Review'?hotelGroups(freshItem.rows,freshItem.stays).find(g=>g.hotelId===selectedHotelId):undefined;if(!g?.complete||!sameFinance(item.rows,g.items))throw Error('A selected booking or hotel balance changed. Reload and review all selected records.');freshGroups.push(g);}
   const checked=bulkHotelTasks(freshGroups,selectedHotelId);if(checked.reduce((n,a)=>n+a.amount,0)!==bulkTotal)throw Error('Bulk balance changed.');
   sent=true;await postHotelFinancePayment({payments:checked.map(a=>({componentType:'hotel' as const,accountsItineraryDetailsId:a.row.headerId,componentDetailId:a.row.id,amount:a.amount/100})),modeOfPaymentId:Number(mode),processedBy:processor.trim(),utrNumber:reference.trim(),paymentScreenshot:receipt||undefined});
   resetBulk();resetPay();setNotice('Same-hotel payment recorded. Reloading actual Accounts balances.');setReload(v=>v+1);setDetailReload(v=>v+1);
  }catch(err){setBlocked(true);setBulkError(errText(err)+(sent?' Verify the transfer reference in Accounts before retrying.':' Reload and review the selected records.'));}finally{lock.current=false;setSaving(false);}};
 const exportExcel=async()=>{if(pending||exporting||!filtered.length)return;if(filtered.some(e=>hotelBankExportFields(bankDrafts,e.hotelId).some(Boolean))&&!window.confirm('This Excel file will include the entered hotel bank and contact details in full. Store and share it securely. Continue?'))return;setExporting(true);try{const X=await import('xlsx');const ws=X.utils.aoa_to_sheet([['Booking ID','Customer','Hotel Name','Check In','Check Out','Rooms','Account Number','IFSC Code','Phone Number','Purchase (INR)','Paid (INR)','Balance (INR)','Status'],...filtered.map(({c,rows,name,display,overall,hotelId})=>{const a=totals(rows),ok=rows.length>0&&rows.every(r=>r.valid);return [c.quote,c.customer,name,display.map(s=>s.checkIn).join(' / '),display.map(s=>s.checkOut).join(' / '),display.map(s=>s.rooms).join(' / '),...hotelBankExportFields(bankDrafts,hotelId),ok?a.purchase/100:'',ok?a.paid/100:'',ok?a.balance/100:'',overall];}),['TOTAL POSTED','','','','','','','','',t.purchase/100,t.paid/100,t.balance/100,'']]);ws['!cols']=[20,25,30,18,18,12,28,16,24,18,18,18,16].map(wch=>({wch}));const wb=X.utils.book_new();X.utils.book_append_sheet(wb,ws,'Hotel Payments');X.writeFile(wb,'Hotel-Itinerary-Payments.xlsx');}catch(e){setError(errText(e));}finally{setExporting(false);}};
 return <main className="min-h-screen bg-[#f7f7fc] p-4 text-slate-800 lg:p-6">
  <header className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-xl bg-violet-100 p-3 text-violet-700"><BedDouble size={26}/></div><div><h1 className="text-2xl font-extrabold">Hotel Payments</h1><p className="text-sm text-slate-500">Confirmed itineraries · hotel-wise balances and payment recording</p></div></div><div className="flex gap-2"><button className={button} disabled={saving||syncing} onClick={()=>navigate('/hotels')}><ArrowLeft size={16}/> Hotels</button><button className={button} disabled={pending||!filtered.length||exporting} onClick={()=>void exportExcel()}><Download size={16}/> {exporting?'Exporting…':'Download Excel'}</button></div></header>
  <HotelAutoStatus/>
  <section className={`${card} mb-4 grid grid-cols-1 items-end gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6`} aria-label="Hotel payment filters">
   <label className="min-w-0 text-xs font-semibold">Booking ID<input className={field} placeholder="Search exact booking ID" value={booking} disabled={saving||syncing} onChange={e=>setBooking(e.target.value)}/></label>
   <label className="min-w-0 text-xs font-semibold">Check In<input type="date" title="Stay check-in on or after this date" className={field} value={checkIn} max={checkOut||undefined} disabled={saving||syncing} onChange={e=>updateFilter(()=>setCheckIn(e.target.value))}/></label>
   <label className="min-w-0 text-xs font-semibold">Check Out<input type="date" title="Stay check-out on or before this date" className={field} value={checkOut} min={checkIn||undefined} disabled={saving||syncing} onChange={e=>updateFilter(()=>setCheckOut(e.target.value))}/></label>
   <label className="min-w-0 text-xs font-semibold">Location<select className={field} value={locationFilter} disabled={saving||syncing} onChange={e=>updateFilter(()=>setLocationFilter(e.target.value))}><option value="all">All Locations</option>{locationFilter!=='all'&&!locationChoices.some(([key])=>key===locationFilter)&&<option value={locationFilter}>Selected location (no loaded match)</option>}{locationChoices.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
   <label className="min-w-0 text-xs font-semibold">Hotel<select className={field} value={hotel} disabled={saving||syncing} onChange={e=>updateFilter(()=>setHotel(e.target.value))}><option value="all">All Hotels</option>{hotel!=='all'&&!hotelChoices.some(([key])=>key===hotel)&&<option value={hotel}>Selected hotel (no loaded match)</option>}{hotelChoices.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
   <label className="min-w-0 text-xs font-semibold">Status<select className={field} value={filter} disabled={saving||syncing} onChange={e=>updateFilter(()=>setFilter(e.target.value))}>{['all','Pending','Partial','Paid','Expired','Not posted','Review'].map(v=><option key={v} value={v==='all'?'all':norm(v)}>{v==='all'?'All Status':v}</option>)}</select></label>
  </section>
  {checkIn&&checkOut&&checkIn>checkOut&&<p role="alert" className="mb-3 text-sm text-rose-700">Check Out must be on or after Check In.</p>}
  {!busy&&metadataPending>0&&<p role="status" className="mb-3 text-xs text-slate-500">Loading confirmed hotel names, stay dates and rooms ({entries.length-metadataPending}/{entries.length}). Hotel and stay filters update as details arrive.</p>}
  {!busy&&metadataFailed>0&&<p role="alert" className="mb-3 text-xs text-amber-800">Hotel details unavailable for {metadataFailed} itinerary(s). Unknown stay details are not treated as matching filters. <button className="underline" disabled={saving||syncing} onClick={refresh}>Retry loading</button></p>}
  {(error||notice||modeError||blocked||capped||unposted>0||invalidGroups>0||(!query&&unmatched>0))&&<div className="mb-4 space-y-2 text-sm">{error&&<p role="alert" className="rounded-lg bg-rose-50 p-3 text-rose-800">{error}</p>}{modeError&&<p className="rounded-lg bg-amber-50 p-3">{modeError}</p>}{notice&&<p role="status" className="rounded-lg bg-violet-50 p-3">{notice}</p>}{capped&&<p className="rounded-lg bg-amber-50 p-3">Showing up to {MAX_CONFIRMED} confirmed itineraries. Search a booking to load its records; totals cover loaded itineraries only.</p>}{!query&&unmatched>0&&<p className="rounded-lg bg-amber-50 p-3">{unmatched} finance row(s) cannot be linked to a loaded confirmed itinerary by both plan IDs; excluded from payable totals until reviewed.</p>}{invalidGroups>0&&<p role="alert" className="rounded-lg bg-amber-50 p-3">{invalidGroups} hotel record(s) contain invalid finance amounts and are excluded from totals until reviewed.</p>}{unposted>0&&!blocked&&<p className="rounded-lg bg-amber-50 p-3">{unposted} hotel record(s) have no posted finance records. Open a hotel to inspect the confirmed stay. Totals include posted Accounts records only.</p>}{blocked&&!busy&&<button className={button} disabled={saving||syncing} onClick={refresh}><RefreshCw size={15}/> Reload records</button>}</div>}
  <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">{[{l:'Total Payable (posted)',v:money(t.purchase),I:Wallet,c:'bg-violet-50'},{l:'Total Paid',v:money(t.paid),I:CheckCircle2,c:'bg-emerald-50'},{l:'Outstanding',v:money(t.balance),I:Clock,c:'bg-rose-50'},{l:'Stay Today - Balance',v:money(posted.filter(r=>r.date===today).reduce((s,r)=>s+r.balance,0)),I:CalendarDays,c:'bg-sky-50'},{l:'Itineraries (Hotels)',v:String(new Set(filtered.map(e=>e.c.id)).size),I:Hotel,c:'bg-amber-50'}].map(({l,v,I,c})=><div key={l} className={`${card} ${c} flex items-center gap-3 p-3`}><I size={22} className="shrink-0 text-violet-700"/><div><p className="text-xs text-slate-600">{l}</p><strong className="break-words text-lg">{busy||blocked?'—':v}</strong></div></div>)}</section>
  {<section className={`${card} mb-3 p-3`}><div className="flex flex-wrap items-center justify-between gap-2"><div><strong>Bulk Payment{selectedHotelId>0?` — ${hotelName(selectedHotelId)}`:""}</strong><p className="text-xs text-slate-500">{chosen.length} stay(s) selected · {money(bulkTotal)} outstanding. {selectedHotelId>0?`${filtered.filter(bulkEligible).length} eligible stay(s).`:"Choose an eligible stay to select its hotel."}</p>{!filtered.some(bulkEligible)&&<p className="mt-1 text-xs text-amber-800">Bulk selection requires posted finance rows. Use View / Pay to record the first completed payment for an unpaid confirmed stay.</p>}</div><div className="flex gap-2"><button type="button" className={button} disabled={pending||bulkOpen} onClick={()=>setBulkKeys([])}>Clear</button><button type="button" className={primary} disabled={pending||bulkOpen||!bulkTasks.length||!modes.length} onClick={startBulk}>Pay selected ({chosen.length})</button></div></div>{bulkKeys.length>0&&!bulkTasks.length&&<p className="mt-2 text-xs text-amber-800">Selection must contain verified outstanding records (maximum 100 finance tasks).</p>}
  {bulkOpen&&<form className="mt-3 space-y-3 border-t pt-3" onSubmit={submitBulk}><div className="flex justify-between"><strong>Quick Pay — {chosen[0]?.name||'Selected hotel'}</strong><button type="button" className={button} disabled={saving} onClick={()=>{resetBulk();resetPay();}}>Close</button></div><div className="grid gap-2 sm:grid-cols-3"><div className="rounded bg-violet-50 p-3 font-bold">Total balance {money(bulkTotal)}</div><label className="text-xs">Processed By *<input required disabled={pending} className={field} value={processor} onChange={e=>setProcessor(e.target.value)}/></label><label className="text-xs">Payment Mode *<select required disabled={pending} className={field} value={mode} onChange={e=>setMode(e.target.value)}><option value="">Select mode</option>{modes.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label><label className="text-xs">Transaction Reference / UTR *<input required disabled={pending} className={field} value={reference} onChange={e=>setReference(e.target.value)}/></label><label className="text-xs">Receipt (optional, image up to 5 MB)<input type="file" accept="image/*" key={receiptKey} disabled={pending} onChange={e=>{const f=e.target.files?.[0];if(f&&(f.size>5*1024*1024||!f.type.startsWith('image/'))){setReceipt(null);setReceiptKey(v=>v+1);setBulkError('Select an image up to 5 MB.');}else{setReceipt(f||null);setBulkError('');}}}/></label></div><HotelBankFields hotelId={selectedHotelId} drafts={bankDrafts} onChange={changeBankDraft} disabled={pending}/><div className="text-xs">{chosen.map(r=><div key={r.key}>{r.c.quote} · {money(totals(r.rows).balance)}</div>)}</div>{bulkError&&<p role="alert" className="text-rose-800">{bulkError}</p>}<p className="text-xs text-slate-500">Records an already completed transfer, not a bank transfer. Only selected hotel balances will be settled.</p><button className={primary} disabled={pending||!bulkTasks.length||!processor.trim()||!reference.trim()||!mode}>{saving?'Recording…':`Record payment (${money(bulkTotal)})`}</button></form>}
  </section>}
  <div className="grid grid-cols-1 items-start gap-4">
   <section className={`${card} min-w-0 overflow-hidden`}>
    <div className="p-4"><h2 className="font-bold">Confirmed Itineraries – Hotel Payments</h2><p className="text-xs text-slate-500">{filtered.length} hotel stays · {new Set(filtered.map(e=>e.c.id)).size} confirmed itineraries</p></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[1060px] text-left text-xs"><thead className="bg-violet-50"><tr>{['Booking ID','Customer','Hotel Name','Check In','Check Out','Rooms','Purchase (INR)','Paid','Balance','Status','Action'].map(h=><th key={h} className="whitespace-nowrap px-2 py-3">{h}</th>)}</tr></thead>
     <tbody className="divide-y divide-slate-100">{busy?<tr><td colSpan={11} className="p-8 text-center">Loading confirmed itineraries and Accounts…</td></tr>:!visible.length?<tr><td colSpan={11} className="p-8 text-center">{error?'Unable to load records.':metadataPending?'Loading matching hotel stays…':'No confirmed hotel itinerary matches this filter.'}</td></tr>:visible.map((item)=>{const {c,rows,display,overall,key,name}=item;
      const a=totals(rows);const hasAmounts=rows.length>0&&!blocked&&rows.every(r=>r.valid);const forecast=!blocked?confirmedPendingPayment(item.stays,rows):null;const rowStatus=blocked?'Unavailable':hotelPaymentDateStatus(item.stays,rows,overall,today);const emptyLabel='Unavailable';
      const lines=(get:(s:typeof display[number])=>string)=><div className="space-y-1">{display.length?display.map(s=><div className="min-h-[20px] whitespace-nowrap leading-5" key={s.key}>{get(s)}</div>):<span className="text-slate-500">{emptyLabel}</span>}</div>;
      return <tr key={key} className={key===selectedKey?'bg-violet-100':'hover:bg-violet-50'}>
       <td className="p-2 align-top"><button type="button" disabled={saving||syncing||bulkOpen} className="inline-flex items-center gap-1 font-bold text-violet-700 underline-offset-2 hover:underline" aria-expanded={key===selectedKey} onClick={()=>{resetPay();setSelectedKey(key===selectedKey?'':key);}}>{c.quote}<ChevronRight size={14}/></button></td>
       <td className="p-2 align-top">{c.customer}</td><td className="p-2 align-top font-medium">{name}</td>
       <td className="whitespace-nowrap p-2 align-top">{lines(s=>date(s.checkIn))}</td><td className="whitespace-nowrap p-2 align-top">{lines(s=>date(s.checkOut))}</td><td className="p-2 align-top">{display.length?display.map(s=><button type="button" key={s.key} className="rounded px-2 py-1 font-semibold text-violet-700 underline decoration-dotted hover:bg-violet-50" aria-label={`View guest counts for ${c.quote}`} onClick={()=>{setGuestData(null);setGuestError('');setGuestBusy(true);setGuestPopup({c,rooms:s.rooms});}}>{s.rooms}</button>):'Unavailable'}</td>
       
       <td className="whitespace-nowrap p-2 align-top font-semibold">{forecast?money(forecast.purchase):hasAmounts?money(a.purchase):!blocked&&item.stays.length?confirmedHotelPriceText(item.stays):'—'}{!hasAmounts&&!blocked&&!forecast&&item.stays.length>0&&<div className="text-[10px] font-normal text-amber-700">{item.stays.some(s=>s.sourceMismatch)?"Original price/date mismatch — review":"Review finance"}</div>}</td>
       <td className="whitespace-nowrap p-2 align-top text-emerald-700">{forecast?money(forecast.paid):hasAmounts?money(a.paid):'—'}</td>
       <td className="whitespace-nowrap p-2 align-top font-semibold">{forecast?money(forecast.balance):hasAmounts?money(a.balance):'—'}</td>
       <td className="p-2 align-top"><span className={pill(rowStatus)}>{rowStatus}</span>{hotelStayDateWindow(item.stays,today)==='expired'&&<div className="mt-1 text-[10px] text-slate-600">Past check-out · View only</div>}{hasAmounts&&overall==='Review'&&<div className="mt-1 text-[10px] text-amber-700">Posted only · review</div>}</td>
       <td className="p-2 align-top">{(bulkEligible(item)?<label className="mb-1 flex cursor-pointer items-center gap-1 text-xs"><input type="checkbox" aria-label={`Select ${c.quote} ${name} ${display[0]?.checkIn||''}`} checked={bulkKeys.includes(key)} disabled={pending||bulkOpen} onChange={()=>toggleBulk(key)}/> Select</label>:<p className="mb-1 text-[11px] text-slate-500">{hotelStayDateWindow(item.stays,today)==='expired'?'Stay completed':!hotelStayMayBePaid(item.stays,today)?'Check stay dates':forecast?'Not paid':overall==='Not posted'?'Finance not posted':overall==='Paid'?'Fully paid':selectedHotelId&&item.hotelId!==selectedHotelId?'Different hotel':'Review required'}</p>)}<button type="button" disabled={saving||syncing||bulkOpen} className={button} aria-label={`${key===selectedKey?'Close':'View'} hotel payments for ${name} · ${c.quote}`} aria-expanded={key===selectedKey} onClick={()=>{
  const next=key===selectedKey?'':key;
  resetPay();setSelectedKey(next);
  const mayPay=hotelStayMayBePaid(item.stays,today)&&!item.stays.some(s=>s.sourceMismatch)&&((!!forecast&&forecast.balance>0)||(hasAmounts&&a.balance>0&&overall!=='Review'));
  if(next&&mayPay)setPayFromAction(key);
 }}>{key===selectedKey?'Close':hotelStayMayBePaid(item.stays,today)&&!item.stays.some(s=>s.sourceMismatch)&&((!!forecast&&forecast.balance>0)||(hasAmounts&&a.balance>0&&overall!=='Review'))?'View / Pay':'View'}</button></td>
      </tr>;})}</tbody></table></div><div className="flex flex-wrap items-center justify-between gap-2 border-t p-3 text-xs"><span>{filtered.length?`Showing ${(current-1)*size+1}–${Math.min(current*size,filtered.length)} of ${filtered.length}`:'Showing 0 records'}</span><div className="flex items-center gap-2"><select className="rounded border p-1" aria-label="Rows per page" value={size} onChange={e=>{setSize(Number(e.target.value));setPage(1);}}>{[10,25,50].map(s=><option key={s} value={s}>{s} per page</option>)}</select><button className={button} disabled={current<=1} onClick={()=>setPage(current-1)}>‹</button><span>{current}/{pages}</span><button className={button} disabled={current>=pages} onClick={()=>setPage(current+1)}>›</button></div></div></section>
   {selected&&<div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/30 p-3 sm:p-6" onClick={()=>{if(!saving&&!syncing){resetPay();setSelectedKey('');}}}><section role="dialog" aria-modal="true" aria-label="Hotel payment details" className={`${card} w-full max-w-5xl max-h-[90vh] overflow-y-auto space-y-4 p-4`} onClick={e=>e.stopPropagation()}><header className="flex items-start justify-between gap-2 rounded-lg bg-violet-50 p-3"><div><h2 className="font-bold text-violet-800">{selected.c.quote} – {selected.name}</h2><p className="text-xs">{selected.c.customer} · {date(selected.c.start)} – {date(selected.c.end)}</p></div><button className={button} disabled={saving||syncing} onClick={()=>{resetPay();setSelectedKey('');}}><X size={14}/> Close</button></header>
    {detailBusy&&<p className="p-3 text-sm">Loading persisted confirmed hotel details…</p>}{detailError&&<p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm">{detailError}</p>}
    <div className="space-y-3">
     
     {groups.map(g=>{const a=totals(g.items),s=status(g.items);const stayDates=[...new Set(g.items.map(r=>r.date).filter(Boolean))].sort();const contiguous=stayDates.length>0&&stayDates.every((d,i)=>i===0||d===nextDay(stayDates[i-1]));return <article key={g.key} className="rounded-xl border p-4"><header className="flex flex-wrap items-start justify-between gap-2"><div><strong className="break-words">{groupName(g)}</strong><p className="text-xs text-slate-500">{[...new Set(g.meta.map(x=>x.destination).filter(Boolean))].join(', ')}</p><p className="mt-1 text-xs">{[...new Set(g.meta.map(x=>x.room).filter(Boolean))].join(', ')||'Room type unavailable'} · {contiguous?`${date(stayDates[0])} – ${date(nextDay(stayDates[stayDates.length-1]))} (${stayDates.length}N, posted dates)`:stayDates.map(date).join(', ')||'Stay dates unavailable'}</p></div><span className={pill(s)}>{s}</span></header><div className="my-3 grid grid-cols-1 gap-2 sm:grid-cols-3">{[['Purchase',a.purchase],['Paid',a.paid],['Balance',a.balance]].map(([label,value])=><div key={String(label)} className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><strong className="break-words">{g.items.every(r=>r.valid)?money(Number(value)):'Unavailable'}</strong></div>)}</div><div className="flex flex-wrap items-center gap-2">{hotelStayMayBePaid(actualStays,today)&&<button type="button" className={primary} disabled={pending||!groupPayable(g)||!modes.length} onClick={()=>openPay(g)}>Pay Hotel</button>}{verified&&!g.complete&&<span className="text-xs text-amber-800">Review matching stay</span>}</div>{g.items.some(r=>r.transactions.length>0)&&<section className="mt-3 space-y-2 text-sm" aria-label="Hotel payment history"><h3 className="font-semibold text-violet-700">Payment history</h3><div className="space-y-2">{g.items.flatMap(r=>r.transactions.map((tx,i)=>{const recorded=hotelPaymentRecordedAt(tx.transaction_date);const paid=paise(tx.transaction_amount);return <div key={`${r.id}-${i}`} className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs sm:grid-cols-3"><div><p className="text-slate-500">Paid Date</p><strong>{recorded.date}</strong></div><div><p className="text-slate-500">Paid Time</p><strong>{recorded.time}</strong></div><div><p className="text-slate-500">Paid By (Processed By)</p><strong className="break-words">{str(tx.transaction_done_by)||'Unavailable'}</strong></div><div><p className="text-slate-500">Amount Paid</p><strong className="text-emerald-700">{paid===null?'Unavailable':money(paid)}</strong></div><div className="col-span-1 sm:col-span-2"><p className="text-slate-500">Transaction Reference / UTR</p><strong className="break-words">{str(tx.transaction_utr_no)||'No reference'}</strong></div></div>;}))}</div></section>}</article>;})}
     {summarizeStays(missing,names).map(d=><article key={d.key} className="rounded-xl border border-amber-200 bg-amber-50/40 p-4"><header className="flex flex-wrap items-start justify-between gap-2"><div><strong className="break-words">{d.name}</strong><p className="text-xs">{d.location} · {date(d.checkIn)} – {date(d.checkOut)} · Rooms: {d.rooms}</p></div><span className={pill(manualPending?'Pending':d.members.some(s=>s.sourceMismatch)?'Review':'Not posted')}>{manualPending?'Pending':d.members.some(s=>s.sourceMismatch)?'Review':'Not posted'}</span></header><div className="mt-3 space-y-1 text-sm">{d.members.map((s,i)=><div key={`${s.confirmedHotelId}-${i}`} className="flex flex-wrap justify-between gap-2 border-t border-amber-100 pt-1"><span>{s.day||date(s.date)} · {s.room||'Room type unavailable'}</span><span className="text-slate-600">{s.sourceMismatch?`Price/date mismatch: confirmed ${s.quoted===null?'unavailable':money(s.quoted)}; original itinerary ${s.originalDisplayPrice===null||s.originalDisplayPrice===undefined?'unavailable':money(s.originalDisplayPrice)}${s.originalStayDate?' · original date '+s.originalStayDate:''}. Verify before payment.`:s.quoted!==null&&s.quoted>0?`Confirmed price ${money(s.quoted)} · ${manualPending?'Pending, not yet recorded':'Accounts finance not posted'}`:s.originalDisplayPrice!==null&&s.originalDisplayPrice!==undefined?`Confirmed purchase missing. Original itinerary reference: ${money(s.originalDisplayPrice)} — review required`:'Confirmed purchase unavailable — review required'}</span></div>)}</div></article>)}
     {hotelStayMayBePaid(actualStays,today)&&manualPending&&manualPending.balance>0&&groups.every(g=>!groupPayable(g))&&!manualPayOpen&&<button type="button" className={primary} disabled={pending||!modes.length} onClick={()=>{resetBulk();resetPay();setManualPayOpen(true);setAmount((manualPending.balance/100).toFixed(2));}}>Pay Hotel — Record completed transfer</button>}
      {hotelStayMayBePaid(actualStays,today)&&manualPending&&manualPending.balance>0&&groups.every(g=>!groupPayable(g))&&manualPayOpen&&<form className="space-y-3 rounded-lg border border-violet-200 p-3" onSubmit={submitManual}><h3 className="font-bold">Manual Hotel Payment</h3><p className="text-xs text-slate-600">Confirmed itinerary price: {money(manualPending.purchase)} · Paid: {money(manualPending.paid)} · Balance: {money(manualPending.balance)}. This records a completed transfer, not an online bank transfer.</p><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Payment Amount *<input type="number" step="0.01" min="0.01" max={manualPending.balance/100} className={field} value={amount} onChange={e=>setAmount(e.target.value)} disabled={pending} required/></label><label className="text-xs font-semibold">Processed By *<input className={field} value={processor} onChange={e=>setProcessor(e.target.value)} disabled={pending} required/></label><label className="text-xs font-semibold">Payment Mode *<select className={field} value={mode} onChange={e=>setMode(e.target.value)} disabled={pending} required><option value="">Select mode</option>{modes.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label><label className="text-xs font-semibold">Transaction Reference / UTR *<input className={field} value={reference} onChange={e=>setReference(e.target.value)} disabled={pending} required/></label></div><label className="text-xs font-semibold">Receipt (optional, image up to 5 MB)<input type="file" accept="image/*" key={receiptKey} disabled={pending} onChange={e=>{const f=e.target.files?.[0];if(f&&(f.size>5*1024*1024||!f.type.startsWith('image/'))){setReceipt(null);setReceiptKey(x=>x+1);setPayError('Choose an image smaller than 5 MB.');}else{setReceipt(f||null);setPayError('');}}}/></label>{payError&&<p role="alert" className="text-rose-800">{payError}</p>}<p className="text-xs text-amber-800">Verify the actual hotel payee and the completed transfer before recording. A confirmed itinerary price is not proof of a supplier invoice.</p><div className="flex gap-2"><button type="submit" className={primary} disabled={pending||!processor.trim()||!reference.trim()||!mode||!paise(amount)}>{saving?'Recording…':'Record Payment'}</button><button type="button" className={button} disabled={saving} onClick={resetPay}>Cancel</button></div></form>}
      {missing.filter(s=>s.cancelled).map((s,i)=><p key={`cancelled-${s.confirmedHotelId}-${i}`} className="text-xs text-slate-500">{s.name} · {s.day} · Cancelled — not payable</p>)}
     {!groups.length&&!missing.length&&!detailBusy&&<p className="p-4 text-center text-sm">No verified stays or finance records for the selected hotel.</p>}
    </div>
    {modalExpired&&<p role="status" className="rounded-lg bg-slate-50 border p-3 text-sm text-slate-700">This hotel stay has already checked out. Historical payment and balance details remain visible, but this page will not request a new payment for an expired stay.</p>}{selectedRows.every(r=>r.valid)&&selectedRows.length>0&&<Summary rows={selectedRows}/>}{selectedRows.some(r=>!r.valid)&&<p role="alert" className="text-xs text-amber-800">Invalid finance records excluded from totals. Review before paying.</p>}<p className="text-sm">Selected hotel status: <span className={pill(hotelPaymentDateStatus(actualStays,selectedRows,missing.some(s=>!s.cancelled)?'Review':status(selectedRows),today))}>{hotelPaymentDateStatus(actualStays,selectedRows,missing.some(s=>!s.cancelled)?'Review':status(selectedRows),today)}</span>{missing.some(s=>!s.cancelled)&&<span className="ml-2 text-amber-800">{modalExpired?'Past check-out: historical balance retained for review only.':manualPending?'Awaiting first recorded payment; saved-price balance is provisional.':actualStays.some(s=>s.sourceMismatch)?'Confirmed and original hotel details differ; reconcile before recording a payment.':'Finance record missing — review before payment.'}</span>}</p>
    {verified&&missing.some(s=>!s.cancelled)&&!manualPayOpen&&!payGroup&&<div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{modalExpired?'Hotel check-out has passed. This stay is view-only. Any historical outstanding amount has not been waived.':manualPending?'No Accounts finance row has been posted yet. Use Record completed transfer above only after verifying the payment; the local test backend will save the payable and transaction together.':actualStays.some(s=>s.sourceMismatch)?'Original itinerary and confirmed hotel name/date/price do not match. Payment is disabled for this stay until the records are reconciled.':'A positive, uniquely identified confirmed hotel purchase is missing or unverified. Payment is disabled until the saved hotel record is corrected.'} <div className="mt-2 flex flex-wrap gap-2"><button type="button" className={button} disabled={pending} onClick={refresh}>Reload records</button></div></div>}
    
    {syncResult&&<p role="status" className="rounded-lg border bg-slate-50 p-3 text-sm break-words">{syncResult}</p>}
    {hotelStayMayBePaid(actualStays,today)&&payGroup&&<form className="space-y-3 rounded-lg border border-violet-200 p-3" onSubmit={submit}><header className="flex justify-between gap-2"><div><h3 className="font-bold">Quick Pay — Selected Hotel</h3><p className="text-xs text-slate-600">{groupName(payGroup)} · Balance {money(totals(payGroup.items).balance)}</p></div><button type="button" className={button} disabled={saving} onClick={resetPay}>Close</button></header><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Payment Amount *<input type="number" step="0.01" min="0.01" max={totals(payGroup.items).balance/100} className={field} value={amount} onChange={e=>setAmount(e.target.value)} disabled={pending} required/></label><label className="text-xs font-semibold">Processed By *<input className={field} value={processor} onChange={e=>setProcessor(e.target.value)} disabled={pending} required/></label><label className="text-xs font-semibold">Payment Mode *<select className={field} value={mode} onChange={e=>setMode(e.target.value)} disabled={pending} required><option value="">Select mode</option>{modes.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label><label className="text-xs font-semibold">Transaction Reference / UTR *<input className={field} value={reference} onChange={e=>setReference(e.target.value)} disabled={pending} required/></label></div><HotelBankFields hotelId={payGroup.hotelId} drafts={bankDrafts} onChange={changeBankDraft} disabled={pending}/><label className="block text-xs font-semibold">Receipt (optional, image up to 5 MB)<input key={receiptKey} className="mt-1 block w-full rounded border border-dashed p-2" type="file" accept="image/*" disabled={pending} onChange={e=>{const f=e.target.files?.[0];if(f&&(f.size>5*1024*1024||!f.type.startsWith('image/'))){setPayError('Select an image up to 5 MB.');setReceipt(null);setReceiptKey(v=>v+1);}else{setReceipt(f||null);setPayError('');}}}/></label>{allocations.length>0&&<div className="rounded bg-violet-50 p-2 text-xs"><strong>Allocation to this hotel only (oldest first)</strong>{allocations.map(a=><div key={a.row.id}>{date(a.row.date)} · record #{a.row.id} · {money(a.amount)}</div>)}</div>}{payError&&<p role="alert" className="rounded bg-rose-50 p-2 text-sm text-rose-800">{payError}</p>}<p className="text-xs text-slate-500">Records an already completed transfer; does not initiate a bank payment.</p><button type="submit" className={`${primary} w-full`} disabled={pending||!groupPayable(payGroup)||!allocations.length||!processor.trim()||!reference.trim()||!mode}>{saving?'Recording…':`Record Payment (${money(paise(amount)??0)})`}</button></form>}
   </section></div>}
  </div>
  {guestPopup&&<div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/30 p-4" onClick={()=>setGuestPopup(null)}><section role="dialog" aria-modal="true" aria-label="Guest details" className="w-full max-w-sm rounded-2xl border border-violet-200 bg-white p-5 shadow-xl" onClick={e=>e.stopPropagation()}><header className="mb-3 flex items-center justify-between gap-2"><div><h2 className="font-bold text-slate-900">Guest Details</h2><p className="text-xs text-slate-500">{guestPopup.c.quote} · Rooms: {guestPopup.rooms}</p></div><button autoFocus type="button" className={button} aria-label="Close guest details" onClick={()=>setGuestPopup(null)}><X size={16}/></button></header><p className="mb-3 text-xs text-slate-500">Confirmed itinerary guest counts</p>{guestBusy?<p role="status" className="py-3 text-sm">Loading guest counts…</p>:guestError?<p role="alert" className="rounded bg-amber-50 p-3 text-sm text-amber-800">{guestError}</p>:guestData&&<dl className="grid grid-cols-2 gap-2">{([['Adults',guestData.adults],['Child',guestData.children],['Child with Bed',guestData.childWithBed],['Child Without Bed',guestData.childWithoutBed]] as const).map(([label,value])=><div className="rounded-lg bg-violet-50 p-3" key={label}><dt className="text-xs text-slate-600">{label}</dt><dd className="mt-1 text-lg font-bold text-violet-800">{value??'Unavailable'}</dd></div>)}</dl>}<p className="mt-3 text-center text-xs text-slate-500">Click outside to close.</p></section></div>}
 </main>;
}

// DVI_HOTEL_LOCAL_PREVIEW_ONLY — never enabled in a production build.
const LocalHotelPreview = import.meta.env.DEV ? lazy(()=>import('./AccountsHotelItineraryPaymentsPreview')) : null;

// DVI_HOTEL_CONFIRMED_PRICE_V6: itinerary price is informational, never a supplier payable.
function confirmedHotelPrice(stays: readonly Stay[]): number | null {
  const active=stays.filter(s=>!s.cancelled);
  if(!active.length)return null;
  const seen=new Set<number>();let total=0;
  for(const s of active){
    if(!Number.isSafeInteger(s.confirmedHotelId)||s.confirmedHotelId<=0||seen.has(s.confirmedHotelId)||s.quoted===null||!Number.isSafeInteger(s.quoted)||s.quoted<=0||s.sourceMismatch)return null;
    seen.add(s.confirmedHotelId);total+=s.quoted;
    if(!Number.isSafeInteger(total))return null;
  }
  return total;
}
function confirmedHotelPriceText(stays: readonly Stay[]): string {
  const price=confirmedHotelPrice(stays);return price===null?'Unavailable':money(price);
}


// DVI_HOTEL_AUTO_STATUS_NO_MANUAL_V1
// Keep the actual posted ledger authoritative; surface the result of auto-sync, not a synthetic payable.
// DVI_HOTEL_MANUAL_PAYMENT_V12: confirmed amount is read-only until a completed manual transfer is recorded.
// DVI_HOTEL_CONSISTENCY_V13: original selection used only for exact hotel naming and mismatch detection.
type HotelAutoReport = {savedPriceTest:boolean;mode:string; eligibleRows:number; created:number; historicalApproved:boolean; reasons:Record<string,number>; failures:number};
let hotelPageAutoReport: HotelAutoReport|null=null;
let hotelPageAutoError='';
let hotelPageAutoInFlight:Promise<void>|undefined;
let hotelPageAutoAt=0;
const hotelPageAutoListeners=new Set<()=>void>();
function publishHotelAuto(){hotelPageAutoListeners.forEach(fn=>fn());}
async function loadHotelAutoReport():Promise<void>{
  if(hotelPageAutoInFlight)return hotelPageAutoInFlight;
  if(Date.now()-hotelPageAutoAt<60000)return;
  hotelPageAutoInFlight=(async()=>{
    try{
      const r=await api('/accounts-manager/hotel-finance-auto-sync',{method:'POST',auth:true,redirectOnForbidden:false}) as Record<string,unknown>;
      if(!r||!['preview','post'].includes(String(r.mode))||!Number.isSafeInteger(r.eligibleRows)||Number(r.eligibleRows)<0||!Number.isSafeInteger(r.created)||Number(r.created)<0)throw Error('Invalid auto-sync report');
      const reasons:Record<string,number>={};
      if(r.reasons&&typeof r.reasons==='object')for(const [k,v] of Object.entries(r.reasons))if(typeof v==='number'&&Number.isSafeInteger(v)&&v>0)reasons[k]=v;
      hotelPageAutoReport={savedPriceTest:r.savedPriceTest===true,mode:String(r.mode),eligibleRows:Number(r.eligibleRows),created:Number(r.created),historicalApproved:r.historicalApproved===true,reasons,failures:Array.isArray(r.failures)?r.failures.length:0};
      hotelPageAutoError='';hotelPageAutoAt=Date.now();
    }catch(e){hotelPageAutoReport=null;hotelPageAutoError='Automatic hotel finance check failed. Existing payment records have been preserved.';console.warn('[Hotel finance automatic sync failed]',e);}
    finally{hotelPageAutoInFlight=undefined;publishHotelAuto();}
  })();return hotelPageAutoInFlight;
}
function HotelAutoStatus(){
  const [state,setState]=useState(()=>({report:hotelPageAutoReport,error:hotelPageAutoError}));
  useEffect(()=>{const update=()=>setState({report:hotelPageAutoReport,error:hotelPageAutoError});hotelPageAutoListeners.add(update);update();return()=>{hotelPageAutoListeners.delete(update);};},[]);
  const r=state.report;
  if(state.error)return <p role="alert" className="mb-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{state.error}</p>;
  if(!r)return <p role="status" className="mb-3 text-xs text-slate-600">Checking confirmed hotel finance automatically…</p>;
  return <div role="status" className="mb-3 rounded-lg border border-violet-100 bg-violet-50 p-3 text-xs text-slate-700"><strong>Automatic hotel finance</strong>{r.savedPriceTest&&<p className="font-semibold text-amber-900">ISOLATED TEST MODE — saved itinerary prices, test payments only. Not verified supplier invoices.</p>}<p>{r.eligibleRows} eligible finance row(s) · {r.created} posted on last check. {r.savedPriceTest?'Automatic saved-price test posting enabled.':r.mode==='preview'?'Preview mode: no new balances are written.':r.historicalApproved?'Posting enabled for the approved batch.':'Historical batch not approved; eligible new bookings may post.'}</p>{r.failures>0&&<p>{r.failures} posting attempt(s) failed.</p>}{Object.keys(r.reasons).length>0&&<details className="mt-1"><summary className="cursor-pointer">Why records remain unposted</summary>{Object.entries(r.reasons).map(([k,v])=><div key={k}>{k}: {v}</div>)}</details>}</div>;
}

export default function AccountsHotelItineraryPayments(){
  const [params]=useSearchParams();
  const preview=!!LocalHotelPreview && ['localhost','127.0.0.1','[::1]'].includes(window.location.hostname) && params.get('hotelPreview')==='1';
  if(preview&&LocalHotelPreview)return <Suspense fallback={<p className="p-6">Loading local test preview…</p>}><LocalHotelPreview/></Suspense>;
  return <AccountsHotelItineraryPaymentsLive/>;
}
