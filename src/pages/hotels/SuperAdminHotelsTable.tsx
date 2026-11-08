import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown,
  ChevronDown,
  Copy,
  Eye,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Trash2,
} from "lucide-react";
import { getHotelBackendRow } from "@/services/hotels";

/** DVI Super Admin hotel table - compact full-text layout, v4.
 * Business actions remain owned by the existing Hotels.tsx page.
 * Only installed through the isSuperAdmin role branch there.
 */
export type SuperAdminHotelTableRow = {
  id: number;
  backendId: string;
  name: string;
  code: string;
  imageUrl: string;
  stateName: string;
  cityName: string;
  mobile: string;
  email: string;
  contactPerson: string;
  categoryId: string;
  isActive: boolean;
};

type CategoryOption = { id: string; name: string; code?: string };
type SortField = "id" | "name" | "stateName" | "cityName" | "mobile" | "categoryId";
type PageSortField = "email" | "status";
type Props = {
  rows: SuperAdminHotelTableRow[];
  loading: boolean;
  savingId: string | null;
  deletingId: string | null;
  categoryOptions: CategoryOption[];
  onView: (row: SuperAdminHotelTableRow) => void;
  onEdit: (row: SuperAdminHotelTableRow) => void;
  onDelete: (row: SuperAdminHotelTableRow) => void;
  onToggleStatus: (row: SuperAdminHotelTableRow) => void;
  onChangeCategory: (row: SuperAdminHotelTableRow, categoryId: string) => void;
  onSort: (key: SortField) => void;
};

type Detail = { email: string; categoryId: string };
const MISSING = "\u2014";
const STAR = "\u2605";

function asText(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function detailFromResponse(raw: any): Detail {
  const hotel = raw?.data ?? raw;
  return {
    email: asText(hotel?.hotel_email ?? hotel?.email),
    categoryId: asText(hotel?.hotel_category ?? hotel?.hotelCategory),
  };
}

function categoryDisplay(categoryId: string, options: CategoryOption[]) {
  const matched = options.find((item) => item.id === categoryId);
  const rawLabel = asText(matched?.name || matched?.code);
  const starMatch = rawLabel.match(/^\s*([1-5])\s*(?:[- ]?star(?:s)?|\*)\s*$/i);
  const stars = starMatch ? Number(starMatch[1]) : 0;
  // Preserve the complete real category label. Wrapping is handled by CSS.
  const label = stars > 0 ? `${stars} Star` : rawLabel || (categoryId ? "Unlisted category" : "Choose category");
  return { label, stars, fullLabel: rawLabel || categoryId };
}

async function copyText(value: string): Promise<void> {
  if (!value.trim()) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    window.alert("Unable to copy. Please select and copy the text manually.");
  }
}

function SortHeading({
  label, field, onSort, title,
}: {
  label: string;
  field: SortField | PageSortField;
  onSort: (field: SortField | PageSortField) => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      className="sah2-sort"
      onClick={() => onSort(field)}
      title={title || `Sort by ${label}`}
      aria-label={title || `Sort by ${label}`}
    >
      <span>{label}</span><ArrowUpDown size={13} aria-hidden="true" />
    </button>
  );
}


export default function SuperAdminHotelsTable({
  rows,
  loading,
  savingId,
  deletingId,
  categoryOptions,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
  onChangeCategory,
  onSort,
}: Props) {
  const [detailsById, setDetailsById] = useState<Record<string, Detail>>({});
  const detailsCache = useRef(new Map<string, Detail>());
  const idsKey = useMemo(() => rows.map((row) => row.backendId).join("|"), [rows]);
  const [pageSort, setPageSort] = useState<{
    field: PageSortField | null;
    direction: "asc" | "desc";
  }>({ field: null, direction: "asc" });

  const handleSortHeading = (field: SortField | PageSortField) => {
    if (field === "email" || field === "status") {
      // These two sorts apply only to the currently loaded page.
      setPageSort((current) => ({
        field,
        direction: current.field === field && current.direction === "asc" ? "desc" : "asc",
      }));
      return;
    }
    setPageSort({ field: null, direction: "asc" });
    onSort(field);
  };

  const displayRows = useMemo(() => {
    if (!pageSort.field) return rows;
    const direction = pageSort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (pageSort.field === "status") {
        return (Number(a.isActive) - Number(b.isActive)) * direction;
      }
      const emailA = (a.email || detailsById[a.backendId]?.email || "").toLocaleLowerCase();
      const emailB = (b.email || detailsById[b.backendId]?.email || "").toLocaleLowerCase();
      return emailA.localeCompare(emailB) * direction;
    });
  }, [rows, detailsById, pageSort]);

  // Fetch email only when the list response omits it, using the existing
  // hotel details endpoint. Never load images for this image-free UI.
  // Cache lookups so sorting and status updates don't refetch details.
  useEffect(() => {
    let cancelled = false;
    // Category details are fetched only when the list left them blank.
    // They share the existing email detail request (no extra API per hotel).
    const missing = rows.filter(
      (row) => row.backendId && (!row.email || !row.categoryId) &&
        !detailsCache.current.has(row.backendId),
    );
    let cursor = 0;
    async function worker() {
      while (!cancelled && cursor < missing.length) {
        const row = missing[cursor++];
        let details: Detail = { email: "", categoryId: "" };
        try {
          details = detailFromResponse(await getHotelBackendRow(row.backendId, true));
        } catch {
          // Optional details must not prevent table rows from displaying.
        }
        if (!cancelled) {
          detailsCache.current.set(row.backendId, details);
          setDetailsById((existing) => ({ ...existing, [row.backendId]: details }));
        }
      }
    }
    void Promise.all(
      Array.from({ length: Math.min(4, missing.length) }, () => worker()),
    );
    return () => { cancelled = true; };
    // Only the set of visible hotel ids should trigger fetching.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  return (
    <div className="sah2-container">
      <div className="sah2-scroll" role="region" aria-label="Super Admin hotels table" tabIndex={0}>
        <table className="sah2-table">
          <colgroup>
            <col style={{ width: 58 }} />
            <col style={{ width: 285 }} />
            <col style={{ width: 182 }} />
            <col style={{ width: 155 }} />
            <col style={{ width: 145 }} />
            <col style={{ width: 216 }} />
            <col style={{ width: 236 }} />
            <col style={{ width: 177 }} />
          </colgroup>
          <thead>
            <tr>
              <th><SortHeading label="S.No" field="id" onSort={handleSortHeading} /></th>
              <th><SortHeading label="Hotel Name" field="name" onSort={handleSortHeading} /></th>
              <th><SortHeading label="Hotel Category" field="categoryId" onSort={handleSortHeading} /></th>
              <th><SortHeading label="City" field="cityName" onSort={handleSortHeading} /></th>
              <th><SortHeading label="State" field="stateName" onSort={handleSortHeading} /></th>
              <th><SortHeading label="Mobile" field="mobile" onSort={handleSortHeading} /></th>
              <th><SortHeading label="Email" field="email" onSort={handleSortHeading} title="Sort emails on this page" /></th>
              <th><SortHeading label="Actions" field="status" onSort={handleSortHeading} title="Sort hotel status on this page" /></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="sah2-empty">Loading hotels...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} className="sah2-empty">No hotels found</td></tr>
            ) : displayRows.map((row) => {
              const detail = detailsById[row.backendId];
              const email = row.email || detail?.email || "";
              // SUPER_ADMIN_CATEGORY_DETAIL_FALLBACK_20261106
              // Use the persisted hotel category from GET /hotels/:id if the list omits it.
              const categoryId = row.categoryId || detail?.categoryId || "";
              const effectiveRow = categoryId === row.categoryId ? row : { ...row, categoryId };
              const category = categoryDisplay(categoryId, categoryOptions);
              const saving = savingId === row.backendId;
              return (
                <tr key={`${row.backendId}-${row.id}`}>
                  <td className="sah2-serial">{row.id}</td>
                  <td>
                    <div className="sah2-hotel">
                      <div className="sah2-hotel-details">
                        <button type="button" className="sah2-hotel-name" title={row.name} onClick={() => onView(row)}>
                          {row.name || "Unnamed hotel"}
                        </button>
                        <span className="sah2-id">Hotel ID: {row.code || row.backendId}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="sah2-category">
                      <span className="sah2-category-badge" title={category.fullLabel || category.label} aria-hidden="true">
                        {category.stars > 0 && <span className="sah2-stars">{STAR.repeat(category.stars)}</span>}
                        <span>{category.label}</span><ChevronDown size={12} />
                      </span>
                      <select
                        aria-label={`Hotel category for ${row.name}`}
                        title={`Change category for ${row.name}`}
                        value={categoryId}
                        onChange={(event) => onChangeCategory(effectiveRow, event.target.value)}
                        disabled={saving || categoryOptions.length === 0}
                      >
                        {!categoryId && <option value="">Choose category</option>}
                        {categoryId && !categoryOptions.some((c) => c.id === categoryId) && (
                          <option value={categoryId}>Current category (not listed)</option>
                        )}
                        {categoryOptions.map((c) => (
                          <option key={c.id} value={c.id}>{c.name || c.code || c.id}</option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td><div className="sah2-inline"><MapPin size={16} /><span title={row.cityName}>{row.cityName || MISSING}</span></div></td>
                  <td className="sah2-strong" title={row.stateName}>{row.stateName || MISSING}</td>
                  <td>
                    <div className="sah2-inline sah2-contact-line">
                      <Phone size={15} /><span className="sah2-contact-value" title={row.mobile}>{row.mobile || MISSING}</span>
                      {row.mobile && (
                        <button type="button" className="sah2-copy" title="Copy mobile" aria-label={`Copy mobile for ${row.name}`} onClick={() => void copyText(row.mobile)}><Copy size={14} /></button>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="sah2-inline sah2-contact-line">
                      <Mail size={16} />
                      <span className="sah2-contact-value sah2-email" title={email}>{email || MISSING}</span>
                      {email && (
                        <button type="button" className="sah2-copy" title="Copy email" aria-label={`Copy email for ${row.name}`} onClick={() => void copyText(email)}><Copy size={14} /></button>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="sah2-actions">
                      <button type="button" className="sah2-action sah2-view" title="Preview" aria-label={`Preview ${row.name}`} onClick={() => onView(row)}><Eye size={16} /></button>
                      <button type="button" className="sah2-action sah2-edit" title="Edit" aria-label={`Edit ${row.name}`} onClick={() => onEdit(row)}><Pencil size={16} /></button>
                      <button type="button" className="sah2-action sah2-delete" title="Delete" aria-label={`Delete ${row.name}`} disabled={deletingId === row.backendId} onClick={() => onDelete(row)}><Trash2 size={16} /></button>
                      <button
                        type="button"
                        role="switch"
                        className={`sah2-toggle ${row.isActive ? "sah2-active" : ""}`}
                        aria-checked={row.isActive}
                        aria-label={`Toggle status for ${row.name}`}
                        title={row.isActive ? "Active - click to deactivate" : "Inactive - click to activate"}
                        disabled={saving}
                        onClick={() => onToggleStatus(row)}
                      ><span /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="sah2-scroll-note">Scroll horizontally to view all hotel details and actions.</p>
      <style>{`
        /* DVI Hotels v2: mounted for role 1 only; all rules are scoped to sah2. */
        .sah2-container { width: 100%; min-width: 0; margin: 2px 0 6px; color: #30244a; }
        .sah2-scroll { width: 100%; overflow-x: auto; overflow-y: hidden; border: 1px solid #e5d8f1; border-radius: 14px; background: #fff; scrollbar-width: thin; scrollbar-color: #c7a6e7 #f7f1fa; }
        .sah2-scroll:focus-visible { outline: 2px solid #a855f7; outline-offset: 2px; }
        /* Natural-width layout: never squeeze numbers, email addresses or long labels into ellipses. */
        .sah2-table { width: max-content; min-width: 100%; border-collapse: separate; border-spacing: 0; table-layout: auto; color: #2c2541; font-size: 13.3px; line-height: 1.5; }
        .sah2-table th, .sah2-table td { box-sizing: border-box; min-width: 0; }
        .sah2-table tbody td:not(:last-child) { overflow: visible; }
        .sah2-table thead th { height: 49px; padding: 11px 10px; text-align: left; white-space: nowrap; color: #251447; font-weight: 800; font-size: 13.5px; background: linear-gradient(90deg, #f7efff 0%, #faedf9 100%); border-bottom: 1px solid #e7d7f0; }
        .sah2-table thead th:first-child { padding-left: 16px; }
        .sah2-table tbody td { padding: 10px; vertical-align: middle; border-bottom: 1px solid #eee5f4; background: #fff; font-weight: 600; }
        .sah2-table tbody tr:nth-child(even) td { background: #fdfaff; }
        .sah2-table tbody tr:hover td { background: #fcf5ff; }
        .sah2-table tbody tr:last-child td { border-bottom: 0; }
        .sah2-table tbody td:first-child { padding-left: 16px; }
        .sah2-table thead th:nth-child(2), .sah2-table tbody td:nth-child(2) { width: 285px; max-width: 310px; }
        .sah2-table thead th:nth-child(3), .sah2-table tbody td:nth-child(3) { width: 182px; max-width: 210px; }
        .sah2-table thead th:nth-child(4), .sah2-table tbody td:nth-child(4) { width: 155px; max-width: 200px; }
        .sah2-table thead th:nth-child(5), .sah2-table tbody td:nth-child(5) { width: 145px; max-width: 195px; }
        .sah2-table tbody td:nth-child(4) .sah2-inline, .sah2-table tbody td:nth-child(5) { overflow-wrap: anywhere; }
        .sah2-table thead th:nth-child(6), .sah2-table tbody td:nth-child(6) { padding-left: 12px; padding-right: 12px; }
        .sah2-table thead th:nth-child(7), .sah2-table tbody td:nth-child(7) { padding-left: 12px; padding-right: 12px; }
        .sah2-table th:last-child { background: #f5e9fb; }
        .sah2-table td:last-child { position: static; }
        .sah2-sort { display: inline-flex; gap: 5px; align-items: center; background: none; border: none; font: inherit; font-weight: 800; color: inherit; padding: 0; cursor: pointer; white-space: nowrap; }
        .sah2-sort:hover, .sah2-sort:focus-visible { color: #a62d9c; }
        .sah2-sort svg { opacity: .5; }
        .sah2-empty { text-align: center; padding: 32px 15px !important; color: #766484; }
        .sah2-serial { color: #23173d; font-weight: 800 !important; }
        .sah2-hotel { display: flex; align-items: center; min-width: 0; padding: 2px 0; }
        .sah2-hotel-details { display: flex; flex-direction: column; width: 270px; min-width: 0; max-width: 270px; gap: 2px; }
        .sah2-hotel-name { display: block; width: 100%; max-width: 100%; white-space: normal; overflow-wrap: anywhere; font-size: 14.1px; line-height: 1.45; font-weight: 800; color: #69229c; text-align: left; border: 0; padding: 0; background: transparent; cursor: pointer; }
        .sah2-hotel-name:hover { color: #c82b94; text-decoration: underline; }
        .sah2-id { color: #777086; font-size: 11.8px; font-weight: 500; overflow-wrap: anywhere; white-space: normal; }
        .sah2-category { position: relative; display: inline-flex; width: 100%; max-width: 100%; min-width: 0; }
        .sah2-category-badge { display: inline-flex; gap: 5px; align-items: flex-start; width: 100%; min-width: 0; max-width: 100%; background: #fcf0f7; border-radius: 12px; padding: 7px 9px; color: #392451; font-weight: 800; font-size: 12.5px; white-space: normal; }
        .sah2-category-badge > span:not(.sah2-stars) { min-width: 0; overflow-wrap: anywhere; white-space: normal; }
        .sah2-category-badge > svg { flex: 0 0 auto; margin-left: auto; }
        .sah2-stars { color: #ed9d16; letter-spacing: -1.2px; font-size: 12.3px; }
        .sah2-category select { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
        .sah2-category select:disabled { cursor: not-allowed; }
        .sah2-category:focus-within { outline: 2px solid #a855f7; outline-offset: 2px; border-radius: 999px; }
        .sah2-inline { display: inline-flex; align-items: center; gap: 6px; min-width: 0; font-weight: 650; font-size: 13px; overflow: visible; }
        .sah2-inline > svg { flex: 0 0 auto; color: #8735b0; }
        .sah2-inline > span:not(.sah2-email) { min-width: 0; overflow-wrap: anywhere; }
        .sah2-contact-line { display: inline-flex; align-items: center; gap: 7px; width: max-content; max-width: none; white-space: nowrap; overflow: visible; }
        .sah2-contact-value { flex: 0 0 auto; min-width: max-content; max-width: none; overflow: visible; white-space: nowrap; }
        .sah2-strong { font-weight: 650 !important; }
        .sah2-nowrap { white-space: nowrap; }
        .sah2-email { display: inline-block; min-width: max-content; max-width: none; overflow: visible; white-space: nowrap; }
        .sah2-copy { display: inline-flex; justify-content: center; align-items: center; width: 25px; height: 25px; padding: 3px; border: none; border-radius: 6px; color: #8535b4; background: #f4ebfb; cursor: pointer; flex: 0 0 25px; }
        .sah2-copy:hover { background: #e9d5f9; }
        .sah2-actions { display: inline-flex; gap: 6px; align-items: center; white-space: nowrap; }
        .sah2-action { display: inline-flex; justify-content: center; align-items: center; width: 29px; height: 29px; border-radius: 8px; border: none; cursor: pointer; }
        .sah2-view { color: #6b42be; background: #ede8fa; }
        .sah2-edit { color: #7433b3; background: #f3e9fd; }
        .sah2-delete { color: #e34b5b; background: #fff0f1; }
        .sah2-action:not(:disabled):hover { filter: brightness(.94); }
        .sah2-action:disabled, .sah2-toggle:disabled { opacity: .5; cursor: not-allowed; }
        .sah2-toggle { width: 34px; height: 20px; border-radius: 999px; border: none; background: #cdd2df; padding: 2px; cursor: pointer; display: inline-flex; flex: 0 0 auto; }
        .sah2-toggle > span { width: 16px; height: 16px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px #0002; transition: transform .18s ease; }
        .sah2-toggle.sah2-active { background: #9a50d0; }
        .sah2-toggle.sah2-active > span { transform: translateX(14px); }
        .sah2-scroll-note { margin: 6px 4px 0; font-size: 11.8px; color: #756783; }
        @media (min-width: 1720px) { .sah2-scroll-note { display: none; } }
        /* Only active while the Super Admin table is mounted. */
        .hotel-page-wrapper:has(.sah2-container) .hotel-card-title { font-size: 18px; font-weight: 800; color: #2c2141; }
        .hotel-page-wrapper:has(.sah2-container) .hotel-toolbar,
        .hotel-page-wrapper:has(.sah2-container) .hotel-card-head { font-size: 13px; font-weight: 650; }
        .hotel-page-wrapper:has(.sah2-container) .hotel-card { border-radius: 16px; }
        .hotel-page-wrapper:has(.sah2-container) .hotel-search-box input { border-radius: 10px; }
        .hotel-page-wrapper:has(.sah2-container) .hotel-pagination button { font-weight: 650; }
      `}</style>
    </div>
  );
}