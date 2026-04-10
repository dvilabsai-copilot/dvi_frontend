import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  fetchGuideOptions,
  getGuidePreview,
  type GuidePreviewResponse,
  type OptionsResponse,
} from "@/services/guideService";

function fmtDateDDMMYYYY(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function Section({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
      <h2 className="text-xl font-semibold text-fuchsia-700 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="py-3">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-gray-800">{value ?? <span className="text-gray-400">—</span>}</div>
    </div>
  );
}

export default function GuidePreview() {
  const { id } = useParams<{ id: string }>();
  const guideId = Number(id);
  const nav = useNavigate();

  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<GuidePreviewResponse | null>(null);
  const [options, setOptions] = React.useState<OptionsResponse | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const [preview, opts] = await Promise.all([
          getGuidePreview(guideId),
          fetchGuideOptions(),
        ]);
        if (!alive) return;
        setData(preview);
        setOptions(opts);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    }
    if (Number.isFinite(guideId) && guideId > 0) load();
    return () => { alive = false; };
  }, [guideId]);

  // Prefer server-provided labels; fallback to old client logic if absent
  const stateName =
    (data as any)?.view?.state_name ??
    options?.states.find((s) => s.id === Number(data?.basic.guide_state))?.name ??
    "";

  const countryName =
    (data as any)?.view?.country_name ??
    (() => {
      if (!options?.states) return "";
      const st = options.states.find((s) => s.id === Number(data?.basic.guide_state));
      if (!st) return "";
      return st.countryId === 1 ? "India" : String(st.countryId);
    })();

  const cityName =
    (data as any)?.view?.city_name ?? String(data?.basic?.guide_city ?? "");

  const dobText =
    (data as any)?.view?.dob_text ||
    (data?.basic?.guide_dob ? fmtDateDDMMYYYY(data.basic.guide_dob as any) : "");

  const genderText =
    (data as any)?.view?.gender_label ??
    (data?.basic?.guide_gender === 1
      ? "Male"
      : data?.basic?.guide_gender === 2
      ? "Female"
      : data?.basic?.guide_gender === 3
      ? "Other"
      : "");

  const bloodText = (data as any)?.view?.blood_group_label ?? (data?.basic?.guide_bloodgroup ?? "");

  const languageText =
    (data as any)?.view?.language_label ??
    (typeof data?.basic?.guide_language_proficiency === "string"
      ? data?.basic?.guide_language_proficiency
      : "");

  const gstText =
    (data as any)?.view?.gst_percent_text ??
    ((data?.basic as any)?.guide_gst ? `${(data?.basic as any).guide_gst}%` : "");

  const preferredArray = Array.isArray(data?.preferredFor) ? data!.preferredFor : [];
  const preferredValueRaw = preferredArray[0] ?? "";
  const preferredValueNum = Number(preferredValueRaw);
  const preferredIsHotspot = preferredValueRaw === "1" || preferredValueNum === 1 || preferredArray.includes("hotspot");
  const preferredIsActivity = preferredValueRaw === "2" || preferredValueNum === 2 || preferredArray.includes("activity");
  const itineraryChecked =
    preferredArray.includes("itinerary") ||
    preferredArray.includes("3") ||
    (preferredArray as any).includes(3);

  const preferredLabel =
    (data as any)?.view?.preferred_for_label ??
    (preferredIsHotspot ? "Hotspot" : preferredIsActivity ? "Activity" : itineraryChecked ? "Itinerary" : "");

  const preferredValueText = preferredIsHotspot
    ? ((data as any)?.view?.hotspot_places_label ?? "")
    : preferredIsActivity
    ? ((data as any)?.view?.activity_places_label ?? "")
    : "";

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold">
            Preview Guide <span className="text-gray-400">»</span>{" "}
            <span className="text-fuchsia-700">{data?.basic.guide_name ?? ""}</span>
          </h1>
        </div>

        {loading && (
          <div className="animate-pulse space-y-4">
            <div className="h-28 bg-gray-100 rounded-xl" />
            <div className="h-40 bg-gray-100 rounded-xl" />
            <div className="h-28 bg-gray-100 rounded-xl" />
          </div>
        )}

        {err && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 mb-6">
            {err}
          </div>
        )}

        {!loading && data && (
          <>
            {/* Basic Info */}
            <Section title="Basic Info">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Row label="Guide Name" value={data.basic.guide_name} />
                <Row label="Date of Birth" value={dobText} />
                <Row label="Blood Group" value={bloodText} />

                <Row label="Gender" value={genderText} />
                <Row label="Primary Mobile Number" value={data.basic.guide_primary_mobile_number} />
                <Row label="Alternative Mobile Number" value={data.basic.guide_alternative_mobile_number} />

                <Row label="Email ID" value={data.basic.guide_email} />
                <Row label="Emergency Mobile Number" value={data.basic.guide_emergency_mobile_number} />
                <Row label="Language Preference" value={languageText} />

                <Row label="Aadhar Card Number" value={data.basic.guide_aadhar_number} />
                <Row label="Experience" value={data.basic.guide_experience} />
                <Row label="Country" value={countryName} />

                <Row label="State" value={stateName} />
                <Row label="City" value={cityName} />
                <Row label="GST%" value={gstText} />

                <div className="md:col-span-2 lg:col-span-3">
                  <Row
                    label="Guide Available Slots"
                    value={data.slots && data.slots.length ? data.slots.join(", ") : ""}
                  />
                </div>
              </div>
            </Section>

            {/* Bank Details */}
            <Section title="Bank Details">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Row label="Bank Name" value={(data.basic as any).guide_bank_name ?? ""} />
                <Row label="Branch Name" value={(data.basic as any).guide_bank_branch_name ?? ""} />
                <Row label="IFSC Code" value={(data.basic as any).guide_ifsc_code ?? ""} />
                <Row label="Account Number" value={(data.basic as any).guide_account_number ?? ""} />
                <Row label="Confirm Account Number" value={(data.basic as any).guide_account_number ?? ""} />
              </div>
            </Section>

            {/* Guide Preferred For */}
            <Section title="Guide Prefered For">
              <div className="flex items-start gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 accent-fuchsia-600" readOnly checked={Boolean(preferredLabel)} />
                  <span className="text-gray-800">{preferredLabel || "-"}</span>
                </label>
              </div>

              {preferredValueText ? (
                <div className="mt-4 text-gray-800">{preferredValueText}</div>
              ) : null}

              {itineraryChecked ? (
                <div className="mt-4 bg-fuchsia-50 text-fuchsia-700 rounded-xl p-4">
                  From the beginning to the end of each day, the itinerary and all the hotspots serve
                  as a guide for the entire journey.
                </div>
              ) : null}
            </Section>

            {/* Feedback & Review */}
            <Section title="Feedback & Review">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-gray-600 bg-gray-50">
                      <th className="text-left px-4 py-3 font-medium">S.NO</th>
                      <th className="text-left px-4 py-3 font-medium">RATING</th>
                      <th className="text-left px-4 py-3 font-medium">DESCRIPTION</th>
                      <th className="text-left px-4 py-3 font-medium">CREATED ON</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.reviews.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-center text-gray-500" colSpan={4}>
                          No Special Time Found !!!
                        </td>
                      </tr>
                    ) : (
                      data.reviews.map((r, idx) => (
                        <tr key={r.guide_review_id} className="border-t">
                          <td className="px-4 py-3">{idx + 1}</td>
                          <td className="px-4 py-3">{(r as any).guide_rating_label || r.guide_rating || "-"}</td>
                          <td className="px-4 py-3">{r.guide_description || "-"}</td>
                          <td className="px-4 py-3">
                            {(r as any).createdon_text || (r.createdon ? fmtDateDDMMYYYY(r.createdon) : "-")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Section>

            <div className="flex justify-end">
              <button
                onClick={() => nav(-1)}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800"
              >
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
