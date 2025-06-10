/* config-overrides.js */
module.exports = function override(config, env) {
  // 添加fallback配置，禁用Node.js模块
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "util": false,
    "path": false,
    "crypto": false,
    "stream": false,
    "os": false,
    "fs": false
  };
  
  // 关闭特定警告
  config.ignoreWarnings = [
    ...(config.ignoreWarnings || []),
    {
      module: /node_modules/,
      message: /Critical dependency/
    }
  ];
  
  return config;
};