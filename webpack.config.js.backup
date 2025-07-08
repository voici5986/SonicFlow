const path = require('path');

module.exports = {
  resolve: {
    fallback: {
      // 禁用Node.js内置模块在浏览器端的使用
      "util": false,
      "path": false,
      "fs": false,
      "os": false,
      "crypto": false,
      "stream": false
    }
  },
  // 关闭某些webpack警告
  ignoreWarnings: [
    {
      module: /node_modules/,
      message: /Critical dependency/
    }
  ]
}; 