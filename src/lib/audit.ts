import { prisma } from './db';

export interface AuditPayload {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  ua?: string | null;
}

export async function logAudit(payload: AuditPayload): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        actorId: payload.actorId ?? undefined,
        actorEmail: payload.actorEmail ?? undefined,
        action: payload.action,
        entity: payload.entity,
        entityId: payload.entityId,
        before: (payload.before ?? undefined) as never,
        after: (payload.after ?? undefined) as never,
        ip: payload.ip ?? undefined,
        ua: payload.ua ?? undefined,
      },
    });
  } catch (err) {
    // Audit non deve mai bloccare il flusso principale
    // eslint-disable-next-line no-console
    console.error('[audit] failed', err);
  }
}
