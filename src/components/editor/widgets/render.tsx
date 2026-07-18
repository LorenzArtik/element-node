'use client';

import * as LucideIcons from 'lucide-react';
import type { ElementNode } from '@/lib/widgets-schema';
import { Fragment, useEffect, useRef, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { useRenderContext } from '@/components/public/render-context';
import { InlineEditable } from './InlineEditable';

export interface RenderOpts {
  /** Se true, abilita edit inline su heading/text/button */
  editable?: boolean;
  /** Callback per applicare modifiche dirette ai settings */
  onUpdate?: (patch: Record<string, unknown>) => void;
}

// Type for lottie-player web component
declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        'lottie-player': React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement> & { src?: string; autoplay?: boolean; loop?: boolean; speed?: number; background?: string },
          HTMLElement
        >;
      }
    }
  }
}

export function renderWidget(el: ElementNode, opts: RenderOpts = {}): React.ReactNode {
  const inner = renderWidgetInner(el, opts);
  const s = el.settings as Record<string, unknown>;
  const styleObj = (s._style as Record<string, unknown>) ?? {};
  const hideOn = (s._hideOn as string[]) ?? [];
  const classes = (s._classes as string) ?? '';
  const htmlId = (s._htmlId as string) ?? '';
  const customCss = (s._css as string) ?? '';

  // No styling, no classes, no hide → return inner as-is to avoid extra wrapper noise
  if (!Object.keys(styleObj).length && !hideOn.length && !classes && !htmlId && !customCss) {
    return inner;
  }

  const wrapperStyle: React.CSSProperties = {
    margin: (styleObj.margin as string) || undefined,
    padding: (styleObj.padding as string) || undefined,
    background: (styleObj.background as string) || undefined,
    borderRadius: (styleObj.borderRadius as string) || undefined,
    border: (styleObj.border as string) || undefined,
    boxShadow: (styleObj.boxShadow as string) || undefined,
    opacity: styleObj.opacity != null ? Number(styleObj.opacity) : undefined,
    transform: (styleObj.transform as string) || undefined,
    transition: (styleObj.transition as string) || undefined,
    color: (styleObj.color as string) || undefined,
    overflow: classes.includes('overflow-') ? undefined : ((styleObj.overflow as string) || undefined),
    // layout del wrapper (es. display:inline-block per affiancare widget dentro una colonna)
    display: (styleObj.display as React.CSSProperties['display']) || undefined,
    verticalAlign: (styleObj.verticalAlign as React.CSSProperties['verticalAlign']) || undefined,
    width: (styleObj.width as string) || undefined,
    maxWidth: (styleObj.maxWidth as string) || undefined,
    // posizionamento (composizioni hero: chip flottanti su immagini, badge sovrapposti)
    position: (styleObj.position as React.CSSProperties['position']) || undefined,
    top: (styleObj.top as string) ?? undefined,
    left: (styleObj.left as string) ?? undefined,
    right: (styleObj.right as string) ?? undefined,
    bottom: (styleObj.bottom as string) ?? undefined,
    zIndex: styleObj.zIndex != null ? Number(styleObj.zIndex) : undefined,
    height: (styleObj.height as string) || undefined,
    minHeight: (styleObj.minHeight as string) || undefined,
  };

  const hideClasses = hideOn
    .map((d) => d === 'desktop' ? 'en-hide-desktop' : d === 'tablet' ? 'en-hide-tablet' : 'en-hide-mobile')
    .join(' ');
  const className = `en-w en-w-${el.type} ${hideClasses} ${classes}`.trim();

  return (
    <div id={htmlId || undefined} className={className} style={wrapperStyle} data-widget-type={el.type}>
      {inner}
      {customCss && htmlId && (
        <style dangerouslySetInnerHTML={{ __html: `#${htmlId} { ${customCss} }` }} />
      )}
    </div>
  );
}

/** Estrae uno style sub-elemento (`_styles[key]`) come CSSProperties applicabile. */
function subStyle(s: Record<string, unknown>, key: string): React.CSSProperties {
  const styles = (s._styles as Record<string, Record<string, unknown>>) ?? {};
  const v = styles[key] ?? {};
  const style: React.CSSProperties = {
    fontFamily: (v.fontFamily as string) || undefined,
    fontSize: (v.fontSize as string) || undefined,
    fontWeight: (v.fontWeight as React.CSSProperties['fontWeight']) || undefined,
    lineHeight: (v.lineHeight as string) || undefined,
    letterSpacing: (v.letterSpacing as string) || undefined,
    textTransform: (v.textTransform as React.CSSProperties['textTransform']) || undefined,
    textAlign: (v.textAlign as React.CSSProperties['textAlign']) || undefined,
    color: (v.color as string) || undefined,
    background: (v.background as string) || undefined,
    margin: (v.margin as string) || undefined,
    padding: (v.padding as string) || undefined,
    border: (v.border as string) || undefined,
    borderRadius: (v.borderRadius as string) || undefined,
    boxShadow: (v.boxShadow as string) || undefined,
    // Sizing/layout: permettono pattern come "icona in quadrato gradient" (width+height+background)
    width: (v.width as string) || undefined,
    height: (v.height as string) || undefined,
    minWidth: (v.minWidth as string) || undefined,
    minHeight: (v.minHeight as string) || undefined,
    maxWidth: (v.maxWidth as string) || undefined,
    display: (v.display as React.CSSProperties['display']) || undefined,
    alignItems: (v.alignItems as React.CSSProperties['alignItems']) || undefined,
    justifyContent: (v.justifyContent as React.CSSProperties['justifyContent']) || undefined,
    flexShrink: v.flexShrink != null ? Number(v.flexShrink) : undefined,
    gap: (v.gap as string) || undefined,
    objectFit: (v.objectFit as React.CSSProperties['objectFit']) || undefined,
    aspectRatio: (v.aspectRatio as string) || undefined,
    overflow: (v.overflow as string) || undefined,
  };
  // ⚠️ Le chiavi undefined vanno RIMOSSE: spargere {...base, ...subStyle} con
  // subStyle.display=undefined cancellerebbe base.display (React omette la prop).
  const out = style as Record<string, unknown>;
  for (const k of Object.keys(out)) {
    if (out[k] === undefined) delete out[k];
  }
  return style;
}

function renderWidgetInner(el: ElementNode, opts: RenderOpts = {}): React.ReactNode {
  const s = el.settings as Record<string, unknown>;
  const editable = !!opts.editable && !!opts.onUpdate;

  switch (el.type) {
    case 'heading': {
      const Tag = (s.tag as keyof React.JSX.IntrinsicElements) || 'h2';
      const style: React.CSSProperties = {
        color: (s.color as string) || undefined,
        textAlign: (s.align as 'left'|'center'|'right') || 'left',
        fontSize: (s.size as string) || undefined,
        fontWeight: (s.weight as string) || undefined,
        fontFamily: 'var(--en-font-heading)',
        margin: 0,
        lineHeight: (s.lineHeight as string) || 'var(--en-heading-line-height)',
        letterSpacing: (s.letterSpacing as string) || undefined,
        textTransform: s.transform && s.transform !== 'none' ? (s.transform as React.CSSProperties['textTransform']) : undefined,
      };
      if (s.textStroke) {
        (style as Record<string, unknown>).WebkitTextStroke = s.textStroke as string;
        style.color = (s.color as string) || 'transparent';
      }
      if (editable) {
        return (
          <InlineEditable
            tag={Tag}
            value={(s.text as string) || 'Titolo'}
            onChange={(v) => opts.onUpdate!({ text: v })}
            style={style}
          />
        );
      }
      return <Tag style={style}>{(s.text as string) || 'Titolo'}</Tag>;
    }

    case 'text': {
      const style: React.CSSProperties = {
        color: (s.color as string) || undefined,
        fontSize: (s.size as string) || undefined,
        lineHeight: (s.lineHeight as string) || undefined,
        fontFamily: 'var(--en-font-body)',
        textAlign: (s.align as 'left'|'center'|'right'|'justify') || 'left',
      };
      if (editable) {
        return (
          <InlineEditable
            tag="div"
            value={(s.html as string) || ''}
            onChange={(v) => opts.onUpdate!({ html: v })}
            html
            multiline
            style={style}
            placeholder="Inserisci il testo..."
          />
        );
      }
      return <div style={style} dangerouslySetInnerHTML={{ __html: (s.html as string) || '' }} />;
    }

    case 'button': {
      const styleMap: Record<string, React.CSSProperties> = {
        primary: { background: 'var(--en-color-primary, #92003b)', color: 'var(--en-color-text-inverse, #fff)', border: 'none' },
        secondary: { background: 'var(--en-color-secondary, #1f2937)', color: 'var(--en-color-text-inverse, #fff)', border: 'none' },
        outline: { background: 'transparent', color: 'var(--en-color-primary, #92003b)', border: '2px solid var(--en-color-primary, #92003b)' },
        ghost: { background: 'transparent', color: 'var(--en-color-primary, #92003b)', border: 'none' },
      };
      const sizeMap: Record<string, React.CSSProperties> = {
        sm: { padding: '6px 14px', fontSize: 'var(--en-size-sm, 13px)' },
        md: { padding: 'var(--en-button-py, 10px) var(--en-button-px, 20px)', fontSize: 'var(--en-size-md, 15px)' },
        lg: { padding: '14px 28px', fontSize: 'var(--en-size-lg, 17px)' },
      };
      // Override custom (facoltativi): vincono sui 4 stili predefiniti
      const radiusVal = (s.radius as string) || '';
      const bgVal = (s.bgColor as string) || '';
      const txtVal = (s.textColor as string) || '';
      const borderVal = (s.borderColor as string) || '';
      const padVal = (s.paddingCustom as string) || '';
      const shadowVal = (s.shadow as string) || '';
      const BtnIcon = s.btnIcon
        ? ((LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; fill?: string }>>)[(s.btnIcon as string)] ?? null)
        : null;
      const iconFilledBtn = s.btnIconStyle === 'fill';
      const iconRight = s.btnIconPosition === 'right';
      const btnStyle: React.CSSProperties = {
        display: BtnIcon ? (s.fullWidth ? 'flex' : 'inline-flex') : (s.fullWidth ? 'block' : 'inline-block'),
        ...(BtnIcon ? { alignItems: 'center', justifyContent: 'center', gap: (s.btnIconGap as number) ?? 10 } : {}),
        borderRadius: 'var(--en-button-radius, 8px)',
        fontWeight: 'var(--en-button-fw, 600)' as React.CSSProperties['fontWeight'],
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'all .2s',
        ...(styleMap[s.style as string] ?? styleMap.primary),
        ...(sizeMap[s.size as string] ?? sizeMap.md),
        ...(radiusVal && radiusVal !== '0' ? { borderRadius: radiusVal } : {}),
        ...(bgVal ? { background: bgVal } : {}),
        ...(txtVal ? { color: txtVal } : {}),
        ...(borderVal ? { border: `1px solid ${borderVal}` } : {}),
        ...(padVal ? { padding: padVal } : {}),
        ...(shadowVal && shadowVal !== 'none' ? { boxShadow: shadowVal } : {}),
      };
      const iconEl = BtnIcon ? (
        <BtnIcon
          size={(s.btnIconSize as number) || 18}
          strokeWidth={iconFilledBtn ? 0 : 2}
          fill={iconFilledBtn ? 'currentColor' : 'none'}
        />
      ) : null;
      if (editable) {
        return (
          <div style={{ textAlign: (s.align as 'left'|'center'|'right') || 'left' }}>
            <InlineEditable
              tag="span"
              value={(s.text as string) || 'Pulsante'}
              onChange={(v) => opts.onUpdate!({ text: v })}
              style={btnStyle}
            />
          </div>
        );
      }
      const btnLabel = BtnIcon && (s.text as string) === '' ? null : ((s.text as string) || 'Pulsante');
      return (
        <div style={{ textAlign: (s.align as 'left'|'center'|'right') || 'left' }}>
          <a href={(s.url as string) || '#'} target={(s.target as string) || '_self'} style={btnStyle}>
            {!iconRight && iconEl}
            {btnLabel}
            {iconRight && iconEl}
          </a>
        </div>
      );
    }

    case 'image': {
      if (!s.src) {
        return (
          <div style={{ background: '#f3f4f6', padding: '40px', textAlign: 'center', color: '#9ca3af', borderRadius: 8 }}>
            🖼️ Nessuna immagine
          </div>
        );
      }
      const align = (s.align as 'left'|'center'|'right') || 'center';
      const hoverEffect = (s.hoverEffect as string) || 'none';
      const hoverClass = hoverEffect !== 'none' ? `en-img-hover-${hoverEffect}` : '';
      const aspectRatioVal = (s.aspectRatio as string) || '';
      const objectFitVal = (s.objectFit as string) || '';
      const objectPositionVal = (s.objectPosition as string) || '';
      const borderRadiusVal = (s.borderRadius as string) || '';
      const imgStyle: React.CSSProperties = {
        width: (s.width as string) || 'auto',
        height: (s.height as string) || 'auto',
        maxWidth: (s.maxWidth as string) || '100%',
        maxHeight: (s.maxHeight as string) || undefined,
        objectFit: (objectFitVal && objectFitVal !== 'auto') ? (objectFitVal as React.CSSProperties['objectFit']) : undefined,
        aspectRatio: (aspectRatioVal && aspectRatioVal !== 'auto') ? aspectRatioVal : undefined,
        borderRadius: (borderRadiusVal && borderRadiusVal !== '0') ? borderRadiusVal : undefined,
        boxShadow: (s.boxShadow as string) && s.boxShadow !== 'none' ? (s.boxShadow as string) : undefined,
        display: align === 'center' ? 'inline-block' : 'inline',
        transition: hoverEffect !== 'none' ? 'transform .3s ease, box-shadow .3s ease, filter .3s ease, opacity .3s ease' : undefined,
      };
      const imgEl = (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={s.src as string}
            alt={(s.alt as string) || ''}
            className={hoverClass || undefined}
            style={imgStyle}
          />
          {s.caption ? <figcaption style={{ fontSize: 13, color: '#6b7280', marginTop: 8 }}>{s.caption as string}</figcaption> : null}
        </>
      );
      return (
        <figure style={{ margin: 0, textAlign: align }}>
          {s.link ? <a href={s.link as string} style={{ display: 'inline-block' }}>{imgEl}</a> : imgEl}
        </figure>
      );
    }

    case 'video': {
      if (!s.src) return <div style={{ aspectRatio: '16/9', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>📹 Inserisci URL</div>;
      const url = s.src as string;
      const type = (s.type as string) || 'youtube';
      if (type === 'youtube') {
        const id = url.match(/(?:youtu\.be\/|v=)([^&]+)/)?.[1] ?? url;
        return (
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
            <iframe
              src={`https://www.youtube.com/embed/${id}?autoplay=${s.autoplay ? 1 : 0}&loop=${s.loop ? 1 : 0}&controls=${s.controls === false ? 0 : 1}`}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          </div>
        );
      }
      if (type === 'vimeo') {
        const id = url.match(/vimeo\.com\/(\d+)/)?.[1] ?? url;
        return (
          <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
            <iframe src={`https://player.vimeo.com/video/${id}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} allowFullScreen />
          </div>
        );
      }
      return (
        <video src={url} controls={!!s.controls} autoPlay={!!s.autoplay} loop={!!s.loop} style={{ width: '100%', borderRadius: 8 }} />
      );
    }

    case 'spacer':
      return <div style={{ height: `${s.height ?? 50}px` }} />;

    case 'divider':
      return (
        <hr
          style={{
            border: 0,
            borderTop: `${s.weight ?? 1}px ${(s.style as string) || 'solid'} ${(s.color as string) || '#e2e8f0'}`,
            margin: '20px 0',
          }}
        />
      );

    case 'icon-box': {
      const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number; fill?: string }>>)[(s.icon as string) || 'Star'] ?? LucideIcons.Star;
      const cardStyle = subStyle(s, 'card');
      const iconStyle = subStyle(s, 'icon');
      const titleStyle = subStyle(s, 'title');
      const textStyle = subStyle(s, 'text');
      const iconFilled = s.iconStyle === 'fill';
      // Frame interno: _styles.icon si applica QUI (non al wrapper full-width) → con
      // width/height/background/borderRadius produce il pattern "icona in quadrato/cerchio".
      // Senza _styles.icon il frame è trasparente e il rendering è identico al legacy.
      return (
        <div style={{ textAlign: (s.align as 'left'|'center'|'right') || 'center', padding: '20px 0', ...cardStyle }}>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: (s.align === 'left' ? 'flex-start' : s.align === 'right' ? 'flex-end' : 'center') }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...iconStyle, color: (iconStyle.color as string) || (s.iconColor as string) || undefined }}>
              {s.customSvg ? (
                <span style={{ display: 'inline-flex' }} dangerouslySetInnerHTML={{ __html: s.customSvg as string }} />
              ) : (
                <Icon
                  size={(s.iconSize as number) || 48}
                  color={(iconStyle.color as string) || (s.iconColor as string) || 'var(--en-color-primary, #92003b)'}
                  strokeWidth={iconFilled ? 0 : 1.8}
                  fill={iconFilled ? ((iconStyle.color as string) || (s.iconColor as string) || 'currentColor') : 'none'}
                />
              )}
            </span>
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', fontWeight: 700, ...titleStyle }}>{(s.title as string) || 'Titolo'}</h3>
          <p style={{ margin: 0, color: '#64748b', lineHeight: 1.6, ...textStyle }} dangerouslySetInnerHTML={{ __html: (s.text as string) || '' }} />
        </div>
      );
    }

    case 'image-box': {
      const align = (s.align as 'left'|'center'|'right') || 'center';
      const cardSt = subStyle(s, 'card');
      const imageSt = subStyle(s, 'image');
      const titleSt = subStyle(s, 'title');
      const textSt = subStyle(s, 'text');
      const ctaSt = subStyle(s, 'cta');
      const ctaIconSt = subStyle(s, 'ctaIcon');
      const ratioVal = (s.imageRatio as string) || '';
      const radiusVal = (s.imageRadius as string) || '';
      const CtaIco = s.ctaText
        ? ((LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>>)[(s.ctaIcon as string) || 'ChevronRight'] ?? LucideIcons.ChevronRight)
        : null;
      const imgBase: React.CSSProperties = {
        width: '100%',
        borderRadius: radiusVal && radiusVal !== '0' ? radiusVal : 8,
        marginBottom: 12,
        ...(ratioVal && ratioVal !== 'auto' ? { aspectRatio: ratioVal, objectFit: 'cover' as const } : {}),
        ...imageSt,
      };
      const inner = (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', ...cardSt }}>
          {s.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.image as string} alt={(s.title as string) || ''} style={imgBase} />
          ) : (
            <div style={{ aspectRatio: ratioVal && ratioVal !== 'auto' ? ratioVal : '16/9', background: '#f3f4f6', borderRadius: radiusVal && radiusVal !== '0' ? radiusVal : 8, marginBottom: 12 }} />
          )}
          <h3 style={{ margin: '0 0 6px', fontSize: '1.15rem', fontWeight: 700, textAlign: align, ...titleSt }}>{(s.title as string) || ''}</h3>
          <p style={{ margin: 0, color: '#64748b', textAlign: align, flex: s.ctaText ? 1 : undefined, ...textSt }}>{(s.text as string) || ''}</p>
          {s.ctaText ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginTop: 16, fontWeight: 600, color: 'inherit', justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start', ...ctaSt }}>
              {CtaIco ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...ctaIconSt }}>
                  <CtaIco size={(s.ctaIconSize as number) || 16} strokeWidth={2.5} />
                </span>
              ) : null}
              {s.ctaText as string}
            </span>
          ) : null}
        </div>
      );
      return s.link ? <a href={s.link as string} style={{ color: 'inherit', textDecoration: 'none', display: 'block', height: '100%' }}>{inner}</a> : inner;
    }

    case 'testimonial': {
      const rating = (s.rating as number) || 0;
      const cardSt = subStyle(s, 'card');
      const ratingSt = subStyle(s, 'rating');
      const textSt = subStyle(s, 'text');
      const authorSt = subStyle(s, 'author');
      const roleSt = subStyle(s, 'role');
      const avatarSt = subStyle(s, 'avatar');
      return (
        <div style={{ padding: 24, border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff', ...cardSt }}>
          {rating > 0 && (
            <div style={{ marginBottom: 12, ...ratingSt }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} style={{ color: i < rating ? (ratingSt.color as string || '#fbbf24') : '#e5e7eb' }}>★</span>
              ))}
            </div>
          )}
          <p style={{ fontSize: '1.05rem', fontStyle: 'italic', margin: '0 0 16px', color: '#1f2937', ...textSt }}>&quot;{(s.text as string) || ''}&quot;</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {s.avatar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.avatar as string} alt="" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', ...avatarSt }} />
            )}
            <div>
              <div style={{ fontWeight: 700, ...authorSt }}>{(s.author as string) || ''}</div>
              <div style={{ fontSize: 13, color: '#6b7280', ...roleSt }}>{(s.role as string) || ''}</div>
            </div>
          </div>
        </div>
      );
    }

    case 'tabs':
      return <TabsWidget items={(s.items as { title: string; content: string }[]) || []} align={(s.align as string) || 'left'} />;

    case 'accordion':
      return <AccordionWidget items={(s.items as { title: string; content: string }[]) || []} settings={s} />;

    case 'counter':
      return <CounterWidget settings={s} />;

    case 'progress':
      return <ProgressWidget settings={s} />;

    case 'box': {
      // Contenitore annidato: figli renderizzati ricorsivamente (non editabili inline nel canvas;
      // si modificano dal pannello proprietà del box).
      const children = (s.children as ElementNode[]) || [];
      const boxStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: (s.direction as string) === 'row' ? 'row' : 'column',
        gap: s.gap != null ? (typeof s.gap === 'number' ? `${s.gap}px` : String(s.gap)) : '12px',
        alignItems: (s.align as React.CSSProperties['alignItems']) || 'stretch',
        justifyContent: (s.justify as React.CSSProperties['justifyContent']) || 'flex-start',
        flexWrap: (s.direction as string) === 'row' && s.wrap !== false ? 'wrap' : undefined,
        background: (s.background as string) || undefined,
        borderRadius: (s.borderRadius as string) && s.borderRadius !== '0' ? (s.borderRadius as string) : undefined,
        padding: (s.padding as string) || undefined,
        border: (s.border as string) || undefined,
        boxShadow: (s.boxShadow as string) && s.boxShadow !== 'none' ? (s.boxShadow as string) : undefined,
        minHeight: (s.minHeight as string) || undefined,
        ...(s.sticky ? { position: 'sticky' as const, top: (s.stickyTop as string) || '96px' } : {}),
      };
      return (
        <div style={boxStyle} data-box-container>
          {children.map((child) => (
            <div key={child.id} style={{ minWidth: 0, flex: (child.settings as Record<string, unknown>)?._flex != null && (child.settings as Record<string, unknown>)._flex !== '' ? String((child.settings as Record<string, unknown>)._flex) : s.childrenFlex != null && s.childrenFlex !== '' ? String(s.childrenFlex) : undefined }}>{renderWidget(child)}</div>
          ))}
        </div>
      );
    }

    case 'html':
      return <div dangerouslySetInnerHTML={{ __html: (s.code as string) || '' }} />;

    case 'contact-form':
      return <ContactForm settings={s} />;

    case 'posts-grid':
      return <PostsGrid settings={s} />;

    case 'gallery':
      return <Gallery settings={s} />;

    case 'icon': {
      const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>>)[(s.icon as string) || 'Star'] ?? LucideIcons.Star;
      const align = (s.align as 'left'|'center'|'right') || 'center';
      const inner = (
        <span style={{ display: 'inline-flex' }}>
          <Icon size={(s.size as number) || 64} color={(s.color as string) || '#92003b'} strokeWidth={1.8} />
        </span>
      );
      return (
        <div style={{ textAlign: align }}>
          {s.link ? <a href={s.link as string} style={{ color: 'inherit' }}>{inner}</a> : inner}
        </div>
      );
    }

    case 'icon-list': {
      const items = (s.items as { icon: string; text: string; link: string }[]) || [];
      const align = (s.align as 'left'|'center'|'right') || 'left';
      const spacing = (s.spacing as number) ?? 12;
      const iconColor = (s.iconColor as string) || '#92003b';
      return (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, textAlign: align, color: (s.textColor as string) || undefined, fontSize: (s.textSize as string) || undefined, ...(s.direction === 'row' ? { display: 'flex', flexWrap: 'wrap' as const, gap: spacing, alignItems: 'center', justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start' } : {}) }}>
          {items.map((it, i) => {
            const Ico = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string }>>)[it.icon || 'Check'] ?? LucideIcons.Check;
            const inner = (
              <span style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 10 }}>
                <Ico size={Number(s.iconSize ?? 20)} color={iconColor} />
                {/<[a-z]/i.test(it.text) ? <span dangerouslySetInnerHTML={{ __html: it.text }} /> : <span>{it.text}</span>}
              </span>
            );
            return (
              <li key={i} style={{ marginBottom: s.direction === 'row' ? 0 : i < items.length - 1 ? spacing : 0 }}>
                {it.link ? <a href={it.link} style={{ color: 'inherit', textDecoration: 'none' }}>{inner}</a> : inner}
              </li>
            );
          })}
        </ul>
      );
    }

    case 'toggle':
      return <ToggleWidget items={(s.items as { title: string; content: string }[]) || []} />;

    case 'alert': {
      const variants: Record<string, { bg: string; border: string; color: string; iconName: string }> = {
        info: { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af', iconName: 'Info' },
        success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#166534', iconName: 'CheckCircle' },
        warning: { bg: '#fffbeb', border: '#fde68a', color: '#92400e', iconName: 'AlertTriangle' },
        danger: { bg: '#fef2f2', border: '#fecaca', color: '#991b1b', iconName: 'XCircle' },
      };
      const v = variants[(s.variant as string) || 'info'];
      const Ico = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string }>>)[v.iconName] ?? LucideIcons.Info;
      return (
        <div style={{ background: v.bg, border: `1px solid ${v.border}`, borderRadius: 8, padding: '14px 16px', color: v.color, display: 'flex', gap: 12 }}>
          <Ico size={20} color={v.color} />
          <div style={{ flex: 1 }}>
            {s.title && <div style={{ fontWeight: 700, marginBottom: 4 }}>{s.title as string}</div>}
            {s.text && <div style={{ fontSize: 14 }}>{s.text as string}</div>}
          </div>
        </div>
      );
    }

    case 'marquee': {
      const items = String(s.items || '').split('·').map((t) => t.trim()).filter(Boolean);
      const sep = (s.separator as string) || '●';
      const gap = Number(s.gap ?? 56);
      const trackStyle: React.CSSProperties = {
        display: 'flex', gap, whiteSpace: 'nowrap', width: 'max-content',
        animation: `en-marquee ${Number(s.speed ?? 28)}s linear infinite`,
      };
      const textStyle: React.CSSProperties = {
        fontFamily: 'var(--en-font-heading)', fontWeight: 700,
        fontSize: (s.fontSize as string) || '20px',
        letterSpacing: (s.letterSpacing as string) || '0.06em',
        textTransform: s.uppercase === false ? undefined : 'uppercase',
        color: (s.textColor as string) || undefined,
        display: 'flex', alignItems: 'center', gap,
      };
      if (s.textStroke) {
        (textStyle as Record<string, unknown>).WebkitTextStroke = s.textStroke as string;
        textStyle.color = 'transparent';
      }
      const sepStyle: React.CSSProperties = { color: (s.separatorColor as string) || 'var(--en-color-primary)', WebkitTextStroke: '0', fontSize: '12px' };
      const seq = (
        <span style={textStyle}>
          {items.map((t, i) => (
            <Fragment key={i}>{t}<i style={{ ...sepStyle, fontStyle: 'normal' }}>{sep}</i></Fragment>
          ))}
        </span>
      );
      return (
        <div style={{ overflow: 'hidden' }}>
          <style>{'@keyframes en-marquee { to { transform: translateX(-50%); } }'}</style>
          <div style={trackStyle}>{seq}{seq}</div>
        </div>
      );
    }
    case 'social-icons':
      return <SocialIcons settings={s} />;

    case 'hero': return <HeroWidget settings={s} />;
    case 'hero-slider': return <HeroSlider settings={s} />;
    case 'animated-headline': return <AnimatedHeadline settings={s} />;
    case 'image-carousel': return <ImageCarousel settings={s} />;
    case 'testimonial-carousel': return <TestimonialCarousel settings={s} />;
    case 'flip-box': return <FlipBox settings={s} />;
    case 'share-buttons': return <ShareButtons settings={s} />;
    case 'reviews': return <Reviews settings={s} />;
    case 'lottie': return <LottieWidget settings={s} />;
    case 'mailchimp': return <MailchimpWidget settings={s} />;

    case 'countdown':
      return <Countdown settings={s} />;

    case 'price-table':
      return <PriceTable settings={s} />;

    case 'post-content': return <PostContentWidget settings={s} />;
    case 'post-excerpt': return <PostExcerptWidget settings={s} />;
    case 'featured-image': return <FeaturedImageWidget settings={s} />;
    case 'post-meta': return <PostMetaWidget settings={s} />;
    case 'author-box': return <AuthorBoxWidget settings={s} />;
    case 'posts-list': return <PostsListWidget settings={s} />;

    case 'site-logo': return <SiteLogoWidget settings={s} />;
    case 'site-title': return <SiteTitleWidget settings={s} />;
    case 'nav-menu': return <NavMenuWidget settings={s} />;
    case 'search-form': return <SearchFormWidget settings={s} />;
    case 'page-title': return <PageTitleWidget settings={s} />;
    case 'breadcrumbs': return <BreadcrumbsWidget settings={s} />;

    case 'call-to-action': {
      const align = (s.align as 'left'|'center'|'right') || 'center';
      return (
        <div style={{ background: (s.background as string) || 'var(--en-color-primary, #92003b)', color: (s.color as string) || 'var(--en-color-text-inverse, #fff)', padding: '60px 40px', borderRadius: 'var(--en-radius-lg, 12px)', textAlign: align }}>
          <h2 style={{ margin: '0 0 12px', fontSize: '2.25rem', fontWeight: 800, lineHeight: 1.1 }}>{(s.title as string) || ''}</h2>
          {s.text && <p style={{ margin: '0 auto 24px', maxWidth: 600, fontSize: '1.125rem', opacity: 0.9 }}>{s.text as string}</p>}
          {s.ctaText && (
            <a href={(s.ctaUrl as string) || '#'} style={{
              display: 'inline-block', padding: 'var(--en-button-py, 14px) 32px', background: 'var(--en-color-bg, #fff)', color: 'var(--en-color-text, #0f172a)',
              borderRadius: 'var(--en-button-radius, 8px)', textDecoration: 'none', fontWeight: 'var(--en-button-fw, 700)' as React.CSSProperties['fontWeight'], fontSize: '1rem',
            }}>{s.ctaText as string}</a>
          )}
        </div>
      );
    }

    default:
      return <div style={{ padding: 12, background: '#fee', color: '#900' }}>Widget sconosciuto: {el.type}</div>;
  }
}

function HeroWidget({ settings }: { settings: Record<string, unknown> }) {
  const bgType = (settings.bgType as string) || 'gradient';
  const align = (settings.align as 'left'|'center'|'right') || 'center';
  const justify = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
  const textAlign = align;

  let bgStyle: React.CSSProperties = {};
  if (bgType === 'image' && settings.bgImage) {
    bgStyle = { background: `url(${settings.bgImage}) center/cover` };
  } else if (bgType === 'gradient') {
    bgStyle = { background: (settings.bgGradient as string) || 'linear-gradient(135deg, #92003b, #1f2937)' };
  } else if (bgType === 'color') {
    bgStyle = { background: (settings.bgGradient as string) || '#92003b' };
  }

  return (
    <div style={{
      position: 'relative', minHeight: (settings.height as string) || '600px',
      display: 'flex', alignItems: 'center', justifyContent: justify,
      overflow: 'hidden', borderRadius: 'var(--en-radius-md, 8px)',
      ...bgStyle,
    }}>
      {bgType === 'video' && settings.bgVideo && (
        <video
          autoPlay muted loop playsInline
          src={settings.bgVideo as string}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
        />
      )}
      <div style={{ position: 'absolute', inset: 0, background: (settings.bgOverlay as string) || 'rgba(0,0,0,0.4)', zIndex: 1 }} />
      <div style={{
        position: 'relative', zIndex: 2, padding: '60px 32px',
        textAlign, color: (settings.titleColor as string) || '#fff',
        maxWidth: 800, width: '100%',
      }}>
        <h1
          style={{
            fontSize: (settings.titleSize as string) || '64px',
            fontWeight: 800, lineHeight: 1.1, margin: '0 0 20px',
            color: (settings.titleColor as string) || '#fff',
          }}
          dangerouslySetInnerHTML={{ __html: (settings.title as string) || 'Hero Title' }}
        />
        {settings.subtitle && (
          <p style={{
            fontSize: '1.25rem', lineHeight: 1.5, margin: '0 0 32px',
            color: (settings.subtitleColor as string) || 'rgba(255,255,255,0.85)',
            maxWidth: 600, marginLeft: align === 'center' ? 'auto' : 0, marginRight: align === 'center' ? 'auto' : 0,
          }}>
            {settings.subtitle as string}
          </p>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: justify, flexWrap: 'wrap' }}>
          {settings.ctaText && (
            <a href={(settings.ctaUrl as string) || '#'} style={{
              padding: '14px 28px', background: 'var(--en-color-primary, #92003b)', color: '#fff',
              borderRadius: 'var(--en-button-radius, 8px)', textDecoration: 'none', fontWeight: 700,
            }}>{settings.ctaText as string}</a>
          )}
          {settings.ctaSecondaryText && (
            <a href={(settings.ctaSecondaryUrl as string) || '#'} style={{
              padding: '14px 28px', background: 'transparent', color: '#fff',
              border: '2px solid rgba(255,255,255,0.6)', borderRadius: 'var(--en-button-radius, 8px)',
              textDecoration: 'none', fontWeight: 700,
            }}>{settings.ctaSecondaryText as string}</a>
          )}
        </div>
      </div>
    </div>
  );
}

function HeroSlider({ settings }: { settings: Record<string, unknown> }) {
  const slides = (settings.slides as { title: string; subtitle: string; ctaText: string; ctaUrl: string; bgImage: string; bgGradient: string; bgOverlay: string }[]) || [];
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selected, setSelected] = useState(0);
  const align = (settings.align as 'left'|'center'|'right') || 'center';
  const justify = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    onSelect();
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi || !settings.autoplay) return;
    const id = setInterval(() => emblaApi.scrollNext(), (settings.autoplayMs as number) || 5000);
    return () => clearInterval(id);
  }, [emblaApi, settings.autoplay, settings.autoplayMs]);

  if (slides.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--en-color-text-muted)', background: 'var(--en-color-surface)' }}>Aggiungi slide al hero slider</div>;
  }

  return (
    <div style={{ position: 'relative', height: (settings.height as string) || '600px', borderRadius: 'var(--en-radius-md, 8px)', overflow: 'hidden' }}>
      <div ref={emblaRef} style={{ overflow: 'hidden', height: '100%' }}>
        <div style={{ display: 'flex', height: '100%' }}>
          {slides.map((sl, i) => (
            <div key={i} style={{ flex: '0 0 100%', minWidth: 0, position: 'relative', height: '100%' }}>
              <div style={{
                position: 'absolute', inset: 0,
                background: sl.bgImage ? `url(${sl.bgImage}) center/cover` : (sl.bgGradient || 'linear-gradient(135deg, #92003b, #1f2937)'),
              }} />
              <div style={{ position: 'absolute', inset: 0, background: sl.bgOverlay || 'rgba(0,0,0,0.4)' }} />
              <div style={{
                position: 'relative', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: justify,
                padding: '60px 32px', color: '#fff', textAlign: align,
              }}>
                <div style={{ maxWidth: 800 }}>
                  <h1 style={{ fontSize: '56px', fontWeight: 800, lineHeight: 1.1, margin: '0 0 16px' }}>{sl.title}</h1>
                  {sl.subtitle && <p style={{ fontSize: '1.15rem', margin: '0 0 24px', opacity: 0.9 }}>{sl.subtitle}</p>}
                  {sl.ctaText && (
                    <a href={sl.ctaUrl || '#'} style={{
                      padding: '14px 28px', background: 'var(--en-color-primary, #92003b)', color: '#fff',
                      borderRadius: 'var(--en-button-radius, 8px)', textDecoration: 'none', fontWeight: 700,
                    }}>{sl.ctaText}</a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {(settings.showArrows as boolean) && slides.length > 1 && (
        <>
          <button onClick={() => emblaApi?.scrollPrev()} aria-label="Precedente" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none', fontSize: 22, cursor: 'pointer' }}>‹</button>
          <button onClick={() => emblaApi?.scrollNext()} aria-label="Successivo" style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', color: '#fff', border: 'none', fontSize: 22, cursor: 'pointer' }}>›</button>
        </>
      )}
      {(settings.showDots as boolean) && slides.length > 1 && (
        <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8 }}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => emblaApi?.scrollTo(i)} aria-label={`Slide ${i+1}`} style={{
              width: i === selected ? 24 : 8, height: 8, borderRadius: 999, background: '#fff',
              opacity: i === selected ? 1 : 0.5, border: 'none', transition: 'all .25s', cursor: 'pointer',
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

function AnimatedHeadline({ settings }: { settings: Record<string, unknown> }) {
  const words = ((settings.animated as { value: string }[]) || []).map((w) => (typeof w === 'string' ? w : w.value)).filter(Boolean);
  const [idx, setIdx] = useState(0);
  const animation = (settings.animation as string) || 'rotate';
  const duration = (settings.durationMs as number) || 2200;
  useEffect(() => {
    if (words.length <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % words.length), duration);
    return () => clearInterval(id);
  }, [words.length, duration]);
  const Tag = (settings.tag as keyof React.JSX.IntrinsicElements) || 'h2';
  const animStyle: React.CSSProperties = animation === 'fade' ? { animation: 'enFade .5s ease' }
    : animation === 'slide-up' ? { display: 'inline-block', animation: 'enSlideUp .4s ease' }
    : animation === 'typing' ? { borderRight: '2px solid currentColor', animation: 'enBlink 1s step-end infinite' }
    : { display: 'inline-block', animation: 'enRotate .5s ease' };
  return (
    <>
      <Tag style={{
        fontSize: (settings.size as string) || '48px',
        fontWeight: (settings.weight as string) || '800',
        color: (settings.color as string) || 'var(--en-color-text)',
        textAlign: (settings.align as 'left'|'center'|'right') || 'center',
        margin: 0, lineHeight: 1.2,
      }}>
        {(settings.before as string) || ''}{' '}
        <span key={idx} style={{ color: (settings.animatedColor as string) || 'var(--en-color-primary)', ...animStyle }}>
          {words[idx] ?? ''}
        </span>{' '}
        {(settings.after as string) || ''}
      </Tag>
      <style>{`
        @keyframes enFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes enSlideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes enRotate { from { opacity: 0; transform: rotateX(90deg) } to { opacity: 1; transform: rotateX(0) } }
        @keyframes enBlink { 50% { border-color: transparent } }
      `}</style>
    </>
  );
}

function ImageCarousel({ settings }: { settings: Record<string, unknown> }) {
  return <EmblaCarousel
    items={(settings.images as { src: string; alt: string; link?: string }[]) || []}
    slidesPerView={(settings.slidesPerView as number) || 3}
    gap={(settings.gap as number) || 16}
    autoplay={!!settings.autoplay}
    autoplayMs={(settings.autoplayMs as number) || 4000}
    loop={!!settings.loop}
    showArrows={!!settings.showArrows}
    showDots={!!settings.showDots}
    renderItem={(it) => {
      const ratio = (settings.ratio as string) || '4/3';
      const img = (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={it.src || ''} alt={it.alt || ''} style={{ width: '100%', aspectRatio: ratio, objectFit: 'cover', borderRadius: 'var(--en-radius-md, 8px)' }} />
      );
      return it.link ? <a href={it.link}>{img}</a> : img;
    }}
  />;
}

function TestimonialCarousel({ settings }: { settings: Record<string, unknown> }) {
  return <EmblaCarousel
    items={(settings.items as { text: string; author: string; role: string; avatar: string; rating: number }[]) || []}
    slidesPerView={(settings.slidesPerView as number) || 1}
    gap={24}
    autoplay={!!settings.autoplay}
    autoplayMs={(settings.autoplayMs as number) || 5000}
    loop={true}
    showArrows={!!settings.showArrows}
    showDots={!!settings.showDots}
    renderItem={(it) => (
      <div style={{ padding: '36px 40px', border: '1px solid var(--en-color-border)', borderRadius: 16, background: 'var(--en-color-bg)' }}>
        {(it.rating ?? 0) > 0 && (
          <div style={{ marginBottom: 12 }}>
            {Array.from({ length: 5 }).map((_, i) => <span key={i} style={{ color: i < (it.rating ?? 0) ? '#fbbf24' : '#e5e7eb' }}>★</span>)}
          </div>
        )}
        <div aria-hidden style={{ color: '#D99114', fontSize: 26, fontWeight: 800, fontStyle: 'italic', lineHeight: 1, marginBottom: 14, fontFamily: 'Georgia, serif' }}>&rdquo;</div>
        <p style={{ fontSize: 19, fontWeight: 500, color: '#242424', lineHeight: 1.65, margin: '0 0 22px' }}>{it.text}</p>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {it.avatar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={it.avatar} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
          )}
          <div style={{ fontSize: 15, color: 'var(--en-color-text-muted, #6b7280)' }}>
            {it.author}{it.role ? ` — ${it.role}` : ''}
          </div>
        </div>
      </div>
    )}
  />;
}

function FlipBox({ settings }: { settings: Record<string, unknown> }) {
  const front = ((settings.front as { title: string; text: string; icon: string; background: string; color: string }[])?.[0]) ?? null;
  const back = ((settings.back as { title: string; text: string; ctaText: string; ctaUrl: string; background: string; color: string }[])?.[0]) ?? null;
  const f = front ?? { title: 'Fronte', text: '', icon: 'Sparkles', background: '#92003b', color: '#fff' };
  const b = back ?? { title: 'Retro', text: '', ctaText: '', ctaUrl: '', background: '#1f2937', color: '#fff' };
  const direction = (settings.direction as string) || 'horizontal';
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string }>>)[f.icon || 'Sparkles'] ?? LucideIcons.Sparkles;
  return (
    <div className="en-flipbox" style={{ perspective: 1200, height: (settings.height as string) || '320px' }}>
      <div className="en-flipbox-inner" style={{
        position: 'relative', width: '100%', height: '100%',
        transition: 'transform .6s', transformStyle: 'preserve-3d',
      }}>
        <Face style={{ background: f.background, color: f.color }}>
          <Icon size={48} color={f.color} />
          <h3 style={{ margin: '16px 0 8px', fontSize: '1.5rem' }}>{f.title}</h3>
          <p style={{ margin: 0, opacity: 0.85 }}>{f.text}</p>
        </Face>
        <Face style={{
          background: b.background, color: b.color,
          transform: direction === 'vertical' ? 'rotateX(180deg)' : 'rotateY(180deg)',
        }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '1.5rem' }}>{b.title}</h3>
          <p style={{ margin: '0 0 16px', opacity: 0.85 }}>{b.text}</p>
          {b.ctaText && (
            <a href={b.ctaUrl || '#'} style={{
              padding: '10px 20px', background: '#fff', color: b.background, borderRadius: 'var(--en-button-radius)',
              textDecoration: 'none', fontWeight: 700,
            }}>{b.ctaText}</a>
          )}
        </Face>
      </div>
      <style>{`
        .en-flipbox:hover .en-flipbox-inner { transform: ${direction === 'vertical' ? 'rotateX(180deg)' : 'rotateY(180deg)'}; }
      `}</style>
    </div>
  );
}

function Face({ children, style }: { children: React.ReactNode; style: React.CSSProperties }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, padding: 32,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      borderRadius: 'var(--en-radius-lg, 12px)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
      ...style,
    }}>{children}</div>
  );
}

function ShareButtons({ settings }: { settings: Record<string, unknown> }) {
  const networks = (settings.networks as { value: string }[] | string[])?.map((n) => typeof n === 'string' ? n : n.value) ?? [];
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const map: Record<string, { label: string; href: string; bg: string }> = {
    facebook: { label: 'F', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, bg: '#1877f2' },
    twitter: { label: 'X', href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`, bg: '#000' },
    linkedin: { label: 'in', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, bg: '#0a66c2' },
    whatsapp: { label: '✓', href: `https://wa.me/?text=${encodeURIComponent(url)}`, bg: '#25d366' },
    telegram: { label: 'T', href: `https://t.me/share/url?url=${encodeURIComponent(url)}`, bg: '#0088cc' },
    email: { label: 'M', href: `mailto:?body=${encodeURIComponent(url)}`, bg: '#6b7280' },
    reddit: { label: 'R', href: `https://reddit.com/submit?url=${encodeURIComponent(url)}`, bg: '#ff4500' },
    pinterest: { label: 'P', href: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}`, bg: '#e60023' },
  };
  const align = (settings.align as 'left'|'center'|'right') || 'left';
  const justify = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
  return (
    <div style={{ display: 'flex', gap: (settings.gap as number) || 8, justifyContent: justify, flexWrap: 'wrap' }}>
      {networks.map((n, i) => {
        const m = map[n];
        if (!m) return null;
        return (
          <a key={i} href={m.href} target="_blank" rel="noopener noreferrer" style={{
            width: (settings.size as number) || 36, height: (settings.size as number) || 36,
            borderRadius: (settings.radius as string) || '8px',
            background: m.bg, color: (settings.color as string) || '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            textDecoration: 'none', fontWeight: 700,
          }}>{m.label}</a>
        );
      })}
    </div>
  );
}

function Reviews({ settings }: { settings: Record<string, unknown> }) {
  const items = (settings.items as { author: string; rating: number; date: string; text: string }[]) || [];
  const cols = (settings.columns as number) || 3;
  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        {settings.title && <h2 style={{ margin: '0 0 12px', fontSize: '2rem', fontWeight: 800 }}>{settings.title as string}</h2>}
        <div style={{ fontSize: '2rem', color: '#fbbf24' }}>★ {(settings.averageRating as number)?.toFixed(1) ?? ''}</div>
        <div style={{ color: 'var(--en-color-text-muted)', fontSize: 14 }}>basato su {settings.totalCount as number} recensioni</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 20 }}>
        {items.map((it, i) => (
          <div key={i} style={{ padding: 20, border: '1px solid var(--en-color-border)', borderRadius: 'var(--en-radius-lg, 12px)' }}>
            <div style={{ marginBottom: 6 }}>
              {Array.from({ length: 5 }).map((_, k) => <span key={k} style={{ color: k < it.rating ? '#fbbf24' : '#e5e7eb' }}>★</span>)}
            </div>
            <p style={{ margin: '0 0 12px', fontSize: 14 }}>{it.text}</p>
            <div style={{ fontSize: 13, color: 'var(--en-color-text-muted)' }}>
              <strong style={{ color: 'var(--en-color-text)' }}>{it.author}</strong> · {it.date}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LottieWidget({ settings }: { settings: Record<string, unknown> }) {
  // Usa dotlottie web component (caricato da CDN). Funziona senza dipendenze NPM pesanti.
  const src = (settings.src as string) || '';
  if (!src) {
    return <div style={{ padding: 20, textAlign: 'center', color: 'var(--en-color-text-muted)', background: 'var(--en-color-surface)' }}>Inserisci URL Lottie JSON</div>;
  }
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js" />
      <lottie-player
        src={src}
        autoplay={settings.autoplay !== false}
        loop={settings.loop !== false}
        style={{ width: (settings.width as string) || '100%', height: (settings.height as string) || '300px' } as React.CSSProperties}
      />
    </>
  );
}

function MailchimpWidget({ settings }: { settings: Record<string, unknown> }) {
  const [sent, setSent] = useState(false);
  const align = (settings.align as 'left'|'center'|'right') || 'center';

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (settings.action) return; // submit normale via Mailchimp
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch('/api/forms/submit', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ data: { email: fd.get('email'), source: 'newsletter' } }),
    });
    setSent(true);
  }

  if (sent) {
    return <div style={{ padding: 20, textAlign: align, background: 'var(--en-color-surface)', borderRadius: 'var(--en-radius-md, 8px)' }}>{settings.successText as string}</div>;
  }

  return (
    <div style={{ textAlign: align }}>
      {settings.title && <h3 style={{ margin: '0 0 8px', fontSize: '1.5rem', fontWeight: 700 }}>{settings.title as string}</h3>}
      {settings.text && <p style={{ margin: '0 0 16px', color: 'var(--en-color-text-muted)' }}>{settings.text as string}</p>}
      <form
        action={(settings.action as string) || undefined}
        method="post"
        target={settings.action ? '_blank' : undefined}
        onSubmit={onSubmit}
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center' }}
      >
        <input
          type="email" name="EMAIL" required
          placeholder={(settings.placeholder as string) || 'La tua email'}
          style={{
            flex: '1 1 240px', padding: '12px 16px',
            border: '1px solid var(--en-form-border)',
            borderRadius: 'var(--en-form-radius)',
            background: 'var(--en-form-bg)',
            fontSize: 16,
          }}
        />
        <button type="submit" style={{
          padding: '12px 24px', background: 'var(--en-color-primary)',
          color: 'var(--en-color-text-inverse)', border: 'none',
          borderRadius: 'var(--en-button-radius)', fontWeight: 700, cursor: 'pointer',
        }}>{(settings.buttonText as string) || 'Iscriviti'}</button>
      </form>
    </div>
  );
}

interface CarouselItem { [key: string]: unknown }
function EmblaCarousel<T extends CarouselItem>({
  items, slidesPerView, gap, autoplay, autoplayMs, loop, showArrows, showDots, renderItem,
}: {
  items: T[]; slidesPerView: number; gap: number;
  autoplay: boolean; autoplayMs: number; loop: boolean;
  showArrows: boolean; showDots: boolean;
  renderItem: (item: T) => React.ReactNode;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop, align: 'start' });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on('select', onSelect);
    onSelect();
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi || !autoplay) return;
    const id = setInterval(() => {
      if (emblaApi.canScrollNext()) emblaApi.scrollNext();
      else emblaApi.scrollTo(0);
    }, autoplayMs);
    return () => clearInterval(id);
  }, [emblaApi, autoplay, autoplayMs]);

  if (items.length === 0) {
    return <div style={{ padding: 20, color: 'var(--en-color-text-muted)', textAlign: 'center' }}>Nessuna slide</div>;
  }

  const slideStyle: React.CSSProperties = {
    flex: `0 0 calc(${100 / slidesPerView}% - ${(gap * (slidesPerView - 1)) / slidesPerView}px)`,
    minWidth: 0,
  };

  return (
    <div style={{ position: 'relative' }}>
      <div ref={emblaRef} style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap }}>
          {items.map((it, i) => <div key={i} style={slideStyle}>{renderItem(it)}</div>)}
        </div>
      </div>
      {showArrows && (
        <>
          <button onClick={() => emblaApi?.scrollPrev()} aria-label="Precedente" style={{
            position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
            width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 18,
          }}>‹</button>
          <button onClick={() => emblaApi?.scrollNext()} aria-label="Successivo" style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'rgba(0,0,0,0.5)', color: '#fff', fontSize: 18,
          }}>›</button>
        </>
      )}
      {showDots && scrollSnaps.length > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
          {scrollSnaps.map((_, i) => (
            <button
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              aria-label={`Slide ${i + 1}`}
              style={{
                width: 8, height: 8, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: i === selectedIndex ? 'var(--en-color-primary)' : 'var(--en-color-border)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PostContentWidget({ settings }: { settings: Record<string, unknown> }) {
  const ctx = useRenderContext();
  const post = ctx?.post;
  const sizeMap: Record<string, string> = { sm: '14px', md: '16px', lg: '18px' };
  const size = sizeMap[(settings.proseSize as string) || 'md'];

  if (!post) {
    return (
      <div style={{ padding: 16, background: 'var(--en-color-surface)', borderRadius: 8, color: 'var(--en-color-text-muted)' }}>
        <em>Contenuto post (visibile sul singolo post)</em>
      </div>
    );
  }
  // Se il post ha JSON tree, lo renderizziamo via renderWidget. Altrimenti usiamo contentHtml.
  if (post.contentHtml) {
    return <div style={{ fontSize: size, lineHeight: 'var(--en-line-height,1.6)' }} dangerouslySetInnerHTML={{ __html: post.contentHtml }} />;
  }
  return <div style={{ fontSize: size, color: 'var(--en-color-text-muted)' }}><em>(Contenuto vuoto)</em></div>;
}

function PostExcerptWidget({ settings }: { settings: Record<string, unknown> }) {
  const ctx = useRenderContext();
  const text = ctx?.post?.excerpt;
  return (
    <p style={{
      color: (settings.color as string) || 'var(--en-color-text-muted)',
      fontSize: (settings.size as string) || '18px',
      lineHeight: (settings.lineHeight as string) || '1.6',
      margin: 0,
    }}>
      {text || (ctx?.post ? '' : 'Estratto del post')}
    </p>
  );
}

function FeaturedImageWidget({ settings }: { settings: Record<string, unknown> }) {
  const ctx = useRenderContext();
  const src = ctx?.post?.featured || (settings.fallback as string) || '';
  if (!src) {
    return (
      <div style={{ aspectRatio: (settings.ratio as string) || '16/9', background: 'var(--en-color-surface)', borderRadius: (settings.radius as string) || '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--en-color-text-muted)' }}>
        Featured image
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={ctx?.post?.title ?? ''}
      style={{ width: '100%', aspectRatio: (settings.ratio as string) || '16/9', objectFit: 'cover', borderRadius: (settings.radius as string) || '12px' }}
    />
  );
}

function PostMetaWidget({ settings }: { settings: Record<string, unknown> }) {
  const ctx = useRenderContext();
  const post = ctx?.post;
  if (!post) return <span style={{ color: 'var(--en-color-text-muted)' }}>Meta post</span>;

  const parts: React.ReactNode[] = [];
  if (settings.showDate && post.publishedAt) {
    const d = new Date(post.publishedAt);
    parts.push(<time key="d" dateTime={post.publishedAt}>{d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</time>);
  }
  if (settings.showAuthor && post.author?.name) {
    parts.push(<span key="a">di {post.author.name}</span>);
  }
  if (settings.showCategories && post.terms?.length) {
    const cats = post.terms.filter((t) => t.taxonomy.slug === 'category');
    if (cats.length) parts.push(<span key="c">in {cats.map((t) => t.name).join(', ')}</span>);
  }
  if (settings.showReadTime && post.contentHtml) {
    const words = post.contentHtml.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    const min = Math.max(1, Math.round(words / 200));
    parts.push(<span key="rt">{min} min lettura</span>);
  }
  const sep = (settings.separator as string) || '·';
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', color: (settings.color as string) || 'var(--en-color-text-muted)', fontSize: 14 }}>
      {parts.map((p, i) => (
        <span key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {p}
          {i < parts.length - 1 && <span aria-hidden>{sep}</span>}
        </span>
      ))}
    </div>
  );
}

function AuthorBoxWidget({ settings }: { settings: Record<string, unknown> }) {
  const ctx = useRenderContext();
  const a = ctx?.post?.author;
  if (!a) return <div style={{ padding: 16, color: 'var(--en-color-text-muted)' }}>Autore</div>;
  const layout = (settings.layout as string) || 'card';
  const initials = (a.name ?? a.email).slice(0, 2).toUpperCase();
  const avatar = settings.showAvatar ? (
    a.avatarUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={a.avatarUrl} alt={a.name ?? ''} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
    ) : (
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--en-color-primary)', color: 'var(--en-color-text-inverse)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
        {initials}
      </div>
    )
  ) : null;
  return (
    <div style={{
      display: 'flex', gap: 16, alignItems: 'center',
      padding: layout === 'card' ? 24 : 0,
      border: layout === 'card' ? '1px solid var(--en-color-border)' : 'none',
      borderRadius: layout === 'card' ? 'var(--en-radius-lg)' : 0,
      background: layout === 'card' ? 'var(--en-color-surface)' : 'transparent',
    }}>
      {avatar}
      <div>
        <div style={{ fontWeight: 700 }}>{a.name ?? a.email}</div>
        {settings.showBio && a.bio && <p style={{ margin: '4px 0 0', color: 'var(--en-color-text-muted)', fontSize: 14 }}>{a.bio}</p>}
      </div>
    </div>
  );
}

function PostsListWidget({ settings }: { settings: Record<string, unknown> }) {
  const [items, setItems] = useState<{ id: string; title: string; slug: string; excerpt?: string; featured?: string; publishedAt?: string; postType: { slug: string } }[]>([]);
  useEffect(() => {
    fetch(`/api/public/posts?type=${settings.postType ?? 'post'}&perPage=${settings.count ?? 5}`)
      .then(r => r.json()).then(d => setItems(d.items ?? [])).catch(() => {});
  }, [settings.postType, settings.count]);

  const layout = (settings.layout as string) || 'list';
  const cols = (settings.columns as number) || 1;

  if (items.length === 0) {
    return <div style={{ padding: 20, color: 'var(--en-color-text-muted)' }}>Nessun post da mostrare.</div>;
  }

  return (
    <div style={{
      display: layout === 'grid' ? 'grid' : 'flex',
      gridTemplateColumns: layout === 'grid' ? `repeat(${cols}, 1fr)` : undefined,
      flexDirection: layout === 'list' ? 'column' : undefined,
      gap: 24,
    }}>
      {items.map((p) => (
        <a key={p.id} href={`/${p.postType.slug}/${p.slug}`} style={{ display: 'block', textDecoration: 'none', color: 'inherit', borderRadius: 'var(--en-radius-lg)', overflow: 'hidden' }}>
          {settings.showImage && p.featured && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.featured} alt={p.title} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', marginBottom: 12, borderRadius: 'var(--en-radius-lg)' }} />
          )}
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{p.title}</h3>
          {settings.showMeta && p.publishedAt && (
            <div style={{ fontSize: 13, color: 'var(--en-color-text-muted)', marginTop: 4 }}>
              {new Date(p.publishedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          )}
          {settings.showExcerpt && p.excerpt && <p style={{ marginTop: 8, color: 'var(--en-color-text-muted)' }}>{p.excerpt}</p>}
        </a>
      ))}
    </div>
  );
}

function SiteLogoWidget({ settings }: { settings: Record<string, unknown> }) {
  const ctx = useRenderContext();
  const site = ctx?.site;
  const variant = (settings.variant as string) || 'auto';
  const src = variant === 'dark' ? site?.logoDark : site?.logoLight;
  const align = (settings.align as 'left'|'center'|'right') || 'left';
  const justify = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
  const link = (settings.link as string) || '/';
  if (!src) {
    return (
      <div style={{ display: 'flex', justifyContent: justify }}>
        <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>{site?.name || 'Logo'}</span>
      </div>
    );
  }
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={site?.name || 'logo'} style={{ maxHeight: (settings.maxHeight as number) || 48, width: 'auto' }} />
  );
  return (
    <div style={{ display: 'flex', justifyContent: justify }}>
      {link ? <a href={link} style={{ display: 'inline-block' }}>{img}</a> : img}
    </div>
  );
}

function SiteTitleWidget({ settings }: { settings: Record<string, unknown> }) {
  const ctx = useRenderContext();
  const Tag = ((settings.tag as keyof React.JSX.IntrinsicElements) || 'span');
  const link = (settings.link as string) || '';
  const align = (settings.align as 'left'|'center'|'right') || 'left';
  const inner = (
    <Tag style={{
      fontSize: (settings.size as string) || '24px',
      fontWeight: (settings.weight as string) || '700',
      color: (settings.color as string) || 'var(--en-color-text, #0f172a)',
      lineHeight: 1.2,
      margin: 0,
    }}>
      {ctx?.site?.name || 'Element Node'}
    </Tag>
  );
  return (
    <div style={{ textAlign: align }}>
      {link ? <a href={link} style={{ color: 'inherit', textDecoration: 'none' }}>{inner}</a> : inner}
    </div>
  );
}

function NavMenuWidget({ settings }: { settings: Record<string, unknown> }) {
  const items = (settings.items as { label: string; url: string }[]) || [];
  const align = (settings.align as 'left'|'center'|'right') || 'left';
  const justify = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
  const color = (settings.color as string) || 'var(--en-color-text, #0f172a)';
  return (
    <nav style={{ display: 'flex', justifyContent: justify, gap: (settings.gap as number) || 24, flexWrap: 'wrap' }}>
      {items.map((it, i) => (
        <a key={i} href={it.url} style={{ color, textDecoration: 'none', fontWeight: 500, fontSize: '15px' }}>
          {it.label}
        </a>
      ))}
    </nav>
  );
}

function SearchFormWidget({ settings }: { settings: Record<string, unknown> }) {
  return (
    <form action={(settings.action as string) || '/search'} method="get" style={{ display: 'flex', gap: 8, width: (settings.width as string) || '300px', maxWidth: '100%' }}>
      <input
        name="q"
        type="search"
        placeholder={(settings.placeholder as string) || 'Cerca...'}
        style={{
          flex: 1,
          padding: '8px 12px',
          border: '1px solid var(--en-form-border, #e5e7eb)',
          borderRadius: 'var(--en-form-radius, 6px)',
          background: 'var(--en-form-bg, #fff)',
          fontSize: 14,
        }}
      />
      <button type="submit" style={{
        padding: '8px 16px',
        background: 'var(--en-color-primary, #92003b)',
        color: 'var(--en-color-text-inverse, #fff)',
        border: 'none',
        borderRadius: 'var(--en-button-radius, 6px)',
        cursor: 'pointer',
        fontWeight: 600,
      }}>
        {(settings.buttonText as string) || 'Cerca'}
      </button>
    </form>
  );
}

function PageTitleWidget({ settings }: { settings: Record<string, unknown> }) {
  const ctx = useRenderContext();
  const Tag = ((settings.tag as keyof React.JSX.IntrinsicElements) || 'h1');
  return (
    <Tag style={{
      fontSize: (settings.size as string) || '40px',
      fontWeight: (settings.weight as string) || '700',
      color: (settings.color as string) || 'var(--en-color-text, #0f172a)',
      textAlign: (settings.align as 'left'|'center'|'right') || 'left',
      margin: 0,
      lineHeight: 1.2,
    }}>
      {ctx?.page?.title || 'Titolo pagina'}
    </Tag>
  );
}

function BreadcrumbsWidget({ settings }: { settings: Record<string, unknown> }) {
  const ctx = useRenderContext();
  const items: { label: string; url: string | null }[] = [{ label: (settings.homeLabel as string) || 'Home', url: '/' }];
  if (ctx?.page && !ctx.page.isHomepage) {
    items.push({ label: ctx.page.title, url: null });
  }
  const sep = (settings.separator as string) || '/';
  return (
    <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 14, color: (settings.color as string) || 'var(--en-color-text-muted, #64748b)' }}>
      {items.map((it, i) => (
        <span key={i} style={{ display: 'flex', gap: 8 }}>
          {it.url ? <a href={it.url} style={{ color: 'inherit', textDecoration: 'none' }}>{it.label}</a> : <span>{it.label}</span>}
          {i < items.length - 1 && <span aria-hidden>{sep}</span>}
        </span>
      ))}
    </nav>
  );
}

function ToggleWidget({ items }: { items: { title: string; content: string }[] }) {
  const [opens, setOpens] = useState<Record<number, boolean>>({});
  return (
    <div style={{ borderRadius: 8 }}>
      {items.map((it, i) => (
        <div key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
          <button
            onClick={() => setOpens(o => ({ ...o, [i]: !o[i] }))}
            style={{ width: '100%', padding: '14px 0', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span>{it.title}</span>
            <span style={{ transform: opens[i] ? 'rotate(45deg)' : 'rotate(0deg)', transition: 'transform .2s', fontSize: 20, lineHeight: 1 }}>+</span>
          </button>
          {opens[i] && <div style={{ padding: '0 0 16px' }} dangerouslySetInnerHTML={{ __html: it.content || '' }} />}
        </div>
      ))}
    </div>
  );
}

const SOCIAL_ICONS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'Twitter',
  linkedin: 'Linkedin',
  youtube: 'Youtube',
  tiktok: 'Music2',
  whatsapp: 'MessageCircle',
  github: 'Github',
};

function SocialIcons({ settings }: { settings: Record<string, unknown> }) {
  const items = (settings.items as { network: string; url: string }[]) || [];
  const align = (settings.align as 'left'|'center'|'right') || 'center';
  const justify = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
  // variant 'button': ogni icona dentro un bottone (cerchio/quadrato) con bg/ombra
  const asButton = settings.variant === 'button';
  const btnSize = (settings.buttonSize as number) || 40;
  const linkStyle: React.CSSProperties = asButton
    ? {
        color: (settings.color as string) || '#0f172a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: btnSize, height: btnSize, flexShrink: 0,
        background: (settings.buttonBg as string) || '#ffffff',
        borderRadius: (settings.buttonRadius as string) || '9999px',
        boxShadow: (settings.buttonShadow as string) && settings.buttonShadow !== 'none'
          ? (settings.buttonShadow as string)
          : '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'all .25s ease',
      }
    : { color: (settings.color as string) || '#0f172a', display: 'inline-flex' };
  return (
    <div style={{ display: 'flex', justifyContent: justify, gap: (settings.gap as number) || 12 }}>
      {items.map((it, i) => {
        const Ico = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string }>>)[SOCIAL_ICONS[it.network] || 'Globe'] ?? LucideIcons.Globe;
        return (
          <a key={i} href={it.url || '#'} target="_blank" rel="noopener noreferrer" aria-label={it.network} style={linkStyle}>
            <Ico size={(settings.size as number) || 24} />
          </a>
        );
      })}
    </div>
  );
}

function Countdown({ settings }: { settings: Record<string, unknown> }) {
  const due = settings.dueDate as string;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!due) return <div style={{ padding: 20, color: '#9ca3af', textAlign: 'center', background: '#f9fafb', borderRadius: 8 }}>Imposta una data di scadenza</div>;
  const diff = Math.max(0, new Date(due).getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const sec = Math.floor((diff % 60000) / 1000);
  const labels = (settings.labels as { days: string; hours: string; minutes: string; seconds: string }) || { days: 'Giorni', hours: 'Ore', minutes: 'Min', seconds: 'Sec' };
  const color = (settings.color as string) || '#0f172a';
  const Cell = ({ value, label }: { value: number; label: string }) => (
    <div style={{ textAlign: 'center', padding: '20px 24px', background: 'rgba(0,0,0,0.04)', borderRadius: 12, minWidth: 96 }}>
      <div style={{ fontSize: '3rem', fontWeight: 800, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{String(value).padStart(2, '0')}</div>
      <div style={{ marginTop: 4, fontSize: 12, color, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
    </div>
  );
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
      <Cell value={d} label={labels.days} />
      <Cell value={h} label={labels.hours} />
      <Cell value={m} label={labels.minutes} />
      <Cell value={sec} label={labels.seconds} />
    </div>
  );
}

function PriceTable({ settings }: { settings: Record<string, unknown> }) {
  const features = (settings.features as { text: string }[]) || [];
  const featured = !!settings.featured;
  return (
    <div style={{
      border: featured ? '2px solid var(--en-color-primary, #92003b)' : '1px solid var(--en-color-border, #e5e7eb)',
      borderRadius: 16,
      padding: 32,
      textAlign: 'center',
      background: featured ? 'linear-gradient(180deg, #fff 0%, #fdf2f8 100%)' : '#fff',
      position: 'relative',
      transform: featured ? 'scale(1.02)' : 'none',
    }}>
      {featured && (
        <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--en-color-primary, #92003b)', color: 'var(--en-color-text-inverse, #fff)', padding: '4px 14px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>POPOLARE</div>
      )}
      <h3 style={{ margin: '0 0 4px', fontSize: '1.5rem', fontWeight: 700 }}>{(settings.title as string) || ''}</h3>
      {settings.subtitle && <p style={{ margin: '0 0 24px', color: '#64748b' }}>{settings.subtitle as string}</p>}
      <div style={{ margin: '20px 0', display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: '1.5rem', fontWeight: 700 }}>{(settings.currency as string) || '€'}</span>
        <span style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1 }}>{(settings.price as string) || '0'}</span>
        <span style={{ color: '#64748b' }}>{(settings.period as string) || ''}</span>
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '24px 0', textAlign: 'left' }}>
        {features.map((f, i) => (
          <li key={i} style={{ padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f1f5f9' }}>
            <LucideIcons.Check size={18} color="#10b981" /> {f.text}
          </li>
        ))}
      </ul>
      <a href={(settings.ctaUrl as string) || '#'} style={{
        display: 'block', padding: '14px 24px',
        background: featured ? 'var(--en-color-primary, #92003b)' : 'transparent',
        color: featured ? 'var(--en-color-text-inverse, #fff)' : 'var(--en-color-primary, #92003b)',
        border: featured ? 'none' : '2px solid var(--en-color-primary, #92003b)',
        borderRadius: 'var(--en-button-radius, 8px)', textDecoration: 'none', fontWeight: 700, marginTop: 16,
      }}>{(settings.ctaText as string) || 'Inizia'}</a>
    </div>
  );
}

function TabsWidget({ items, align }: { items: { title: string; content: string }[]; align: string }) {
  const [active, setActive] = useState(0);
  if (items.length === 0) return null;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start', borderBottom: '2px solid #e5e7eb' }}>
        {items.map((it, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            style={{
              padding: '10px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: active === i ? '2px solid var(--en-color-primary, #92003b)' : '2px solid transparent',
              marginBottom: -2,
              cursor: 'pointer',
              fontWeight: active === i ? 700 : 500,
              color: active === i ? 'var(--en-color-primary, #92003b)' : 'var(--en-color-text-muted, #64748b)',
            }}
          >
            {it.title}
          </button>
        ))}
      </div>
      <div style={{ padding: '20px 0' }} dangerouslySetInnerHTML={{ __html: items[active]?.content || '' }} />
    </div>
  );
}

function AccordionWidget({ items, settings = {} }: { items: { title: string; content: string }[]; settings?: Record<string, unknown> }) {
  const flat = settings.variant === 'flat';
  const defaultOpen = settings.defaultOpen != null ? Number(settings.defaultOpen) : 0;
  const [open, setOpen] = useState<number | null>(defaultOpen >= 0 ? defaultOpen : null);
  const borderColor = (settings.borderColor as string) || '#e5e7eb';
  const chevronColor = (settings.chevronColor as string) || (flat ? 'var(--en-color-primary, #92003b)' : 'currentColor');
  const titleSize = (settings.titleSize as string) || (flat ? '18px' : undefined);
  const titleColor = (settings.titleColor as string) || undefined;
  const itemPadding = (settings.itemPadding as string) || (flat ? '26px 0' : '14px 16px');
  const contentPadding = (settings.contentPadding as string) || (flat ? '0 32px 24px 0' : '0 16px 16px');
  const chevron = (isOpen: boolean) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={chevronColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .25s' }}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
  return (
    <div style={flat ? undefined : { border: `1px solid ${borderColor}`, borderRadius: 8, overflow: 'hidden' }}>
      {items.map((it, i) => (
        <div key={i} style={flat
          ? { borderTop: i === 0 ? `1px solid ${borderColor}` : 'none', borderBottom: `1px solid ${borderColor}` }
          : { borderBottom: i < items.length - 1 ? `1px solid ${borderColor}` : 'none' }}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{ width: '100%', padding: itemPadding, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: titleSize, color: titleColor, fontFamily: 'inherit' }}
          >
            <span>{it.title}</span>
            {chevron(open === i)}
          </button>
          {open === i && it.content ? (
            <div style={{ padding: contentPadding, color: flat ? '#4b5563' : undefined, lineHeight: flat ? 1.75 : undefined }} dangerouslySetInnerHTML={{ __html: it.content || '' }} />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function CounterWidget({ settings }: { settings: Record<string, unknown> }) {
  const [val, setVal] = useState((settings.from as number) || 0);
  const ref = useRef<HTMLDivElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !animated.current) {
          animated.current = true;
          const from = (settings.from as number) || 0;
          const to = (settings.to as number) || 100;
          const dur = (settings.duration as number) || 2000;
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min(1, (now - start) / dur);
            setVal(Math.round(from + (to - from) * t));
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      });
    });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [settings]);

  return (
    <div ref={ref} style={{ textAlign: 'center' }}>
      <div style={{ fontSize: (settings.size as string) || '4rem', fontWeight: 800, color: (settings.color as string) || 'var(--en-color-primary, #92003b)', lineHeight: 1 }}>
        {(settings.prefix as string) || ''}{val}{(settings.suffix as string) || ''}
      </div>
      {settings.label ? (
        <div style={{
          marginTop: 8,
          color: (settings.labelColor as string) || '#64748b',
          fontSize: (settings.labelSize as string) || undefined,
          fontWeight: (settings.labelWeight as React.CSSProperties['fontWeight']) || undefined,
        }}>{settings.label as string}</div>
      ) : null}
    </div>
  );
}

function ProgressWidget({ settings }: { settings: Record<string, unknown> }) {
  const percent = Math.max(0, Math.min(100, (settings.percent as number) || 0));
  return (
    <div>
      {settings.label || settings.showPercent ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14 }}>
          <span>{(settings.label as string) || ''}</span>
          {settings.showPercent && <span>{percent}%</span>}
        </div>
      ) : null}
      <div style={{ background: 'var(--en-color-border, #e5e7eb)', borderRadius: 'var(--en-radius-full, 999px)', overflow: 'hidden', height: (settings.height as number) || 12 }}>
        <div style={{ width: `${percent}%`, height: '100%', background: (settings.color as string) || 'var(--en-color-primary, #92003b)', transition: 'width .8s' }} />
      </div>
    </div>
  );
}

interface DynamicField {
  id?: string; name: string; label: string; type: string; required?: boolean;
  placeholder?: string; helpText?: string; options?: { value: string; label: string }[];
  rows?: number; width?: number;
}

function ContactForm({ settings }: { settings: Record<string, unknown> }) {
  const formId = (settings.formId as string) || '';
  const inlineFields = (settings.fields as DynamicField[]) || [];

  const [remoteFields, setRemoteFields] = useState<DynamicField[] | null>(null);
  const [submitText, setSubmitText] = useState((settings.submitText as string) || 'Invia');
  const [successMsg, setSuccessMsg] = useState('Grazie!');
  const [errorMsg, setErrorMsg] = useState('Si è verificato un errore.');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!formId) { setRemoteFields(null); return; }
    fetch(`/api/public/forms/${formId}`).then(r => r.ok ? r.json() : null).then((data) => {
      if (!data) return;
      setRemoteFields(data.fields ?? []);
      setSubmitText(data.settings?.submitText ?? submitText);
      setSuccessMsg(data.settings?.successMessage ?? successMsg);
      setErrorMsg(data.settings?.errorMessage ?? errorMsg);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  const fields = remoteFields ?? inlineFields;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    const fd = new FormData(e.currentTarget);
    const data: Record<string, FormDataEntryValue | string[]> = {};
    fd.forEach((v, k) => {
      if (k in data) {
        const cur = data[k];
        data[k] = Array.isArray(cur) ? [...cur, String(v)] : [String(cur), String(v)];
      } else data[k] = v;
    });
    const honeypot = data._website ? String(data._website) : '';
    delete data._website;
    try {
      const res = await fetch('/api/forms/submit', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ formId: formId || undefined, data, honeypot, recipient: settings.recipient }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.errors) setErrors(json.errors);
        else throw new Error(json?.error?.message ?? 'errore');
        return;
      }
      if (json.redirectUrl) { window.location.href = json.redirectUrl; return; }
      setSent(true);
    } catch {
      setErrors({ _global: errorMsg });
    } finally {
      setLoading(false);
    }
  }

  if (sent) return <div style={{ padding: 16, background: 'var(--en-color-success, #dcfce7)', color: 'var(--en-color-text-inverse, #fff)', borderRadius: 'var(--en-radius-md, 8px)' }}>{successMsg}</div>;

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(12, 1fr)' }}>
      {/* Honeypot */}
      <input type="text" name="_website" tabIndex={-1} autoComplete="off"
        style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden />

      {fields.map((f) => {
        const w = Math.max(1, Math.min(12, f.width ?? 12));
        const err = errors[f.name];
        return (
          <div key={f.name} style={{ gridColumn: `span ${w}` }}>
            {f.type !== 'hidden' && f.type !== 'consent' && f.type !== 'checkbox' && (
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 4 }}>
                {f.label}{f.required && <span style={{ color: 'var(--en-color-danger, #ef4444)' }}> *</span>}
              </label>
            )}
            {renderInput(f)}
            {f.helpText && <div style={{ fontSize: 11, color: 'var(--en-color-text-muted)', marginTop: 4 }}>{f.helpText}</div>}
            {err && <div style={{ fontSize: 12, color: 'var(--en-color-danger, #ef4444)', marginTop: 4 }}>{err}</div>}
          </div>
        );
      })}

      {errors._global && <div style={{ gridColumn: 'span 12', padding: 10, background: 'var(--en-color-danger, #fee)', color: '#fff', borderRadius: 6 }}>{errors._global}</div>}

      <button type="submit" disabled={loading} style={{
        gridColumn: 'span 12',
        padding: 'var(--en-button-py, 12px) var(--en-button-px, 20px)',
        background: 'var(--en-color-primary, #92003b)',
        color: 'var(--en-color-text-inverse, #fff)',
        border: 'none',
        borderRadius: 'var(--en-button-radius, 8px)',
        fontWeight: 'var(--en-button-fw, 600)' as React.CSSProperties['fontWeight'],
        cursor: 'pointer',
      }}>
        {loading ? 'Invio...' : submitText}
      </button>
    </form>
  );
}

function renderInput(f: DynamicField): React.ReactNode {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: 10,
    border: '1px solid var(--en-form-border, #e5e7eb)',
    borderRadius: 'var(--en-form-radius, 6px)',
    background: 'var(--en-form-bg, #fff)',
    fontFamily: 'inherit',
    fontSize: 14,
  };
  switch (f.type) {
    case 'textarea':
      return <textarea name={f.name} required={f.required} placeholder={f.placeholder} rows={f.rows ?? 4} style={inputStyle} />;
    case 'select':
      return (
        <select name={f.name} required={f.required} style={inputStyle} defaultValue="">
          <option value="" disabled>{f.placeholder ?? 'Seleziona...'}</option>
          {(f.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    case 'radio':
      return (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {(f.options ?? []).map((o) => (
            <label key={o.value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
              <input type="radio" name={f.name} value={o.value} required={f.required} /> {o.label}
            </label>
          ))}
        </div>
      );
    case 'checkbox-group':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {(f.options ?? []).map((o) => (
            <label key={o.value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
              <input type="checkbox" name={f.name} value={o.value} /> {o.label}
            </label>
          ))}
        </div>
      );
    case 'checkbox':
    case 'consent':
      return (
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14 }}>
          <input type="checkbox" name={f.name} required={f.required} value="yes" style={{ marginTop: 2 }} />
          {/<[a-z]/i.test(f.label) ? <span dangerouslySetInnerHTML={{ __html: f.label }} /> : <span>{f.label}</span>}
        </label>
      );
    case 'file':
      return <input type="file" name={f.name} required={f.required} style={inputStyle} />;
    case 'hidden':
      return <input type="hidden" name={f.name} value={f.placeholder ?? ''} />;
    default:
      return <input type={f.type} name={f.name} required={f.required} placeholder={f.placeholder} style={inputStyle} />;
  }
}

function PostsGrid({ settings }: { settings: Record<string, unknown> }) {
  const [posts, setPosts] = useState<{ id: string; title: string; slug: string; seoDesc?: string; ogImage?: string }[]>([]);
  useEffect(() => {
    fetch(`/api/pages?published=1&limit=${settings.count || 6}`)
      .then(r => r.json())
      .then(setPosts)
      .catch(() => {});
  }, [settings.count]);

  const cols = (settings.columns as number) || 3;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 20 }}>
      {posts.map((p) => (
        <a key={p.id} href={`/${p.slug}`} style={{ display: 'block', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', textDecoration: 'none', color: 'inherit' }}>
          {settings.showImage && p.ogImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.ogImage} alt={p.title} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }} />
          )}
          <div style={{ padding: 16 }}>
            <h4 style={{ margin: '0 0 8px', fontSize: '1.1rem' }}>{p.title}</h4>
            {settings.showExcerpt && p.seoDesc && <p style={{ margin: 0, color: '#64748b', fontSize: 14 }}>{p.seoDesc}</p>}
          </div>
        </a>
      ))}
    </div>
  );
}

function Gallery({ settings }: { settings: Record<string, unknown> }) {
  const images = (settings.images as { src: string; alt: string }[]) || [];
  const cols = (settings.columns as number) || 3;
  const gap = (settings.gap as number) || 8;
  if (images.length === 0) return <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', background: '#f9fafb' }}>Aggiungi immagini alla galleria</div>;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap }}>
      {images.map((img, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={img.src} alt={img.alt || ''} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 6 }} />
      ))}
    </div>
  );
}
