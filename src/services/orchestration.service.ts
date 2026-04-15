import { PrismaClient } from '@prisma/client';
import { CloudflareService } from './cloudflare.service.ts';
import { CaddyfileService } from './caddyfile.service.ts';
import { RemoteDockerService } from './remote-docker.service.ts';
import { ADJECTIVES, NOUNS } from '../constants/slug-words.ts';

const prisma = new PrismaClient();

export class OrchestrationService {
  private cloudflare: CloudflareService | null = null;
  private caddyfile = new CaddyfileService();

  constructor() {}

  private async initCloudflare() {
    const config = await prisma.config.findUnique({ where: { id: 1 } });
    if (!config?.cloudflare_api_key || !config?.cloudflare_zone_id) {
      throw new Error('Cloudflare configuration is incomplete');
    }
    this.cloudflare = new CloudflareService({
      apiKey: config.cloudflare_api_key,
      zoneId: config.cloudflare_zone_id,
    });
    return config;
  }

  async createContainer(serverId: string, templateId: string) {
    const config = await this.initCloudflare();
    const server = await prisma.server.findUnique({ where: { id: serverId } });
    const template = await prisma.containerTemplate.findUnique({ where: { id: templateId } });

    if (!server || !template) throw new Error('Server or Template not found');

    // Step 1: Reserve slug and domain in DB
    const slug = await this.generateUniqueSlug();
    const domain_name = `${slug}.${config.base_domain}`;

    const container = await prisma.container.create({
      data: {
        server_id: serverId,
        template_id: templateId,
        slug,
        domain_name,
        status: 'creating',
      },
    });

    const operation = await prisma.operation.create({
      data: {
        container_id: container.id,
        operation_type: 'create',
        status: 'processing',
        current_step: 'remote_creation',
      },
    });

    try {
      // Step 2: Remote creation
      const docker = new RemoteDockerService({
        remoteIp: server.remote_ip,
        port: server.port,
        apiToken: server.api_token,
      });

      const templateMetadata = JSON.parse(template.metadata);
      const remoteInfo = await docker.createContainer({
        name: slug,
        image: templateMetadata.image,
        template: templateMetadata.template,
        env: templateMetadata.env,
        resourceLimit: templateMetadata.resource_limit,
      });

      await prisma.container.update({
        where: { id: container.id },
        data: {
          container_id: remoteInfo.id,
          container_name: remoteInfo.name,
          service_port: remoteInfo.servicePort,
          api_token: remoteInfo.apiToken,
        },
      });

      await prisma.operation.update({
        where: { id: operation.id },
        data: { current_step: 'dns_update' },
      });

      // Step 3: Cloudflare DNS
      if (config.target_cname) {
        await this.cloudflare!.upsertDnsRecord(domain_name, config.target_cname, 'CNAME');
      }

      // Step 5: Finalize
      const updatedContainer = await prisma.container.update({
        where: { id: container.id },
        data: { status: 'active' },
        include: { server: true, template: true },
      });

      // Step 4: Caddyfile
      await this.refreshCaddyfile(config.caddyfile_path);

      await prisma.operation.update({
        where: { id: operation.id },
        data: {
          status: 'success',
          finished_at: new Date(),
        },
      });

      return updatedContainer;
    } catch (e) {
      console.error('Creation failed:', e);
      await prisma.container.update({
        where: { id: container.id },
        data: { status: 'error' },
      });
      await prisma.operation.update({
        where: { id: operation.id },
        data: {
          status: 'failure',
          error_message: String(e),
          finished_at: new Date(),
        },
      });
      throw e;
    }
  }

  async deleteContainer(id: string) {
    const config = await this.initCloudflare();
    const container = await prisma.container.findUnique({
      where: { id },
      include: { server: true },
    });

    if (!container) throw new Error('Container not found');

    const operation = await prisma.operation.create({
      data: {
        container_id: container.id,
        operation_type: 'delete',
        status: 'processing',
        current_step: 'marking_deleting',
      },
    });

    try {
      await prisma.container.update({
        where: { id: container.id },
        data: { status: 'deleting' },
      });

      // Step 1: Remote delete
      if (container.container_id) {
        const docker = new RemoteDockerService({
          remoteIp: container.server.remote_ip,
          port: container.server.port,
          apiToken: container.server.api_token,
        });
        await docker.deleteContainer(container.container_id).catch(e => console.warn('Remote delete failed, continuing...', e));
      }

      await prisma.operation.update({
        where: { id: operation.id },
        data: { current_step: 'dns_delete' },
      });

      // Step 2: DNS delete
      await this.cloudflare!.deleteDnsRecord(container.domain_name).catch(e => console.warn('DNS delete failed, continuing...', e));

      await prisma.operation.update({
        where: { id: operation.id },
        data: { current_step: 'caddyfile_regeneration' },
      });

      // Step 3: Caddyfile
      await this.refreshCaddyfile(config.caddyfile_path);

      // Step 4: Soft or Hard delete (Design says: keep as 'deleted' or hard-delete)
      // I'll keep it as 'deleted' for v1 to have history as suggested in Design.
      await prisma.container.update({
        where: { id: container.id },
        data: { status: 'deleted' },
      });

      await prisma.operation.update({
        where: { id: operation.id },
        data: {
          status: 'success',
          finished_at: new Date(),
        },
      });
    } catch (e) {
      await prisma.container.update({
        where: { id: container.id },
        data: { status: 'error' },
      });
      await prisma.operation.update({
        where: { id: operation.id },
        data: {
          status: 'failure',
          error_message: String(e),
          finished_at: new Date(),
        },
      });
      throw e;
    }
  }

  async refreshCaddyfile(path: string | null) {
    if (!path) return;
    const activeContainers = await prisma.container.findMany({
      where: { status: 'active' },
      include: { server: true },
    });

    const entries = activeContainers.map(c => ({
      domain: c.domain_name,
      targetIp: c.server.remote_ip,
      targetPort: c.service_port || 80,
    }));

    const content = this.caddyfile.generate(entries);
    await this.caddyfile.writeToFile(path, content);
  }

  private async generateUniqueSlug(): Promise<string> {
    let slug = '';
    let exists = true;
    let attempts = 0;
    
    while (exists && attempts < 50) {
      const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
      const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
      
      // Use adjective-noun format. If collisions happen, add a small random number
      slug = attempts < 5 ? `${adj}-${noun}` : `${adj}-${noun}-${Math.floor(Math.random() * 100)}`;
      
      const count = await prisma.container.count({ where: { slug } });
      if (count === 0) exists = false;
      attempts++;
    }
    
    return slug;
  }
}
