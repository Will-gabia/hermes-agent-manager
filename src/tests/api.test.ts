import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../index.ts';

describe('API Integration Tests', () => {
  it('GET /health should return 200 and db status', async () => {
    // Note: Hono's serve() isn't used here, we just use the app object
    // supertest might need a node server or handle Hono.fetch
    // Hono app has .fetch() method
    const res = await app.request('/health');
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.status).toBe('ok');
  });

  it('GET /admin/session should return authenticated: false initially', async () => {
    const res = await app.request('/admin/session');
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.authenticated).toBe(false);
  });

  it('POST /admin/login with invalid credentials should fail', async () => {
    const res = await app.request('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ id: 'wrong', password: 'wrong' }),
      headers: { 'Content-Type': 'application/json' }
    });
    
    expect(res.status).toBe(401);
  });
});
