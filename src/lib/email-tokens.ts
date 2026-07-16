import { randomBytes } from 'crypto';
import { prisma } from './db';

export type EmailTokenType = 'VERIFY' | 'RESET' | 'INVITE';

const TTL_BY_TYPE: Record<EmailTokenType, number> = {
  VERIFY: 7 * 24 * 60 * 60 * 1000,
  RESET: 60 * 60 * 1000,
  INVITE: 7 * 24 * 60 * 60 * 1000,
};

export async function createEmailToken(userId: string, type: EmailTokenType): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TTL_BY_TYPE[type]);
  await prisma.emailToken.create({ data: { userId, token, type, expiresAt } });
  return token;
}

export async function consumeEmailToken(token: string, type: EmailTokenType): Promise<{ userId: string } | null> {
  const row = await prisma.emailToken.findUnique({ where: { token } });
  if (!row || row.type !== type || row.usedAt || row.expiresAt < new Date()) return null;
  await prisma.emailToken.update({ where: { token }, data: { usedAt: new Date() } });
  return { userId: row.userId };
}
