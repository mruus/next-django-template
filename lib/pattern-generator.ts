export interface PatternItem {
  x: number;
  y: number;
  scale: number;
  rotate: number;
  opacity: number;
  sizePx: number;
}

export interface PatternConfig {
  count: number;
  baseSize: number;
  scaleRange: { min: number; max: number };
  minGap: number;
  edgePad: number;
  opacity: number;
  seed: number;
  size: "sm" | "md" | "lg" | "xl";
}

export type PatternAsset = {
  src: string;
  type: "svg" | "png" | "jpeg";
  width?: number;
  height?: number;
};

const mulberry32 = (seed: number) => {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const generatePattern = (config: PatternConfig): PatternItem[] => {
  const rng = mulberry32(config.seed);
  const w = 1920;
  const h = 1080;

  const maxScale = config.scaleRange.max;
  const maxIcon = config.baseSize * maxScale;
  const minDist = maxIcon + config.minGap;

  const k = 30;
  const cell = minDist / Math.SQRT2;
  const cols = Math.ceil(w / cell);
  const rows = Math.ceil(h / cell);
  const grid = new Array<number>(cols * rows).fill(-1);

  const points: { x: number; y: number }[] = [];
  const active: number[] = [];

  const pad = Math.max(config.edgePad, maxIcon / 2);
  const randIn = (min: number, max: number) => min + rng() * (max - min);

  const place = (x: number, y: number) => {
    const gi = Math.floor(x / cell);
    const gj = Math.floor(y / cell);
    grid[gj * cols + gi] = points.length;
    points.push({ x, y });
    active.push(points.length - 1);
  };

  place(randIn(pad, w - pad), randIn(pad, h - pad));

  while (active.length && points.length < config.count) {
    const aIdx = Math.floor(rng() * active.length);
    const p = points[active[aIdx]];
    let found = false;

    for (let i = 0; i < k; i++) {
      const r = randIn(minDist, 2 * minDist);
      const theta = randIn(0, Math.PI * 2);
      const x = p.x + r * Math.cos(theta);
      const y = p.y + r * Math.sin(theta);

      if (x < pad || x > w - pad || y < pad || y > h - pad) continue;

      const gi = Math.floor(x / cell);
      const gj = Math.floor(y / cell);
      let ok = true;

      for (let yy = Math.max(0, gj - 2); yy <= Math.min(rows - 1, gj + 2); yy++) {
        for (let xx = Math.max(0, gi - 2); xx <= Math.min(cols - 1, gi + 2); xx++) {
          const idx = grid[yy * cols + xx];
          if (idx === -1) continue;
          const q = points[idx];
          const dx = q.x - x;
          const dy = q.y - y;
          if (dx * dx + dy * dy < minDist * minDist) {
            ok = false;
            break;
          }
        }
        if (!ok) break;
      }

      if (ok) {
        place(x, y);
        found = true;
        break;
      }
    }
    if (!found) active.splice(aIdx, 1);
  }

  return points.map((p) => {
    const scale = config.scaleRange.min + rng() * (config.scaleRange.max - config.scaleRange.min);
    const rotate = rng() * 12 - 6;
    const localOpacity = config.opacity * (0.7 + rng() * 0.6);
    return {
      x: Math.round(p.x * 1000) / 1000,
      y: Math.round(p.y * 1000) / 1000,
      scale: Math.round(scale * 1000) / 1000,
      rotate: Math.round(rotate * 1000) / 1000,
      opacity: Math.round(localOpacity * 1000000) / 1000000,
      sizePx: config.baseSize,
    };
  });
};
