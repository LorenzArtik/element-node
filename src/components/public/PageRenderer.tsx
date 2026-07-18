'use client';

import type { PageContent } from '@/lib/widgets-schema';
import { renderWidget } from '@/components/editor/widgets/render';
import type { CSSProperties } from 'react';

type BgObj = {
  type?: 'color' | 'image' | 'gradient';
  color?: string;
  image?: string;
  overlay?: string;
  gradient?: string;
  size?: string;
  position?: string;
  attachment?: string;
  repeat?: string;
};

type SectionSettings = {
  padding?: string; paddingTop?: number | string; paddingBottom?: number | string;
  paddingLeft?: number | string; paddingRight?: number | string;
  marginTop?: number | string; marginBottom?: number | string;
  background?: string | BgObj;
  color?: string; gap?: string;
  minHeight?: string;
  maxWidth?: string; containerWidth?: string;
  fullWidth?: boolean;
  sticky?: boolean; position?: string; zIndex?: number;
  boxShadow?: string;
  borderRadius?: string;
  anchor?: string;
  contentAlign?: 'left' | 'center' | 'right';
  textAlign?: 'left' | 'center' | 'right';
};

type ColumnSettings = {
  padding?: string; paddingLeft?: string; paddingRight?: string;
  align?: 'left' | 'center' | 'right';
  background?: string | BgObj;
  verticalAlign?: 'top' | 'center' | 'bottom';
  textAlign?: 'left' | 'center' | 'right';
  // Stile "card" nativo di colonna
  borderRadius?: string;
  boxShadow?: string;
  border?: string;
  overflow?: string;
  // Layout degli elementi interni: 'column' (default) o 'row' (bottoni/pill/loghi affiancati)
  elementsDirection?: 'column' | 'row';
  elementsJustify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  elementsAlign?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  elementsGap?: number | string;
  elementsWrap?: boolean;
};

const px = (v: number | string | undefined): string | undefined =>
  v == null ? undefined : typeof v === 'number' ? `${v}px` : v;

function bgToCss(bg: string | BgObj | undefined): string | undefined {
  if (!bg) return undefined;
  if (typeof bg === 'string') return bg;
  const layers: string[] = [];
  if (bg.overlay) {
    // un colore puro non può stare nei layer intermedi del shorthand: avvolgilo in un gradient
    const ov = /gradient\(/.test(bg.overlay) ? bg.overlay : `linear-gradient(${bg.overlay}, ${bg.overlay})`;
    layers.push(ov);
  }
  if (bg.image) {
    const size = bg.size ?? 'cover';
    const pos = bg.position ?? 'center';
    const rep = bg.repeat ?? 'no-repeat';
    layers.push(`url("${bg.image}") ${pos}/${size} ${rep}`);
  } else if (bg.gradient) {
    layers.push(bg.gradient);
  }
  const cssLayers = layers.join(', ');
  if (bg.type === 'color' || (!bg.image && !bg.gradient && bg.color)) {
    return cssLayers ? `${cssLayers}, ${bg.color}` : bg.color;
  }
  if (cssLayers) return cssLayers;
  return undefined;
}

export function PageRenderer({ content }: { content: PageContent }) {
  return (
    <div className="en-frontend">
      <style>{`
        @media (max-width: 768px) {
          .en-frontend .el-container { flex-direction: column; }
          .en-frontend .en-col { flex: 1 1 auto !important; max-width: 100% !important; width: 100%; }
          .en-frontend .en-col[style*="--en-col-mobile"] { flex: 0 0 var(--en-col-mobile) !important; max-width: var(--en-col-mobile) !important; }
          .en-frontend h1 { font-size: clamp(30px, 9vw, 40px) !important; }
          .en-frontend h2 { font-size: clamp(24px, 7vw, 32px) !important; }
          .en-frontend section { padding-left: 18px; padding-right: 18px; }
        }
      `}</style>
      {content.sections.map((section) => {
        const s = section.settings as SectionSettings;
        const bgCss = bgToCss(s.background);
        const sectionStyle: CSSProperties = {
          padding: s.padding,
          paddingTop: px(s.paddingTop),
          paddingBottom: px(s.paddingBottom),
          paddingLeft: px(s.paddingLeft),
          paddingRight: px(s.paddingRight),
          marginTop: px(s.marginTop),
          marginBottom: px(s.marginBottom),
          background: bgCss,
          backgroundAttachment: typeof s.background === 'object' && s.background?.attachment ? s.background.attachment : undefined,
          color: s.color,
          minHeight: s.minHeight,
          boxShadow: s.boxShadow,
          borderRadius: s.borderRadius,
          position: s.sticky ? 'sticky' : (s.position as CSSProperties['position']),
          top: s.sticky ? 0 : undefined,
          zIndex: s.sticky || s.position === 'fixed' ? (s.zIndex ?? 100) : s.zIndex,
          textAlign: s.textAlign as CSSProperties['textAlign'],
        };

        // default padding fallback only when nothing was specified
        if (!sectionStyle.padding && !sectionStyle.paddingTop && !sectionStyle.paddingBottom) {
          sectionStyle.padding = '60px 20px';
        }

        const containerStyle: CSSProperties = {
          display: 'flex',
          maxWidth: s.fullWidth ? '100%' : (s.containerWidth ?? s.maxWidth ?? 1200),
          margin: '0 auto',
          gap: s.gap ?? '0',
          flexWrap: 'wrap',
          alignItems: 'stretch',
          width: '100%',
        };

        return (
          <section key={section.id} id={s.anchor} style={sectionStyle}>
            <div className="el-container" style={containerStyle}>
              {section.columns.map((col) => {
                const c = col.settings as ColumnSettings;
                const colBg = bgToCss(c.background);
                const colStyle: CSSProperties = {
                  flex: `0 0 ${col.width}%`,
                  minWidth: 0,
                  maxWidth: `${col.width}%`,
                  ...(c.mobileWidth ? ({ ['--en-col-mobile' as string]: `${c.mobileWidth}` } as CSSProperties) : {}),
                  padding: c.padding,
                  paddingLeft: c.paddingLeft,
                  paddingRight: c.paddingRight,
                  background: colBg,
                  textAlign: (c.textAlign ?? c.align) as CSSProperties['textAlign'],
                  display: 'flex',
                  flexDirection: c.elementsDirection === 'row' ? 'row' : 'column',
                  ...(c.elementsDirection === 'row'
                    ? {
                        flexWrap: c.elementsWrap === false ? 'nowrap' : 'wrap',
                        justifyContent: c.elementsJustify ?? 'center',
                        alignItems: c.elementsAlign ?? 'center',
                        gap: typeof c.elementsGap === 'number' ? `${c.elementsGap}px` : (c.elementsGap ?? '16px'),
                      }
                    : {
                        justifyContent:
                          c.verticalAlign === 'center' ? 'center'
                          : c.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start',
                        ...(c.elementsGap != null ? { gap: typeof c.elementsGap === 'number' ? `${c.elementsGap}px` : c.elementsGap } : {}),
                      }),
                  borderRadius: c.borderRadius && c.borderRadius !== '0' ? c.borderRadius : undefined,
                  boxShadow: c.boxShadow && c.boxShadow !== 'none' ? c.boxShadow : undefined,
                  border: c.border || undefined,
                  overflow: (c.overflow as CSSProperties['overflow']) || undefined,
                };
                if (!colStyle.padding && !colStyle.paddingLeft && !colStyle.paddingRight) {
                  colStyle.padding = '20px';
                }
                return (
                  <div key={col.id} className="en-col" style={colStyle}>
                    {col.elements.map((el) => (
                      <div key={el.id}>{renderWidget(el)}</div>
                    ))}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
