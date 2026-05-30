"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type ActivityDay = {
  date: string;
  label: string;
  outbound: number;
  inbound: number;
};

const chartConfig = {
  outbound: {
    label: "Generated",
    color: "#18181b",
  },
  inbound: {
    label: "Replies",
    color: "#10b981",
  },
} satisfies ChartConfig;

function formatYAxis(value: number) {
  return Number.isInteger(value) ? String(value) : "";
}

export function ActivityLineChart({ days }: { days: ActivityDay[] }) {
  const generatedTotal = days.reduce((sum, day) => sum + day.outbound, 0);
  const repliesTotal = days.reduce((sum, day) => sum + day.inbound, 0);

  return (
    <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-zinc-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-950">Activity over 14 days</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5 tabular-nums">
            <span className="h-2.5 w-2.5 rounded-sm bg-zinc-900" />
            {generatedTotal.toLocaleString()} generated
          </span>
          <span className="flex items-center gap-1.5 tabular-nums">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
            {repliesTotal.toLocaleString()} replies
          </span>
        </div>
      </div>

      <ChartContainer config={chartConfig} className="mt-6 h-[260px] w-full">
        <LineChart
          accessibilityLayer
          data={days}
          margin={{ left: 4, right: 12, top: 12, bottom: 0 }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={12}
            minTickGap={16}
          />
          <YAxis
            width={28}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            allowDecimals={false}
            tickFormatter={formatYAxis}
          />
          <Tooltip
            cursor={false}
            content={<ChartTooltipContent config={chartConfig} />}
          />
          <Line
            dataKey="outbound"
            type="monotone"
            stroke="var(--color-outbound)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5 }}
          />
          <Line
            dataKey="inbound"
            type="monotone"
            stroke="var(--color-inbound)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ChartContainer>
    </section>
  );
}
