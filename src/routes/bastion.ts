import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client';
import { apiAuth } from '../middleware/auth.ts';

const prisma = new PrismaClient();
const bastion = new Hono();

// Auth for management UI and bastion server sync
bastion.use('*', apiAuth);

// List all bastion IDs
bastion.get('/', async (c) => {
  const items = await prisma.bastionId.findMany({
    include: {
      containers: {
        select: {
          id: true,
          domain_name: true,
          container_name: true,
          api_token: true,
          slug: true,
          status: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  // Mask tokens in the list view
  const maskedItems = items.map(b => ({
    ...b,
    containers: b.containers.map(container => ({
      ...container,
      api_token: container.api_token ? '********' : null
    }))
  }));
  
  return c.json(maskedItems);
});

// Create a new bastion ID
bastion.post('/', async (c) => {
  let { id } = await c.req.json();
  
  if (!id) return c.json({ error: 'ID is required' }, 400);
  
  // Enforce bastion-{id} format
  if (!id.startsWith('bastion-')) {
    id = `bastion-${id}`;
  }

  try {
    const existing = await prisma.bastionId.findUnique({ where: { id } });
    if (existing) return c.json({ error: 'Bastion ID already exists' }, 409);

    const created = await prisma.bastionId.create({
      data: { id }
    });
    return c.json(created);
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

// Delete a bastion ID
bastion.delete('/:id', async (c) => {
  const id = c.req.param('id');
  try {
    // Many-to-many relationship deletion is handled automatically by Prisma
    // The relationship entries in the join table will be removed.
    await prisma.bastionId.delete({ where: { id } });
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

// Link/Unlink an agent to a bastion ID (N:M)
bastion.post('/:id/assign', async (c) => {
  const id = c.req.param('id');
  const { container_id, unassign } = await c.req.json();

  try {
    if (unassign) {
      await prisma.bastionId.update({
        where: { id },
        data: {
          containers: {
            disconnect: { id: container_id }
          }
        }
      });
    } else {
      await prisma.bastionId.update({
        where: { id },
        data: {
          containers: {
            connect: { id: container_id }
          }
        }
      });
    }
    return c.json({ success: true });
  } catch (e) {
    return c.json({ error: String(e) }, 500);
  }
});

// Specialized API for bastion server to query connections
bastion.get('/connections', async (c) => {
  const items = await prisma.bastionId.findMany({
    include: {
      containers: {
        where: {
          status: { not: 'deleted' }
        }
      }
    }
  });

  // Returns { "bastion-user1": [ { agent_info }, ... ], ... }
  const mappings = items.reduce((acc, item) => {
    acc[item.id] = item.containers.map(c => ({
      container_id: c.id,
      slug: c.slug,
      domain: c.domain_name,
      api_token: c.api_token,
      status: c.status
    }));
    return acc;
  }, {} as Record<string, any[]>);

  return c.json(mappings);
});

export default bastion;
