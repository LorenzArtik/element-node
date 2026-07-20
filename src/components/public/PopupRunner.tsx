'use client';

import { useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';
import { PageRenderer } from './PageRenderer';
import type { LicenseTier } from '@/lib/license-features';
import type { PageContent } from '@/lib/widgets-schema';

interface PopupItem {
  id: string;
  name: string;
  content: PageContent;
  trigger:
    | { type: 'page-load'; delayMs: number }
    | { type: 'scroll-percent'; percent: number }
    | { type: 'exit-intent' }
    | { type: 'click-selector'; selector: string }
    | { type: 'inactivity'; idleMs: number }
    | { type: 'after-seconds'; seconds: number };
  settings: {
    width: string; maxWidth: string; height: string; maxHeight: string;
    position: 'center'|'top'|'bottom'|'top-left'|'top-right'|'bottom-left'|'bottom-right';
    overlayColor: string; overlayBlur: string;
    animation: 'fade'|'zoom'|'slide-up'|'slide-down'|'none';
    borderRadius: string;
    dismissible: boolean; closeOnEscape: boolean; closeOnOverlay: boolean;
    frequencyMs: number;
  };
}

const STORAGE_PREFIX = 'en-popup-closed:';

function isOnCooldown(id: string, frequencyMs: number): boolean {
  if (frequencyMs <= 0) return false;
  if (typeof window === 'undefined') return false;
  const closedAt = Number(localStorage.getItem(STORAGE_PREFIX + id) || 0);
  if (!closedAt) return false;
  return Date.now() - closedAt < frequencyMs;
}

function markClosed(id: string) {
  try { localStorage.setItem(STORAGE_PREFIX + id, String(Date.now())); } catch {}
}

export function PopupRunner({ path, tier = 'full' }: { path: string; tier?: LicenseTier }) {
  const [popups, setPopups] = useState<PopupItem[]>([]);
  const [active, setActive] = useState<PopupItem | null>(null);

  // Carica i popup attivi per il path
  useEffect(() => {
    fetch(`/api/public/popups?path=${encodeURIComponent(path)}`)
      .then((r) => r.json())
      .then((d) => setPopups((d.items as PopupItem[]) ?? []))
      .catch(() => {});
  }, [path]);

  // Setup trigger handlers
  useEffect(() => {
    if (popups.length === 0) return;
    const cleanups: (() => void)[] = [];

    function tryShow(p: PopupItem) {
      if (active) return;
      if (isOnCooldown(p.id, p.settings.frequencyMs)) return;
      setActive(p);
    }

    for (const p of popups) {
      const t = p.trigger;
      if (t.type === 'page-load') {
        const id = setTimeout(() => tryShow(p), t.delayMs);
        cleanups.push(() => clearTimeout(id));
      } else if (t.type === 'after-seconds') {
        const id = setTimeout(() => tryShow(p), t.seconds * 1000);
        cleanups.push(() => clearTimeout(id));
      } else if (t.type === 'scroll-percent') {
        const onScroll = () => {
          const scrolled = window.scrollY + window.innerHeight;
          const total = document.documentElement.scrollHeight;
          const percent = (scrolled / total) * 100;
          if (percent >= t.percent) tryShow(p);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        cleanups.push(() => window.removeEventListener('scroll', onScroll));
      } else if (t.type === 'exit-intent') {
        const onLeave = (e: MouseEvent) => {
          if (e.clientY <= 0) tryShow(p);
        };
        document.addEventListener('mouseleave', onLeave);
        cleanups.push(() => document.removeEventListener('mouseleave', onLeave));
      } else if (t.type === 'click-selector') {
        const onClick = (e: Event) => {
          const target = e.target as Element;
          if (target?.closest?.(t.selector)) {
            e.preventDefault();
            tryShow(p);
          }
        };
        document.addEventListener('click', onClick);
        cleanups.push(() => document.removeEventListener('click', onClick));
      } else if (t.type === 'inactivity') {
        let id = setTimeout(() => tryShow(p), t.idleMs);
        const reset = () => {
          clearTimeout(id);
          id = setTimeout(() => tryShow(p), t.idleMs);
        };
        ['mousemove', 'keydown', 'scroll', 'touchstart'].forEach((ev) => document.addEventListener(ev, reset, { passive: true }));
        cleanups.push(() => {
          clearTimeout(id);
          ['mousemove', 'keydown', 'scroll', 'touchstart'].forEach((ev) => document.removeEventListener(ev, reset));
        });
      }
    }

    return () => { for (const c of cleanups) c(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popups]);

  return active ? <PopupModal popup={active} onClose={() => { markClosed(active.id); setActive(null); }} /> : null;
}

function PopupModal({ popup, onClose }: { popup: PopupItem; onClose: () => void }) {
  const { settings } = popup;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settings.closeOnEscape) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [settings.closeOnEscape, onClose]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const positionStyle: React.CSSProperties = {
    center: { alignItems: 'center', justifyContent: 'center' },
    top: { alignItems: 'flex-start', justifyContent: 'center', paddingTop: '5vh' },
    bottom: { alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '5vh' },
    'top-left': { alignItems: 'flex-start', justifyContent: 'flex-start', padding: '24px' },
    'top-right': { alignItems: 'flex-start', justifyContent: 'flex-end', padding: '24px' },
    'bottom-left': { alignItems: 'flex-end', justifyContent: 'flex-start', padding: '24px' },
    'bottom-right': { alignItems: 'flex-end', justifyContent: 'flex-end', padding: '24px' },
  }[settings.position];

  const animKeyframes: Record<string, string> = {
    fade: 'en-popup-fade .25s ease-out',
    zoom: 'en-popup-zoom .25s cubic-bezier(.16,1,.3,1)',
    'slide-up': 'en-popup-slide-up .3s cubic-bezier(.16,1,.3,1)',
    'slide-down': 'en-popup-slide-down .3s cubic-bezier(.16,1,.3,1)',
    none: 'none',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (settings.closeOnOverlay && e.target === ref.current) onClose();
      }}
      ref={ref}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: settings.overlayColor,
        backdropFilter: `blur(${settings.overlayBlur})`,
        WebkitBackdropFilter: `blur(${settings.overlayBlur})`,
        display: 'flex',
        animation: 'en-popup-fade .2s ease-out',
        ...positionStyle,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: settings.width,
          maxWidth: settings.maxWidth,
          height: settings.height,
          maxHeight: settings.maxHeight,
          background: 'var(--en-color-bg, #fff)',
          borderRadius: settings.borderRadius,
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          animation: animKeyframes[settings.animation] ?? animKeyframes.zoom,
        }}
      >
        {settings.dismissible && (
          <button
            onClick={onClose}
            aria-label="Chiudi"
            style={{
              position: 'absolute', top: 12, right: 12, zIndex: 10,
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        )}
        <PageRenderer content={popup.content} tier={tier} />
      </div>
      <style>{`
        @keyframes en-popup-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes en-popup-zoom { from { opacity: 0; transform: scale(.92) } to { opacity: 1; transform: scale(1) } }
        @keyframes en-popup-slide-up { from { opacity: 0; transform: translateY(40px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes en-popup-slide-down { from { opacity: 0; transform: translateY(-40px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );
}
