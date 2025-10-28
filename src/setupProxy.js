const { createProxyMiddleware } = require('http-proxy-middleware');

// 现代webpack-dev-server配置方案
module.exports = function(app) {
  // 创建API代理
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://music-api.gdstudio.xyz',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/api.php', // 把 "/api" 替换为 "/api.php"
      },
      logLevel: 'warn', // 减少日志输出，只显示警告和错误
    })
  );
};

// 同时，为了解决webpack-dev-server警告，需要在项目根目录创建jsconfig.json或修改现有文件
// 注意：setupProxy.js本身不能解决这个问题，因为警告是由webpack-dev-server配置引起的
// 这个注释只是为了提供信息，实际解决方案需要在另一个文件中实现