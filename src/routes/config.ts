import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import { adminAuth } from '../middleware/auth.ts';

const prisma = new PrismaClient();
const config = new Hono();

config.use('*', adminAuth);

config.get('/', async (c) => {
  const conf = await prisma.config.findUnique({
    where: { id: 1 },
  });
  
  // Mask sensitive values
  if (conf) {
    if (conf.cloudflare_api_key) conf.cloudflare_api_key = '********';
  }

  return c.json(conf);
});

config.put('/', async (c) => {
  const body = await c.req.json();
  
  // Don't update with masked value
  if (body.cloudflare_api_key === '********') {
    delete body.cloudflare_api_key;
  }

  const conf = await prisma.config.upsert({
    where: { id: 1 },
    update: body,
    create: { ...body, id: 1 },
  });

  return c.json(conf);
});

export default config;
