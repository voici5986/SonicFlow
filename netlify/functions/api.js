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
