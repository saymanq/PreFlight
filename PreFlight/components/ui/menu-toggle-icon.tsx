"use client";

import { cn } from "@/lib/utils";

interface MenuToggleIconProps extends React.ComponentProps<"svg"> {
  open: boolean;
  duration?: number;
}

export function MenuToggleIcon({
  open,
  duration = 300,
  className,
  ...props
}: MenuToggleIconProps) {
  const style = { transitionDuration: `${duration}ms` };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className={cn("size-5", className)}
      {...props}
    >
      <line
        x1="4"
        y1="6"
        x2="20"
        y2="6"
        className="origin-center transition-transform"
        style={style}
        transform={open ? "translate(0, 6) rotate(45)" : undefined}
      />
      <line
        x1="4"
        y1="12"
        x2="20"
        y2="12"
        className="transition-opacity"
        style={style}
        opacity={open ? 0 : 1}
      />
      <line
        x1="4"
        y1="18"
        x2="20"
        y2="18"
        className="origin-center transition-transform"
        style={style}
        transform={open ? "translate(0, -6) rotate(-45)" : undefined}
      />
    </svg>
  );
}
