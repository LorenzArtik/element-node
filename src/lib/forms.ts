import { z } from 'zod';

// ===== Field schema =====
export const fieldTypes = [
  'text', 'email', 'tel', 'url', 'number', 'textarea', 'select', 'radio',
  'checkbox', 'checkbox-group', 'date', 'time', 'file', 'hidden', 'consent',
] as const;
export type FieldType = (typeof fieldTypes)[number];

export const formFieldSchema = z.object({
  id: z.string(),
  type: z.enum(fieldTypes),
  name: z.string().min(1),
  label: z.string(),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  required: z.boolean().default(false),
  defaultValue: z.string().optional(),
  // Per select/radio/checkbox-group
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  // Per number / text
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  // Per textarea
  rows: z.number().optional(),
  // Per file
  accept: z.string().optional(),
  // Conditional logic: mostra solo se {field}=={value}
  showIf: z.object({ field: z.string(), eq: z.unknown() }).optional(),
  // Larghezza colonne (1-12 grid)
  width: z.number().min(1).max(12).default(12),
});

export type FormField = z.infer<typeof formFieldSchema>;

// ===== Action schema =====
export const actionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('email'),
    to: z.string(),
    cc: z.string().optional(),
    subject: z.string().default('Nuova submission da {form}'),
    template: z.string().optional(), // {{field}} placeholders
    replyToField: z.string().optional(), // nome campo per reply-to (es. 'email')
  }),
  z.object({
    type: z.literal('autoresponder'),
    toField: z.string(), // nome campo email destinatario (es. 'email')
    subject: z.string().default('Grazie per averci contattato'),
    body: z.string(),
  }),
  z.object({
    type: z.literal('webhook'),
    url: z.string().url(),
    method: z.enum(['POST', 'PUT']).default('POST'),
    headers: z.record(z.string(), z.string()).optional(),
  }),
  z.object({
    type: z.literal('mailchimp'),
    apiKey: z.string(),
    listId: z.string(),
    emailField: z.string().default('email'),
    nameField: z.string().optional(),
  }),
  z.object({
    type: z.literal('db-only'),
  }),
  z.object({
    type: z.literal('redirect'),
    url: z.string(),
  }),
]);

export type FormAction = z.infer<typeof actionSchema>;

// ===== Form settings =====
export const formSettingsSchema = z.object({
  successMessage: z.string().default('Grazie! Ti contatteremo presto.'),
  errorMessage: z.string().default('Si è verificato un errore. Riprova.'),
  submitText: z.string().default('Invia'),
  captcha: z.enum(['none', 'honeypot', 'recaptcha-v3']).default('honeypot'),
  recaptchaSiteKey: z.string().optional(),
  recaptchaSecretKey: z.string().optional(),
  gdprText: z.string().optional(),
  redirectUrl: z.string().optional(),
  // Limit submission per IP per 24h
  rateLimitPerIp: z.number().int().min(0).default(20),
});

export type FormSettings = z.infer<typeof formSettingsSchema>;

export const DEFAULT_FORM_SETTINGS = formSettingsSchema.parse({});

export const DEFAULT_FORM_FIELDS: FormField[] = [
  { id: 'f_name', type: 'text', name: 'name', label: 'Nome', required: true, width: 6 },
  { id: 'f_email', type: 'email', name: 'email', label: 'Email', required: true, width: 6 },
  { id: 'f_message', type: 'textarea', name: 'message', label: 'Messaggio', required: true, rows: 4, width: 12 },
];

/**
 * Valida i dati submitted contro lo schema dei field.
 * Ritorna errori per ogni campo o {} se valido.
 */
export function validateSubmission(fields: FormField[], data: Record<string, unknown>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    if (f.type === 'hidden' || f.type === 'consent') continue;
    // Conditional: skip se non visibile
    if (f.showIf) {
      const condValue = data[f.showIf.field];
      if (condValue !== f.showIf.eq) continue;
    }
    const v = data[f.name];
    const isEmpty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
    if (f.required && isEmpty) {
      errors[f.name] = `Il campo "${f.label}" è obbligatorio`;
      continue;
    }
    if (isEmpty) continue;
    const str = String(v);
    if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
      errors[f.name] = 'Email non valida';
    }
    if (f.type === 'url') {
      try { new URL(str); } catch { errors[f.name] = 'URL non valido'; }
    }
    if (f.pattern) {
      try { if (!new RegExp(f.pattern).test(str)) errors[f.name] = 'Formato non valido'; } catch {}
    }
    if (f.type === 'number') {
      const n = Number(str);
      if (Number.isNaN(n)) errors[f.name] = 'Valore non numerico';
      else if (f.min != null && n < f.min) errors[f.name] = `Minimo ${f.min}`;
      else if (f.max != null && n > f.max) errors[f.name] = `Massimo ${f.max}`;
    }
  }
  // Consent obbligatorio
  for (const f of fields) {
    if (f.type === 'consent' && f.required && !data[f.name]) {
      errors[f.name] = `Devi accettare "${f.label}"`;
    }
  }
  return errors;
}

/**
 * Sostituisce {{fieldName}} con il valore dato.
 */
export function interpolateTemplate(template: string, data: Record<string, unknown>, formName?: string): string {
  return template
    .replace(/\{\{form\}\}|\{form\}/g, formName ?? '')
    .replace(/\{\{(\w+)\}\}/g, (_, name) => {
      const v = data[name];
      return v == null ? '' : Array.isArray(v) ? v.join(', ') : String(v);
    });
}
