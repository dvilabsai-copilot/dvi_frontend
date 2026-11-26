// Hotel finance presentation: only persisted Accounts component rows are payable.
export type Raw = Record<string, unknown>;
export type Confirmed = {id:number; planId:number; quote:string; customer:string; start:string; end:string; preference:number};
export type HotelFinance = {id:number; headerId:number; confirmedId:number; planId:number; quote:string; hotelId:number; confirmedHotelId:number; date:string; purchase:number; paid:number; balance:number; valid:boolean; transactions:Raw[]};
export type Stay = {confirmedHotelId:number; hotelId:number; name:string; destination:string; room:string; rooms?:number; day:string; date:string; checkIn:string; checkOut:string; cancelled:boolean; quoted:number|null};
export const str=(v:unknown)=>String(v??'').trim();
export const norm=(v:unknown)=>str(v).toLowerCase();
export const id=(v:unknown)=>{const x=Number(v);return Number.isSafeInteger(x)&&x>0?x:0;};
export const paise=(v:unknown):number|null=>{if(v==null||str(v)==='')return null;const n=Number(v);return Number.isFinite(n)&&n>=0&&Number.isSafeInteger(Math.round(n*100))?Math.round(n*100):null;};
export function dateOnly(v:unknown){const s=str(v);const m=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);const d=m?`${m[3]}-${m[2]}-${m[1]}`:/^\d{4}-\d{2}-\d{2}/.test(s)?s.slice(0,10):'';if(!d)return '';const t=new Date(d+'T00:00:00Z');return !Number.isNaN(t.getTime())&&t.toISOString().slice(0,10)===d?d:'';}
export const nextDay=(d:string)=>{if(!dateOnly(d))return '';return new Date(Date.parse(d+'T00:00:00Z')+86400000).toISOString().slice(0,10);};
export function readConfirmed(r:Raw):Confirmed|null{const c={id:id(r.confirmed_itinerary_plan_ID),planId:id(r.itinerary_plan_ID),quote:str(r.booking_quote_id||r.itinerary_quote_ID),customer:str(r.primary_customer_name)||'Unavailable',start:dateOnly(r.arrival_date),end:dateOnly(r.departure_date),preference:Number(r.itinerary_preference)};return c.id&&c.planId&&c.quote&&(c.preference===1||c.preference===3)?c:null;}
export function readFinance(data:unknown):HotelFinance[]{if(!Array.isArray(data))throw Error('Unexpected Accounts hotel ledger response.');const map=new Map<number,HotelFinance>();for(const raw of data){const h=raw?.header as Raw|undefined,d=raw?.details as Raw|undefined;if(!h||!d)throw Error('Hotel finance row is missing its Accounts header or detail.');const detailId=id(d.accounts_itinerary_hotel_details_ID);const headerId=id(h.accounts_itinerary_details_ID);if(!detailId||!headerId||id(d.accounts_itinerary_details_ID)!==headerId)throw Error('Hotel finance row has inconsistent identifiers.');if(raw.componentType&&raw.componentType!=='hotel')throw Error('Non-hotel record returned by hotel ledger.');const purchase=paise(d.total_payable),paid=paise(d.total_paid),balance=paise(d.total_balance);const row:HotelFinance={id:detailId,headerId,confirmedId:id(h.confirmed_itinerary_plan_ID),planId:id(h.itinerary_plan_ID),quote:str(h.itinerary_quote_ID),hotelId:id(d.hotel_id),confirmedHotelId:id(d.cnf_itinerary_plan_hotel_details_ID),date:dateOnly(d.itinerary_route_date),purchase:purchase??0,paid:paid??0,balance:balance??0,valid:purchase!==null&&paid!==null&&balance!==null&&purchase===paid+balance&&Number(d.deleted)===0&&Number(h.deleted)===0&&Number(d.status)===1&&!!id(d.hotel_id),transactions:Array.isArray(raw.transactions)?raw.transactions:[]};const old=map.get(detailId);if(old){if(JSON.stringify(old)!==JSON.stringify(row))throw Error('Conflicting duplicate hotel finance details.');continue;}map.set(detailId,row);}return [...map.values()];}
export function readStays(data:unknown,c:Confirmed):Stay[]{const r=data as {plan?:Raw;hotels?:Raw[]};if(id(r?.plan?.confirmed_itinerary_plan_ID)!==c.id||id(r?.plan?.itinerary_plan_ID)!==c.planId||!Array.isArray(r?.hotels))throw Error('Confirmed hotel details could not be verified for this itinerary.');return r.hotels.map(h=>{const a=paise(h.totalHotelCost),b=paise(h.totalHotelTaxAmount);return {confirmedHotelId:id(h.confirmedItineraryPlanHotelDetailsId),hotelId:id(h.hotelId),name:str(h.hotelName)||'Booked hotel name missing',destination:str(h.destination),room:str(h.roomType),rooms:id(h.noOfRooms)||undefined,day:str(h.day),date:dateOnly(str(h.day).split('|').pop())||dateOnly(h.date),checkIn:dateOnly(h.checkInDate),checkOut:dateOnly(h.checkOutDate),cancelled:h.voucherCancelled===true,quoted:a!==null&&b!==null?a+b:null};});}
export const belongs=(r:HotelFinance,c:Confirmed)=>r.planId===c.planId&&r.confirmedId===c.id;
export function totals(rows:HotelFinance[]){return rows.reduce((a,r)=>({purchase:a.purchase+r.purchase,paid:a.paid+r.paid,balance:a.balance+r.balance}),{purchase:0,paid:0,balance:0});}
export function status(rows:HotelFinance[]){if(!rows.length)return 'Not posted';if(rows.some(r=>!r.valid))return 'Review';const t=totals(rows);return t.balance===0?'Paid':t.paid>0?'Partial':'Pending';}
export function matchedStay(r:HotelFinance,stays:Stay[]){const m=stays.filter(s=>!!r.confirmedHotelId&&s.confirmedHotelId===r.confirmedHotelId&&s.hotelId===r.hotelId);return m.length===1?m[0]:undefined;}
export function hotelGroups(rows:HotelFinance[],stays:Stay[]){const map=new Map<string,HotelFinance[]>();for(const r of rows){const k=r.hotelId?`hotel:${r.hotelId}`:`unknown:${r.id}`;const a=map.get(k)||[];a.push(r);map.set(k,a);}return [...map.entries()].map(([key,items])=>{const matches=items.map(r=>matchedStay(r,stays));const meta=matches.filter((s):s is Stay=>!!s);const ids=new Set(items.map(r=>r.confirmedHotelId));const unposted=stays.some(s=>s.hotelId===items[0].hotelId&&!s.cancelled&&(!s.confirmedHotelId||!ids.has(s.confirmedHotelId)));return {key,items,hotelId:items[0].hotelId,meta,complete:matches.every(s=>s&&!s.cancelled)&&!unposted&&ids.size===items.length&&items.every(r=>r.valid)};});}
// Stable, explicit oldest-first allocation across only the selected hotel's real due rows.
export function allocate(rows:HotelFinance[],requested:number){if(!rows.length||!Number.isSafeInteger(requested)||requested<=0||rows.some(r=>!r.valid||!r.hotelId||r.hotelId!==rows[0].hotelId||r.confirmedId!==rows[0].confirmedId||r.headerId!==rows[0].headerId)||new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('Invalid hotel finance selection.');if(requested>totals(rows).balance)throw Error('Payment exceeds the hotel balance.');let left=requested;const result=[...rows].sort((a,b)=>a.date.localeCompare(b.date)||a.id-b.id).flatMap(r=>{const amount=Math.min(left,r.balance);left-=amount;return amount?[{row:r,amount}]:[];});if(left||result.length>100)throw Error('Payment allocation exceeds the supported limit.');return result;}
export function sameFinance(before:HotelFinance[],after:HotelFinance[]){const a=new Map(after.map(r=>[r.id,r]));return before.length===after.length&&before.every(r=>{const f=a.get(r.id);return f&&f.valid&&f.headerId===r.headerId&&f.confirmedId===r.confirmedId&&f.planId===r.planId&&f.hotelId===r.hotelId&&f.confirmedHotelId===r.confirmedHotelId&&f.purchase===r.purchase&&f.paid===r.paid&&f.balance===r.balance&&f.date===r.date;});}

// Read-only confirmed stay metadata. Never infer a finance amount or sum room-nights as rooms.
export type StayDisplay = { key:string; hotelKey:string; name:string; location:string; checkIn:string; checkOut:string; rooms:string; members:Stay[] };
export function summarizeStays(stays:Stay[], names:ReadonlyMap<number,string> = new Map()):StayDisplay[]{
  const source=stays.filter(s=>!s.cancelled).map((s,i)=>{
    const usableName=s.name&&!/name missing|^unknown(?: hotel)?$|^hotel$/i.test(s.name);
    const name=(usableName?s.name: names.get(s.hotelId)) || (s.hotelId?`Hotel #${s.hotelId}`:'Booked hotel name missing');
    const hotelKey=s.hotelId?`id:${s.hotelId}`:usableName?`name:${norm(name)}`:'';
    const checkIn=dateOnly(s.checkIn)||dateOnly(s.date);
    const explicitOut=dateOnly(s.checkOut);
    const checkOut=explicitOut&&checkIn&&explicitOut>checkIn?explicitOut:(s.date&&checkIn&&s.date>=checkIn?nextDay(s.date):'');
    return {key:`stay:${i}`,identity:s.hotelId?`id:${s.hotelId}|${norm(s.destination)}`:`unknown:${i}`,hotelKey,name,location:s.destination,checkIn,checkOut,counts:new Set<string>([s.rooms?String(s.rooms):'Unavailable']),members:[s]};
  }).sort((a,b)=>a.checkIn.localeCompare(b.checkIn)||a.key.localeCompare(b.key));
  const out:typeof source=[];
  for(const stay of source){
    const previous=out[out.length-1];
    if(previous&&previous.identity===stay.identity&&previous.checkIn&&previous.checkOut&&stay.checkIn&&stay.checkOut&&stay.checkIn<=previous.checkOut){
      if(stay.checkOut>previous.checkOut)previous.checkOut=stay.checkOut;
      stay.counts.forEach(n=>previous.counts.add(n));previous.members.push(...stay.members);
    }else out.push({...stay,counts:new Set(stay.counts),members:[...stay.members]});
  }
  return out.map(({identity,counts,...s})=>({...s,rooms:[...counts].join(' / ')}));
}
export function matchesStayFilters(stays:StayDisplay[], filters:{checkIn:string;checkOut:string;location:string;hotel:string}){
  const {checkIn,checkOut,location,hotel}=filters;
  if(!checkIn&&!checkOut&&location==='all'&&hotel==='all')return true;
  if(checkIn&&checkOut&&checkIn>checkOut)return false;
  // Inclusive stay date bounds, both conditions must match the same stay.
  return stays.some(s=>(!checkIn||!!s.checkIn&&s.checkIn>=checkIn)&&(!checkOut||!!s.checkOut&&s.checkOut<=checkOut)&&(location==='all'||norm(s.location)===location)&&(hotel==='all'||s.hotelKey===hotel));
}
export function itineraryPaymentStatus(rows:HotelFinance[], stays:Stay[]|undefined, detailFailed=false){
  if(!rows.length)return 'Not posted';
  if(detailFailed||!stays||!stays.length||stays.some(s=>!s.cancelled&&!rows.some(r=>matchedStay(r,stays)===s))||rows.some(r=>{const s=matchedStay(r,stays);return !s||s.cancelled;}))return 'Review';
  return status(rows);
}

// One row per confirmed booking and verified hotel ID. Unknown IDs never share a payable group.
export function individualHotelRows(c:Confirmed, rows:HotelFinance[], stays:Stay[]|undefined, names:ReadonlyMap<number,string>, detailFailed=false){
  const map=new Map<string,{stays:Stay[];rows:HotelFinance[]}>();
  const get=(key:string)=>{let value=map.get(key);if(!value){value={stays:[],rows:[]};map.set(key,value);}return value;};
  (stays||[]).forEach((s,i)=>{if(!s.cancelled)get(s.hotelId?`hotel:${s.hotelId}`:`unverified-stay:${i}`).stays.push(s);});
  rows.forEach(r=>get(r.hotelId?`hotel:${r.hotelId}`:`unverified-finance:${r.id}`).rows.push(r));
  if(!map.size&&(!stays||detailFailed))get('unavailable');
  return [...map].map(([hotelGroup,v])=>{
    const hotelId=v.rows[0]?.hotelId||v.stays[0]?.hotelId||0;
    const display=summarizeStays(v.stays,names);
    const name=display[0]?.name||names.get(hotelId)||(hotelId?`Hotel #${hotelId}`:'Unavailable');
    const hotelKey=hotelId?`id:${hotelId}`:display[0]?.hotelKey||'';
    return {key:`${c.id}|${hotelGroup}`,hotelGroup,hotelId,hotelKey,name,c,rows:v.rows,stays:v.stays,display,overall:itineraryPaymentStatus(v.rows,stays?v.stays:undefined,detailFailed)};
  });
}

// Full settlement across explicitly selected, verified bookings for one hotel.
export function bulkHotelTasks(groups:{hotelId:number;complete:boolean;items:HotelFinance[]}[],hotelId:number){
  if(!Number.isSafeInteger(hotelId)||hotelId<=0||!groups.length||groups.some(g=>g.hotelId!==hotelId||!g.complete||!g.items.length||g.items.some(r=>r.hotelId!==hotelId)))throw Error('Select verified bookings for one hotel only.');
  const all=groups.flatMap(g=>g.items);
  if(new Set(all.map(r=>r.id)).size!==all.length)throw Error('Duplicate finance record selected.');
  const tasks=groups.flatMap(g=>allocate(g.items,totals(g.items).balance));
  if(!tasks.length||tasks.length>100)throw Error('Select up to 100 outstanding finance records.');
  return tasks;
}

// DVI_HOTEL_SEPARATE_STAYS_V1: partition finance by exact confirmed stay identity.
export function individualStayRows(c:Confirmed, rows:HotelFinance[], stays:Stay[]|undefined,names:ReadonlyMap<number,string>,detailFailed=false){
  return individualHotelRows(c,rows,stays,names,detailFailed).flatMap(group=>{
    if(!group.display.length)return [group];
    const buckets=group.display.map(d=>({d,rows:[] as HotelFinance[]}));
    const unmatched:HotelFinance[]=[];
    for(const r of group.rows){
      const matches=buckets.filter(b=>!!matchedStay(r,b.d.members));
      // No guess by date/name; no repeated money across separate rows.
      if(matches.length===1&&group.stays.filter(s=>s.confirmedHotelId===r.confirmedHotelId&&s.hotelId===r.hotelId).length===1)matches[0].rows.push(r);
      else unmatched.push(r);
    }
    const result=buckets.map(({d,rows:items},i)=>({...group,key:`${group.key}|stay:${d.checkIn}:${d.checkOut}:${i}`,rows:items,stays:d.members,display:[d],overall:itineraryPaymentStatus(items,d.members,detailFailed)}));
    if(unmatched.length)result.push({...group,key:`${group.key}|unmatched`,rows:unmatched,stays:[],display:[],overall:'Review'});
    return result;
  });
}
export type GuestCounts={adults:number|null;children:number|null;childWithBed:number|null;childWithoutBed:number|null};
export function readGuestCounts(raw:unknown,c:Confirmed):GuestCounts{
 const r=raw as Raw;
 if(id(r?.planId)!==c.planId||norm(r?.quoteId)!==norm(c.quote)||r?.isConfirmed!==true)throw Error('Guest counts could not be verified for this confirmed itinerary.');
 const count=(v:unknown)=>v==null||str(v)===''?null:Number.isSafeInteger(Number(v))&&Number(v)>=0?Number(v):null;
 return {adults:count(r.adults),children:count(r.children),childWithBed:count(r.childWithBed),childWithoutBed:count(r.childWithoutBed)};
}

// The first selected eligible stay determines the payee when All Hotels is selected.
export function bulkSelectionHotel(filter:string,keys:string[],rows:{key:string;hotelId:number}[]):number {
 if(filter.startsWith('id:'))return id(filter.slice(3));
 if(filter!=='all')return 0;
 const first=rows.find(r=>r.key===keys[0]);return id(first?.hotelId);
}

// With All Hotels, the first eligible row chooses the payee. After that only that hotel is selectable.
export function canSelectHotelStayForBulk(e:{hotelId:number;overall:string;rows:HotelFinance[];stays:Stay[];c:Confirmed}, selectedHotelId:number):boolean {
 return e.hotelId>0&&(!selectedHotelId||e.hotelId===selectedHotelId)&&(e.overall==='Pending'||e.overall==='Partial')&&e.rows.length>0&&e.rows.every(r=>r.valid&&belongs(r,e.c))&&hotelGroups(e.rows,e.stays).some(g=>g.hotelId===e.hotelId&&g.complete&&g.items.every(r=>r.headerId===g.items[0].headerId));
}

// Complete filtered summary and export require settled metadata and an uncapped result.
export function hotelTotalsReady(busy:boolean,blocked:boolean,pending:number,failed:number,capped:boolean,queryChanging:boolean):boolean {
  return !busy&&!blocked&&pending===0&&failed===0&&!capped&&!queryChanging;
}

// DVI_HOTEL_GROUPED_PAYMENT_HISTORY_V1: display-only grouping, never modify finance rows.
export function hotelPaymentHistory(rows: HotelFinance[]) {
  type Item = { key: string; tx: Raw; paid: number | null; rowId: number; stayDate: string };
  const buckets = new Map<string, Item[]>();
  for (const row of rows) {
    row.transactions.forEach((tx, i) => {
      const key = `${row.id}-${i}`;
      const reference = str(tx.transaction_utr_no);
      const processor = str(tx.transaction_done_by);
      const mode = str(tx.mode_of_pay);
      const timestamp = str(tx.transaction_date);
      const instant = Date.parse(timestamp);
      const paid = paise(tx.transaction_amount);
      const groupable = !!reference && !!processor && !!mode && paid !== null && Number.isFinite(instant) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/i.test(timestamp);
      const groupKey = groupable ? JSON.stringify([row.headerId,row.confirmedId,row.hotelId,reference,processor,mode,instant]) : `single:${key}`;
      const list = buckets.get(groupKey) || [];
      list.push({key,tx,paid,rowId:row.id,stayDate:row.date});
      buckets.set(groupKey,list);
    });
  }
  return Array.from(buckets.values()).flatMap(items => {
    // Multiple entries for the same finance record are ambiguous; preserve separate history cards.
    const sum = items.reduce((n,x)=>n+(x.paid??0),0);
    if (new Set(items.map(x=>x.rowId)).size !== items.length || !Number.isSafeInteger(sum)) return items.map(x=>({key:x.key,tx:x.tx,paid:x.paid,allocations:[x]}));
    return [{key:items[0].key,tx:items[0].tx,paid:items.some(x=>x.paid===null)?null:sum,allocations:items}];
  });
}

export type HotelBankDraft = { accountNumber?: string; ifsc?: string; phone?: string };
export type HotelBankDrafts = Record<number, HotelBankDraft>;
export function hotelBankExportFields(drafts: HotelBankDrafts, hotelId: number): string[] {
  const d = hotelId > 0 ? drafts[hotelId] : undefined;
  return [d?.accountNumber?.trim() || '', d?.ifsc?.trim() || '', d?.phone?.trim() || ''];
}
export function updateHotelBankDraft(drafts: HotelBankDrafts, hotelId: number, key: keyof HotelBankDraft, value: string): HotelBankDrafts {
  if (!Number.isSafeInteger(hotelId) || hotelId <= 0) return drafts;
  return {...drafts, [hotelId]: {...drafts[hotelId], [key]: key === 'ifsc' ? value.toUpperCase() : value}};
}
