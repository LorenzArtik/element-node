import { prisma } from '@/lib/db';
import { MediaLibrary } from './library';

export const dynamic = 'force-dynamic';

export default async function MediaPage() {
  const items = await prisma.media.findMany({ orderBy: { createdAt: 'desc' } });
  // Serialize Date to ISO so client can pass it around
  const serialized = items.map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
  }));
  return <MediaLibrary initialItems={serialized} />;
}
