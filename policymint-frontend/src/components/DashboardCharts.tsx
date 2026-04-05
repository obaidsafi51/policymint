"use client";

import {
  Area,
  AreaChart,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** Positive magnitudes for stacking; interpret as drawdown depth in tooltip. */
const drawdownData = [
  { time: "08:00", baseline: 4.8, protected: 2.2, spread: 4.8 - 2.2 },
  { time: "12:00", baseline: 5.6, protected: 2.5, spread: 5.6 - 2.5 },
  { time: "16:00", baseline: 4.2, protected: 1.9, spread: 4.2 - 1.9 },
  { time: "20:00", baseline: 6.1, protected: 2.8, spread: 6.1 - 2.8 },
  { time: "00:00", baseline: 5.0, protected: 2.4, spread: 5.0 - 2.4 },
];

const pnlData = [
  { time: "08:00", value: 8200 },
  { time: "09:00", value: 7980 },
  { time: "10:00", value: 9100 },
  { time: "11:00", value: 8850 },
  { time: "12:00", value: 9400 },
  { time: "13:00", value: 9020 },
  { time: "14:00", value: 10100 },
  { time: "15:00", value: 9880 },
  { time: "16:00", value: 10850 },
  { time: "17:00", value: 11200 },
  { time: "18:00", value: 10900 },
  { time: "19:00", value: 11800 },
  { time: "20:00", value: 12100 },
  { time: "21:00", value: 11950 },
  { time: "22:00", value: 12380 },
  { time: "23:00", value: 12480 },
];

const repData = [
  { time: "08:00", score: 38, target: 50 },
  { time: "10:00", score: 42, target: 50 },
  { time: "12:00", score: 48, target: 50 },
  { time: "14:00", score: 52, target: 50 },
  { time: "16:00", score: 55, target: 50 },
  { time: "18:00", score: 58, target: 50 },
  { time: "20:00", score: 61, target: 50 },
  { time: "22:00", score: 63, target: 50 },
  { time: "00:00", score: 64.5, target: 50 },
];

const tooltipSurface = {
  backgroundColor: "var(--bg-elevated)",
  border: "0.5px solid var(--border-default)",
  borderRadius: "8px",
};

const legendStyle = { color: "var(--text-secondary)", fontSize: "11px", fontWeight: 500 };

export function DrawdownChart() {
  return (
    <div className="bg-card border-0.5 border-border-default rounded-card p-5 flex flex-col">
      <div className="mb-1">
        <h2 className="text-sm font-medium text-primary">Drawdown vs. baseline</h2>
        <p className="text-xs text-tertiary mt-0.5">Real-time protection performance analysis</p>
      </div>
      <div className="w-full min-w-0 min-h-[260px] pt-2">
        <ResponsiveContainer width="100%" height={260} minWidth={48}>
          <ComposedChart data={drawdownData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="time"
              tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border-default)", strokeWidth: 0.5 }}
            />
            <YAxis hide reversed domain={[0, "auto"]} />
            <Tooltip
              contentStyle={tooltipSurface}
              labelStyle={{ color: "var(--text-secondary)" }}
              itemStyle={{ color: "var(--text-primary)" }}
              formatter={(value, name) => {
                const n = typeof value === "number" ? value : Number(value);
                if (Number.isNaN(n)) return [String(value), String(name)];
                return [`-${n.toFixed(1)}%`, String(name)];
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: 8 }}
              formatter={(value) => <span style={legendStyle}>{value}</span>}
            />
            <Area
              type="monotone"
              dataKey="protected"
              stackId="dd"
              stroke="none"
              fill="transparent"
              name="_stack_base"
              legendType="none"
              hide
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="spread"
              stackId="dd"
              stroke="none"
              fill="var(--chart-delta-fill)"
              name="_stack_delta"
              legendType="none"
              hide
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="protected"
              stroke="var(--chart-protected-line)"
              strokeWidth={2}
              dot={false}
              name="Protected Portfolio"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="baseline"
              stroke="var(--chart-baseline-line)"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              name="Unprotected Baseline"
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function PnLChart() {
  return (
    <div className="bg-card border-0.5 border-border-default rounded-card p-5 flex flex-col">
      <h2 className="text-sm font-medium text-primary mb-4">PnL over time</h2>
      <div className="w-full min-w-0 min-h-[220px]">
        <ResponsiveContainer width="100%" height={220} minWidth={48}>
          <AreaChart data={pnlData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <XAxis dataKey="time" hide />
            <YAxis hide />
            <Tooltip
              contentStyle={tooltipSurface}
              itemStyle={{ color: "var(--text-primary)" }}
              formatter={(v) => {
                const n = typeof v === "number" ? v : Number(v);
                if (Number.isNaN(n)) return [String(v), "PnL"];
                return [`+$${n.toLocaleString()}`, "PnL"];
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--chart-pnl-line)"
              strokeWidth={2}
              fill="var(--chart-pnl-fill)"
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ReputationChart() {
  return (
    <div className="bg-card border-0.5 border-border-default rounded-card p-5 flex flex-col">
      <h2 className="text-sm font-medium text-primary mb-4">Reputation trend</h2>
      <div className="w-full min-w-0 min-h-[220px]">
        <ResponsiveContainer width="100%" height={220} minWidth={48}>
          <ComposedChart data={repData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <XAxis dataKey="time" hide />
            <YAxis domain={[30, 72]} hide />
            <Tooltip
              contentStyle={tooltipSurface}
              itemStyle={{ color: "var(--text-primary)" }}
              formatter={(v) => {
                const n = typeof v === "number" ? v : Number(v);
                if (Number.isNaN(n)) return [String(v), "Score"];
                return [`+${n}`, "Score"];
              }}
            />
            <Line
              type="stepAfter"
              dataKey="score"
              stroke="var(--chart-rep-line)"
              strokeWidth={2}
              dot={false}
              name="Reputation"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="target"
              stroke="var(--chart-rep-target)"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
              name="Target +50"
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-tertiary uppercase tracking-widest mt-2">Target +50</p>
    </div>
  );
}
