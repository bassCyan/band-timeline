// ========== 全局状态 ==========
let bandData = null;
let currentLightboxPhotos = [];
let currentLightboxIndex = 0;
let scrollObserver = null;

// ========== 初始化 ==========
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("data.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    bandData = await response.json();
  } catch (e) {
    showLoadingError();
    return;
  }

  const savedPassword = localStorage.getItem("band_password");
  if (savedPassword === bandData.password) {
    showMainContent();
  } else {
    setupPasswordGate();
  }
});

function showLoadingError() {
  const gate = document.getElementById("password-gate");
  if (gate) {
    const box = gate.querySelector(".password-box");
    if (box) box.innerHTML = '<h1 class="band-logo">✦</h1><h2>加载失败</h2><p>请刷新页面重试</p>';
  }
}

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
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDate(dateStr) {
  const parts = dateStr.split("-");
  return parts.length === 3 ? `${parts[0]}.${parts[1]}.${parts[2]}` : dateStr;
}

function getThumbPath(photoPath) {
  return photoPath.replace("images/", "images/thumbs/");
}

function getSemesterEmoji(sem) {
  if (sem.includes("春")) return "🌱";
  if (sem.includes("秋")) return "🍂";
  return "📷";
}

function getSemesterCover(sem) {
  // 取第一张照片作为封面
  for (const event of sem.events) {
    if (event.photos && event.photos.length > 0) return event.photos[0];
  }
  return null;
}

// ========== 评论系统（localStorage） ==========
function getComments(eventKey) {
  const all = JSON.parse(localStorage.getItem("band_comments") || "{}");
  return all[eventKey] || [];
}

function addComment(eventKey, name, text) {
  const all = JSON.parse(localStorage.getItem("band_comments") || "{}");
  if (!all[eventKey]) all[eventKey] = [];
  all[eventKey].push({
    name: name,
    text: text,
    time: new Date().toLocaleString("zh-CN"),
  });
  localStorage.setItem("band_comments", JSON.stringify(all));
}

function renderComments(eventKey, container) {
  const comments = getComments(eventKey);
  let html = '<div class="comments-section">';
  html += `<h4 class="comments-title">留言 (${comments.length})</h4>`;

  if (comments.length > 0) {
    html += '<div class="comments-list">';
    comments.forEach((c) => {
      html += `
        <div class="comment-item">
          <div class="comment-header">
            <span class="comment-name">${escapeHtml(c.name)}</span>
            <span class="comment-time">${escapeHtml(c.time)}</span>
          </div>
          <p class="comment-text">${escapeHtml(c.text)}</p>
        </div>
      `;
    });
    html += "</div>";
  }

  html += `
    <div class="comment-form">
      <input type="text" class="comment-name-input" placeholder="你的名字" maxlength="20">
      <textarea class="comment-text-input" placeholder="写点什么吧..." maxlength="500" rows="2"></textarea>
      <button class="comment-submit" onclick="submitComment('${escapeAttr(eventKey)}', this)">留言</button>
    </div>
  `;
  html += "</div>";
  container.innerHTML += html;
}

function submitComment(eventKey, btn) {
  const form = btn.closest(".comment-form");
  const nameInput = form.querySelector(".comment-name-input");
  const textInput = form.querySelector(".comment-text-input");
  const name = nameInput.value.trim() || "匿名";
  const text = textInput.value.trim();

  if (!text) {
    textInput.focus();
    return;
  }

  addComment(eventKey, name, text);
  nameInput.value = "";
  textInput.value = "";

  // 重新渲染评论
  const section = btn.closest(".comments-section");
  const eventCard = btn.closest(".event-card-detail");
  const eventContent = eventCard.parentElement;
  const event = bandData.semesters
    .flatMap((s) => s.events)
    .find((e) => `${e.date}-${e.title}` === eventKey);

  if (event) {
    const tempDiv = document.createElement("div");
    renderComments(eventKey, tempDiv);
    section.outerHTML = tempDiv.innerHTML;
  }
}

// ========== 往年今日 ==========
function renderOnThisDay() {
  const container = document.getElementById("on-this-day");
  if (!container) return;

  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  const todayKey = `${month}-${day}`;

  const matches = [];
  bandData.semesters.forEach((sem) => {
    sem.events.forEach((event) => {
      const parts = event.date.split("-");
      if (parts.length === 3 && `${parts[1]}-${parts[2]}` === todayKey && event.photos && event.photos.length > 0) {
        matches.push(event);
      }
    });
  });

  if (matches.length === 0) { container.style.display = "none"; return; }

  container.style.display = "block";
  let html = '<h2 class="section-title">📅 往年今日</h2><div class="otd-grid">';
  matches.forEach((event) => {
    const year = event.date.split("-")[0];
    html += `
      <div class="otd-card">
        <img src="${escapeAttr(getThumbPath(event.photos[0]))}" data-full="${escapeAttr(event.photos[0])}" alt="${escapeAttr(event.title)}" onclick="openLightboxFromOtd(this)">
        <div class="otd-info">
          <span class="otd-year">${year}</span>
          <span class="otd-title">${escapeHtml(event.title)}</span>
        </div>
      </div>
    `;
  });
  html += "</div>";
  container.innerHTML = html;
}

// ========== 学期相册 ==========
function renderAlbums() {
  const list = document.getElementById("album-list");
  if (!list) return;

  if (!bandData.semesters || bandData.semesters.length === 0) {
    list.innerHTML = '<div class="empty-state">还没有添加事件</div>';
    return;
  }

  let html = "";
  bandData.semesters.forEach((sem, index) => {
    const cover = getSemesterCover(sem);
    const coverThumb = cover ? getThumbPath(cover) : "";
    const totalPhotos = sem.events.reduce((sum, e) => sum + (e.photos ? e.photos.length : 0), 0);
    const emoji = getSemesterEmoji(sem.semester);

    html += `
      <div class="album-card" onclick="showSemester(${index})">
        <div class="album-cover" ${cover ? `style="background-image: url('${escapeAttr(coverThumb)}')"` : ""}>
          ${!cover ? `<span class="album-emoji">${emoji}</span>` : ""}
        </div>
        <div class="album-info">
          <h3 class="album-title">${emoji} ${escapeHtml(sem.semester)}</h3>
          <p class="album-meta">${sem.events.length} 个事件 · ${totalPhotos} 张照片</p>
        </div>
      </div>
    `;
  });
  list.innerHTML = html;

  // 滚动动画
  setupScrollAnimation();
}

function showSemester(index) {
  const sem = bandData.semesters[index];
  if (!sem) return;

  document.getElementById("album-list").style.display = "none";
  document.getElementById("on-this-day").style.display = "none";
  document.getElementById("random-btn").style.display = "none";
  const detail = document.getElementById("event-detail");
  detail.style.display = "block";

  let html = `<h2 class="semester-title">${getSemesterEmoji(sem.semester)} ${escapeHtml(sem.semester)}</h2>`;

  sem.events.forEach((event) => {
    const eventKey = `${event.date}-${event.title}`;
    html += `<div class="event-card-detail">`;
    html += `<span class="event-date">${formatDate(event.date)}</span>`;
    html += `<h3 class="event-title">${escapeHtml(event.title)}</h3>`;

    if (event.photos && event.photos.length > 0) {
      html += '<div class="photo-grid">';
      event.photos.forEach((photo, i) => {
        html += `<img src="${escapeAttr(getThumbPath(photo))}" data-full="${escapeAttr(photo)}" loading="lazy" data-index="${i}" onclick="openLightbox(this)">`;
      });
      html += "</div>";
    }

    html += "</div>";

    // 评论区
    const commentDiv = document.createElement("div");
    renderComments(eventKey, commentDiv);
    html += commentDiv.innerHTML;
  });

  document.getElementById("event-content").innerHTML = html;
  window.scrollTo(0, 0);
}

function setupBackButton() {
  const btn = document.getElementById("back-btn");
  if (btn) {
    btn.addEventListener("click", () => {
      document.getElementById("event-detail").style.display = "none";
      document.getElementById("album-list").style.display = "grid";
      document.getElementById("on-this-day").style.display = "";
      document.getElementById("random-btn").style.display = "";
      // 恢复往年今日显示
      renderOnThisDay();
    });
  }
}

// ========== 滚动动画 ==========
function setupScrollAnimation() {
  if (scrollObserver) scrollObserver.disconnect();
  scrollObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          scrollObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  document.querySelectorAll(".album-card, .event-card-detail").forEach((el) => {
    scrollObserver.observe(el);
  });
}

// ========== 灯箱 ==========
function setupLightbox() {
  const lightbox = document.getElementById("lightbox");
  document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
  document.getElementById("lightbox-prev").addEventListener("click", () => navigateLightbox(-1));
  document.getElementById("lightbox-next").addEventListener("click", () => navigateLightbox(1));
  lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener("keydown", (e) => {
    if (lightbox.style.display === "none") return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") navigateLightbox(-1);
    if (e.key === "ArrowRight") navigateLightbox(1);
  });
}

function openLightbox(imgElement) {
  const container = imgElement.closest(".photo-grid") || imgElement.closest(".otd-grid");
  const photos = Array.from(container.querySelectorAll("img")).map((img) => img.dataset.full || img.src);
  const index = parseInt(imgElement.dataset.index, 10) || 0;
  currentLightboxPhotos = photos;
  currentLightboxIndex = index;
  document.getElementById("lightbox-img").src = photos[index];
  document.getElementById("lightbox").style.display = "flex";
  document.body.style.overflow = "hidden";
}

function openLightboxFromOtd(imgElement) {
  const grid = imgElement.closest(".otd-grid");
  const photos = Array.from(grid.querySelectorAll("img")).map((img) => img.dataset.full || img.src);
  const index = Array.from(grid.querySelectorAll(".otd-card")).indexOf(imgElement.closest(".otd-card"));
  currentLightboxPhotos = photos;
  currentLightboxIndex = index;
  document.getElementById("lightbox-img").src = photos[index];
  document.getElementById("lightbox").style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  document.getElementById("lightbox").style.display = "none";
  document.body.style.overflow = "";
}

function navigateLightbox(direction) {
  currentLightboxIndex = (currentLightboxIndex + direction + currentLightboxPhotos.length) % currentLightboxPhotos.length;
  document.getElementById("lightbox-img").src = currentLightboxPhotos[currentLightboxIndex];
}

// ========== 随机回忆 ==========
function setupRandomButton() {
  const btn = document.getElementById("random-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const allPhotos = [];
    bandData.semesters.forEach((sem) => {
      sem.events.forEach((event) => {
        if (event.photos) event.photos.forEach((p) => allPhotos.push(p));
      });
    });
    if (allPhotos.length === 0) return;
    const pick = allPhotos[Math.floor(Math.random() * allPhotos.length)];
    currentLightboxPhotos = allPhotos;
    currentLightboxIndex = allPhotos.indexOf(pick);
    document.getElementById("lightbox-img").src = pick;
    document.getElementById("lightbox").style.display = "flex";
    document.body.style.overflow = "hidden";
  });
}
