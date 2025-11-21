import md5 from 'blueimp-md5';

/**
 * URL编码 - 保持与原项目一致的编码方式
 * @param {string} str - 需要编码的字符串
 * @returns {string} - 编码后的字符串
 */
export const urlEncode = (str) => {
    if (str === null || str === undefined) return "";
    if (typeof str !== "string") str = String(str);
    return encodeURIComponent(str)
        .replace(/\(/g, "%28")
        .replace(/\)/g, "%29")
        .replace(/\*/g, "%2A")
        .replace(/'/g, "%27")
        .replace(/!/g, "%21");
};

/**
 * 获取时间戳前缀
 * 原项目逻辑：取时间戳的前9位
 * @returns {string}
 */
const getTimePrefix = () => {
    const timestamp = Date.now().toString();
    return timestamp.slice(0, 9);
};

/**
 * 生成API签名 (s参数)
 * 算法: MD5(hostname + "|" + version + "|" + timestamp_prefix + "|" + id).slice(-8).toUpperCase()
 * @param {string|number} id - 资源ID (歌曲ID, 歌词ID等)
 * @returns {string} - 签名字符串
 */
export const generateSignature = (id) => {
    // 原项目中的固定值
    const version = "2025.11.4"; // 对应原项目 mkPlayer.version
    // 格式化版本号: 2025.11.4 -> 2025.11.04 (补零)
    const formattedVersion = version.split('.').map(part => part.length === 1 ? "0" + part : part).join('');

    const hostname = window.location.hostname;
    const timePrefix = getTimePrefix();

    // 组合签名原串
    // 注意：原项目在crc32函数中使用了 urlEncode(String(id))，但在生成签名时使用的是原始id还是编码后的id需要确认
    // 查看原项目 ajax.js: s=crc32(urlEncode(String(a.id)))
    // 所以传入的 id 应该是经过 urlEncode 后的

    const encodedId = urlEncode(String(id));
    const signString = `${hostname}|${formattedVersion}|${timePrefix}|${encodedId}`;

    // 生成MD5并截取后8位转大写
    const hash = md5(signString);
    return hash.slice(-8).toUpperCase();
};
