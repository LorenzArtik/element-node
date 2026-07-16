import { z } from 'zod';

/**
 * Schema completo dei "theme tokens".
 * Questi valori sono il brand del sito; vengono iniettati come CSS variables `--en-*`
 * e tutti i widget li consumano via `var(--en-…)`.
 */
export const themeSchema = z.object({
  colors: z.object({
    primary: z.string().default('#92003b'),
    primaryHover: z.string().default('#7a0031'),
    secondary: z.string().default('#1f2937'),
    accent: z.string().default('#a4286a'),

    text: z.string().default('#0f172a'),
    textMuted: z.string().default('#64748b'),
    textInverse: z.string().default('#ffffff'),

    background: z.string().default('#ffffff'),
    surface: z.string().default('#f9fafb'),
    border: z.string().default('#e5e7eb'),

    success: z.string().default('#10b981'),
    warning: z.string().default('#f59e0b'),
    danger: z.string().default('#ef4444'),
    info: z.string().default('#3b82f6'),

    custom1: z.string().default('#000000'),
    custom2: z.string().default('#000000'),
    custom3: z.string().default('#000000'),
  }),

  typography: z.object({
    fontHeading: z.string().default('Inter, system-ui, sans-serif'),
    fontBody: z.string().default('Inter, system-ui, sans-serif'),
    fontMono: z.string().default('"JetBrains Mono", monospace'),

    sizeBase: z.string().default('16px'),
    scale: z.object({
      xs: z.string().default('0.75rem'),
      sm: z.string().default('0.875rem'),
      md: z.string().default('1rem'),
      lg: z.string().default('1.125rem'),
      xl: z.string().default('1.25rem'),
      '2xl': z.string().default('1.5rem'),
      '3xl': z.string().default('1.875rem'),
      '4xl': z.string().default('2.25rem'),
      '5xl': z.string().default('3rem'),
      '6xl': z.string().default('3.75rem'),
    }),

    lineHeight: z.string().default('1.6'),
    headingLineHeight: z.string().default('1.2'),
    headingWeight: z.string().default('700'),
    bodyWeight: z.string().default('400'),
    headingTransform: z.string().default('none'),
    bodyTransform: z.string().default('none'),
    headingStyle: z.string().default('normal'),
    bodyStyle: z.string().default('normal'),
    headingLetterSpacing: z.string().default('normal'),
    bodyLetterSpacing: z.string().default('normal'),
    headingDecoration: z.string().default('none'),
  }),

  layout: z.object({
    containerMax: z.string().default('1200px'),
    gutter: z.string().default('20px'),
    breakpointTablet: z.string().default('1024px'),
    breakpointMobile: z.string().default('768px'),
    sectionPadding: z.string().default('60px 20px'),
  }),

  radius: z.object({
    sm: z.string().default('4px'),
    md: z.string().default('8px'),
    lg: z.string().default('12px'),
    xl: z.string().default('16px'),
    full: z.string().default('9999px'),
  }),

  buttons: z.object({
    radius: z.string().default('8px'),
    paddingX: z.string().default('20px'),
    paddingY: z.string().default('10px'),
    fontWeight: z.string().default('600'),
  }),

  forms: z.object({
    radius: z.string().default('6px'),
    borderColor: z.string().default('#e5e7eb'),
    focusColor: z.string().default('#92003b'),
    background: z.string().default('#ffffff'),
  }),
});

export type Theme = z.infer<typeof themeSchema>;

export const DEFAULT_THEME: Theme = themeSchema.parse({
  colors: {}, typography: { scale: {} }, layout: {}, radius: {}, buttons: {}, forms: {},
});

// ===== Integrations schema =====
export const recaptchaScopeKeys = ['forms', 'login', 'register', 'forgot-password'] as const;
export type RecaptchaScope = (typeof recaptchaScopeKeys)[number];

export const integrationsSchema = z.object({
  // Override del .env (priorità: settings > env). Lascia vuoto per usare .env.
  anthropicApiKey: z.string().default(''),
  anthropicModel: z.string().default(''),
  // Google reCAPTCHA v3
  recaptcha: z.object({
    siteKey: z.string().default(''),
    secretKey: z.string().default(''),
    threshold: z.number().min(0).max(1).default(0.5),
    enableOn: z.array(z.enum(recaptchaScopeKeys)).default([]),
  }),
  // Provider email: 'console' (dev), 'smtp', 'brevo'
  emailProvider: z.enum(['console', 'smtp', 'brevo']).default('console'),
  // SMTP override (lascia vuoto per usare .env)
  smtp: z.object({
    host: z.string().default(''),
    port: z.string().default(''),
    user: z.string().default(''),
    pass: z.string().default(''),
    from: z.string().default(''),
    secure: z.boolean().default(false),
  }),
  // Brevo (ex Sendinblue) transactional API
  brevo: z.object({
    apiKey: z.string().default(''),
    fromEmail: z.string().default(''),
    fromName: z.string().default(''),
  }),
  // Google Analytics / GTM
  ga4Id: z.string().default(''),
  gtmId: z.string().default(''),
});

export type Integrations = z.infer<typeof integrationsSchema>;
export const DEFAULT_INTEGRATIONS: Integrations = integrationsSchema.parse({ recaptcha: {}, smtp: {}, brevo: {} });

/**
 * Genera la stringa CSS con tutte le custom property `--en-*`
 * Output: "--en-color-primary: #92003b; --en-font-heading: ...;"
 */
export function themeToCssVariables(theme: Theme): string {
  const c = theme.colors;
  const t = theme.typography;
  const l = theme.layout;
  const r = theme.radius;
  const b = theme.buttons;
  const f = theme.forms;

  return [
    `--en-color-primary:${c.primary}`,
    `--en-color-primary-hover:${c.primaryHover}`,
    `--en-color-secondary:${c.secondary}`,
    `--en-color-accent:${c.accent}`,
    `--en-color-text:${c.text}`,
    `--en-color-text-muted:${c.textMuted}`,
    `--en-color-text-inverse:${c.textInverse}`,
    `--en-color-bg:${c.background}`,
    `--en-color-surface:${c.surface}`,
    `--en-color-border:${c.border}`,
    `--en-color-success:${c.success}`,
    `--en-color-warning:${c.warning}`,
    `--en-color-danger:${c.danger}`,
    `--en-color-info:${c.info}`,
    `--en-color-custom1:${c.custom1}`,
    `--en-color-custom2:${c.custom2}`,
    `--en-color-custom3:${c.custom3}`,

    `--en-font-heading:${t.fontHeading}`,
    `--en-font-body:${t.fontBody}`,
    `--en-font-mono:${t.fontMono}`,
    `--en-size-base:${t.sizeBase}`,
    `--en-size-xs:${t.scale.xs}`,
    `--en-size-sm:${t.scale.sm}`,
    `--en-size-md:${t.scale.md}`,
    `--en-size-lg:${t.scale.lg}`,
    `--en-size-xl:${t.scale.xl}`,
    `--en-size-2xl:${t.scale['2xl']}`,
    `--en-size-3xl:${t.scale['3xl']}`,
    `--en-size-4xl:${t.scale['4xl']}`,
    `--en-size-5xl:${t.scale['5xl']}`,
    `--en-size-6xl:${t.scale['6xl']}`,
    `--en-line-height:${t.lineHeight}`,
    `--en-heading-line-height:${t.headingLineHeight}`,
    `--en-heading-weight:${t.headingWeight}`,
    `--en-body-weight:${t.bodyWeight}`,
    `--en-heading-transform:${t.headingTransform ?? 'none'}`,
    `--en-body-transform:${t.bodyTransform ?? 'none'}`,
    `--en-heading-style:${t.headingStyle ?? 'normal'}`,
    `--en-body-style:${t.bodyStyle ?? 'normal'}`,
    `--en-heading-letter-spacing:${t.headingLetterSpacing ?? 'normal'}`,
    `--en-body-letter-spacing:${t.bodyLetterSpacing ?? 'normal'}`,
    `--en-heading-decoration:${t.headingDecoration ?? 'none'}`,

    `--en-container-max:${l.containerMax}`,
    `--en-gutter:${l.gutter}`,
    `--en-bp-tablet:${l.breakpointTablet}`,
    `--en-bp-mobile:${l.breakpointMobile}`,
    `--en-section-padding:${l.sectionPadding}`,

    `--en-radius-sm:${r.sm}`,
    `--en-radius-md:${r.md}`,
    `--en-radius-lg:${r.lg}`,
    `--en-radius-xl:${r.xl}`,
    `--en-radius-full:${r.full}`,

    `--en-button-radius:${b.radius}`,
    `--en-button-px:${b.paddingX}`,
    `--en-button-py:${b.paddingY}`,
    `--en-button-fw:${b.fontWeight}`,

    `--en-form-radius:${f.radius}`,
    `--en-form-border:${f.borderColor}`,
    `--en-form-focus:${f.focusColor}`,
    `--en-form-bg:${f.background}`,
  ].join(';');
}
