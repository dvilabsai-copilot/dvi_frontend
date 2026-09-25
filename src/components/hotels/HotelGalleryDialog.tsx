import React from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resolveUploadUrl } from "@/lib/api";

type HotelGalleryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hotelName?: string | null;
  images?: string[];
};

export const HotelGalleryDialog: React.FC<HotelGalleryDialogProps> = ({
  open,
  onOpenChange,
  hotelName,
  images = [],
}) => {
  const normalizedImages = React.useMemo(
    () => Array.from(new Set(images.map((image) => String(image || "").trim()).filter(Boolean))),
    [images],
  );
  const [activeIndex, setActiveIndex] = React.useState(0);

  React.useEffect(() => {
    if (open) setActiveIndex(0);
  }, [open, hotelName, normalizedImages.length]);

  const activeImage = normalizedImages[activeIndex];
  const move = (direction: number) => {
    if (normalizedImages.length < 2) return;
    setActiveIndex((current) => (
      (current + direction + normalizedImages.length) % normalizedImages.length
    ));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="hotel-gallery-dialog"
        className="max-h-[92vh] max-w-5xl overflow-y-auto border-[#eadcf6] bg-white p-5 shadow-2xl sm:p-6"
      >
        <DialogHeader className="pr-8">
          <DialogTitle className="text-center text-xl font-semibold text-[#c238ad]">
            {hotelName || "Hotel Gallery"}
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-slate-500">
            {normalizedImages.length > 0
              ? `${normalizedImages.length} image${normalizedImages.length === 1 ? "" : "s"}`
              : "Hotel images"}
          </DialogDescription>
        </DialogHeader>

        {activeImage ? (
          <div className="space-y-4">
            <div className="relative flex min-h-[280px] items-center justify-center overflow-hidden rounded-xl bg-slate-100 sm:min-h-[420px]">
              <img
                src={resolveUploadUrl(activeImage)}
                alt={`${hotelName || "Hotel"} image ${activeIndex + 1}`}
                className="max-h-[58vh] w-full object-contain"
              />
              {normalizedImages.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous hotel image"
                    className="absolute left-3 rounded-full bg-black/55 p-2 text-white transition hover:bg-black/75"
                    onClick={() => move(-1)}
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next hotel image"
                    className="absolute right-3 rounded-full bg-black/55 p-2 text-white transition hover:bg-black/75"
                    onClick={() => move(1)}
                  >
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </>
              )}
              <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
                {activeIndex + 1} / {normalizedImages.length}
              </span>
            </div>

            {normalizedImages.length > 1 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7">
                {normalizedImages.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    aria-label={`View hotel image ${index + 1}`}
                    aria-current={index === activeIndex ? "true" : undefined}
                    className={`overflow-hidden rounded-lg border-2 bg-slate-100 transition ${
                      index === activeIndex
                        ? "border-[#c238ad] ring-2 ring-[#c238ad]/20"
                        : "border-transparent hover:border-[#d9b9eb]"
                    }`}
                    onClick={() => setActiveIndex(index)}
                  >
                    <img
                      src={resolveUploadUrl(image)}
                      alt={`${hotelName || "Hotel"} thumbnail ${index + 1}`}
                      className="h-20 w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl bg-slate-50 text-center">
            <ImageIcon className="mb-3 h-12 w-12 text-slate-300" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-600">No hotel images available</p>
            <p className="mt-1 text-xs text-slate-400">Images uploaded for this hotel will appear here.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
