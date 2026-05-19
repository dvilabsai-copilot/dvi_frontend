import { useState } from "react";

const DOWNLOAD_PACKAGES_URL = "https://resonant-beijinho-4013f0.netlify.app/";

export default function DownloadPackages() {
  const [loading, setLoading] = useState(true);

  return (
  <div className="w-full bg-[#fcf8ff] px-4 pb-4 md:px-6 md:pb-6">
    <div className="bg-[#f3f3f3]">
      <div className="relative h-[calc(100vh-115px)] overflow-hidden bg-white">

          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
              <div className="text-sm font-medium text-slate-600">
                Loading packages...
              </div>
            </div>
          )}

          <iframe
            src={DOWNLOAD_PACKAGES_URL}
            title="Download Packages"
            className="h-full w-full border-0 bg-white"
            loading="lazy"
            allowFullScreen
            onLoad={() => setLoading(false)}
          />
        </div>
      </div>
    </div>
  );
}