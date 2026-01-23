import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import envCompatible from 'vite-plugin-env-compatible';
import svgr from 'vite-plugin-svgr';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        envCompatible({
            prefix: 'REACT_APP_',
        }),
        svgr(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    define: {
        // envCompatible 插件已经处理了环境变量，此处只需保留基础兼容性
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    },
    esbuild: {
        // 强制对 src 下的所有 .js 文件使用 jsx 加载器
        loader: 'jsx',
        include: /src\/.*\.js$/,
        exclude: [],
    },
    optimizeDeps: {
        esbuildOptions: {
            loader: {
                '.js': 'jsx',
            },
        },
    },
    build: {
        outDir: 'build',
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
