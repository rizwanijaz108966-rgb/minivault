/* =========================================================
   MiniVault - Part 2 (connected to Supabase)
   0) SETTINGS   your Supabase URL + PUBLIC (publishable) key
   1) DATA       sample apps (fallback) + loading from Supabase
   2) HELPERS    small functions that build the HTML
   3) VIEWS      one function per screen
   4) NAVIGATION switching screens, back button, search
   ========================================================= */

/* ---------- 0) SETTINGS ----------
   Paste your values here. Use ONLY the Project URL and the
   PUBLISHABLE key (starts with sb_publishable_ ...).
   NEVER paste a secret or service_role key in this file. */
const SUPABASE_URL = "https://ltqzztiehszvfuginyoo.supabase.co";
const SUPABASE_KEY = "sb_publishable_wtH-JBv-KC4iqMbUg1IkDA_n4z_f0Y6";
const BUCKET = "app-files";

/* ---------- 1) DATA ---------- */
// Fallback samples: shown only if Supabase is empty or unreachable
const sampleItems = [
  { id: "s1", type: "game", category: "Game", name: "Pixel Runner", short: "Dash through neon cities.",
    version: "1.2.0", size: "48 MB", emoji: "🏃", color: "linear-gradient(135deg,#ff6b6b,#c44569)",
    desc: "A fast one-tap runner. Jump over obstacles, collect coins and beat your best distance. Simple controls, hard to put down.",
    icon: "", screenshots: [], apk: "", featured: true },
  { id: "s2", type: "game", category: "Game", name: "Star Drift", short: "Pilot a ship through asteroid fields.",
    version: "0.9.5", size: "120 MB", emoji: "🚀", color: "linear-gradient(135deg,#4facfe,#6a5af9)",
    desc: "Steer your ship by tilting your phone, dodge asteroids and upgrade your engines between flights.",
    icon: "", screenshots: [], apk: "", featured: true },
  { id: "s3", type: "game", category: "Game", name: "Block Quest", short: "Relaxing puzzle adventure.",
    version: "2.0.1", size: "35 MB", emoji: "🧩", color: "linear-gradient(135deg,#43c59e,#2a8f6a)",
    desc: "Slide and match colorful blocks across 100 handmade levels. No timers, no stress.",
    icon: "", screenshots: [], apk: "", featured: false },
  { id: "s4", type: "app", category: "App", name: "Note Pad", short: "Quick notes that stay private.",
    version: "3.1.0", size: "12 MB", emoji: "📝", color: "linear-gradient(135deg,#ffb547,#e8702a)",
    desc: "A clean notes app. Write fast, pin important notes and find anything with search.",
    icon: "", screenshots: [], apk: "", featured: true },
  { id: "s5", type: "app", category: "App", name: "Quick Tools", short: "Calculator, timer and unit converter.",
    version: "1.4.2", size: "8 MB", emoji: "🧰", color: "linear-gradient(135deg,#a18cd1,#7b5cc4)",
    desc: "Everyday tools in one small app: calculator, stopwatch, countdown timer and unit converter.",
    icon: "", screenshots: [], apk: "", featured: false }
];

let items = [];          // what the screens show (Supabase apps, or samples as fallback)
let status = "loading";  // loading | ok | setup | empty | error

const placeholderColors = [
  "linear-gradient(135deg,#ff6b6b,#c44569)", "linear-gradient(135deg,#4facfe,#6a5af9)",
  "linear-gradient(135deg,#43c59e,#2a8f6a)", "linear-gradient(135deg,#ffb547,#e8702a)",
  "linear-gradient(135deg,#a18cd1,#7b5cc4)"
];
const pickColor = (s) => {
  let h = 0;
  for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return placeholderColors[h % placeholderColors.length];
};

// A file value can be a full link OR a path inside the bucket (e.g. "icons/app.png")
function fileUrl(v) {
  if (!v) return "";
  v = String(v).trim();
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[a-z]+:/i.test(v)) return "";   // blocks javascript:, data: etc.
  v = v.replace(/^\/+/, "").replace(new RegExp("^" + BUCKET + "/"), "");
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${v}`;
}

// Public Supabase files open in the browser by default; "?download" makes them download
const downloadUrl = (u) =>
  u && u.includes("/storage/v1/object/public/") && !u.includes("?") ? u + "?download" : u;

// screenshots can be an array, a JSON text, or a comma/newline separated text
function parseList(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v.trim()) {
    try { const j = JSON.parse(v); if (Array.isArray(j)) return j; } catch (e) {}
    return v.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

// size can be text ("48 MB") or a number (bytes, or MB if small)
function formatSize(s) {
  if (s === null || s === undefined || s === "") return "—";
  if (/^\d+(\.\d+)?$/.test(String(s))) {
    const n = Number(s);
    return n >= 1048576 ? (n / 1048576).toFixed(1) + " MB" : n + " MB";
  }
  return String(s);
}

// Turns one database row into the same shape the UI already uses
function fromRow(r, i) {
  const category = (r.category || "").trim();
  const type = /game/i.test(category) ? "game" : "app";
  const desc = r.description || "";
  return {
    id: "db" + r.id,
    type, category,
    name: r.name || "Untitled",
    short: desc || category,
    version: String(r.version || "1.0").replace(/^v/i, ""),
    size: formatSize(r.size),
    emoji: type === "game" ? "🎮" : "📱",
    color: pickColor(r.name || r.id),
    desc: desc || "No description yet.",
    icon: fileUrl(r.icon_url),
    screenshots: parseList(r.screenshots).map(fileUrl).filter(Boolean),
    apk: downloadUrl(fileUrl(r.download_url)),
    featured: i < 3          // newest 3 appear in Featured
  };
}

async function loadApps() {
  status = "loading";
  render();
  if (SUPABASE_URL.includes("YOUR-PROJECT") || SUPABASE_KEY.includes("YOUR-")) {
    items = sampleItems; status = "setup"; return render();
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);   // give up after 8 seconds
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/apps?select=*&order=created_at.desc`, {
      headers: { apikey: SUPABASE_KEY },
      signal: ctrl.signal
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const rows = await res.json();
    if (Array.isArray(rows) && rows.length) { items = rows.map(fromRow); status = "ok"; }
    else { items = sampleItems; status = "empty"; }
  } catch (err) {
    console.warn("MiniVault: could not load apps", err);
    items = sampleItems; status = "error";
  }
  clearTimeout(timer);
  render();
}

/* ---------- 2) HELPERS ---------- */
const $ = (sel) => document.querySelector(sel);

// Makes text safe to put inside HTML
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const notes = {
  loading: "Loading apps…",
  setup: "Supabase isn't connected yet. Showing sample apps.",
  empty: "The store has no apps yet. Showing sample apps.",
  error: "Couldn't reach the store. Showing sample apps."
};
const statusHtml = () => status === "ok" ? "" :
  `<p class="note">${notes[status]}</p>` +
  (status === "error" ? `<button class="back" id="retryBtn" style="display:block;margin:10px auto">Try again</button>` : "");

// Icon: real image if a URL exists, otherwise a colored placeholder with an emoji
const iconHtml = (a, big) => a.icon
  ? `<img class="ico ${big ? "lg" : ""}" src="${esc(a.icon)}" alt="" data-emoji="${a.emoji}" data-color="${a.color}">`
  : `<div class="ico ${big ? "lg" : ""}" style="background:${a.color}">${a.emoji}</div>`;

// If an image link is broken, swap in the placeholder instead of showing a broken image
document.addEventListener("error", (e) => {
  const img = e.target;
  if (!img || img.tagName !== "IMG") return;
  if (img.classList.contains("ico")) {
    const d = document.createElement("div");
    d.className = img.className; d.style.background = img.dataset.color; d.textContent = img.dataset.emoji;
    img.replaceWith(d);
  } else if (img.classList.contains("shot")) img.style.display = "none";
}, true);

// Download button uses the download_url from the database
const dlHtml = (a, label) => a.apk
  ? `<a class="dl" href="${esc(a.apk)}" download rel="noopener">${label}</a>`
  : `<button class="dl" disabled>${label === "Download" ? "Soon" : "Not available yet"}</button>`;

const cardHtml = (a) => `
  <article class="card" data-id="${esc(a.id)}">
    ${iconHtml(a)}
    <div class="info">
      <h3>${esc(a.name)}</h3>
      <p>${esc(a.short)}</p>
      <small>v${esc(a.version)} • ${esc(a.size)}</small>
    </div>
    ${dlHtml(a, "Download")}
  </article>`;

const bannerHtml = (a) => `
  <div class="banner" data-id="${esc(a.id)}" style="background:${a.color}">
    <span class="big-emoji">${a.emoji}</span>
    <h3>${esc(a.name)}</h3>
    <p>${esc(a.short)}</p>
  </div>`;

const listHtml = (arr, emptyMsg = "Nothing found. Try a different word.") => arr.length
  ? `<div class="list">${arr.map(cardHtml).join("")}</div>`
  : `<p class="empty">${emptyMsg}</p>`;

const byType = (t) => items.filter((a) => a.type === t);

function matches(q) {
  q = q.trim().toLowerCase();
  if (!q) return items;
  return items.filter((a) =>
    [a.name, a.short, a.desc, a.type, a.category].join(" ").toLowerCase().includes(q));
}

/* ---------- 3) VIEWS ---------- */
const views = {
  home: () => `
    <section class="view">
      ${statusHtml()}
      <input class="searchbar" id="homeSearch" type="search" placeholder="Search apps and games" aria-label="Search">
      <h2>Featured</h2>
      <div class="featured">${items.filter((a) => a.featured).map(bannerHtml).join("")}</div>
      <h2>Popular Games</h2>
      ${listHtml(byType("game"), "No games yet.")}
      <h2>Latest Apps</h2>
      ${listHtml(byType("app"), "No apps yet.")}
    </section>`,

  games: () => `<section class="view">${statusHtml()}<h2>Games</h2>${listHtml(byType("game"), "No games yet.")}</section>`,
  apps: () => `<section class="view">${statusHtml()}<h2>Apps</h2>${listHtml(byType("app"), "No apps yet.")}</section>`,

  search: () => `
    <section class="view">
      ${statusHtml()}
      <input class="searchbar" id="searchInput" type="search" placeholder="Search apps and games"
             aria-label="Search" value="${esc(state.q)}">
      <h2>Results</h2>
      <div id="results">${listHtml(matches(state.q))}</div>
    </section>`,

  detail: () => {
    const a = items.find((x) => x.id === state.id);
    if (!a) return `<section class="view"><button class="back" id="backBtn">← Back</button><p class="empty">This item could not be found.</p></section>`;
    // Real screenshots if the database has them, otherwise 3 placeholders
    const shots = (a.screenshots.length ? a.screenshots : [null, null, null]).map((s, i) =>
      s ? `<img class="shot" src="${esc(s)}" alt="Screenshot ${i + 1}">`
        : `<div class="shot" style="background:${a.color}">Screenshot ${i + 1}</div>`).join("");
    return `
      <section class="view">
        <button class="back" id="backBtn">← Back</button>
        <div class="d-head">
          ${iconHtml(a, true)}
          <div><h1>${esc(a.name)}</h1><p>${esc(a.category || (a.type === "game" ? "Game" : "App"))}</p></div>
        </div>
        <div class="d-stats">
          <div><b>${esc(a.version)}</b><span>Version</span></div>
          <div><b>${esc(a.size)}</b><span>Size</span></div>
        </div>
        <h2>About</h2>
        <p class="d-text" style="white-space:pre-line">${esc(a.desc)}</p>
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
  const tab = state.view === "detail" ? state.from : state.view;
  document.querySelectorAll("#nav button").forEach((b) => b.classList.toggle("on", b.dataset.view === tab));
  $("#app").innerHTML = status === "loading"
    ? `<section class="view">${statusHtml()}</section>`
    : views[state.view]();
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
  if (b.dataset.view === "search" && $("#searchInput")) $("#searchInput").focus();
});

// Everything inside the main area (cards, banners, back, retry)
$("#app").addEventListener("click", (e) => {
  if (e.target.closest(".dl")) return;                 // download button: don't open details
  if (e.target.closest("#retryBtn")) return loadApps();
  if (e.target.closest("#backBtn")) return history.back();
  const el = e.target.closest("[data-id]");
  if (el) go("detail", { id: el.dataset.id, from: state.view });
});

// Tapping the search bar on Home opens the Search screen
$("#app").addEventListener("focusin", (e) => {
  if (e.target.id === "homeSearch") { go("search"); if ($("#searchInput")) $("#searchInput").focus(); }
});

// Live filtering while typing (only the results change, so the keyboard stays open)
$("#app").addEventListener("input", (e) => {
  if (e.target.id !== "searchInput") return;
  state.q = e.target.value;
  $("#results").innerHTML = listHtml(matches(state.q));
});

loadApps();
