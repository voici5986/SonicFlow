window.addEventListener('load', () => {
  window.setTimeout(() => {
    const splash = document.getElementById('splash-screen');
    if (!splash) return;

    splash.style.opacity = '0';
    window.setTimeout(() => {
      splash.style.display = 'none';
    }, 300);
  }, 1000);
});
