'use client';

import { createContext, useContext } from 'react';
import type { SiteSettings } from '@/lib/site-settings';

export interface RenderPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  contentHtml?: string | null;
  featured?: string | null;
  publishedAt?: string | null;
  postType: { slug: string; name: string };
  author?: {
    id: string;
    name?: string | null;
    email: string;
    avatarUrl?: string | null;
    bio?: string | null;
  } | null;
  terms?: { id: string; name: string; slug: string; taxonomy: { slug: string; name: string } }[];
}

export interface RenderCtx {
  site: SiteSettings;
  page?: { title: string; slug: string; isHomepage: boolean };
  post?: RenderPost;
}

const Ctx = createContext<RenderCtx | null>(null);

export function RenderContextProvider({ value, children }: { value: RenderCtx; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRenderContext(): RenderCtx | null {
  return useContext(Ctx);
}
