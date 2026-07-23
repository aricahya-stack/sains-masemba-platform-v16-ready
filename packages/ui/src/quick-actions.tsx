'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

export type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
};

export function QuickActions({ items, title = 'Akses cepat' }: { items: QuickAction[]; title?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <section aria-labelledby="quick-actions-title">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="quick-actions-title" className="m-0 text-lg font-extrabold tracking-tight text-slate-900">{title}</h2>
        <span className="text-xs font-bold text-slate-400">Pilih menu</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <motion.div
            key={item.href}
            whileHover={reduceMotion ? undefined : { y: -4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          >
            <Link
              href={item.href}
              prefetch={false}
              aria-label={`Buka ${item.title}`}
              className="group flex min-h-48 flex-col rounded-[22px] bg-[#EEF0F5] p-5 text-slate-700 shadow-[8px_8px_16px_#c5c8ce,-8px_-8px_16px_#ffffff] transition-shadow hover:shadow-[12px_12px_24px_#bec1c8,-12px_-12px_24px_#ffffff] focus:outline-none focus:ring-2 focus:ring-[#6C8EF5]/50"
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="grid size-12 place-items-center rounded-2xl bg-[#EEF0F5] text-[#6C8EF5] shadow-[inset_2px_2px_5px_#c5c8ce,inset_-2px_-2px_5px_#ffffff]">
                  {item.icon}
                </span>
                <ArrowUpRight size={18} className="text-slate-400 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#6C8EF5]" />
              </div>
              <strong className="text-base font-extrabold text-slate-900">{item.title}</strong>
              <p className="mt-2 mb-0 text-sm leading-6 text-slate-500">{item.description}</p>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
