/* =========================================================
   MiniVault - Google Sign-In (Supabase Auth)
   Uses SUPABASE_URL and SUPABASE_KEY from app.js (public key only).
   ========================================================= */
(function () {
  const REDIRECT_URL = "https://rizwanijaz108966-rgb.github.io/minivault/";
  const box = document.getElementById("authBox");
  if (!box) return;

  // If the Supabase library didn't load (offline) or app.js isn't set up, skip login quietly.
  // The rest of MiniVault keeps working.
  if (!window.supabase || typeof SUPABASE_URL === "undefined" ||
      SUPABASE_URL.includes("YOUR-") || SUPABASE_KEY.includes("YOUR-")) {
    console.warn("MiniVault: sign-in is not available.");
    return;
  }

  // Session is saved in the browser automatically, so users stay logged in
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" }
  });

  let user = null;
  let busy = null;   // null | "in" | "out"

  // Did we just come back from Google (or with an error)?
  const params = new URLSearchParams(location.search.slice(1) + "&" + location.hash.slice(1));
  const cameBack = params.has("code") || params.has("access_token");
  const urlError = params.get("error_description") || params.get("error");

  /* ---------- error message ---------- */
  const toastEl = document.createElement("div");
  toastEl.className = "auth-toast";
  toastEl.setAttribute("role", "alert");
  document.body.appendChild(toastEl);
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("on"), 6000);
  }

  /* ---------- drawing the button / account ---------- */
  const GOOGLE_G = `<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.2 5.5-4.7 7.2l7.3 5.7c4.3-4 6.7-9.8 6.7-17.4z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.3-5.7c-2 1.4-4.6 2.3-8.6 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>`;

  function render() {
    // Loading state while Google login / sign out is being processed
    if (busy) {
      box.innerHTML = `<button class="auth-btn" disabled><span class="auth-spin"></span>${busy === "out" ? "Signing out…" : "Signing in…"}</button>`;
      return;
    }
    // Not logged in
    if (!user) {
      box.innerHTML = `<button class="auth-btn" id="signInBtn">${GOOGLE_G}<span>Sign in<span class="auth-long"> with Google</span></span></button>`;
      document.getElementById("signInBtn").addEventListener("click", signIn);
      return;
    }
    // Logged in: avatar + panel with name, email and Sign out
    const meta = user.user_metadata || {};
    const name = meta.full_name || meta.name || (user.email || "Account").split("@")[0];
    box.innerHTML = `
      <button class="auth-avatar" id="avBtn" aria-label="Account" aria-expanded="false">
        <span class="auth-pic" id="avPic"></span><span class="auth-hi" id="avName"></span>
      </button>
      <div class="auth-panel" id="avPanel" hidden>
        <b id="pName"></b><span id="pMail"></span>
        <button class="auth-out" id="outBtn">Sign out</button>
      </div>`;
    // User text is added with textContent so it can never inject HTML
    document.getElementById("avName").textContent = name.split(" ")[0];
    document.getElementById("pName").textContent = name;
    document.getElementById("pMail").textContent = user.email || "";
    const pic = document.getElementById("avPic");
    const showInitial = () => { pic.textContent = name.charAt(0).toUpperCase(); };
    if (meta.avatar_url) {
      const img = document.createElement("img");
      img.className = "auth-pic"; img.alt = ""; img.referrerPolicy = "no-referrer";
      img.src = meta.avatar_url;
      img.onerror = () => { img.replaceWith(pic); showInitial(); };
      pic.replaceWith(img);
    } else showInitial();

    const panel = document.getElementById("avPanel");
    const avBtn = document.getElementById("avBtn");
    avBtn.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      avBtn.setAttribute("aria-expanded", String(!panel.hidden));
    });
    document.getElementById("outBtn").addEventListener("click", signOut);
  }

  // Tap outside the account panel to close it
  document.addEventListener("click", (e) => {
    const panel = document.getElementById("avPanel");
    if (panel && !panel.hidden && !box.contains(e.target)) panel.hidden = true;
  });

  /* ---------- actions ---------- */
  async function signIn() {
    busy = "in"; render();
    try {
      const { error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: REDIRECT_URL }
      });
      if (error) throw error;           // on success the browser goes to Google
    } catch (err) {
      busy = null; render();
      toast("Couldn't start Google sign-in. " + (err.message || "Please try again."));
    }
  }

  async function signOut() {
    busy = "out"; render();
    try {
      const { error } = await sb.auth.signOut();
      if (error) throw error;
      user = null;
    } catch (err) {
      toast("Couldn't sign out. " + (err.message || "Please try again."));
    }
    busy = null; render();
  }

  // If the user presses Back from the Google page, don't stay stuck on "Signing in…"
  window.addEventListener("pageshow", (e) => {
    if (e.persisted && busy === "in") { busy = null; render(); }
  });

  // Keep the button in sync (login, logout, token refresh, other tabs)
  sb.auth.onAuthStateChange((event, session) => {
    user = session ? session.user : null;
    if (event === "SIGNED_IN" || event === "SIGNED_OUT") busy = null;
    render();
  });

  /* ---------- start ---------- */
  (async function init() {
    if (cameBack) busy = "in";          // finishing login after returning from Google
    render();
    if (urlError) toast("Google sign-in failed: " + urlError.replace(/\+/g, " "));
    try {
      const { data, error } = await sb.auth.getSession();   // restores the saved session
      if (error) throw error;
      user = data.session ? data.session.user : null;
      if (cameBack && !user && !urlError) toast("Sign-in didn't finish. Please try again.");
    } catch (err) {
      toast("Couldn't check your login. " + (err.message || ""));
    }
    busy = null; render();
    // Remove ?code=... from the address bar (keeps MiniVault's own history state)
    if (cameBack || urlError) history.replaceState(history.state, "", location.pathname);
  })();
})();
