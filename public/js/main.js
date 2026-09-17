'use strict';

// ===== Theme (Light/Dark) with persistence =====
(function () {
  const stored = localStorage.getItem('sigap-theme');
  if (stored) document.documentElement.setAttribute('data-theme', stored);
})();

function toggleTheme() {
  const el = document.documentElement;
  const next = el.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  el.setAttribute('data-theme', next);
  localStorage.setItem('sigap-theme', next);
  updateThemeIcon();
}

function updateThemeIcon() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.querySelectorAll('[data-theme-sun]').forEach((e) => (e.style.display = isDark ? 'none' : ''));
  document.querySelectorAll('[data-theme-moon]').forEach((e) => (e.style.display = isDark ? '' : 'none'));
}

// ===== Sidebar drawer (mobile) =====
function toggleSidebar() {
  document.querySelector('.sidebar')?.classList.toggle('open');
  document.querySelector('.overlay')?.classList.toggle('open');
}
function closeSidebar() {
  document.querySelector('.sidebar')?.classList.remove('open');
  document.querySelector('.overlay')?.classList.remove('open');
}

// ===== Modal =====
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('open');
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('open');
}
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('open');
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-backdrop.open').forEach((m) => m.classList.remove('open'));
  }
});

// ===== Prevent double submit + loading state =====
document.addEventListener('submit', (e) => {
  const form = e.target;
  if (form.dataset.noguard) return;
  const btn = form.querySelector('button[type="submit"]');
  if (btn) {
    btn.disabled = true;
    const orig = btn.innerHTML;
    btn.dataset.orig = orig;
    btn.innerHTML = 'Menyimpan...';
    // Re-enable if navigation somehow does not occur.
    setTimeout(() => {
      if (btn.disabled) { btn.disabled = false; btn.innerHTML = orig; }
    }, 8000);
  }
});

// ===== Toast auto-dismiss =====
document.addEventListener('DOMContentLoaded', () => {
  updateThemeIcon();
  restoreSidebarScroll();
  const toast = document.querySelector('.toast');
  if (toast) {
    setTimeout(() => {
      toast.style.transition = 'opacity 0.4s';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }
});

// ===== Keep sidebar scroll position across page navigations =====
function restoreSidebarScroll() {
  const nav = document.querySelector('.sidebar-nav');
  if (!nav) return;
  const saved = sessionStorage.getItem('sigap-sidebar-scroll');
  if (saved !== null) nav.scrollTop = parseInt(saved, 10) || 0;
  nav.addEventListener('scroll', () => {
    sessionStorage.setItem('sigap-sidebar-scroll', String(nav.scrollTop));
  });
}


// ===== Delete confirmation =====
function confirmDelete(message) {
  return confirm(message || 'Yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.');
}

// ===== Fetch JSON helper for detail/edit modals =====
async function fetchJSON(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('Gagal memuat data.');
  return res.json();
}
