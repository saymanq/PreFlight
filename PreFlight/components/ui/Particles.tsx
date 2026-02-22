"use client";

import React, { type ComponentPropsWithoutRef, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface MousePosition {
  x: number;
  y: number;
}

function useMousePosition(): MousePosition {
  const [mousePosition, setMousePosition] = useState<MousePosition>({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return mousePosition;
}

interface ParticlesProps extends ComponentPropsWithoutRef<"div"> {
  quantity?: number;
  staticity?: number;
  ease?: number;
  size?: number;
  refresh?: boolean;
  color?: string;
  vx?: number;
  vy?: number;
}

type Circle = {
  x: number;
  y: number;
  translateX: number;
  translateY: number;
  size: number;
  alpha: number;
  targetAlpha: number;
  dx: number;
  dy: number;
  magnetism: number;
};

function hexToRgb(hex: string): number[] {
  let normalized = hex.replace("#", "");
  if (normalized.length === 3) {
    normalized = normalized
      .split("")
      .map((char) => char + char)
      .join("");
  }

  const hexInt = Number.parseInt(normalized, 16);
  const red = (hexInt >> 16) & 255;
  const green = (hexInt >> 8) & 255;
  const blue = hexInt & 255;
  return [red, green, blue];
}

export function Particles({
  className,
  quantity = 100,
  staticity = 50,
  ease = 50,
  size = 0.4,
  refresh = false,
  color = "#ffffff",
  vx = 0,
  vy = 0,
  ...props
}: ParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const circlesRef = useRef<Circle[]>([]);
  const mousePosition = useMousePosition();
  const mouseRef = useRef<MousePosition>({ x: 0, y: 0 });
  const canvasSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const rafRef = useRef<number | null>(null);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
  const rgb = hexToRgb(color);

  const circleParams = (): Circle => {
    const x = Math.floor(Math.random() * canvasSizeRef.current.w);
    const y = Math.floor(Math.random() * canvasSizeRef.current.h);
    const pSize = Math.floor(Math.random() * 2) + size;

    return {
      x,
      y,
      translateX: 0,
      translateY: 0,
      size: pSize,
      alpha: 0,
      targetAlpha: Number.parseFloat((Math.random() * 0.6 + 0.1).toFixed(1)),
      dx: (Math.random() - 0.5) * 0.1,
      dy: (Math.random() - 0.5) * 0.1,
      magnetism: 0.1 + Math.random() * 4,
    };
  };

  const clearContext = () => {
    const context = contextRef.current;
    if (!context) return;
    context.clearRect(0, 0, canvasSizeRef.current.w, canvasSizeRef.current.h);
  };

  const drawCircle = (circle: Circle, update = false) => {
    const context = contextRef.current;
    if (!context) return;

    const { x, y, translateX, translateY, alpha } = circle;
    context.translate(translateX, translateY);
    context.beginPath();
    context.arc(x, y, circle.size, 0, 2 * Math.PI);
    context.fillStyle = `rgba(${rgb.join(", ")}, ${alpha})`;
    context.fill();
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!update) {
      circlesRef.current.push(circle);
    }
  };

  const drawParticles = () => {
    clearContext();
    circlesRef.current = [];
    for (let i = 0; i < quantity; i += 1) {
      drawCircle(circleParams());
    }
  };

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    const container = canvasContainerRef.current;
    const context = contextRef.current;
    if (!canvas || !container || !context) return;

    canvasSizeRef.current.w = container.offsetWidth;
    canvasSizeRef.current.h = container.offsetHeight;

    canvas.width = Math.floor(canvasSizeRef.current.w * dpr);
    canvas.height = Math.floor(canvasSizeRef.current.h * dpr);
    canvas.style.width = `${canvasSizeRef.current.w}px`;
    canvas.style.height = `${canvasSizeRef.current.h}px`;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(dpr, dpr);

    drawParticles();
  };

  const remapValue = (
    value: number,
    start1: number,
    end1: number,
    start2: number,
    end2: number
  ): number => {
    const remapped = ((value - start1) * (end2 - start2)) / (end1 - start1) + start2;
    return remapped > 0 ? remapped : 0;
  };

  const animate = () => {
    clearContext();

    circlesRef.current.forEach((circle, index) => {
      const edge = [
        circle.x + circle.translateX - circle.size,
        canvasSizeRef.current.w - circle.x - circle.translateX - circle.size,
        circle.y + circle.translateY - circle.size,
        canvasSizeRef.current.h - circle.y - circle.translateY - circle.size,
      ];

      const closestEdge = edge.reduce((a, b) => Math.min(a, b));
      const remapClosestEdge = Number.parseFloat(remapValue(closestEdge, 0, 20, 0, 1).toFixed(2));

      if (remapClosestEdge > 1) {
        circle.alpha += 0.02;
        if (circle.alpha > circle.targetAlpha) {
          circle.alpha = circle.targetAlpha;
        }
      } else {
        circle.alpha = circle.targetAlpha * remapClosestEdge;
      }

      circle.x += circle.dx + vx;
      circle.y += circle.dy + vy;
      circle.translateX +=
        (mouseRef.current.x / (staticity / circle.magnetism) - circle.translateX) / ease;
      circle.translateY +=
        (mouseRef.current.y / (staticity / circle.magnetism) - circle.translateY) / ease;

      drawCircle(circle, true);

      if (
        circle.x < -circle.size ||
        circle.x > canvasSizeRef.current.w + circle.size ||
        circle.y < -circle.size ||
        circle.y > canvasSizeRef.current.h + circle.size
      ) {
        circlesRef.current.splice(index, 1);
        drawCircle(circleParams());
      }
    });

    rafRef.current = window.requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (!canvasRef.current) return;
    contextRef.current = canvasRef.current.getContext("2d");
    if (!contextRef.current) return;

    resizeCanvas();
    animate();

    const onResize = () => {
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      resizeTimeoutRef.current = setTimeout(() => {
        resizeCanvas();
      }, 200);
    };

    window.addEventListener("resize", onResize);

    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
      if (resizeTimeoutRef.current) clearTimeout(resizeTimeoutRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, [color, quantity, size, staticity, ease, vx, vy]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { w, h } = canvasSizeRef.current;
    const x = mousePosition.x - rect.left - w / 2;
    const y = mousePosition.y - rect.top - h / 2;
    const inside = x < w / 2 && x > -w / 2 && y < h / 2 && y > -h / 2;
    if (inside) {
      mouseRef.current.x = x;
      mouseRef.current.y = y;
    }
  }, [mousePosition.x, mousePosition.y]);

  useEffect(() => {
    if (refresh) {
      resizeCanvas();
    }
  }, [refresh]);

  return (
    <div
      ref={canvasContainerRef}
      className={cn("pointer-events-none absolute inset-0", className)}
      aria-hidden="true"
      {...props}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}

export default Particles;
