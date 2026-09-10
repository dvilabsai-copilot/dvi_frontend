// FILE: src/pages/Settings/GlobalSettings.tsx

import { useCallback, useEffect, useRef, useState, lazy, Suspense } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getGlobalSettings,
  updateGlobalSettings,
  getStates,
  getStateConfig,
  updateStateConfig,
  getGlobalSettingsCities,
  getExtraMarginRules,
  createExtraMarginRule,
  updateExtraMarginRule,
  deleteExtraMarginRule,
  type GlobalSettings,
  type State,
  type GlobalSettingsCity,
  type ExtraMarginRule,
  type ExtraMarginRuleInput,
} from "@/services/GlobalSettingsService";
const RichTextEditor = lazy(() =>
  import("@/components/ui/rich-text-editor").then(
    (module) => ({
      default: module.RichTextEditor,
    }),
  ),
);

const EMPTY_EXTRA_MARGIN_RULE: ExtraMarginRuleInput = {
  source_city_id: 0,
  destination_city_id: 0,
  min_nights: 1,
  max_nights: 2,
  adjustment_type: "percentage",
  adjustment_value: 0,
  application_mode: "override",
  priority: 0,
  status: 1,
};

export const GlobalSettingsPage = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
    const [settings, setSettings] =
    useState<GlobalSettings | null>(null);

  const [states, setStates] = useState<State[]>([]);

  const [cities, setCities] =
    useState<GlobalSettingsCity[]>([]);

  const [extraMarginRules, setExtraMarginRules] =
    useState<ExtraMarginRule[]>([]);

  const [ruleForm, setRuleForm] =
    useState<ExtraMarginRuleInput>({
      ...EMPTY_EXTRA_MARGIN_RULE,
    });

  const [editingRuleId, setEditingRuleId] =
    useState<number | null>(null);

  const [ruleSaving, setRuleSaving] =
    useState(false);
  const commonBufferTimeRef = useRef<HTMLInputElement>(null);
  const flightBufferTimeRef = useRef<HTMLInputElement>(null);
  const trainBufferTimeRef = useRef<HTMLInputElement>(null);
  const roadBufferTimeRef = useRef<HTMLInputElement>(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getGlobalSettings();
      setSettings(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load global settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadStates = useCallback(async () => {
    try {
      const data = await getStates();
      setStates(data);
    } catch (error) {
      console.error("Failed to load states", error);
    }
  }, []);

  const handleStateChange = async (stateId: string) => {
    const selectedState = states.find((state) => state.id === stateId);
    setSettings((current) => current ? {
      ...current,
      state_id: stateId,
      state_name: selectedState?.name || "",
      onground_support_number: "",
      escalation_call_number: "",
    } : current);

    try {
      const config = await getStateConfig(stateId);
      setSettings((current) => current ? {
        ...current,
        state_id: String(config.stateId),
        state_name: config.stateName,
        onground_support_number: config.vehicleOngroundSupportNumber || "",
        escalation_call_number: config.vehicleEscalationCallNumber || "",
      } : current);
    } catch (error) {
      console.error("Failed to load state configuration", error);
    }
  };

  const loadExtraMarginData =
    useCallback(async () => {
      try {
        const [cityRows, ruleRows] =
          await Promise.all([
            getGlobalSettingsCities(),
            getExtraMarginRules(),
          ]);

        setCities(cityRows);
        setExtraMarginRules(ruleRows);
      } catch (error) {
        console.error(
          "Failed to load extra margin settings",
          error,
        );
      }
    }, []);

  useEffect(() => {
    void loadSettings();
    void loadStates();
    void loadExtraMarginData();
  }, [
    loadSettings,
    loadStates,
    loadExtraMarginData,
  ]);

    const resetExtraMarginRuleForm = () => {
    setEditingRuleId(null);
    setRuleForm({
      ...EMPTY_EXTRA_MARGIN_RULE,
    });
  };

  const handleSaveExtraMarginRule = async () => {
    if (
      !ruleForm.source_city_id ||
      !ruleForm.destination_city_id
    ) {
      toast({
        title: "Validation Error",
        description:
          "Please select both origin and destination city",
        variant: "destructive",
      });
      return;
    }

    if (
      ruleForm.source_city_id ===
      ruleForm.destination_city_id
    ) {
      toast({
        title: "Validation Error",
        description:
          "Origin and destination city cannot be the same",
        variant: "destructive",
      });
      return;
    }

    if (
      ruleForm.min_nights < 1 ||
      ruleForm.max_nights < ruleForm.min_nights
    ) {
      toast({
        title: "Validation Error",
        description:
          "Maximum nights must be greater than or equal to minimum nights",
        variant: "destructive",
      });
      return;
    }

    if (
      ruleForm.adjustment_type === "percentage" &&
      ruleForm.adjustment_value > 100
    ) {
      toast({
        title: "Validation Error",
        description:
          "Percentage cannot be greater than 100",
        variant: "destructive",
      });
      return;
    }

    try {
      setRuleSaving(true);

      if (editingRuleId) {
        await updateExtraMarginRule(
          editingRuleId,
          ruleForm,
        );
      } else {
        await createExtraMarginRule(ruleForm);
      }

      await loadExtraMarginData();
      resetExtraMarginRuleForm();

      toast({
        description: editingRuleId
          ? "Extra margin rule updated successfully"
          : "Extra margin rule added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          "Failed to save extra margin rule",
        variant: "destructive",
      });
    } finally {
      setRuleSaving(false);
    }
  };

  const handleEditExtraMarginRule = (
    rule: ExtraMarginRule,
  ) => {
    setEditingRuleId(rule.rule_id);

    setRuleForm({
      source_city_id: rule.source_city_id,
      destination_city_id:
        rule.destination_city_id,
      min_nights: rule.min_nights,
      max_nights: rule.max_nights,
      adjustment_type: rule.adjustment_type,
      adjustment_value: rule.adjustment_value,
      application_mode: rule.application_mode,
      priority: rule.priority,
      status: rule.status === 0 ? 0 : 1,
    });
  };

  const handleDeleteExtraMarginRule = async (
    ruleId: number,
  ) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this extra margin rule?",
    );

    if (!confirmed) return;

    try {
      await deleteExtraMarginRule(ruleId);
      await loadExtraMarginData();

      if (editingRuleId === ruleId) {
        resetExtraMarginRuleForm();
      }

      toast({
        description:
          "Extra margin rule deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          "Failed to delete extra margin rule",
        variant: "destructive",
      });
    }
  };
  const handleSave = async () => {
    if (!settings) return;

    try {
      const settingsToSave = {
        ...settings,
        common_buffer_time: commonBufferTimeRef.current?.value ?? settings.common_buffer_time,
        flight_buffer_time: flightBufferTimeRef.current?.value ?? settings.flight_buffer_time,
        train_buffer_time: trainBufferTimeRef.current?.value ?? settings.train_buffer_time,
        road_buffer_time: roadBufferTimeRef.current?.value ?? settings.road_buffer_time,
      };
      setSaving(true);
      await updateGlobalSettings(settingsToSave);
      if (settingsToSave.state_id) {
        await updateStateConfig({
          stateId: settingsToSave.state_id,
          vehicleOngroundSupportNumber: settingsToSave.onground_support_number || null,
          vehicleEscalationCallNumber: settingsToSave.escalation_call_number || null,
        });
      }
      toast({
        description: "Global settings updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!settings) {
    return <div className="p-6">No settings found</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Global Settings</h1>
      </div>

      <div className="space-y-6">
        {/* State Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-pink-600">State Configuration</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="global-state-name">State Name *</Label>
              <Select
                value={settings.state_id || ""}
                onValueChange={(value) => void handleStateChange(value)}
              >
                <SelectTrigger id="global-state-name">
                  <SelectValue placeholder="Select State" />
                </SelectTrigger>
                <SelectContent>
                  {states.map((state) => (
                    <SelectItem key={state.id} value={state.id}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="global-onground-support-number">On Ground Support Number *</Label>
              <Input
                id="global-onground-support-number"
                value={settings.onground_support_number || ""}
                onChange={(e) => setSettings({ ...settings, onground_support_number: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="global-escalation-call-number">Escalation Call Number *</Label>
              <Input
                id="global-escalation-call-number"
                value={settings.escalation_call_number || ""}
                onChange={(e) => setSettings({ ...settings, escalation_call_number: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Hotel API Configurations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-pink-600">Hotel API Configurations</CardTitle>
            <CardDescription>VSR Hotel Eligible Countries</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="global-tbo-eligible-country">Choosen Country *</Label>
              <Input
                id="global-tbo-eligible-country"
                value={settings.tbo_eligible_country || ""}
                onChange={(e) => setSettings({ ...settings, tbo_eligible_country: e.target.value })}
                placeholder="India"
              />
            </div>
          </CardContent>
        </Card>

        {/* Extra Occupancy */}
        <Card>
          <CardHeader>
            <CardTitle className="text-pink-600">Extra Occupancy</CardTitle>
            <CardDescription>(rate calculated as a percentage of the room tariff - applicable for Extra Bed, Child with Bed, or Child without Bed)</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Extrabed Rate Percentage *</Label>
              <Input
                type="number"
                value={settings.extrabed_rate_percentage || 0}
                onChange={(e) => setSettings({ ...settings, extrabed_rate_percentage: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Child With Bed Rate Percentage *</Label>
              <Input
                type="number"
                value={settings.childwithbed_rate_percentage || 0}
                onChange={(e) => setSettings({ ...settings, childwithbed_rate_percentage: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Child No Bed Rate Percentage *</Label>
              <Input
                type="number"
                value={settings.child_nobed_rate_percentage || 0}
                onChange={(e) => setSettings({ ...settings, child_nobed_rate_percentage: Number(e.target.value) })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Hotel Default Margin */}
        <Card>
          <CardHeader>
            <CardTitle className="text-pink-600">Hotel Default Margin</CardTitle>
            <CardDescription>(If no pricebook data is available for the selected date (within 365 days), this default configuration will be applied)</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Hotel Margin (In Percentage) *</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={settings.hotel_margin_in_percentage || 0}
                onChange={(e) => setSettings({ ...settings, hotel_margin_in_percentage: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Hotel Margin GST Type *</Label>
              <Select
                value={settings.hotel_margin_gst_type ? "true" : "false"}
                onValueChange={(value) => setSettings({ ...settings, hotel_margin_gst_type: value === "true" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Included</SelectItem>
                  <SelectItem value="false">Excluded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Hotel Margin GST Percentage *</Label>
              <Select
                value={String(settings.hotel_margin_gst_percentage || 0)}
                onValueChange={(value) => setSettings({ ...settings, hotel_margin_gst_percentage: Number(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0% GST - %0</SelectItem>
                  <SelectItem value="5">5% GST - %5</SelectItem>
                  <SelectItem value="12">12% GST - %12</SelectItem>
                  <SelectItem value="18">18% GST - %18</SelectItem>
                  <SelectItem value="28">28% GST - %28</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Itinerary Distance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-pink-600">Itinerary Distance</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Distance Limit (Between Locations) *</Label>
              <Input
                type="number"
                value={settings.itinerary_distance_limit || 600}
                onChange={(e) => setSettings({ ...settings, itinerary_distance_limit: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Allowed KM (Per Day) *</Label>
              <Input
                type="number"
                value={settings.allowed_km_per_day || 450}
                onChange={(e) => setSettings({ ...settings, allowed_km_per_day: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Common Buffer Time *</Label>
              <Input
                type="time"
                ref={commonBufferTimeRef}
                defaultValue={settings.common_buffer_time || "01:00"}
                onChange={(e) => setSettings({ ...settings, common_buffer_time: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Site Seeing KM Limit Restriction */}
        <Card>
          <CardHeader>
            <CardTitle className="text-pink-600">Site Seeing KM Limit Restriction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-xs">
              <Label>Distance Limit (Between Locations) *</Label>
              <Input
                type="number"
                value={settings.site_seeing_km_limit || 25}
                onChange={(e) => setSettings({ ...settings, site_seeing_km_limit: Number(e.target.value) })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Itinerary Travel Buffer Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-pink-600">Itinerary Travel Buffer Time</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Flight Buffer Time *</Label>
              <Input
                type="time"
                ref={flightBufferTimeRef}
                defaultValue={settings.flight_buffer_time || "02:00"}
                onChange={(e) => setSettings({ ...settings, flight_buffer_time: e.target.value })}
              />
            </div>
            <div>
              <Label>Train Buffer Time *</Label>
              <Input
                type="time"
                ref={trainBufferTimeRef}
                defaultValue={settings.train_buffer_time || "01:00"}
                onChange={(e) => setSettings({ ...settings, train_buffer_time: e.target.value })}
              />
            </div>
            <div>
              <Label>Road Buffer Time *</Label>
              <Input
                type="time"
                ref={roadBufferTimeRef}
                defaultValue={settings.road_buffer_time || "01:00"}
                onChange={(e) => setSettings({ ...settings, road_buffer_time: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Itinerary Customize Text */}
        <Card>
          <CardHeader>
            <CardTitle className="text-pink-600">Itinerary Customize Text</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Journey Start *</Label>
                <Input
                  value={settings.journey_start_text || ""}
                  onChange={(e) => setSettings({ ...settings, journey_start_text: e.target.value })}
                  placeholder="Start you Journey"
                />
              </div>
              <div>
                <Label>In-Between Day Start (Including Last Day) *</Label>
                <Input
                  value={settings.between_day_start_text || ""}
                  onChange={(e) => setSettings({ ...settings, between_day_start_text: e.target.value })}
                  placeholder="Start Your Day"
                />
              </div>
              <div>
                <Label>In-Between Day End (Including Last Day) *</Label>
                <Input
                  value={settings.between_day_end_text || ""}
                  onChange={(e) => setSettings({ ...settings, between_day_end_text: e.target.value })}
                  placeholder="Return to Origin and Relax"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hotel Terms and Condition *</Label>
                <Suspense fallback={<div className="h-48 border rounded bg-gray-50 animate-pulse" />}>
                  <RichTextEditor
                    value={settings.hotel_terms_condition || ""}
                    onChange={(value) => setSettings({ ...settings, hotel_terms_condition: value })}
                    placeholder="Enter hotel terms and conditions..."
                  />
                </Suspense>
              </div>
              <div className="space-y-2">
                <Label>Vehicle Terms and Condition *</Label>
                <Suspense fallback={<div className="h-48 border rounded bg-gray-50 animate-pulse" />}>
                  <RichTextEditor
                    value={settings.vehicle_terms_condition || ""}
                    onChange={(value) => setSettings({ ...settings, vehicle_terms_condition: value })}
                    placeholder="Enter vehicle terms and conditions..."
                  />
                </Suspense>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hotel Voucher Terms and Condition *</Label>
                <Suspense fallback={<div className="h-48 border rounded bg-gray-50 animate-pulse" />}>
                  <RichTextEditor
                    value={settings.hotel_voucher_terms || ""}
                    onChange={(value) => setSettings({ ...settings, hotel_voucher_terms: value })}
                    placeholder="Enter hotel voucher terms and conditions..."
                  />
                </Suspense>
              </div>
              <div className="space-y-2">
                <Label>Vehicle Voucher Terms and Condition *</Label>
                <Suspense fallback={<div className="h-48 border rounded bg-gray-50 animate-pulse" />}>
                  <RichTextEditor
                    value={settings.vehicle_voucher_terms || ""}
                    onChange={(value) => setSettings({ ...settings, vehicle_voucher_terms: value })}
                    placeholder="Enter vehicle voucher terms and conditions..."
                  />
                </Suspense>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Itinerary Travel Speed */}
        <Card>
          <CardHeader>
            <CardTitle className="text-pink-600">Itinerary Travel Speed</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Local travel speed limit (KM/Hr) *</Label>
              <Input
                type="number"
                value={settings.local_travel_speed_limit || 40}
                onChange={(e) => setSettings({ ...settings, local_travel_speed_limit: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Outstation travel speed limit (KM/Hr) *</Label>
              <Input
                type="number"
                value={settings.outstation_travel_speed_limit || 60}
                onChange={(e) => setSettings({ ...settings, outstation_travel_speed_limit: Number(e.target.value) })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Itinerary Additional Margin Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-pink-600">
              Itinerary Additional Margin Settings
            </CardTitle>

            <CardDescription>
              Configure the default short-itinerary margin
              and destination-specific extra margin rules.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Default additional margin */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">
                Default Rule
              </h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label>
                    Additional Margin Percentage *
                  </Label>

                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={
                      settings.additional_margin_percentage ??
                      10
                    }
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        additional_margin_percentage:
                          Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div>
                  <Label>
                    Additional Margin Applicable Day
                    Limit (Days) *
                  </Label>

                  <Input
                    type="number"
                    min={0}
                    value={
                      settings.additional_margin_day_limit ??
                      3
                    }
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        additional_margin_day_limit:
                          Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Destination rules */}
            <div className="border-t pt-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold">
                  Destination Specific Extra Margin Rules
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  Apply a percentage or fixed hike based
                  on origin, destination and number of
                  nights.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label>Ex / Origin City *</Label>

                  <Select
                    value={
                      ruleForm.source_city_id
                        ? String(
                            ruleForm.source_city_id,
                          )
                        : ""
                    }
                    onValueChange={(value) =>
                      setRuleForm({
                        ...ruleForm,
                        source_city_id:
                          Number(value),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Origin" />
                    </SelectTrigger>

                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem
                          key={city.id}
                          value={String(city.id)}
                        >
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Destination *</Label>

                  <Select
                    value={
                      ruleForm.destination_city_id
                        ? String(
                            ruleForm.destination_city_id,
                          )
                        : ""
                    }
                    onValueChange={(value) =>
                      setRuleForm({
                        ...ruleForm,
                        destination_city_id:
                          Number(value),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Destination" />
                    </SelectTrigger>

                    <SelectContent>
                      {cities.map((city) => (
                        <SelectItem
                          key={city.id}
                          value={String(city.id)}
                          disabled={
                            city.id ===
                            ruleForm.source_city_id
                          }
                        >
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Minimum Nights *</Label>

                  <Input
                    type="number"
                    min={1}
                    value={ruleForm.min_nights}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        min_nights:
                          Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div>
                  <Label>Maximum Nights *</Label>

                  <Input
                    type="number"
                    min={1}
                    value={ruleForm.max_nights}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        max_nights:
                          Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div>
                  <Label>Hike Type *</Label>

                  <Select
                    value={ruleForm.adjustment_type}
                    onValueChange={(
                      value:
                        | "percentage"
                        | "fixed_amount",
                    ) =>
                      setRuleForm({
                        ...ruleForm,
                        adjustment_type: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="percentage">
                        Percentage
                      </SelectItem>

                      <SelectItem value="fixed_amount">
                        Fixed Amount
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>
                    {ruleForm.adjustment_type ===
                    "percentage"
                      ? "Hike Percentage *"
                      : "Hike Amount (₹) *"}
                  </Label>

                  <Input
                    type="number"
                    min={0}
                    step={
                      ruleForm.adjustment_type ===
                      "percentage"
                        ? "0.01"
                        : "1"
                    }
                    value={ruleForm.adjustment_value}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        adjustment_value:
                          Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div>
                  <Label>Application Mode *</Label>

                  <Select
                    value={ruleForm.application_mode}
                    onValueChange={(
                      value: "add" | "override",
                    ) =>
                      setRuleForm({
                        ...ruleForm,
                        application_mode: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="override">
                        Override Default
                      </SelectItem>

                      <SelectItem value="add">
                        Add on Top
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Status *</Label>

                  <Select
                    value={String(ruleForm.status)}
                    onValueChange={(value) =>
                      setRuleForm({
                        ...ruleForm,
                        status:
                          Number(value) === 0
                            ? 0
                            : 1,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="1">
                        Active
                      </SelectItem>

                      <SelectItem value="0">
                        Inactive
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Priority</Label>

                  <Input
                    type="number"
                    min={0}
                    value={ruleForm.priority}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        priority:
                          Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  type="button"
                  onClick={
                    handleSaveExtraMarginRule
                  }
                  disabled={ruleSaving}
                >
                  {ruleSaving
                    ? "Saving..."
                    : editingRuleId
                      ? "Update Rule"
                      : "Add Extra Margin Rule"}
                </Button>

                {editingRuleId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={
                      resetExtraMarginRuleForm
                    }
                  >
                    Cancel
                  </Button>
                )}
              </div>

              <div className="mt-6 overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-3 text-left">
                        Ex City
                      </th>

                      <th className="p-3 text-left">
                        Destination
                      </th>

                      <th className="p-3 text-left">
                        Nights
                      </th>

                      <th className="p-3 text-left">
                        Hike
                      </th>

                      <th className="p-3 text-left">
                        Mode
                      </th>

                      <th className="p-3 text-left">
                        Priority
                      </th>

                      <th className="p-3 text-left">
                        Status
                      </th>

                      <th className="p-3 text-left">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {extraMarginRules.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="p-4 text-center text-muted-foreground"
                        >
                          No destination specific
                          extra margin rules configured.
                        </td>
                      </tr>
                    ) : (
                      extraMarginRules.map((rule) => (
                        <tr
                          key={rule.rule_id}
                          className="border-t"
                        >
                          <td className="p-3">
                            {rule.source_city_name ||
                              rule.source_city_id}
                          </td>

                          <td className="p-3">
                            {rule.destination_city_name ||
                              rule.destination_city_id}
                          </td>

                          <td className="p-3">
                            {rule.min_nights ===
                            rule.max_nights
                              ? `${rule.min_nights} Night`
                              : `${rule.min_nights}-${rule.max_nights} Nights`}
                          </td>

                          <td className="p-3 font-medium">
                            {rule.adjustment_type ===
                            "percentage"
                              ? `${rule.adjustment_value}%`
                              : `₹${Number(
                                  rule.adjustment_value,
                                ).toLocaleString(
                                  "en-IN",
                                )}`}
                          </td>

                          <td className="p-3">
                            {rule.application_mode ===
                            "add"
                              ? "Add"
                              : "Override"}
                          </td>

                          <td className="p-3">
                            {rule.priority}
                          </td>

                          <td className="p-3">
                            {rule.status === 1
                              ? "Active"
                              : "Inactive"}
                          </td>

                          <td className="p-3">
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleEditExtraMarginRule(
                                    rule,
                                  )
                                }
                              >
                                Edit
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  void handleDeleteExtraMarginRule(
                                    rule.rule_id,
                                  )
                                }
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agent Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-pink-600">Agent Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-xs">
              <Label>Referral Bonus Credit *</Label>
              <Input
                type="number"
                value={settings.referral_bonus_credit || 20}
                onChange={(e) => setSettings({ ...settings, referral_bonus_credit: Number(e.target.value) })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Site Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-pink-600">Site Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Site Title *</Label>
                <Input
                  value={settings.site_title || ""}
                  onChange={(e) => setSettings({ ...settings, site_title: e.target.value })}
                />
              </div>
              <div>
                <Label>Company Name *</Label>
                <Input
                  value={settings.company_name || ""}
                  onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Address *</Label>
                <Input
                  value={settings.address || ""}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Pincode *</Label>
                <Input
                  value={settings.pincode || ""}
                  onChange={(e) => setSettings({ ...settings, pincode: e.target.value })}
                />
              </div>
              <div>
                <Label>GSTIN No. *</Label>
                <Input
                  value={settings.gstin_no || ""}
                  onChange={(e) => setSettings({ ...settings, gstin_no: e.target.value })}
                />
              </div>
              <div>
                <Label>PAN No. *</Label>
                <Input
                  value={settings.pan_no || ""}
                  onChange={(e) => setSettings({ ...settings, pan_no: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Contact No. *</Label>
                <Input
                  value={settings.contact_no || ""}
                  onChange={(e) => setSettings({ ...settings, contact_no: e.target.value })}
                />
              </div>
              <div>
                <Label>Email ID *</Label>
                <Input
                  type="email"
                  value={settings.email_id || ""}
                  onChange={(e) => setSettings({ ...settings, email_id: e.target.value })}
                />
              </div>
              <div>
                <Label>CC Email ID *</Label>
                <Input
                  type="email"
                  value={settings.cc_email_id || ""}
                  onChange={(e) => setSettings({ ...settings, cc_email_id: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Hotel Voucher Default Email ID *</Label>
                <Input
                  type="email"
                  value={settings.hotel_voucher_email || ""}
                  onChange={(e) => setSettings({ ...settings, hotel_voucher_email: e.target.value })}
                />
              </div>
              <div>
                <Label>Vehicle Voucher Default Email ID *</Label>
                <Input
                  type="email"
                  value={settings.vehicle_voucher_email || ""}
                  onChange={(e) => setSettings({ ...settings, vehicle_voucher_email: e.target.value })}
                />
              </div>
              <div>
                <Label>Accounts Default Email ID *</Label>
                <Input
                  type="email"
                  value={settings.accounts_email || ""}
                  onChange={(e) => setSettings({ ...settings, accounts_email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Hotel HSN *</Label>
                <Input
                  value={settings.hotel_hsn || ""}
                  onChange={(e) => setSettings({ ...settings, hotel_hsn: e.target.value })}
                />
              </div>
              <div>
                <Label>Vehicle HSN *</Label>
                <Input
                  value={settings.vehicle_hsn || ""}
                  onChange={(e) => setSettings({ ...settings, vehicle_hsn: e.target.value })}
                />
              </div>
              <div>
                <Label>Guide + Hotspot + Activity HSN *</Label>
                <Input
                  value={settings.guide_hotspot_activity_hsn || ""}
                  onChange={(e) => setSettings({ ...settings, guide_hotspot_activity_hsn: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Logo</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Handle file upload
                      console.log("File selected:", file);
                    }
                  }}
                />
                {settings.logo_path && (
                  <a
                    href={settings.logo_path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600"
                  >
                    View
                  </a>
                )}
              </div>
              <div>
                <Label>CIN Number *</Label>
                <Input
                  value={settings.cin_number || ""}
                  onChange={(e) => setSettings({ ...settings, cin_number: e.target.value })}
                />
              </div>
              <div>
                <Label>YouTube Link *</Label>
                <Input
                  type="url"
                  value={settings.youtube_link || ""}
                  onChange={(e) => setSettings({ ...settings, youtube_link: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Facebook Link *</Label>
                <Input
                  type="url"
                  value={settings.facebook_link || ""}
                  onChange={(e) => setSettings({ ...settings, facebook_link: e.target.value })}
                />
              </div>
              <div>
                <Label>Instagram Link *</Label>
                <Input
                  type="url"
                  value={settings.instagram_link || ""}
                  onChange={(e) => setSettings({ ...settings, instagram_link: e.target.value })}
                />
              </div>
              <div>
                <Label>LinkedIn Link *</Label>
                <Input
                  type="url"
                  value={settings.linkedin_link || ""}
                  onChange={(e) => setSettings({ ...settings, linkedin_link: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Account Holder Name *</Label>
                <Input
                  value={settings.account_holder_name || ""}
                  onChange={(e) => setSettings({ ...settings, account_holder_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Account Number *</Label>
                <Input
                  value={settings.account_number || ""}
                  onChange={(e) => setSettings({ ...settings, account_number: e.target.value })}
                />
              </div>
              <div>
                <Label>IFSC Code *</Label>
                <Input
                  value={settings.ifsc_code || ""}
                  onChange={(e) => setSettings({ ...settings, ifsc_code: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Bank Name *</Label>
                <Input
                  value={settings.bank_name || ""}
                  onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Branch Name *</Label>
                <Input
                  value={settings.branch_name || ""}
                  onChange={(e) => setSettings({ ...settings, branch_name: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center pt-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
          >
            {saving ? "Updating..." : "Update"}
          </Button>
        </div>
      </div>
    </div>
  );
};
