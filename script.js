// ========== 全局状态 ==========
let bandData = null;
let currentLightboxPhotos = [];
let currentLightboxIndex = 0;

// ========== 初始化 ==========
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("data.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    bandData = await response.json();
  } catch (e) {
    document.getElementById("password-gate").querySelector(".password-box").innerHTML =
      '<h1 class="band-logo">✦</h1><h2>加载失败</h2><p>请刷新页面重试</p>';
    return;
  }

  const saved = localStorage.getItem("band_password");
  if (saved === bandData.password) {
    showMainContent();
  } else {
    setupPasswordGate();
  }
});

// ========== 密码门 ==========
function setupPasswordGate() {
  const btn = document.getElementById("password-btn");
  const input = document.getElementById("password-input");
  const error = document.getElementById("password-error");
  btn.addEventListener("click", () => checkPassword(input, error));
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") checkPassword(input, error); });
  input.focus();
}

function checkPassword(input, error) {
  if (input.value === bandData.password) {
    localStorage.setItem("band_password", input.value);
    showMainContent();
  } else {
    error.style.display = "block";
    input.value = "";
    input.focus();
  }
}

function showMainContent() {
  document.getElementById("password-gate").style.display = "none";
  document.getElementById("main-content").style.display = "block";
  renderAlbums();
  renderOnThisDay();
  setupLightbox();
  setupRandomButton();
  setupBackButton();
}

// ========== 工具函数 ==========
function esc(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function getThumb(p) {
  return p.replace("images/", "images/thumbs/");
}

function fmtDate(s) {
  const p = s.split("-");
  return p.length === 3 ? `${p[0]}.${p[1]}.${p[2]}` : s;
}

function semEmoji(s) {
  if (s.includes("春")) return "🌱";
  if (s.includes("秋")) return "🍂";
  return "📷";
}

// ========== 往年今日 ==========
function renderOnThisDay() {
  const el = document.getElementById("on-this-day");
  if (!el) return;
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const today = `${mm}-${dd}`;
  const hits = [];
  bandData.semesters.forEach(s => s.events.forEach(e => {
    const p = e.date.split("-");
    if (p.length === 3 && `${p[1]}-${p[2]}` === today && e.photos?.length) hits.push(e);
  }));
  if (!hits.length) { el.style.display = "none"; return; }
  el.style.display = "block";
  let h = `<h2 class="section-title">📅 往年今日</h2><div class="otd-grid">`;
  hits.forEach(e => {
    h += `<div class="otd-card" onclick="openOtdLightbox(this)">
      <img src="${getThumb(e.photos[0])}" data-full="${e.photos[0]}" alt="${esc(e.title)}">
      <div class="otd-info"><span class="otd-year">${e.date.split("-")[0]}</span><span class="otd-title">${esc(e.title)}</span></div>
    </div>`;
  });
  h += `</div>`;
  el.innerHTML = h;
}

// ========== 学期相册（首页） ==========
function renderAlbums() {
  const el = document.getElementById("album-list");
  if (!el) return;
  if (!bandData.semesters?.length) { el.innerHTML = '<div class="empty-state">还没有添加事件</div>'; return; }
  let h = "";
  bandData.semesters.forEach((s, i) => {
    const cover = s.events[0]?.photos?.[0];
    const total = s.events.reduce((n, e) => n + (e.photos?.length || 0), 0);
    h += `<div class="album-card" data-idx="${i}">
      <div class="album-cover" ${cover ? `style="background-image:url('${getThumb(cover)}')"` : ""}>
        ${!cover ? `<span class="album-emoji">${semEmoji(s.semester)}</span>` : ""}
      </div>
      <div class="album-info">
        <h3 class="album-title">${semEmoji(s.semester)} ${esc(s.semester)}</h3>
        <p class="album-meta">${s.events.length} 个事件 · ${total} 张照片</p>
      </div>
    </div>`;
  });
  el.innerHTML = h;
  el.querySelectorAll(".album-card").forEach(card => {
    card.addEventListener("click", () => showSemester(parseInt(card.dataset.idx)));
  });
  requestAnimationFrame(() => {
    el.querySelectorAll(".album-card").forEach((c, i) => {
      setTimeout(() => c.classList.add("visible"), i * 80);
    });
  });
}

// ========== 学期内页：照片连续排列 ==========
function showSemester(idx) {
  const sem = bandData.semesters[idx];
  if (!sem) return;
  document.getElementById("album-list").style.display = "none";
  document.getElementById("on-this-day").style.display = "none";
  document.getElementById("random-btn").style.display = "none";
  document.getElementById("comment-btn").style.display = "none";
  const detail = document.getElementById("event-detail");
  detail.style.display = "block";

  let h = `<h2 class="semester-title">${semEmoji(sem.semester)} ${esc(sem.semester)}</h2>`;

  sem.events.forEach(ev => {
    if (!ev.photos?.length) return;
    h += `<div class="event-section">`;
    h += `<div class="event-section-header">
      <span class="event-date">${fmtDate(ev.date)}</span>
      <span class="event-section-title">${esc(ev.title)}</span>
    </div>`;
    h += `<div class="event-photos">`;
    ev.photos.forEach((p, i) => {
      h += `<div class="event-photo-item" data-full="${p}" data-title="${esc(ev.title)}" data-date="${fmtDate(ev.date)}">
        <img src="${getThumb(p)}" loading="lazy">
      </div>`;
    });
    h += `</div></div>`;
  });

  document.getElementById("event-content").innerHTML = h;

  // 点击照片 → 打开详情
  document.querySelectorAll(".event-photo-item").forEach(item => {
    item.addEventListener("click", () => openPhotoDetail(item));
  });

  window.scrollTo(0, 0);
}

// ========== 照片详情（大图+评论） ==========
function openPhotoDetail(item) {
  const full = item.dataset.full;
  const title = item.dataset.title;
  const date = item.dataset.date;

  document.getElementById("event-detail").style.display = "none";
  const detailView = document.getElementById("photo-detail");
  detailView.style.display = "block";

  let h = `<button class="back-btn" onclick="closePhotoDetail()">&#8592; 返回</button>`;
  h += `<div class="photo-detail-card">`;
  h += `<img src="${full}" class="photo-detail-img">`;
  h += `<div class="photo-detail-info">`;
  h += `<span class="event-date">${date}</span>`;
  h += `<h3 class="event-title">${title}</h3>`;
  h += `</div>`;
  h += `<div class="photo-detail-comments">`;
  h += `<div id="photo-comments"></div>`;
  h += `</div>`;
  h += `</div>`;

  detailView.innerHTML = h;
  window.scrollTo(0, 0);
}

function closePhotoDetail() {
  document.getElementById("photo-detail").style.display = "none";
  document.getElementById("event-detail").style.display = "block";
}

function setupBackButton() {
  document.getElementById("back-btn")?.addEventListener("click", () => {
    document.getElementById("event-detail").style.display = "none";
    document.getElementById("album-list").style.display = "grid";
    document.getElementById("random-btn").style.display = "";
    document.getElementById("comment-btn").style.display = "";
    renderOnThisDay();
  });
}

// ========== 灯箱（全屏看图） ==========
function setupLightbox() {
  const lb = document.getElementById("lightbox");
  document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
  document.getElementById("lightbox-prev").addEventListener("click", () => nav(-1));
  document.getElementById("lightbox-next").addEventListener("click", () => nav(1));
  lb.addEventListener("click", e => { if (e.target === lb) closeLightbox(); });
  document.addEventListener("keydown", e => {
    if (lb.style.display === "none") return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") nav(-1);
    if (e.key === "ArrowRight") nav(1);
  });
}

function openLightbox(img) {
  const grid = img.closest(".photo-grid") || img.closest(".event-photos");
  if (!grid) return;
  currentLightboxPhotos = Array.from(grid.querySelectorAll("[data-full]")).map(i => i.dataset.full);
  currentLightboxIndex = currentLightboxPhotos.indexOf(img.dataset.full);
  if (currentLightboxIndex < 0) currentLightboxIndex = 0;
  showLightbox();
}

function openOtdLightbox(card) {
  const grid = card.closest(".otd-grid");
  currentLightboxPhotos = Array.from(grid.querySelectorAll("img")).map(i => i.dataset.full);
  currentLightboxIndex = Array.from(grid.children).indexOf(card);
  showLightbox();
}

function showLightbox() {
  document.getElementById("lightbox-img").src = currentLightboxPhotos[currentLightboxIndex];
  document.getElementById("lightbox").style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  document.getElementById("lightbox").style.display = "none";
  document.body.style.overflow = "";
}

function nav(d) {
  currentLightboxIndex = (currentLightboxIndex + d + currentLightboxPhotos.length) % currentLightboxPhotos.length;
  document.getElementById("lightbox-img").src = currentLightboxPhotos[currentLightboxIndex];
}

// ========== 随机回忆 ==========
function setupRandomButton() {
  document.getElementById("random-btn")?.addEventListener("click", () => {
    const all = [];
    bandData.semesters.forEach(s => s.events.forEach(e => e.photos?.forEach(p => all.push(p))));
    if (!all.length) return;
    currentLightboxPhotos = all;
    currentLightboxIndex = Math.floor(Math.random() * all.length);
    showLightbox();
  });
}
