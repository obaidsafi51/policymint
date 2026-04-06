'use client';

import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatUsd } from '@/lib/formatAmount';

interface DrawdownPoint {
  ts: string;
  protected: number;
  baseline: number;
}

interface DrawdownChartProps {
  data: DrawdownPoint[];
}

export function DrawdownChart({ data }: DrawdownChartProps) {
  return (
    <section className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
      <h2 className="text-[28px] font-semibold tracking-tight text-[var(--text-primary)]">Drawdown vs. baseline</h2>
      <p className="text-xs text-[var(--text-secondary)]">Real-time protection performance analysis</p>
      <div className="mt-3 h-[280px] w-full">
        <ResponsiveContainer>
          <AreaChart data={data}>
            <CartesianGrid stroke="var(--border-default)" strokeOpacity={0.35} />
            <XAxis dataKey="ts" tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: 'var(--text-tertiary)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => formatUsd(value)}
            />
            <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }} />
            <Area type="monotone" dataKey="protected" stroke="none" fill="var(--bg-brand)" fillOpacity={0.8} />
            <Line type="monotone" dataKey="protected" stroke="var(--text-brand)" strokeWidth={2.5} dot={false} />
            <Line
              type="monotone"
              dataKey="baseline"
              stroke="var(--text-tertiary)"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
