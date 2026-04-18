import { useState } from "react";

const DOWNLOAD_PACKAGES_URL = "https://resonant-beijinho-4013f0.netlify.app/";

export default function DownloadPackages() {
  const [loading, setLoading] = useState(true);

  return (
    <div className="w-full bg-[#fcf8ff] p-4 md:p-6">
      <div className="bg-[#f3f3f3] p-4 md:p-6">
        <div className="relative overflow-hidden bg-white">
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
            className="h-[calc(100vh-120px)] min-h-[700px] w-full border-0 bg-white"
            loading="lazy"
            allowFullScreen
            onLoad={() => setLoading(false)}
          />
        </div>
      </div>
    </div>
  );
}