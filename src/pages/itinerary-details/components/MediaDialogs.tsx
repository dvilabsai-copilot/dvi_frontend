import { Dispatch, SetStateAction } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface GalleryDialogState {
  open: boolean;
  images: string[];
  title: string;
}

export interface VideoDialogState {
  open: boolean;
  videoUrl: string;
  title: string;
}

export function GalleryDialog({
  state,
  setState,
  activeIndex,
  setActiveIndex,
}: {
  state: GalleryDialogState;
  setState: Dispatch<SetStateAction<GalleryDialogState>>;
  activeIndex: number;
  setActiveIndex: Dispatch<SetStateAction<number>>;
}) {
  return (
    <Dialog open={state.open} onOpenChange={(open) => setState({ ...state, open })}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader><DialogTitle>{state.title} - Gallery</DialogTitle></DialogHeader>
        <div className="py-4">
          {state.images.length === 0 ? (
            <p className="text-sm text-[#6c6c6c] text-center py-8">No images available</p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ height: 340 }}>
                <img src={state.images[activeIndex]} alt={`${state.title} ${activeIndex + 1}`} className="w-full h-full object-contain" />
                {state.images.length > 1 && (
                  <>
                    <button className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white rounded-full w-9 h-9 flex items-center justify-center text-lg" onClick={() => setActiveIndex((i) => (i - 1 + state.images.length) % state.images.length)}>&#8249;</button>
                    <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/80 text-white rounded-full w-9 h-9 flex items-center justify-center text-lg" onClick={() => setActiveIndex((i) => (i + 1) % state.images.length)}>&#8250;</button>
                    <span className="absolute bottom-2 right-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">{activeIndex + 1} / {state.images.length}</span>
                  </>
                )}
              </div>
              {state.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {state.images.map((img, index) => (
                    <button key={index} onClick={() => setActiveIndex(index)} className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors ${index === activeIndex ? 'border-[#d546ab]' : 'border-transparent'}`}>
                      <img src={img} alt={`Thumb ${index + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setState({ open: false, images: [], title: "" })}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function VideoDialog({ state, setState }: { state: VideoDialogState; setState: Dispatch<SetStateAction<VideoDialogState>> }) {
  return (
    <Dialog open={state.open} onOpenChange={(open) => setState({ ...state, open })}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader><DialogTitle>{state.title} - Video</DialogTitle></DialogHeader>
        <div className="py-4">
          {state.videoUrl ? <div className="aspect-video"><iframe src={state.videoUrl} className="w-full h-full rounded-lg" allowFullScreen title={state.title} /></div> : <p className="text-sm text-[#6c6c6c] text-center py-8">No video available</p>}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setState({ open: false, videoUrl: "", title: "" })}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
