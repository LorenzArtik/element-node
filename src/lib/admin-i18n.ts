/**
 * i18n minimale per l'interfaccia admin/editor.
 * Default: INGLESE (prodotto internazionale). Le installazioni italiane
 * impostano NEXT_PUBLIC_ADMIN_LOCALE=it nel .env (valutato a build time:
 * dopo averlo cambiato serve una rebuild).
 * Uso: t('Pubblica', 'Publish') — coppie inline, niente dizionario centrale.
 */
export const ADMIN_LOCALE: 'it' | 'en' =
  process.env.NEXT_PUBLIC_ADMIN_LOCALE === 'it' ? 'it' : 'en';

export function t(it: string, en: string): string {
  return ADMIN_LOCALE === 'en' ? en : it;
}
