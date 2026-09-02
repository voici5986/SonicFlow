import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readRepoFile = (filePath) => readFileSync(resolve(process.cwd(), filePath), 'utf8');

describe('deployment security headers', () => {
  it('keeps the same CSP on Cloudflare, Vercel, and Nginx', () => {
    const cloudflare = readRepoFile('public/_headers').match(/Content-Security-Policy: (.+)/)?.[1];
    const vercelConfig = JSON.parse(readRepoFile('vercel.json'));
    const vercel = vercelConfig.headers[0].headers.find(
      ({ key }) => key === 'Content-Security-Policy'
    )?.value;
    const nginx = readRepoFile('conf/security-headers.conf').match(
      /add_header Content-Security-Policy "(.+)" always;/
    )?.[1];

    expect(cloudflare).toBeTruthy();
    expect(vercel).toBe(cloudflare);
    expect(nginx).toBe(cloudflare);
  });

  it('reapplies security headers in every Nginx location that defines add_header', () => {
    const nginx = readRepoFile('conf/nginx.conf');
    const locationsWithHeaders = [...nginx.matchAll(/location[^{]+{([\s\S]*?)\n    }/g)]
      .map((match) => match[1])
      .filter((body) => body.includes('add_header'));

    expect(locationsWithHeaders).toHaveLength(4);
    for (const location of locationsWithHeaders) {
      expect(location).toContain('include /etc/nginx/otonei-security-headers.conf;');
    }

    const sharedHeaders = readRepoFile('conf/security-headers.conf');
    expect(sharedHeaders).toContain('add_header Strict-Transport-Security');
    expect(readRepoFile('Dockerfile')).toContain(
      'COPY ./conf/security-headers.conf /etc/nginx/otonei-security-headers.conf'
    );
  });
});
