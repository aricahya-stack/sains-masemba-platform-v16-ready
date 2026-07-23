import type { ReactNode } from 'react';

export function DashboardHero({
  eyebrow,
  title,
  description,
  badge,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
  action?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-[#EEF0F5] px-6 py-7 shadow-[8px_8px_16px_#c5c8ce,-8px_-8px_16px_#ffffff] sm:px-8 sm:py-8">
      <div className="pointer-events-none absolute -top-24 right-0 size-64 rounded-full bg-[#6C8EF5]/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-1/3 size-60 rounded-full bg-[#7EDCB5]/20 blur-3xl" />
      <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div className="max-w-3xl">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-[#6C8EF5]">{eyebrow}</span>
            {badge ? (
              <span className="rounded-full bg-[#EEF0F5] px-3 py-1 text-xs font-bold text-emerald-600 shadow-[inset_2px_2px_5px_#c5c8ce,inset_-2px_-2px_5px_#ffffff]">
                {badge}
              </span>
            ) : null}
          </div>
          <h1 className="m-0 text-3xl font-black tracking-[-0.045em] text-slate-950 sm:text-4xl lg:text-5xl">{title}</h1>
          <p className="mt-4 mb-0 max-w-2xl text-base leading-7 text-slate-500 sm:text-lg">{description}</p>
        </div>
        {action ? <div className="relative shrink-0">{action}</div> : null}
      </div>
    </section>
  );
}
