// src/pages/hotels/HotelReviewTab.tsx

import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2, Copy, FileSpreadsheet, FileText } from "lucide-react";

interface HotelReviewTabProps {
  hotelId: number | null;
  onNext: () => void;
}

type HotelReview = {
  id: number;
  rating: string;
  description: string;
  createdOn: string;
};

const ratingOptions = ["1", "2", "3", "4", "5"];

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US");
}

function getStorageKey(hotelId: number | null) {
  return `hotel_reviews_${hotelId || "new"}`;
}

function normalizeReview(raw: any, index: number): HotelReview {
  const id = Number(
    raw?.id ??
      raw?.reviewId ??
      raw?.review_id ??
      raw?.hotelReviewId ??
      raw?.hotel_review_id ??
      Date.now() + index
  );

  const rating = String(
    raw?.rating ??
      raw?.reviewRating ??
      raw?.review_rating ??
      raw?.hotelRating ??
      raw?.hotel_rating ??
      raw?.star ??
      raw?.stars ??
      ""
  ).trim();

  const description = String(
    raw?.description ??
      raw?.feedback ??
      raw?.reviewDescription ??
      raw?.review_description ??
      raw?.hotelReview ??
      raw?.hotel_review ??
      raw?.comment ??
      raw?.comments ??
      raw?.remark ??
      raw?.remarks ??
      ""
  ).trim();

  const createdOnRaw =
    raw?.createdOn ??
    raw?.created_on ??
    raw?.createdAt ??
    raw?.created_at ??
    raw?.date ??
    "";

  let createdOn = String(createdOnRaw || "").trim();

  if (createdOn) {
    const parsedDate = new Date(createdOn);

    if (!Number.isNaN(parsedDate.getTime())) {
      createdOn = formatDate(parsedDate);
    }
  }

  if (!createdOn) {
    createdOn = formatDate(new Date());
  }

  return {
    id,
    rating,
    description,
    createdOn,
  };
}

export const HotelReviewTab = ({ hotelId, onNext }: HotelReviewTabProps) => {
  const storageKey = getStorageKey(hotelId);

  const [rating, setRating] = useState("");
  const [description, setDescription] = useState("");
  const [reviews, setReviews] = useState<HotelReview[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const savedReviews = localStorage.getItem(storageKey);

    if (!savedReviews) {
      setReviews([]);
      return;
    }

    try {
      const parsed = JSON.parse(savedReviews);
      const list = Array.isArray(parsed) ? parsed : [];

      const normalizedReviews = list
        .map((item, index) => normalizeReview(item, index))
        .filter((item) => item.rating || item.description);

      setReviews(normalizedReviews);
    } catch {
      setReviews([]);
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(reviews));
  }, [reviews, storageKey]);

  const filteredReviews = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return reviews;

    return reviews.filter((review) => {
      return (
        review.rating.toLowerCase().includes(q) ||
        review.description.toLowerCase().includes(q) ||
        review.createdOn.toLowerCase().includes(q)
      );
    });
  }, [reviews, search]);

  const paginatedReviews = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReviews.slice(start, start + pageSize);
  }, [filteredReviews, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / pageSize));

  function resetForm() {
    setRating("");
    setDescription("");
    setEditingId(null);
  }

  function handleSaveReview() {
    if (!rating) {
      alert("Please select rating");
      return;
    }

    if (!description.trim()) {
      alert("Please enter feedback");
      return;
    }

    if (editingId !== null) {
      setReviews((prev) =>
        prev.map((review) =>
          review.id === editingId
            ? {
                ...review,
                rating,
                description: description.trim(),
              }
            : review
        )
      );

      resetForm();
      return;
    }

    setReviews((prev) => [
      ...prev,
      {
        id: Date.now(),
        rating,
        description: description.trim(),
        createdOn: formatDate(new Date()),
      },
    ]);

    resetForm();
  }

  function handleEditReview(review: HotelReview) {
    setEditingId(review.id);
    setRating(review.rating || "");
    setDescription(review.description || "");
  }

  function handleDeleteReview(id: number) {
    setReviews((prev) => prev.filter((review) => review.id !== id));

    if (editingId === id) {
      resetForm();
    }
  }

  async function handleCopy() {
    const rows = filteredReviews.map((review, index) => {
      return `${index + 1}\t${review.rating || "-"}\t${
        review.description || "-"
      }\t${review.createdOn}`;
    });

    const text = ["S.NO\tRATING\tDESCRIPTION\tCREATED ON", ...rows].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      alert("Copied successfully");
    } catch {
      alert("Copy failed");
    }
  }

  function handleExportCsv() {
    const header = "S.NO,RATING,DESCRIPTION,CREATED ON";
    const rows = filteredReviews.map((review, index) => {
      const safeDescription = `"${String(review.description || "-").replace(
        /"/g,
        '""'
      )}"`;

      return `${index + 1},${review.rating || "-"},${safeDescription},${
        review.createdOn
      }`;
    });

    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "hotel-reviews.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  function handleExportExcel() {
    const header = "S.NO\tRATING\tDESCRIPTION\tCREATED ON";
    const rows = filteredReviews.map((review, index) => {
      return `${index + 1}\t${review.rating || "-"}\t${
        review.description || "-"
      }\t${review.createdOn}`;
    });

    const content = [header, ...rows].join("\n");
    const blob = new Blob([content], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "hotel-reviews.xls";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-primary">Review & Feedback</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-purple-100 bg-white p-6 space-y-5">
          <h3 className="text-lg font-semibold">
            {editingId !== null ? `Edit Review #${editingId}` : "Rating"}
          </h3>

          <div>
            <select
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="w-full rounded-xl border border-purple-100 px-4 py-3 outline-none focus:border-primary"
            >
              <option value="">Select Rating</option>
              {ratingOptions.map((item) => (
                <option key={item} value={item}>
                  {item} Star
                </option>
              ))}
            </select>

            <p className="mt-3 text-sm text-muted-foreground">
              All reviews are from genuine customers
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Feedback <span className="text-red-500">*</span>
            </label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[190px] w-full resize-y rounded-xl border border-purple-100 px-4 py-3 outline-none focus:border-primary"
              placeholder="Enter feedback"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl bg-gray-100 px-6 py-3 font-semibold text-gray-600 hover:bg-gray-200"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveReview}
              className="rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-3 font-semibold text-white hover:opacity-90"
            >
              {editingId !== null ? "Update" : "Save"}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-purple-100 bg-white p-6 space-y-5">
          <h3 className="text-lg font-semibold">List of Reviews</h3>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span>Show</span>

              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-xl border border-purple-100 px-4 py-3 outline-none"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>

              <span>entries</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label>Search:</label>

              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-xl border border-purple-100 px-4 py-3 outline-none focus:border-primary"
              />

              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-2 rounded-xl border border-purple-200 px-4 py-3 font-semibold text-purple-700 hover:bg-purple-50"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>

              <button
                type="button"
                onClick={handleExportExcel}
                className="inline-flex items-center gap-2 rounded-xl border border-green-200 px-4 py-3 font-semibold text-green-600 hover:bg-green-50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 font-semibold text-gray-600 hover:bg-gray-50"
              >
                <FileText className="h-4 w-4" />
                CSV
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-purple-100">
            <table className="w-full text-sm">
              <thead className="bg-purple-50 text-left">
                <tr>
                  <th className="px-4 py-4 font-semibold">S.NO ↕</th>
                  <th className="px-4 py-4 font-semibold">RATING ↕</th>
                  <th className="px-4 py-4 font-semibold">DESCRIPTION ↕</th>
                  <th className="px-4 py-4 font-semibold">CREATED ON ↕</th>
                  <th className="px-4 py-4 font-semibold">ACTIONS ↕</th>
                </tr>
              </thead>

              <tbody>
                {paginatedReviews.length > 0 ? (
                  paginatedReviews.map((review, index) => (
                    <tr key={review.id} className="border-t border-purple-100">
                      <td className="px-4 py-4">
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>

                      <td className="px-4 py-4">
                        {review.rating ? `${review.rating} Star` : "-"}
                      </td>

                      <td className="px-4 py-4">
                        {review.description || "-"}
                      </td>

                      <td className="px-4 py-4">{review.createdOn}</td>

                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditReview(review)}
                            className="rounded-lg border border-purple-100 p-2 hover:bg-purple-50"
                            title="Edit review"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteReview(review.id)}
                            className="rounded-lg border border-purple-100 p-2 hover:bg-red-50"
                            title="Delete review"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No reviews added yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              {filteredReviews.length === 0
                ? 0
                : (currentPage - 1) * pageSize + 1}{" "}
              to {Math.min(currentPage * pageSize, filteredReviews.length)} of{" "}
              {filteredReviews.length} entries
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="rounded-xl bg-gray-100 px-5 py-3 text-gray-500 disabled:opacity-50"
              >
                Previous
              </button>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                className="rounded-xl bg-gray-100 px-5 py-3 text-gray-500 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={onNext}
          className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
        >
          Save & Continue
        </button>
      </div>
    </div>
  );
};