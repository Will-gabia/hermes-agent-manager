import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import { readFile } from 'fs/promises';
import { adminAuth } from '../middleware/auth.ts';

const prisma = new PrismaClient();
const caddy = new Hono();

caddy.use('*', adminAuth);

caddy.get('/content', async (c) => {
  const config = await prisma.config.findUnique({ where: { id: 1 } });
  
  if (!config || !config.caddyfile_path) {
    return c.json({ error: 'Caddyfile path not configured' }, 404);
  }

  try {
    const content = await readFile(config.caddyfile_path, 'utf-8');
    return c.json({ path: config.caddyfile_path, content });
  } catch (e) {
    return c.json({ 
      error: 'Failed to read Caddyfile', 
      detail: String(e),
      path: config.caddyfile_path 
    }, 500);
  }
});

caddy.get('/download', async (c) => {
  const config = await prisma.config.findUnique({ where: { id: 1 } });
  
  if (!config || !config.caddyfile_path) {
    return c.json({ error: 'Caddyfile path not configured' }, 404);
  }

  try {
    const content = await readFile(config.caddyfile_path, 'utf-8');
    
    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename="Caddyfile"',
      },
    });
  } catch (e) {
    return c.json({ error: 'Failed to download Caddyfile', detail: String(e) }, 500);
  }
});

export default caddy;
