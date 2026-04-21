import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import { apiAuth } from '../middleware/auth.ts';
import { OrchestrationService } from '../services/orchestration.service.ts';
import { RemoteDockerService } from '../services/remote-docker.service.ts';

const prisma = new PrismaClient();
const containers = new Hono();
const orch = new OrchestrationService();

containers.use('*', apiAuth);

containers.get('/', async (c) => {
  const all = c.req.query('all') === 'true';
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const search = c.req.query('search') || '';
  const showDeleted = c.req.query('show_deleted') === 'true';
  const skip = (page - 1) * limit;

  const where: any = {};
  if (search) {
    where.domain_name = { contains: search };
  }
  if (!showDeleted) {
    where.status = { not: 'deleted' };
  }

  if (all) {
    const items = await prisma.container.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { server: true, template: true },
    });
    // Mask tokens
    return c.json({ 
      items: items.map(c => ({ 
        ...c, 
        api_token: c.api_token ? '********' : null,
        server_api_token: c.server_api_token ? '********' : null,
        server: c.server ? { ...c.server, api_token: '********' } : null
      })), 
      total: items.length 
    });
  }

  const [items, total] = await prisma.$transaction([
    prisma.container.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { server: true, template: true },
    }),
    prisma.container.count({ where }),
  ]);

  return c.json({
    items: items.map(c => ({ 
      ...c, 
      api_token: c.api_token ? '********' : null,
      server_api_token: c.server_api_token ? '********' : null,
      server: c.server ? { ...c.server, api_token: '********' } : null
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

// Explicit endpoint to reveal token, session-only (adminAuth)
containers.get('/:id/token', async (c) => {
  const id = c.req.param('id');
  const container = await prisma.container.findUnique({ where: { id } });
  if (!container) return c.json({ error: 'Container not found' }, 404);
  return c.json({ 
    api_token: container.api_token,
    server_api_token: container.server_api_token 
  });
});

containers.post('/', async (c) => {
  const { server_id, template_id } = await c.req.json();
  try {
    const container = await orch.createContainer(server_id, template_id);
    return c.json(container);
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

containers.post('/:id/start', async (c) => {
  const id = c.req.param('id');
  const container = await prisma.container.findUnique({ where: { id }, include: { server: true } });
  const remoteRef = container?.container_name || container?.container_id;
  
  const ip = container?.server?.remote_ip || container?.server_ip;
  const port = container?.server?.port || container?.server_port;
  const token = container?.server?.api_token || container?.server_api_token;

  if (!container || !remoteRef || !ip || !port || !token) {
    return c.json({ error: 'Container connection info missing (server might have been deleted)' }, 404);
  }

  try {
    const docker = new RemoteDockerService({ remoteIp: ip, port, apiToken: token });
    await docker.startContainer(remoteRef);
    
    // Fetch actual status from remote
    const info = await docker.getContainer(remoteRef);
    const updated = await prisma.container.update({ 
      where: { id }, 
      data: { status: info.status } 
    });
    
    // Sync Caddyfile
    const config = await prisma.config.findUnique({ where: { id: 1 } });
    if (config?.caddyfile_path) await orch.refreshCaddyfile(config.caddyfile_path);

    return c.json(updated);
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

containers.post('/:id/stop', async (c) => {
  const id = c.req.param('id');
  const container = await prisma.container.findUnique({ where: { id }, include: { server: true } });
  const remoteRef = container?.container_name || container?.container_id;
  
  const ip = container?.server?.remote_ip || container?.server_ip;
  const port = container?.server?.port || container?.server_port;
  const token = container?.server?.api_token || container?.server_api_token;

  if (!container || !remoteRef || !ip || !port || !token) {
    return c.json({ error: 'Container connection info missing (server might have been deleted)' }, 404);
  }

  try {
    const docker = new RemoteDockerService({ remoteIp: ip, port, apiToken: token });
    await docker.stopContainer(remoteRef);
    
    // Fetch actual status from remote
    const info = await docker.getContainer(remoteRef);
    const updated = await prisma.container.update({ 
      where: { id }, 
      data: { status: info.status } 
    });
    
    // Sync Caddyfile
    const config = await prisma.config.findUnique({ where: { id: 1 } });
    if (config?.caddyfile_path) await orch.refreshCaddyfile(config.caddyfile_path);

    return c.json(updated);
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

containers.post('/:id/refresh', async (c) => {
  const id = c.req.param('id');
  const container = await prisma.container.findUnique({ where: { id }, include: { server: true } });
  const remoteRef = container?.container_name || container?.container_id;
  
  const ip = container?.server?.remote_ip || container?.server_ip;
  const port = container?.server?.port || container?.server_port;
  const token = container?.server?.api_token || container?.server_api_token;

  if (!container || !remoteRef || !ip || !port || !token) {
    return c.json({ error: 'Container connection info missing (server might have been deleted)' }, 404);
  }

  try {
    const docker = new RemoteDockerService({ remoteIp: ip, port, apiToken: token });
    const info = await docker.getContainer(remoteRef);
    const updated = await prisma.container.update({ where: { id }, data: { status: info.status } });
    return c.json(updated);
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

containers.delete('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    await orch.deleteContainer(id);
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

// Templates helper
containers.get('/templates', async (c) => {
  const items = await prisma.containerTemplate.findMany({ where: { enabled: true } });
  return c.json(items);
});

// Proxy for playground chat to avoid CORS
containers.post('/proxy-chat', async (c) => {
  const { domain, token, payload } = await c.req.json();
  
  try {
    const response = await fetch(`https://${domain}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return c.json(errorData, response.status as any);
    }

    const data = await response.json();
    return c.json(data);
  } catch (e) {
    return c.json({ error: { message: String(e) } }, 500);
  }
});

export default containers;
