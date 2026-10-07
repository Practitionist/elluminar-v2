/**
 * Tier-2 Voice-over-Canvas Frame Interpolator
 * Synchronizes 24kbps Opus Cloudflare R2 audio streams with smooth 60fps camera pan/zoom & laser pointer keyframes.
 */

export interface CanvasViewportKeyframe {
  timestampMs: number;
  scrollX: number;
  scrollY: number;
  zoom: number;
  pointerX: number;
  pointerY: number;
}

export interface InterpolatedViewportFrame {
  timestampMs: number;
  scrollX: number;
  scrollY: number;
  zoom: number;
  pointerX: number;
  pointerY: number;
}

function lerp(start: number, end: number, alpha: number): number {
  return start + (end - start) * alpha;
}

/**
 * Deterministically interpolates viewport camera & pointer coordinates at `targetTimestampMs`
 * using binary search over sorted keyframes.
 */
export function interpolateCanvasVoiceViewport(
  keyframes: readonly CanvasViewportKeyframe[],
  targetTimestampMs: number
): InterpolatedViewportFrame {
  if (keyframes.length === 0) {
    throw new Error("Cannot interpolate an empty CanvasVoiceReplay timeline");
  }

  const first = keyframes[0]!;
  if (keyframes.length === 1 || targetTimestampMs <= first.timestampMs) {
    return {
      timestampMs: targetTimestampMs,
      scrollX: first.scrollX,
      scrollY: first.scrollY,
      zoom: first.zoom,
      pointerX: first.pointerX,
      pointerY: first.pointerY,
    };
  }

  const last = keyframes[keyframes.length - 1]!;
  if (targetTimestampMs >= last.timestampMs) {
    return {
      timestampMs: targetTimestampMs,
      scrollX: last.scrollX,
      scrollY: last.scrollY,
      zoom: last.zoom,
      pointerX: last.pointerX,
      pointerY: last.pointerY,
    };
  }

  // Binary search for surrounding keyframe interval [lo, hi]
  let lo = 0;
  let hi = keyframes.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >>> 1;
    if (keyframes[mid]!.timestampMs <= targetTimestampMs) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const k0 = keyframes[lo]!;
  const k1 = keyframes[hi]!;
  const span = k1.timestampMs - k0.timestampMs;
  const alpha = span > 0 ? (targetTimestampMs - k0.timestampMs) / span : 0;

  return {
    timestampMs: targetTimestampMs,
    scrollX: lerp(k0.scrollX, k1.scrollX, alpha),
    scrollY: lerp(k0.scrollY, k1.scrollY, alpha),
    zoom: lerp(k0.zoom, k1.zoom, alpha),
    pointerX: lerp(k0.pointerX, k1.pointerX, alpha),
    pointerY: lerp(k0.pointerY, k1.pointerY, alpha),
  };
}
