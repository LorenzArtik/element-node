/**
 * Matrix dei permessi per ruolo. Centralizzati qui per facile audit.
 *
 * Ruoli (paragone WordPress):
 *  - ADMIN      → Administrator
 *  - EDITOR     → Editor (può pubblicare contenuti di tutti)
 *  - AUTHOR     → Author (scrive ma pubblica solo i propri contenuti)
 *  - VIEWER     → Contributor (sola lettura backoffice)
 *  - SUBSCRIBER → Subscriber (utente registrato, no backoffice)
 */

export type Role = 'ADMIN' | 'EDITOR' | 'AUTHOR' | 'VIEWER' | 'SUBSCRIBER';

export type Capability =
  | 'site.settings.read'
  | 'site.settings.write'
  | 'page.read'
  | 'page.create'
  | 'page.update'
  | 'page.update.own'
  | 'page.delete'
  | 'page.publish'
  | 'media.read'
  | 'media.upload'
  | 'media.delete'
  | 'template.read'
  | 'template.write'
  | 'template.delete'
  | 'user.read'
  | 'user.write'
  | 'user.delete'
  | 'audit.read'
  | 'redirect.write'
  | 'ai.use'
  | 'admin.access'
  | 'profile.update.own';

const MATRIX: Record<Role, Capability[]> = {
  ADMIN: [
    'site.settings.read', 'site.settings.write',
    'page.read', 'page.create', 'page.update', 'page.update.own', 'page.delete', 'page.publish',
    'media.read', 'media.upload', 'media.delete',
    'template.read', 'template.write', 'template.delete',
    'user.read', 'user.write', 'user.delete',
    'audit.read', 'redirect.write', 'ai.use',
    'admin.access', 'profile.update.own',
  ],
  EDITOR: [
    'site.settings.read',
    'page.read', 'page.create', 'page.update', 'page.update.own', 'page.publish',
    'media.read', 'media.upload',
    'template.read',
    'ai.use', 'admin.access', 'profile.update.own',
  ],
  AUTHOR: [
    'page.read', 'page.create', 'page.update.own',
    'media.read', 'media.upload',
    'ai.use', 'admin.access', 'profile.update.own',
  ],
  VIEWER: [
    'site.settings.read',
    'page.read',
    'media.read',
    'template.read',
    'admin.access', 'profile.update.own',
  ],
  SUBSCRIBER: [
    'profile.update.own',
  ],
};

export function can(role: Role | string | undefined, cap: Capability): boolean {
  if (!role) return false;
  return MATRIX[role as Role]?.includes(cap) ?? false;
}

export function assertCan(role: Role | string | undefined, cap: Capability): void {
  if (!can(role, cap)) {
    const err = new Error(`Forbidden: missing capability ${cap}`);
    (err as Error & { status: number }).status = 403;
    throw err;
  }
}

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Amministratore',
  EDITOR: 'Editor',
  AUTHOR: 'Autore',
  VIEWER: 'Lettore',
  SUBSCRIBER: 'Iscritto',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN: 'Accesso totale a tutte le funzioni',
  EDITOR: 'Crea, modifica e pubblica contenuti propri e di altri',
  AUTHOR: 'Crea e modifica solo i propri contenuti',
  VIEWER: 'Sola lettura del backoffice',
  SUBSCRIBER: 'Solo accesso al proprio profilo (utente pubblico)',
};
