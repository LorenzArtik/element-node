'use client';

/**
 * Widget "Smart Agency" (nativi): carosello hero a pannello vetro, carosello di schede con
 * finestre vetro, componente privacy a 3 passaggi, chat dimostrativa, card pastello,
 * tabella di confronto, striscia loghi. Tutti retrocompatibili: tipi NUOVI, nessun widget esistente cambia.
 * Il contenuto dei mock usa un formato testo a righe (editabile nel pannello proprietà).
 */

import * as LucideIcons from 'lucide-react';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';

type S = Record<string, unknown>;
const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : v == null ? d : String(v));
const num = (v: unknown, d: number): number => (typeof v === 'number' && !Number.isNaN(v) ? v : Number(v) || d);

/** Pastelli: [sfondo, accento] */
export const SA_TINTS: Record<string, [string, string]> = {
  blue: ['#e3f2fd', '#0c75c6'],
  violet: ['#f0eefe', '#5c4b9e'],
  green: ['#e3f6ee', '#1f8f6b'],
  peach: ['#fdeee3', '#b45309'],
  rose: ['#fde8ef', '#b0306a'],
  teal: ['#e0f4f6', '#0e7c86'],
  lemon: ['#fbf4d9', '#8a6d00'],
  lilac: ['#efe6fb', '#6b3fb5'],
  sand: ['#f3ece4', '#7a5a3a'],
};
const TINT_KEYS = Object.keys(SA_TINTS);
const tintOf = (k: unknown, i = 0): [string, string] => SA_TINTS[str(k)] ?? SA_TINTS[TINT_KEYS[i % TINT_KEYS.length]];
const tintVars = (k: unknown, i = 0): React.CSSProperties => {
  const [t, c] = tintOf(k, i);
  return { ['--t' as string]: t, ['--c' as string]: c } as React.CSSProperties;
};

const Ico = ({ name, size = 22 }: { name: string; size?: number }) => {
  const C = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>>)[name] || LucideIcons.Star;
  return <C size={size} strokeWidth={1.7} />;
};

/** "chiave=valore" per riga → mappa (chiavi ripetute → array). */
function kv(text: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const raw of text.split('\n')) {
    const i = raw.indexOf('=');
    if (i < 1) continue;
    const k = raw.slice(0, i).trim();
    (out[k] ||= []).push(raw.slice(i + 1).trim());
  }
  return out;
}
const lines = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean);

const prefersReduced = () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------ */
/* Finestra vetro con contenuto mock (usata dal carosello di schede)    */
/* ------------------------------------------------------------------ */
function GlassMock({ kind, title, badge, data }: { kind: string; title: string; badge: string; data: string }) {
  const m = kv(data);
  const head = (
    <div className="sa-gw-h"><b>{title}</b>{badge && <span className="sa-badge">{badge}</span>}</div>
  );
  if (kind === 'table') {
    const rows = lines(data).filter((l) => !/^[a-z]+=/.test(l)).map((l) => l.split('|').map((c) => c.trim()));
    const [hd, ...body] = rows;
    return (
      <div className="sa-gw">
        {head}
        <table className="sa-mt">
          <thead><tr>{(hd || []).map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
          <tbody>{body.map((r, i) => (
            <tr key={i}>{r.map((c, j) => {
              const cls = c.startsWith('+') ? 'y' : c.startsWith('-') ? 'n' : '';
              return <td key={j} className={cls}>{cls ? c.slice(1) : c}</td>;
            })}</tr>
          ))}</tbody>
        </table>
        {m.src?.[0] && <p className="sa-gw-s">{m.src[0]}</p>}
      </div>
    );
  }
  if (kind === 'chat') {
    const fmt = (m.fmt?.[0] || '').split('|').map((x) => x.trim()).filter(Boolean);
    return (
      <div className="sa-gw">
        {head}
        {m.file?.[0] && <span className="sa-docchip"><Ico name="FileText" size={16} />{m.file[0]}</span>}
        {m.q?.[0] && <div className="sa-bub sa-me">{m.q[0]}</div>}
        {m.a?.[0] && <div className="sa-bub sa-ch">{m.a[0]}{m.src?.[0] && <small>{m.src[0]}</small>}</div>}
        {fmt.length > 0 && <div className="sa-fmt">{fmt.map((f, i) => (i === fmt.length - 1 && fmt.length > 1 && f.length > 14 ? <em key={i}>{f}</em> : <span key={i}>{f}</span>))}</div>}
      </div>
    );
  }
  if (kind === 'points') {
    return (
      <div className="sa-gw">
        {head}
        {m.q?.[0] && <div className="sa-bub sa-me">{m.q[0]}</div>}
        <ol className="sa-pts">{(m.p || []).map((p, i) => { const [b, r] = p.split('|'); return <li key={i}><b>{b}</b> {r}</li>; })}</ol>
        {m.act?.[0] && <div className="sa-act"><span><Ico name="Mail" size={16} />{m.act[0]}</span></div>}
      </div>
    );
  }
  if (kind === 'steps') {
    const items = lines(data).map((l) => ({ done: l.startsWith('ok='), now: l.startsWith('now='), text: l.replace(/^(ok|now)=/, '') }));
    return (
      <div className="sa-gw">
        {head}
        <ul className="sa-flow">{items.map((it, i) => (
          <li key={i} className={it.now ? 'now' : 'done'}><Ico name={it.now ? 'FileText' : 'Check'} size={18} />{it.text}</li>
        ))}</ul>
      </div>
    );
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* 1. Carosello hero (pannello vetro)                                   */
/* ------------------------------------------------------------------ */
interface HeroSlide {
  chip?: string; chipTone?: string; title?: string; text?: string; pills?: string;
  cta1Text?: string; cta1Url?: string; cta2Text?: string; cta2Url?: string;
  image?: string; imageWidth?: string; visual?: string; visualData?: string; bgFrom?: string; bgTo?: string;
}

export function SaHeroCarousel({ settings }: { settings: S }) {
  const slides = (settings.slides as HeroSlide[]) || [];
  const n = slides.length;
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(settings.autoplay !== false);
  const ms = num(settings.autoplayMs, 7000);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchX = useRef<number | null>(null);

  const arm = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    if (playing && n > 1 && !prefersReduced()) timer.current = setInterval(() => setCur((c) => (c + 1) % n), ms);
  }, [playing, n, ms]);
  useEffect(() => { arm(); return () => { if (timer.current) clearInterval(timer.current); }; }, [arm, cur]);

  if (!n) return <div style={{ padding: 40, textAlign: 'center' }}>Aggiungi slide al carosello</div>;
  const go = (i: number) => setCur((i + n) % n);
  const minH = str(settings.minHeight, 'clamp(480px,46vw,600px)');

  return (
    <div className={`sa-hero${settings.compact ? " sa-compact" : ""}`} style={{ ['--sa-dur' as string]: `${ms}ms` } as React.CSSProperties}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => { if (touchX.current == null) return; const dx = e.changedTouches[0].clientX - touchX.current; if (Math.abs(dx) > 50) go(cur + (dx < 0 ? 1 : -1)); touchX.current = null; }}>
      <style>{HERO_CSS}</style>
      <div className="sa-track" style={{ transform: `translateX(-${cur * 100}%)` }}>
        {slides.map((s, i) => {
          const pills = str(s.pills).split(',').map((x) => x.trim()).filter(Boolean);
          const vis = str(s.visual);
          const v = kv(str(s.visualData));
          const tone = str(s.chipTone, 'violet');
          const [tbg, tc] = tintOf(tone === 'blue' ? 'blue' : tone === 'green' ? 'green' : 'violet');
          return (
            <article key={i} className="sa-slide" style={{ minHeight: minH }} aria-hidden={i !== cur}>
              <div className="sa-bg" style={{ background: `linear-gradient(110deg,${str(s.bgFrom, '#e9f1fb')},${str(s.bgTo, '#f1ecfb')})` }}>
                {!!s.image && <i className="sa-bgi" style={{ backgroundImage: `url(${s.image})`, width: str(s.imageWidth, '84%') }} />}
              </div>
              {vis === 'chat' && (
                <div className="sa-vchat" aria-hidden>
                  <div className="sa-gw">
                    <div className="sa-gw-h"><b>{v.name?.[0] || 'Charlie'}</b><span className="sa-gw-r">{v.mode?.[0] || ''}</span></div>
                    {v.q?.[0] && <div className="sa-bub sa-me">{v.q[0]}</div>}
                    {v.a?.[0] && <div className="sa-bub sa-ch">{v.a[0]}{v.src?.[0] && <small>{v.src[0]}</small>}</div>}
                    {v.input?.[0] && <div className="sa-input">{v.input[0]}</div>}
                  </div>
                  {(v.chip || []).slice(0, 3).map((c, k) => <span key={k} className={`sa-vc-f f${k + 1}`}><Ico name={['Scale', 'FileText', 'Search'][k]} size={16} />{c}</span>)}
                </div>
              )}
              <div className="sa-wrap"><div className="sa-panel">
                {!!s.chip && <span className="sa-chip" style={{ background: tbg, color: tc }}>{s.chip}</span>}
                <h2 className="sa-h">{str(s.title).split(/(\*[^*]+\*)/).map((p, k) => (p.startsWith('*') && p.endsWith('*') ? <em key={k}>{p.slice(1, -1)}</em> : <Fragment key={k}>{p}</Fragment>))}</h2>
                {!!s.text && <p className="sa-lead">{str(s.text)}</p>}
                {pills.length > 0 && <div className="sa-pills">{pills.map((p, k) => <span key={k} className="sa-pill">{p}</span>)}</div>}
                <div className="sa-cta">
                  {!!s.cta1Text && <a className="sa-btn sa-btn-p" href={str(s.cta1Url, '#')}>{str(s.cta1Text)} <Ico name="ArrowRight" size={16} /></a>}
                  {!!s.cta2Text && <a className="sa-btn sa-btn-o" href={str(s.cta2Url, '#')}>{str(s.cta2Text)}</a>}
                </div>
              </div></div>
            </article>
          );
        })}
      </div>
      {settings.showArrows !== false && n > 1 && (
        <div className="sa-arrows">
          <button className="sa-circ l" onClick={() => go(cur - 1)} aria-label="Precedente"><Ico name="ChevronLeft" size={17} /></button>
          <button className="sa-circ r" onClick={() => go(cur + 1)} aria-label="Successiva"><Ico name="ChevronRight" size={17} /></button>
        </div>
      )}
      {n > 1 && (
        <div className="sa-ui"><div className="sa-wrap sa-ui-in">
          <div className="sa-dots">{slides.map((_, i) => (
            <button key={`${i}-${i === cur ? cur : 'x'}`} className={`sa-dot${i === cur ? ' on' : ''}${!playing ? ' paused' : ''}`} onClick={() => go(i)} aria-label={`Diapositiva ${i + 1}`}><i /></button>
          ))}</div>
          <button className="sa-circ" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pausa' : 'Riprendi'}><Ico name={playing ? 'Pause' : 'Play'} size={16} /></button>
        </div></div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Carosello di schede                                               */
/* ------------------------------------------------------------------ */
interface CardItem { chips?: string; cta2Text?: string; cta2Url?: string; date?: string; imageTag?: string; kind?: string; image?: string; tag?: string; title?: string; quote?: string; text?: string; ctaText?: string; ctaUrl?: string; tint?: string; mock?: string; mockTitle?: string; mockBadge?: string; mockData?: string; stage?: string }

export function SaCardCarousel({ settings }: { settings: S }) {
  const items = (settings.items as CardItem[]) || [];
  const tr = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState({ w: 30, ml: 0 });
  const upd = useCallback(() => {
    const el = tr.current; if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const p = max > 0 ? el.scrollLeft / max : 0;
    const w = Math.min(100, (el.clientWidth / el.scrollWidth) * 100);
    setBar({ w, ml: (100 - w) * p });
  }, []);
  useEffect(() => { upd(); window.addEventListener('resize', upd); return () => window.removeEventListener('resize', upd); }, [upd, items.length]);
  const step = (d: number) => {
    const el = tr.current; if (!el) return;
    const c = el.querySelector('.sa-cd') as HTMLElement | null;
    el.scrollBy({ left: d * ((c?.getBoundingClientRect().width || 300) + 20), behavior: 'smooth' });
  };
  const grid = settings.layout === 'grid';
  const cols = num(settings.columns, 3);
  const cardW = str(settings.cardWidth, 'clamp(270px,26vw,340px)');
  const wideW = str(settings.wideWidth, 'min(1060px,88vw)');
  /* Scorrimento automatico (08/10/2026): solo se acceso nel widget. Una scheda alla volta,
   * dall'ultima riparte dalla prima. Si ferma col mouse sopra o il fuoco dentro, per 10 s
   * dopo un tocco, fuori dallo schermo, a scheda del browser nascosta e con «riduci movimento». */
  const auto = !!settings.autoplay && !grid && items.length > 1;
  const ms = Math.max(2500, Math.round(num(settings.autoplayMs, 5000)));
  const [fermo, setFermo] = useState(false);
  const riprendi = useRef<number | undefined>(undefined);
  useEffect(() => {
    const el = tr.current;
    if (!el || !auto || fermo) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let visibile = false;
    const io = new IntersectionObserver(([e]) => { visibile = e.isIntersecting; }, { threshold: 0.4 });
    io.observe(el);
    const id = window.setInterval(() => {
      if (!visibile || document.hidden) return;
      const max = el.scrollWidth - el.clientWidth;
      if (el.scrollLeft >= max - 8) el.scrollTo({ left: 0, behavior: 'smooth' });
      else step(1);
    }, ms);
    return () => { window.clearInterval(id); io.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- step legge solo il ref del binario
  }, [auto, ms, fermo]);
  useEffect(() => () => window.clearTimeout(riprendi.current), []);
  const tocco = () => {
    setFermo(true);
    window.clearTimeout(riprendi.current);
    riprendi.current = window.setTimeout(() => setFermo(false), 10000);
  };
  const pausa = auto ? {
    onMouseEnter: () => setFermo(true), onMouseLeave: () => setFermo(false),
    onFocus: () => setFermo(true), onBlur: () => setFermo(false), onTouchStart: tocco,
  } : {};
  return (
    <div className="sa-car" {...pausa}>
      <style>{CARD_CSS}</style>
      <div className="sa-car-head">
        <div>
          {!!settings.eyebrow && <span className="sa-eyebrow">{str(settings.eyebrow)}</span>}
          {!!settings.heading && <h2 className="sa-big">{str(settings.heading)}</h2>}
          {!!settings.subheading && <p className="sa-sub">{str(settings.subheading)}</p>}
        </div>
        {settings.showArrows !== false && !grid && (
          <div className="sa-ctl">
            <button className="sa-circ" onClick={() => step(-1)} aria-label="Indietro"><Ico name="ChevronLeft" size={17} /></button>
            <button className="sa-circ" onClick={() => step(1)} aria-label="Avanti"><Ico name="ChevronRight" size={17} /></button>
          </div>
        )}
      </div>
      <div className={`sa-cd-track${grid ? " sa-grid" : ""}`} ref={tr} onScroll={upd} style={grid ? ({ ['--cols' as string]: cols } as React.CSSProperties) : undefined}>
        {items.map((it, i) => {
          const wide = it.kind === 'wide';
          const feat = it.kind === 'feature';
          const prod = it.kind === 'prod';
          const linkWhole = !!it.ctaUrl && !wide && !feat && !prod && !it.cta2Text;
          const Tag = linkWhole ? 'a' : 'div';
          const props = linkWhole ? { href: it.ctaUrl } : {};
          const tinted = it.tint && it.tint !== 'none';
          return (
            <Tag key={i} {...props} className={`sa-cd${wide ? ' sa-wide' : ''}${feat ? ' sa-feat' : ''}${prod ? ' sa-prod' : ''}${tinted ? ' tint' : ''}`} style={{ flexBasis: grid ? undefined : (wide || feat) ? wideW : cardW, ...(tinted ? tintVars(it.tint, i) : {}) }}>
              {feat ? (
                <>
                  <div className="sa-tx">
                    {it.tag && <span className="sa-fchip">{it.tag}</span>}
                    <h2 className="sa-fh">{it.title}</h2>
                    {it.text && <p>{it.text}</p>}
                    <div className="sa-ctas">
                      {it.ctaText && <a className="sa-btn sa-btn-p" href={str(it.ctaUrl, '#')}>{it.ctaText}<Ico name="ArrowRight" size={16} /></a>}
                      {it.cta2Text && <a className="sa-btn sa-btn-o" href={str(it.cta2Url, '#')}>{it.cta2Text}<Ico name="ArrowRight" size={16} /></a>}
                    </div>
                  </div>
                  <div className="sa-fim" style={{ backgroundImage: it.stage ? `url(${it.stage})` : undefined }} />
                </>
              ) : wide ? (
                <>
                  <div className="sa-tx">
                    {!!it.tag && <span className="sa-tag">{it.tag}</span>}
                    <h3>{it.title}</h3>
                    {!!it.quote && <p className="sa-q">{it.quote}</p>}
                    {!!it.text && <p>{it.text}</p>}
                    {!!it.ctaText && <a className="sa-tlink" href={str(it.ctaUrl, '#')}>{it.ctaText} <Ico name="ArrowRight" size={16} /></a>}
                  </div>
                  <div className="sa-stg" style={{ backgroundImage: it.stage ? `url(${it.stage})` : undefined }}>
                    <GlassMock kind={str(it.mock)} title={str(it.mockTitle)} badge={str(it.mockBadge)} data={str(it.mockData)} />
                  </div>
                </>
              ) : (
                <>
                  {!!it.image && <div className="sa-im" style={{ backgroundImage: `url(${it.image})` }}>{!!it.imageTag && <span className="sa-imtag"><Ico name="Play" size={14} />{it.imageTag}</span>}</div>}
                  <div className="sa-bd">
                    {!!it.date && <span className="sa-date"><Ico name="Calendar" size={15} />{it.date}</span>}
                    {!!it.tag && <span className="sa-tag">{it.tag}</span>}
                    <h3>{it.title}</h3>
                    {!!it.quote && <p className="sa-q">{it.quote}</p>}
                    {!!it.text && <p>{it.text}</p>}
                    {!!it.chips && <div className="sa-pchips">{str(it.chips).split(',').map((x) => x.trim()).filter(Boolean).map((x, k) => <span key={k}>{x}</span>)}</div>}
                    {(it.cta2Text || prod) ? (
                      <div className="sa-ctas">
                        <a className="sa-btn sa-btn-p" href={str(it.ctaUrl, '#')}>{it.ctaText}<Ico name="ArrowRight" size={16} /></a>
                        {!!it.cta2Text && <a className="sa-btn sa-btn-o" href={str(it.cta2Url, '#')}>{it.cta2Text}</a>}
                      </div>
                    ) : it.ctaText ? <span className="sa-tlink">{it.ctaText} <Ico name="ArrowRight" size={16} /></span> : null}
                  </div>
                </>
              )}
            </Tag>
          );
        })}
      </div>
      {!grid && <div className="sa-bar"><i style={{ width: `${bar.w}%`, marginLeft: `${bar.ml}%` }} /></div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Componente privacy (offuscamento in 3 passaggi)                   */
/* ------------------------------------------------------------------ */
export function SaPrivacyShield({ settings }: { settings: S }) {
  const rows = lines(str(settings.rows)).map((l) => l.split('|').map((c) => c.trim()));
  const steps = (settings.steps as { title?: string; sub?: string }[]) || [];
  const DUR = num(settings.stepMs, 6200);
  const [cur, setCur] = useState(0);
  const [maskedN, setMaskedN] = useState(0);
  // Render iniziale identico su server e browser (altrimenti errore di idratazione #418): la preferenza
  // «riduci animazioni» si applica solo dopo il montaggio.
  const [playing, setPlaying] = useState(true);
  useEffect(() => { if (prefersReduced()) setPlaying(false); }, []);
  const [bumpKey, setBumpKey] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout); timers.current = [];
    if (cur === 0) {
      setMaskedN(0);
      if (prefersReduced()) setMaskedN(rows.length);
      else rows.forEach((_, i) => timers.current.push(setTimeout(() => setMaskedN(i + 1), 1100 + i * 230)));
    } else setMaskedN(rows.length);
    return () => { timers.current.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur, rows.length]);
  useEffect(() => {
    if (!playing || !steps.length) return;
    const id = setInterval(() => setCur((c) => (c + 1) % Math.max(steps.length, 1)), DUR);
    return () => clearInterval(id);
  }, [playing, steps.length, DUR, bumpKey]);

  const dir = cur === 1 ? 'r' : cur === 2 ? 'l' : 'n';
  const rowView = (masked: boolean | number) => (
    <div className="sa-rows">{rows.map((r, i) => {
      const m = masked === true || (typeof masked === 'number' && i < masked);
      return <div key={i} className="sa-row"><span>{r[0]}</span><span className={`sa-val${m ? ' masked' : ''}`}>{m ? r[2] : r[1]}</span></div>;
    })}</div>
  );
  const g = (k: string, d = '') => str(settings[k], d);
  const first = rows[0] || [];
  return (
    <div className={`sa-shield${playing ? '' : ' paused'}`} data-dir={dir} style={{ ['--dur' as string]: `${DUR}ms` } as React.CSSProperties}>
      <style>{SHIELD_CSS}</style>
      <div className="sa-steps" role="tablist">
        {steps.map((s, i) => (
          <button key={`${i}-${cur === i ? bumpKey : 'x'}`} className="sa-step" role="tab" aria-selected={cur === i} onClick={() => { setCur(i); setBumpKey((k) => k + 1); }}>
            <span className="n">{i + 1}</span><b>{s.title}</b><small>{s.sub}</small><i className="bar" />
          </button>
        ))}
      </div>
      <div className="sa-stage">
        <div className="sa-pane">
          <div className="sa-pane-h"><b>{g('leftTitle', 'Smart Agency')}</b><span className="sa-badge">{g('leftBadge', 'SERVER IN ITALIA')}</span></div>
          {cur === 0 && <>{rowView(maskedN)}<p className="sa-cap"><b>{g('cap0Bold', 'Quello che vedi tu.')}</b> {g('cap0', 'Sui nostri server ogni dato personale diventa un segnaposto prima di uscire.')}</p></>}
          {cur === 1 && <>{rowView(true)}<p className="sa-cap">{g('cap1', 'La chiave di corrispondenza resta qui, in memoria, per la durata della richiesta.')}</p></>}
          {cur === 2 && <><div className="sa-msg"><b>{g('backTitle', "Risposta per l'agente")}</b>{g('backText', 'Per Mario Bianchi mancano infortuni e tutela legale. La polizza n. 4471-22-A copre solo l\'auto GK 482 TX.')}</div><p className="sa-cap"><b>{g('cap2Bold', 'I nomi tornano al loro posto')}</b> {g('cap2', 'dentro il nostro perimetro.')}</p></>}
        </div>
        <div className="sa-link" aria-hidden><i className="rail" /><i className="dot" /><i className="dot" /><i className="dot" /><span className="lock"><Ico name="Lock" size={20} /></span></div>
        <div className={`sa-pane${cur === 0 ? ' dim' : ''}`}>
          <div className="sa-pane-h"><b>{g('rightTitle', 'Vertex AI')}</b><span className="sa-badge eu">{g('rightBadge', 'EUROPA')}</span></div>
          {cur === 0 && <><div className="sa-msg" style={{ opacity: 0.6 }}>{g('wait', 'In attesa dei dati.')}</div><p className="sa-cap">{g('capAi0', "L'AI non riceve nomi, codici fiscali, telefoni o targhe.")}</p></>}
          {cur === 1 && <><div className="sa-msg"><b>{g('aiTitle', 'Richiesta ricevuta')}</b>{g('aiText', 'Analizza le coperture del cliente')} <code>{first[2] || '[PERSONA_1]'}</code>. {g('aiText2', 'Cosa manca?')}</div><p className="sa-cap"><b>{g('capAi1Bold', "Quello che vede l'AI.")}</b> {g('capAi1', 'Nessun nome, nessun codice: solo segnaposto.')}</p></>}
          {cur === 2 && <><div className="sa-msg"><b>{g('aiOutTitle', 'Risposta del modello')}</b>{g('aiOutText', 'Per [PERSONA_1] mancano infortuni e tutela legale. La polizza [POLIZZA_1] copre solo l\'auto [TARGA_1].')}</div><p className="sa-cap">{g('capAi2', 'Il modello risponde sui segnaposto. Non ha bisogno di sapere chi sia il cliente.')}</p></>}
        </div>
      </div>
      <button className="sa-playctl" type="button" onClick={() => setPlaying((p) => !p)}><Ico name={playing ? 'Pause' : 'Play'} size={16} />{playing ? 'Metti in pausa' : 'Riprendi'}</button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Chat dimostrativa                                                 */
/* ------------------------------------------------------------------ */
export function SaChatDemo({ settings }: { settings: S }) {
  const qa = (settings.items as { q?: string; a?: string; src?: string }[]) || [];
  const [k, setK] = useState(0);
  const [typed, setTyped] = useState(0);
  const cur = qa[k] || {};
  const full = str(cur.a);
  useEffect(() => {
    setTyped(0);
    if (prefersReduced()) { setTyped(full.length); return; }
    let i = 0;
    const start = setTimeout(function tick() {
      i += 2; setTyped(i);
      if (i < full.length) timerRef.current = setTimeout(tick, 22);
    }, 500);
    const timerRef = { current: undefined as ReturnType<typeof setTimeout> | undefined };
    return () => { clearTimeout(start); if (timerRef.current) clearTimeout(timerRef.current); };
  }, [k, full]);
  const done = typed >= full.length;
  return (
    <div className="sa-chat">
      <style>{CHAT_CSS}</style>
      <div className="sa-chat-top">{settings.avatar ? <img src={str(settings.avatar)} alt="" /> : null}<span>{str(settings.name, 'Charlie')}</span><small>{str(settings.sub, 'Smart Agency')}</small></div>
      <div className="sa-chat-log" aria-live="polite">
        <div className="sa-bub sa-me">{cur.q}</div>
        <div className="sa-bub sa-ch">{full.slice(0, typed)}{!done && <span className="sa-caret" />}{done && cur.src && <small>{cur.src}</small>}</div>
      </div>
      <div className="sa-chips">{qa.map((x, i) => <button key={i} type="button" className="sa-chipb" aria-pressed={i === k} onClick={() => setK(i)}>{x.q}</button>)}</div>
      {!!settings.note && <p className="sa-chat-note">{str(settings.note)}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 5. Card pastello (icona + titolo + testo)                            */
/* ------------------------------------------------------------------ */
export function SaFeatureCard({ settings }: { settings: S }) {
  const v = str(settings.variant, 'card');
  if (['plain', 'step', 'ben', 'node', 'feat', 'mini'].includes(v)) return <SaLandCard settings={settings} />;
  const vars = tintVars(settings.tint, num(settings.tintIndex, 0));
  let body: React.ReactNode;
  if (v === 'quote') {
    body = (
      <figure className="sa-quote" style={vars}>
        <style>{AG_CSS}</style>
        <blockquote>“{str(settings.text)}”</blockquote>
        <figcaption className={settings.image ? 'withimg' : ''}>{!!settings.image && <img src={str(settings.image)} alt={str(settings.title)} />}<span className="fc"><b>{str(settings.title)}</b><span>{str(settings.role)}</span></span></figcaption>
      </figure>
    );
  } else if (v === 'check') {
    body = (
      <div className="sa-check" style={vars}>
        <style>{AG_CSS}</style>
        <span className="sa-ckb"><Ico name="Check" size={17} /></span>{str(settings.title)}
      </div>
    );
  } else if (v === 'link') {
    body = (
      <div className="sa-linkrow">
        <style>{AG_CSS}</style>
        <Ico name={str(settings.icon, 'Sparkles')} size={22} />{str(settings.title)}
      </div>
    );
  } else if (v === 'info') {
    body = (
      <div className="sa-info" style={vars}>
        <style>{AG_CSS}</style>
        <span className="sa-infoic"><Ico name={str(settings.icon, 'MapPin')} size={22} /></span>
        <div><b>{str(settings.title)}</b><span>{str(settings.text).split('\n').map((l, k) => <Fragment key={k}>{k > 0 && <br />}{l}</Fragment>)}</span></div>
      </div>
    );
  } else {
    body = (
      <div className="sa-ag" style={vars}>
        <style>{AG_CSS}</style>
        <span className="sa-agic"><Ico name={str(settings.icon, 'Sparkles')} size={26} /></span>
        <h3>{str(settings.title)}</h3>
        {!!settings.text && <p>{str(settings.text)}</p>}
        {!!settings.linkText && <span className="sa-tlink">{str(settings.linkText)} <Ico name="ArrowRight" size={16} /></span>}
      </div>
    );
  }
  return settings.link ? <a href={str(settings.link)} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>{body}</a> : <>{body}</>;
}

/* ------------------------------------------------------------------ */
/* 6. Tabella di confronto                                              */
/* ------------------------------------------------------------------ */
export function SaCompareTable({ settings }: { settings: S }) {
  const rows = lines(str(settings.rows)).map((l) => l.split('|').map((c) => c.trim()));
  return (
    <div className="sa-cmp-wrap">
      <style>{CMP_CSS}</style>
      <table className="sa-cmp">
        <thead><tr><th />
          <th>{str(settings.leftTitle, 'AI generica')}</th>
          <th className="ch">{settings.rightIcon ? <img src={str(settings.rightIcon)} alt="" /> : null}{str(settings.rightTitle, 'Charlie')}</th></tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={i}><td>{r[0]}</td>
            <td className="no"><Ico name="X" size={17} />{r[1]}</td>
            <td className="yes"><Ico name="Check" size={17} />{r[2]}</td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Striscia loghi che scorre                                         */
/* ------------------------------------------------------------------ */
export function SaLogoMarquee({ settings }: { settings: S }) {
  const items = (settings.items as { src?: string; alt?: string; link?: string }[]) || [];
  const h = num(settings.tileHeight, 68);
  const tiles = (hidden: boolean) => items.map((it, i) => {
    const img = <img src={str(it.src)} alt={hidden ? '' : str(it.alt)} style={{ maxHeight: h - 24, maxWidth: 190, objectFit: 'contain' }} />;
    return <span key={`${hidden}-${i}`} className="sa-lg" style={{ height: h }} aria-hidden={hidden}>{it.link ? <a href={it.link}>{img}</a> : img}</span>;
  });
  if (settings.static) {
    return (
      <div className="sa-marq-static">
        <style>{MARQ_CSS}</style>
        {tiles(false)}
      </div>
    );
  }
  return (
    <div className="sa-marq">
      <style>{MARQ_CSS}</style>
      <div className="sa-mv" style={{ animationDuration: `${num(settings.speed, 38)}s` }}>{tiles(false)}{tiles(true)}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* CSS                                                                  */
/* ------------------------------------------------------------------ */
const BASE = `
.sa-gw{width:100%;max-width:540px;background:color-mix(in srgb,#fff 72%,transparent);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.85);border-radius:18px;box-shadow:0 2px 6px rgba(34,30,60,.05),0 22px 48px -16px rgba(34,30,60,.22);padding:18px;display:grid;gap:12px;font-size:.92rem;color:#1f1e26}
.sa-gw-h{display:flex;align-items:center;gap:10px}.sa-gw-h .sa-badge,.sa-gw-r{margin-left:auto}
.sa-gw-r{font-size:.78rem;color:#6b6a7c}
.sa-gw-s{font-size:.78rem;color:#6b6a7c;margin:0}
.sa-badge{font-size:.72rem;font-weight:700;letter-spacing:.08em;padding:.22rem .55rem;border-radius:999px;background:#e3f2fd;color:#0c75c6}
.sa-badge.eu{background:#f0eefe;color:#5c4b9e}
.sa-bub{max-width:88%;padding:11px 15px;border-radius:14px;font-size:.93rem;line-height:1.55}
.sa-me{justify-self:end;align-self:flex-end;background:#0078d4;color:#fff;border-bottom-right-radius:4px}
.sa-ch{justify-self:start;align-self:flex-start;background:#fff;border:1px solid rgba(43,42,51,.08);border-bottom-left-radius:4px}
.sa-ch small{display:block;margin-top:6px;color:#6b6a7c;font-size:.78rem}
.sa-input{border:1px solid rgba(43,42,51,.14);background:#fff;border-radius:999px;padding:.55rem 1rem;color:#6b6a7c;font-size:.88rem}
.sa-circ{width:36px;height:36px;border-radius:50%;border:1px solid rgba(43,42,51,.14);background:rgba(255,255,255,.92);display:grid;place-items:center;cursor:pointer;color:#1f1e26;padding:0}
.sa-circ:hover{background:#fff;box-shadow:0 8px 24px -10px rgba(34,30,60,.2)}
.sa-btn{display:inline-flex;align-items:center;gap:.5rem;white-space:nowrap;border-radius:6px;padding:.74rem 1.2rem;font-weight:600;font-size:.95rem;text-decoration:none;border:1px solid transparent}
.sa-btn-p{background:#0078d4;color:#fff}.sa-btn-p:hover{background:#106ebe}
.sa-btn-o{background:#fff;color:#0078d4;border-color:#0078d4}.sa-btn-o:hover{background:#e3f2fd}
.sa-tlink{display:inline-flex;align-items:center;gap:6px;color:#0c75c6;font-weight:600;text-decoration:none;font-size:.95rem}
`;
const HERO_CSS = BASE + `
.sa-hero{position:relative;overflow:hidden;background:#f4f4fb;width:100%}
.sa-track{display:flex;transition:transform .7s cubic-bezier(.65,.05,.25,1)}
.sa-slide{min-width:100%;position:relative;display:flex;align-items:center;isolation:isolate}
.sa-bg{position:absolute;inset:0;z-index:-1}
.sa-bgi{display:block;position:absolute;right:0;top:0;height:100%;background-size:cover;background-position:center;background-repeat:no-repeat;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 34%);mask-image:linear-gradient(90deg,transparent 0,#000 34%)}
.sa-wrap{width:100%;max-width:1320px;margin-inline:auto;padding-inline:clamp(16px,3vw,40px)}
.sa-slide>.sa-wrap{flex:1}
.sa-panel{width:min(540px,100%);padding:clamp(26px,3vw,40px);background:color-mix(in srgb,#fff 72%,transparent);backdrop-filter:blur(18px) saturate(1.2);-webkit-backdrop-filter:blur(18px) saturate(1.2);border:1px solid rgba(255,255,255,.7);border-radius:18px;box-shadow:0 2px 6px rgba(34,30,60,.05),0 22px 48px -16px rgba(34,30,60,.22);margin-block:32px 68px}
.sa-chip{display:inline-flex;align-items:center;font-size:.74rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:.25rem .6rem;border-radius:999px}
.sa-h{text-wrap:balance;font-size:clamp(1.9rem,3.2vw,2.7rem);margin:14px 0 0;font-weight:600;letter-spacing:-.018em;line-height:1.14;color:#1f1e26}
.sa-h em{font-style:normal;color:#6b4ecc}
.sa-lead{margin:14px 0 0;color:#4d4c58;font-size:1.05rem;line-height:1.6}
.sa-pills{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}
.sa-pill{padding:.38rem .75rem;border-radius:999px;background:#fff;border:1px solid rgba(43,42,51,.08);font-size:.86rem;font-weight:500}
.sa-cta{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}
.sa-vchat{position:absolute;right:clamp(16px,7vw,130px);top:50%;transform:translateY(-50%);width:min(500px,40vw);z-index:-1}
.sa-vc-f{position:absolute;display:inline-flex;align-items:center;gap:8px;padding:.5rem .9rem;border-radius:999px;background:#fff;border:1px solid rgba(43,42,51,.08);box-shadow:0 1px 2px rgba(34,30,60,.06),0 8px 24px -10px rgba(34,30,60,.14);font-size:.85rem;font-weight:600}
.sa-vc-f svg{color:#5c4b9e}.sa-vc-f.f1{left:-46px;top:-18px}.sa-vc-f.f2{right:-30px;bottom:-20px}.sa-vc-f.f3{right:-30px;top:-20px}
.sa-compact .sa-panel{margin-block:32px}
.sa-arrows{position:absolute;inset:0;pointer-events:none;z-index:4}
.sa-arrows .sa-circ{pointer-events:auto;position:absolute;top:50%;transform:translateY(-50%)}
.sa-arrows .l{left:14px}.sa-arrows .r{right:14px}
.sa-ui{position:absolute;left:0;right:0;bottom:16px;z-index:5;pointer-events:none}
.sa-ui-in{display:flex;align-items:center;gap:12px}
.sa-ui .sa-circ,.sa-dots{pointer-events:auto}
.sa-dots{display:flex;gap:8px}
.sa-dot{width:36px;height:4px;border-radius:2px;background:rgba(31,30,38,.22);border:0;padding:0;cursor:pointer;position:relative;overflow:hidden}
.sa-dot i{position:absolute;inset:0;width:0;background:#1f1e26}
.sa-dot.on i{animation:sa-fill var(--sa-dur,7s) linear forwards}.sa-dot.on.paused i{animation:none;width:100%}
@keyframes sa-fill{from{width:0}to{width:100%}}
@media (max-width:1000px){
 .sa-slide{flex-direction:column;align-items:stretch;justify-content:flex-end;min-height:0!important}
 .sa-bg{position:relative;inset:auto;height:230px;z-index:0}.sa-bgi{position:relative;display:block;width:100%!important;height:100%;-webkit-mask-image:none;mask-image:none}
 .sa-panel{width:100%;border-radius:0;margin:0;backdrop-filter:none;background:#fff;border:0;box-shadow:none}
 .sa-vchat{display:none}.sa-ui{position:relative;bottom:auto;background:#fff;padding-block:14px}.sa-arrows{display:none}
}
@media (prefers-reduced-motion:reduce){.sa-track{transition:none}.sa-dot.on i{animation:none;width:100%}}
`;
const CARD_CSS = BASE + `
.sa-car{width:100%}
.sa-car-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:26px}
.sa-eyebrow{font-size:.78rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#0c75c6}
.sa-big{font-size:clamp(1.7rem,3vw,2.3rem);margin:10px 0 0;font-weight:600;letter-spacing:-.018em;line-height:1.14}
.sa-sub{margin:10px 0 0;color:#4d4c58;max-width:44rem;font-size:1.04rem}
.sa-ctl{display:flex;gap:8px}
.sa-cd-track{display:flex;gap:20px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding-bottom:6px}
.sa-cd-track::-webkit-scrollbar{display:none}
.sa-cd{scroll-snap-align:start;flex:0 0 clamp(270px,26vw,340px);background:#fff;border-radius:18px;overflow:hidden;text-decoration:none;color:inherit;display:flex;flex-direction:column;box-shadow:0 1px 2px rgba(34,30,60,.06),0 8px 24px -10px rgba(34,30,60,.14);transition:box-shadow .2s,transform .2s}
a.sa-cd:hover{box-shadow:0 2px 6px rgba(34,30,60,.05),0 22px 48px -16px rgba(34,30,60,.22);transform:translateY(-2px)}
.sa-cd.tint{background:var(--t)}.sa-cd.tint h3{color:color-mix(in srgb,var(--c) 70%,#1f1e26)}.sa-cd.tint .sa-tlink{color:var(--c)}
.sa-im{aspect-ratio:4/3;background-size:cover;background-position:center}
.sa-bd{padding:18px 20px 22px;display:flex;flex-direction:column;gap:8px;flex:1}
.sa-cd h3{margin:0;font-size:1.12rem;line-height:1.2}.sa-cd p{margin:0;font-size:.93rem;color:#4d4c58}
.sa-bd .sa-tlink{margin-top:auto;padding-top:6px}
.sa-tag{font-size:.72rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#0c75c6}
.sa-q{font-style:italic;color:#6b6a7c!important}
.sa-cd.sa-wide{display:grid;grid-template-columns:.78fr 1.22fr;border-radius:24px}
.sa-wide .sa-tx{padding:clamp(24px,3vw,44px);display:flex;flex-direction:column;gap:12px;justify-content:center}
.sa-wide h3{font-size:clamp(1.4rem,2.2vw,1.8rem)}.sa-wide .sa-tx p{font-size:1rem}
.sa-stg{background-size:cover;background-position:center;background-color:#eef0fa;padding:clamp(18px,3vw,36px);display:grid;place-items:center;min-height:420px}
.sa-mt{width:100%;border-collapse:collapse;background:#fff;border-radius:12px;overflow:hidden;border:1px solid rgba(43,42,51,.08)}
.sa-mt th,.sa-mt td{padding:9px 12px;text-align:left;border-bottom:1px solid rgba(43,42,51,.08);font-size:.88rem}
.sa-mt th{background:#f4f4fb;font-weight:600}.sa-mt tr:last-child td{border-bottom:0}
.sa-mt td.y{color:#1f8f6b;font-weight:600}.sa-mt td.n{color:#b45309;font-weight:600}
.sa-docchip{justify-self:start;display:inline-flex;gap:8px;align-items:center;background:#fff;border:1px solid rgba(43,42,51,.08);border-radius:999px;padding:.35rem .8rem;font-size:.84rem}
.sa-docchip svg{color:#5c4b9e}
.sa-fmt{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.sa-fmt span{background:#f0eefe;color:#5c4b9e;font-weight:600;font-size:.8rem;padding:.25rem .6rem;border-radius:8px}.sa-fmt em{font-style:normal;color:#6b6a7c;font-size:.82rem}
.sa-pts{margin:0;padding:0;list-style:none;display:grid;gap:8px;counter-reset:p}
.sa-pts li{counter-increment:p;background:#fff;border:1px solid rgba(43,42,51,.08);border-radius:12px;padding:.6rem .9rem .6rem 2.6rem;position:relative}
.sa-pts li::before{content:counter(p);position:absolute;left:.8rem;top:50%;transform:translateY(-50%);width:1.4rem;height:1.4rem;border-radius:50%;background:#5c4b9e;color:#fff;font-size:.78rem;font-weight:700;display:grid;place-items:center}
.sa-act span{display:inline-flex;gap:8px;align-items:center;background:#0078d4;color:#fff;border-radius:8px;padding:.5rem .9rem;font-weight:600;font-size:.88rem}
.sa-flow{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.sa-flow li{display:flex;gap:10px;align-items:center;background:#fff;border:1px solid rgba(43,42,51,.08);border-radius:12px;padding:.7rem .9rem}
.sa-flow li svg{color:#1f8f6b}.sa-flow li.now{border-color:#a99bd8;background:#f0eefe;font-weight:600}.sa-flow li.now svg{color:#5c4b9e}
.sa-cd-track.sa-grid{display:grid;grid-template-columns:repeat(var(--cols,3),1fr);overflow:visible;scroll-snap-type:none}
.sa-grid .sa-cd{flex:none}
.sa-imtag{position:absolute;left:12px;bottom:12px;display:inline-flex;gap:6px;align-items:center;background:rgba(255,255,255,.9);border-radius:999px;padding:.25rem .7rem;font-size:.78rem;font-weight:600}
.sa-imtag svg{color:#0c75c6}.sa-im{position:relative}
.sa-date{display:inline-flex;gap:8px;align-items:center;font-size:.8rem;font-weight:600;color:var(--c,#6b6a7c);background:var(--t,#f4f4fb);padding:.2rem .65rem;border-radius:999px;justify-self:start;align-self:flex-start}
.sa-pchips{display:flex;gap:8px;flex-wrap:wrap}.sa-pchips span{background:rgba(255,255,255,.75);color:var(--c,#0c75c6);font-weight:600;font-size:.8rem;padding:.25rem .7rem;border-radius:999px}
.sa-ctas{display:flex;gap:12px;flex-wrap:wrap;margin-top:6px}
@media (max-width:1000px){.sa-cd-track.sa-grid{grid-template-columns:1fr 1fr}}@media (max-width:620px){.sa-cd-track.sa-grid{grid-template-columns:1fr}}
.sa-cd.sa-feat{display:grid;grid-template-columns:1.1fr .9fr;border-radius:24px;background:#f4f4fb;box-shadow:none;flex:none}
.sa-feat .sa-tx{padding:clamp(24px,4vw,52px);display:flex;flex-direction:column;gap:14px;justify-content:center}
.sa-fchip{align-self:flex-start;display:inline-flex;align-items:center;font-size:.74rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:.25rem .6rem;border-radius:999px;background:var(--t,#e3f6ee);color:var(--c,#1f8f6b)}
.sa-fh{margin:0;font-size:clamp(1.7rem,3vw,2.3rem);font-weight:600;letter-spacing:-.018em;line-height:1.14}
.sa-feat .sa-tx p{font-size:1.04rem;margin:0}
.sa-fim{background-size:cover;background-position:center;min-height:300px}
.sa-cd.sa-prod{border-radius:26px;background:linear-gradient(160deg,var(--t,#fff),color-mix(in srgb,var(--t,#fff) 50%,#fff));box-shadow:none}
.sa-prod .sa-im{aspect-ratio:16/8}
.sa-prod .sa-bd{padding:clamp(22px,3vw,34px);gap:12px}
.sa-prod .sa-tag{color:var(--c)}.sa-prod h3{font-size:clamp(1.3rem,2vw,1.6rem);color:color-mix(in srgb,var(--c) 60%,#1f1e26)}.sa-prod p{font-size:1rem}
@media (max-width:900px){.sa-cd.sa-feat{grid-template-columns:1fr}}
.sa-bar{height:3px;background:rgba(43,42,51,.08);border-radius:2px;margin-top:18px;overflow:hidden}.sa-bar i{display:block;height:100%;background:#1f1e26;border-radius:2px}
@media (max-width:900px){.sa-cd.sa-wide{grid-template-columns:1fr}.sa-stg{min-height:0}}
`;
const SHIELD_CSS = `
.sa-shield{padding:clamp(16px,3vw,26px);background:color-mix(in srgb,#fff 74%,transparent);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid rgba(43,42,51,.14);border-radius:16px;box-shadow:0 2px 6px rgba(34,30,60,.05),0 22px 48px -16px rgba(34,30,60,.22);color:#1f1e26}
.sa-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px}
.sa-step{position:relative;text-align:left;font:inherit;color:#4d4c58;background:rgba(255,255,255,.5);border:1px solid rgba(43,42,51,.14);border-radius:10px;padding:12px 14px 14px;cursor:pointer;overflow:hidden}
.sa-step .n{display:inline-grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#f1f1f6;font-size:.78rem;font-weight:700;margin-right:8px}
.sa-step b{font-weight:600;font-size:.95rem;color:#1f1e26}.sa-step small{display:block;margin-top:4px;font-size:.82rem;color:#6b6a7c;line-height:1.35}
.sa-step .bar{position:absolute;left:0;bottom:0;height:3px;width:0;background:#0078d4}
.sa-step[aria-selected="true"]{background:#fff;border-color:color-mix(in srgb,#0078d4 55%,rgba(43,42,51,.14))}
.sa-step[aria-selected="true"] .n{background:#0078d4;color:#fff}
.sa-step[aria-selected="true"] .bar{animation:sa-fill var(--dur,6s) linear forwards}.sa-shield.paused .sa-step .bar{animation:none;width:0}
@keyframes sa-fill{from{width:0}to{width:100%}}
.sa-stage{display:grid;grid-template-columns:1fr 78px 1fr;align-items:stretch}
.sa-pane{background:#fff;border:1px solid rgba(43,42,51,.14);border-radius:12px;padding:18px 18px 16px;min-height:330px;display:flex;flex-direction:column;gap:12px;min-width:0;transition:opacity .4s,filter .4s}
.sa-pane.dim{opacity:.45;filter:saturate(.6)}
.sa-pane-h{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.sa-pane-h b{font-size:.93rem;font-weight:600}
.sa-badge{font-size:.72rem;font-weight:700;letter-spacing:.08em;padding:.22rem .55rem;border-radius:999px;background:#e3f2fd;color:#0c75c6}.sa-badge.eu{background:#f0eefe;color:#5c4b9e}
.sa-rows{border:1px solid rgba(43,42,51,.08);border-radius:10px;overflow:hidden}
.sa-row{display:grid;grid-template-columns:104px 1fr;gap:10px;padding:9px 12px;font-size:.88rem;border-bottom:1px solid rgba(43,42,51,.08);align-items:center;min-width:0}.sa-row:last-child{border-bottom:0}
.sa-row span:first-child{color:#6b6a7c}
.sa-val{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:.82rem;overflow-wrap:anywhere;transition:background .3s,color .3s}
.sa-val.masked{color:#0c75c6;background:#e3f2fd;border-radius:6px;padding:2px 6px;display:inline-block;justify-self:start}
.sa-msg{font-size:.93rem;line-height:1.6;background:#f1f1f6;border-radius:10px;padding:12px 14px}.sa-msg b{display:block;margin-bottom:6px}
.sa-msg code{font-family:ui-monospace,Menlo,monospace;font-size:.82rem;color:#0c75c6;background:#e3f2fd;border-radius:5px;padding:1px 5px}
.sa-cap{font-size:.86rem;color:#6b6a7c;margin:auto 0 0}.sa-cap b{color:#1f1e26;font-weight:600}
.sa-link{display:flex;align-items:center;justify-content:center;position:relative;min-width:0}
.sa-link .rail{position:absolute;left:0;right:0;top:50%;height:2px;background:repeating-linear-gradient(90deg,rgba(43,42,51,.14) 0 6px,transparent 6px 12px);transform:translateY(-1px)}
.sa-link .dot{position:absolute;top:calc(50% - 5px);width:10px;height:10px;border-radius:50%;background:#0078d4;opacity:0;left:0}
.sa-shield[data-dir="r"] .sa-link .dot{animation:sa-go 1.8s linear infinite}.sa-shield[data-dir="l"] .sa-link .dot{animation:sa-back 1.8s linear infinite}
.sa-link .dot:nth-child(3){animation-delay:.6s!important}.sa-link .dot:nth-child(4){animation-delay:1.2s!important}
@keyframes sa-go{0%{left:0;opacity:0}15%{opacity:1}85%{opacity:1}100%{left:calc(100% - 10px);opacity:0}}
@keyframes sa-back{0%{left:calc(100% - 10px);opacity:0}15%{opacity:1}85%{opacity:1}100%{left:0;opacity:0}}
.sa-link .lock{position:relative;z-index:1;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:#fff;border:1px solid rgba(43,42,51,.14);color:#1f8f6b;box-shadow:0 1px 2px rgba(34,30,60,.06),0 8px 24px -10px rgba(34,30,60,.14)}
.sa-playctl{display:inline-flex;align-items:center;gap:8px;margin-top:14px;font:inherit;font-size:.85rem;color:#4d4c58;background:#fff;border:1px solid rgba(43,42,51,.14);border-radius:999px;padding:.35rem .8rem;cursor:pointer}
@media (max-width:960px){.sa-stage{grid-template-columns:1fr}.sa-link{height:64px}.sa-link .rail{left:50%;right:auto;top:0;bottom:0;width:2px;height:auto;background:repeating-linear-gradient(180deg,rgba(43,42,51,.14) 0 6px,transparent 6px 12px);transform:none}.sa-link .dot{display:none}.sa-steps{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){.sa-step .bar,.sa-link .dot{animation:none!important}}
`;
const CHAT_CSS = `
.sa-chat{background:color-mix(in srgb,#fff 72%,transparent);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid rgba(255,255,255,.8);border-radius:20px;box-shadow:0 2px 6px rgba(34,30,60,.05),0 22px 48px -16px rgba(34,30,60,.22);padding:20px;min-height:340px;display:flex;flex-direction:column;gap:14px;min-width:0;color:#1f1e26}
.sa-chat-top{display:flex;align-items:center;gap:10px;font-weight:600;font-size:.92rem}.sa-chat-top img{width:24px;height:auto}.sa-chat-top small{margin-left:auto;font-weight:400;color:#6b6a7c;font-size:.78rem}
.sa-chat-log{flex:1;display:flex;flex-direction:column;gap:10px;min-height:150px}
.sa-bub{max-width:88%;padding:11px 15px;border-radius:14px;font-size:.93rem;line-height:1.55}
.sa-me{align-self:flex-end;background:#0078d4;color:#fff;border-bottom-right-radius:4px}
.sa-ch{align-self:flex-start;background:#fff;border:1px solid rgba(43,42,51,.08);border-bottom-left-radius:4px}.sa-ch small{display:block;margin-top:6px;color:#6b6a7c;font-size:.78rem}
.sa-caret{display:inline-block;width:2px;height:1em;background:#1f1e26;vertical-align:-2px;animation:sa-blink 1s steps(2) infinite}
@keyframes sa-blink{50%{opacity:0}}
.sa-chips{display:flex;gap:8px;flex-wrap:wrap}
.sa-chipb{font:inherit;font-size:.86rem;padding:.45rem .85rem;border-radius:999px;background:#fff;border:1px solid rgba(43,42,51,.14);color:#1f1e26;cursor:pointer}
.sa-chipb:hover{border-color:#0078d4;color:#0c75c6}.sa-chipb[aria-pressed="true"]{background:#e3f2fd;border-color:#0078d4;color:#0c75c6}
.sa-chat-note{font-size:.78rem;color:#6b6a7c;margin:0}
`;
const AG_CSS = `
.sa-ag{flex:1 1 auto;background:linear-gradient(150deg,var(--t),color-mix(in srgb,var(--t) 55%,#fff));border-radius:22px;padding:26px 26px 28px;display:grid;gap:10px;align-content:start;min-height:200px;transition:transform .2s,box-shadow .2s;position:relative;overflow:hidden}
.sa-ag::after{content:"";position:absolute;right:-34px;top:-34px;width:120px;height:120px;border-radius:50%;background:color-mix(in srgb,var(--c) 10%,transparent)}
.sa-ag:hover{transform:translateY(-3px);box-shadow:0 2px 6px rgba(34,30,60,.05),0 22px 48px -16px rgba(34,30,60,.22)}
.sa-agic{width:52px;height:52px;border-radius:16px;display:grid;place-items:center;background:rgba(255,255,255,.78);color:var(--c);box-shadow:0 6px 16px -8px color-mix(in srgb,var(--c) 60%,transparent);position:relative;z-index:1}
.sa-ag h3{margin:0;font-size:1.15rem;color:color-mix(in srgb,var(--c) 70%,#1f1e26);position:relative;z-index:1}
.sa-ag p{margin:0;color:#4d4c58;font-size:.95rem;position:relative;z-index:1}
.sa-tlink{display:inline-flex;align-items:center;gap:6px;color:var(--c);font-weight:600;font-size:.95rem;position:relative;z-index:1}
.sa-quote{margin:0;padding:26px 28px;border-radius:18px;background:linear-gradient(150deg,var(--t),color-mix(in srgb,var(--t) 50%,#fff));position:relative;overflow:hidden}
.sa-quote::before{content:"\\201C";position:absolute;right:18px;top:-6px;font-size:7rem;line-height:1;color:var(--c);opacity:.16;font-family:Georgia,serif}
.sa-quote blockquote{margin:0;font-size:1.04rem;line-height:1.65}.sa-quote figcaption.withimg{display:flex;align-items:center;gap:14px}.sa-quote figcaption img{width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid #fff;box-shadow:0 4px 12px rgba(16,24,40,.15);flex:none}.sa-quote figcaption .fc{display:grid}
.sa-quote figcaption{margin-top:14px;display:grid}.sa-quote figcaption b{color:var(--c)}.sa-quote figcaption span{color:#6b6a7c;font-size:.9rem}
.sa-check{display:flex;gap:12px;align-items:center;background:var(--t);border-radius:16px;padding:14px 18px;font-weight:500;font-size:1.02rem}
.sa-ckb{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#fff;color:var(--c);flex:none;box-shadow:0 4px 10px -6px var(--c)}
.sa-linkrow{display:flex;gap:12px;align-items:center;padding:20px 18px;font-weight:600;font-size:.95rem}.sa-linkrow svg{color:#0c75c6}
.sa-info{display:flex;gap:16px;align-items:flex-start;padding:14px 16px;border-radius:18px;background:linear-gradient(150deg,var(--t),#fff)}
.sa-infoic{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:rgba(255,255,255,.8);color:var(--c);flex:none}
.sa-info b{display:block}.sa-info span:not(.sa-infoic){color:#4d4c58}
`;
const CMP_CSS = `
.sa-cmp-wrap{overflow-x:auto}
.sa-cmp{width:100%;border-collapse:separate;border-spacing:0;background:#fff;border:1px solid rgba(43,42,51,.14);border-radius:14px;overflow:hidden;box-shadow:0 1px 2px rgba(34,30,60,.06),0 8px 24px -10px rgba(34,30,60,.14);min-width:640px}
.sa-cmp th,.sa-cmp td{padding:15px 20px;text-align:left;border-bottom:1px solid rgba(43,42,51,.08);font-size:.97rem;vertical-align:top}
.sa-cmp tr:last-child td{border-bottom:0}.sa-cmp thead th{background:#f4f4fb;font-weight:600}.sa-cmp thead th.ch{background:#f0eefe;color:#5c4b9e}
.sa-cmp thead th img{display:inline-block;width:20px;vertical-align:-4px;margin-right:8px}
.sa-cmp td:first-child{width:24%;font-weight:600}.sa-cmp td.no{color:#6b6a7c}.sa-cmp td svg{display:inline-block;vertical-align:-3px;margin-right:8px}.sa-cmp td.yes svg{color:#5c4b9e}
`;
const MARQ_CSS = `
.sa-marq{overflow:hidden;width:0;min-width:100%;-webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}
.sa-mv{display:flex;gap:14px;width:max-content;animation:sa-mq 38s linear infinite}
.sa-marq:hover .sa-mv{animation-play-state:paused}
.sa-marq-static{display:flex;flex-wrap:wrap;gap:14px;align-items:center}
.sa-lg{background:#fff;border:1px solid rgba(43,42,51,.08);border-radius:14px;padding:10px 18px;display:grid;place-items:center}
.sa-lg a{display:grid;place-items:center}
@keyframes sa-mq{to{transform:translateX(calc(-50% - 7px))}}
@media (prefers-reduced-motion:reduce){.sa-mv{animation:none}}
`;

/* ================================================================== */
/* LANDING (stile "Figtree", card bianche bordate) — widget nativi      */
/* ================================================================== */
const LAND_CSS = `
@import url("https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap");
.sl{--brand:#0078d4;--brand-ink:#005a9e;--brand-700:#0a4e86;--brand-soft:#e6f2fd;--brand-soft2:#f3f9fe;--accent:#5b63c7;--accent-soft:#eceefb;--ok:#1f8a5b;--ok-soft:#e7f6ee;--warn:#c2410c;--warn-soft:#fdeee5;--ink:#121725;--ink-2:#39404f;--muted:#64708a;--line:#e7eaf0;--line-2:#eef1f6;--bg-alt:#f5f8fc;--shadow-s:0 1px 2px rgba(16,24,40,.05);--shadow:0 2px 6px rgba(16,24,40,.05),0 14px 36px rgba(16,24,40,.08);--shadow-lg:0 10px 24px rgba(0,88,158,.10),0 30px 60px rgba(16,24,40,.12);--disp:"Figtree","Segoe UI",system-ui,sans-serif;font-family:"Segoe UI",-apple-system,system-ui,"Helvetica Neue",Arial,sans-serif;color:var(--ink-2);line-height:1.55}
.sl h1,.sl h2,.sl h3{font-family:var(--disp);color:var(--ink);margin:0;letter-spacing:-.02em;font-weight:700;line-height:1.1;text-wrap:balance}
.sl p{margin:0}.sl svg{display:block}
`;

export function SaLandHero({ settings }: { settings: S }) {
  const g = (k: string, d = '') => str(settings[k], d);
  const rows = lines(g('rows')).map((l) => l.split('|').map((c) => c.trim()));
  const q = g('question'), intro = g('answerIntro'), src = g('source');
  const [phase, setPhase] = useState(3);          // 0 vuoto · 1 digita · 2 typing · 3 risposta
  const [typed, setTyped] = useState(q.length);
  const [shown, setShown] = useState(rows.length + 2);
  useEffect(() => {
    if (prefersReduced() || !q) return;
    let alive = true;
    const w = (ms: number) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      await w(2600);
      while (alive) {
        setPhase(0); setTyped(0); setShown(0); await w(650); if (!alive) return;
        setPhase(1);
        for (let i = 0; i < q.length && alive; i++) { setTyped(i + 1); await w(9 + Math.random() * 13); }
        await w(350); setPhase(2); await w(1700); if (!alive) return;
        setPhase(3);
        for (let i = 1; i <= rows.length + 2 && alive; i++) { setShown(i); await w(300); }
        await w(4800);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, rows.length]);
  const on = (i: number) => ({ opacity: shown >= i ? 1 : 0, transform: shown >= i ? 'none' : 'translateY(7px)', transition: 'opacity .4s ease, transform .4s ease' } as React.CSSProperties);
  return (
    <div className="sl sl-hero">
      <style>{LAND_CSS + LAND_HERO_CSS}</style>
      <div className="sl-hero-in">
        <div>
          {!!g('eyebrow') && <span className="sl-eyebrow">{g('eyebrow')}</span>}
          <h1 className="sl-h1">{g('title').split('\n').map((l, i) => <Fragment key={i}>{i > 0 && <br />}{l}</Fragment>)}</h1>
          <p className="sl-lead" dangerouslySetInnerHTML={{ __html: g('lead') }} />
          <div className="sl-cta">
            {!!g('cta1Text') && <a className="sl-btn sl-btn-p lg" href={g('cta1Url', '#')}>{g('cta1Text')}</a>}
            {!!g('cta2Text') && <a className="sl-btn sl-btn-g lg" href={g('cta2Url', '#')}>{g('cta2Text')}</a>}
          </div>
          {!!g('chips') && <div className="sl-chipsrow">{g('chips').split('|').map((x) => x.trim()).filter(Boolean).map((x, i) => { const [ic, tx] = x.split(':'); return <span key={i}><Ico name={ic} size={16} />{tx}</span>; })}</div>}
          <div className="sl-reassure">{g('reassure').split('|').map((x) => x.trim()).filter(Boolean).map((x, i) => <span key={i}><Ico name="Check" size={15} />{x}</span>)}</div>
        </div>
        <div className="sl-device" aria-label="Charlie al lavoro">
          <div className="sl-chrome"><i /><i /><i /><span className="sl-addr">{g('address', 'app.smartagency.cloud · Charlie')}</span></div>
          <div className="sl-dbar">{settings.avatar ? <img className="sl-ava" src={g('avatar')} alt="" /> : null}<b>Charlie</b><span className="sl-tag">{g('mode', 'Analisi CGA')}</span></div>
          <div className="sl-dbody">
            <div className="sl-q" style={{ opacity: phase >= 2 || (phase === 1 && false) ? 1 : phase === 3 ? 1 : 0, transform: phase >= 2 ? 'none' : 'translateY(9px)', transition: 'opacity .3s, transform .3s' }}>{q}</div>
            {phase === 2 && <div className="sl-typing"><span /><span /><span /></div>}
            {phase === 3 && (
              <div className="sl-a">
                <p style={on(1)} dangerouslySetInnerHTML={{ __html: intro }} />
                <table className="sl-cmp"><thead><tr><th>Voce</th><th>Condizione</th></tr></thead><tbody>
                  {rows.map((r, i) => <tr key={i} style={on(i + 2)}><td>{r[0]}</td><td>{r[2] === 'no' ? <span className="sl-pill no">{r[1]}</span> : r[1]}</td></tr>)}
                </tbody></table>
                {!!src && <span className="sl-src" style={on(rows.length + 2)}><Ico name="Link" size={14} />{src}</span>}
              </div>
            )}
          </div>
          <div className="sl-comp"><span className={`sl-ct${phase === 1 ? ' caret' : ''}${phase !== 1 ? ' empty' : ''}`}>{phase === 1 ? q.slice(0, typed) : ''}</span><span className={`sl-send${phase === 1 ? ' ready' : ''}`}><Ico name="Send" size={16} /></span></div>
        </div>
      </div>
    </div>
  );
}

export function SaVs({ settings }: { settings: S }) {
  const col = (k: 'gen' | 'ch') => ({ lbl: str(settings[`${k}Label`]), title: str(settings[`${k}Title`]), items: lines(str(settings[`${k}Items`])) });
  const gen = col('gen'), ch = col('ch');
  return (
    <div className="sl sl-vs"><style>{LAND_CSS + VS_CSS}</style>
      <div className="col gen"><span className="lbl">{gen.lbl}</span><h3>{gen.title}</h3><ul>{gen.items.map((x, i) => <li key={i}><Ico name="X" size={18} />{x}</li>)}</ul></div>
      <div className="col ch"><span className="lbl">{ch.lbl}</span><h3>{ch.title}</h3><ul>{ch.items.map((x, i) => <li key={i}><Ico name="Check" size={18} />{x}</li>)}</ul></div>
    </div>
  );
}

export function SaDoc({ settings }: { settings: S }) {
  return (
    <div className="sl sl-doc"><style>{LAND_CSS + DOC_CSS}</style>
      <div className="dh">{settings.avatar ? <img className="ava" src={str(settings.avatar)} alt="" /> : null}<b>{str(settings.title)}</b></div>
      <p className="dq">{str(settings.quote)}</p>
      <span className="sl-src"><Ico name="Link" size={14} />{str(settings.source)}</span>
      <div className="page">{str(settings.page).split(/(\*[^*]+\*)/).map((p, i) => (p.startsWith('*') && p.endsWith('*') ? <span key={i} className="hl">{p.slice(1, -1)}</span> : <Fragment key={i}>{p}</Fragment>))}</div>
    </div>
  );
}

export function SaFaq({ settings }: { settings: S }) {
  const items = (settings.items as { q?: string; a?: string }[]) || [];
  return (
    <div className="sl sl-faq"><style>{LAND_CSS + FAQ_CSS}</style>
      {items.map((it, i) => (
        <details key={i} open={i === num(settings.openIndex, 0)}><summary>{it.q}<span className="plus">+</span></summary><p>{it.a}</p></details>
      ))}
    </div>
  );
}

export function SaChips({ settings }: { settings: S }) {
  const items = (settings.items as { icon?: string; text?: string }[]) || [];
  const v = str(settings.variant, 'trust');
  return (
    <div className={`sl sl-chips ${v}`}><style>{LAND_CSS + CHIPS_CSS}</style>
      {items.map((it, i) => <span key={i}><Ico name={str(it.icon, 'Check')} size={v === 'pill' ? 17 : 18} />{it.text}</span>)}
    </div>
  );
}

/* varianti landing di sa-feature-card (richiamate da SaFeatureCard) */
export function SaLandCard({ settings }: { settings: S }) {
  const v = str(settings.variant);
  const tinted = !!settings.tint && str(settings.tint) !== 'none';
  const ic = <span className={`ic ${v}`}><Ico name={str(settings.icon, 'Search')} size={v === 'ben' ? 18 : 21} /></span>;
  let body: React.ReactNode;
  if (v === 'step') body = <><div className="n">{str(settings.num, '1')}</div><h3>{str(settings.title)}</h3><p>{str(settings.text)}</p></>;
  else if (v === 'ben') body = <>{ic}<div><h3>{str(settings.title)}</h3><p>{str(settings.text)}</p></div></>;
  else if (v === 'node') body = <><span className="loc">{str(settings.label)}</span><h3>{str(settings.title)}</h3><p>{str(settings.text)}</p></>;
  else if (v === 'mini') body = <>{ic}<div><h3>{str(settings.title)}</h3><p>{str(settings.text)}</p></div></>;
  else if (v === 'feat') body = <>{ic}<div><h3>{str(settings.title)}</h3><p>{str(settings.text)}</p></div></>;
  else body = <>{ic}<h3>{str(settings.title)}</h3><p>{str(settings.text)}</p></>;
  return <div className={`sl sl-card ${v}${settings.dark ? ' dark' : ''}${tinted ? ' tinted' : ''}`} style={{ flex: '1 1 auto', ...(tinted ? tintVars(settings.tint) : {}) }}><style>{LAND_CSS + LCARD_CSS}</style>{body}</div>;
}

const LAND_HERO_CSS = `
.sl-hero{position:relative;overflow:hidden;padding-block:72px;background:linear-gradient(180deg,#e3f0fc,#f4f1fd 55%,#fff 100%)}
.sl-hero::before{content:"";position:absolute;inset:-20% -10% auto auto;width:62%;height:120%;-webkit-mask-image:linear-gradient(90deg,transparent,#000 35%),linear-gradient(180deg,#000 70%,transparent);-webkit-mask-composite:source-in;mask-composite:intersect;mask-image:linear-gradient(90deg,transparent,#000 35%),linear-gradient(180deg,#000 70%,transparent);background:radial-gradient(closest-side at 70% 30%,rgba(0,120,212,.22),transparent),radial-gradient(closest-side at 88% 50%,rgba(91,99,199,.20),transparent);pointer-events:none}
.sl-hero-in{position:relative;max-width:1140px;margin-inline:auto;padding:66px 22px 58px;display:grid;grid-template-columns:1.04fr .96fr;gap:52px;align-items:center}
.sl-eyebrow{display:inline-flex;align-items:center;font-family:var(--disp);font-size:12.5px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--accent);background:var(--accent-soft);padding:6px 13px;border-radius:999px}
.sl-h1{font-size:clamp(32px,5vw,52px)!important;line-height:1.04!important;margin-top:20px!important;font-weight:800!important}
.sl-lead{font-size:clamp(16.5px,1.7vw,19.5px);color:var(--ink-2);margin-top:18px!important;max-width:40ch}
.sl-cta{display:flex;gap:13px;flex-wrap:wrap;margin-top:28px}
.sl-btn{display:inline-flex;align-items:center;gap:9px;font-family:var(--disp);font-weight:600;font-size:15px;border-radius:12px;padding:12px 20px;border:1.5px solid transparent;text-decoration:none}
.sl-btn.lg{padding:15px 26px;font-size:16.5px;border-radius:13px}
.sl-btn-p{background:var(--brand);color:#fff;box-shadow:0 1px 1px rgba(0,0,0,.04),0 8px 20px rgba(0,120,212,.28)}.sl-btn-p:hover{background:var(--brand-ink)}
.sl-btn-g{background:#fff;color:var(--brand-ink);border-color:#cfe2f5}.sl-btn-g:hover{background:var(--brand-soft2);border-color:var(--brand)}
.sl-chipsrow{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}
.sl-chipsrow span{display:inline-flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600;color:var(--brand-700);background:linear-gradient(135deg,#e6f2fd,#eceefb);border:1px solid #cfe2f5;border-radius:999px;padding:8px 14px}
.sl-chipsrow svg{color:var(--brand)}
.sl-reassure{display:flex;gap:7px 16px;flex-wrap:wrap;margin-top:18px;font-size:13.5px;color:var(--muted)}
.sl-reassure span{display:inline-flex;align-items:center;gap:7px}.sl-reassure svg{color:var(--ok)}
.sl-device{background:#fff;border:1px solid var(--line);border-radius:22px;box-shadow:var(--shadow-lg);overflow:hidden}
.sl-chrome{display:flex;align-items:center;gap:7px;padding:11px 14px;background:var(--bg-alt);border-bottom:1px solid var(--line)}
.sl-chrome i{width:9px;height:9px;border-radius:50%;background:#d7dce6}
.sl-addr{margin-left:8px;font-size:11.5px;color:var(--muted);background:#fff;border:1px solid var(--line);border-radius:7px;padding:3px 10px}
.sl-dbar{display:flex;align-items:center;gap:9px;padding:13px 16px 4px}
.sl-ava{width:30px;height:30px;object-fit:contain}
.sl-dbar b{font-size:14.5px;color:var(--ink);font-family:var(--disp)}
.sl-tag{margin-left:auto;font-size:11px;color:var(--accent);background:var(--accent-soft);border-radius:999px;padding:3px 10px;font-weight:600}
.sl-dbody{padding:10px 16px 16px;display:flex;flex-direction:column;gap:12px;min-height:292px}
.sl-q{align-self:flex-end;max-width:86%;background:var(--brand);color:#fff;padding:10px 14px;border-radius:14px 14px 4px 14px;font-size:14px;box-shadow:0 4px 12px rgba(0,120,212,.22)}
.sl-a{align-self:flex-start;max-width:97%;background:var(--bg-alt);border:1px solid var(--line);padding:12px 14px;border-radius:14px 14px 14px 4px;font-size:14px;color:var(--ink-2)}
.sl-cmp{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}
.sl-cmp th,.sl-cmp td{text-align:left;padding:8px 9px;border-bottom:1px solid var(--line)}
.sl-cmp tr:last-child td{border-bottom:0}
.sl-cmp th{font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);font-weight:700}
.sl-cmp td:first-child{color:var(--muted)}
.sl-pill{display:inline-flex;font-size:12px;font-weight:600;padding:2px 9px;border-radius:999px}.sl-pill.no{background:var(--warn-soft);color:var(--warn)}
.sl-src{display:inline-flex;align-items:center;gap:7px;margin-top:11px;font-size:12.5px;color:var(--accent);background:var(--accent-soft);padding:6px 11px;border-radius:9px;font-weight:600}
.sl-typing{display:inline-flex;gap:5px;align-self:flex-start;background:var(--bg-alt);border:1px solid var(--line);padding:13px 15px;border-radius:14px 14px 14px 4px}
.sl-typing span{width:7px;height:7px;border-radius:50%;background:var(--muted);opacity:.5;animation:sl-tb 1.1s infinite ease-in-out}
.sl-typing span:nth-child(2){animation-delay:.16s}.sl-typing span:nth-child(3){animation-delay:.32s}
@keyframes sl-tb{0%,65%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-5px);opacity:1}}
.sl-comp{display:flex;align-items:center;gap:9px;margin:2px 16px 16px;background:var(--bg-alt);border:1px solid var(--line);border-radius:13px;padding:8px 8px 8px 15px}
.sl-ct{flex:1;font-size:14px;color:var(--ink);min-height:21px;line-height:1.5}
.sl-ct.empty::before{content:"Scrivi a Charlie…";color:var(--muted)}
.sl-ct.caret::after{content:"";display:inline-block;width:2px;height:15px;background:var(--brand);margin-left:2px;vertical-align:-2px;animation:sl-ct 1s step-end infinite}
@keyframes sl-ct{50%{opacity:0}}
.sl-send{width:32px;height:32px;flex:none;border-radius:9px;background:#c7cdd8;color:#fff;display:grid;place-items:center}.sl-send.ready{background:var(--brand)}
@media (max-width:900px){.sl-hero{padding-block:52px}.sl-hero-in{grid-template-columns:1fr;gap:36px;padding-block:40px 34px}}
@media (prefers-reduced-motion:reduce){.sl-typing span{animation:none}.sl-comp{display:none}}
`;
const VS_CSS = `
.sl-vs{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:var(--shadow-s)}
.sl-vs .col{padding:26px 24px}.sl-vs .gen{background:var(--bg-alt)}.sl-vs .ch{background:linear-gradient(180deg,var(--brand-soft),#fff);border-left:1px solid var(--line)}
.sl-vs h3{font-size:16px!important}
.sl-vs .lbl{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:6px}
.sl-vs ul{list-style:none;padding:0;margin:14px 0 0;display:flex;flex-direction:column;gap:11px}
.sl-vs li{display:flex;gap:10px;font-size:14.5px;color:var(--ink-2)}.sl-vs li svg{flex:none;margin-top:1px}
.sl-vs .gen li svg{color:var(--muted)}.sl-vs .ch li svg{color:var(--ok)}
@media (max-width:700px){.sl-vs{grid-template-columns:1fr}.sl-vs .ch{border-left:0;border-top:1px solid var(--line)}}
`;
const DOC_CSS = `
.sl-doc{background:#fff;border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow);padding:20px}
.sl-doc .dh{display:flex;align-items:center;gap:9px;padding:4px 2px 12px;border-bottom:1px solid var(--line)}.sl-doc .ava{width:30px;height:30px;object-fit:contain}.sl-doc .dh b{font-family:var(--disp);font-size:14.5px;color:var(--ink)}
.sl-doc .dq{font-size:14.5px;margin:14px 0 10px;color:var(--ink-2)}
.sl-doc .sl-src{margin:0 0 12px}
.sl-doc .page{background:var(--bg-alt);border:1px solid var(--line);border-radius:12px;padding:15px;font-size:13.5px;color:var(--muted)}
.sl-doc .hl{background:rgba(0,120,212,.16);color:var(--ink);border-radius:4px;padding:0 3px;font-weight:600}
.sl-src{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;color:var(--accent);background:var(--accent-soft);padding:6px 11px;border-radius:9px;font-weight:600}
`;
const FAQ_CSS = `
.sl-faq{display:grid;gap:12px;max-width:820px}
.sl-faq details{background:#fff;border:1px solid var(--line);border-radius:14px;padding:4px 20px;box-shadow:var(--shadow-s)}.sl-faq details[open]{box-shadow:var(--shadow)}
.sl-faq summary{list-style:none;cursor:pointer;font-family:var(--disp);font-weight:600;font-size:16px;color:var(--ink);padding:16px 0;display:flex;align-items:center;gap:12px}
.sl-faq summary::-webkit-details-marker{display:none}
.sl-faq .plus{margin-left:auto;flex:none;width:22px;height:22px;border-radius:50%;background:var(--brand-soft);color:var(--brand-ink);display:grid;place-items:center;font-weight:700;transition:transform .2s}
.sl-faq details[open] .plus{transform:rotate(45deg)}
.sl-faq details p{color:var(--muted);font-size:14.5px;padding:0 0 18px;max-width:66ch}
`;
const CHIPS_CSS = `
.sl-chips{display:flex;gap:14px 34px;flex-wrap:wrap;align-items:center}
.sl-chips.trust{justify-content:center;font-size:13.5px;color:var(--ink-2);font-weight:600}.sl-chips.trust span{display:inline-flex;align-items:center;gap:9px}.sl-chips.trust svg{color:var(--brand)}
.sl-chips.pill{gap:12px}.sl-chips.pill span{display:inline-flex;align-items:center;gap:9px;border:1px solid var(--line);background:#fff;border-radius:12px;padding:11px 16px;font-size:14.5px;font-weight:600;color:var(--ink);box-shadow:var(--shadow-s)}.sl-chips.pill svg{color:var(--brand)}
`;
const LCARD_CSS = `
.sl-card h3{font-size:17.5px!important}.sl-card p{color:var(--muted);font-size:14.5px}
.sl-card.plain,.sl-card.step{background:#fff;border:1px solid var(--line);border-radius:18px;padding:24px;box-shadow:var(--shadow-s);transition:transform .15s,box-shadow .2s}
.sl-card.plain:hover{transform:translateY(-3px);box-shadow:var(--shadow)}
.sl-card.step{padding:26px 24px}
.sl-card .ic{flex:none;display:grid;place-items:center}
.sl-card.plain .ic{width:42px;height:42px;border-radius:12px;background:var(--brand-soft);color:var(--brand-ink)}
.sl-card.plain h3{margin-top:16px!important}.sl-card.plain p{margin-top:8px}
.sl-card.step .n{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,var(--brand),var(--accent));color:#fff;display:grid;place-items:center;font-family:var(--disp);font-weight:800;font-size:16px;box-shadow:0 6px 14px rgba(0,120,212,.3)}
.sl-card.step h3{font-size:18px!important;margin-top:16px!important}.sl-card.step p{margin-top:8px}
.sl-card.ben{display:flex;gap:13px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px}
.sl-card.ben .ic{width:34px;height:34px;border-radius:10px;background:var(--ok-soft);color:var(--ok)}.sl-card.ben h3{font-size:15.5px!important}.sl-card.ben p{font-size:13.8px;margin-top:4px}
.sl-card.node{background:#fff;border:1px solid var(--line);border-radius:18px;padding:22px;box-shadow:var(--shadow-s)}
.sl-card.node .loc{font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--accent)}.sl-card.node h3{font-size:16.5px!important;margin-top:9px!important}.sl-card.node p{font-size:14px;margin-top:7px}
.sl-card.node.dark{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28);box-shadow:none;backdrop-filter:blur(8px)}.sl-card.node.dark .loc{color:#9ad0ff}.sl-card.node.dark h3{color:#fff}.sl-card.node.dark p{color:rgba(255,255,255,.82)}
.sl-card.tinted .ic{background:var(--t);color:var(--c)}
.sl-card.tinted.step .n{background:var(--c);box-shadow:0 6px 14px -8px var(--c)}
.sl-card.mini{display:flex;gap:13px;align-items:flex-start;border-radius:16px;padding:16px 18px;background:#fff;border:1px solid var(--line);box-shadow:var(--shadow-s)}
.sl-card.mini .ic{width:38px;height:38px;border-radius:11px;background:var(--brand-soft);color:var(--brand-ink)}
.sl-card.mini h3{font-size:15.5px!important}.sl-card.mini p{font-size:13.5px;margin-top:3px}
.sl-card.ben.tinted,.sl-card.plain.tinted{box-shadow:var(--shadow-s)}
.sl-card.feat{display:flex;gap:14px;margin-top:6px}.sl-card.feat .ic{width:40px;height:40px;border-radius:11px;background:var(--brand-soft);color:var(--brand-ink)}.sl-card.feat h3{font-size:16.5px!important}.sl-card.feat p{margin-top:4px}
`;
