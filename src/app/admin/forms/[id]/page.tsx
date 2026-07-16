import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { formFieldSchema, actionSchema, formSettingsSchema, type FormField, type FormAction, type FormSettings } from '@/lib/forms';
import { FormBuilder } from './builder';

export const dynamic = 'force-dynamic';

export default async function FormBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const { id } = await params;
  const form = await prisma.form.findUnique({ where: { id } });
  if (!form) notFound();

  const fields = (z.array(formFieldSchema).safeParse(form.fields).data ?? []) as FormField[];
  const actions = (z.array(actionSchema).safeParse(form.actions).data ?? []) as FormAction[];
  const settings = (formSettingsSchema.safeParse(form.settings).data ?? formSettingsSchema.parse({})) as FormSettings;

  return (
    <FormBuilder
      id={form.id}
      initial={{
        name: form.name,
        description: form.description ?? '',
        fields,
        actions,
        settings,
        recipients: form.recipients ?? '',
        status: form.status,
      }}
    />
  );
}
