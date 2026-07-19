import { prisma } from './db';
import type { PageContent, ElementNode } from './widgets-schema';

/**
 * Unificazione form: i widget contact-form con campi inline vengono
 * "materializzati" in entità Form (visibili in /admin/forms) e il widget
 * viene agganciato via formId. Un solo modello: i form vivono nella sezione Form.
 */
interface InlineForm {
  el: ElementNode;
  fields: unknown[];
  recipient: string | null;
  submitText: string | null;
}

function collectInlineForms(content: PageContent | null | undefined): InlineForm[] {
  const found: InlineForm[] = [];
  const walkEls = (els: ElementNode[] | undefined) => {
    for (const el of els ?? []) {
      if (el.type === 'contact-form') {
        const s = el.settings as Record<string, unknown>;
        const fields = Array.isArray(s.fields) ? (s.fields as unknown[]) : [];
        if (!s.formId && fields.length > 0) {
          found.push({ el, fields, recipient: (s.recipient as string) || null, submitText: (s.submitText as string) || null });
        }
      }
      if (el.type === 'box') {
        walkEls(((el.settings as Record<string, unknown>).children as ElementNode[]) ?? []);
      }
    }
  };
  for (const section of content?.sections ?? []) {
    for (const col of section.columns ?? []) walkEls(col.elements as ElementNode[]);
  }
  return found;
}

export async function materializeInlineForms(
  content: PageContent | null | undefined,
  pageTitle: string
): Promise<{ created: number; updated: number }> {
  const inline = collectInlineForms(content);
  let created = 0;
  let updated = 0;
  for (let i = 0; i < inline.length; i++) {
    const item = inline[i];
    const name = inline.length > 1 ? `Form — ${pageTitle} (${i + 1})` : `Form — ${pageTitle}`;
    const existing = await prisma.form.findFirst({ where: { name } });
    let form;
    if (existing) {
      form = await prisma.form.update({
        where: { id: existing.id },
        data: {
          fields: item.fields as never,
          recipients: item.recipient,
          settings: { ...((existing.settings as Record<string, unknown>) ?? {}), submitText: item.submitText ?? undefined } as never,
        },
      });
      updated++;
    } else {
      form = await prisma.form.create({
        data: {
          name,
          fields: item.fields as never,
          recipients: item.recipient,
          settings: (item.submitText ? { submitText: item.submitText } : {}) as never,
          status: 'ACTIVE',
        },
      });
      created++;
    }
    const s = item.el.settings as Record<string, unknown>;
    s.formId = form.id;
    delete s.fields;
    delete s.recipient;
  }
  return { created, updated };
}
