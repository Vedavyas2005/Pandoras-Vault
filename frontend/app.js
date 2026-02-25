// ── CONFIG ─────────────────────────────────────────────────────────────────
const API = "https://pandora-backend-mykf.onrender.com";

// ── GLOBAL STATE ────────────────────────────────────────────────────────────
let token               = localStorage.getItem("vault_token") || null;
let currentUser         = null;
let currentTopic        = "";
let currentLevel        = 1;
let gateAttempts        = 0;
let unlockedLevels      = new Set([1]);
let currentLang         = "";
let chatHistory         = [];
let quizActive          = false;
let quizCurrentQ        = null;
let quizCurrentMode     = "popquiz";
let quizDoneThisSession    = false;
let levelupDoneThisSession = false;

const LEVELS = [
  { id: 1, label: "Novice",       desc: "Syntax & Models",  color: "#7dd3fc", badge: "I"   },
  { id: 2, label: "Practitioner", desc: "Implementation",   color: "#6ee7b7", badge: "II"  },
  { id: 3, label: "Architect",    desc: "Where & Why",      color: "#c8a040", badge: "III" },
  { id: 4, label: "Optimizer",    desc: "Performance",      color: "#fb923c", badge: "IV"  },
  { id: 5, label: "Engineer",     desc: "System Design",    color: "#f87171", badge: "V"   },
];

// ══════════════════════════════════════════════════════════════════════════════
// STAR FIELD + CONSTELLATIONS  (single IIFE, one canvas context, one draw loop)
// ══════════════════════════════════════════════════════════════════════════════
(function initCanvas() {
  const canvas = document.getElementById("starCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", () => { resize(); buildStars(); });

  // ── Colour palette ────────────────────────────────────────────────────────
  const PALETTES = [
    [248, 240, 220],  // warm white
    [240, 216, 120],  // gold
    [220, 200, 255],  // lavender
    [255, 255, 255],  // pure white
    [200, 160,  64],  // deep gold
  ];
  function rc() { return PALETTES[Math.floor(Math.random() * PALETTES.length)]; }

  // ── Star layers ───────────────────────────────────────────────────────────
  let dust = [], field = [], bright = [], giants = [];

  function buildStars() {
    dust = []; field = []; bright = []; giants = [];

    // 120 dust specks — very faint, static
    for (let i = 0; i < 120; i++) {
      const [r,g,b] = rc();
      dust.push({ x: Math.random()*W, y: Math.random()*H,
        r: Math.random()*0.4+0.1, a: Math.random()*0.14+0.03,
        r_: r, g_: g, b_: b });
    }

    // 80 field stars — slow drift + gentle twinkle
    for (let i = 0; i < 80; i++) {
      const [r,g,b] = rc();
      const baseA = Math.random()*0.18+0.06;
      field.push({ x: Math.random()*W, y: Math.random()*H,
        r: Math.random()*0.8+0.2,
        dx: (Math.random()-0.5)*0.025, dy: (Math.random()-0.5)*0.025,
        baseA, a: baseA,
        ts: Math.random()*0.012+0.004, tp: Math.random()*Math.PI*2,
        r_: r, g_: g, b_: b });
    }

    // 22 bright stars — glow halo
    for (let i = 0; i < 22; i++) {
      const [r,g,b] = rc();
      const baseA = Math.random()*0.28+0.18;
      bright.push({ x: Math.random()*W, y: Math.random()*H,
        r: Math.random()*1.2+0.5,
        dx: (Math.random()-0.5)*0.018, dy: (Math.random()-0.5)*0.018,
        baseA, a: baseA,
        ts: Math.random()*0.014+0.005, tp: Math.random()*Math.PI*2,
        glowR: Math.random()*5+3,
        r_: r, g_: g, b_: b });
    }

    // 3 giant anchor stars — cross-spike
    for (let i = 0; i < 3; i++) {
      const [r,g,b] = rc();
      giants.push({ x: Math.random()*W, y: Math.random()*H,
        r: Math.random()*1.4+1.0, baseA: 0.45, a: 0.45,
        ts: Math.random()*0.007+0.003, tp: Math.random()*Math.PI*2,
        glowR: Math.random()*10+7, spikeLen: Math.random()*9+6,
        r_: r, g_: g, b_: b });
    }
  }
  buildStars();

  // ── Shooting stars ─────────────────────────────────────────────────────────
  let shoots = [];
  function spawnShoot() {
    const fromTop = Math.random() < 0.6;
    const x = fromTop ? Math.random()*W : 0;
    const y = fromTop ? 0 : Math.random()*H*0.5;
    const angle = (Math.random()*30+15) * (Math.PI/180);
    const speed = Math.random()*5+4;
    shoots.push({ x, y,
      dx: Math.cos(angle)*speed, dy: Math.sin(angle)*speed,
      len: Math.random()*120+60, life: 1,
      decay: Math.random()*0.012+0.008 });
  }
  setInterval(() => { if (Math.random() < 0.7) spawnShoot(); }, 4000);

  // ── Real constellations ────────────────────────────────────────────────────
  // All coords [x,y] normalised 0..1. lines: [[i,j], ...]
  const CONSTELLATIONS = [
    { name: "Orion",
      stars: [[.50,.12],[.63,.14],[.54,.40],[.47,.38],[.61,.41],[.52,.62],[.63,.60],[.46,.24]],
      lines: [[0,1],[0,3],[1,4],[3,2],[4,2],[3,5],[4,6],[0,7],[1,7]] },
    { name: "Leo",
      stars: [[.28,.38],[.36,.26],[.48,.18],[.58,.22],[.63,.32],[.56,.45],[.24,.48],[.42,.32]],
      lines: [[0,1],[1,7],[7,2],[2,3],[3,4],[4,5],[0,6],[6,5]] },
    { name: "Scorpius",
      stars: [[.32,.22],[.26,.16],[.23,.24],[.38,.30],[.42,.42],[.44,.54],[.40,.66],[.32,.74],[.24,.78],[.20,.84],[.27,.88]],
      lines: [[1,2],[2,0],[0,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[8,10]] },
    { name: "Cassiopeia",
      stars: [[.15,.52],[.30,.34],[.50,.42],[.68,.26],[.82,.40]],
      lines: [[0,1],[1,2],[2,3],[3,4]] },
    { name: "Sagittarius",
      stars: [[.36,.58],[.42,.44],[.50,.32],[.28,.50],[.22,.40],[.54,.50],[.62,.58],[.56,.65],[.44,.66]],
      lines: [[0,1],[1,2],[0,3],[3,4],[1,5],[5,6],[6,7],[7,8],[8,0]] },
    { name: "Pegasus",
      stars: [[.55,.20],[.68,.20],[.68,.32],[.55,.32],[.48,.26],[.42,.18],[.36,.12]],
      lines: [[0,1],[1,2],[2,3],[3,0],[0,4],[4,5],[5,6]] },
    { name: "Gemini",
      stars: [[.22,.18],[.28,.16],[.22,.26],[.28,.24],[.20,.34],[.26,.32],[.18,.42],[.24,.40]],
      lines: [[0,2],[2,4],[4,6],[1,3],[3,5],[5,7],[0,1],[6,7]] },
    { name: "Ursa Major",
      stars: [[.12,.50],[.20,.46],[.28,.48],[.36,.44],[.42,.50],[.38,.58],[.30,.60],[.20,.58]],
      lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0],[3,7]] },
    { name: "Lyra",
      stars: [[.72,.22],[.68,.30],[.76,.30],[.70,.38],[.74,.38]],
      lines: [[0,1],[0,2],[1,3],[2,4],[3,4]] },
    { name: "Cygnus",
      stars: [[.50,.10],[.50,.22],[.50,.34],[.50,.46],[.38,.28],[.62,.28]],
      lines: [[0,1],[1,2],[2,3],[4,5],[1,4],[1,5]] },
    { name: "Perseus",
      stars: [[.25,.12],[.30,.18],[.35,.14],[.38,.22],[.32,.28],[.26,.24],[.22,.20]],
      lines: [[0,6],[6,1],[1,2],[1,5],[5,4],[4,3],[3,2]] },
    { name: "Aquila",
      stars: [[.60,.42],[.65,.36],[.70,.42],[.65,.50],[.58,.50],[.72,.50]],
      lines: [[0,1],[1,2],[2,3],[3,0],[0,4],[2,5]] },
    { name: "Taurus",
      stars: [[.35,.30],[.42,.24],[.48,.28],[.50,.38],[.42,.40],[.30,.22],[.26,.28]],
      lines: [[0,1],[1,2],[2,3],[3,4],[4,0],[0,5],[0,6]] },
    { name: "Virgo",
      stars: [[.45,.22],[.52,.28],[.58,.36],[.54,.46],[.46,.50],[.38,.46],[.36,.36],[.40,.28]],
      lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0]] },
    { name: "Aries",
      stars: [[.60,.30],[.66,.24],[.72,.26],[.76,.34]],
      lines: [[0,1],[1,2],[2,3]] },
    { name: "Pisces",
      stars: [[.24,.32],[.28,.26],[.34,.24],[.40,.28],[.44,.36],[.40,.44],[.34,.46],[.28,.42]],
      lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,0]] },
    { name: "Boötes",
      stars: [[.50,.18],[.44,.26],[.56,.26],[.40,.36],[.60,.36],[.46,.46],[.54,.46]],
      lines: [[0,1],[0,2],[1,3],[2,4],[3,5],[4,6],[5,6]] },
    { name: "Hercules",
      stars: [[.48,.22],[.36,.28],[.30,.38],[.40,.46],[.48,.38],[.58,.46],[.66,.36],[.60,.28]],
      lines: [[0,1],[1,2],[2,3],[3,4],[4,0],[4,5],[5,6],[6,7],[7,0]] },
    { name: "Andromeda",
      stars: [[.50,.30],[.42,.22],[.34,.16],[.26,.12],[.58,.36],[.66,.40],[.74,.44]],
      lines: [[0,1],[1,2],[2,3],[0,4],[4,5],[5,6]] },
    { name: "Corvus",
      stars: [[.36,.44],[.44,.38],[.52,.40],[.50,.52],[.38,.54]],
      lines: [[0,1],[1,2],[2,3],[3,4],[4,0],[1,4]] },
  ];

  // Active constellations: 2 cycle at a time
  let activeConsts = [];
  function pickConstellations() {
    const shuffled = [...CONSTELLATIONS].sort(() => Math.random()-0.5);
    activeConsts = shuffled.slice(0,2).map(def => ({
      def,
      ox:    Math.random()*0.48+0.06,
      oy:    Math.random()*0.48+0.06,
      scale: Math.random()*0.18+0.14,
      alpha: 0, phase: "in", holdTimer: 0,
      driftX: (Math.random()-0.5)*0.000012,
      driftY: (Math.random()-0.5)*0.000012,
    }));
  }
  pickConstellations();
  setInterval(pickConstellations, 28000);

  // ── Draw helpers ──────────────────────────────────────────────────────────
  function glow(x, y, radius, r, g, b, a) {
    const gr = ctx.createRadialGradient(x,y,0, x,y,radius);
    gr.addColorStop(0, `rgba(${r},${g},${b},${(a*0.35).toFixed(3)})`);
    gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.beginPath(); ctx.arc(x,y,radius,0,Math.PI*2);
    ctx.fillStyle = gr; ctx.fill();
  }

  function spike(x, y, len, r, g, b, a) {
    ctx.save(); ctx.globalAlpha = a*0.22;
    for (const angle of [0, Math.PI/2, Math.PI/4, -Math.PI/4]) {
      const gr = ctx.createLinearGradient(
        x-Math.cos(angle)*len, y-Math.sin(angle)*len,
        x+Math.cos(angle)*len, y+Math.sin(angle)*len);
      gr.addColorStop(0,   `rgba(${r},${g},${b},0)`);
      gr.addColorStop(0.5, `rgba(${r},${g},${b},0.45)`);
      gr.addColorStop(1,   `rgba(${r},${g},${b},0)`);
      ctx.beginPath();
      ctx.moveTo(x-Math.cos(angle)*len, y-Math.sin(angle)*len);
      ctx.lineTo(x+Math.cos(angle)*len, y+Math.sin(angle)*len);
      ctx.strokeStyle = gr; ctx.lineWidth = 0.8; ctx.stroke();
    }
    ctx.restore();
  }

  // ── Main draw loop ─────────────────────────────────────────────────────────
  let t = 0;
  function draw() {
    ctx.clearRect(0,0,W,H);
    t += 0.01;

    // 1. Dust
    for (const s of dust) {
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle = `rgba(${s.r_},${s.g_},${s.b_},${s.a})`; ctx.fill();
    }

    // 2. Field stars
    for (const s of field) {
      s.a = s.baseA + Math.sin(t*s.ts*100+s.tp)*0.06;
      s.x += s.dx; s.y += s.dy;
      if (s.x < 0) s.x = W; if (s.x > W) s.x = 0;
      if (s.y < 0) s.y = H; if (s.y > H) s.y = 0;
      const a = Math.max(0, s.a);
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle = `rgba(${s.r_},${s.g_},${s.b_},${a.toFixed(3)})`; ctx.fill();
    }

    // 3. Bright stars with glow
    for (const s of bright) {
      s.a = s.baseA + Math.sin(t*s.ts*100+s.tp)*0.10;
      s.x += s.dx; s.y += s.dy;
      if (s.x < 0) s.x = W; if (s.x > W) s.x = 0;
      if (s.y < 0) s.y = H; if (s.y > H) s.y = 0;
      const a = Math.max(0, s.a);
      glow(s.x,s.y,s.glowR,s.r_,s.g_,s.b_,a);
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle = `rgba(${s.r_},${s.g_},${s.b_},${a.toFixed(3)})`; ctx.fill();
    }

    // 4. Giants with glow + spike
    for (const s of giants) {
      s.a = s.baseA + Math.sin(t*s.ts*100+s.tp)*0.08;
      const a = Math.max(0, s.a);
      glow(s.x,s.y,s.glowR,s.r_,s.g_,s.b_,a);
      spike(s.x,s.y,s.spikeLen,s.r_,s.g_,s.b_,a);
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle = `rgba(${s.r_},${s.g_},${s.b_},${a.toFixed(3)})`; ctx.fill();
    }

    // 5. Constellations
    for (const ac of activeConsts) {
      if (ac.phase === "in") {
        ac.alpha += 0.0025;
        if (ac.alpha >= 0.65) { ac.alpha = 0.65; ac.phase = "hold"; }
      } else if (ac.phase === "hold") {
        ac.holdTimer++;
        if (ac.holdTimer > 1500) ac.phase = "out";
      } else {
        ac.alpha -= 0.0025;
        if (ac.alpha < 0) ac.alpha = 0;
      }
      if (ac.alpha < 0.005) continue;

      ac.ox += ac.driftX; ac.oy += ac.driftY;
      const { def, ox, oy, scale, alpha } = ac;

      const pts = def.stars.map(([nx,ny]) => ({
        x: (ox + nx*scale) * W,
        y: (oy + ny*scale) * H,
      }));

      ctx.save();
      ctx.strokeStyle = `rgba(200,160,64,${(alpha*0.25).toFixed(3)})`;
      ctx.lineWidth = 0.55;
      ctx.setLineDash([3,6]);
      for (const [a,b] of def.lines) {
        if (!pts[a] || !pts[b]) continue;
        ctx.beginPath(); ctx.moveTo(pts[a].x,pts[a].y); ctx.lineTo(pts[b].x,pts[b].y); ctx.stroke();
      }
      ctx.setLineDash([]);

      for (const pt of pts) {
        const gr = ctx.createRadialGradient(pt.x,pt.y,0, pt.x,pt.y,4.5);
        gr.addColorStop(0, `rgba(240,216,120,${(alpha*0.38).toFixed(3)})`);
        gr.addColorStop(1, "rgba(240,216,120,0)");
        ctx.beginPath(); ctx.arc(pt.x,pt.y,4.5,0,Math.PI*2); ctx.fillStyle=gr; ctx.fill();
        ctx.beginPath(); ctx.arc(pt.x,pt.y,1.1,0,Math.PI*2);
        ctx.fillStyle=`rgba(248,240,200,${(alpha*0.8).toFixed(3)})`; ctx.fill();
      }

      const avgX = pts.reduce((s,p)=>s+p.x,0)/pts.length;
      const maxY = Math.max(...pts.map(p=>p.y));
      const fs   = Math.max(7, Math.round(8*(scale/0.2)));
      ctx.font      = `${fs}px "DM Mono", monospace`;
      ctx.fillStyle = `rgba(200,160,64,${(alpha*0.18).toFixed(3)})`;
      ctx.textAlign = "center";
      ctx.fillText(def.name.toUpperCase(), avgX, maxY+13);
      ctx.restore();
    }

    // 6. Shooting stars
    shoots = shoots.filter(s => s.life > 0);
    for (const s of shoots) {
      const tailX = s.x - s.dx*(s.len/Math.max(Math.abs(s.dx),0.1))*Math.sign(s.dx);
      const tailY = s.y - s.dy*(s.len/Math.max(Math.abs(s.dy),0.1))*Math.sign(s.dy);
      const gr = ctx.createLinearGradient(tailX,tailY,s.x,s.y);
      gr.addColorStop(0, "rgba(240,216,120,0)");
      gr.addColorStop(0.7, `rgba(240,216,120,${(s.life*0.5).toFixed(3)})`);
      gr.addColorStop(1,   `rgba(255,255,255,${s.life.toFixed(3)})`);
      ctx.beginPath(); ctx.moveTo(tailX,tailY); ctx.lineTo(s.x,s.y);
      ctx.strokeStyle=gr; ctx.lineWidth=1.2; ctx.stroke();
      ctx.beginPath(); ctx.arc(s.x,s.y,1.2,0,Math.PI*2);
      ctx.fillStyle=`rgba(255,255,255,${s.life.toFixed(3)})`; ctx.fill();
      s.x += s.dx; s.y += s.dy; s.life -= s.decay;
    }

    requestAnimationFrame(draw);
  }
  draw();
})();

// ══════════════════════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════════════════════
window.addEventListener("DOMContentLoaded", async () => {
  if (token) {
    const user = await apiGet("/auth/me");
    if (user) { currentUser = user; enterVault(user); }
    else clearSession();
  }
});

// ── AUTH OVERLAY ───────────────────────────────────────────────────────────
function openAuthOverlay()  { document.getElementById("authOverlay").classList.remove("hidden"); }
function closeAuthOverlay() { document.getElementById("authOverlay").classList.add("hidden"); }

function switchAuthTab(tab) {
  document.getElementById("signupForm").classList.toggle("hidden", tab !== "signup");
  document.getElementById("loginForm").classList.toggle("hidden",  tab !== "login");
  document.getElementById("tabSignup").classList.toggle("active",  tab === "signup");
  document.getElementById("tabLogin").classList.toggle("active",   tab === "login");
  clearErrors();
}

function clearErrors() {
  ["signup_error","login_error","onboard_error"].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ""; el.classList.add("hidden"); }
  });
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg; el.classList.remove("hidden");
}

// ── API HELPERS ────────────────────────────────────────────────────────────
async function apiPost(path, body, useToken=false) {
  const headers = { "Content-Type": "application/json" };
  if (useToken && token) headers["Authorization"] = `Bearer ${token}`;
  const res  = await fetch(API+path, { method:"POST", headers, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

async function apiGet(path) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  try {
    const res = await fetch(API+path, { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function apiPatch(path, body) {
  const headers = { "Content-Type":"application/json", "Authorization":`Bearer ${token}` };
  const res  = await fetch(API+path, { method:"PATCH", headers, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

// ── AUTH ACTIONS ───────────────────────────────────────────────────────────
async function signup() {
  clearErrors();
  const email    = document.getElementById("signup_email").value.trim();
  const password = document.getElementById("signup_password").value;
  const confirm  = document.getElementById("signup_confirm").value;
  if (!email||!password||!confirm) return showError("signup_error","Please fill in all fields.");
  if (password !== confirm)        return showError("signup_error","Passwords don't match.");
  if (password.length < 8)        return showError("signup_error","Password must be at least 8 characters.");
  setBtnLoading("signupBtnText","signupBtnSpinner",true);
  try {
    const data = await apiPost("/auth/signup",{ email, password, confirm_password: confirm });
    token = data.access_token; localStorage.setItem("vault_token",token);
    currentUser = data.user; closeAuthOverlay();
    data.user.is_onboarded ? enterVault(data.user) : openOnboardOverlay();
  } catch(e) { showError("signup_error",e.message); }
  finally { setBtnLoading("signupBtnText","signupBtnSpinner",false); }
}

async function login() {
  clearErrors();
  const email    = document.getElementById("login_email").value.trim();
  const password = document.getElementById("login_password").value;
  if (!email||!password) return showError("login_error","Please fill in all fields.");
  setBtnLoading("loginBtnText","loginBtnSpinner",true);
  try {
    const data = await apiPost("/auth/login",{ email, password });
    token = data.access_token; localStorage.setItem("vault_token",token);
    currentUser = data.user; closeAuthOverlay();
    data.user.is_onboarded ? enterVault(data.user) : openOnboardOverlay();
  } catch(e) { showError("login_error",e.message); }
  finally { setBtnLoading("loginBtnText","loginBtnSpinner",false); }
}

function openOnboardOverlay() { document.getElementById("onboardOverlay").classList.remove("hidden"); }

async function onboard() {
  clearErrors();
  const username = document.getElementById("onboard_username").value.trim();
  if (!username) return showError("onboard_error","Please enter a username.");
  setBtnLoading("onboardBtnText","onboardBtnSpinner",true);
  try {
    const data = await apiPost("/auth/onboard",{ username },true);
    currentUser = { ...currentUser, ...data };
    document.getElementById("onboardOverlay").classList.add("hidden");
    enterVault(currentUser);
  } catch(e) { showError("onboard_error",e.message); }
  finally { setBtnLoading("onboardBtnText","onboardBtnSpinner",false); }
}

// ── ENTER / EXIT VAULT ─────────────────────────────────────────────────────
async function enterVault(user) {
  document.getElementById("homePage").classList.add("hidden");
  document.getElementById("homePage").classList.remove("active");
  document.getElementById("vaultPage").classList.remove("hidden");
  document.getElementById("vaultPage").classList.add("active");
  document.getElementById("topbarUsername").textContent = user.username || user.email;

  const session = await apiGet("/session/");
  if (session && session.topic) {
    currentTopic = session.topic;
    currentLevel = session.current_level || 1;
    document.getElementById("topicInput").value = currentTopic;
    if (session.diagnostic_passed) unlockedLevels.add(currentLevel);
  }
  renderLevelList(); showState("welcomeState");
}

function logout() {
  clearSession();
  document.getElementById("vaultPage").classList.add("hidden");
  document.getElementById("vaultPage").classList.remove("active");
  document.getElementById("homePage").classList.remove("hidden");
  document.getElementById("homePage").classList.add("active");
}

function clearSession() {
  token = null; currentUser = null; localStorage.removeItem("vault_token");
}

// ── LEVEL LIST ─────────────────────────────────────────────────────────────
function renderLevelList() {
  const list = document.getElementById("levelList");
  list.innerHTML = "";
  LEVELS.forEach(lvl => {
    const unlocked = unlockedLevels.has(lvl.id) || lvl.id === 1;
    const active   = lvl.id === currentLevel;
    const btn = document.createElement("button");
    btn.className = "level-btn" + (active?" active":"");
    btn.dataset.level = lvl.id;
    btn.innerHTML = `
      <span class="level-badge" style="background:${lvl.color}22;color:${lvl.color};">${lvl.badge}</span>
      <div style="text-align:left;flex:1;">
        <div style="font-size:12px;color:${active?lvl.color:"var(--text)"};">${lvl.label}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:1px;">${lvl.desc}</div>
      </div>
      ${unlocked?`<span style="color:${lvl.color};font-size:11px;">✓</span>`:""}
    `;
    btn.onclick = () => selectLevel(lvl.id);
    list.appendChild(btn);
  });
}

function selectLevel(lvlId) {
  currentLevel = lvlId;
  document.querySelectorAll(".level-btn").forEach(btn => {
    const id  = parseInt(btn.dataset.level);
    const lvl = LEVELS.find(l => l.id === id);
    btn.classList.toggle("active", id === lvlId);
    const nameEl = btn.querySelector("div > div:first-child");
    if (nameEl && lvl) nameEl.style.color = id === lvlId ? lvl.color : "var(--text)";
  });
}

// ── START VAULT ─────────────────────────────────────────────────────────────
async function startVault() {
  const topic = document.getElementById("topicInput").value.trim();
  if (!topic) { document.getElementById("topicInput").focus(); return; }
  const lang = document.getElementById("langSelect").value;
  if (topic !== currentTopic || lang !== currentLang) unlockedLevels = new Set([1]);
  currentTopic = topic; currentLang = lang;
  const activeBtn = document.querySelector(".level-btn.active");
  if (activeBtn) currentLevel = parseInt(activeBtn.dataset.level) || 1;
  renderLevelList();
  await startVaultForLevel(topic, currentLevel);
}

async function startVaultForLevel(topic, level) {
  gateAttempts = 0;
  showState("loadingState");
  document.getElementById("loadingText").textContent = "The Gatekeeper is preparing your challenge…";
  const lang = document.getElementById("langSelect").value;
  try {
    const res = await apiPost("/vault/gatekeeper",
      { topic, level, language: lang, message_type: "generate_question" }, true);
    if (level === 1) showLesson(topic, level, res.content);
    else showGateQuestion(topic, level, res.content);
    await apiPatch("/session/",{ topic, current_level:level,
      diagnostic_attempts:0, diagnostic_passed: level===1, hint_stage:0 });
  } catch(e) { showState("welcomeState"); alert("Something went wrong: "+e.message); }
}

// ── GATE QUESTION ──────────────────────────────────────────────────────────
function showGateQuestion(topic, level, content) {
  currentTopic = topic; currentLevel = level; gateAttempts = 0;
  document.getElementById("gateTitle").textContent = `Topic: ${topic} — Unlocking Level ${level}`;
  document.getElementById("gateQuestion").innerHTML = formatContent(content);
  document.getElementById("answerInput").value = "";
  updateAttemptDots("attemptDots","attemptText",0);
  showState("gateState");
}

async function submitAnswer() {
  const answer = document.getElementById("answerInput").value.trim();
  if (!answer) return;
  setBtnLoading("submitBtnText","submitBtnSpinner",true);
  const lang = document.getElementById("langSelect").value;
  try {
    const res = await apiPost("/vault/submit",
      { topic:currentTopic, level:currentLevel, language:lang,
        message_type:"check_answer", user_answer:answer }, true);
    gateAttempts++;
    if (res.passed === true) {
      unlockedLevels.add(currentLevel); renderLevelList();
      showLesson(currentTopic, currentLevel, res.content);
    } else if (typeof res.recommended_level === "number") {
      showReveal(res.content, res.recommended_level);
    } else {
      showHint(res.content, res.mermaid_code, gateAttempts);
    }
  } catch(e) { alert("Error: "+e.message); }
  finally { setBtnLoading("submitBtnText","submitBtnSpinner",false); }
}

async function retryAnswer() {
  const answer = document.getElementById("retryInput").value.trim();
  if (!answer) return;
  setBtnLoading("retryBtnText","retryBtnSpinner",true);
  const lang = document.getElementById("langSelect").value;
  try {
    const res = await apiPost("/vault/submit",
      { topic:currentTopic, level:currentLevel, language:lang,
        message_type:"check_answer", user_answer:answer }, true);
    gateAttempts++;
    if (res.passed === true) {
      unlockedLevels.add(currentLevel); renderLevelList();
      showLesson(currentTopic, currentLevel, res.content);
    } else if (typeof res.recommended_level === "number") {
      showReveal(res.content, res.recommended_level);
    } else {
      showHint(res.content, res.mermaid_code, gateAttempts);
    }
  } catch(e) { alert("Error: "+e.message); }
  finally { setBtnLoading("retryBtnText","retryBtnSpinner",false); }
}

// ── HINT ───────────────────────────────────────────────────────────────────
function showHint(content, mermaidCode, attempt) {
  const isFirst = attempt <= 1;
  document.getElementById("hintBadge").textContent =
    isFirst ? "💡 Visual Hint — Try Again!" : "🧩 Pseudocode Hint — One More Try!";
  document.getElementById("hintText").textContent = "";
  document.getElementById("retryInput").value = "";
  updateAttemptDots("retryDots","retryText",attempt);

  // Build HTML: mermaid first (if present), then prose
  let html = "";
  if (mermaidCode) {
    const uid     = `mermaid-hint-${Date.now()}`;
    const escaped = mermaidCode.trim()
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    html += `<div class="mermaid-wrap"><pre class="mermaid" id="${uid}">${escaped}</pre></div>`;
  }
  html += formatContent(content);
  document.getElementById("hintContent").innerHTML = html;
  showState("hintState");

  // Render any unprocessed mermaid elements after DOM settles
  setTimeout(async () => {
    for (const el of document.querySelectorAll("pre.mermaid:not([data-processed])")) {
      el.dataset.processed = "1";
      await renderMermaidSafe(el);
    }
  }, 250);
}

// ── REVEAL ─────────────────────────────────────────────────────────────────
function showReveal(content, dropLevel) {
  document.getElementById("revealContent").innerHTML = formatContent(content);
  document.getElementById("dropLevelNum").textContent = dropLevel;
  showState("revealState");
}

function dropToLowerLevel() {
  const dropLevel = parseInt(document.getElementById("dropLevelNum").textContent);
  currentLevel = dropLevel; renderLevelList();
  startVaultForLevel(currentTopic, dropLevel);
}

// ── LESSON ─────────────────────────────────────────────────────────────────
function showLesson(topic, level, content) {
  const lvl = LEVELS.find(l => l.id === level);
  document.getElementById("lessonTitle").textContent =
    `${topic} — ${lvl ? lvl.label : "Level "+level}`;

  // Extract sandbox code (L5)
  let sandboxCode = null;
  const sandboxMatch = content.match(/===SANDBOX_START===([\s\S]*?)===SANDBOX_END===/);
  if (sandboxMatch) {
    const sandboxSection = sandboxMatch[1].trim();
    const codeMatch = sandboxSection.match(/```\w*\n([\s\S]*?)```/);
    sandboxCode = codeMatch ? codeMatch[1].trim() : sandboxSection;
  }

  document.getElementById("lessonContent").innerHTML = formatContent(content);

  resetChat();
  quizActive = false; quizCurrentQ = null;
  quizDoneThisSession = false; levelupDoneThisSession = false;
  showState("lessonState");

  const sandboxEl = document.getElementById("sandboxPanel");
  if (level === 5 || sandboxCode) {
    renderSandbox(sandboxCode || getDefaultSandboxCode(topic, currentLang), topic);
    if (sandboxEl) sandboxEl.classList.remove("hidden");
  } else {
    if (sandboxEl) sandboxEl.classList.add("hidden");
  }

  chatHistory = [{ role:"assistant",
    content:`I just taught: **${topic}** at Level ${level} (${lvl?lvl.label:""}). Full lesson:\n\n${content}` }];
}

// ── SANDBOX ────────────────────────────────────────────────────────────────
function getDefaultSandboxCode(topic, lang) {
  const t = { Python:`# ${topic} — L5 Sandbox\ndef main():\n    print("Exploring ${topic}")\n    pass\n\nif __name__=="__main__":\n    main()`,
    JavaScript:`// ${topic} — L5 Sandbox\nfunction main() {\n  console.log("Exploring ${topic}");\n}\nmain();`,
    Java:`// ${topic} — L5 Sandbox\npublic class Sandbox {\n    public static void main(String[] args) {\n        System.out.println("Exploring ${topic}");\n    }\n}`,
    Go:`package main\nimport "fmt"\nfunc main() {\n    fmt.Println("Exploring ${topic}")\n}`,
    "C++":`#include <iostream>\nusing namespace std;\nint main() {\n    cout << "Exploring ${topic}" << endl;\n    return 0;\n}`,
    Rust:`fn main() {\n    println!("Exploring ${topic}");\n}`,
    TypeScript:`function main(): void {\n  console.log("Exploring ${topic}");\n}\nmain();` };
  return t[lang] || t["Python"];
}

const PISTON_LANGS = {
  Python:     { language:"python",     version:"3.10.0" },
  JavaScript: { language:"javascript", version:"18.15.0" },
  Java:       { language:"java",       version:"15.0.2" },
  Go:         { language:"go",         version:"1.16.2" },
  "C++":      { language:"c++",        version:"10.2.0" },
  Rust:       { language:"rust",       version:"1.50.0" },
  TypeScript: { language:"typescript", version:"5.0.3" },
};

function renderSandbox(starterCode, topic) {
  const existing = document.getElementById("sandboxPanel");
  if (existing) existing.remove();
  const lang  = document.getElementById("langSelect").value;
  const panel = document.createElement("div");
  panel.id = "sandboxPanel"; panel.className = "sandbox-panel";
  panel.innerHTML = `
    <div class="sandbox-header">
      <div class="sandbox-title"><span class="sandbox-rune">⬡</span> L5 Sandbox — ${escHtml(topic)}</div>
      <div class="sandbox-controls">
        <span class="sandbox-lang-badge">${escHtml(lang)}</span>
        <button class="sandbox-run-btn" id="sandboxRunBtn" onclick="runSandbox()">
          <span id="sandboxRunText">▶ Run</span>
          <span id="sandboxRunSpinner" class="spinner hidden"></span>
        </button>
        <button class="sandbox-clear-btn" onclick="clearSandboxOutput()">✕ Clear</button>
      </div>
    </div>
    <div class="sandbox-body">
      <div class="sandbox-editor-wrap">
        <textarea id="sandboxEditor" class="sandbox-editor" spellcheck="false">${escHtml(starterCode)}</textarea>
      </div>
      <div class="sandbox-output-wrap">
        <div class="sandbox-output-label">Output</div>
        <div id="sandboxOutput" class="sandbox-output">Run your code to see output here…</div>
      </div>
    </div>
    <p class="sandbox-hint">Code runs via Piston (sandboxed).</p>`;
  const lessonState = document.getElementById("lessonState");
  const chatSection = lessonState.querySelector(".chat-section");
  lessonState.insertBefore(panel, chatSection);
  const editor = document.getElementById("sandboxEditor");
  if (editor) {
    editor.addEventListener("keydown", e => {
      if (e.key === "Tab") {
        e.preventDefault();
        const s = editor.selectionStart, en = editor.selectionEnd;
        editor.value = editor.value.substring(0,s)+"  "+editor.value.substring(en);
        editor.selectionStart = editor.selectionEnd = s+2;
      }
    });
    editor.addEventListener("input", () => {
      editor.style.height = "auto";
      editor.style.height = Math.min(editor.scrollHeight,400)+"px";
    });
    editor.style.height = Math.min(editor.scrollHeight,400)+"px";
  }
}

async function runSandbox() {
  const editor = document.getElementById("sandboxEditor");
  const output = document.getElementById("sandboxOutput");
  if (!editor||!output) return;
  const code = editor.value.trim();
  if (!code) return;
  const lang = document.getElementById("langSelect").value;
  const pl   = PISTON_LANGS[lang] || PISTON_LANGS["Python"];
  setBtnLoading("sandboxRunText","sandboxRunSpinner",true);
  output.innerHTML = `<span style="color:var(--muted);font-style:italic;">Running…</span>`;
  try {
    const res  = await fetch("https://emkc.org/api/v2/piston/execute",{
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ language:pl.language, version:pl.version,
        files:[{ name:"main", content:code }] })});
    const data = await res.json();
    const out  = ((data.run?.stdout||"")+(data.run?.stderr||"")).trim();
    if (out)             output.innerHTML = `<pre class="sandbox-result">${escHtml(out)}</pre>`;
    else if (!data.run?.code) output.innerHTML = `<span style="color:var(--green);font-style:italic;">✓ Ran successfully (no output)</span>`;
    else                 output.innerHTML = `<span style="color:var(--red)">Exited with code ${data.run?.code}</span>`;
  } catch { output.innerHTML = `<span style="color:var(--red)">Could not reach Piston — check your network.</span>`; }
  finally { setBtnLoading("sandboxRunText","sandboxRunSpinner",false); }
}

function clearSandboxOutput() {
  const o = document.getElementById("sandboxOutput");
  if (o) o.innerHTML = "Run your code to see output here…";
}

// ── UI HELPERS ─────────────────────────────────────────────────────────────
function showState(id) {
  ["welcomeState","loadingState","gateState","hintState","revealState","lessonState"].forEach(s => {
    const el = document.getElementById(s);
    if (el) el.classList.toggle("hidden", s !== id);
  });
}

function updateAttemptDots(dotsId, textId, usedCount) {
  const container = document.getElementById(dotsId);
  container.innerHTML = ""; container.className = "attempt-dots";
  for (let i = 1; i <= 3; i++) {
    const dot = document.createElement("span");
    dot.className = "attempt-dot " + (i <= usedCount ? "used" : i === usedCount+1 ? "active" : "");
    container.appendChild(dot);
  }
  document.getElementById(textId).textContent =
    (3-usedCount) > 0 ? `Attempt ${usedCount+1} of 3` : "Final attempt";
}

function setBtnLoading(textId, spinnerId, loading) {
  const txt = document.getElementById(textId);
  const sp  = document.getElementById(spinnerId);
  if (txt) txt.classList.toggle("hidden", loading);
  if (sp)  sp.classList.toggle("hidden", !loading);
}

function escHtml(str) {
  if (!str) return "";
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// ══════════════════════════════════════════════════════════════════════════════
// MERMAID — sanitiser + safe renderer
// ══════════════════════════════════════════════════════════════════════════════
function sanitiseMermaid(raw) {
  // 1. Trim + strip any accidental double-fence
  let code = raw.trim()
    .replace(/^```mermaid\s*/i,"").replace(/^```\s*/i,"").replace(/```\s*$/,"").trim();

  // 2. Normalise line endings
  code = code.replace(/\r\n/g,"\n").replace(/\r/g,"\n");

  // 3. Ensure valid diagram type on first line
  const validStarts = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|quadrantChart|gitGraph|mindmap|timeline|xychart)/i;
  if (!validStarts.test(code.split("\n")[0].trim())) {
    code = "flowchart TD\n" + code;
  }

  const lines = code.split("\n");
  return lines.map((line, idx) => {
    // First line (diagram type) and comments: pass through untouched
    if (idx === 0 || /^\s*%%/.test(line)) return line;

    // Strip trailing semicolons (mermaid v10 rejects them)
    line = line.replace(/;\s*$/, "");

    // Convert backtick-quoted labels to double-quoted
    line = line.replace(/`([^`]*)`/g, (_, inner) => `"${inner.replace(/"/g,"'")}"`);

    // Sanitise edge labels:  -->|label|  or  -.->|label|
    line = line.replace(/([-=.]+>+|<[-=.]+)\|([^|]*)\|/g, (m, arrow, lbl) => {
      const safe = lbl.replace(/["`]/g,"'").replace(/:/g," -").trim();
      return `${arrow}|${safe}|`;
    });

    // Sanitise square-bracket node labels: ID[label]
    line = line.replace(/([A-Za-z0-9_]+)\[([^\]]+)\]/g, (m, id, lbl) => {
      if (lbl.startsWith('"') && lbl.endsWith('"')) return m; // already quoted
      if (/[:"'(){}\[\]]/.test(lbl)) return `${id}["${lbl.replace(/"/g,"'")}"]`;
      return m;
    });

    // Sanitise round-bracket node labels: ID(label)
    line = line.replace(/([A-Za-z0-9_]+)\(([^)]+)\)/g, (m, id, lbl) => {
      if (/[:"'(){}\[\]]/.test(lbl)) return `${id}["${lbl.replace(/"/g,"'")}"]`;
      return m;
    });

    return line;
  }).join("\n");
}

async function renderMermaidSafe(el) {
  // Read the raw mermaid source from the element's text content
  // (browser already HTML-decoded it from the &amp;/&lt;/&gt; we stored)
  const raw   = el.textContent || "";
  const clean = sanitiseMermaid(raw);

  // Overwrite with sanitised source so mermaid.run() sees clean text
  el.textContent = clean;

  try {
    await mermaid.run({ nodes: [el] });
  } catch (err) {
    // Render graceful fallback — styled code block instead of red error
    const wrap = el.closest(".mermaid-wrap") || el.parentNode;
    const pre  = document.createElement("pre");
    pre.style.cssText = "font-family:'DM Mono',monospace;font-size:11px;color:rgba(200,160,64,0.6);" +
      "white-space:pre-wrap;padding:14px;line-height:1.65;background:rgba(200,160,64,0.04);border-radius:4px;";
    pre.textContent = clean;
    wrap.innerHTML = ""; wrap.appendChild(pre);
    console.warn("Mermaid render failed (showing raw):", err?.message || err);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FORMAT CONTENT  — mermaid + flashcards + markdown → HTML
// ══════════════════════════════════════════════════════════════════════════════
function formatContent(raw) {
  if (!raw) return "";

  // Strip sandbox block (rendered separately)
  raw = raw.replace(/===SANDBOX_START===[\s\S]*?===SANDBOX_END===/g, "");

  const parts = [];   // indexed placeholders → HTML blocks
  let   rest  = raw;

  // ── Step 0: extract flashcards BEFORE any HTML escaping ──────────────────
  // This guarantees the === markers are never broken by escaping.
  const flashcards = [];
  rest = rest.replace(
    /===FLASHCARD===\s*Q:\s*([\s\S]*?)\s*A:\s*([\s\S]*?)\s*===END_FLASHCARD===/g,
    (_, q, a) => {
      const ph = `__PART_${parts.length}__`;
      flashcards.push({ q: q.trim(), a: a.trim() });
      parts.push(null); // placeholder; filled in step 4
      return ph;
    }
  );

  // ── Step 1: extract mermaid blocks ───────────────────────────────────────
  rest = rest.replace(/```mermaid\n?([\s\S]*?)```/g, (_, code) => {
    const ph  = `__PART_${parts.length}__`;
    const uid = `mm-${Date.now()}-${parts.length}`;
    // Escape &, <, > only — sanitiseMermaid will handle the rest at render time
    const esc = code.trim()
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    parts.push(`<div class="mermaid-wrap"><pre class="mermaid" id="${uid}">${esc}</pre></div>`);
    return ph;
  });

  // ── Step 2: extract generic code blocks ──────────────────────────────────
  rest = rest.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const ph    = `__PART_${parts.length}__`;
    const label = lang ? `<span class="code-lang-label">${escHtml(lang)}</span>` : "";
    parts.push(`<div class="code-block-wrap">${label}<pre><code>${escHtml(code.trim())}</code></pre></div>`);
    return ph;
  });

  // ── Step 3: escape prose + inline markdown ────────────────────────────────
  let html = escHtml(rest)
    .replace(/`([^`]+)`/g,   "<code>$1</code>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g,           "<br/>");

  // ── Step 4: restore placeholders ─────────────────────────────────────────
  parts.forEach((block, i) => {
    if (block === null) {
      // Flashcard — build HTML now with proper escaping
      const card = flashcards.shift();
      const idx  = i; // use part index as display number
      block = `<div class="flashcard" data-flipped="false">
        <div class="flashcard-inner">
          <div class="flashcard-front">
            <div class="flashcard-label">Q</div>
            <div class="flashcard-text">${escHtml(card.q)}</div>
            <div class="flashcard-tap-hint">Tap to reveal answer ✦</div>
          </div>
          <div class="flashcard-back">
            <div class="flashcard-label">A</div>
            <div class="flashcard-text">${escHtml(card.a)}</div>
            <div class="flashcard-tap-hint">Tap to flip back</div>
          </div>
        </div>
      </div>`;
    }
    // Exact string replace — no regex, no accidental greedy match
    html = html.replace(`__PART_${i}__`, block);
  });

  // ── Step 5: wrap adjacent flashcards in .flashcard-set ───────────────────
  // We do this with a non-greedy targeted replace on the specific sentinel
  // comment we'll add, then strip the comment. Safer than regex on div trees.
  // Simple approach: split on flashcard divs and rewrap.
  html = html.replace(
    /(<div class="flashcard" data-flipped="false">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>)/g,
    m => m  // keep individual cards as-is; wrapping below
  );
  // Wrap all flashcard divs that appear consecutively
  html = html.replace(
    /((?:<div class="flashcard" data-flipped="false">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*)+)/g,
    group => `<div class="flashcard-set">${group}</div>`
  );

  // ── Step 6: schedule mermaid rendering after DOM insert ──────────────────
  setTimeout(async () => {
    for (const el of document.querySelectorAll("pre.mermaid:not([data-processed])")) {
      el.dataset.processed = "1";
      await renderMermaidSafe(el);
    }
    attachFlashcardHandlers();
  }, 300);

  return html;
}

// Attach flashcard click handlers after each innerHTML insertion
// Called automatically — safe to call multiple times
function attachFlashcardHandlers() {
  document.querySelectorAll(".flashcard:not([data-bound])").forEach(fc => {
    fc.dataset.bound = "1";
    fc.addEventListener("click", () => {
      const flipped = fc.dataset.flipped === "true";
      fc.dataset.flipped = String(!flipped);
      fc.classList.toggle("is-flipped", !flipped);
    });
  });
}


// ══════════════════════════════════════════════════════════════════════════════
// CHAT
// ══════════════════════════════════════════════════════════════════════════════
function resetChat() {
  chatHistory = [];
  const thread = document.getElementById("chatThread");
  if (thread) thread.innerHTML = "";
}

function appendChatMsg(role, html) {
  const thread = document.getElementById("chatThread");
  if (!thread) return;
  const isUser = role === "user";
  const div = document.createElement("div");
  div.className = "chat-msg " + (isUser?"user":"vera");
  div.innerHTML = `
    <div class="chat-avatar">${isUser?"👤":"⬡"}</div>
    <div style="flex:1;min-width:0;">
      <div class="chat-sender">${isUser?"You":"Vera"}</div>
      <div class="chat-body">${html}</div>
    </div>`;
  thread.appendChild(div);
  thread.scrollTop = thread.scrollHeight;
  // Attach flashcard click handlers if any cards just appeared
  attachFlashcardHandlers();
}

function showTyping() {
  const thread = document.getElementById("chatThread");
  if (!thread || document.getElementById("chatTyping")) return;
  const el = document.createElement("div");
  el.className = "chat-typing"; el.id = "chatTyping";
  el.innerHTML = `
    <div class="chat-avatar" style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(200,160,64,0.1);border:1px solid rgba(200,160,64,0.25);font-size:13px;flex-shrink:0;">⬡</div>
    <div class="typing-dots">
      <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
    </div>
    <span style="font-size:12px;color:var(--muted)">Vera is thinking…</span>`;
  thread.appendChild(el);
  thread.scrollTop = thread.scrollHeight;
}

function hideTyping() {
  const el = document.getElementById("chatTyping"); if (el) el.remove();
}

function handleChatKey(e) {
  if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); }
}

function lockChatInput(placeholder) {
  const input = document.getElementById("chatInput");
  input.placeholder = placeholder; input.style.borderColor = "var(--gold)";
}

function unlockChatInput() {
  const input = document.getElementById("chatInput");
  input.placeholder = "Ask a follow-up, request an example, go deeper…";
  input.style.borderColor = "";
}

async function sendChat() {
  const input = document.getElementById("chatInput");
  const message = input.value.trim();
  if (!message) return;
  if (quizActive && quizCurrentQ) { await submitQuizAnswer(message); return; }

  appendChatMsg("user", escHtml(message).replace(/\n/g,"<br/>"));
  chatHistory.push({ role:"user", content:message });
  input.value = "";

  const sendBtn = document.getElementById("chatSendBtn");
  sendBtn.disabled = true;
  setBtnLoading("chatSendText","chatSendSpinner",true);
  showTyping();

  const lang = document.getElementById("langSelect").value;
  try {
    const res = await apiPost("/vault/chat",
      { topic:currentTopic, level:currentLevel, language:lang, history:chatHistory }, true);
    hideTyping();
    chatHistory.push({ role:"assistant", content:res.content });
    appendChatMsg("vera", formatContent(res.content));
    if (res.trigger_quiz   && !quizDoneThisSession)    setTimeout(()=>startInlineQuiz("popquiz"),700);
    if (res.trigger_levelup && !levelupDoneThisSession) setTimeout(()=>startInlineQuiz("levelup"),700);
  } catch(e) {
    hideTyping();
    appendChatMsg("vera",`<span style="color:var(--red)">Oops — something went wrong. Try again!</span>`);
  } finally {
    sendBtn.disabled = false;
    setBtnLoading("chatSendText","chatSendSpinner",false);
  }
}

// ── INLINE QUIZ ────────────────────────────────────────────────────────────
async function startInlineQuiz(mode="popquiz") {
  const isLevelUp = mode === "levelup";
  if (isLevelUp && levelupDoneThisSession) return;
  if (!isLevelUp && quizDoneThisSession)   return;
  quizActive = false; quizCurrentQ = null;

  appendChatMsg("vera", isLevelUp
    ? `<strong>🎓 Level ${currentLevel} Complete!</strong> You've covered everything — let me put together your Level-Up Exam… ⏳`
    : `<strong>🧠 Quick Check!</strong> 1-2 questions to make sure it's clicking. Hang tight… ⏳`);

  const thread = document.getElementById("chatThread");
  const pill   = document.createElement("div");
  pill.id = "quizLoadingPill";
  pill.className = "quiz-loading-pill" + (isLevelUp?" levelup-pill":"");
  pill.innerHTML = `
    <div class="typing-dots">
      <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
    </div>
    <span>${isLevelUp?"Preparing Level-Up Exam…":"Generating quick check…"}</span>`;
  thread.appendChild(pill); thread.scrollTop = thread.scrollHeight;
  lockChatInput("Hold on — preparing questions… ⏳");

  try {
    const q = await apiPost("/vault/quiz/start",
      { topic:currentTopic, level:currentLevel,
        language:document.getElementById("langSelect").value, quiz_mode:mode }, true);
    document.getElementById("quizLoadingPill")?.remove();
    quizActive = true; quizCurrentQ = q; quizCurrentMode = mode;
    renderQuizCard(q, true, mode);
    lockChatInput("Type your answer and press Enter…");
  } catch(e) {
    document.getElementById("quizLoadingPill")?.remove();
    unlockChatInput();
    appendChatMsg("vera",`<span style="color:var(--red)">Couldn't load the quiz right now — keep chatting! 😊</span>`);
  }
}

function renderQuizCard(q, isFirst=false, mode="popquiz") {
  const thread = document.getElementById("chatThread");
  if (!thread) return;
  document.getElementById("quizCard")?.remove();
  const pct   = Math.round((q.question_index / q.total_questions) * 100);
  const isLU  = mode === "levelup";
  const badge = isLU
    ? `🎓 Level-Up Exam — Q${q.question_index+1} of ${q.total_questions}`
    : `🧠 Quick Check — Q${q.question_index+1} of ${q.total_questions}`;
  const card = document.createElement("div");
  card.id = "quizCard";
  card.className = (isLU?"quiz-card levelup-card":"quiz-card") + (isFirst?" quiz-card-enter":"");
  card.innerHTML = `
    <div class="quiz-card-header">
      <span class="quiz-badge ${isLU?"levelup-badge":""}">${badge}</span>
    </div>
    <div class="quiz-progress-bar">
      <div class="quiz-progress-fill ${isLU?"levelup-fill":""}" style="width:${pct}%"></div>
    </div>
    <div class="quiz-question">${escHtml(q.question_text)}</div>
    <div class="quiz-footer-hint">↓ Type your answer in the box below and press Enter</div>`;
  thread.appendChild(card);
  requestAnimationFrame(() => card.scrollIntoView({ behavior:"smooth", block:"nearest" }));
}

async function submitQuizAnswer(answer) {
  if (!quizCurrentQ) return;
  document.getElementById("chatInput").value = "";
  appendChatMsg("user", escHtml(answer).replace(/\n/g,"<br/>"));
  const sendBtn = document.getElementById("chatSendBtn");
  sendBtn.disabled = true; showTyping();
  const lang = document.getElementById("langSelect").value;
  try {
    const res = await apiPost("/vault/quiz/answer",{
      topic:currentTopic, level:currentLevel, language:lang,
      question_index: quizCurrentQ.question_index,
      question_text:  quizCurrentQ.question_text,
      user_answer:    answer,
    }, true);
    hideTyping();
    const icon  = res.passed ? "✅" : "💡";
    const color = res.passed ? "var(--green)" : "var(--gold)";
    appendChatMsg("vera", `<span style="color:${color}">${icon} ${escHtml(res.feedback)}</span>`);

    if (!res.quiz_complete) {
      const next = await apiGet("/vault/quiz/next");
      if (next) { quizCurrentQ = next; renderQuizCard(next, false, quizCurrentMode); }
    } else {
      const mode = res.quiz_mode || quizCurrentMode;
      quizActive = false; quizCurrentQ = null;
      if (mode === "levelup") { levelupDoneThisSession = true; chatHistory.push({role:"assistant",content:"LEVELUP_DONE"}); }
      else                   { quizDoneThisSession    = true; chatHistory.push({role:"assistant",content:"QUIZ_DONE"}); }
      document.getElementById("quizCard")?.remove();
      unlockChatInput();
      showQuizSummary(res, mode);
      if (res.promoted && res.next_level) {
        unlockedLevels.add(res.next_level); currentLevel = res.next_level; renderLevelList();
      }
    }
  } catch(e) {
    hideTyping();
    appendChatMsg("vera",`<span style="color:var(--red)">Something went wrong — try that again!</span>`);
  } finally { sendBtn.disabled = false; }
}

function showQuizSummary(res, mode="popquiz") {
  const thread  = document.getElementById("chatThread");
  if (!thread) return;
  const isLU    = mode === "levelup";
  if (!isLU) { appendChatMsg("vera", formatContent(res.summary||"Good effort — keep going! 💪")); return; }

  const promoted = res.promoted;
  const icon     = promoted ? "🎉" : "💪";
  const color    = promoted ? "var(--green)" : "var(--violet)";
  const bgColor  = promoted ? "rgba(74,222,128,0.08)" : "rgba(155,127,212,0.08)";
  const border   = promoted ? "rgba(74,222,128,0.3)"  : "rgba(155,127,212,0.3)";
  const summary  = document.createElement("div");
  summary.className = "quiz-summary-card levelup-summary";
  summary.innerHTML = `
    <div class="quiz-summary-icon">${icon}</div>
    <div class="levelup-exam-label">Level-Up Exam Result</div>
    <div class="quiz-score" style="color:${color}">
      ${res.score??"?"} / ${res.total??"?"} &nbsp;·&nbsp; ${res.percent??"?"}%
    </div>
    <div class="quiz-summary-text">${formatContent(res.summary||"Great effort!")}</div>
    ${promoted
      ? `<div class="quiz-promoted-badge" style="background:${bgColor};border:1px solid ${border};color:${color};">
           🔓 Level ${res.next_level} Unlocked — click it in the sidebar!
         </div>`
      : `<div class="quiz-retry-note" style="color:var(--muted);font-size:12px;margin-top:12px;">
           Keep chatting to strengthen weak spots, then the exam will run again 🚀
         </div>`}`;
  thread.appendChild(summary);
  requestAnimationFrame(() => summary.scrollIntoView({ behavior:"smooth", block:"nearest" }));
}