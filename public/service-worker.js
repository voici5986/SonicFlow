/* 
 * SonicFlow音乐播放器 Service Worker
 * 提供PWA功能支持，包括离线访问、缓存管理等
 */

// 缓存版本和名称定义
const CACHE_VERSION = 'v1';
const CACHE_NAME = 'sonicflow-cache-' + CACHE_VERSION;

// 需要缓存的资源列表
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo.svg',
  '/offline.html', // 离线页面
];

// 需要缓存的CSS和JS资源
// 注意：在生产环境中，这些文件通常会有哈希名称，这里使用通配符
const RUNTIME_CACHE_REGEX = [
  /\.(?:js|css)$/,  // JS和CSS文件
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/, // 图片文件
  /^https:\/\/fonts\.googleapis\.com/, // Google Fonts
  /^https:\/\/fonts\.gstatic\.com/,    // Google Fonts资源
];

// 安装事件：设置缓存
self.addEventListener('install', (event) => {
  console.log('[Service Worker] 正在安装');
  
  // 跳过等待，直接激活
  self.skipWaiting();
  
  // 缓存核心资源
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] 缓存核心资源');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .catch((error) => {
        console.error('[Service Worker] 缓存核心资源失败:', error);
      })
  );
});

// 激活事件：清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] 激活');
  
  // 立即接管所有客户端
  event.waitUntil(clients.claim());
  
  // 清理旧版本缓存
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] 删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 资源请求处理
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // 跳过不需要缓存的请求（如API请求）
  // 只缓存GET请求
  if (
    event.request.method !== 'GET' || 
    url.pathname.startsWith('/api') ||
    url.hostname.includes('api.') ||
    event.request.url.includes('chrome-extension')
  ) {
    return;
  }

  // 对于HTML导航请求，使用网络优先策略
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/offline.html');
        })
    );
    return;
  }

  // 对于静态资源，使用缓存优先策略
  const isStaticAsset = RUNTIME_CACHE_REGEX.some(pattern => pattern.test(event.request.url));
  
  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          // 返回缓存的响应，同时在后台更新缓存
          const fetchPromise = fetch(event.request)
            .then((networkResponse) => {
              // 确保响应有效
              if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, responseToCache);
                  });
              }
              return networkResponse;
            })
            .catch(() => {
              console.log('[Service Worker] 获取资源失败:', event.request.url);
            });
            
          return cachedResponse || fetchPromise;
        })
    );
    return;
  }

  // 对于其他请求，使用网络优先策略
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 如果请求成功，克隆响应并缓存
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // 如果网络请求失败，尝试从缓存中获取
        return caches.match(event.request);
      })
  );
});

// 接收消息
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 推送通知
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || '有新消息',
      icon: '/logo.svg',
      badge: '/logo.svg',
      data: {
        url: data.url || '/'
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'SonicFlow通知', options)
    );
  }
});

// 通知点击
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  }
}); 