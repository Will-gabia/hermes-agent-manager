import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import { adminAuth } from '../middleware/auth.ts';

const prisma = new PrismaClient();
const templates = new Hono();

templates.use('*', adminAuth);

// List all templates
templates.get('/', async (c) => {
  const items = await prisma.containerTemplate.findMany({
    orderBy: { id: 'asc' }
  });
  return c.json(items);
});

// Create/Upsert template
templates.post('/', async (c) => {
  const { id, display_name, description, enabled, metadata } = await c.req.json();
  
  const item = await prisma.containerTemplate.upsert({
    where: { id },
    update: { display_name, description, enabled, metadata },
    create: { id, display_name, description, enabled, metadata },
  });

  return c.json(item);
});

// Delete template
templates.delete('/:id', async (c) => {
  const id = c.req.param('id');
  
  await prisma.containerTemplate.delete({ where: { id } });
  return c.json({ success: true });
});

export default templates;
