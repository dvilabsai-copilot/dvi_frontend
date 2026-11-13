/**
 * Frontend-only client. Calls an existing advertisement API, if provided.
 * This package does not create API endpoints, persistence or image storage.
 * Optional Vite override: VITE_AGENT_DASHBOARD_ADS_ENDPOINT=/agent-dashboard-ads
 */
import { api, resolveUploadUrl } from '@/lib/api';

export type AgentDashboardAd = {
  id: number;
  title: string;
  imagePath: string;
  targetUrl: string | null;
  enabled: boolean;
  sortOrder: number;
};

export type AgentDashboardAdInput = Omit<AgentDashboardAd, 'id'>;

const configuredPath = String(import.meta.env.VITE_AGENT_DASHBOARD_ADS_ENDPOINT || '/agent-dashboard-ads').trim();
const endpoint = /^\/[a-z0-9/_-]+$/i.test(configuredPath)
  ? configuredPath.replace(/\/+$/, '')
  : '/agent-dashboard-ads';

export function agentAdImageUrl(path: string): string {
  const raw = String(path || '').trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/uploads/')) return resolveUploadUrl(raw);
  return '';
}

function getRows(response: unknown): Record<string, unknown>[] {
  const container = response as { data?: unknown; items?: unknown; ads?: unknown } | null;
  const rows = Array.isArray(response) ? response
    : Array.isArray(container?.data) ? container.data
    : Array.isArray(container?.items) ? container.items
    : Array.isArray(container?.ads) ? container.ads : null;
  if (rows === null) {
    throw new Error('Advertisement API returned an unsupported list response. Expected an array or a data/items/ads array.');
  }
  return rows.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object');
}

function parseBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true' || value === 'published';
}

function normalizeAd(row: Record<string, unknown>, activeList: boolean): AgentDashboardAd | null {
  const id = Number(row.id ?? row.adId ?? row.ad_id ?? 0);
  const imagePath = String(row.imagePath ?? row.image_path ?? row.imageUrl ?? row.image_url ?? '').trim();
  if (!Number.isInteger(id) || id <= 0 || !agentAdImageUrl(imagePath)) return null;
  const targetUrl = row.targetUrl ?? row.target_url ?? row.linkUrl ?? row.link_url;
  const rawEnabled = row.enabled ?? row.isPublished ?? row.is_published ?? row.status;
  return {
    id,
    title: String(row.title ?? row.name ?? 'Advertisement').trim() || 'Advertisement',
    imagePath,
    targetUrl: typeof targetUrl === 'string' && /^https:\/\//i.test(targetUrl) ? targetUrl : null,
    enabled: rawEnabled === undefined ? activeList : parseBoolean(rawEnabled),
    sortOrder: Number.isFinite(Number(row.sortOrder ?? row.sort_order)) ? Number(row.sortOrder ?? row.sort_order) : 0,
  };
}

async function loadAds(path: string, activeList: boolean): Promise<AgentDashboardAd[]> {
  const response: unknown = await api(path, { cache: 'no-store', redirectOnForbidden: false });
  const result = getRows(response)
    .map((row) => normalizeAd(row, activeList))
    .filter((ad): ad is AgentDashboardAd => ad !== null);
  return result
    .filter((ad) => !activeList || ad.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
}

export const listAgentDashboardAds = () => loadAds(endpoint, false);
export const listPublishedAgentDashboardAds = () => loadAds(`${endpoint}/active`, true);

export async function uploadAgentDashboardAdImage(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    throw new Error('Upload a PNG, JPEG or WebP banner.');
  }
  if (file.size > 5 * 1024 * 1024 || file.size === 0) {
    throw new Error('Banner must be between 1 byte and 5 MB.');
  }
  const body = new FormData();
  body.append('file', file);
  const response: unknown = await api(`${endpoint}/upload`, {
    method: 'POST', body, redirectOnForbidden: false,
  });
  const raw = response as { imagePath?: unknown; image_path?: unknown; url?: unknown; data?: { imagePath?: unknown; image_path?: unknown; url?: unknown } } | null;
  const path = raw?.imagePath ?? raw?.image_path ?? raw?.url ?? raw?.data?.imagePath ?? raw?.data?.image_path ?? raw?.data?.url;
  if (typeof path !== 'string' || !agentAdImageUrl(path)) {
    throw new Error('Upload API did not return a usable imagePath or URL.');
  }
  return path;
}

export async function saveAgentDashboardAd(ad: AgentDashboardAdInput, id?: number): Promise<void> {
  await api(id ? `${endpoint}/${id}` : endpoint, {
    method: id ? 'PUT' : 'POST', body: ad, redirectOnForbidden: false,
  });
}

export async function setAgentDashboardAdEnabled(id: number, enabled: boolean): Promise<void> {
  await api(`${endpoint}/${id}/enabled`, {
    method: 'PATCH', body: { enabled }, redirectOnForbidden: false,
  });
}

export async function deleteAgentDashboardAd(id: number): Promise<void> {
  await api(`${endpoint}/${id}`, { method: 'DELETE', redirectOnForbidden: false });
}
