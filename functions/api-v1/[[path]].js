/**
 * Cloudflare Pages Functions: API Proxy for OTONEI
 * Handles OTONEI API requests and forwards them to the upstream api.php endpoint.
 */

const TARGET_API_BASE = 'https://music-api.gdstudio.xyz';
const SOURCE_PATH_PREFIX = '/api-v1';
const TARGET_PATH_ACTUAL = '/api.php';
const ALLOWED_PATHS = new Set([
  SOURCE_PATH_PREFIX,
  `${SOURCE_PATH_PREFIX}/`,
  `${SOURCE_PATH_PREFIX}${TARGET_PATH_ACTUAL}`,
]);
const ALLOWED_QUERY_KEYS = new Set([
  'types',
  'source',
  'name',
  'count',
  'pages',
  'id',
  'br',
  'size',
]);
const ALLOWED_TYPES = new Set(['search', 'url', 'lyric', 'pic']);
const ALLOWED_SOURCES = new Set(['netease', 'kuwo', 'joox', 'bilibili', 'ytmusic']);
const ALLOWED_BITRATES = new Set(['128', '192', '320', '740', '999']);

const isIntegerInRange = (value, min, max) => {
  if (!/^\d+$/.test(value || '')) return false;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= min && number <= max;
};

const validateQuery = (searchParams) => {
  for (const key of searchParams.keys()) {
    if (!ALLOWED_QUERY_KEYS.has(key) || searchParams.getAll(key).length !== 1) {
      return `Unsupported or repeated query parameter: ${key}`;
    }
  }

  const type = searchParams.get('types');
  const source = searchParams.get('source');
  if (!ALLOWED_TYPES.has(type)) return 'Unsupported request type';
  if (!ALLOWED_SOURCES.has(source)) return 'Unsupported music source';

  if (type === 'search') {
    const name = searchParams.get('name')?.trim() || '';
    if (name.length < 1 || name.length > 100) return 'Invalid search query';
    if (!isIntegerInRange(searchParams.get('count'), 1, 50)) return 'Invalid result count';
    if (!isIntegerInRange(searchParams.get('pages'), 1, 100)) return 'Invalid page number';
  } else {
    const id = searchParams.get('id') || '';
    if (id.length < 1 || id.length > 200 || /\s/.test(id)) return 'Invalid track identifier';
  }

  if (type === 'url' && !ALLOWED_BITRATES.has(searchParams.get('br'))) {
    return 'Invalid bitrate';
  }
  if (type === 'pic' && !isIntegerInRange(searchParams.get('size'), 50, 2000)) {
    return 'Invalid image size';
  }

  return null;
};

const jsonResponse = (body, status) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { Allow: 'GET, OPTIONS' },
    });
  }

  if (request.method !== 'GET') {
    return new Response(null, {
      status: 405,
      headers: {
        Allow: 'GET, OPTIONS',
      },
    });
  }

  if (!ALLOWED_PATHS.has(url.pathname)) {
    return jsonResponse({ error: 'Not Found', message: 'Unsupported API proxy path' }, 404);
  }

  const queryError = validateQuery(url.searchParams);
  if (queryError) {
    return jsonResponse({ error: 'Bad Request', message: queryError }, 400);
  }

  const targetUrlString = `${TARGET_API_BASE}${TARGET_PATH_ACTUAL}${url.search}`;

  const newHeaders = new Headers(request.headers);
  newHeaders.set('Host', new URL(TARGET_API_BASE).host);
  newHeaders.set(
    'User-Agent',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  newHeaders.delete('cf-connecting-ip');
  newHeaders.delete('cf-ipcountry');
  newHeaders.delete('cf-ray');
  newHeaders.delete('x-forwarded-proto');
  newHeaders.delete('x-real-ip');
  newHeaders.delete('cookie');
  newHeaders.delete('authorization');

  try {
    const response = await fetch(targetUrlString, {
      method: request.method,
      headers: newHeaders,
      redirect: 'follow',
    });

    // 临时诊断日志：定位 upstream 返回与 /api-v1 可访问性问题，随后移除
    console.log('[API proxy] upstream response', {
      status: response.status,
      statusText: response.statusText,
      server: response.headers.get('server'),
      cfRay: response.headers.get('cf-ray'),
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('Access-Control-Allow-Origin');
    responseHeaders.delete('Access-Control-Allow-Credentials');
    responseHeaders.set('Cache-Control', 'no-store');
    responseHeaders.set('X-Content-Type-Options', 'nosniff');
    responseHeaders.delete('X-Powered-By');
    responseHeaders.delete('Server');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    // 临时诊断日志：定位 fetch 失败原因，随后移除
    console.error('[API proxy] fetch failed', error);
    return jsonResponse({ error: 'Proxy Fetch Failed', message: error.message }, 502);
  }
}
