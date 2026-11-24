import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  cancelDviJourney,
  dismissArrivedDviJourney,
  getDviJourneySnapshot,
  subscribeDviJourney,
  type DviJourneySnapshot,
} from "@/lib/dviJourneyEvents";
import "./dviJourneyOverlay.css";

// DVI_ENTERED_ROUTES_INFINITY_V1: visualizes the entered route stops along the decorative infinity path.
// The original car art remains unchanged. The route below is user-entered and illustrative.
function VehicleArt() {
  return (
    <svg viewBox="0 0 190 104" aria-hidden="true">
      <defs>
        <linearGradient id="dvi-vehicle-paint" x1="0" x2="1" y1="0" y2="1">
          <stop stopColor="#271a4a" />
          <stop offset="0.32" stopColor="#6643ae" />
          <stop offset="0.70" stopColor="#38286e" />
          <stop offset="1" stopColor="#1c103a" />
        </linearGradient>
        <linearGradient id="dvi-vehicle-glass" x1="0" x2="1" y1="0" y2="1">
          <stop stopColor="#e7f4ff" />
          <stop offset="0.47" stopColor="#91aec8" />
          <stop offset="1" stopColor="#314761" />
        </linearGradient>
      </defs>
      <ellipse cx="98" cy="55" rx="85" ry="40" fill="#15192b" opacity=".13" />
      <g fill="#171823" stroke="#59616a" strokeWidth="3">
        <rect x="38" y="0" width="35" height="17" rx="6" />
        <rect x="38" y="87" width="35" height="17" rx="6" />
        <rect x="124" y="0" width="34" height="17" rx="6" />
        <rect x="124" y="87" width="34" height="17" rx="6" />
      </g>
      <path d="M14 34Q14 20 33 16L134 11Q166 12 176 30L182 43L182 62L174 76Q166 92 135 93L33 88Q15 85 14 68Z" fill="url(#dvi-vehicle-paint)" stroke="#c7b5f8" strokeWidth="2" />
      <path d="M53 25L111 20Q123 20 126 28L126 75Q121 84 107 82L53 78Q46 76 46 67L46 35Q46 26 53 25Z" fill="#533792" stroke="#a080d5" strokeWidth="2" />
      <path d="M54 29L92 25L92 77L53 74Q49 73 49 67L49 36Q49 30 54 29Z" fill="url(#dvi-vehicle-glass)" />
      <path d="M107 24L126 27L131 75L107 79Q99 76 99 70L99 32Q100 26 107 24Z" fill="url(#dvi-vehicle-glass)" />
      <path d="M57 32L84 28M55 69L87 74" stroke="#fff" strokeWidth="2" opacity=".54" />
      <path d="M131 23Q153 24 167 38L167 65Q152 78 131 82" fill="#261c59" opacity=".65" />
      <path d="M21 32L36 27L36 41L19 41ZM21 62L36 62L36 78L21 71Z" fill="#f84e64" />
      <path d="M169 31L181 38L184 44L171 43ZM170 60L184 59L181 67L168 73Z" fill="#fff1ba" stroke="#fff" strokeWidth="1" />
      <path d="M39 18L134 15M39 87L132 89" stroke="#ded6fd" strokeWidth="2" opacity=".74" />
    </svg>
  );
}

// DVI_LINEAR_ENTERED_DAYS_V1: actual entered day cards, one-way visual journey.
// Route geometry is decorative; it is not a GPS route or a real-time itinerary tracker.
export function DviJourneyOverlay() {
  const [journey, setJourney] = useState<DviJourneySnapshot | null>(getDviJourneySnapshot);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const activeJourneyId = useRef<number | null>(null);
  const routePathRef = useRef<SVGPathElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const location = useLocation();

  useEffect(() => subscribeDviJourney(() => setJourney(getDviJourneySnapshot())), []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(media.matches);
    onChange();
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    if (!journey || journey.phase === "arrived") return;
    const route = location.pathname;
    if (!route.startsWith("/create-itinerary") && !route.startsWith("/itinerary-details/")) {
      cancelDviJourney();
    }
  }, [location.pathname, journey]);

  const days = journey?.legs ?? [];
  const stageWidth = Math.max(920, 390 + Math.max(days.length, 1) * 180);
  const startX = 78;
  const endX = stageWidth - 88;
  const startY = 181;
  const dayY = 275;
  const endY = 354;
  const dayXs = days.map((_, index) =>
    Math.round(235 + (stageWidth - 445) * (index + 0.5) / days.length)
  );
  const firstX = dayXs[0] ?? Math.round(stageWidth / 2);
  const lastX = dayXs[dayXs.length - 1] ?? firstX;
  const routePath = `M ${startX} ${startY} C ${startX + 62} ${dayY} ${firstX - 105} ${dayY} ${firstX} ${dayY} ` +
    (days.length > 1 ? `L ${lastX} ${dayY} ` : "") +
    `C ${lastX + 95} ${dayY} ${endX - 56} ${endY - 62} ${endX} ${endY}`;

  // Drive once along the user's ordered stops. Never touch the finish before
  // the itinerary-details controller confirms the saved itinerary is ready.
  useEffect(() => {
    if (!journey) {
      activeJourneyId.current = null;
      progressRef.current = 0;
      setProgress(0);
      return;
    }
    if (activeJourneyId.current !== journey.id) {
      activeJourneyId.current = journey.id;
      progressRef.current = 0;
      setProgress(0);
      if (scrollRef.current) scrollRef.current.scrollLeft = 0;
    }
    dialogRef.current?.focus();
    if (reducedMotion) {
      const next = journey.phase === "arrived" ? 1 : 0;
      progressRef.current = next;
      setProgress(next);
      return;
    }
    let frame = 0;
    let last = performance.now();
    const started = last;
    const step = (now: number) => {
      const delta = Math.min(75, Math.max(0, now - last));
      last = now;
      if (now - started > 180000 && journey.phase !== "arrived") {
        cancelDviJourney();
        return;
      }
      const ready = journey.phase === "arrived";
      const maximum = ready ? 1 : 0.91;
      const drivingMs = ready ? 1900 : Math.max(8000, days.length * 1450);
      const next = Math.min(maximum, progressRef.current + delta / drivingMs);
      progressRef.current = next;
      setProgress(next);
      // Keep the car and its active day visible on long horizontally scrollable itineraries.
      const viewport = scrollRef.current;
      const pathNode = routePathRef.current;
      if (viewport && pathNode && viewport.scrollWidth > viewport.clientWidth) {
        const point = pathNode.getPointAtLength(pathNode.getTotalLength() * next);
        viewport.scrollLeft = Math.max(0, point.x - viewport.clientWidth * .48);
      }
      frame = window.requestAnimationFrame(step);
    };
    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [journey?.id, journey?.phase, reducedMotion, days.length]);

  useEffect(() => {
    if (!journey || journey.phase !== "arrived") return;
    const timer = window.setTimeout(() => dismissArrivedDviJourney(journey.id), reducedMotion ? 700 : 3200);
    return () => window.clearTimeout(timer);
  }, [journey?.id, journey?.phase, reducedMotion]);

  if (!journey) return null;
  const fullLength = Math.max(1, routePathRef.current?.getTotalLength() ?? 1);
  const travelled = Math.max(0, Math.min(fullLength, fullLength * progress));
  const position = routePathRef.current?.getPointAtLength(travelled) ?? { x: startX, y: startY };
  const lead = routePathRef.current?.getPointAtLength(Math.max(0, travelled - 3)) ?? { x: startX - 3, y: startY };
  const trail = routePathRef.current?.getPointAtLength(Math.min(fullLength, travelled + 3)) ?? { x: startX + 3, y: startY };
  const degrees = Math.atan2(trail.y - lead.y, trail.x - lead.x) * 180 / Math.PI;
  const arrived = journey.phase === "arrived";
  const currentDayIndex = days.length ? Math.min(days.length - 1, Math.floor(progress * (days.length + 1))) : -1;

  return (
    <div className="dvi-journey-overlay dvi-route-overlay" role="presentation">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true"
        aria-label={`Creating itinerary from ${journey.from} to ${journey.to}`}
        aria-describedby="dvi-journey-status" className="dvi-journey-card dvi-route-shell">
        <div className="dvi-route-scroll" ref={scrollRef} aria-label="Entered itinerary route">
          <div className="dvi-route-canvas" style={{ width: `${stageWidth}px` }}>
            <svg className="dvi-route-line" width={stageWidth} height="455" viewBox={`0 0 ${stageWidth} 455`}
              aria-hidden="true">
              <defs>
                <linearGradient id="dvi-linear-day-gradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#7b30f7" />
                  <stop offset=".48" stopColor="#b244f4" />
                  <stop offset="1" stopColor="#f52c98" />
                </linearGradient>
                <filter id="dvi-linear-day-glow" x="-20%" y="-80%" width="140%" height="260%">
                  <feGaussianBlur stdDeviation="5" />
                </filter>
              </defs>
              <path d={`M ${startX} 86 L ${startX} ${startY}`} fill="none" stroke="#fff" strokeOpacity=".9" strokeWidth="3" />
              <path d={`M ${endX} ${endY} L ${endX} 390`} fill="none" stroke="#fff" strokeOpacity=".9" strokeWidth="3" />
              <path d={routePath} stroke="url(#dvi-linear-day-gradient)" strokeWidth="21" opacity=".42"
                fill="none" filter="url(#dvi-linear-day-glow)" strokeLinecap="round" />
              <path d={routePath} stroke="url(#dvi-linear-day-gradient)" strokeWidth="13"
                fill="none" strokeLinecap="round" />
              <path d={routePath} stroke="#fff" strokeOpacity=".94" strokeWidth="3.1"
                fill="none" strokeLinecap="round" />
              <path d={routePath} stroke="#fff" strokeOpacity=".65" strokeWidth="2"
                fill="none" strokeLinecap="round" strokeDasharray="7 16" />
              <path d={routePath} stroke="url(#dvi-linear-day-gradient)" strokeWidth="14" strokeOpacity=".45"
                fill="none" strokeLinecap="round" strokeDasharray={`${travelled} ${fullLength + 10}`} />
              <path ref={routePathRef} d={routePath} stroke="transparent" strokeWidth="1" fill="none" />
              <g transform={`translate(${startX} ${startY})`}>
                <circle r="25" fill="#9b55fe" fillOpacity=".19" />
                <circle r="14" fill="#fff" stroke="#8e38f4" strokeWidth="5" />
                <circle r="6" fill="#9038f0" />
              </g>
              {days.map((day, index) => (
                <g key={`dvi-day-node-${index}`} transform={`translate(${dayXs[index]} ${dayY})`}
                  className={index === currentDayIndex && !arrived ? "dvi-route-node active" : "dvi-route-node"}>
                  <circle r="23" fill={index === currentDayIndex ? "#ff62c0" : "#a254e9"} fillOpacity=".14" />
                  <circle r="15" fill="#fff" stroke="url(#dvi-linear-day-gradient)" strokeWidth="5" />
                  <circle r="6" fill={index === currentDayIndex ? "#f632a0" : "#9942dc"} />
                </g>
              ))}
              <g transform={`translate(${endX} ${endY})`}>
                <circle r="25" fill="#ff3495" fillOpacity=".17" />
                <circle r="14" fill="#fff" stroke="#f02a98" strokeWidth="5" />
                <circle r="6" fill="#f02a98" />
              </g>
            </svg>
            <div className="dvi-route-airport dvi-route-arrival" style={{ left: `${startX - 22}px` }}>
              <span className="dvi-route-airport-icon" aria-hidden="true">✈</span>
              <span><small>Arrival Destination (Start)</small><strong title={journey.from}>{journey.from}</strong></span>
            </div>
            {days.map((day, index) => (
              <div key={`dvi-day-card-${index}`}
                className={`dvi-route-day ${index === currentDayIndex && !arrived ? "active" : ""}`}
                style={{ left: `${dayXs[index]}px` }}
                title={`Day ${day.day}: ${day.from} → ${day.to}${day.via.length ? ` via ${day.via.join(", ")}` : ""}`}>
                <span className="dvi-route-day-number">Day {day.day}</span>
                <strong>{day.to}</strong>
                {day.via.length > 0 && <small title={day.via.join(" · ")}>Via {day.via.join(" · ")}</small>}
              </div>
            ))}
            <div className="dvi-route-airport dvi-route-departure" style={{ left: `${endX - 40}px` }}>
              <span className="dvi-route-airport-icon" aria-hidden="true">✈</span>
              <span><small>Departure Destination (Finish)</small><strong title={journey.to}>{journey.to}</strong></span>
            </div>
            <div className={`dvi-journey-car dvi-route-car ${arrived ? "arrived" : "driving"}`}
              aria-hidden="true" style={{ left: `${position.x}px`, top: `${position.y}px`,
                transform: `translate(-50%, -50%) rotate(${degrees}deg)` }}>
              <VehicleArt />
            </div>
          </div>
        </div>
        <span id="dvi-journey-status" className="dvi-journey-screenreader" role="status" aria-live="polite">
          {arrived
            ? "Saved itinerary ready. The car has reached the departure destination."
            : journey.phase === "loading-details"
              ? "Itinerary saved. Loading itinerary details and travelling through the entered day-wise route."
              : "Saving itinerary. The car is travelling along the entered day-wise route."}
        </span>
      </div>
    </div>
  );
}
