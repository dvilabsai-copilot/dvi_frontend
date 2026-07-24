import { api } from "@/lib/api";

export type HotspotDistanceCacheListItem = {
  id: number;
  fromHotspotId: number;
  toHotspotId: number;
  fromHotspotName: string;
  toHotspotName: string;
 travelLocationType: number; // 1 = Local, 2 = Outstation
  haversineKm: number;
  correctionFactor: number;
  distanceKm: number;
  speedKmph: number;
  travelTime: string;
  method: string;
  createdAt: string;
  updatedAt: string;
};

export type HotspotDistanceCacheFormData = {
  id?: number;
  fromHotspotId: number;
  toHotspotId: number;
 travelLocationType: number; // 1 = Local, 2 = Outstation
  haversineKm: number;
  correctionFactor: number;
  distanceKm: number;
  speedKmph: number;
 travelTime: string; // HH:MM:SS
  method?: string;
};

export type FormOptionsResponse = {
  hotspots: Array<{ id: number; name: string }>;
  travelTypes: Array<{ id: number; name: string }>;
};

export type ListResponse = {
  total: number;
  page: number;
  size: number;
  pages: number;
  rows: HotspotDistanceCacheListItem[];
};

export const hotspotDistanceCacheService = {
 // List with pagination, search, and filters
  async list(params: {
    page?: number;
    size?: number;
    search?: string;
    fromHotspotId?: number;
    toHotspotId?: number;
    travelLocationType?: string;
    sortBy?: string;
    sortOrder?: string;
  } = {}) {
    const query = new URLSearchParams();
    if (params.page) query.append("page", String(params.page));
    if (params.size) query.append("size", String(params.size));
    if (params.search) query.append("search", params.search);
    if (params.fromHotspotId) query.append("fromHotspotId", String(params.fromHotspotId));
    if (params.toHotspotId) query.append("toHotspotId", String(params.toHotspotId));
    if (params.travelLocationType) query.append("travelLocationType", params.travelLocationType);
    if (params.sortBy) query.append("sortBy", params.sortBy);
    if (params.sortOrder) query.append("sortOrder", params.sortOrder);

    return api(`/hotspot-distance-cache?${query.toString()}`, {
      method: "GET",
    }) as Promise<ListResponse>;
  },

 // Get form options (hotspots and travel types)
  async getFormOptions() {
    return api("/hotspot-distance-cache/form-options", {
      method: "GET",
    }) as Promise<FormOptionsResponse>;
  },

 // Get single entry
  async getById(id: number) {
    return api(`/hotspot-distance-cache/${id}`, {
      method: "GET",
    }) as Promise<HotspotDistanceCacheFormData>;
  },

 // Create new entry
  async create(data: Omit<HotspotDistanceCacheFormData, 'id'>) {
    return api("/hotspot-distance-cache", {
      method: "POST",
      body: data,
    }) as Promise<HotspotDistanceCacheFormData>;
  },

 // Update entry
  async update(id: number, data: Partial<HotspotDistanceCacheFormData>) {
    return api(`/hotspot-distance-cache/${id}`, {
      method: "PUT",
      body: data,
    }) as Promise<HotspotDistanceCacheFormData>;
  },

 // Delete entry
  async delete(id: number) {
    await api(`/hotspot-distance-cache/${id}`, {
      method: "DELETE",
    });
  },

 // Bulk delete
  async bulkDelete(ids: number[]) {
    await api("/hotspot-distance-cache/bulk-delete", {
      method: "POST",
      body: { ids },
    });
  },

 // Export to Excel
  async exportExcel(params: {
    fromHotspotId?: number;
    toHotspotId?: number;
    travelType?: string;
    search?: string;
  } = {}) {
    const query = new URLSearchParams();
    if (params.fromHotspotId) query.append("fromHotspotId", String(params.fromHotspotId));
    if (params.toHotspotId) query.append("toHotspotId", String(params.toHotspotId));
    if (params.travelType) query.append("travelType", params.travelType);
    if (params.search) query.append("search", params.search);

    const response = await fetch(`/hotspot-distance-cache/export/excel?${query.toString()}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${localStorage.getItem("accessToken") || ""}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to export");
    }

 // Trigger download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hotspot-distance-cache-${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  }
};
