"use client";

import { useRef, useState, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const ITEM_H = 52;           // height of one row in px
const VISIBLE = 5;           // how many rows are visible in the drum window
const DRUM_H = ITEM_H * VISIBLE; // total height of the viewport (52 × 5 = 260px)

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Zero-pads a number to 2 digits: 4 → "04" */
function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** True modulo that always returns a positive result.
 *  JS % can return negative values for negative numbers.
 *  e.g. mod(-1, 12) → 11  (not -1) */
function mod(n: number, m: number) {
  return ((n % m) + m) % m;
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface ColumnProps {
  items: string[];
  initialIndex?: number;
  onChange?: (value: string) => void;
  width?: number;
  /** When true  → list wraps infinitely (hours, minutes)
   *  When false → hard stops at first and last item (AM/PM) */
  infinite?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// DrumColumn
// ─────────────────────────────────────────────────────────────────────────────
/**
 * A single scrollable column.
 *
 * HOW THE POSITION SYSTEM WORKS
 * ──────────────────────────────
 * Framer Motion's `useMotionValue` holds the current `translateY` of the
 * inner track div. Negative values scroll down (earlier items move off-screen
 * upward). Specifically:
 *
 *   y = 0          → item[0] is centred
 *   y = -ITEM_H    → item[1] is centred
 *   y = -2*ITEM_H  → item[2] is centred  … and so on
 *
 * INFINITE MODE (hours, minutes)
 * ────────────────────────────────
 * We render 3 identical copies of the list back-to-back:
 *   [ copy-A (ghost top) | copy-B (real) | copy-C (ghost bottom) ]
 *
 * The track starts positioned so copy-B is visible. GHOST = items.length is
 * the offset that maps copy-B's item[0] to y = -(GHOST * ITEM_H).
 *
 * `loopClamp` silently teleports the y value when the user drifts into a ghost
 * copy, keeping it always pointing into copy-B. Because the teleport is
 * invisible (copies look identical), the loop feels seamless.
 *
 * FINITE MODE (AM/PM)
 * ─────────────────────
 * No ghost copies. We render items once. `clampFinite` prevents y from going
 * above item[0] or below item[last], so the column hard-stops at the edges.
 */
function DrumColumn({
  items,
  initialIndex = 0,
  onChange,
  width = 72,
  infinite = true,
}: ColumnProps) {
  const count = items.length;

  // ── In infinite mode we prepend `count` ghost items (one full copy).
  //    GHOST is the index offset so the "real" copy starts at position GHOST.
  const GHOST = infinite ? count : 0;

  // ── useMotionValue stores the track's translateY.
  //    Initial position centres initialIndex inside the real copy.
  const y = useMotionValue(-(initialIndex + GHOST) * ITEM_H);

  // ── Refs to track drag velocity (for momentum / flick behaviour)
  const velRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTRef = useRef(Date.now());
  const snapTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // ── INFINITE: teleport y back into the middle copy when it drifts to a ghost
  function loopClamp(val: number): number {
    if (!infinite) return val;
    const min = -(GHOST + count - 1) * ITEM_H; // bottom of real copy
    const max = -GHOST * ITEM_H;               // top of real copy
    if (val < min) return val + count * ITEM_H; // drifted to ghost-bottom → jump back
    if (val > max) return val - count * ITEM_H; // drifted to ghost-top   → jump forward
    return val;
  }

  // ── FINITE: clamp y so it cannot go beyond the first or last item
  function clampFinite(val: number): number {
    const min = -(count - 1) * ITEM_H; // y when last item is centred
    const max = 0;                      // y when first item is centred
    return Math.max(min, Math.min(max, val));
  }

  // ── apply the right boundary logic depending on mode
  function applyBounds(val: number): number {
    return infinite ? loopClamp(val) : clampFinite(val);
  }

  // ── Convert a raw y value → list index
  function getIndex(val: number): number {
    const raw = Math.round(-val / ITEM_H) - GHOST;
    return infinite ? mod(raw, count) : Math.max(0, Math.min(count - 1, raw));
  }

  // ── Animate to the nearest copy of `idx` and call onChange when done
  const snapToIndex = useCallback(
    (idx: number) => {
      const cur = y.get();

      let best: number;

      if (infinite) {
        // Find the closest copy among ghost-top, real, ghost-bottom
        const targets = [-1, 0, 1].map((k) => -(idx + GHOST + k * count) * ITEM_H);
        best = targets.reduce((a, b) =>
          Math.abs(b - cur) < Math.abs(a - cur) ? b : a
        );
      } else {
        // Finite: only one position is valid
        best = -idx * ITEM_H;
      }

      animate(y, best, {
        type: "spring",
        stiffness: 300,
        damping: 35,
        mass: 0.8,
        onUpdate: (v) => {
          // Keep applying loop/clamp during spring animation
          const bounded = applyBounds(v);
          if (bounded !== v) y.set(bounded);
        },
        onComplete: () => onChange?.(items[idx]),
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, infinite, items, onChange]
  );

  // ── POINTER DOWN: capture pointer so we keep receiving events even if cursor
  //    leaves the element; reset velocity tracking
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    lastYRef.current = e.clientY;
    lastTRef.current = Date.now();
    velRef.current = 0;
    clearTimeout(snapTimerRef.current);
  }, []);

  // ── POINTER MOVE: translate y by mouse delta; update velocity
  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!(e.buttons & 1)) return; // only while left button held

      const now = Date.now();
      const dt = now - lastTRef.current || 1;
      // velocity in px-per-frame (normalised to 60fps)
      velRef.current = ((e.clientY - lastYRef.current) / dt) * 16;
      lastYRef.current = e.clientY;
      lastTRef.current = now;

      const next = applyBounds(y.get() + e.movementY);
      y.set(next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [infinite]
  );

  // ── POINTER UP: apply momentum, then snap to nearest item
  const onPointerUp = useCallback(() => {
    // Clamp momentum to at most 4 items worth of throw
    const momentum = Math.max(
      Math.min(velRef.current * 6, ITEM_H * 4),
      -ITEM_H * 4
    );
    const raw = applyBounds(y.get() + momentum);
    y.set(raw);
    snapToIndex(getIndex(raw));
  }, [snapToIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── WHEEL: direct scroll; debounced snap after 120ms of silence
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const next = applyBounds(y.get() - e.deltaY * 0.5);
      y.set(next);
      clearTimeout(snapTimerRef.current);
      snapTimerRef.current = setTimeout(() => {
        snapToIndex(getIndex(y.get()));
      }, 120);
    },
    [snapToIndex] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ── Build the rendered list.
  //    Infinite → 3 copies  |  Finite → 1 copy
  const allItems = infinite ? [...items, ...items, ...items] : items;

  return (
    <div
      style={{
        position: "relative",
        width,
        height: DRUM_H,
        overflow: "hidden",
        cursor: "grab",
        userSelect: "none",
        touchAction: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      {/*
        The track is positioned so that its top sits at the vertical centre of
        the drum minus half an item height. This means item[0] starts exactly
        centred, and each subsequent item is one ITEM_H below.
        The `y` motion value slides the whole track up/down.
      */}
      <motion.div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: DRUM_H / 2 - ITEM_H / 2,
          y,
        }}
      >
        {allItems.map((label, i) => (
          <DrumItem
            key={`${label}-${i}`}
            label={label}
            index={i}
            y={y}
            ghostOffset={GHOST}
          />
        ))}
      </motion.div>

      {/* Gradient masks fade out items toward top and bottom edges */}
      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, var(--mask-color,rgba(255,255,255,0.2)) 0%, transparent 38%, transparent 62%, var(--mask-color,rgba(255,255,255,0.2)) 100%)",
          zIndex: 2,
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DrumItem
// ─────────────────────────────────────────────────────────────────────────────
/**
 * A single row inside the drum.
 *
 * HOW THE VISUAL EFFECT WORKS
 * ────────────────────────────
 * Each item subscribes to the shared `y` motion value via `useTransform`.
 * On every frame, it computes how far it is from the centre (in item-units),
 * then maps that distance to opacity, scale, and font-weight.
 *
 * distance = 0   → item is perfectly centred   → full opacity, larger scale
 * distance = 1   → one slot away               → dimmer, smaller
 * distance = 2+  → far away                    → almost invisible
 *
 * Because `useTransform` is reactive to a MotionValue, these updates happen
 * in Framer Motion's animation loop — no React re-renders needed.
 */
function DrumItem({
  label,
  index,
  y,
  ghostOffset,
}: {
  label: string;
  index: number;
  y: ReturnType<typeof useMotionValue<number>>;
  ghostOffset: number;
}) {
  /**
   * `centreY` is the exact y value at which THIS item would be perfectly centred.
   * When `y === centreY`, distance === 0.
   *
   * Formula: the track's top is at (DRUM_H/2 - ITEM_H/2).
   *   Item i sits at top-offset = i * ITEM_H from the track's origin.
   *   Centre of item i in track-space = i * ITEM_H + ITEM_H/2.
   *   The drum's centre in track-space = DRUM_H/2.
   *   They align when y + i*ITEM_H + ITEM_H/2 == DRUM_H/2
   *   → y = -(i * ITEM_H)   (the DRUM_H/2 - ITEM_H/2 offsets cancel out)
   */
  const distance = useTransform(y, (yVal) => {
    const centreY = -index * ITEM_H;
    return Math.abs(yVal - centreY) / ITEM_H;
  });

  // Map distance → visual properties
  const opacity = useTransform(distance, [0, 1, 2, 3], [1, 0.75, 0.55, 0.4]);
  // const scale = useTransform(distance, [0, 1, 2], [1.1, 0.95, 0.85]);
  const fontWeight = useTransform(distance, (d) => (d < 0.5 ? 500 : 300));
  const fontSize = useTransform(distance, [0, 1, 2], [30, 26, 22]);

  return (
    <motion.div
      style={{
        height: ITEM_H,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'DM Mono', 'Courier New', monospace",
        letterSpacing: "0.05em",
        color: "var(--picker-text, #111)",
        opacity,
        fontWeight,
        fontSize
      }}
    >
      {label}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TimePicker  (the assembled component)
// ─────────────────────────────────────────────────────────────────────────────
interface TimePickerProps {
  defaultHour?: number;      // 1–12
  defaultMinute?: number;    // 0–59
  defaultAmPm?: "AM" | "PM";
  onChange?: (time: { hour: string; minute: string; ampm: string }) => void;
}

export default function TimePicker({
  defaultHour = 8,
  defaultMinute = 4,
  defaultAmPm = "AM",
  onChange,
}: TimePickerProps) {
  const ampmItems = ["AM", "PM"];
  const hourItems = Array.from({ length: 12 }, (_, i) => pad(i + 1));
  const minuteItems = Array.from({ length: 60 }, (_, i) => pad(i));

  const [value, setValue] = useState({
    hour: pad(defaultHour),
    minute: pad(defaultMinute),
    ampm: defaultAmPm,
  });

  /** Returns a stable onChange handler for each field key */
  const update = useCallback(
    (key: keyof typeof value) => (v: string) => {
      setValue((prev) => {
        const next = { ...prev, [key]: v };
        onChange?.(next);
        return next;
      });
    },
    [onChange]
  );

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "8px 20px",
        borderRadius: 24,
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        boxShadow:
          "0 8px 48px rgba(0,0,0,0.14), 0 1.5px 6px rgba(0,0,0,0.08), inset 0 0 0 0.5px rgba(0,0,0,0.08)",
        position: "relative",
      }}
    >
      {/* Blue highlight bar — always sits in the vertical centre */}
      <div
        style={{
          pointerEvents: "none",
          position: "absolute",
          left: 12,
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
          height: ITEM_H,
          borderRadius: 14,
          background: "rgba(59,130,246,0.10)",
          borderTop: "1.5px solid rgba(59,130,246,0.26)",
          borderBottom: "1.5px solid rgba(59,130,246,0.26)",
          zIndex: 1,
        }}
      />

      {/* AM/PM — infinite={false}, hard stops at AM and PM */}
      <DrumColumn
        items={ampmItems}
        initialIndex={ampmItems.indexOf(defaultAmPm)}
        onChange={update("ampm")}
        width={60}
        infinite={false}
      />

      {/* Hours — infinite looping 01–12 */}
      <DrumColumn
        items={hourItems}
        initialIndex={defaultHour - 1}
        onChange={update("hour")}
        width={68}
        infinite={true}
      />

      {/* Colon separator */}
      <div
        style={{
          fontSize: 30,
          fontWeight: 300,
          fontFamily: "'DM Mono', monospace",
          color: "rgba(0,0,0,0.35)",
          padding: "0 2px",
          lineHeight: 1,
          userSelect: "none",
          zIndex: 3,
          marginBottom: 4,
        }}
      >
        :
      </div>

      {/* Minutes — infinite looping 00–59 */}
      <DrumColumn
        items={minuteItems}
        initialIndex={defaultMinute}
        onChange={update("minute")}
        width={68}
        infinite={true}
      />
    </div>
  );
}