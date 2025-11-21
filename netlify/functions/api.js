const axios = require('axios');

exports.handler = async (event) => {
    // 获取查询参数
    const params = event.queryStringParameters || {};

    //直接请求 API(从服务器端请求,不会被 Cloudflare 阻止)
    const targetUrl = 'https://music-api.gdstudio.xyz/api.php';

    try {
        // 从服务器端发送请求
        const response = await axios.get(targetUrl, {
            params: params,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://music.gdstudio.xyz/',
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
