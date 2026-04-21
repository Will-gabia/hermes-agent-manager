import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';

import authRoutes from './routes/auth.ts';
import configRoutes from './routes/config.ts';
import serverRoutes from './routes/servers.ts';
import containerRoutes from './routes/containers.ts';
import caddyRoutes from './routes/caddy.ts';
import templateRoutes from './routes/templates.ts';
import bastionRoutes from './routes/bastion.ts';

import { serveStatic } from '@hono/node-server/serve-static';

export const app = new Hono();
const prisma = new PrismaClient();

app.use('*', logger());
app.use('/static/*', serveStatic({ root: './' }));
app.get('/admin-ui', serveStatic({ path: './public/index.html' }));
app.use('/public/*', serveStatic({ root: './' }));
app.get('/openapi.yaml', serveStatic({ path: './public/openapi.yaml' }));
app.use('*', cors({
  origin: '*', // For v1 MVP development
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-KEY'],
  credentials: true,
}));

app.get('/', (c) => {
  return c.text('Hermes Agent Manager API v1');
});

// Health check with DB status
app.get('/health', async (c) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return c.json({ status: 'ok', db: 'connected' });
  } catch (e) {
    return c.json({ status: 'error', db: 'disconnected', error: String(e) }, 500);
  }
});

// Register routes
app.route('/admin', authRoutes);
app.route('/api/config', configRoutes);
app.route('/api/servers', serverRoutes);
app.route('/api/containers', containerRoutes);
app.route('/api/caddy', caddyRoutes);
app.route('/api/templates', templateRoutes);
app.route('/api/bastion', bastionRoutes);

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
console.log(`Server is running on port ${port}`);

if (process.env.NODE_ENV !== 'test') {
  serve({
    fetch: app.fetch,
    port,
  });
}
