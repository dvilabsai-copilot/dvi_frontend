/* eslint-disable @typescript-eslint/no-explicit-any */

export const getTimelineRowName = (row: any): string => String(row?.name || row?.title || row?.text || row?.hotspotName || row?.description || row?.hotelName || "Row").trim();
export const getTimelineRowTime = (row: any): string => String(row?.timeRange || row?.visitTime || row?.time || "").trim();
export const getTimelineRowDistance = (row: any): string => String(row?.distance || row?.hotspot_travelling_distance || row?.travelDistance || "").trim();
