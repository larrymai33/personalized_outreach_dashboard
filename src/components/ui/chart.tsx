"use client";

import * as React from "react";
import { ResponsiveContainer } from "recharts";

export type ChartConfig = Record<
  string,
  {
    label: string;
    color: string;
  }
>;

type ChartContainerProps = {
  config: ChartConfig;
  className?: string;
  children: React.ReactElement;
};

type TooltipPayload = {
  dataKey?: string | number;
  name?: string | number;
  value?: unknown;
  color?: string;
};

type ChartTooltipContentProps = {
  active?: boolean;
  label?: string | number;
  payload?: TooltipPayload[];
  config: ChartConfig;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function ChartContainer({ config, className, children }: ChartContainerProps) {
  const chartVars = Object.fromEntries(
    Object.entries(config).map(([key, item]) => [`--color-${key}`, item.color]),
  ) as React.CSSProperties;

  return (
    <div
      data-chart=""
      className={cx(
        "flex aspect-video justify-center text-xs text-zinc-500",
        "[&_.recharts-cartesian-axis-tick_text]:fill-zinc-500",
        "[&_.recharts-cartesian-grid_line]:stroke-zinc-200",
        "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-zinc-300",
        "[&_.recharts-dot[stroke='#fff']]:stroke-transparent",
        className,
      )}
      style={chartVars}
    >
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function ChartTooltipContent({
  active,
  label,
  payload,
  config,
}: ChartTooltipContentProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-36 rounded-lg bg-white px-3 py-2 text-sm shadow-lg ring-1 ring-zinc-200">
      {label && <p className="mb-2 font-medium text-zinc-950">{label}</p>}
      <div className="space-y-1.5">
        {payload.map((item) => {
          const key = String(item.dataKey ?? item.name ?? "");
          const entry = config[key];
          const color = entry?.color ?? item.color ?? "#18181b";

          return (
            <div key={key} className="flex items-center justify-between gap-6">
              <span className="flex items-center gap-2 text-zinc-600">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
                {entry?.label ?? item.name ?? key}
              </span>
              <span className="font-medium tabular-nums text-zinc-950">
                {typeof item.value === "number" ? item.value.toLocaleString() : String(item.value ?? "")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
