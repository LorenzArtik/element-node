'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Linea di caricamento stile YouTube/nprogress in alto.
 * - Si attiva al click su qualsiasi <a href="..."> interno
 * - Avanza progressivamente fino a 90% mentre la pagina si carica
 * - Va al 100% quando il pathname cambia (= nuova pagina pronta)
 * - Sparisce con dissolvenza
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const lastPathnameRef = useRef(pathname);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Click globale su link interni → start
  useEffect(() => {
    function isInternalNav(a: HTMLAnchorElement): boolean {
      const href = a.getAttribute('href');
      if (!href) return false;
      if (a.target === '_blank') return false;
      if (a.hasAttribute('download')) return false;
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return false;
        if (url.pathname === window.location.pathname && url.search === window.location.search) return false;
        return true;
      } catch {
        return false;
      }
    }

    function handleClick(e: MouseEvent) {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest('a');
      if (!anchor || !isInternalNav(anchor)) return;
      start();
    }
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cambio pathname → end
  useEffect(() => {
    if (lastPathnameRef.current !== pathname) {
      lastPathnameRef.current = pathname;
      finish();
    }
  }, [pathname]);

  function start() {
    if (loading) return;
    setLoading(true);
    setProgress(15);
    if (tickerRef.current) clearInterval(tickerRef.current);
    tickerRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        // Decelera man mano che si avvicina al 90%
        const inc = (90 - p) * 0.08;
        return Math.min(90, p + Math.max(0.5, inc));
      });
    }, 180);
  }

  function finish() {
    if (tickerRef.current) { clearInterval(tickerRef.current); tickerRef.current = null; }
    if (!loading) return;
    setProgress(100);
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    finishTimerRef.current = setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 250);
  }

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none"
      style={{ height: 3 }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #92003b 0%, #c4146e 50%, #92003b 100%)',
          boxShadow: loading ? '0 0 10px rgba(146,0,59,0.6), 0 0 4px rgba(196,20,110,0.8)' : 'none',
          transition: progress >= 100 ? 'width 250ms ease-out, opacity 200ms ease-out' : 'width 250ms ease-out',
          opacity: loading ? 1 : 0,
        }}
      />
    </div>
  );
}
