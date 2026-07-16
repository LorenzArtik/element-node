import { redirect } from 'next/navigation';
import { isInstalled } from '@/lib/install-status';

export const dynamic = 'force-dynamic';

export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  if (!(await isInstalled())) redirect('/install');
  return <>{children}</>;
}
