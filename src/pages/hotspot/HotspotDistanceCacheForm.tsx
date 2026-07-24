import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  hotspotDistanceCacheService,
  HotspotDistanceCacheFormData,
  FormOptionsResponse,
} from "@/services/hotspotDistanceCacheService";
import { toast } from "sonner";

export default function HotspotDistanceCacheForm() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [formOptions, setFormOptions] = useState<FormOptionsResponse | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<HotspotDistanceCacheFormData>({
    id: undefined,
    fromHotspotId: 0,
    toHotspotId: 0,
    travelLocationType: 1,
    haversineKm: 0,
    correctionFactor: 1.5,
    distanceKm: 0,
    speedKmph: 0,
    travelTime: "00:00:00",
    method: "HAVERSINE",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

 // Load form options and existing data (if editing)
  useEffect(() => {
    loadFormOptions();
    if (id) {
      loadExistingData();
    }
  }, [id]);

  async function loadFormOptions() {
    try {
      const options = await hotspotDistanceCacheService.getFormOptions();
      setFormOptions(options);
    } catch (error) {
 console.error("Failed to load form options:", error);
      toast.error("Failed to load form options");
    }
  }

  async function loadExistingData() {
    try {
      setLoading(true);
      const data = await hotspotDistanceCacheService.getById(Number(id));
      setFormData(data);
    } catch (error) {
 console.error("Failed to load record:", error);
      toast.error("Failed to load record");
      navigate("/hotspot-distance-cache");
    } finally {
      setLoading(false);
    }
  }

 // Validation
  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!formData.fromHotspotId || formData.fromHotspotId === 0) {
      newErrors.fromHotspotId = "From Hotspot is required";
    }
    if (!formData.toHotspotId || formData.toHotspotId === 0) {
      newErrors.toHotspotId = "To Hotspot is required";
    }
    if (!formData.travelLocationType) {
      newErrors.travelLocationType = "Travel Type is required";
    }
    if (formData.distanceKm < 0) {
      newErrors.distanceKm = "Distance must be a positive number";
    }
    if (formData.speedKmph < 0) {
      newErrors.speedKmph = "Speed must be a positive number";
    }
    if (!formData.travelTime) {
      newErrors.travelTime = "Time is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

 // Handle submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    try {
      setSubmitting(true);

      if (id) {
 // Update
        await hotspotDistanceCacheService.update(Number(id), formData);
        toast.success("Record updated successfully");
      } else {
 // Create
        await hotspotDistanceCacheService.create(formData);
        toast.success("Record created successfully");
      }

      navigate("/hotspot-distance-cache");
    } catch (error) {
 console.error("Failed to submit form:", error);
      toast.error(id ? "Failed to update record" : "Failed to create record");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
 {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/hotspot-distance-cache")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-primary">
          {id ? "Edit Record" : "Add New Record"}
        </h1>
      </div>

 {/* Form */}
      <div className="bg-white rounded-lg border p-6 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* From Hotspot */}
            <div className="space-y-2">
              <Label htmlFor="fromHotspotId" className="text-sm font-semibold">
                From Hotspot <span className="text-red-500">*</span>
              </Label>
              <Select
                value={String(formData.fromHotspotId || "")}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    fromHotspotId: Number(value),
                  })
                }
              >
                <SelectTrigger
                  id="fromHotspotId"
                  className={errors.fromHotspotId ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select hotspot" />
                </SelectTrigger>
                <SelectContent>
                  {formOptions?.hotspots.map((h) => (
                    <SelectItem key={h.id} value={String(h.id)}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.fromHotspotId && (
                <p className="text-xs text-red-500">{errors.fromHotspotId}</p>
              )}
            </div>

 {/* To Hotspot */}
            <div className="space-y-2">
              <Label htmlFor="toHotspotId" className="text-sm font-semibold">
                To Hotspot <span className="text-red-500">*</span>
              </Label>
              <Select
                value={String(formData.toHotspotId || "")}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    toHotspotId: Number(value),
                  })
                }
              >
                <SelectTrigger
                  id="toHotspotId"
                  className={errors.toHotspotId ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select hotspot" />
                </SelectTrigger>
                <SelectContent>
                  {formOptions?.hotspots.map((h) => (
                    <SelectItem key={h.id} value={String(h.id)}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.toHotspotId && (
                <p className="text-xs text-red-500">{errors.toHotspotId}</p>
              )}
            </div>

 {/* Travel Type */}
            <div className="space-y-2">
              <Label htmlFor="travelLocationType" className="text-sm font-semibold">
                Travel Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={String(formData.travelLocationType || 1)}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    travelLocationType: Number(value),
                  })
                }
              >
                <SelectTrigger
                  id="travelLocationType"
                  className={errors.travelLocationType ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="Select travel type" />
                </SelectTrigger>
                <SelectContent>
                  {formOptions?.travelTypes.map((type) => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.travelLocationType && (
                <p className="text-xs text-red-500">{errors.travelLocationType}</p>
              )}
            </div>

 {/* Distance KM */}
            <div className="space-y-2">
              <Label htmlFor="distanceKm" className="text-sm font-semibold">
                Distance (KM) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="distanceKm"
                type="number"
                step="0.01"
                min="0"
                value={formData.distanceKm || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    distanceKm: parseFloat(e.target.value) || 0,
                  })
                }
                className={errors.distanceKm ? "border-red-500" : ""}
                placeholder="0.00"
              />
              {errors.distanceKm && (
                <p className="text-xs text-red-500">{errors.distanceKm}</p>
              )}
            </div>

 {/* Haversine KM */}
            <div className="space-y-2">
              <Label htmlFor="haversineKm" className="text-sm font-semibold">
                Haversine Distance (KM) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="haversineKm"
                type="number"
                step="0.01"
                min="0"
                value={formData.haversineKm || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    haversineKm: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0.00"
              />
            </div>

 {/* Speed KMPH */}
            <div className="space-y-2">
              <Label htmlFor="speedKmph" className="text-sm font-semibold">
                Speed (KM/H) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="speedKmph"
                type="number"
                step="0.01"
                min="0"
                value={formData.speedKmph || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    speedKmph: parseFloat(e.target.value) || 0,
                  })
                }
                className={errors.speedKmph ? "border-red-500" : ""}
                placeholder="0.00"
              />
              {errors.speedKmph && (
                <p className="text-xs text-red-500">{errors.speedKmph}</p>
              )}
            </div>

 {/* Travel Time */}
            <div className="space-y-2">
              <Label htmlFor="travelTime" className="text-sm font-semibold">
                Travel Time (HH:MM:SS) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="travelTime"
                type="text"
                value={formData.travelTime || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    travelTime: e.target.value,
                  })
                }
                className={errors.travelTime ? "border-red-500" : ""}
                placeholder="00:00:00"
              />
              {errors.travelTime && (
                <p className="text-xs text-red-500">{errors.travelTime}</p>
              )}
            </div>

 {/* Correction Factor */}
            <div className="space-y-2">
              <Label htmlFor="correctionFactor" className="text-sm font-semibold">
                Correction Factor <span className="text-gray-400 text-xs">(Default: 1.5)</span>
              </Label>
              <Input
                id="correctionFactor"
                type="number"
                step="0.01"
                min="0"
                value={formData.correctionFactor || 1.5}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    correctionFactor: parseFloat(e.target.value) || 1.5,
                  })
                }
                placeholder="1.5"
              />
            </div>

 {/* Method */}
            <div className="space-y-2">
              <Label htmlFor="method" className="text-sm font-semibold">
                Method <span className="text-gray-400 text-xs">(Default: HAVERSINE)</span>
              </Label>
              <Input
                id="method"
                type="text"
                value={formData.method || "HAVERSINE"}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    method: e.target.value,
                  })
                }
                placeholder="HAVERSINE"
              />
            </div>
          </div>

 {/* Submit Buttons */}
          <div className="flex gap-3 pt-6 border-t">
            <Button
              type="submit"
              className="bg-violet-600 hover:bg-violet-700"
              disabled={submitting}
            >
              {submitting ? "Saving..." : id ? "Update" : "Create"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/hotspot-distance-cache")}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
