import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import {
  LayoutDashboard, FileText, Image as ImageIcon, Settings, Sparkles,
  Palette, PanelTop, Newspaper, Database, MessageSquare, Users, ArrowRightLeft, Inbox,
} from 'lucide-react';
import { AuthProvider } from '@/components/providers/session';
import { ThemeProvider } from '@/components/providers/theme';
import { NavigationProgress } from '@/components/admin/NavigationProgress';
import { UserMenu } from '@/components/admin/UserMenu';
import { ROLE_LABELS } from '@/lib/permissions';
import { getLicenseInfo } from '@/lib/license-client';
import { getLatestVersion, semverGt, currentVersion } from '@/lib/update-status';

const NAV_GROUPS = [
  {
    label: '',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Contenuti',
    items: [
      { href: '/admin/pages', label: 'Pagine', icon: FileText },
      { href: '/admin/posts?type=post', label: 'Articoli', icon: Newspaper },
      { href: '/admin/post-types', label: 'Tipi contenuto', icon: Database },
      { href: '/admin/media', label: 'Media', icon: ImageIcon },
    ],
  },
  {
    label: 'Design',
    items: [
      { href: '/admin/theme-builder', label: 'Theme Builder', icon: PanelTop },
      { href: '/admin/popups', label: 'Popup', icon: MessageSquare },
      { href: '/admin/forms', label: 'Form', icon: Inbox },
    ],
  },
  {
    label: 'Sito',
    items: [
      { href: '/admin/users', label: 'Utenti', icon: Users },
      { href: '/admin/redirects', label: 'Redirect', icon: ArrowRightLeft },
      { href: '/admin/settings/site', label: 'Site Settings', icon: Palette },
      { href: '/admin/settings', label: 'Sistema', icon: Settings },
    ],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const license = await getLicenseInfo().catch(() => ({ key: '', valid: true, plan: '', reason: '', checkedAt: '', currentPeriodEnd: null }));
  const latest = license.valid ? await getLatestVersion().catch(() => null) : null;
  const updateAvailable = !!latest && semverGt(latest, currentVersion());

  const roleLabel = ROLE_LABELS[session.user.role as keyof typeof ROLE_LABELS] ?? session.user.role;

  return (
    <AuthProvider session={session}>
      <ThemeProvider>
      <NavigationProgress />
      <div className="min-h-screen bg-muted/30">
        <aside className="fixed left-0 top-0 bottom-0 w-64 border-r bg-card flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center gap-2.5 px-5 border-b shrink-0">
            <svg
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-9 w-9 shrink-0"
              aria-hidden
            >
              <defs>
                <linearGradient id="admin-en-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#admin-en-grad)" />
              <path
                d="M13 13h14M13 20h10M13 27h14"
                stroke="white"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <circle cx="29" cy="20" r="2" fill="white" />
            </svg>
            <div className="leading-none">
              <div className="font-bold text-[15px] tracking-tight">
                Element
                <span
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 60%, #f97316 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  Node
                </span>
              </div>
              <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                CMS Visual
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
            {NAV_GROUPS.map((group, gi) => (
              <div key={gi}>
                {group.label && (
                  <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                    {group.label}
                  </div>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-foreground/70 hover:bg-accent hover:text-foreground transition-colors"
                      >
                        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer: user menu (profile + theme + logout in dropdown) */}
          <div className="p-3 border-t shrink-0">
            <UserMenu
              name={session.user.name ?? ''}
              email={session.user.email}
              role={roleLabel}
              avatarUrl={session.user.image}
            />
          </div>
        </aside>

        <main className="ml-64 min-h-screen">
          {updateAvailable && (
            <div className="border-b border-sky-200 bg-sky-50 px-8 py-2 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-200">
              Aggiornamento disponibile: v{latest} (installata v{currentVersion()}).{' '}
              <Link href="/admin/settings/site" className="font-medium underline underline-offset-2">Vai agli aggiornamenti</Link>
            </div>
          )}
          {!license.valid && (
            <div className="border-b border-amber-200 bg-amber-50 px-8 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              {license.key
                ? 'Licenza non attiva: aggiornamenti e supporto sospesi. '
                : 'Aggiornamenti non attivi: inserisci la licenza per ricevere update e patch di sicurezza. '}
              <Link href="/admin/settings/site" className="font-medium underline underline-offset-2">Gestisci licenza</Link>
            </div>
          )}
          {children}
        </main>
      </div>
      </ThemeProvider>
    </AuthProvider>
  );
}
