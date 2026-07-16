'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MediaField } from '@/components/editor/MediaField';
import { ROLE_LABELS } from '@/lib/permissions';

interface InitialState {
  email: string;
  name: string;
  role: string;
  bio: string;
  slug: string;
  avatarUrl: string;
  socials: Record<string, string>;
  locked: boolean;
}

export function UserEditForm({ id, initial, canChangeRole }: { id: string; initial: InitialState; canChangeRole: boolean }) {
  const [name, setName] = useState(initial.name);
  const [role, setRole] = useState(initial.role);
  const [bio, setBio] = useState(initial.bio);
  const [slug, setSlug] = useState(initial.slug);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [socials, setSocials] = useState(initial.socials);
  const [locked, setLocked] = useState(initial.locked);
  const [newPassword, setNewPassword] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();

  function save() {
    start(async () => {
      const payload: Record<string, unknown> = { name, bio, slug: slug || null, avatarUrl: avatarUrl || null, socials };
      if (canChangeRole) { payload.role = role; payload.locked = locked; }
      if (newPassword) payload.newPassword = newPassword;
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error('Errore', { description: err?.error?.message });
        return;
      }
      toast.success('Salvato');
      setNewPassword('');
      router.refresh();
    });
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm">
        <Link href="/admin/users"><ArrowLeft className="h-4 w-4" /> Utenti</Link>
      </Button>

      <Card>
        <CardHeader><CardTitle>Profilo</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Email</Label><Input value={initial.email} disabled /></div>
            <div className="space-y-1.5"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>Ruolo</Label>
              <Select value={role} onValueChange={setRole} disabled={!canChangeRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Slug pubblico</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="es. mario-rossi" /></div>
          </div>
          <div className="space-y-1.5"><Label>Bio</Label><Textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Avatar</Label><MediaField value={avatarUrl} onChange={setAvatarUrl} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Social</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          {['twitter', 'linkedin', 'instagram', 'github', 'facebook', 'youtube'].map((k) => (
            <div key={k} className="space-y-1.5">
              <Label className="capitalize">{k}</Label>
              <Input value={socials[k] ?? ''} onChange={(e) => setSocials({ ...socials, [k]: e.target.value })} placeholder="https://..." />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Sicurezza</CardTitle><CardDescription>Reset password e blocco account</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nuova password</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Lascia vuoto per non cambiare" />
          </div>
          {canChangeRole && (
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div><Label>Blocca account</Label><p className="text-xs text-muted-foreground mt-0.5">Impedisce login</p></div>
              <Switch checked={locked} onCheckedChange={setLocked} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-8 -mb-8 px-8 py-3 bg-card border-t flex justify-end z-20">
        <Button onClick={save} disabled={pending} size="lg">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salva
        </Button>
      </div>
    </>
  );
}
