// theme.js

function initTheme() {
  // بارگذاری تم ذخیره شده از localStorage
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  // هماهنگ‌سازی دکمه‌ی تنظیمات در هدر (در آینده)
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.checked = (savedTheme === 'dark');
  }
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  
  // به‌روزرسانی وضعیت دکمه‌ی تنظیمات در صورت وجود
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.checked = (theme === 'dark');
  }
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

// مقداردهی اولیه
document.addEventListener('DOMContentLoaded', initTheme);