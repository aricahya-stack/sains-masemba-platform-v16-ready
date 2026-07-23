'use client';

import { useId } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type DashboardChartPoint = {
  label: string;
  value: number;
  target?: number;
};

export function DashboardChart({
  data,
  title = 'Perkembangan pembelajaran',
  subtitle = 'Ringkasan enam periode terakhir',
}: {
  data: DashboardChartPoint[];
  title?: string;
  subtitle?: string;
}) {
  const gradientId = useId().replace(/:/g, '');

  return (
    <section
      aria-label={title}
      className="rounded-[24px] bg-[#EEF0F5] p-5 shadow-[8px_8px_16px_#c5c8ce,-8px_-8px_16px_#ffffff] sm:p-6"
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 text-lg font-extrabold tracking-tight text-slate-900">{title}</h2>
          <p className="mt-1 mb-0 text-sm text-slate-500">{subtitle}</p>
        </div>
        <span className="rounded-full bg-[#EEF0F5] px-4 py-2 text-xs font-bold text-[#6C8EF5] shadow-[inset_2px_2px_5px_#c5c8ce,inset_-2px_-2px_5px_#ffffff]">
          6 periode
        </span>
      </div>
      <div className="h-72 w-full" role="img" aria-label={`Grafik ${title}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6C8EF5" stopOpacity={0.34} />
                <stop offset="100%" stopColor="#6C8EF5" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#D7DAE1" strokeDasharray="4 8" vertical={false} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} width={38} />
            <Tooltip
              cursor={{ stroke: '#9FB2F8', strokeDasharray: '4 4' }}
              contentStyle={{
                border: 0,
                borderRadius: 16,
                background: '#EEF0F5',
                boxShadow: '6px 6px 14px #c5c8ce, -6px -6px 14px #ffffff',
                color: '#0F172A',
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              name="Nilai"
              stroke="#6C8EF5"
              strokeWidth={3}
              fill={`url(#${gradientId})`}
              activeDot={{ r: 6, fill: '#6C8EF5', stroke: '#ffffff', strokeWidth: 3 }}
            />
            <Area
              type="monotone"
              dataKey="target"
              name="Target"
              stroke="#7EDCB5"
              strokeWidth={2}
              strokeDasharray="6 6"
              fill="transparent"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
