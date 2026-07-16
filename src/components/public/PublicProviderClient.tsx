'use client';

import { RenderContextProvider, type RenderPost } from './render-context';
import type { SiteSettings } from '@/lib/site-settings';

export function PublicProviderClient({
  site, page, post, children,
}: {
  site: SiteSettings;
  page: { title: string; slug: string; isHomepage: boolean };
  post?: RenderPost;
  children: React.ReactNode;
}) {
  return <RenderContextProvider value={{ site, page, post }}>{children}</RenderContextProvider>;
}
