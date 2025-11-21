const axios = require('axios');

exports.handler = async (event) => {
    // 获取查询参数
    const params = event.queryStringParameters || {};

    // 构建目标 URL
    const targetUrl = 'https://music-api.gdstudio.xyz/api.php';

    try {
        // 发送请求到目标 API,模拟浏览器请求头
        const response = await axios.get(targetUrl, {
            params: params,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Referer': 'https://music.gdstudio.xyz/',
                'Origin': 'https://music.gdstudio.xyz'
            },
            timeout: 10000
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
