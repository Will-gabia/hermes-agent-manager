import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import { adminAuth } from '../middleware/auth.ts';
import { RemoteDockerService } from '../services/remote-docker.service.ts';

const prisma = new PrismaClient();
const servers = new Hono();

servers.use('*', adminAuth);
servers.get('/', async (c) => {
  const items = await prisma.server.findMany({
    include: {
      _count: {
        select: { containers: { where: { status: { not: 'deleted' } } } }
      }
    }
  });
  // Mask tokens in the list view
  return c.json(items.map(s => ({ ...s, api_token: s.api_token ? '********' : null })));
});

// Explicit endpoint to reveal token, session-only (adminAuth)
servers.get('/:id/token', async (c) => {
  const id = c.req.param('id');
  const server = await prisma.server.findUnique({ where: { id } });
  if (!server) return c.json({ error: 'Server not found' }, 404);
  return c.json({ api_token: server.api_token });
});

servers.post('/', async (c) => {
  const { remote_ip, port, api_token, max_agents } = await c.req.json();

  // Connection test
  try {
    const docker = new RemoteDockerService({ 
      remoteIp: remote_ip, 
      port: parseInt(port), 
      apiToken: api_token 
    });
    await docker.listContainers();
  } catch (e) {
    return c.json({ error: 'Failed to connect to remote server: ' + String(e) }, 400);
  }

  const server = await prisma.server.create({
    data: { 
      remote_ip, 
      port: parseInt(port), 
      api_token,
      max_agents: max_agents ? parseInt(max_agents) : 10
    },
  });

  return c.json(server);
});

servers.put('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  if (body.api_token === '********') {
    delete body.api_token;
  }

  if (body.port) body.port = parseInt(body.port);
  if (body.max_agents) body.max_agents = parseInt(body.max_agents);

  if (body.api_token || body.remote_ip || body.port) {
    // If updating IP, port or token, test connection
    const current = await prisma.server.findUnique({ where: { id } });
    const ip = body.remote_ip || current?.remote_ip;
    const port = body.port || current?.port;
    const token = body.api_token || current?.api_token;
    if (ip && port && token) {
      try {
        const docker = new RemoteDockerService({ 
          remoteIp: ip, 
          port: port, 
          apiToken: token 
        });
        await docker.listContainers();
      } catch (e) {
        return c.json({ error: 'Failed to connect to remote server: ' + String(e) }, 400);
      }
    }
  }

  const server = await prisma.server.update({
    where: { id },
    data: body,
  });

  return c.json(server);
});

servers.delete('/:id', async (c) => {
  const id = c.req.param('id');
  
  await prisma.server.delete({ where: { id } });
  return c.json({ success: true });
});

export default servers;
