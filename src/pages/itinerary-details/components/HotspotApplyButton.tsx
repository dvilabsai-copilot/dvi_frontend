import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type HotspotApplyButtonProps = {
  forceConflict: boolean;
  loading: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
};

export function HotspotApplyButton({
  forceConflict,
  loading,
  disabled,
  label,
  onClick,
}: HotspotApplyButtonProps) {
  return (
    <Button
      className={`w-full text-white shadow-lg ${forceConflict ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
      onClick={onClick}
      disabled={disabled}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Adding Hotspot...
        </>
      ) : label}
    </Button>
  );
}

