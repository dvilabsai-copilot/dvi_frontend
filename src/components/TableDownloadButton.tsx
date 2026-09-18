import { FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";

type TableDownloadButtonProps = {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
};

export function TableDownloadButton({
  onClick,
  loading = false,
  disabled = false,
}: TableDownloadButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled || loading}
      className="border-[#d546ab] text-[#d546ab] hover:bg-[#fff1fa] hover:text-[#c03d9f]"
    >
      <FileSpreadsheet className="mr-2 h-4 w-4" />

      {loading
        ? "Downloading..."
        : "Download Excel"}
    </Button>
  );
}