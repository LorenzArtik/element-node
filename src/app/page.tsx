import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PublicShell } from '@/components/public/PublicShell';
import { getSiteSettings } from '@/lib/site-settings';
import type { Metadata } from 'next';
import type { PageContent } from '@/lib/widgets-schema';
import MaintenancePage from './maintenance/page';
import { isInstalled } from '@/lib/install-status';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const home = await prisma.page.findFirst({ where: { isHomepage: true, status: 'PUBLISHED' } });
  const site = await getSiteSettings();
  if (!home) return { title: site.name };
  return {
    title: home.seoTitle || home.title,
    description: home.seoDesc || site.tagline || undefined,
    openGraph: {
      title: home.seoTitle || home.title,
      description: home.seoDesc || site.tagline || undefined,
      images: home.ogImage ? [home.ogImage] : undefined,
    },
  };
}

export default async function HomePage() {
  if (!(await isInstalled())) redirect('/install');
  const site = await getSiteSettings();
  if (site.maintenance) return <MaintenancePage />;
  const home = await prisma.page.findFirst({ where: { isHomepage: true, status: 'PUBLISHED' } });
  if (!home) {
    redirect('/admin');
  }
  return (
    <PublicShell
      content={home.content as unknown as PageContent}
      page={{ title: home.title, slug: home.slug, isHomepage: true }}
      path="/"
    />
  );
}
