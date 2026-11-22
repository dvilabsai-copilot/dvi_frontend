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
// Three connected sections: Arrival -> smooth infinity laps -> Departure.
// This is a decorative route, not navigation geometry or a live GPS track.
const ENTRY_PATH = "M 143 220 C 305 285 433 392 550 220";
const INFINITY_LOOP_PATH = "M 550 220 C 641 86 866 87 888 220 C 910 353 649 350 550 220 C 455 84 188 86 208 220 C 226 355 457 355 550 220";
const EXIT_PATH = "M 550 220 C 628 106 780 180 957 220";
type JourneySegment = "entry" | "loop" | "exit";
type JourneyPose = { segment: JourneySegment; fraction: number };
const INITIAL_POSE: JourneyPose = { segment: "entry", fraction: 0 };
const VIEW_W = 1100;
const VIEW_H = 420;

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

export function DviJourneyOverlay() {
  const [journey, setJourney] = useState<DviJourneySnapshot | null>(getDviJourneySnapshot);
  const [pose, setPose] = useState<JourneyPose>(INITIAL_POSE);
  const entryPathRef = useRef<SVGPathElement | null>(null);
  const loopPathRef = useRef<SVGPathElement | null>(null);
  const exitPathRef = useRef<SVGPathElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const currentPose = useRef<JourneyPose>(INITIAL_POSE);
  const activeJourneyId = useRef<number | null>(null);
  const location = useLocation();
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => subscribeDviJourney(() => setJourney(getDviJourneySnapshot())), []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  // Travel between Create Itinerary and the details page without unmounting.
  // Navigating to an unrelated page should never leave a blocking overlay.
  useEffect(() => {
    if (!journey || journey.phase === "arrived") return;
    const path = location.pathname;
    if (!path.startsWith("/create-itinerary") && !path.startsWith("/itinerary-details/")) {
      cancelDviJourney();
    }
  }, [location.pathname, journey]);

  // Keep driving around the infinity path while the REAL API is pending.
  // On confirmed success, finish the current lap, take the exit, then stop.
  useEffect(() => {
    if (!journey) {
      activeJourneyId.current = null;
      currentPose.current = INITIAL_POSE;
      setPose(INITIAL_POSE);
      return;
    }
    if (activeJourneyId.current !== journey.id) {
      activeJourneyId.current = journey.id;
      currentPose.current = INITIAL_POSE;
      setPose(INITIAL_POSE);
    }
    dialogRef.current?.focus();

    if (reducedMotion) {
      const next: JourneyPose = journey.phase === "arrived"
        ? { segment: "exit", fraction: 1 }
        : INITIAL_POSE;
      currentPose.current = next;
      setPose(next);
      return;
    }

    let frame = 0;
    let previous = performance.now();
    const started = previous;
    const advance = (now: number) => {
      const delta = Math.max(0, Math.min(70, now - previous));
      previous = now;
      if (now - started > 180000 && journey.phase !== "arrived") {
        console.warn("[DVI journey] Animation timed out; revealing the actual loading state.");
        cancelDviJourney();
        return;
      }
      let { segment, fraction } = currentPose.current;
      if (journey.phase === "arrived") {
        // Never announce arrival from a timer. This branch runs only after
        // the persisted itinerary is ready on its details page.
        if (segment === "entry") {
          fraction += delta / 480;
          if (fraction >= 1) { segment = "loop"; fraction = 0; }
        } else if (segment === "loop") {
          fraction += delta / 1150;
          if (fraction >= 1) { segment = "exit"; fraction = 0; }
        } else {
          fraction = Math.min(1, fraction + delta / 700);
        }
      } else if (segment === "entry") {
        fraction += delta / 1550;
        if (fraction >= 1) { segment = "loop"; fraction = 0; }
      } else if (segment === "loop") {
        // A closed infinity path makes repeated laps seamless, without
        // teleporting the car back to Arrival while the API is pending.
        fraction = (fraction + delta / 5500) % 1;
      }
      const next: JourneyPose = { segment, fraction };
      currentPose.current = next;
      setPose(next);
      frame = window.requestAnimationFrame(advance);
    };
    frame = window.requestAnimationFrame(advance);
    return () => window.cancelAnimationFrame(frame);
  }, [journey?.id, journey?.phase, reducedMotion]);

  useEffect(() => {
    if (!journey || journey.phase !== "arrived") return;
    const id = journey.id;
    const timeout = window.setTimeout(() => dismissArrivedDviJourney(id), reducedMotion ? 650 : 3200);
    return () => window.clearTimeout(timeout);
  }, [journey?.id, journey?.phase, reducedMotion]);

  if (!journey) return null;
  const activePath = pose.segment === "entry"
    ? entryPathRef.current
    : pose.segment === "exit"
      ? exitPathRef.current
      : loopPathRef.current;
  const length = Math.max(1, activePath?.getTotalLength() ?? 1);
  const distance = Math.max(0, Math.min(length, pose.fraction * length));
  const fallback = pose.segment === "entry"
    ? { x: 143, y: 220 }
    : pose.segment === "exit" && pose.fraction >= 1
      ? { x: 957, y: 220 }
      : { x: 550, y: 220 };
  const position = activePath?.getPointAtLength(distance) ?? fallback;
  const offset = Math.max(2, length * 0.004);
  const before = activePath?.getPointAtLength(Math.max(0, distance - offset)) ?? { x: position.x - 2, y: position.y };
  const after = activePath?.getPointAtLength(Math.min(length, distance + offset)) ?? { x: position.x + 2, y: position.y };
  const degrees = Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI;
  const traveledDistance = pose.fraction * length;
  const arriving = journey.phase === "arrived";
  const loading = journey.phase === "loading-details";
  // Cycle through exactly the routes entered in Create Itinerary.
  // The displayed path is illustrative; GPS distances are never fabricated.
  const plannedLegs = journey.legs ?? [];
  const activeLegIndex = plannedLegs.length < 2 ? 0 :
    pose.segment === "exit" ? plannedLegs.length - 1 :
    pose.segment === "entry" ? 0 :
    Math.min(plannedLegs.length - 1, Math.floor(pose.fraction * plannedLegs.length));
  const activeLeg = plannedLegs[activeLegIndex];
  const loopLength = loopPathRef.current?.getTotalLength() ?? 0;
  const shownCheckpoints = plannedLegs.length > 7
    ? plannedLegs.filter((_, index) => index % Math.ceil(plannedLegs.length / 7) === 0).slice(0, 7)
    : plannedLegs;
  return (
    <div className="dvi-journey-overlay dvi-journey-overlay--bare" role="presentation">
  <div
    className="dvi-journey-card dvi-journey-card--bare"
    ref={dialogRef}
    tabIndex={-1}
    role="dialog"
    aria-modal="true"
    aria-label={arriving ? `Itinerary ready: ${journey.from} to ${journey.to}` : `Creating your itinerary from ${journey.from} to ${journey.to}`}
    aria-describedby="dvi-journey-status"
  >
    <div className="dvi-journey-map dvi-journey-map--infinity dvi-journey-map--bare">
      <svg
        className="dvi-journey-map-svg"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label="A car travelling smoothly along a glowing infinity route from Arrival Place to Departure Place"
      >
        <defs>
          <linearGradient id="dvi-infinity-route" x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="#873afa" />
            <stop offset=".48" stopColor="#c14fe9" />
            <stop offset="1" stopColor="#ff3495" />
          </linearGradient>
          <linearGradient id="dvi-infinity-progress" x1="0" y1="0" x2="1" y2="0">
            <stop stopColor="#a244fa" />
            <stop offset="1" stopColor="#ff4c9b" />
          </linearGradient>
          <filter id="dvi-infinity-glow" x="-35%" y="-45%" width="170%" height="190%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={INFINITY_LOOP_PATH} stroke="url(#dvi-infinity-route)" strokeWidth="24" opacity=".24" filter="url(#dvi-infinity-glow)" />
          <path d={INFINITY_LOOP_PATH} stroke="url(#dvi-infinity-route)" strokeWidth="18" opacity=".14" />
          <path d={INFINITY_LOOP_PATH} stroke="url(#dvi-infinity-route)" strokeWidth="7" opacity=".96" />
          <path d={INFINITY_LOOP_PATH} stroke="#fff" strokeWidth="1.6" strokeDasharray="5 15" opacity=".93" />
          <path d={ENTRY_PATH} stroke="#a74af0" strokeWidth="8" opacity=".19" />
          <path d={ENTRY_PATH} stroke="url(#dvi-infinity-route)" strokeWidth="3.5" opacity=".94" />
          <path d={EXIT_PATH} stroke="#f33eab" strokeWidth="8" opacity=".14" />
          <path d={EXIT_PATH} stroke="url(#dvi-infinity-route)" strokeWidth="3.3" strokeDasharray="6 11" opacity=".9" />
          <path ref={entryPathRef} d={ENTRY_PATH} stroke="transparent" strokeWidth="1" />
          <path ref={loopPathRef} d={INFINITY_LOOP_PATH} stroke="transparent" strokeWidth="1" />
          <path ref={exitPathRef} d={EXIT_PATH} stroke="transparent" strokeWidth="1" />
          <path
            d={pose.segment === "entry" ? ENTRY_PATH : pose.segment === "exit" ? EXIT_PATH : INFINITY_LOOP_PATH}
            stroke="url(#dvi-infinity-progress)"
            strokeWidth="9"
            strokeOpacity=".75"
            strokeDasharray={`${Math.max(0.001, traveledDistance)} ${length + 12}`}
          />
        </g>
        {/* Day-by-day route checkpoints use the entered destinations in order. */}
        {shownCheckpoints.map((leg, index) => {
          if (!loopLength) return null;
          const point = loopPathRef.current!.getPointAtLength(loopLength * (index + 1) / (shownCheckpoints.length + 1));
          const active = leg.day === activeLeg?.day && !arriving;
          return (
            <g key={`dvi-checkpoint-${leg.day}`} className={active ? "dvi-journey-checkpoint active" : "dvi-journey-checkpoint"}>
              <title>{`Day ${leg.day}: ${leg.from} to ${leg.to}${leg.via.length ? ` via ${leg.via.join(", ")}` : ""}`}</title>
              <circle cx={point.x} cy={point.y} r={active ? 12 : 9} fill="white" fillOpacity=".94" stroke={active ? "#f23aa0" : "#8c49ef"} strokeWidth={active ? 4 : 3} />
              <circle cx={point.x} cy={point.y} r="3" fill={active ? "#f23aa0" : "#8c49ef"} />
            </g>
          );
        })}
        <g transform="translate(143 220)">
          <circle r="35" fill="#a348f9" opacity=".13" />
          <circle r="19" fill="#a348f9" opacity=".22" />
          <circle r="10" fill="#873afa" stroke="#fff" strokeWidth="4" />
        </g>
        <g transform="translate(957 220)">
          <circle r="35" fill="#ff3495" opacity=".13" />
          <circle r="19" fill="#ff3495" opacity=".22" />
          <circle r="10" fill="#f82d94" stroke="#fff" strokeWidth="4" />
        </g>
      </svg>
      <div className="dvi-journey-location dvi-journey-start">
        <span className="dvi-journey-pin start" aria-hidden="true" />
        <span>
          <small>Arrival Place · Start</small>
          <strong title={journey.from}>{journey.from}</strong>
        </span>
      </div>
      <div className="dvi-journey-location dvi-journey-end">
        <span className="dvi-journey-pin end" aria-hidden="true" />
        <span>
          <small>Departure Place · Finish</small>
          <strong title={journey.to}>{journey.to}</strong>
        </span>
      </div>
      {activeLeg && (
        <div className="dvi-journey-live-route" role="status" aria-live="off" title={plannedLegs.map(leg => `Day ${leg.day}: ${leg.from} → ${leg.to}`).join(" | ")}>
          <small>Day {activeLeg.day} of {plannedLegs.length} · Your entered route</small>
          <strong>{activeLeg.from} <span aria-hidden="true">→</span> {activeLeg.to}</strong>
          {activeLeg.via.length > 0 && <span className="dvi-journey-via">Via {activeLeg.via.join(" · ")}</span>}
        </div>
      )}
      <div
        className={`dvi-journey-car ${arriving ? "arrived" : "driving"}`}
        aria-hidden="true"
        style={{
          left: `${position.x / VIEW_W * 100}%`,
          top: `${position.y / VIEW_H * 100}%`,
          transform: `translate(-50%, -50%) rotate(${degrees}deg)`,
        }}
      >
        <VehicleArt />
      </div>
    </div>
    <span id="dvi-journey-status" className="dvi-journey-screenreader" role="status" aria-live="polite">
      {arriving
        ? "Itinerary ready. The car has reached your departure place."
        : loading
          ? "Itinerary saved. Waiting for its details to load."
          : plannedLegs.length > 0
            ? `Creating your itinerary. Previewing day ${activeLeg?.day ?? 1}: ${activeLeg?.from} to ${activeLeg?.to}.`
            : "Creating your itinerary. The car is travelling toward your departure place."}
    </span>
  </div>
</div>

  );
}
