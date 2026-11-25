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

// DVI_8081_ONE_SCREEN_SNAKE_V8: readonly route animation; save API unchanged.
type JourneyTransport = "plane" | "train" | "bus" | "car";

function placeTransport(value: unknown, selectedType?: unknown): JourneyTransport {
  const explicit = String(selectedType ?? "").normalize("NFKC").toLowerCase().replace(/[_-]+/g, " ").trim();
  if (/\b(airport|air port|flight|airplane)\b/.test(explicit)) return "plane";
  if (/\b(train|railway|railroad|rail)\b/.test(explicit)) return "train";
  if (/\b(bus|coach)\b/.test(explicit)) return "bus";
  if (/\b(car|cab|vehicle|taxi)\b/.test(explicit)) return "car";
  const place = String(value ?? "").normalize("NFKC").toLowerCase()
    .replace(/[.,()/_-]/g, " ").replace(/\s+/g, " ").trim();
  if (/\b(airport|aerodrome|airfield|airstrip|air terminal|air port|flight|airplane)\b/.test(place)) return "plane";
  if (/\b(railway|rail station|railroad|railway station|train|junction|terminus|egmore|jct|jn|metro station)\b/.test(place) ||
      /\b(chennai central|mumbai central|trivandrum central|thiruvananthapuram central|howrah station|new delhi station)\b/.test(place)) return "train";
  if (/\b(isbt|bus stand|bus station|bus terminal|bus depot|bus stop|busport|bus)\b/.test(place)) return "bus";
  return "car";
}

// DVI_8081_REAL_PHOTO_MODES_V3: realistic vehicle images, never emoji.
const transportImage = (mode: JourneyTransport) => `/assets/dvi-journey/dvi-${mode}.png`;
const modeLabel = (mode: JourneyTransport) =>
  mode === "plane" ? "Airport" : mode === "train" ? "Train" : mode === "bus" ? "Bus" : "Car";

function LocationHeading({ label, place, mode }: { label: "Arrival" | "Departure"; place: string; mode: JourneyTransport }) {
  return (
    <div className="dvi-viz-heading">
      <span className={`dvi-viz-heading-icon dvi-viz-icon-${mode}`} aria-hidden="true">
        <img src={transportImage(mode)} alt="" draggable={false} />
      </span>
      <span className="dvi-viz-heading-text">
        <span className="dvi-viz-heading-caption">{label} ({modeLabel(mode)})</span>
        <strong title={place}>{place}</strong>
      </span>
    </div>
  );
}

export function DviJourneyOverlay() {
  const [journey, setJourney] = useState<DviJourneySnapshot | null>(getDviJourneySnapshot);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const activeJourneyIdRef = useRef<number | null>(null);
  const routePathRef = useRef<SVGPathElement | null>(null);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === "undefined" ? 1365 : window.innerWidth,
    height: typeof window === "undefined" ? 768 : window.innerHeight,
  }));
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const location = useLocation();

  useEffect(() => subscribeDviJourney(() => setJourney(getDviJourneySnapshot())), []);
  useEffect(() => {
    const handleResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);
  useEffect(() => {
    if (!journey || journey.phase === "arrived") return;
    if (!location.pathname.startsWith("/create-itinerary") && !location.pathname.startsWith("/itinerary-details/")) {
      cancelDviJourney();
    }
  }, [location.pathname, journey]);

  // Show the entered stops, but do not repeat the final drop at the Departure label.
  const allDays = journey?.legs ?? [];
  const cleanLocation = (value: unknown) => String(value ?? "")
    .normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const days = allDays.filter((day, index) =>
    !(index === allDays.length - 1 && cleanLocation(day.to) === cleanLocation(journey?.to))
  );

  // A single continuous S-route: four checkpoints per horizontal lane, then turn back.
  // This uses illustrative geometry; the itinerary's real place order is unchanged.
  const stageWidth = 1180;
  const laneTop = 216;
  const rowGap = 202;
  const laneLeft = 215;
  const columnGap = 250;
  const columns = 4;
  const rows = Math.max(1, Math.ceil(days.length / columns));
  const dayPoints = days.map((_, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    return {
      x: laneLeft + (row % 2 === 0 ? col : columns - 1 - col) * columnGap,
      y: laneTop + row * rowGap,
      row,
    };
  });
  const startX = 86;
  const startY = 114;
  const first = dayPoints[0] ?? { x: 465, y: laneTop, row: 0 };
  const last = dayPoints[dayPoints.length - 1] ?? first;
  const finalDirection = last.row % 2 === 0 ? 1 : -1;
  const endX = Math.max(96, Math.min(stageWidth - 95, last.x + finalDirection * 125));
  const endY = last.y + 93;
  const stageHeight = endY + 101;

  let routePath = `M ${startX} ${startY} C ${startX + 49} ${startY + 75} ${first.x - 120} ${first.y} ${first.x} ${first.y}`;
  for (let i = 1; i < dayPoints.length; i += 1) {
    const previous = dayPoints[i - 1];
    const current = dayPoints[i];
    if (current.row === previous.row) {
      routePath += ` L ${current.x} ${current.y}`;
    } else {
      const turn = previous.row % 2 === 0 ? 115 : -115;
      routePath += ` C ${previous.x + turn} ${previous.y} ${current.x + turn} ${current.y} ${current.x} ${current.y}`;
    }
  }
  routePath += ` C ${last.x + finalDirection * 62} ${last.y} ${endX - finalDirection * 43} ${endY - 35} ${endX} ${endY}`;
  const fitScale = Math.min(
    1,
    Math.max(.64, (viewport.width - 22) / stageWidth),
    Math.max(.64, (viewport.height - 22) / stageHeight)
  );
  const fitWidth = stageWidth * fitScale;
  const fitHeight = stageHeight * fitScale;

  // Visual progress is bounded while save is pending; the real controller confirms arrival.
  useEffect(() => {
    if (!journey) {
      activeJourneyIdRef.current = null;
      progressRef.current = 0;
      setProgress(0);
      return;
    }
    if (activeJourneyIdRef.current !== journey.id) {
      activeJourneyIdRef.current = journey.id;
      progressRef.current = 0;
      setProgress(0);
    }
    dialogRef.current?.focus();
    if (reducedMotion) {
      const value = journey.phase === "arrived" ? 1 : 0.9;
      progressRef.current = value;
      setProgress(value);
      return;
    }
    let frame = 0;
    let lastFrame = performance.now();
    const started = lastFrame;
    const advance = (now: number) => {
      const delta = Math.min(75, Math.max(0, now - lastFrame));
      lastFrame = now;
      if (now - started > 180000 && journey.phase !== "arrived") {
        cancelDviJourney();
        return;
      }
      const ready = journey.phase === "arrived";
      const cap = ready ? 1 : 0.9;
      const duration = ready ? 1750 : Math.max(7800, days.length * 1300);
      const next = Math.min(cap, progressRef.current + delta / duration);
      progressRef.current = next;
      setProgress(next);
      if (next < cap) frame = window.requestAnimationFrame(advance);
    };
    frame = window.requestAnimationFrame(advance);
    return () => window.cancelAnimationFrame(frame);
  }, [journey?.id, journey?.phase, reducedMotion, days.length]);

  // Do not hide the overlay before the vehicle completes its final movement.
  useEffect(() => {
    if (!journey || journey.phase !== "arrived" || progress < .999) return;
    const id = journey.id;
    const timer = window.setTimeout(() => dismissArrivedDviJourney(id), reducedMotion ? 650 : 1000);
    return () => window.clearTimeout(timer);
  }, [journey?.id, journey?.phase, progress, reducedMotion]);

  if (!journey) return null;
  const arrivalMode = placeTransport(journey.from, (journey as DviJourneySnapshot & { arrivalType?: string }).arrivalType);
  const departureMode = placeTransport(journey.to, (journey as DviJourneySnapshot & { departureType?: string }).departureType);
  const pathLength = Math.max(1, routePathRef.current?.getTotalLength() ?? 1);
  const travelled = Math.min(pathLength, Math.max(0, pathLength * progress));
  const position = routePathRef.current?.getPointAtLength(travelled) ?? { x: startX, y: startY };
  const prev = routePathRef.current?.getPointAtLength(Math.max(0, travelled - 7)) ?? { x: position.x - 7, y: position.y };
  const next = routePathRef.current?.getPointAtLength(Math.min(pathLength, travelled + 7)) ?? { x: position.x + 7, y: position.y };
  const direction = Math.atan2(next.y - prev.y, next.x - prev.x) * 180 / Math.PI;
  const goingLeft = next.x < prev.x - .5;
  const tilt = Math.max(-12, Math.min(12, (goingLeft ? direction - Math.sign(direction || 1) * 180 : direction) * .22));
  const firstLegPoint = dayPoints[0];
  const lastLegPoint = dayPoints[dayPoints.length - 1];
  const startSegment = firstLegPoint ? Math.hypot(firstLegPoint.x - startX, firstLegPoint.y - startY) : 130;
  const finishSegment = lastLegPoint ? Math.hypot(endX - lastLegPoint.x, endY - lastLegPoint.y) : 130;
  const firstThreshold = Math.min(.22, Math.max(.05, startSegment / pathLength));
  const finishThreshold = Math.min(.20, Math.max(.05, finishSegment / pathLength));
  const currentTransport: JourneyTransport = progress <= firstThreshold
    ? arrivalMode : progress >= 1 - finishThreshold ? departureMode : "car";
  const currentDayIndex = days.length && progress > firstThreshold && progress < 1 - finishThreshold
    ? dayPoints.reduce((best, point, index) => {
        const bestPoint = dayPoints[best];
        const score = (point.x - position.x) ** 2 + (point.y - position.y) ** 2;
        const bestScore = (bestPoint.x - position.x) ** 2 + (bestPoint.y - position.y) ** 2;
        return score < bestScore ? index : best;
      }, 0)
    : -1;
  const departureLabelX = Math.max(65, Math.min(stageWidth - 335, endX - 100));

  return (
    <div className="dvi-viz-overlay" role="presentation">
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true"
        aria-label={`Creating itinerary from ${journey.from} to ${journey.to}`}
        aria-describedby="dvi-viz-status" className="dvi-viz-shell">
        <div className="dvi-viz-fit" style={{ width: `${fitWidth}px`, height: `${fitHeight}px` }}>
          <div className="dvi-viz-stage" style={{ width: `${stageWidth}px`, height: `${stageHeight}px`, transform: `scale(${fitScale})` }}>
            <svg className="dvi-viz-road" width={stageWidth} height={stageHeight}
              viewBox={`0 0 ${stageWidth} ${stageHeight}`} aria-hidden="true">
              <defs>
                <linearGradient id="dvi-viz-gradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#7925fa" />
                  <stop offset=".49" stopColor="#be39f6" />
                  <stop offset="1" stopColor="#fc299c" />
                </linearGradient>
                <filter id="dvi-viz-glow" x="-30%" y="-90%" width="160%" height="280%">
                  <feGaussianBlur stdDeviation="6" />
                </filter>
              </defs>
              <path d={`M ${startX} 62 V ${startY}`} fill="none" stroke="white" strokeWidth="3" opacity=".92" />
              <path d={`M ${endX} ${endY} v 29`} fill="none" stroke="white" strokeWidth="3" opacity=".92" />
              <path d={routePath} fill="none" stroke="url(#dvi-viz-gradient)" strokeWidth="26"
                strokeLinecap="round" opacity=".52" filter="url(#dvi-viz-glow)" />
              <path d={routePath} fill="none" stroke="url(#dvi-viz-gradient)" strokeWidth="13"
                strokeLinecap="round" strokeLinejoin="round" />
              <path d={routePath} fill="none" stroke="white" opacity=".94" strokeWidth="2.6" strokeLinecap="round" />
              <path ref={routePathRef} d={routePath} fill="none" stroke="transparent" strokeWidth="1" />
              <g transform={`translate(${startX} ${startY})`}>
                <circle r="25" fill="#9638f8" opacity=".22" />
                <circle r="16" fill="white" stroke="#8e31ee" strokeWidth="5" />
                <circle r="6" fill="#9132e9" />
              </g>
              {dayPoints.map((point, index) => (
                <g key={`dvi-viz-node-${index}`} transform={`translate(${point.x} ${point.y})`}>
                  <path d={index === 0 ? "M 0 -16 V -74" : "M 0 -16 V -34"} fill="none" stroke="white" strokeWidth="3" opacity=".94" />
                  <circle r="24" fill={index === currentDayIndex ? "#f238aa" : "#a44cf1"} opacity=".21" />
                  <circle r="15" fill="white" stroke="url(#dvi-viz-gradient)" strokeWidth="5" />
                  <circle r="6" fill={index === currentDayIndex ? "#ee24a9" : "#a033df"} />
                </g>
              ))}
              <g transform={`translate(${endX} ${endY})`}>
                <circle r="25" fill="#ff298f" opacity=".24" />
                <circle r="16" fill="white" stroke="#f02a9b" strokeWidth="5" />
                <circle r="6" fill="#ef289b" />
              </g>
            </svg>
            <div className="dvi-viz-arrival" style={{ left: `${startX - 24}px`, top: `${startY - 112}px` }}>
              <LocationHeading label="Arrival" mode={arrivalMode} place={journey.from} />
            </div>
            {days.map((day, index) => (
              <div key={`dvi-viz-day-${index}`}
                className={`dvi-viz-day ${index === currentDayIndex ? "dvi-viz-day-active" : ""}`}
                style={{ left: `${dayPoints[index].x}px`, top: `${dayPoints[index].y - (index === 0 ? 150 : 110)}px` }}
                title={`Day ${day.day}: ${day.from} → ${day.to}${day.via.length ? ` via ${day.via.join(", ")}` : ""}`}>
                <span className="dvi-viz-day-number">Day {day.day}</span>
                <strong title={day.to}>{day.to}</strong>
              </div>
            ))}
            <div className="dvi-viz-departure"
              style={{ left: `${departureLabelX}px`, top: `${endY + 30}px` }}>
              <LocationHeading label="Departure" mode={departureMode} place={journey.to} />
            </div>
            <div className={`dvi-viz-moving dvi-viz-moving-${currentTransport}`} aria-hidden="true"
              style={{ left: `${position.x}px`, top: `${position.y}px`,
                transform: `translate(-50%, -50%) rotate(${tilt}deg) scaleX(${goingLeft ? -1 : 1})` }}>
              <img src={transportImage(currentTransport)} alt="" draggable={false} />
            </div>
          </div>
        </div>
        <span id="dvi-viz-status" className="dvi-viz-screenreader" role="status" aria-live="polite">
          {journey.phase === "arrived"
            ? "Itinerary ready. Completing the final journey animation."
            : journey.phase === "loading-details"
              ? "Itinerary saved. Loading details and showing the entered route."
              : "Saving itinerary. Showing the entered route."}
        </span>
      </div>
    </div>
  );
}
