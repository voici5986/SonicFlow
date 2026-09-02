import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequest } from '../../functions/api-v1/[[path]].js';

const createRequest = (path, init) => new Request(`https://otonei.pages.dev${path}`, init);

describe('Cloudflare API proxy', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('forwards the app API path to upstream api.php', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: {
          'Content-Type': 'application/json',
          Server: 'nginx',
        },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequest({
      request: createRequest(
        '/api-v1/api.php?types=search&source=netease&name=test&count=20&pages=1'
      ),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://music-api.gdstudio.xyz/api.php?types=search&source=netease&name=test&count=20&pages=1'
    );
    expect(response.status).toBe(200);
    expect(response.headers.has('Access-Control-Allow-Origin')).toBe(false);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.has('Server')).toBe(false);
  });

  it('maps /api-v1 to upstream api.php', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'));
    vi.stubGlobal('fetch', fetchMock);

    await onRequest({
      request: createRequest('/api-v1?types=url&source=netease&id=1&br=320'),
    });

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://music-api.gdstudio.xyz/api.php?types=url&source=netease&id=1&br=320'
    );
  });

  it('rejects unsupported subpaths', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequest({
      request: createRequest('/api-v1/other?types=search'),
    });

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects unsupported query shapes before contacting the upstream API', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const invalidType = await onRequest({
      request: createRequest('/api-v1/api.php?types=admin&source=netease'),
    });
    const oversizedPage = await onRequest({
      request: createRequest(
        '/api-v1/api.php?types=search&source=netease&name=test&count=20&pages=9999'
      ),
    });

    expect(invalidType.status).toBe(400);
    expect(oversizedPage.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
