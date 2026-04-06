'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatUsd } from '@/lib/formatAmount';

interface PnLPoint {
  ts: string;
  pnl: number;
}

interface PnLChartProps {
  data: PnLPoint[];
}

export function PnLChart({ data }: PnLChartProps) {
  return (
    <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
      <h2 className="text-xl font-semibold text-[var(--text-primary)]">PnL over time</h2>
      <div className="mt-3 h-[220px] w-full">
        <ResponsiveContainer>
          <AreaChart data={data}>
            <CartesianGrid stroke="var(--border-default)" strokeOpacity={0.5} />
            <XAxis dataKey="ts" tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatUsd(value)}
            />
            <Tooltip
              formatter={(value) => [formatUsd(Number(value)), 'pnl']}
              contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
            />
            <Area type="monotone" dataKey="pnl" stroke="none" fill="var(--bg-success)" fillOpacity={0.7} />
            <Line type="monotone" dataKey="pnl" stroke="var(--text-success)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
