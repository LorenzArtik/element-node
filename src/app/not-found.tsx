import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="text-6xl font-bold">404</div>
      <p className="text-muted-foreground">Pagina non trovata.</p>
      <Link href="/" className="text-primary underline">Torna alla home</Link>
    </div>
  );
}
