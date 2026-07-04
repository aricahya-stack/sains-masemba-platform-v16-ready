'use client';
import { createContext, useContext, useMemo, useState } from 'react';
type Toast = { id: number; title: string; message: string };
const ToastContext = createContext<{ notify: (title: string, message: string) => void }>({ notify: () => {} });
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const value = useMemo(() => ({
    notify: (title: string, message: string) => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { id, title, message }]);
      window.setTimeout(() => setItems((prev) => prev.filter((item) => item.id !== id)), 2600);
    },
  }), []);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-wrap">{items.map((item) => <div key={item.id} className="toast"><strong>{item.title}</strong><div>{item.message}</div></div>)}</div>
    </ToastContext.Provider>
  );
}
export function useToast() { return useContext(ToastContext); }
