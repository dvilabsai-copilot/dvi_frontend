import { hotspotService } from "@/services/hotspotService";

type Params = {
  page: number;
  pageSize: number;
  hotspotIds: number[];
  vehicleTypeIds: number[];
};
type RecordsApi = Pick<typeof hotspotService, "getParkingChargeRecords">;

export async function loadParkingMatrixPage(
  params: Params,
  api: RecordsApi = hotspotService,
) {
  for (const ids of [params.hotspotIds, params.vehicleTypeIds]) {
    if (
      ids.length > 20 ||
      ids.some((id) => !Number.isSafeInteger(id) || id <= 0)
    ) {
      throw new Error("Select up to 20 valid options per filter.");
    }
  }

  // Get all options without sending more IDs than the API accepts.
  const metadata = await api.getParkingChargeRecords({
    page: 1,
    pageSize: 1,
  });
  const hotspots = metadata.options.hotspots.filter((item) =>
    !params.hotspotIds.length || params.hotspotIds.includes(item.id)
  );
  const vehicles = metadata.options.vehicleTypes.filter((item) =>
    !params.vehicleTypeIds.length || params.vehicleTypeIds.includes(item.id)
  );

  const pageSize = Math.max(1, Math.min(5, params.pageSize));
  const total = vehicles.length ? hotspots.length : 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.max(1, Math.min(params.page, totalPages));
  const visible = hotspots.slice((page - 1) * pageSize, page * pageSize);
  const result = {
    ...metadata, page, pageSize, total, totalPages,
    rows: [] as typeof metadata.rows,
  };
  if (!total || !visible.length) return result;

  // Each request uses at most five hotspots and five vehicle types.
  // Collect every batch before displaying any editable cells.
  const rows: typeof metadata.rows = [];
  const hotspotIds = visible.map((item) => item.id);

  for (let offset = 0; offset < vehicles.length; offset += 5) {
    const vehicleTypeIds = vehicles.slice(offset, offset + 5).map((item) => item.id);
    const expected = hotspotIds.length * vehicleTypeIds.length;
    const batch = await api.getParkingChargeRecords({
      page: 1,
      pageSize: 100,
      hotspotIds,
      vehicleTypeIds,
    });

    const keys = new Set(batch.rows.map((row) =>
      row.hotspotId + ":" + row.vehicleTypeId
    ));
    if (
      batch.total !== expected ||
      batch.rows.length !== expected ||
      keys.size !== expected ||
      batch.rows.some((row) =>
        !hotspotIds.includes(row.hotspotId) ||
        !vehicleTypeIds.includes(row.vehicleTypeId)
      )
    ) {
      throw new Error("Incomplete parking charge data received. Please refresh the page.");
    }
    rows.push(...batch.rows);
  }

  // Keep rows grouped by hotspot, with the API's vehicle option order.
  const cells = new Map(rows.map((row) => [
    row.hotspotId + ":" + row.vehicleTypeId, row,
  ]));
  const ordered: typeof metadata.rows = [];
  for (const hotspot of visible) {
    for (const vehicle of vehicles) {
      const row = cells.get(hotspot.id + ":" + vehicle.id);
      if (!row) throw new Error("A parking charge cell is missing. Please refresh.");
      ordered.push(row);
    }
  }
  return { ...result, rows: ordered };
}
