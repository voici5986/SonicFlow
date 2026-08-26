import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import envCompatible from 'vite-plugin-env-compatible';
import svgr from 'vite-plugin-svgr';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

const coveragePath = (filePath) => filePath.split('/').join(path.sep);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    envCompatible({
      // 仅为兼容旧部署变量保留；业务代码统一通过 src/config/env.js 读取。
      prefix: 'REACT_APP_',
    }),
    svgr(),
    VitePWA({
      injectRegister: false,
      registerType: 'prompt', // 使用提示更新策略，避免自动刷新打断用户
      includeAssets: ['maskable-logo.svg'],
      manifest: {
        name: 'OTONEI',
        short_name: 'OTONEI',
        description: '在线音乐搜索、播放和下载，支持多平台音乐资源',
        lang: 'zh-CN',
        theme_color: '#f5f5f7',
        background_color: '#f5f5f7',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        orientation: 'portrait',
        icons: [
          {
            src: 'logo.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'maskable-logo.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: '搜索音乐',
            short_name: '搜索',
            description: '快速搜索音乐',
            url: '/?action=search',
            icons: [{ src: 'logo.svg', sizes: 'any', type: 'image/svg+xml' }],
          },
          {
            name: '我的收藏',
            short_name: '收藏',
            description: '查看收藏的音乐',
            url: '/?tab=favorites',
            icons: [{ src: 'logo.svg', sizes: 'any', type: 'image/svg+xml' }],
          },
        ],
      },
      workbox: {
        // 运行时缓存策略
        runtimeCaching: [
          // API 请求：Cloudflare Pages 上走同源 /api-v1，始终直连网络
          {
            urlPattern: ({ url }) =>
              url.origin === self.location.origin && url.pathname.startsWith('/api-v1'),
            handler: 'NetworkOnly',
          },
          // 封面图片：缓存优先，设置过期时间
          {
            urlPattern: /^https:\/\/.*(jpg|jpeg|png|webp|gif).*$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30天
              },
            },
          },
          // Google Fonts：重新验证
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1年
              },
            },
          },
        ],
        // 确保 index.html 始终被缓存
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api-v1(?:\/|$)/],
      },
      // 开发环境下也生成 Service Worker，方便调试
      devOptions: {
        enabled: true,
        type: 'module',
        suppressWarnings: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  define: {
    // envCompatible 插件已经处理了环境变量，此处只需保留基础兼容性
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    'process.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version),
  },
  build: {
    outDir: 'build',
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 30,
            },
            {
              name: 'firebase-vendor',
              test: /node_modules[\\/](@firebase|firebase)[\\/]/,
              priority: 20,
            },
            {
              name: 'ui-vendor',
              test: /node_modules[\\/](bootstrap|react-icons|react-toastify|@popperjs)[\\/]/,
              priority: 10,
            },
            {
              name: 'vendor',
              test: /node_modules[\\/]/,
              minSize: 20000,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
    setupFiles: './src/test/setupTests.js',
    globals: true,
    css: true,
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/*.pwa.spec.js'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'json-summary', 'html'],
      include: [
        'src/config/env.js',
        'src/services/storage.js',
        'src/services/syncService.js',
        'src/services/musicApiService.js',
        'src/services/firebase.js',
        'src/hooks/useSearch.jsx',
      ],
      exclude: ['**/*.test.{js,jsx}', 'src/test/**', '**/*.d.ts'],
      thresholds: {
        // 这些门槛来自首次显式 include 的实测基线，后续只允许递增。
        statements: 42,
        branches: 34,
        functions: 48,
        lines: 42,
        [coveragePath('src/hooks/useSearch.jsx')]: {
          statements: 74,
          branches: 60,
          functions: 80,
          lines: 78,
        },
        [coveragePath('src/services/musicApiService.js')]: {
          statements: 69,
          branches: 43,
          functions: 80,
          lines: 70,
        },
        [coveragePath('src/services/storage.js')]: {
          statements: 38,
          branches: 38,
          functions: 48,
          lines: 38,
        },
        [coveragePath('src/services/syncService.js')]: {
          statements: 22,
          branches: 12,
          functions: 33,
          lines: 22,
        },
        [coveragePath('src/services/firebase.js')]: {
          statements: 27,
          branches: 19,
          functions: 9,
          lines: 27,
        },
        [coveragePath('src/config/env.js')]: {
          statements: 60,
          branches: 50,
          functions: 75,
          lines: 60,
        },
      },
    },
  },
  server: {
    host: true, // 开启局域网访问
    port: 3000,
    open: true,
    proxy: {
      '/api-v1': {
        target: 'https://music-api.gdstudio.xyz',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-v1/, ''),
      },
    },
  },
});
