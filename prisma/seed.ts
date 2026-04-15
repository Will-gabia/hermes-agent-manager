import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial templates...');

  const templates = [
    {
      id: 'default',
      display_name: 'Hermes Default',
      description: 'Standard hermes agent template.',
      metadata: JSON.stringify({
        image: 'nousresearch/hermes-agent:latest',
        template: 'default'
      }),
    }
  ];

  for (const t of templates) {
    await prisma.containerTemplate.upsert({
      where: { id: t.id },
      update: t,
      create: t,
    });
  }

  // Initial Config if not exists
  await prisma.config.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      caddyfile_path: './config/Caddyfile',
    },
  });

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
