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

  // 检查是否已输入过密码
  const savedPassword = localStorage.getItem("band_password");
  if (savedPassword === bandData.password) {
    showMainContent();
  } else {
    setupPasswordGate();
  }
});

// ========== Loading / Error ==========
function showLoadingError() {
  const gate = document.getElementById("password-gate");
  if (gate) {
    gate.querySelector(".password-box p").textContent =
      "加载失败，请刷新页面重试";
    gate.querySelector(".password-box input").style.display = "none";
    gate.querySelector(".password-box button").style.display = "none";
  }
}

// ========== 密码门 ==========
function setupPasswordGate() {
  const btn = document.getElementById("password-btn");
  const input = document.getElementById("password-input");
  const error = document.getElementById("password-error");

  btn.addEventListener("click", () => checkPassword(input, error));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") checkPassword(input, error);
  });
  // 自动聚焦
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
  document.getElementById("band-name").textContent = bandData.band_name;
  document.title = bandData.band_name + " - 时光线";
  renderTimeline();
  setupLightbox();
}

// ========== 工具函数 ==========
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatDate(dateStr) {
  // 直接拆字符串，避免时区问题
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[0]}.${parts[1]}.${parts[2]}`;
  }
  return dateStr;
}

// ========== 时间线渲染 ==========
function renderTimeline() {
  const timeline = document.getElementById("timeline");

  if (!bandData.events || bandData.events.length === 0) {
    timeline.innerHTML =
      '<div class="empty-state">还没有添加事件，运行 add_event.py 开始添加</div>';
    return;
  }

  const events = [...bandData.events].sort(
    (a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0)
  );

  events.forEach((event) => {
    const card = createEventCard(event);
    timeline.appendChild(card);
  });

  setupScrollAnimation();
}

function createEventCard(event) {
  const card = document.createElement("div");
  card.className = "event-card";

  let html = `
    <span class="event-date">${formatDate(event.date)}</span>
    <h3 class="event-title">${escapeHtml(event.title)}</h3>
  `;

  if (event.description) {
    html += `<p class="event-desc">${escapeHtml(event.description)}</p>`;
  }

  if (event.photos && event.photos.length > 0) {
    html += '<div class="photo-grid">';
    event.photos.forEach((photo, index) => {
      html += `<img src="${escapeAttr(photo)}" alt="照片" loading="lazy" data-index="${index}" onclick="openLightbox(this)">`;
    });
    html += "</div>";
  }

  if (event.video) {
    html += `<a href="${escapeAttr(event.video)}" target="_blank" rel="noopener" class="video-link">&#9654; 观看视频</a>`;
  }

  card.innerHTML = html;
  return card;
}

// ========== 滚动动画 ==========
function setupScrollAnimation() {
  // 清理之前的 observer
  if (scrollObserver) {
    scrollObserver.disconnect();
  }

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

  document.querySelectorAll(".event-card").forEach((card) => {
    scrollObserver.observe(card);
  });
}

// ========== 灯箱 ==========
function setupLightbox() {
  const lightbox = document.getElementById("lightbox");
  const closeBtn = document.getElementById("lightbox-close");
  const prevBtn = document.getElementById("lightbox-prev");
  const nextBtn = document.getElementById("lightbox-next");

  closeBtn.addEventListener("click", closeLightbox);
  prevBtn.addEventListener("click", () => navigateLightbox(-1));
  nextBtn.addEventListener("click", () => navigateLightbox(1));

  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (lightbox.style.display === "none") return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") navigateLightbox(-1);
    if (e.key === "ArrowRight") navigateLightbox(1);
  });
}

function openLightbox(imgElement) {
  const card = imgElement.closest(".event-card");
  const photos = Array.from(card.querySelectorAll(".photo-grid img")).map(
    (img) => img.src
  );
  const index = parseInt(imgElement.dataset.index, 10);

  currentLightboxPhotos = photos;
  currentLightboxIndex = index;

  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");

  lightboxImg.src = photos[index];
  lightbox.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  document.getElementById("lightbox").style.display = "none";
  document.body.style.overflow = "";
}

function navigateLightbox(direction) {
  currentLightboxIndex =
    (currentLightboxIndex + direction + currentLightboxPhotos.length) %
    currentLightboxPhotos.length;
  document.getElementById("lightbox-img").src =
    currentLightboxPhotos[currentLightboxIndex];
}
