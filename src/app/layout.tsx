import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { ThemeStyles, BodyScripts } from '@/components/theme/ThemeStyles';
import { RecaptchaScript } from '@/components/recaptcha/RecaptchaScript';
import { getSiteSettings } from '@/lib/site-settings';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings();
  return {
    title: { default: s.name, template: `%s — ${s.name}` },
    description: s.tagline ?? 'CMS visuale moderno con AI integrata',
    icons: s.favicon ? { icon: s.favicon } : undefined,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" suppressHydrationWarning data-en-app>
      <head>
        <ThemeStyles scope="global" />
        <RecaptchaScript scopes={['forms', 'login', 'register', 'forgot-password']} />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        {children}
        <BodyScripts />
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
