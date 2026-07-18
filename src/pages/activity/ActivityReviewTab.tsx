import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Copy, FileSpreadsheet, FileText, Pencil, Trash2 } from "lucide-react";
import { formatReviewDateTime } from "./activityForm.utils";
import type { FormReview } from "./activityForm.utils";

type ActivityReviewTabProps = {
  isReadonly: boolean;
  reviewRating: string;
  setReviewRating: Dispatch<SetStateAction<string>>;
  reviewFeedback: string;
  setReviewFeedback: Dispatch<SetStateAction<string>>;
  cancelEditReview: () => void;
  handleSaveReview: () => void | Promise<void>;
  editingReviewId: string | null;
  reviewPageSize: number;
  setReviewPageSize: (value: number) => void;
  reviewSearch: string;
  setReviewSearch: Dispatch<SetStateAction<string>>;
  handleReviewCopy: () => void | Promise<void>;
  handleReviewExcel: () => void;
  handleReviewCSV: () => void;
  paginatedReviews: FormReview[];
  reviewPage: number;
  renderStars: (rating: number) => ReactNode;
  startEditReview: (review: FormReview) => void;
  deleteReview: (reviewId: string) => void | Promise<void>;
  filteredReviews: FormReview[];
  setReviewPage: Dispatch<SetStateAction<number>>;
  totalReviewPages: number;
  goToPrevTab: () => void;
  goToNextTab: () => void;
};

export function ActivityReviewTab({
  isReadonly,
  reviewRating,
  setReviewRating,
  reviewFeedback,
  setReviewFeedback,
  cancelEditReview,
  handleSaveReview,
  editingReviewId,
  reviewPageSize,
  setReviewPageSize,
  reviewSearch,
  setReviewSearch,
  handleReviewCopy,
  handleReviewExcel,
  handleReviewCSV,
  paginatedReviews,
  reviewPage,
  renderStars,
  startEditReview,
  deleteReview,
  filteredReviews,
  setReviewPage,
  totalReviewPages,
  goToPrevTab,
  goToNextTab,
}: ActivityReviewTabProps) {
  return (
    <div className="mx-auto max-w-[929px] space-y-4">
      <h2 className="text-[18px] font-semibold text-primary">Review & Feedback</h2>

      <div className="grid grid-cols-[224px_1fr] items-start gap-6">
        <Card className="h-[413px] w-[224px] rounded-2xl border-[#eadcff] shadow-none">
          <CardContent className="p-4">
            <h3 className="mb-4 text-[18px] font-semibold text-[#1f2937]">Rating</h3>
            <Select value={reviewRating} onValueChange={setReviewRating} disabled={isReadonly}>
              <SelectTrigger className="h-[44px] rounded-xl border-[#eadcff] text-[14px]">
                <SelectValue placeholder="Select Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Star</SelectItem>
                <SelectItem value="2">2 Stars</SelectItem>
                <SelectItem value="3">3 Stars</SelectItem>
                <SelectItem value="4">4 Stars</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
              </SelectContent>
            </Select>

            <p className="my-4 text-[13px] leading-5 text-[#8a86a3]">
              All reviews are from genuine customers
            </p>
            <Label className="text-[13px] font-semibold text-[#1f2937]">
              Feedback <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={reviewFeedback}
              onChange={(event) => setReviewFeedback(event.target.value)}
              disabled={isReadonly}
              className="mt-3 h-[120px] resize-none rounded-xl border-[#eadcff] px-3 py-2 text-[14px]"
            />

            {!isReadonly && (
              <div className="mt-3 flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={cancelEditReview} className="h-[38px] rounded-xl px-5 text-[14px]">
                  Cancel
                </Button>
                <Button type="button" onClick={handleSaveReview} className="h-[38px] rounded-xl px-5 text-[14px]">
                  {editingReviewId ? "Update" : "Save"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-[413px] min-w-0 rounded-2xl border-[#eadcff] shadow-none">
          <CardContent className="p-4">
            <h3 className="mb-4 text-[18px] font-semibold text-[#1f2937]">List of Reviews</h3>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[15px]">Show</span>
              <Select value={String(reviewPageSize)} onValueChange={(value) => setReviewPageSize(Number(value))}>
                <SelectTrigger className="h-[40px] w-[74px] rounded-xl border-[#eadcff]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-[15px]">entries</span>
            </div>

            <div className="mb-3 flex items-center gap-3">
              <span className="text-[15px]">Search:</span>
              <Input value={reviewSearch} onChange={(event) => setReviewSearch(event.target.value)} className="h-[42px] w-[220px] rounded-xl border-[#eadcff] text-[14px]" />
              <Button type="button" variant="outline" onClick={handleReviewCopy} className="h-[42px] min-w-[92px] rounded-xl border-[#7c5cff] text-[#4f46e5]"><Copy className="mr-2 h-4 w-4" />Copy</Button>
              <Button type="button" variant="outline" onClick={handleReviewExcel} className="h-[42px] min-w-[92px] rounded-xl border-green-500 text-green-600"><FileSpreadsheet className="mr-2 h-4 w-4" />Excel</Button>
              <Button type="button" variant="outline" onClick={handleReviewCSV} className="h-[42px] min-w-[84px] rounded-xl border-gray-300 text-gray-600"><FileText className="mr-2 h-4 w-4" />CSV</Button>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#eadcff]">
              <Table className="w-full text-[13px]">
                <TableHeader className="bg-[#fbf7ff]"><TableRow>
                  <TableHead className="w-[75px] px-3 py-2 font-semibold">S.NO â†•</TableHead>
                  <TableHead className="w-[95px] px-3 py-2 font-semibold">RATING â†•</TableHead>
                  <TableHead className="w-[135px] px-3 py-2 font-semibold">DESCRIPTION â†•</TableHead>
                  <TableHead className="w-[166px] whitespace-nowrap px-3 py-2 font-semibold">CREATED ON â†•</TableHead>
                  <TableHead className="w-[103px] whitespace-nowrap px-3 py-2 text-center font-semibold">ACTIONS â†•</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {paginatedReviews.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="py-8 text-center text-gray-500">No data available in table</TableCell></TableRow>
                  ) : paginatedReviews.map((review, index) => (
                    <TableRow key={review.id}>
                      <TableCell className="px-3 py-2">{(reviewPage - 1) * reviewPageSize + index + 1}</TableCell>
                      <TableCell className="px-3 py-2"><div className="flex items-center gap-0.5">{renderStars(review.rating)}</div></TableCell>
                      <TableCell className="px-3 py-2">{review.description}</TableCell>
                      <TableCell className="whitespace-nowrap px-3 py-2">{formatReviewDateTime(review.createdOn)}</TableCell>
                      <TableCell className="px-3 py-2"><div className="flex justify-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-[#eadcff]" onClick={() => startEditReview(review)} disabled={isReadonly}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg border-[#eadcff]" onClick={() => { if (window.confirm("Delete this review?")) void deleteReview(review.id); }} disabled={isReadonly}><Trash2 className="h-4 w-4" /></Button>
                      </div></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-[14px] text-gray-500">
                Showing {filteredReviews.length > 0 ? (reviewPage - 1) * reviewPageSize + 1 : 0} to {Math.min(reviewPage * reviewPageSize, filteredReviews.length)} of {filteredReviews.length} entries
              </span>
              <div className="flex gap-2">
                <Button variant="outline" disabled={reviewPage <= 1} onClick={() => setReviewPage((page) => Math.max(1, page - 1))} className="h-[40px]">Previous</Button>
                <Button variant="outline" disabled={reviewPage >= totalReviewPages} onClick={() => setReviewPage((page) => Math.min(totalReviewPages, page + 1))} className="h-[40px]">Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <Button variant="secondary" onClick={goToPrevTab}>Back</Button>
        {!isReadonly && <Button onClick={goToNextTab}>Update &amp; Continue</Button>}
      </div>
    </div>
  );
}
