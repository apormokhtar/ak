import { initDatabase } from './modules/db.js';

document.querySelectorAll('.group-toggle').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    btn.classList.toggle('open');
    const sub = document.querySelector(`.submenu[data-group="${btn.dataset.group}"]`);
    if (sub) sub.classList.toggle('open');
  });
});

const pageMap = {
  dashboard: 'modules/dashboard/index.html',
  sales: 'modules/sales/index.html',
  'sales-list': 'modules/sales/list.html',
  'movies-iranian': 'modules/movies/iranian.html',
  'movies-foreign': 'modules/movies/foreign/foreign.html',
  'movies-animation': 'modules/movies/animation.html',
  'movies-korean': 'modules/movies/korean.html',
  'movies-indian': 'modules/movies/indian.html',
  'movies-other': 'modules/movies/other.html',
  'series-iranian': 'modules/series/iranian.html',
  // سایر صفحات را بعداً اضافه کنید
  settings: 'modules/settings/index.html'
};

async function loadPage(page) {
  document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`[data-page="${page}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  const content = document.getElementById('content');
  const path = pageMap[page] || 'modules/dashboard/index.html';

  if (!window.electronAPI) {
    content.innerHTML = '<div class="card"><h2>خطا: API در دسترس نیست</h2></div>';
    return;
  }

  try {
    const result = await window.electronAPI.readModule(path);
    if (result.success) {
      content.innerHTML = result.content;
      // اجرای دستی اسکریپت‌های داخل صفحه (برای رفع مشکل innerHTML)
      const scripts = content.querySelectorAll('script');
      scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        if (oldScript.src) newScript.src = oldScript.src;
        else newScript.textContent = oldScript.textContent;
        document.head.appendChild(newScript);
        oldScript.remove();
      });
      // فراخوانی تابع init مخصوص صفحه
      const initFn = window[`init_${page.replace(/-/g, '_')}`];
      if (typeof initFn === 'function') setTimeout(initFn, 100);
    } else {
      content.innerHTML = `<div class="card"><h2>خطا در بارگذاری</h2><p>${result.error}</p></div>`;
    }
  } catch (err) {
    content.innerHTML = `<div class="card"><h2>خطا</h2><p>${err.message}</p></div>`;
  }
}

document.querySelectorAll('.sidebar-btn[data-page]').forEach(btn => {
  btn.addEventListener('click', () => loadPage(btn.dataset.page));
});
import { initDatabase } from './modules/db.js';
initDatabase();
loadPage('dashboard');