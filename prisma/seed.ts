import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_SUPPORTS = ['title', 'editor', 'excerpt', 'featured', 'seo', 'taxonomies'];

async function ensureDefaultPostType() {
  const existing = await prisma.postType.findUnique({ where: { slug: 'post' } });
  if (existing) return;
  const pt = await prisma.postType.create({
    data: {
      slug: 'post',
      name: 'Articolo',
      plural: 'Articoli',
      icon: 'Newspaper',
      description: 'Post type predefinito per articoli/blog',
      supports: DEFAULT_SUPPORTS as never,
      menuPosition: 5,
    },
  });
  await prisma.taxonomy.createMany({
    data: [
      { slug: 'category', name: 'Categoria', plural: 'Categorie', hierarchical: true, postTypeId: pt.id },
      { slug: 'tag', name: 'Tag', plural: 'Tag', hierarchical: false, postTypeId: pt.id },
    ],
  });
}

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD ?? 'admin1234';

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'Administrator',
      role: 'ADMIN',
      passwordHash,
    },
  });

  await prisma.page.upsert({
    where: { slug: 'home' },
    update: {},
    create: {
      title: 'Home',
      slug: 'home',
      status: 'PUBLISHED',
      isHomepage: true,
      publishedAt: new Date(),
      author: { connect: { email } },
      content: {
        sections: [
          {
            id: 's1',
            type: 'section',
            settings: { padding: '80px 20px', background: '#0f172a', color: '#ffffff' },
            columns: [
              {
                id: 'c1',
                type: 'column',
                width: 100,
                settings: { align: 'center' },
                elements: [
                  {
                    id: 'e1',
                    type: 'heading',
                    settings: {
                      text: 'Benvenuto in Element Node',
                      tag: 'h1',
                      align: 'center',
                      color: '#ffffff',
                      size: '4rem',
                    },
                  },
                  {
                    id: 'e2',
                    type: 'text',
                    settings: {
                      html: '<p style="text-align:center">Il CMS visuale moderno con AI integrata.</p>',
                      color: '#cbd5e1',
                      size: '1.25rem',
                    },
                  },
                  {
                    id: 'e3',
                    type: 'button',
                    settings: {
                      text: 'Inizia',
                      url: '/admin',
                      align: 'center',
                      style: 'primary',
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  });

  await ensureDefaultPostType();

  console.log('✓ Seed completato.');
  console.log(`  Admin: ${email} / ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
