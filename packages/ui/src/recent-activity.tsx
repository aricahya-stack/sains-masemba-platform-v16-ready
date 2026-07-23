import type { ReactNode } from 'react';

export type RecentActivityItem = {
  title: string;
  detail: string;
  actor?: string;
  time: string;
  icon: ReactNode;
  tone?: 'blue' | 'mint' | 'peach' | 'lavender';
};

const tones = {
  blue: 'bg-blue-100 text-blue-600',
  mint: 'bg-emerald-100 text-emerald-600',
  peach: 'bg-orange-100 text-orange-500',
  lavender: 'bg-violet-100 text-violet-600',
};

export function RecentActivity({
  items,
  title = 'Aktivitas terbaru',
}: {
  items: RecentActivityItem[];
  title?: string;
}) {
  return (
    <section
      aria-labelledby="recent-activity-title"
      className="overflow-hidden rounded-[24px] bg-[#EEF0F5] p-5 shadow-[8px_8px_16px_#c5c8ce,-8px_-8px_16px_#ffffff] sm:p-6"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 id="recent-activity-title" className="m-0 text-lg font-extrabold tracking-tight text-slate-900">
          {title}
        </h2>
        <span className="text-xs font-bold text-[#6C8EF5]">Terbaru</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-left">
          <caption className="sr-only">Daftar {title.toLowerCase()}</caption>
          <thead>
            <tr className="text-xs uppercase tracking-[0.08em] text-slate-400">
              <th className="pb-3 font-bold">Aktivitas</th>
              <th className="pb-3 font-bold">Detail</th>
              <th className="pb-3 font-bold">Pengguna</th>
              <th className="pb-3 text-right font-bold">Waktu</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${item.title}-${index}`} className="border-t border-slate-300/45 text-sm text-slate-600">
                <td className="py-4 pr-4">
                  <div className="flex items-center gap-3">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tones[item.tone ?? 'blue']}`} aria-hidden="true">
                      {item.icon}
                    </span>
                    <strong className="font-bold text-slate-800">{item.title}</strong>
                  </div>
                </td>
                <td className="py-4 pr-4">{item.detail}</td>
                <td className="py-4 pr-4">{item.actor ?? 'Sistem'}</td>
                <td className="py-4 text-right whitespace-nowrap text-slate-500">{item.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
