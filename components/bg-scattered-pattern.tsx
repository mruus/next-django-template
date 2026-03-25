"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  generatePattern,
  PatternItem,
  PatternConfig,
} from "@/lib/pattern-generator";
import Logo from "@/app/[locale]/(home)/components/logo";
import { useTheme } from "next-themes";

type SizeOpt = "sm" | "md" | "lg" | "xl";

interface Props {
  className?: string;
  count?: number;
  baseSize?: number;
  scaleRange?: { min: number; max: number };
  minGap?: number;
  edgePad?: number;
  seed?: number;
  size?: SizeOpt;
}

export function PatternBackground({
  className,
  count = 180,
  baseSize,
  scaleRange: scaleRangeProp,
  minGap = 10,
  edgePad = 12,
  seed = 20250915,
  size = "sm",
}: Props) {
  const { resolvedTheme } = useTheme();
  const opacity = resolvedTheme === "dark" ? 0.02 : 0.04;
  const { theme } = useTheme();
  const scaleRange = React.useMemo(
    () => scaleRangeProp ?? { min: 0.9, max: 1.15 },
    [scaleRangeProp],
  );

  const effectiveBaseSize =
    baseSize ??
    ({ sm: 24, md: 32, lg: 40, xl: 48 } as Record<SizeOpt, number>)[size];

  const [isClient, setIsClient] = React.useState(false);
  const [items, setItems] = React.useState<PatternItem[]>([]);

  const [patternSize, setPatternSize] = React.useState({ w: 1920, h: 1080 });

  React.useEffect(() => {
    if (!isClient) return;

    const updateSize = () => {
      setPatternSize({
        w: window.innerWidth,
        h: window.innerHeight,
      });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [isClient]);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    if (!isClient) return;
    try {
      const config: PatternConfig = {
        count,
        baseSize: effectiveBaseSize,
        scaleRange,
        minGap,
        edgePad,
        opacity,
        seed,
        size,
      };
      setItems(generatePattern(config));
    } catch {
      setItems([]);
    }
  }, [
    isClient,
    count,
    effectiveBaseSize,
    scaleRange,
    minGap,
    edgePad,
    opacity,
    seed,
    size,
  ]);

  if (!isClient || items.length === 0) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 w-full h-full pointer-events-none",
        className,
      )}
    >
      {items.map((it, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${(it.x / patternSize.w) * 100}%`,
            top: `${(it.y / patternSize.h) * 100}%`,
            width: `${it.sizePx}px`,
            height: `${it.sizePx}px`,
            transform: `translate3d(-50%, -50%, 0) scale3d(${it.scale}, ${it.scale}, 1) rotate(${it.rotate}deg)`,
            opacity: it.opacity,
          }}
        >
          <Logo className="text-primary w-full h-full" />
        </div>
      ))}
    </div>
  );
}
