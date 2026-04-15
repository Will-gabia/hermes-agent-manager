export interface CloudflareConfig {
  apiKey: string;
  zoneId: string;
}

export class CloudflareService {
  private baseUrl = 'https://api.cloudflare.com/client/v4';

  constructor(private config: CloudflareConfig) {}

  private async request(path: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Cloudflare API error: ${data.errors?.[0]?.message || response.statusText}`);
    }
    return data;
  }

  async getDnsRecords(name: string) {
    const data = await this.request(`/zones/${this.config.zoneId}/dns_records?name=${name}`);
    return data.result;
  }

  async upsertDnsRecord(name: string, content: string, type: 'A' | 'CNAME' = 'CNAME') {
    const existing = await this.getDnsRecords(name);
    
    if (existing.length > 0) {
      const recordId = existing[0].id;
      return this.request(`/zones/${this.config.zoneId}/dns_records/${recordId}`, {
        method: 'PUT',
        body: JSON.stringify({
          type,
          name,
          content,
          ttl: 1, // Auto
          proxied: false,
        }),
      });
    }

    return this.request(`/zones/${this.config.zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify({
        type,
        name,
        content,
        ttl: 1, // Auto
        proxied: false,
      }),
    });
  }

  async deleteDnsRecord(name: string) {
    const existing = await this.getDnsRecords(name);
    if (!existing || existing.length === 0) return;

    for (const record of existing) {
      try {
        await this.request(`/zones/${this.config.zoneId}/dns_records/${record.id}`, {
          method: 'DELETE',
        });
      } catch (e) {
        console.warn(`Cloudflare record ${record.id} deletion failed, might be already gone:`, e);
      }
    }
  }
}
