'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

interface ToastCtx {
  push: (msg: string) => void;
}
const ToastContext = createContext<ToastCtx>({ push: () => {} });

export function useToast(): ToastCtx {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string>('');
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | null>(null);

  const push = useCallback((m: string) => {
    setMsg(m);
    setVisible(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setVisible(false), 2400);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        aria-live="polite"
        className={`pointer-events-none fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-2xl border border-line bg-bg/90 px-5 py-3 text-sm text-ink shadow-glow backdrop-blur-xl transition-all duration-200 ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
        }`}
      >
        {msg}
      </div>
    </ToastContext.Provider>
  );
}
