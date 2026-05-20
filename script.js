// ========== 全局状态 ==========
let bandData = null;
let currentLightboxPhotos = [];
let currentLightboxIndex = 0;

// ========== 初始化 ==========
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("data.json");
    bandData = await response.json();
  } catch (e) {
    alert("无法加载数据文件，请检查 data.json 是否存在");
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

// ========== 密码门 ==========
function setupPasswordGate() {
  const btn = document.getElementById("password-btn");
  const input = document.getElementById("password-input");
  const error = document.getElementById("password-error");

  btn.addEventListener("click", () => checkPassword(input, error));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") checkPassword(input, error);
  });
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

// ========== 时间线渲染 ==========
function renderTimeline() {
  const timeline = document.getElementById("timeline");
  const events = [...bandData.events].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  events.forEach((event) => {
    const card = createEventCard(event);
    timeline.appendChild(card);
  });

  // 设置滚动动画
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
      html += `<img src="${photo}" alt="照片" loading="lazy" data-index="${index}" onclick="openLightbox(this)">`;
    });
    html += "</div>";
  }

  if (event.video) {
    html += `<a href="${event.video}" target="_blank" class="video-link">▶ 观看视频</a>`;
  }

  card.innerHTML = html;
  return card;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ========== 滚动动画 ==========
function setupScrollAnimation() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
        }
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll(".event-card").forEach((card) => {
    observer.observe(card);
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
  const index = parseInt(imgElement.dataset.index);

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
