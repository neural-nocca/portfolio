/* ============================================================
   Логіка: тягне профіль і репозиторії з GitHub API
   та автоматично малює їх. Нічого вписувати вручну не треба —
   створила репозиторій → він сам з'явився у списку.
   ============================================================ */

/* ====================== НАЛАШТУВАННЯ ======================
   Нік профілю задається в index.html (атрибут data-username).
   Тут — два необов'язкові текстові налаштування.            */

// Текст «про себе». Порожньо → візьметься Bio з GitHub-профілю.
// Тут можна написати довше, ніж дозволяє GitHub.
const ABOUT = "";

// Куди веде стрілка › на телефоні. Порожньо → профіль GitHub.
// Можна вписати, напр., "mailto:пошта@приклад.com".
const HEADER_LINK = "";
/* ========================================================== */

const app = document.getElementById("app");
const USERNAME = app.dataset.username;
const API = "https://api.github.com";

// Кольори популярних мов (як у GitHub). Решта — сірий за замовчуванням.
const LANG_COLORS = {
  JavaScript: "#f1e05a", TypeScript: "#3178c6", HTML: "#e34c26",
  CSS: "#563d7c", Python: "#3572A5", Java: "#b07219", "C++": "#f34b7d",
  C: "#555555", "C#": "#178600", Go: "#00ADD8", Rust: "#dea584",
  PHP: "#4F5D95", Ruby: "#701516", Swift: "#F05138", Kotlin: "#A97BFF",
  Dart: "#00B4AB", Shell: "#89e051", Vue: "#41b883", Jupyter: "#DA5B0B",
  SCSS: "#c6538c", Astro: "#ff5a03", Svelte: "#ff3e00",
};
const colorFor = (lang) => LANG_COLORS[lang] || "#8b949e";

// Допоміжне: безпечний текст (захист від HTML у назвах/описах)
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );

// Дата у зрозумілому вигляді: «оновлено 12 черв. 2026»
const fmtDate = (iso) =>
  "оновлено " +
  new Date(iso).toLocaleDateString("uk-UA", {
    day: "numeric", month: "short", year: "numeric",
  });

/* ---------- 1. Профіль у ліву колонку ---------- */
async function loadProfile() {
  const box = document.getElementById("profile");
  try {
    const res = await fetch(`${API}/users/${USERNAME}`);
    if (!res.ok) throw new Error(res.status);
    const u = await res.json();

    const about = ABOUT || u.bio || "";
    const headerLink = HEADER_LINK || u.html_url;

    box.innerHTML = `
      <div class="profile__main">
        <img class="profile__avatar" src="${esc(u.avatar_url)}" alt="Аватар ${esc(USERNAME)}" />
        <div class="profile__id">
          <a class="profile__nick" href="${esc(u.html_url)}" target="_blank" rel="noopener">@${esc(USERNAME)}</a>
          ${u.name && u.name.toLowerCase() !== USERNAME.toLowerCase()
            ? `<div class="profile__name">${esc(u.name)}</div>` : ""}
        </div>
        <a class="profile__chevron" href="${esc(headerLink)}" target="_blank" rel="noopener" aria-label="Перейти на профіль">›</a>
      </div>
      ${about ? `<p class="profile__bio">${esc(about)}</p>` : ""}
      <div class="profile__stats">
        <div class="stat"><span class="stat__num">${u.public_repos}</span><span class="stat__label">проєктів</span></div>
        <div class="stat"><span class="stat__num" id="stat-stars">—</span><span class="stat__label">найкраща оцінка</span></div>
        <div class="stat"><span class="stat__num" id="stat-forks">—</span><span class="stat__label">форків</span></div>
      </div>
      <a class="profile__link" href="${esc(u.html_url)}" target="_blank" rel="noopener">Профіль на GitHub →</a>
    `;
    updateSidebarStats(); // якщо репо вже завантажились — підставить цифри
  } catch {
    box.innerHTML = `<p class="profile__skeleton">Не вдалося завантажити профіль 😕</p>`;
  }
}

/* ---------- 2. Репозиторії ---------- */
let allRepos = []; // тримаємо в пам'яті, щоб фільтрувати/сортувати без нових запитів
let repoStats = null; // { maxStars, totalForks } — рахуємо після завантаження репо
let sortValue = "stars"; // поточне сортування (за замовчуванням — найкращі)

// Вписує «найкраща оцінка» і «форків» у статистику профілю.
// Викликається і після профілю, і після репо — спрацює той, хто завершиться другим.
function updateSidebarStats() {
  if (!repoStats) return;
  const s = document.getElementById("stat-stars");
  const f = document.getElementById("stat-forks");
  if (s) s.textContent = repoStats.maxStars;
  if (f) f.textContent = repoStats.totalForks;
}

async function loadRepos() {
  const status = document.getElementById("status");
  try {
    const res = await fetch(`${API}/users/${USERNAME}/repos?per_page=100&sort=updated`);
    if (!res.ok) throw new Error(res.status);
    let repos = await res.json();

    // Ховаємо форки й архіви — показуємо свої роботи
    repos = repos.filter((r) => !r.fork && !r.archived);
    allRepos = repos;

    if (!repos.length) {
      status.textContent = "Поки що немає публічних проєктів.";
      return;
    }

    // Рахуємо найкращу оцінку (максимум зірок) і суму форків
    repoStats = {
      maxStars: repos.reduce((m, r) => Math.max(m, r.stargazers_count), 0),
      totalForks: repos.reduce((s, r) => s + r.forks_count, 0),
    };
    updateSidebarStats();

    render();

    // Підтягуємо співвідношення мов по кожному репо (окремі запити, тому — обережно з лімітом)
    for (const repo of repos) loadLanguages(repo);
  } catch (e) {
    status.innerHTML =
      String(e.message) === "403"
        ? "GitHub тимчасово обмежив запити (60/год без входу). Спробуй за годину 🙏"
        : "Не вдалося завантажити проєкти 😕";
  }
}

/* ---------- 3. Смужка мов для однієї картки ---------- */
async function loadLanguages(repo) {
  const slot = document.querySelector(`[data-langs="${repo.id}"]`);
  if (!slot) return;
  try {
    const res = await fetch(repo.languages_url);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json(); // { JavaScript: 1234, CSS: 567, ... } у байтах
    const langs = Object.entries(data);
    if (!langs.length) { slot.innerHTML = ""; return; }

    const total = langs.reduce((s, [, v]) => s + v, 0);
    const bar = langs
      .map(([name, v]) => `<span class="langbar__seg" style="width:${(v / total) * 100}%;background:${colorFor(name)}" title="${esc(name)} ${((v / total) * 100).toFixed(1)}%"></span>`)
      .join("");
    const legend = langs
      .map(([name]) => `<span class="langlegend__item"><span class="langlegend__dot" style="background:${colorFor(name)}"></span>${esc(name)}</span>`)
      .join("");

    slot.innerHTML = `<div class="langbar">${bar}</div><div class="langlegend">${legend}</div>`;
  } catch {
    // Якщо ліміт або помилка — показуємо хоча б основну мову
    if (repo.language) {
      slot.innerHTML = `<div class="langbar"><span class="langbar__seg" style="width:100%;background:${colorFor(repo.language)}"></span></div>
        <div class="langlegend"><span class="langlegend__item"><span class="langlegend__dot" style="background:${colorFor(repo.language)}"></span>${esc(repo.language)}</span></div>`;
    } else {
      slot.innerHTML = "";
    }
  }
}

/* ---------- 4. Малювання сітки (з урахуванням пошуку/сортування) ---------- */
function render() {
  const grid = document.getElementById("grid");
  const q = document.getElementById("search").value.trim().toLowerCase();
  const sort = sortValue;

  let list = allRepos.filter(
    (r) =>
      !q ||
      r.name.toLowerCase().includes(q) ||
      (r.description || "").toLowerCase().includes(q)
  );

  list.sort((a, b) => {
    if (sort === "stars") return b.stargazers_count - a.stargazers_count;
    if (sort === "name") return a.name.localeCompare(b.name);
    return new Date(b.updated_at) - new Date(a.updated_at); // updated
  });

  if (!list.length) {
    grid.innerHTML = `<p class="status">Нічого не знайдено за запитом «${esc(q)}».</p>`;
    return;
  }

  grid.innerHTML = list
    .map(
      (r) => `
      <article class="card">
        <div class="card__top">
          <a class="card__name" href="${esc(r.html_url)}" target="_blank" rel="noopener">${esc(r.name)}</a>
          <div class="card__meta">
            <span title="Зірки">⭐ ${r.stargazers_count}</span>
            <span title="Форки">⑂ ${r.forks_count}</span>
          </div>
        </div>
        <p class="card__desc">${esc(r.description || "Без опису")}</p>
        <div class="card__meta"><span>${fmtDate(r.updated_at)}</span></div>
        <div class="langs" data-langs="${r.id}"></div>
      </article>`
    )
    .join("");
}

/* ---------- 5. Пошук + власний випадаючий список сортування ---------- */
document.getElementById("search").addEventListener("input", render);

const dd = document.getElementById("sortDropdown");
const ddBtn = document.getElementById("sortBtn");
const ddList = document.getElementById("sortList");
const ddLabel = document.getElementById("sortLabel");

function openDropdown(open) {
  dd.classList.toggle("is-open", open);
  ddBtn.setAttribute("aria-expanded", open ? "true" : "false");
  ddList.hidden = !open;
}

// Клік по кнопці — відкрити/закрити
ddBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  openDropdown(ddList.hidden);
});

// Вибір пункту — оновити значення, підпис, активний стан і перемалювати
ddList.querySelectorAll(".dropdown__item").forEach((item) => {
  item.addEventListener("click", () => {
    sortValue = item.dataset.value;
    ddLabel.textContent = item.textContent;
    ddList.querySelectorAll(".dropdown__item").forEach((i) => i.classList.remove("is-active"));
    item.classList.add("is-active");
    openDropdown(false);
    render();
  });
});

// Клік будь-де поза меню — закрити
document.addEventListener("click", () => openDropdown(false));

/* ---------- Старт ---------- */
loadProfile();
loadRepos();
