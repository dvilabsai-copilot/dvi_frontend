import { useCallback, type Dispatch, type SetStateAction } from "react";

type GalleryState = { open: boolean; images: string[]; title: string };
type VideoState = { open: boolean; videoUrl: string; title: string };

export function useMediaModalController({
  setGalleryModal,
  setGalleryActiveIdx,
  setVideoModal,
}: {
  setGalleryModal: Dispatch<SetStateAction<GalleryState>>;
  setGalleryActiveIdx: Dispatch<SetStateAction<number>>;
  setVideoModal: Dispatch<SetStateAction<VideoState>>;
}) {
  const apiBase = ((import.meta.env.VITE_API_DVI_BASE_URL as string) || "").replace(/\/$/, "");

  const toImgSrc = useCallback((path: string | null | undefined): string | undefined => {
    if (!path || !path.trim()) return undefined;
    if (path.startsWith("http")) return path;
    return `${apiBase}${path}`;
  }, [apiBase]);

  const openGalleryModal = useCallback((images: string[], title: string) => {
    const resolved = images
      .filter((image) => image && image.trim() !== "")
      .map((image) => image.startsWith("http") ? image : `${apiBase}${image}`);
    setGalleryActiveIdx(0);
    setGalleryModal({
      open: true,
      images: resolved,
      title,
    });
  }, [apiBase, setGalleryActiveIdx, setGalleryModal]);

  const openVideoModal = useCallback((videoUrl: string, title: string) => {
    let embedUrl = videoUrl;
    const youtubeMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (youtubeMatch) {
      embedUrl = `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    setVideoModal({
      open: true,
      videoUrl: embedUrl,
      title,
    });
  }, [setVideoModal]);

  return { toImgSrc, openGalleryModal, openVideoModal };
}
