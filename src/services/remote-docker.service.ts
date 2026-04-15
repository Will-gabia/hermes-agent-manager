export interface RemoteDockerConfig {
  remoteIp: string;
  port: number;
  apiToken: string;
}

export interface CreateContainerOptions {
  name: string;
  image: string;
  template?: string;
  env?: Record<string, string>;
  labels?: Record<string, string>;
  resourceLimit?: {
    memory?: string;
    cpu?: string;
  };
}

export interface RemoteContainerInfo {
  id: string;
  name: string;
  status: string;
  servicePort: number;
  apiToken?: string; // If the container-api returns one for the hermes service
}

export class RemoteDockerService {
  constructor(private config: RemoteDockerConfig) {}

  private normalizeStatus(s: string): string {
    const status = (s || '').toLowerCase().trim();
    if (status === 'running' || status === 'active') return 'active';
    if (status === 'exited' || status === 'stopped' || status === 'created') return 'stopped';
    return status;
  }

  private getPort(d: any) {
    if (d.port) return d.port;
    if (d.service_port) return d.service_port;
    if (Array.isArray(d.ports) && d.ports.length > 0) {
      return d.ports[0].host || d.ports[0].Port;
    }
    return null;
  }

  private async request(path: string, options: RequestInit = {}) {
    const protocol = this.config.port === 443 ? 'https' : 'http';
    const portSuffix = (this.config.port === 80 || this.config.port === 443) ? '' : `:${this.config.port}`;
    const url = `${protocol}://${this.config.remoteIp}${portSuffix}${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'X-API-Key': this.config.apiToken,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 204) return null;

    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Remote Docker API error: ${data.message || response.statusText}`);
    }
    return data;
  }

  async createContainer(options: CreateContainerOptions): Promise<RemoteContainerInfo> {
    const data = await this.request('/containers', {
      method: 'POST',
      body: JSON.stringify(options),
    });

    return {
      id: data.id,
      name: data.name,
      status: this.normalizeStatus(data.status),
      servicePort: this.getPort(data),
      apiToken: data.api_token,
    };
  }

  async deleteContainer(id: string) {
    try {
      await this.request(`/containers/${id}`, {
        method: 'DELETE',
      });
    } catch (e) {
      // If container not found, treat as success for deletion idempotency
      if (String(e).includes('404')) {
        console.warn(`Remote container ${id} not found, treating as already deleted.`);
        return;
      }
      throw e;
    }
  }

  async startContainer(id: string) {
    await this.request(`/containers/${id}/start`, {
      method: 'POST',
    });
  }

  async stopContainer(id: string) {
    await this.request(`/containers/${id}/stop`, {
      method: 'POST',
    });
  }

  async getContainer(id: string): Promise<RemoteContainerInfo> {
    const data = await this.request(`/containers/${id}`);
    return {
      id: data.id,
      name: data.name,
      status: this.normalizeStatus(data.status),
      servicePort: this.getPort(data),
      apiToken: data.api_token,
    };
  }

  async listContainers(): Promise<RemoteContainerInfo[]> {
    const data = await this.request('/containers');
    return (data as any[]).map(d => ({
      id: d.id,
      name: d.name,
      status: this.normalizeStatus(d.status),
      servicePort: this.getPort(d),
      apiToken: d.api_token,
    }));
  }
}
