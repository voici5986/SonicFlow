/* 
 * SonicFlow音乐播放器 Service Worker
 * 提供PWA功能支持，包括离线访问、缓存管理等
 */

// 缓存版本和名称定义
const CACHE_VERSION = 'v2';
const STATIC_CACHE_NAME = 'sonicflow-static-' + CACHE_VERSION;
const API_CACHE_NAME = 'sonicflow-api-' + CACHE_VERSION;
const AUDIO_CACHE_NAME = 'sonicflow-audio-' + CACHE_VERSION;
const IMAGE_CACHE_NAME = 'sonicflow-image-' + CACHE_VERSION;

// 当前播放的音频URL
self.currentPlayingAudio = null;

// 处理来自主应用的消息
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CURRENT_AUDIO') {
    console.log('[Service Worker] 接收到当前播放音频信息:', event.data.url);
    self.currentPlayingAudio = event.data.url;
  }
});

// 需要缓存的资源列表
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo.svg',
  '/lyric.svg',
  '/offline.html', // 离线页面
  '/china.html',   // 中国模式页面
  '/default_cover.png', // 默认封面图
];

// 需要缓存的CSS和JS资源
// 注意：在生产环境中，这些文件通常会有哈希名称，这里使用通配符
const RUNTIME_CACHE_REGEX = [
  /\.(?:js|css)$/,  // JS和CSS文件
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/, // 图片文件
  /^https:\/\/fonts\.googleapis\.com/, // Google Fonts
  /^https:\/\/fonts\.gstatic\.com/,    // Google Fonts资源
];

// 音频文件正则表达式
const AUDIO_REGEX = /\.(?:mp3|flac|aac|ogg|wav)$/;

// API请求模式
const API_REGEX = /\/api\?/;

// 安装事件：设置缓存
self.addEventListener('install', (event) => {
  console.log('[Service Worker] 正在安装');
  
  // 跳过等待，直接激活
  self.skipWaiting();
  
  // 缓存核心资源
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
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
          // 检查是否是旧版本缓存
          if (
            cacheName.startsWith('sonicflow-') && 
            !cacheName.includes(CACHE_VERSION)
          ) {
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
  
  // 跳过不需要缓存的请求和非GET请求
  if (
    event.request.method !== 'GET' || 
    url.href.includes('chrome-extension')
  ) {
    return;
  }

  // 对于HTML导航请求，使用网络优先策略
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // 检查当前应用模式
          return caches.match('app_mode')
            .then((response) => {
              if (response) {
                return response.text().then((mode) => {
                  // 根据应用模式返回不同的离线页面
                  if (mode === 'china') {
                    return caches.match('/china.html');
                  } else {
                    return caches.match('/offline.html');
                  }
                });
              } else {
                // 默认返回离线页面
          return caches.match('/offline.html');
              }
            });
        })
    );
    return;
  }

  // 处理API请求 - 网络优先，失败时使用缓存
  if (API_REGEX.test(url.href)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // 克隆响应以便缓存
          const clonedResponse = response.clone();
          
          // 只缓存成功的响应
          if (response.ok) {
            caches.open(API_CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, clonedResponse);
              });
          }
          
          return response;
        })
        .catch(() => {
          console.log('[Service Worker] API请求失败，尝试使用缓存');
          return caches.match(event.request);
        })
    );
    return;
  }

  // 处理音频文件 - 缓存优先，但使用更智能的策略
  if (AUDIO_REGEX.test(url.href)) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // 如果有缓存，返回缓存，但确保不会与当前播放的音频冲突
            console.log('[Service Worker] 从缓存返回音频文件:', url.pathname);
            
            // 检查是否是当前正在播放的音频
            const isCurrentAudio = self.currentPlayingAudio === url.href;
            if (isCurrentAudio) {
              console.log('[Service Worker] 检测到当前正在播放的音频，使用网络请求');
              // 如果是当前播放的音频，优先使用网络请求以避免冲突
              return fetch(event.request)
                .then(response => {
                  if (!response || !response.ok) {
                    return cachedResponse;
                  }
                  return response;
                })
                .catch(() => cachedResponse);
            }
            
            return cachedResponse;
          }
          
          // 如果没有缓存，则从网络获取
          return fetch(event.request)
            .then((response) => {
              if (!response || !response.ok) {
                return response;
              }
              
              // 克隆响应以便缓存
              const clonedResponse = response.clone();
              
              // 检查响应大小
              const contentLength = response.headers.get('content-length');
              if (contentLength) {
                const size = parseInt(contentLength, 10);
                // 如果文件大于50MB，记录日志
                if (size > 50 * 1024 * 1024) {
                  console.log(`[Service Worker] 缓存大型音频文件: ${url.href}, 大小: ${(size / (1024 * 1024)).toFixed(2)}MB`);
                }
              }
              
              // 无论大小，都缓存音频文件
              caches.open(AUDIO_CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, clonedResponse)
                    .then(() => {
                      console.log(`[Service Worker] 音频文件已缓存: ${url.pathname}`);
                    })
                    .catch(err => {
                      console.error(`[Service Worker] 缓存音频失败: ${err.message}`);
                    });
                });
                
              return response;
            })
            .catch(error => {
              console.error('[Service Worker] 获取音频失败:', error);
              // 如果网络请求失败，可以尝试返回一个默认的音频响应
              // 或者简单地让错误继续传播
              throw error;
            });
        })
    );
    return;
  }

  // 处理图片 - 缓存优先，增量更新
  if (/\.(png|jpg|jpeg|svg|gif|webp)$/.test(url.href)) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // 返回缓存的响应，同时在后台进行增量更新检查
            incrementalCacheUpdate(event.request, cachedResponse, IMAGE_CACHE_NAME);
            return cachedResponse;
          }
          
          // 如果缓存中没有，则从网络获取并缓存
          return fetch(event.request)
            .then((response) => {
              if (!response || !response.ok) {
                return response;
              }
              
              // 克隆响应以便缓存
              const clonedResponse = response.clone();
              
              caches.open(IMAGE_CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, clonedResponse);
                });
                
              return response;
            })
            .catch(() => {
              // 如果网络请求失败，尝试返回默认图片
              if (url.href.includes('cover') || /\.(jpg|jpeg|png|webp)$/.test(url.href)) {
                return caches.match('/default_cover.png');
              }
            });
        })
    );
    return;
  }

  // 对于静态资源，使用缓存优先策略，增量更新
  const isStaticAsset = RUNTIME_CACHE_REGEX.some(pattern => pattern.test(event.request.url));
  
  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          // 返回缓存的响应，同时在后台进行增量更新检查
          if (cachedResponse) {
            incrementalCacheUpdate(event.request, cachedResponse, STATIC_CACHE_NAME);
            return cachedResponse;
          }
          
          // 如果缓存中没有，则从网络获取并缓存
          return fetch(event.request)
            .then((response) => {
              if (!response || !response.ok) {
                return response;
              }
              
              // 克隆响应以便缓存
              const clonedResponse = response.clone();
              
              caches.open(STATIC_CACHE_NAME)
                  .then((cache) => {
                  cache.put(event.request, clonedResponse);
                  });
                
              return response;
            });
        })
    );
    return;
  }

  // 对于其他请求，使用网络优先策略
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 如果请求成功，克隆响应并缓存
        if (response && response.ok) {
          const responseToCache = response.clone();
          caches.open(STATIC_CACHE_NAME)
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

// 定期清理过期缓存
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'cache-cleanup') {
    event.waitUntil(cleanupExpiredCache());
  }
});

// 监听消息事件
self.addEventListener('message', (event) => {
  const data = event.data;
  
  if (data && data.type === 'APP_MODE_CHANGE') {
    // 更新缓存中的应用模式
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        // 创建一个响应对象，包含应用模式
        const modeResponse = new Response(data.payload.mode, {
          headers: {
            'Content-Type': 'text/plain',
            'Cache-Control': 'no-cache'
          }
        });
        
        // 缓存应用模式
        cache.put('app_mode', modeResponse);
        console.log(`[Service Worker] 应用模式已缓存: ${data.payload.mode}`);
      });
  } else if (data && data.type === 'SKIP_WAITING') {
    // 跳过等待，立即激活新的Service Worker
    self.skipWaiting();
  } else if (data && data.type === 'CLEAN_CACHE') {
    // 清理缓存
    cleanupExpiredCache();
  }
});

// 清理过期缓存
async function cleanupExpiredCache() {
  console.log('[Service Worker] 开始清理过期缓存');
  
  // 清理API缓存
  const apiCache = await caches.open(API_CACHE_NAME);
  const apiRequests = await apiCache.keys();
  
  // 删除超过24小时的API缓存
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24小时
  
  for (const request of apiRequests) {
    const response = await apiCache.match(request);
    const headers = response.headers;
    
    // 尝试获取缓存时间
    const dateHeader = headers.get('date');
    if (dateHeader) {
      const cacheTime = new Date(dateHeader).getTime();
      if ((now - cacheTime) > maxAge) {
        await apiCache.delete(request);
        console.log('[Service Worker] 删除过期API缓存:', request.url);
      }
    }
  }
  
  // 限制音频缓存大小、数量和时间
  try {
    const audioCache = await caches.open(AUDIO_CACHE_NAME);
    const audioRequests = await audioCache.keys();
    
    // 音频缓存限制参数
    const MAX_AUDIO_CACHE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
    const MAX_AUDIO_FILES = 50; // 最多50首歌
    const MAX_AUDIO_AGE = 7 * 24 * 60 * 60 * 1000; // 7天
    
    // 计算当前音频缓存信息
    let totalSize = 0;
    const audioFiles = await Promise.all(audioRequests.map(async (request) => {
      const response = await audioCache.match(request);
      
      // 尝试从响应头获取文件大小
      let size = 0;
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        size = parseInt(contentLength, 10);
      } else {
        // 如果没有content-length头，克隆并读取整个响应来估算大小
        try {
          const blob = await response.clone().blob();
          size = blob.size;
        } catch (e) {
          // 如果无法获取大小，使用估计值
          size = 5 * 1024 * 1024; // 假设平均5MB
        }
      }
      
      // 获取缓存时间
      const dateHeader = response.headers.get('date');
      const cacheTime = dateHeader ? new Date(dateHeader).getTime() : 0;
      
      return {
        request,
        size,
        date: cacheTime,
        age: now - cacheTime
      };
    }));
    
    // 按时间排序（最旧的在前）
    audioFiles.sort((a, b) => a.date - b.date);
    
    // 计算总大小
    totalSize = audioFiles.reduce((sum, file) => sum + file.size, 0);
    console.log(`[Service Worker] 当前音频缓存: ${audioFiles.length}首歌, ${(totalSize / (1024 * 1024)).toFixed(2)}MB`);
    
    // 标记要删除的文件
    const filesToDelete = [];
    
    // 1. 先标记超过7天的文件
    audioFiles.forEach(file => {
      if (file.age > MAX_AUDIO_AGE) {
        filesToDelete.push({
          ...file,
          reason: '超过7天'
        });
      }
    });
    
    // 2. 如果文件数量仍然超过限制，继续标记最旧的文件
    if (audioFiles.length - filesToDelete.length > MAX_AUDIO_FILES) {
      // 过滤掉已标记的文件
      const remainingFiles = audioFiles.filter(file => 
        !filesToDelete.some(f => f.request.url === file.request.url)
      );
      
      // 需要额外删除的文件数量
      const extraToDelete = remainingFiles.length - MAX_AUDIO_FILES;
      
      // 标记最旧的文件
      for (let i = 0; i < extraToDelete; i++) {
        filesToDelete.push({
          ...remainingFiles[i],
          reason: '超过数量限制'
        });
      }
    }
    
    // 3. 如果大小仍然超过限制，继续标记文件直到低于限制
    if (totalSize > MAX_AUDIO_CACHE_SIZE) {
      // 计算当前标记删除后的大小
      const sizeAfterDelete = totalSize - filesToDelete.reduce((sum, file) => sum + file.size, 0);
      
      if (sizeAfterDelete > MAX_AUDIO_CACHE_SIZE) {
        // 仍然超过大小限制，需要继续删除
        let sizeToFree = sizeAfterDelete - (MAX_AUDIO_CACHE_SIZE * 0.9); // 释放到90%以下
        
        // 过滤掉已标记的文件
        const remainingFiles = audioFiles.filter(file => 
          !filesToDelete.some(f => f.request.url === file.request.url)
        );
        
        // 从最旧的文件开始标记
        for (const file of remainingFiles) {
          if (sizeToFree <= 0) break;
          
          filesToDelete.push({
            ...file,
            reason: '超过大小限制'
          });
          
          sizeToFree -= file.size;
        }
      }
    }
    
    // 执行删除
    if (filesToDelete.length > 0) {
      console.log(`[Service Worker] 需要删除 ${filesToDelete.length} 个音频缓存文件`);
      
      let deletedSize = 0;
      for (const file of filesToDelete) {
        await audioCache.delete(file.request);
        deletedSize += file.size;
        console.log(`[Service Worker] 删除音频缓存: ${file.request.url}, 大小: ${(file.size / (1024 * 1024)).toFixed(2)}MB, 原因: ${file.reason}`);
      }
      
      console.log(`[Service Worker] 已释放 ${(deletedSize / (1024 * 1024)).toFixed(2)}MB 缓存空间`);
    } else {
      console.log('[Service Worker] 音频缓存在限制范围内，无需清理');
    }
  } catch (error) {
    console.error('[Service Worker] 清理音频缓存失败:', error);
  }
  
  console.log('[Service Worker] 缓存清理完成');
}

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

/**
 * 增量缓存更新函数 - 使用条件请求检查资源是否已更新
 * @param {Request} request 原始请求
 * @param {Response} cachedResponse 缓存的响应
 * @param {string} cacheName 缓存名称
 */
async function incrementalCacheUpdate(request, cachedResponse, cacheName) {
  // 如果没有缓存响应，直接返回
  if (!cachedResponse) return;
  
  try {
    // 创建一个新的请求，添加条件头
    const headers = new Headers(request.headers);
    
    // 获取缓存的ETag和Last-Modified
    const etag = cachedResponse.headers.get('ETag');
    const lastModified = cachedResponse.headers.get('Last-Modified');
    
    // 添加条件请求头
    if (etag) {
      headers.set('If-None-Match', etag);
    }
    if (lastModified) {
      headers.set('If-Modified-Since', lastModified);
    }
    
    // 如果没有ETag和Last-Modified，不进行增量更新
    if (!etag && !lastModified) {
      // 回退到普通更新，但添加缓存破坏参数避免使用浏览器缓存
      const url = new URL(request.url);
      url.searchParams.set('_sw_cache_bust', Date.now());
      
      fetch(new Request(url, {
        method: request.method,
        headers: request.headers,
        mode: 'no-cors',
        credentials: request.credentials
      }))
      .then((response) => {
        if (response && response.ok) {
          caches.open(cacheName).then((cache) => {
            cache.put(request, response);
          });
        }
      })
      .catch(() => {});
      
      return;
    }
    
    // 创建条件请求
    const conditionalRequest = new Request(request.url, {
      method: request.method,
      headers: headers,
      mode: 'no-cors',
      credentials: request.credentials
    });
    
    // 发送条件请求
    fetch(conditionalRequest)
      .then((response) => {
        // 如果返回304 Not Modified，资源未变化，不需要更新缓存
        if (response.status === 304) {
          return;
        }
        
        // 如果资源已更新，更新缓存
        if (response.ok) {
          caches.open(cacheName)
            .then((cache) => {
              cache.put(request, response);
              console.log(`[Service Worker] 增量更新缓存: ${request.url}`);
            });
        }
      })
      .catch(() => {
        // 忽略网络错误
      });
  } catch (error) {
    console.error('[Service Worker] 增量更新失败:', error);
  }
} 