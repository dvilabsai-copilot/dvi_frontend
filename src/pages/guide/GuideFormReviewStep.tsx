/* eslint-disable @typescript-eslint/no-explicit-any, no-irregular-whitespace */
import React from "react";
import { Copy, FileSpreadsheet, FileText, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const GuideFormReviewStep = ({ context }: { context: Record<string, any> }) => {
  const {
    newRating, setNewRating, newFeedback, setNewFeedback, editingReviewId, setEditingReviewId,
    handleAddReview, searchReview, setSearchReview, handleCopyReviews, handleDownloadExcel,
    handleDownloadCSV, filteredReviews, renderStars, handleEditReview, handleDeleteReview,
    setCurrentStep,
  } = context;
  return (
  <div className="mx-auto max-w-[929px] space-y-4">
    <h2 className="text-[18px] font-semibold text-primary">
      Review & Feedback
    </h2>

    <div className="grid grid-cols-[224px_1fr] gap-6 items-start">
      {/* Left: Rating */}
      <div className="h-[413px] w-[224px] rounded-2xl border border-[#eadcff] bg-white p-4 shadow-none">
        <h3 className="mb-4 text-[18px] font-semibold text-[#1f2937]">
          Rating
        </h3>

<select
  value={newRating || ""}
  onChange={(e) => setNewRating(Number(e.target.value))}
  className="h-[44px] w-full rounded-xl border border-[#eadcff] bg-white px-3 text-[14px] outline-none focus:ring-2 focus:ring-purple-200"
>
  <option value="">Select Rating</option>
  <option value="5">5</option>
  <option value="4">4</option>
  <option value="3">3</option>
  <option value="2">2</option>
  <option value="1">1</option>
</select>


        <p className="my-4 text-[13px] leading-5 text-[#8a86a3]">
          All reviews are from genuine customers
        </p>

        <Label className="text-[13px] font-semibold text-[#1f2937]">
          Feedback <span className="text-red-500">*</span>
        </Label>

        <textarea
          className="mt-3 h-[120px] w-full resize-none rounded-xl border border-[#eadcff] px-3 py-2 text-[14px] outline-none focus:ring-1 focus:ring-primary"
          value={newFeedback}
          onChange={(e) => setNewFeedback(e.target.value)}
          placeholder="Enter feedback..."
        />

        <div className="mt-3 flex justify-end gap-3">
  <Button
    type="button"
    variant="secondary"
    onClick={() => {
      setEditingReviewId(null);
      setNewRating(0);
      setNewFeedback("");
    }}
    className="h-[38px] rounded-xl px-5 text-[14px]"
  >
    Cancel
  </Button>

  <Button
    type="button"
    onClick={handleAddReview}
    className="h-[38px] rounded-xl bg-gradient-to-r from-primary to-pink-500 px-5 text-[14px]"
  >
    {editingReviewId ? "Update" : "Save"}
  </Button>
</div>


      </div>

      {/* Right: Reviews List */}
      <div className="h-[413px] min-w-0 rounded-2xl border border-[#eadcff] bg-white p-4 shadow-none">
        <h3 className="mb-4 text-[18px] font-semibold text-[#1f2937]">
          List of Reviews
        </h3>

        <div className="mb-3 flex items-center gap-2">
          <span className="text-[15px]">Show</span>
          <select className="h-[40px] w-[74px] rounded-xl border border-[#eadcff] bg-white px-3">
            <option>10</option>
            <option>25</option>
            <option>50</option>
          </select>
          <span className="text-[15px]">entries</span>
        </div>

        <div className="mb-3 flex items-center gap-3">
          <span className="text-[15px]">Search:</span>

          <Input
            className="h-[42px] w-[220px] rounded-xl border-[#eadcff] text-[14px]"
            value={searchReview}
            onChange={(e) => setSearchReview(e.target.value)}
          />

          <Button
            variant="outline"
            onClick={handleCopyReviews}
            className="h-[42px] min-w-[92px] rounded-xl border-[#7c5cff] text-[#4f46e5]"
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>

          <Button
            variant="outline"
            onClick={handleDownloadExcel}
            className="h-[42px] min-w-[92px] rounded-xl border-green-500 text-green-600"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Excel
          </Button>

          <Button
            variant="outline"
            onClick={handleDownloadCSV}
            className="h-[42px] min-w-[84px] rounded-xl border-gray-300 text-gray-600"
          >
            <FileText className="mr-2 h-4 w-4" />
            CSV
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#eadcff]">
          <Table className="w-full text-[13px]">
            <TableHeader className="bg-[#fbf7ff]">
              <TableRow>
                <TableHead className="w-[75px] px-3 py-2 font-semibold">
                  S.NO {"\u2195"}
                </TableHead>
                <TableHead className="w-[95px] px-3 py-2 font-semibold">
                  RATING {"\u2195"}
                </TableHead>
                <TableHead className="w-[135px] px-3 py-2 font-semibold">
                  DESCRIPTION {"\u2195"}
                </TableHead>
                <TableHead className="w-[166px] whitespace-nowrap px-3 py-2 font-semibold">
                CREATED ON
                </TableHead>
                <TableHead className="w-[103px] whitespace-nowrap px-3 py-2 text-center font-semibold">
                  ACTIONS
                </TableHead>

              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredReviews.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                    No data available in table
                  </TableCell>
                </TableRow>
              ) : (
                filteredReviews.map((review, idx) => (
                  <TableRow key={review.id}>
                    <TableCell className="px-3 py-2">{idx + 1}</TableCell>

                    <TableCell className="px-3 py-2">
                      <div className="flex gap-0.5">
                        {renderStars(review.rating)}
                      </div>
                    </TableCell>

                    <TableCell className="px-3 py-2">
                      {review.description}
                    </TableCell>

                    <TableCell className="whitespace-nowrap px-3 py-2">
                      {review.createdOn}
                    </TableCell>

                    <TableCell className="px-3 py-2">
                      <div className="flex justify-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleEditReview(review)}
                          className="h-8 w-8 rounded-lg border-[#eadcff]"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                       <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          const confirmed = window.confirm("Delete this review?");
                          if (!confirmed) return;
                          handleDeleteReview(review.id);
                        }}
                        className="h-8 w-8 rounded-lg border-[#eadcff]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-[14px] text-gray-500">
            Showing {filteredReviews.length > 0 ? 1 : 0} to {filteredReviews.length} of{" "}
            {filteredReviews.length} entries
          </p>

          <div className="flex gap-2">
            <Button variant="outline" disabled className="h-[40px]">
              Previous
            </Button>
            <Button variant="outline" disabled className="h-[40px]">
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>

    <div className="flex items-center justify-between border-t pt-4">
      <Button variant="secondary" onClick={() => setCurrentStep(2)}>
        Back
      </Button>

      <Button
        onClick={() => setCurrentStep(4)}
        className="bg-gradient-to-r from-primary to-pink-500"
      >
        Skip and Continue
      </Button>
    </div>
  </div>


  );
};
