import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';

export const adminAuth = createMiddleware(async (c, next) => {
  const adminSession = getCookie(c, 'admin_session');
  
  if (adminSession === 'true') {
    return next();
  }

  // Also allow API_KEY for admin routes if needed
  const apiKey = c.req.header('X-API-KEY');
  if (apiKey && apiKey === process.env.API_KEY) {
    return next();
  }

  return c.json({ error: 'Unauthorized' }, 401);
});

export const apiAuth = createMiddleware(async (c, next) => {
  const apiKey = c.req.header('X-API-KEY');
  
  if (apiKey && apiKey === process.env.API_KEY) {
    return next();
  }

  // Also allow session for browser
  const adminSession = getCookie(c, 'admin_session');
  if (adminSession === 'true') {
    return next();
  }

  return c.json({ error: 'Unauthorized' }, 401);
});
