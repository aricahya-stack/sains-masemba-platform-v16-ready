'use client';

import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

export type Trend = {
  direction: 'up' | 'down';
  value: string;
  label?: string;
};

export type NeumorphicCardProps = {
  title: string;
  value: string;
  icon: ReactNode;
  trend?: Trend;
  description?: string;
  ariaLabel?: string;
  className?: string;
};

export function NeumorphicCard({
  title,
  value,
  icon,
  trend,
  description,
  ariaLabel,
  className = '',
}: NeumorphicCardProps) {
  const reduceMotion = useReducedMotion();
  const TrendIcon = trend?.direction === 'down' ? ArrowDownRight : ArrowUpRight;
  const trendTone = trend?.direction === 'down' ? 'text-rose-500' : 'text-emerald-500';

  return (
    <motion.article
      aria-label={ariaLabel ?? `${title}: ${value}`}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      whileHover={reduceMotion ? undefined : { y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className={`group rounded-2xl bg-[#EEF0F5] p-6 text-slate-700 shadow-[8px_8px_16px_#c5c8ce,-8px_-8px_16px_#ffffff] transition-shadow duration-300 hover:shadow-[12px_12px_24px_#bec1c8,-12px_-12px_24px_#ffffff] focus-within:outline-none focus-within:ring-2 focus-within:ring-[#6C8EF5]/50 ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="m-0 text-sm font-semibold tracking-wide text-slate-500">{title}</p>
          <p className="mt-3 mb-0 text-3xl font-black tracking-[-0.04em] text-slate-900 sm:text-4xl">{value}</p>
        </div>
        <div
          aria-hidden="true"
          className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#EEF0F5] text-[#6C8EF5] shadow-[inset_2px_2px_5px_#c5c8ce,inset_-2px_-2px_5px_#ffffff] transition-transform duration-300 group-hover:scale-105"
        >
          {icon}
        </div>
      </div>

      {trend ? (
        <div className={`mt-5 flex items-center gap-2 text-sm font-bold ${trendTone}`}>
          <TrendIcon aria-hidden="true" size={17} />
          <span>{trend.value}</span>
          {trend.label ? <span className="font-medium text-slate-500">{trend.label}</span> : null}
        </div>
      ) : description ? (
        <p className="mt-5 mb-0 text-sm leading-6 text-slate-500">{description}</p>
      ) : null}
    </motion.article>
  );
}
