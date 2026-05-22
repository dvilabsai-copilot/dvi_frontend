import React, { useEffect, useMemo, useState } from "react";
import { Eye, Search } from "lucide-react";
import {
  getAxisroomsHotelPreview,
  listAxisroomsHotels,
  type AxisroomsHotelRow,
  type AxisroomsPreviewResponse,
} from "@/services/axisroomsHotels";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function fmtDate(v: string | null | undefined) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const AxisroomsHotelsPage: React.FC = () => {
  const [rows, setRows] = useState<AxisroomsHotelRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<AxisroomsPreviewResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await listAxisroomsHotels({ search, page, limit });
        if (!cancelled) {
          setRows(res.rows || []);
          setTotal(Number(res.total || 0));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [search, page, limit]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(total, page * limit);

  const openPreview = async (row: AxisroomsHotelRow) => {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const data = await getAxisroomsHotelPreview(row.hotel_id);
      setPreviewData(data);
    } finally {
      setPreviewLoading(false);
    }
  };

  const rateRows = useMemo(() => previewData?.rates || [], [previewData]);
  const restrictionRows = useMemo(() => previewData?.restrictions || [], [previewData]);
  const inventoryRows = useMemo(() => previewData?.inventory || [], [previewData]);

  return (
    <div className="hotel-page-wrapper" style={{ padding: 0 }}>
      <div className="hotel-card">
        <div className="hotel-card-head">
          <h2 className="hotel-card-title">AxisRooms Hotels</h2>
          <div className="hotel-right-tools">
            <div className="hotel-search-box">
              <label>Search:</label>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Search className="w-4 h-4 text-gray-500" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Hotel name / code / property id"
                />
              </div>
            </div>

            <div className="hotel-show-entries">
              <span>Show</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <span>entries</span>
            </div>
          </div>
        </div>

        <div className="hotel-table-wrap">
          <table className="hotel-table">
            <thead>
              <tr>
                <th>S.NO</th>
                <th>Action</th>
                <th>Hotel Name</th>
                <th>Hotel Code</th>
                <th>AxisRooms Property</th>
                <th>Last API Update</th>
                <th>Status</th>
                <th>Inventory</th>
                <th>Rates</th>
                <th>Restrictions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="hotel-empty">Loading...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="hotel-empty">No AxisRooms-updated hotels found</td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={row.hotel_id}>
                    <td>{(page - 1) * limit + idx + 1}</td>
                    <td>
                      <button
                        className="hotel-action-circle view"
                        title="Preview AxisRooms update data"
                        onClick={() => openPreview(row)}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                    <td>{row.hotel_name}</td>
                    <td>{row.hotel_code || "-"}</td>
                    <td>
                      <span
                        style={{
                          cursor: "pointer",
                          fontFamily: "monospace",
                          fontSize: "11px",
                          background: "#f0fdf4",
                          border: "1px solid #86efac",
                          borderRadius: "4px",
                          padding: "1px 5px",
                          color: "#15803d",
                          whiteSpace: "nowrap",
                        }}
                        title="Click to copy"
                        onClick={() => navigator.clipboard.writeText(row.axisrooms_property_id)}
                      >
                        {row.axisrooms_property_id}
                      </span>
                    </td>
                    <td>{fmtDate(row.last_sync_at)}</td>
                    <td>{row.axisrooms_enabled ? "Active" : "Inactive"}</td>
                    <td>{row.inventory_updates}</td>
                    <td>{row.rate_updates}</td>
                    <td>{row.restriction_updates}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="hotel-footer">
          <p>
            Showing <strong>{start}</strong> to <strong>{end}</strong> of <strong>{total}</strong> entries
          </p>
          <div className="hotel-pagination">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Previous
            </button>
            <button className="active">{page}</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Next
            </button>
          </div>
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AxisRooms Sync Preview</DialogTitle>
          </DialogHeader>

          {previewLoading ? (
            <div>Loading preview...</div>
          ) : !previewData ? (
            <div>No preview data found.</div>
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <div><strong>Hotel:</strong> {previewData.hotel_name} ({previewData.hotel_id})</div>
                <div><strong>Property:</strong> {previewData.axisrooms_property_id}</div>
                <div><strong>Latest API event:</strong> {previewData.latest_inbound?.type || "-"} at {fmtDate(previewData.latest_inbound?.received_at)}</div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <span><strong>Inventory Rows:</strong> {previewData.summary.inventory_count}</span>
                  <span><strong>Rate Rows:</strong> {previewData.summary.rates_count}</span>
                  <span><strong>Restriction Rows:</strong> {previewData.summary.restrictions_count}</span>
                </div>
              </div>

              <section>
                <h3 style={{ fontWeight: 700, marginBottom: 6 }}>Rates</h3>
                <div className="hotel-table-wrap">
                  <table className="hotel-table" style={{ minWidth: 850 }}>
                    <thead>
                      <tr>
                        <th>Rateplan</th>
                        <th>Start</th>
                        <th>End</th>
                        <th>Occupancy Rates</th>
                        <th>Received At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rateRows.length === 0 ? (
                        <tr><td colSpan={5} className="hotel-empty">No rate updates</td></tr>
                      ) : rateRows.map((r) => (
                        <tr key={r.id}>
                          <td>{r.rateplan_name || r.rateplan_id}</td>
                          <td>{fmtDate(r.start_date)}</td>
                          <td>{fmtDate(r.end_date)}</td>
                          <td><pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(r.occupancy_rates || {}, null, 0)}</pre></td>
                          <td>{fmtDate(r.received_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <h3 style={{ fontWeight: 700, marginBottom: 6 }}>Restrictions</h3>
                <div className="hotel-table-wrap">
                  <table className="hotel-table" style={{ minWidth: 850 }}>
                    <thead>
                      <tr>
                        <th>Room</th>
                        <th>Rateplan</th>
                        <th>Type</th>
                        <th>Value</th>
                        <th>Start</th>
                        <th>End</th>
                        <th>Received At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {restrictionRows.length === 0 ? (
                        <tr><td colSpan={7} className="hotel-empty">No restriction updates</td></tr>
                      ) : restrictionRows.map((r) => (
                        <tr key={r.id}>
                          <td>{r.room_name}</td>
                          <td>{r.rateplan_name || r.rateplan_id}</td>
                          <td>{r.type}</td>
                          <td>{r.value}</td>
                          <td>{fmtDate(r.start_date)}</td>
                          <td>{fmtDate(r.end_date)}</td>
                          <td>{fmtDate(r.received_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <h3 style={{ fontWeight: 700, marginBottom: 6 }}>Inventory</h3>
                <div className="hotel-table-wrap">
                  <table className="hotel-table" style={{ minWidth: 850 }}>
                    <thead>
                      <tr>
                        <th>Room</th>
                        <th>Start</th>
                        <th>End</th>
                        <th>Free</th>
                        <th>Received At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryRows.length === 0 ? (
                        <tr><td colSpan={5} className="hotel-empty">No inventory updates</td></tr>
                      ) : inventoryRows.map((r) => (
                        <tr key={r.id}>
                          <td>{r.room_name}</td>
                          <td>{fmtDate(r.start_date)}</td>
                          <td>{fmtDate(r.end_date)}</td>
                          <td>{r.free}</td>
                          <td>{fmtDate(r.received_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AxisroomsHotelsPage;
