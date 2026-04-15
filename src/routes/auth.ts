import { Hono } from 'hono';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';

const auth = new Hono();

auth.post('/login', async (c) => {
  const { id, password } = await c.req.json();
  
  if (id === process.env.ADMIN_ID && password === process.env.ADMIN_PASSWORD) {
    setCookie(c, 'admin_session', 'true', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return c.json({ success: true, message: 'Logged in' });
  }

  return c.json({ success: false, message: 'Invalid credentials' }, 401);
});

auth.post('/logout', (c) => {
  deleteCookie(c, 'admin_session', { path: '/' });
  return c.json({ success: true, message: 'Logged out' });
});

auth.get('/session', (c) => {
  const adminSession = getCookie(c, 'admin_session');
  if (adminSession === 'true') {
    return c.json({ authenticated: true });
  }
  return c.json({ authenticated: false });
});

export default auth;
