import { useState } from "react";
import { ExternalLink, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const DOWNLOAD_PACKAGES_URL = "https://resonant-beijinho-4013f0.netlify.app/";

export default function DownloadPackages() {
  const [iframeKey, setIframeKey] = useState(0);
  const [loading, setLoading] = useState(true);

  return (
    <div className="w-full py-4 md:py-6">
      <div className="overflow-hidden rounded-2xl border border-[#eadcf5] bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-[#f1e7f8] px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
          <div>
            <h2 className="text-xl font-semibold text-[#4a4a68]">
              Download Packages
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Replicated from the PHP page using the same embedded package app.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setLoading(true);
                setIframeKey((prev) => prev + 1);
              }}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>

            <Button asChild type="button">
              <a
                href={DOWNLOAD_PACKAGES_URL}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in New Tab
              </a>
            </Button>
          </div>
        </div>

        <div className="relative bg-[#f8f5fb]">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
              <div className="text-sm font-medium text-slate-600">
                Loading packages...
              </div>
            </div>
          )}

          <iframe
            key={iframeKey}
            src={DOWNLOAD_PACKAGES_URL}
            title="Download Packages"
            className="h-[calc(100vh-220px)] min-h-[700px] w-full border-0 bg-white"
            loading="lazy"
            allowFullScreen
            onLoad={() => setLoading(false)}
          />
        </div>
      </div>
    </div>
  );
}