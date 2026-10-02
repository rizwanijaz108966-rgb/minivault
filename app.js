/* =========================================================
   MiniVault - Part 1 (frontend only)
   1) DATA      sample apps/games (later: loaded from Supabase)
   2) HELPERS   small functions that build the HTML
   3) VIEWS     one function per screen
   4) NAVIGATION  switching screens, back button, search
   ========================================================= */

/* ---------- 1) DATA ----------
   icon / screenshots / apk are empty for now.
   Later, put real image URLs and an APK link here
   (or fill them from Supabase) and the UI will use them automatically. */
const items = [
  { id: 1, type: "game", name: "Pixel Runner", short: "Dash through neon cities.",
    version: "1.2.0", size: "48 MB", emoji: "🏃", color: "linear-gradient(135deg,#ff6b6b,#c44569)",
    desc: "A fast one-tap runner. Jump over obstacles, collect coins and beat your best distance. Simple controls, hard to put down.",
    icon: "", screenshots: [], apk: "", featured: true },
  { id: 2, type: "game", name: "Star Drift", short: "Pilot a ship through asteroid fields.",
    version: "0.9.5", size: "120 MB", emoji: "🚀", color: "linear-gradient(135deg,#4facfe,#6a5af9)",
    desc: "Steer your ship by tilting your phone, dodge asteroids and upgrade your engines between flights.",
    icon: "", screenshots: [], apk: "", featured: true },
  { id: 3, type: "game", name: "Block Quest", short: "Relaxing puzzle adventure.",
    version: "2.0.1", size: "35 MB", emoji: "🧩", color: "linear-gradient(135deg,#43c59e,#2a8f6a)",
    desc: "Slide and match colorful blocks across 100 handmade levels. No timers, no stress.",
    icon: "", screenshots: [], apk: "", featured: false },
  { id: 4, type: "app", name: "Note Pad", short: "Quick notes that stay private.",
    version: "3.1.0", size: "12 MB", emoji: "📝", color: "linear-gradient(135deg,#ffb547,#e8702a)",
    desc: "A clean notes app. Write fast, pin important notes and find anything with search.",
    icon: "", screenshots: [], apk: "", featured: true },
  { id: 5, type: "app", name: "Quick Tools", short: "Calculator, timer and unit converter.",
    version: "1.4.2", size: "8 MB", emoji: "🧰", color: "linear-gradient(135deg,#a18cd1,#7b5cc4)",
    desc: "Everyday tools in one small app: calculator, stopwatch, countdown timer and unit converter.",
    icon: "", screenshots: [], apk: "", featured: false }
];

/* ---------- 2) HELPERS ---------- */
const $ = (sel) => document.querySelector(sel);

// Makes text safe to put inside HTML (important once data comes from a database)
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Icon: real image if a URL exists, otherwise a colored placeholder with an emoji
const iconHtml = (a, big) => a.icon
  ? `<img class="ico ${big ? "lg" : ""}" src="${esc(a.icon)}" alt="">`
  : `<div class="ico ${big ? "lg" : ""}" style="background:${a.color}">${a.emoji}</div>`;

// Download button: works as soon as an apk link exists, otherwise it is shown disabled
const dlHtml = (a, label) => a.apk
  ? `<a class="dl" href="${esc(a.apk)}" download>${label}</a>`
  : `<button class="dl" disabled>${label === "Download" ? "Soon" : "Not available yet"}</button>`;

const cardHtml = (a) => `
  <article class="card" data-id="${a.id}">
    ${iconHtml(a)}
    <div class="info">
      <h3>${esc(a.name)}</h3>
      <p>${esc(a.short)}</p>
      <small>v${esc(a.version)} • ${esc(a.size)}</small>
    </div>
    ${dlHtml(a, "Download")}
  </article>`;

const bannerHtml = (a) => `
  <div class="banner" data-id="${a.id}" style="background:${a.color}">
    <span class="big-emoji">${a.emoji}</span>
    <h3>${esc(a.name)}</h3>
    <p>${esc(a.short)}</p>
  </div>`;

const listHtml = (arr) => arr.length
  ? `<div class="list">${arr.map(cardHtml).join("")}</div>`
  : `<p class="empty">Nothing found. Try a different word.</p>`;

const byType = (t) => items.filter((a) => a.type === t);

function matches(q) {
  q = q.trim().toLowerCase();
  if (!q) return items;
  return items.filter((a) =>
    [a.name, a.short, a.desc, a.type].join(" ").toLowerCase().includes(q));
}

/* ---------- 3) VIEWS ---------- */
const views = {
  home: () => `
    <section class="view">
      <input class="searchbar" id="homeSearch" type="search" placeholder="Search apps and games" aria-label="Search">
      <h2>Featured</h2>
      <div class="featured">${items.filter((a) => a.featured).map(bannerHtml).join("")}</div>
      <h2>Popular Games</h2>
      ${listHtml(byType("game"))}
      <h2>Latest Apps</h2>
      ${listHtml(byType("app"))}
    </section>`,

  games: () => `<section class="view"><h2>Games</h2>${listHtml(byType("game"))}</section>`,
  apps: () => `<section class="view"><h2>Apps</h2>${listHtml(byType("app"))}</section>`,

  search: () => `
    <section class="view">
      <input class="searchbar" id="searchInput" type="search" placeholder="Search apps and games"
             aria-label="Search" value="${esc(state.q)}">
      <h2>Results</h2>
      <div id="results">${listHtml(matches(state.q))}</div>
    </section>`,

  detail: () => {
    const a = items.find((x) => x.id === state.id);
    if (!a) return `<p class="empty">This item could not be found.</p>`;
    // Real screenshots if you add URLs, otherwise 3 placeholders
    const shots = (a.screenshots.length ? a.screenshots : [null, null, null]).map((s, i) =>
      s ? `<img class="shot" src="${esc(s)}" alt="Screenshot ${i + 1}">`
        : `<div class="shot" style="background:${a.color}">Screenshot ${i + 1}</div>`).join("");
    return `
      <section class="view">
        <button class="back" id="backBtn">← Back</button>
        <div class="d-head">
          ${iconHtml(a, true)}
          <div><h1>${esc(a.name)}</h1><p>${a.type === "game" ? "Game" : "App"}</p></div>
        </div>
        <div class="d-stats">
          <div><b>${esc(a.version)}</b><span>Version</span></div>
          <div><b>${esc(a.size)}</b><span>Size</span></div>
        </div>
        <h2>About</h2>
        <p class="d-text">${esc(a.desc)}</p>
        <h2>Screenshots</h2>
        <div class="gallery">${shots}</div>
        <div class="d-action">
          ${dlHtml(a, "Download")}
          ${a.apk ? "" : `<p class="note">The download will be available once the APK is uploaded.</p>`}
        </div>
      </section>`;
  }
};

/* ---------- 4) NAVIGATION ---------- */
let state = { view: "home", from: "home", id: null, q: "" };

function render() {
  $("#app").innerHTML = views[state.view]();
  // highlight the right tab (detail pages keep the tab they came from)
  const tab = state.view === "detail" ? state.from : state.view;
  document.querySelectorAll("#nav button").forEach((b) => b.classList.toggle("on", b.dataset.view === tab));
  window.scrollTo(0, 0);
}

// Switch screen. history.pushState makes the Android back button work.
function go(view, extra = {}) {
  state = { ...state, ...extra, view };
  history.pushState(state, "");
  render();
}

window.addEventListener("popstate", (e) => {
  if (e.state) { state = e.state; render(); }
});
history.replaceState(state, "");

// Bottom tabs
$("#nav").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b || b.dataset.view === state.view) return;
  go(b.dataset.view);
  if (b.dataset.view === "search") $("#searchInput").focus();
});

// Everything inside the main area (cards, banners, back, search boxes)
$("#app").addEventListener("click", (e) => {
  if (e.target.closest(".dl")) return;                 // download button: don't open details
  if (e.target.closest("#backBtn")) return history.back();
  const el = e.target.closest("[data-id]");
  if (el) go("detail", { id: Number(el.dataset.id), from: state.view });
});

// Tapping the search bar on Home opens the Search screen
$("#app").addEventListener("focusin", (e) => {
  if (e.target.id === "homeSearch") { go("search"); $("#searchInput").focus(); }
});

// Live filtering while typing (only the results change, so the keyboard stays open)
$("#app").addEventListener("input", (e) => {
  if (e.target.id !== "searchInput") return;
  state.q = e.target.value;
  $("#results").innerHTML = listHtml(matches(state.q));
});

render();
