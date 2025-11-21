/**
 * 开发环境日志工具
 * 只在开发环境输出日志，生产环境不输出
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const devLog = (...args) => {
    if (isDevelopment) {
        console.log(...args);
    }
};

export const devWarn = (...args) => {
    if (isDevelopment) {
        console.warn(...args);
    }
};

// console.error 始终保留
export const devError = console.error;
