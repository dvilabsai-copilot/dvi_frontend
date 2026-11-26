
import { useState } from 'react';
import { api } from '@/lib/api';
import type { Stay, Confirmed } from './hotelItineraryPaymentsLogic';
export async function postHotelFinancePayment(payload:{payments:unknown[];modeOfPaymentId?:number;utrNumber?:string;processedBy?:string;paymentScreenshot?:File}){
  const {paymentScreenshot,...rest}=payload;
  let body:object=rest;
  if(paymentScreenshot){const fd=new FormData();fd.append('payments',JSON.stringify(rest.payments));fd.append('modeOfPaymentId',String(rest.modeOfPaymentId||''));fd.append('utrNumber',rest.utrNumber||'');fd.append('processedBy',rest.processedBy||'');fd.append('paymentScreenshot',paymentScreenshot);body=fd;}
  await api('/accounts-manager/hotel-finance-pay',{method:'POST',auth:true,body,redirectOnForbidden:false});
}
export async function resolveHotelFinanceIdentities(c:Confirmed, stays:Stay[]):Promise<Stay[]>{
  if(!stays.some(s=>!s.hotelId&&s.confirmedHotelId))return stays;
  const rows=await api('/accounts-manager/hotel-finance-identities',{method:'POST',auth:true,body:{confirmedId:c.id,planId:c.planId},redirectOnForbidden:false});
  if(!Array.isArray(rows))throw Error('Hotel identity lookup failed.');
  const ids=new Map<number,number>(rows.map((r:any)=>[Number(r.confirmedHotelId),Number(r.hotelId)]));
  return stays.map(s=>s.hotelId?s:{...s,hotelId:ids.get(s.confirmedHotelId)||0});
}
export function HotelFinanceReview({booking,hotelId,stays,disabled,onDone}:{booking:Confirmed;hotelId:number;stays:Stay[];disabled:boolean;onDone:()=>void}){
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[verified,setVerified]=useState(false);
  const [values,setValues]=useState<Record<number,{bookingRef:string;invoiceRef:string;purchaseBase:string;purchaseTax:string}>>({});
  const eligible=stays.filter(s=>!s.cancelled);
  const blank={bookingRef:'',invoiceRef:'',purchaseBase:'',purchaseTax:''};
  const ready=hotelId>0&&eligible.length>0&&eligible.every(s=>s.confirmedHotelId>0&&s.hotelId===hotelId);
  const update=(id:number,k:keyof typeof blank,value:string)=>setValues(old=>({...old,[id]:{...(old[id]||blank),[k]:value}}));
  if(!ready)return <p role="alert" className="rounded bg-amber-50 p-3 text-sm">Hotel master identity is not uniquely mapped. Finance cannot post this stay until its provider hotel code is linked to the correct hotel master.</p>;
  return <section className="rounded-lg border border-violet-200 p-3 text-sm space-y-3">
    <button type="button" disabled={disabled||busy} className="rounded-lg border border-violet-300 px-3 py-2 font-medium text-violet-700" onClick={()=>setOpen(v=>!v)}>{open?'Close finance review':'Reconcile hotel finance'}</button>
    {open&&<><p>Use genuine supplier booking and invoice amounts allocated to each night. Do not enter the itinerary quote as a supplier invoice. Posting creates an Accounts payable; it does not send money.</p>
    {eligible.map(s=><div key={s.confirmedHotelId} className="rounded border p-2 space-y-2"><strong>{s.date} · {s.room} · {s.name}</strong><div className="grid gap-2 sm:grid-cols-2">{([['bookingRef','Supplier booking reference'],['invoiceRef','Supplier invoice reference'],['purchaseBase','Supplier base (INR)'],['purchaseTax','Supplier tax (INR)']] as const).map(([k,label])=><label key={k} className="text-xs">{label}<input disabled={busy||disabled} className="block w-full rounded border p-2" type="text" inputMode={k.startsWith('purchase')?'decimal':'text'} value={(values[s.confirmedHotelId]||blank)[k]} onChange={e=>update(s.confirmedHotelId,k,e.target.value)}/></label>)}</div></div>)}
    <label className="flex gap-2 items-start"><input type="checkbox" disabled={busy||disabled} checked={verified} onChange={e=>setVerified(e.target.checked)}/>I verified the supplier booking, invoice, nightly allocation, and that these missing stays have not already been paid or posted elsewhere.</label>
    {error&&<p role="alert" className="text-red-700">{error}</p>}
    <button type="button" disabled={!verified||disabled||busy||eligible.some(s=>Object.values(values[s.confirmedHotelId]||blank).some(v=>!v.trim()))} className="rounded bg-violet-700 px-4 py-2 text-white disabled:opacity-50" onClick={async()=>{if(busy||disabled||!verified)return;if(!window.confirm('Post verified supplier liabilities for these nights? No bank transfer will occur.'))return;setBusy(true);setError('');try{await api('/accounts-manager/hotel-finance-review',{method:'POST',auth:true,redirectOnForbidden:false,body:{planId:booking.planId,confirmedId:booking.id,hotelId,supplierEvidenceVerified:true,noPriorPaymentsVerified:true,rows:eligible.map(s=>({confirmedHotelId:s.confirmedHotelId,...values[s.confirmedHotelId]}))}});setOpen(false);onDone();}catch(e){setError((e instanceof Error?e.message:String(e))+' — reload before retrying if the outcome is uncertain.');}finally{setBusy(false);}}}>{busy?'Posting…':'Post verified hotel finance'}</button></>}
  </section>;
}


// DVI_HOTEL_AUTO_FINANCE_V5: start sync before loading the hotel ledger.
let hotelAutoSyncInFlight:Promise<void>|undefined;
let hotelAutoSyncAt=0;
export function autoSyncHotelFinance():Promise<void>{
  if(hotelAutoSyncInFlight)return hotelAutoSyncInFlight;
  if(Date.now()-hotelAutoSyncAt<60000)return Promise.resolve();
  hotelAutoSyncInFlight=(async()=>{
    try{const result=await api('/accounts-manager/hotel-finance-auto-sync',{method:'POST',auth:true,redirectOnForbidden:false});console.info('[Hotel finance automatic sync]',result);hotelAutoSyncAt=Date.now();}
    catch(e){console.warn('[Hotel finance automatic sync failed; existing ledger preserved]',e);}
    finally{hotelAutoSyncInFlight=undefined;}
  })();return hotelAutoSyncInFlight;
}
