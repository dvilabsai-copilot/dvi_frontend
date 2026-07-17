import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatTime24As12 } from "@/components/itinerary/TimePickerPopover";
import { formatReviewDateTime, formatYmdLabel } from "./activityForm.utils";
import type { ActivityFormState } from "./activityForm.utils";

type ActivityImage = { id: number; url: string };

type ActivityPreviewTabProps = {
  formData: ActivityFormState;
  serverImages: ActivityImage[];
  imagePreviews: string[];
  isEdit: boolean;
  goToPrevTab: () => void;
  handleSubmit: () => void | Promise<void>;
};

export function ActivityPreviewTab({
  formData,
  serverImages,
  imagePreviews,
  isEdit,
  goToPrevTab,
  handleSubmit,
}: ActivityPreviewTabProps) {
  const renderTime = (value: string): ReactNode => (value ? formatTime24As12(value) : "-");

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-medium">Preview</h2>

      <div>
        <h3 className="mb-4 text-lg font-medium text-primary">Basic Info</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div><Label className="text-gray-500">Activity Title</Label><p className="font-medium">{formData.title || "-"}</p></div>
          <div><Label className="text-gray-500">Hotspot Places</Label><p className="font-medium">{formData.hotspot || "-"}</p></div>
          <div><Label className="text-gray-500">Max Allowed Person Count</Label><p className="font-medium">{formData.maxAllowedPersonCount}</p></div>
          <div><Label className="text-gray-500">Duration</Label><p className="font-medium">{formData.duration}</p></div>
        </div>
        <div className="mt-4"><Label className="text-gray-500">Description</Label><p className="font-medium">{formData.description || "-"}</p></div>
      </div>

      {(serverImages.length > 0 || imagePreviews.length > 0) && (
        <div>
          <h3 className="mb-4 text-lg font-medium text-primary">Images</h3>
          <div className="flex flex-wrap gap-2">
            {serverImages.map((image, index) => <img key={`sv-${image.id}`} src={image.url} alt={`Image ${index + 1}`} className="h-20 w-20 rounded object-cover" />)}
            {imagePreviews.map((preview, index) => <img key={index} src={preview} alt={`Preview ${index}`} className="h-20 w-20 rounded object-cover" />)}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-4 text-lg font-medium text-primary">Default Available Time</h3>
        <Table><TableHeader><TableRow className="bg-pink-100"><TableHead>S.NO</TableHead><TableHead>START TIME</TableHead><TableHead>END TIME</TableHead></TableRow></TableHeader>
          <TableBody>{formData.defaultAvailableTimes.map((time, index) => <TableRow key={index}><TableCell>{index + 1}</TableCell><TableCell>{renderTime(time.startTime)}</TableCell><TableCell>{renderTime(time.endTime)}</TableCell></TableRow>)}</TableBody>
        </Table>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-medium text-primary">Special Day</h3>
        <Table><TableHeader><TableRow className="bg-pink-100"><TableHead>S.NO</TableHead><TableHead>DATE</TableHead><TableHead>START TIME</TableHead><TableHead>END TIME</TableHead></TableRow></TableHeader>
          <TableBody>{formData.specialDays.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-gray-500">No Special Time Found !!!</TableCell></TableRow> : formData.specialDays.map((day, index) => <TableRow key={index}><TableCell>{index + 1}</TableCell><TableCell>{formatYmdLabel(day.date)}</TableCell><TableCell>{renderTime(day.timeSlots[0]?.startTime || "")}</TableCell><TableCell>{renderTime(day.timeSlots[0]?.endTime || "")}</TableCell></TableRow>)}</TableBody>
        </Table>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-medium text-primary">Review</h3>
        <Table><TableHeader><TableRow className="bg-pink-100"><TableHead>S.NO</TableHead><TableHead>RATING</TableHead><TableHead>DESCRIPTION</TableHead><TableHead>CREATED ON</TableHead></TableRow></TableHeader>
          <TableBody>{formData.reviews.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-gray-500">No reviews yet</TableCell></TableRow> : formData.reviews.map((review, index) => <TableRow key={review.id}><TableCell>{index + 1}</TableCell><TableCell>{review.rating} STARS</TableCell><TableCell>{review.description}</TableCell><TableCell>{formatReviewDateTime(review.createdOn)}</TableCell></TableRow>)}</TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between border-t pt-6">
        <Button variant="secondary" onClick={goToPrevTab}>Back</Button>
        <Button onClick={handleSubmit}>{isEdit ? "Submit" : "Submit"}</Button>
      </div>
    </div>
  );
}
