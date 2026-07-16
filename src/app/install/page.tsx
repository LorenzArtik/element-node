import Link from 'next/link';
import { lockExists } from '@/lib/install-status';
import { InstallWizard } from './wizard';

export const dynamic = 'force-dynamic';

export default function InstallPage() {
  if (lockExists()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40">
        <div className="bg-card border rounded-xl p-8 max-w-md text-center space-y-3 shadow-lg">
          <h1 className="text-2xl font-bold">Element Node è già installato</h1>
          <p className="text-sm text-muted-foreground">
            Il file <code className="font-mono">.install.lock</code> è presente. Per re-installare, eliminalo dal filesystem.
          </p>
          <Link href="/login" className="inline-block px-5 py-2.5 bg-[#92003b] text-white rounded-lg font-medium hover:bg-[#7a0030]">
            Vai al login
          </Link>
        </div>
      </div>
    );
  }

  return <InstallWizard />;
}
