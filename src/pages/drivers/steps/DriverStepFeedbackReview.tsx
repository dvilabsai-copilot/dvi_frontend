// REPLACE-WHOLE-FILE: src/drivers/steps/DriverStepFeedbackReview.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Copy, FileSpreadsheet, FileText, Star,Pencil,Trash2, } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

import type { DriverReview, Id } from "@/services/drivers";
import { createDriverReview, listDriverReviews } from "@/services/drivers";

// ✅ Local StarsRating component (so we can remove ../components/StarsRating.tsx)
type StarsRatingProps = {
  value: number;
  onChange: (v: number) => void;
};

function StarsRating({ value, onChange }: StarsRatingProps) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const v = i + 1;
        const filled = v <= value;

        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className="p-0.5"
            aria-label={`Rate ${v}`}
          >
            <Star
              className={[
                "h-7 w-7",
                filled ? "fill-orange-400 text-orange-400" : "text-gray-300",
              ].join(" ")}
            />
          </button>
        );
      })}
    </div>
  );
}

function downloadFile(name: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function toCSV(rows: DriverReview[]) {
  const header = ["S.NO", "RATING", "DESCRIPTION", "CREATED ON"];
  const data = rows.map((r, i) => [
    String(i + 1),
    String(r.rating),
    (r.description || "").replace(/\n/g, " ").replace(/"/g, '""'),
    r.createdAt ? new Date(r.createdAt).toLocaleString() : "",
  ]);
  const lines = [
    header.join(","),
    ...data.map((r) => `${r[0]},${r[1]},"${r[2]}",${r[3]}`),
  ];
  return lines.join("\n");
}

function toExcelHTML(rows: DriverReview[]) {
  const escape = (s: any) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const body = rows
    .map(
      (r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escape(r.rating)}</td>
        <td>${escape(r.description)}</td>
        <td>${escape(
          r.createdAt ? new Date(r.createdAt).toLocaleString() : ""
        )}</td>
      </tr>`
    )
    .join("");

  return `
  <html><head><meta charset="utf-8" /></head>
  <body>
  <table border="1">
    <thead>
      <tr><th>S.NO</th><th>RATING</th><th>DESCRIPTION</th><th>CREATED ON</th></tr>
    </thead>
    <tbody>${body}</tbody>
  </table>
  </body></html>`;
}

export function DriverStepFeedbackReview({
  driverId,
  onBack,
  onUpdateContinue,
}: {
  driverId: Id | null;
  onBack: () => void;
  onUpdateContinue: () => void;
}) {
  const [rating, setRating] = useState(0);
const [feedback, setFeedback] = useState("");
const [editingReviewId, setEditingReviewId] = useState<number | string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [rows, setRows] = useState<DriverReview[]>([]);
  const [loading, setLoading] = useState(false);

  const [pageSize, setPageSize] = useState(10);
  const [q, setQ] = useState("");

  async function load() {
    if (!driverId) return;
    setLoading(true);
    try {
      const r = await listDriverReviews(driverId);
      setRows(r || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driverId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        String(r.rating).includes(s) ||
        (r.description || "").toLowerCase().includes(s)
    );
  }, [rows, q]);

  const viewRows = useMemo(
    () => filtered.slice(0, pageSize),
    [filtered, pageSize]
  );

async function handleSaveFeedback() {
  setErr(null);

  if (!driverId) {
    setErr(
      "Please save Basic Info first (create driver) before adding feedback."
    );
    return;
  }

  if (!feedback.trim()) {
    setErr("Feedback is required");
    return;
  }

  if (!rating || rating < 1) {
    setErr("Rating is required");
    return;
  }

  if (editingReviewId) {
    await api(`/drivers/reviews/${editingReviewId}`, {
      method: "PUT",
      body: JSON.stringify({
        rating,
        description: feedback.trim(),
      }),
    });
  } else {
    await createDriverReview(driverId, {
      rating,
      description: feedback.trim(),
    });
  }

  setFeedback("");
  setRating(1);
  setEditingReviewId(null);
  await load();
}

 function handleEditReview(row: DriverReview) {
  setEditingReviewId(row.id);
  setRating(Number(row.rating || 0));
  setFeedback(String(row.description || ""));
}

async function handleDeleteReview(row: DriverReview) {
  if (!row.id) {
    alert("Invalid review id");
    return;
  }

  const confirmed = window.confirm("Are you sure you want to delete this review?");
  if (!confirmed) return;

  try {
    await api(`/drivers/reviews/${row.id}`, {
      method: "DELETE",
    });

    await load();
  } catch (error: any) {
    console.error("Failed to delete review", error);
    alert(error?.message || "Review delete failed");
  }
}

async function handleCopy() {
  const text = viewRows
      .map(
        (r, i) =>
          `${i + 1}\t${r.rating}\t${(r.description || "").replace(
            /\n/g,
            " "
          )}\t${
            r.createdAt ? new Date(r.createdAt).toLocaleString() : ""
          }`
      )
      .join("\n");
    await navigator.clipboard.writeText(text);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left card (Rating + Feedback) */}
      <Card className="border-0 shadow-sm lg:col-span-1">
        <CardContent className="p-6">
          <div className="text-lg font-semibold text-violet-600 mb-4">
            Rating
          </div>

          <StarsRating value={rating} onChange={setRating} />

          <div className="text-sm text-gray-500 mt-3">
            All reviews are from genuine customers
          </div>

          <div className="mt-6">
            <div className="text-sm text-gray-700 mb-2">
              Feedback <span className="text-red-500">*</span>
            </div>
            <Textarea
              className={["min-h-[120px]", err ? "border-red-500" : ""].join(
                " "
              )}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            {err && <div className="text-xs text-red-600 mt-2">{err}</div>}
          </div>

          <div className="mt-6 flex justify-end">
           <Button
  type="button"
  className="h-11 px-10 bg-gradient-to-r from-violet-600 to-pink-500 text-white hover:opacity-95"
  onClick={handleSaveFeedback}
>
  {editingReviewId ? "Update" : "Save"}
</Button>
          </div>
        </CardContent>
      </Card>

      {/* Right card (List of reviews table UI like screenshot) */}
      <Card className="border-0 shadow-sm lg:col-span-2">
        <CardContent className="p-6">
          <div className="text-2xl font-semibold text-gray-800 mb-4">
            List of Reviews
          </div>

       <div className="mb-4 flex flex-col gap-4">
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <span>Show</span>
      <select
        className="h-9 rounded-md border bg-white px-2"
        value={pageSize}
        onChange={(e) => setPageSize(Number(e.target.value))}
      >
        {[10, 25, 50, 100].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
      <span>entries</span>
    </div>

    <div className="flex flex-wrap items-center justify-end gap-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-600">Search:</span>
        <Input
          className="h-9 w-[220px]"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-9 min-w-[96px] gap-2"
        onClick={handleCopy}
      >
        <Copy className="h-4 w-4" />
        Copy
      </Button>

      <Button
        type="button"
        variant="outline"
        className="h-9 min-w-[96px] gap-2 border-green-500 text-green-600"
        onClick={() =>
          downloadFile(
            "driver_reviews.xls",
            "application/vnd.ms-excel",
            toExcelHTML(viewRows)
          )
        }
      >
        <FileSpreadsheet className="h-4 w-4" />
        Excel
      </Button>

      <Button
        type="button"
        variant="outline"
        className="h-9 min-w-[96px] gap-2"
        onClick={() =>
          downloadFile(
            "driver_reviews.csv",
            "text/csv",
            toCSV(viewRows)
          )
        }
      >
        <FileText className="h-4 w-4" />
        CSV
      </Button>
    </div>
  </div>
</div>

          <div className="border rounded-lg overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-3 text-left">S.NO</th>
                  <th className="p-3 text-left">RATING</th>
                  <th className="p-3 text-left">DESCRIPTION</th>
                  <th className="p-3 text-left">CREATED ON</th>
                  <th className="p-3 text-left">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="border-t">
                    <td className="p-4 text-gray-500" colSpan={5}>
                      Loading...
                    </td>
                  </tr>
                ) : viewRows.length === 0 ? (
                  <tr className="border-t">
                    <td className="p-4 text-gray-500" colSpan={5}>
                      No data available in table
                    </td>
                  </tr>
                ) : (
                  viewRows.map((r, idx) => (
                    <tr key={String(r.id)} className="border-t">
                      <td className="p-3">{idx + 1}</td>
                      <td className="p-3">{r.rating}</td>
                      <td className="p-3">{r.description}</td>
                      <td className="p-3">
                        {r.createdAt
                          ? new Date(r.createdAt).toLocaleString()
                          : ""}
                      </td>
                      <td className="p-3">
  <div className="flex items-center gap-4">
    <button
      type="button"
      onClick={() => handleEditReview(r)}
      className="text-violet-600 hover:text-violet-800"
      title="Edit"
    >
      <Pencil className="h-5 w-5" />
    </button>

    <button
      type="button"
      onClick={() => handleDeleteReview(r)}
      className="text-red-500 hover:text-red-700"
      title="Delete"
    >
      <Trash2 className="h-5 w-5" />
    </button>
  </div>
</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-10 flex items-center justify-between">
            <Button
              type="button"
              variant="secondary"
              className="h-11 px-10 bg-gray-300 text-white hover:bg-gray-400"
              onClick={onBack}
            >
              Back
            </Button>

            <Button
              type="button"
              className="h-11 px-10 bg-gradient-to-r from-violet-600 to-pink-500 text-white hover:opacity-95"
              onClick={onUpdateContinue}
            >
              Update &amp; Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
