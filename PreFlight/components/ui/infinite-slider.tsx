"use client";

import { cn } from "@/lib/utils";
import React, { useRef, useEffect, useState, useCallback } from "react";

interface InfiniteSliderProps extends React.ComponentProps<"div"> {
  gap?: number;
  speed?: number;
  speedOnHover?: number;
  reverse?: boolean;
}

export function InfiniteSlider({
  children,
  gap = 40,
  speed = 60,
  speedOnHover = 20,
  reverse = false,
  className,
  ...props
}: InfiniteSliderProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const animRef = useRef<number>(0);
  const offsetRef = useRef(0);
  const hoveredRef = useRef(false);

  useEffect(() => {
    if (innerRef.current) {
      setContentWidth(innerRef.current.scrollWidth / 2);
    }
  }, [children]);

  const tick = useCallback(
    (prev: number, ts: number) => {
      const dt = (ts - prev) / 1000;
      const s = hoveredRef.current ? speedOnHover : speed;
      offsetRef.current += s * dt * (reverse ? 1 : -1);

      if (contentWidth > 0) {
        if (!reverse && offsetRef.current <= -contentWidth) {
          offsetRef.current += contentWidth;
        } else if (reverse && offsetRef.current >= 0) {
          offsetRef.current -= contentWidth;
        }
      }

      if (innerRef.current) {
        innerRef.current.style.transform = `translate3d(${offsetRef.current}px, 0, 0)`;
      }

      animRef.current = requestAnimationFrame((next) => tick(ts, next));
    },
    [contentWidth, speed, speedOnHover, reverse]
  );

  useEffect(() => {
    let prev = performance.now();
    animRef.current = requestAnimationFrame((ts) => {
      prev = ts;
      animRef.current = requestAnimationFrame((next) => tick(prev, next));
    });
    return () => cancelAnimationFrame(animRef.current);
  }, [tick]);

  const items = React.Children.toArray(children);

  return (
    <div
      ref={wrapperRef}
      className={cn("overflow-hidden", className)}
      onMouseEnter={() => (hoveredRef.current = true)}
      onMouseLeave={() => (hoveredRef.current = false)}
      {...props}
    >
      <div ref={innerRef} className="flex w-max will-change-transform" style={{ gap }}>
        {items.map((child, i) => (
          <React.Fragment key={`a-${i}`}>{child}</React.Fragment>
        ))}
        {items.map((child, i) => (
          <React.Fragment key={`b-${i}`}>{child}</React.Fragment>
        ))}
      </div>
    </div>
  );
}
