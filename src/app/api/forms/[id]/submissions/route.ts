import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ApiError, handleApiError } from '@/lib/api-error';
import { assertCan } from '@/lib/permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) throw new ApiError('unauthorized', 'Non autenticato', 401);
    assertCan(session.user.role, 'template.read');
    const { id } = await params;
    const url = new URL(req.url);
    const status = url.searchParams.get('status') as 'NEW' | 'READ' | 'SPAM' | 'TRASH' | null;
    const format = url.searchParams.get('format'); // 'csv' optional
    const where: Record<string, unknown> = { formId: id };
    if (status) where.status = status;

    const subs = await prisma.formSubmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: format === 'csv' ? 5000 : 200,
    });

    if (format === 'csv') {
      const header = ['id', 'createdAt', 'status', 'ip', 'data'];
      const lines = [header.join(',')];
      for (const s of subs) {
        lines.push([
          s.id,
          s.createdAt.toISOString(),
          s.status,
          s.ip ?? '',
          `"${JSON.stringify(s.data).replace(/"/g, '""')}"`,
        ].join(','));
      }
      return new NextResponse(lines.join('\n'), {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="submissions-${id}.csv"`,
        },
      });
    }

    return NextResponse.json(subs);
  } catch (e) {
    return handleApiError(e);
  }
}
