import { Button } from "@/components/ui/button";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";

export default function Restricted() {
  const navigate = useNavigate();
  const location = useLocation();

  const requestedPath = String(
    location.state?.from || "",
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md rounded-xl border bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">
          Access Restricted
        </h1>

        <p className="mt-3 text-sm text-muted-foreground">
          Your Staff role does not have permission to
          open this page.
        </p>

        {requestedPath && (
          <p className="mt-2 break-all text-xs text-muted-foreground">
            {requestedPath}
          </p>
        )}

        <Button
          className="mt-6"
          onClick={() => navigate(-1)}
        >
          Go Back
        </Button>
      </div>
    </div>
  );
}