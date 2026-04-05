"use client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, ComposedChart } from "recharts";

const drawdownData = [
  { time: "10:00", protected: -2, baseline: -5, delta: 3 },
  { time: "10:05", protected: -1, baseline: -8, delta: 7 },
  { time: "10:10", protected: -3, baseline: -12, delta: 9 },
  { time: "10:15", protected: -2, baseline: -15, delta: 13 },
];

const pnlData = [
  { time: "10:00", value: 100 },
  { time: "10:05", value: 150 },
  { time: "10:10", value: 120 },
  { time: "10:15", value: 200 },
];

const repData = [
  { time: "10:00", score: 98, target: 95 },
  { time: "10:05", score: 97, target: 95 },
  { time: "10:10", score: 99, target: 95 },
  { time: "10:15", score: 98.5, target: 95 },
];

export function DrawdownChart() {
  return (
    <div className="bg-card border-0.5 border-border-default rounded-card p-4 h-80 flex flex-col">
      <div className="text-secondary text-sm font-medium mb-4">Drawdown vs Baseline</div>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={drawdownData}>
            <XAxis dataKey="time" hide />
            <YAxis hide />
            <Tooltip contentStyle={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)" }} itemStyle={{ color: "var(--text-primary)" }} />
            <Area type="monotone" dataKey="delta" fill="#E6FBF3" fillOpacity={0.6} stroke="none" />
            <Line type="monotone" dataKey="protected" stroke="#10B981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="baseline" stroke="#C8D8D3" strokeDasharray="5 5" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function PnLChart() {
  return (
    <div className="bg-card border-0.5 border-border-default rounded-card p-4 h-64 flex flex-col">
      <div className="text-secondary text-sm font-medium mb-4">Cumulative PnL</div>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={pnlData}>
            <XAxis dataKey="time" hide />
            <YAxis hide />
            <Tooltip contentStyle={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)" }} itemStyle={{ color: "var(--text-primary)" }} />
            <Area type="monotone" dataKey="value" stroke="#22C55E" fill="#ECFDF5" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ReputationChart() {
  return (
    <div className="bg-card border-0.5 border-border-default rounded-card p-4 h-64 flex flex-col">
      <div className="text-secondary text-sm font-medium mb-4">Reputation Score</div>
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={repData}>
            <XAxis dataKey="time" hide />
            <YAxis domain={[90, 100]} hide />
            <Tooltip contentStyle={{ backgroundColor: "var(--bg-elevated)", borderColor: "var(--border-default)" }} itemStyle={{ color: "var(--text-primary)" }} />
            <Line type="stepAfter" dataKey="score" stroke="#10B981" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="target" stroke="#C8D8D3" strokeDasharray="5 5" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
