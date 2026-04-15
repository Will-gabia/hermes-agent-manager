import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

export interface CaddyRoutingEntry {
  domain: string;
  targetIp: string;
  targetPort: number;
}

export class CaddyfileService {
  generate(entries: CaddyRoutingEntry[]): string {
    const lines: string[] = [];

    for (const entry of entries) {
      lines.push(`${entry.domain} {`);
      lines.push(`    reverse_proxy http://${entry.targetIp}:${entry.targetPort}`);
      lines.push(`}`);
      lines.push('');
    }

    return lines.join('\n');
  }

  async writeToFile(path: string, content: string) {
    const dir = dirname(path);
    await mkdir(dir, { recursive: true });
    await writeFile(path, content, 'utf8');
  }
}
