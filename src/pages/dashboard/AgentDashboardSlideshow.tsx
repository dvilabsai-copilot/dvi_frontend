/* DVI_AGENT_SIX_STATES_SLIDESHOW_V1 - Agent dashboard only. */
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import "./agent-dashboard-slideshow.css";

const DESTINATIONS = [
  { state: "Andhra Pradesh", file: "/assets/agent-states/andhra-pradesh.webp" },
  { state: "Karnataka", file: "/assets/agent-states/karnataka.webp" },
  { state: "Kerala", file: "/assets/agent-states/kerala.webp" },
  { state: "Puducherry", file: "/assets/agent-states/puducherry.webp" },
  { state: "Tamil Nadu", file: "/assets/agent-states/tamil-nadu.webp" },
  { state: "Telangana", file: "/assets/agent-states/telangana.webp" },
] as const;

export function AgentDashboardSlideshow() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    // Respect system preferences, and avoid rotating images in inactive tabs.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timerId = window.setInterval(() => {
      if (!document.hidden) {
        setCurrent((old) => (old + 1) % DESTINATIONS.length);
      }
    }, 5000);
    return () => window.clearInterval(timerId);
  }, []);

  return (
    <div className="dvi-agent-hero-slideshow" aria-label={`Destination: ${DESTINATIONS[current].state}`}>
      <div className="dvi-agent-hero-slideshow-images" aria-hidden="true">
        {DESTINATIONS.map(({ state, file }, index) => (
          <img
            key={state}
            src={file}
            alt=""
            draggable={false}
            decoding="async"
            loading="eager"
            className={
              "dvi-agent-hero-slideshow-image" +
              (index === current ? " is-current" : "")
            }
          />
        ))}
      </div>
      <div className="dvi-agent-hero-slideshow-wash" aria-hidden="true" />
      <div className="dvi-agent-hero-state-pill">
        <MapPin size={15} aria-hidden="true" />
        <span>{DESTINATIONS[current].state}</span>
      </div>
    </div>
  );
}
