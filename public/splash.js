const hideSplash = () => {
  const splash = document.getElementById('splash-screen');
  if (!splash) return;
  splash.style.opacity = '0';
  window.setTimeout(() => {
    splash.style.display = 'none';
  }, 300);
};

// React 首次渲染完成后立即隐藏，避免人为等待固定时长拖慢首屏
window.addEventListener('otonei:ready', hideSplash, { once: true });

// 兜底：无论 React 是否就绪，3 秒后强制隐藏，避免启动失败时遮罩永不消失
window.setTimeout(hideSplash, 3000);
