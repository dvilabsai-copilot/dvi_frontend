import { useState } from "react";

export function useMediaShareState() {
  const [galleryModal, setGalleryModal] = useState<{ open: boolean; images: string[]; title: string }>({ open: false, images: [], title: "" });
  const [galleryActiveIdx, setGalleryActiveIdx] = useState(0);
  const [videoModal, setVideoModal] = useState<{ open: boolean; videoUrl: string; title: string }>({ open: false, videoUrl: "", title: "" });
  const [clipboardModal, setClipboardModal] = useState(false);
  const [shareModal, setShareModal] = useState(false);
  const [clipboardType, setClipboardType] = useState<"recommended" | "highlights" | "para">("recommended");
  const [clipboardRatesVisible, setClipboardRatesVisible] = useState(false);

  return {
    galleryModal, setGalleryModal, galleryActiveIdx, setGalleryActiveIdx,
    videoModal, setVideoModal, clipboardModal, setClipboardModal,
    shareModal, setShareModal, clipboardType, setClipboardType,
    clipboardRatesVisible, setClipboardRatesVisible,
  };
}
