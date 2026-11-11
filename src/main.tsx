import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "quill/dist/quill.snow.css";
import "./styles/quill-custom.css";

const PRELOAD_RELOAD_KEY = "dvi-vite-preload-reload-attempted";

window.addEventListener("vite:preloadError", (event) => {
  try {
    if (sessionStorage.getItem(PRELOAD_RELOAD_KEY) === "1") {
      sessionStorage.removeItem(PRELOAD_RELOAD_KEY);
      return;
    }

    sessionStorage.setItem(PRELOAD_RELOAD_KEY, "1");
    event.preventDefault();
    window.location.reload();
  } catch (storageError) {
    console.error("Could not recover from a stale frontend chunk:", storageError);
  }
});

createRoot(document.getElementById("root")!).render(<App />);
