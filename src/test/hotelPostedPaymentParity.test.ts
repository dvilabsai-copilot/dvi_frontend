import { describe, it, expect } from 'vitest';
import {
 hotelPostedBalanceMayBePaid,
 hotelStayMayBePaid,
 hotelPaymentDateStatus,
 type HotelFinance,
 type Stay,
} from '../pages/accounts/hotelItineraryPaymentsLogic';

const today = '2026-11-28';
const stay = (): Stay => ({
 originalHotelId: 11, routeId: 22, confirmedHotelId: 501, hotelId: 77,
 name: 'Verified Sample Hotel', destination: 'Chennai', room: 'Deluxe', rooms: 1,
 day: 'Day 1', date: '2026-09-06', checkIn: '2026-09-06', checkOut: '2026-09-08',
 cancelled: false, sourceMismatch: false, quoted: 2340000,
});
const posted = (): HotelFinance => ({
 id: 25, headerId: 14, confirmedId: 100, planId: 90, quote: 'TEST-001',
 hotelId: 77, confirmedHotelId: 501, date: '2026-09-06',
 purchase: 2340000, paid: 1000000, balance: 1340000, valid: true,
 transactions: [],
});

describe('Hotel-only posted Accounts settlement after checkout', () => {
 it('allows a verified posted outstanding balance after checkout', () => {
  expect(hotelPostedBalanceMayBePaid([stay()], [posted()], today)).toBe(true);
  expect(hotelPaymentDateStatus([stay()], [posted()], 'Partial', today)).toBe('Partial');
 });
 it('keeps creating a missing Accounts record after checkout disabled', () => {
  expect(hotelStayMayBePaid([stay()], today)).toBe(false);
  expect(hotelPostedBalanceMayBePaid([stay()], [], today)).toBe(false);
  expect(hotelPaymentDateStatus([stay()], [], 'Not posted', today)).toBe('Expired');
 });
 it('rejects a cancelled stay', () => {
  expect(hotelPostedBalanceMayBePaid([{...stay(), cancelled:true}], [posted()], today)).toBe(false);
 });
 it('rejects unknown or invalid dates', () => {
  expect(hotelPostedBalanceMayBePaid([{...stay(), checkIn:'',checkOut:'',date:''}], [posted()], today)).toBe(false);
 });
 it('rejects a source mismatch', () => {
  expect(hotelPostedBalanceMayBePaid([{...stay(), sourceMismatch:true}], [posted()], today)).toBe(false);
 });
 it('rejects an unverified Accounts row', () => {
  expect(hotelPostedBalanceMayBePaid([stay()], [{...posted(), valid:false}], today)).toBe(false);
 });
 it('rejects inconsistent paid + balance figures', () => {
  expect(hotelPostedBalanceMayBePaid([stay()], [{...posted(), paid:1}], today)).toBe(false);
  expect(hotelPaymentDateStatus([stay()], [{...posted(), paid:1}], 'Review', today)).toBe('Review');
 });
 it('rejects fully settled balances', () => {
  expect(hotelPostedBalanceMayBePaid([stay()], [{...posted(), paid:2340000, balance:0}], today)).toBe(false);
 });
 it('rejects a hotel identity mismatch', () => {
  expect(hotelPostedBalanceMayBePaid([stay()], [{...posted(), hotelId:88}], today)).toBe(false);
 });
 it('rejects a different confirmed hotel stay identity', () => {
  expect(hotelPostedBalanceMayBePaid([stay()], [{...posted(), confirmedHotelId:502}], today)).toBe(false);
 });
 it('rejects duplicate posted Accounts row IDs', () => {
  expect(hotelPostedBalanceMayBePaid([stay()], [posted(),posted()], today)).toBe(false);
 });
 it('continues to allow a valid upcoming posted liability', () => {
  const upcoming={...stay(), date:'2026-12-06', checkIn:'2026-12-06', checkOut:'2026-12-08'};
  expect(hotelPostedBalanceMayBePaid([upcoming], [posted()], today)).toBe(true);
 });
});
