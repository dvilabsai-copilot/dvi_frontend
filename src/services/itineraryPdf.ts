import { API_BASE_URL, getToken } from "@/lib/api";

export type PdfDocumentOptions = {
  auth?: boolean;
};

export type PdfDocumentResult = {
  fileName: string;
  objectUrl: string;
};

export async function fetchPdfDocument(
  path: string,
  fallbackFileName: string,
  options: PdfDocumentOptions = {},
): Promise<PdfDocumentResult> {
  const auth = options.auth !== false;
  const token = auth ? getToken() : "";
  const res = await fetch(`${API_BASE_URL}/${path.replace(/^\/+/, "")}`, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  const contentType = res.headers.get("content-type") || "";

  if (!res.ok) {
    if (res.status === 401 && auth) {
      localStorage.removeItem("accessToken");
      window.location.href = "/login";
      throw new Error("Session expired. Please login again.");
    }
    const text = await res.text().catch(() => "");
    let message = `Download failed: ${res.status} ${res.statusText}`.trim();

    try {
      const parsed = JSON.parse(text);
      if (parsed?.message) {
        message = Array.isArray(parsed.message)
          ? parsed.message.join(", ")
          : String(parsed.message);
      }
    } catch {
      if (text) message = `${message} ${text}`.trim();
    }

    throw new Error(message);
  }

  if (contentType.includes("application/json")) {
    const text = await res.text().catch(() => "");
    let message = "Download failed";

    try {
      const parsed = JSON.parse(text);
      if (parsed?.message) {
        message = Array.isArray(parsed.message)
          ? parsed.message.join(", ")
          : String(parsed.message);
      }
    } catch {
      if (text) message = text;
    }

    throw new Error(message);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") || "";
  const nameMatch =
    disposition.match(/filename\*=(?:UTF-8'')?([^;]+)/i) ||
    disposition.match(/filename="?([^"]+)"?/i);
  const fileName = decodeURIComponent(
    (nameMatch?.[1] || fallbackFileName).replace(/(^["']|["']$)/g, ""),
  );
  return {
    fileName,
    objectUrl: window.URL.createObjectURL(blob),
  };
}

export async function downloadAuthenticatedFile(
  path: string,
  fallbackFileName: string,
) {
  const { fileName, objectUrl } = await fetchPdfDocument(path, fallbackFileName);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => window.URL.revokeObjectURL(objectUrl), 30000);
  return fileName;
}
