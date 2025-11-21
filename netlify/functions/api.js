const axios = require('axios');

exports.handler = async (event) => {
    // 获取查询参数
    const params = event.queryStringParameters || {};

    // 使用官方代理服务器(已经配置好了绕过 Cloudflare 的逻辑)
    const targetUrl = 'https://music-proxy.gdstudio.org/music-api.gdstudio.xyz/api.php';

    try {
        // 发送请求到代理服务器
        const response = await axios.get(targetUrl, {
            params: params,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json, text/plain, */*'
            },
            timeout: 15000
        });

        // 返回成功响应
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
            },
            body: JSON.stringify(response.data)
        };
    } catch (error) {
        console.error('API 请求失败:', error.message);

        // 返回错误响应
        return {
            statusCode: error.response?.status || 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: error.message,
                details: error.response?.data || null
            })
        };
    }
};
