import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ActivityPreviewTab } from "@/pages/activity/ActivityPreviewTab";
import { ActivityReviewTab } from "@/pages/activity/ActivityReviewTab";
import { getEmptyActivity } from "@/pages/activity/activityForm.utils";

describe("activity form extracted tabs", () => {
  it("keeps the preview sections and navigation contract", () => {
    const formData = getEmptyActivity();
    formData.title = "Temple Visit";
    formData.description = "A guided visit";

    render(
      <ActivityPreviewTab
        formData={formData}
        serverImages={[]}
        imagePreviews={[]}
        isEdit
        goToPrevTab={vi.fn()}
        handleSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText("Preview")).toBeInTheDocument();
    expect(screen.getByText("Temple Visit")).toBeInTheDocument();
    expect(screen.getByText("Default Available Time")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });

  it("keeps review search, pagination, and edit controls available", () => {
    const review = { id: "review-1", rating: 5, description: "Excellent", createdOn: "2026-07-17" };

    render(
      <ActivityReviewTab
        isReadonly={false}
        reviewRating="5"
        setReviewRating={vi.fn()}
        reviewFeedback=""
        setReviewFeedback={vi.fn()}
        cancelEditReview={vi.fn()}
        handleSaveReview={vi.fn()}
        editingReviewId={null}
        reviewPageSize={10}
        setReviewPageSize={vi.fn()}
        reviewSearch=""
        setReviewSearch={vi.fn()}
        handleReviewCopy={vi.fn()}
        handleReviewExcel={vi.fn()}
        handleReviewCSV={vi.fn()}
        paginatedReviews={[review]}
        reviewPage={1}
        renderStars={(rating) => <span>{rating} stars</span>}
        startEditReview={vi.fn()}
        deleteReview={vi.fn()}
        filteredReviews={[review]}
        setReviewPage={vi.fn()}
        totalReviewPages={1}
        goToPrevTab={vi.fn()}
        goToNextTab={vi.fn()}
      />,
    );

    expect(screen.getByText("Review & Feedback")).toBeInTheDocument();
    expect(screen.getByText("Excellent")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "CSV" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update & Continue" })).toBeInTheDocument();
  });
});
