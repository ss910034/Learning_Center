/* =========================================================
 * 學習中心：頁面路由 + 抽考 + 學習檢核（雛形版）
 * 所有學習紀錄儲存於瀏覽器 localStorage。
 * ========================================================= */

const $app = document.getElementById("app");

/* ---------- 儲存層（學習紀錄） ---------- */
const Store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
};

const Progress = {
  learnedGates() { return Store.get("hd_learned_gates", []); },
  toggleGate(no) {
    const list = this.learnedGates();
    const i = list.indexOf(no);
    if (i >= 0) list.splice(i, 1); else list.push(no);
    Store.set("hd_learned_gates", list);
    return list;
  },
  doneLessons() { return Store.get("hd_done_lessons", []); },
  toggleLesson(id) {
    const list = this.doneLessons();
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1); else list.push(id);
    Store.set("hd_done_lessons", list);
    return list;
  },
  quizHistory() { return Store.get("hd_quiz_history", []); },
  addQuizResult(entry) {
    const list = this.quizHistory();
    list.unshift(entry);
    Store.set("hd_quiz_history", list.slice(0, 50));
  },
  dailyResults() { return Store.get("hd_daily_results", {}); },
  recordDaily(date, score, total) {
    const results = this.dailyResults();
    if (!results[date]) { // 每日成績以第一次作答為準
      results[date] = { score, total };
      Store.set("hd_daily_results", results);
    }
  },
  dailyStreak() {
    const results = this.dailyResults();
    let streak = 0;
    const d = new Date();
    if (!results[localDate(d)]) d.setDate(d.getDate() - 1); // 今天還沒考，從昨天往回數
    while (results[localDate(d)]) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  },
};

/* ---------- 佈景主題 ---------- */
function initTheme() {
  const select = document.getElementById("theme-select");
  if (!select) return;
  select.value = Store.get("hd_theme", "auto");
  select.onchange = () => {
    const t = select.value;
    Store.set("hd_theme", t);
    if (t === "auto") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
  };
}

/* ---------- 小工具 ---------- */
const centerName = id => (CENTERS.find(c => c.id === id) || {}).name || id;
const gateByNo = no => GATES.find(g => g.no === no);
const esc = s => String(s).replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* 以日期字串產生種子亂數，讓全站每天出同一份「每日一考」 */
function seededRng(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function seededShuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function gateChannels(no) {
  return CHANNELS.filter(([a, b]) => a === no || b === no)
    .map(([a, b, name]) => ({ partner: a === no ? b : a, name, label: `${a}–${b}` }));
}

/* ---------- 路由 ---------- */
const routes = {
  home: renderHome,
  lessons: renderLessons,
  lesson: renderLesson,
  gates: renderGates,
  gate: renderGate,
  tidbits: renderTidbits,
  quiz: renderQuizSetup,
  progress: renderProgress,
};

function navigate() {
  const hash = location.hash.replace(/^#\//, "") || "home";
  const [page, arg] = hash.split("/");
  const render = routes[page] || renderHome;
  document.querySelectorAll("#site-nav a").forEach(a => {
    a.classList.toggle("active", a.dataset.nav === (page === "lesson" ? "lessons" : page === "gate" ? "gates" : page));
  });
  render(arg);
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", navigate);
window.addEventListener("DOMContentLoaded", () => { initTheme(); navigate(); });

/* ---------- 首頁 ---------- */
function renderHome() {
  const learned = Progress.learnedGates().length;
  const lessons = Progress.doneLessons().length;
  const history = Progress.quizHistory();
  const best = history.length ? Math.max(...history.map(h => Math.round(h.score / h.total * 100))) : null;
  const tidbit = TIDBITS[Math.floor(Math.random() * TIDBITS.length)];
  const todayResult = Progress.dailyResults()[localDate()];
  const streak = Progress.dailyStreak();

  $app.innerHTML = `
    <div class="hero">
      <h1>人類圖閘門學習</h1>
      <p>從基礎教學到 64 閘門圖鑑，每個閘門都有<strong>生活中的範例</strong>，
      搭配<strong>抽考與學習檢核</strong>，一步一步把知識變成你的語言。</p>
      <div class="actions">
        <a class="btn" href="#/lessons">📖 從教學開始</a>
        <a class="btn secondary" href="#/gates">🔢 瀏覽 64 閘門</a>
        <a class="btn secondary" href="#/quiz">✏️ 立刻抽考</a>
      </div>
    </div>

    <div class="stat-row">
      <div class="stat"><div class="num">${learned}<span style="font-size:1rem;color:var(--muted)">/64</span></div><div class="label">已學閘門</div></div>
      <div class="stat"><div class="num">${lessons}<span style="font-size:1rem;color:var(--muted)">/${LESSONS.length}</span></div><div class="label">完成課程</div></div>
      <div class="stat"><div class="num">${history.length}</div><div class="label">測驗次數</div></div>
      <div class="stat"><div class="num">${best === null ? "–" : best + "%"}</div><div class="label">最佳成績</div></div>
    </div>

    <div class="card">
      <h3>📅 每日一考 ${streak ? `<span class="tag gold">🔥 連續 ${streak} 天</span>` : ""}</h3>
      ${todayResult
        ? `<p>今日已完成：<strong>${todayResult.score} / ${todayResult.total}</strong>，明天見！</p>`
        : `<p class="meta">今天的 5 題還沒做，花兩分鐘保持手感吧。</p><button class="btn small" id="home-daily-start">開始今日挑戰</button>`}
    </div>

    <div class="card">
      <h3>💡 今日小知識：${esc(tidbit.title)}</h3>
      <p>${esc(tidbit.text)}</p>
      <a href="#/tidbits">看更多小知識 →</a>
    </div>

    <h2>建議學習路徑</h2>
    <div class="grid">
      <div class="card"><h3>1️⃣ 打好基礎</h3><p class="meta">讀完六課教學，認識類型、中心、權威與閘門的概念。</p></div>
      <div class="card"><h3>2️⃣ 認識閘門</h3><p class="meta">到閘門圖鑑逐一學習，讀完標記「已學」。建議從自己圖上有啟動的閘門開始。</p></div>
      <div class="card"><h3>3️⃣ 抽考檢核</h3><p class="meta">每學完一批閘門就做一次抽考，答錯的閘門回頭複習。</p></div>
      <div class="card"><h3>4️⃣ 追蹤進度</h3><p class="meta">在學習進度頁查看掌握度、各中心的完成度與測驗紀錄。</p></div>
    </div>
  `;
  const dailyBtn = document.getElementById("home-daily-start");
  if (dailyBtn) dailyBtn.onclick = startDailyQuiz;
}

/* ---------- 教學 ---------- */
function renderLessons() {
  const done = Progress.doneLessons();
  $app.innerHTML = `
    <h1>📖 基礎教學</h1>
    <p class="page-desc">六課入門課程，從「人類圖是什麼」一路到「如何開始實驗」。</p>
    <div class="grid">
      ${LESSONS.map(l => `
        <div class="card">
          <h3><a href="#/lesson/${l.id}">第 ${l.id} 課：${esc(l.title)}</a>
          ${done.includes(l.id) ? '<span class="tag ok">✓ 已完成</span>' : ""}</h3>
          <p class="meta">${esc(l.summary)}</p>
        </div>`).join("")}
    </div>
  `;
}

function renderLesson(arg) {
  const lesson = LESSONS.find(l => l.id === Number(arg));
  if (!lesson) { location.hash = "#/lessons"; return; }
  const done = Progress.doneLessons().includes(lesson.id);
  const prev = LESSONS.find(l => l.id === lesson.id - 1);
  const next = LESSONS.find(l => l.id === lesson.id + 1);

  $app.innerHTML = `
    <p class="breadcrumb"><a href="#/lessons">教學</a> ／ 第 ${lesson.id} 課</p>
    <h1>${esc(lesson.title)}</h1>
    ${lesson.sections.map(s => s.example
      ? `<div class="example-box"><div class="label">🌱 生活範例</div><p>${esc(s.p)}</p></div>`
      : `<div class="lesson-section"><h2>${esc(s.h)}</h2><p>${esc(s.p)}</p></div>`).join("")}
    <div class="card">
      <button class="btn ${done ? "secondary" : ""}" id="toggle-lesson">
        ${done ? "↩︎ 取消完成標記" : "✓ 標記本課為已完成"}
      </button>
    </div>
    <div style="display:flex;justify-content:space-between;gap:1rem;">
      <span>${prev ? `<a href="#/lesson/${prev.id}">← 第 ${prev.id} 課：${esc(prev.title)}</a>` : ""}</span>
      <span>${next ? `<a href="#/lesson/${next.id}">第 ${next.id} 課：${esc(next.title)} →</a>` : `<a href="#/gates">開始學習 64 閘門 →</a>`}</span>
    </div>
  `;
  document.getElementById("toggle-lesson").onclick = () => {
    Progress.toggleLesson(lesson.id);
    renderLesson(arg);
  };
}

/* ---------- 閘門圖鑑 ---------- */
function renderGates() {
  const learned = Progress.learnedGates();
  $app.innerHTML = `
    <h1>🔢 64 閘門圖鑑</h1>
    <p class="page-desc">每個閘門包含易經卦象、能量中心、關鍵字、說明與生活範例。已學 ${learned.length}/64。</p>
    <div class="progress-bar"><span style="width:${Math.round(learned.length / 64 * 100)}%"></span></div>
    <div class="filter-row">
      <input type="search" id="gate-search" placeholder="搜尋編號、名稱或關鍵字…">
      <select id="gate-center">
        <option value="">全部中心</option>
        ${CENTERS.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}
      </select>
      <select id="gate-state">
        <option value="">全部狀態</option>
        <option value="learned">已學</option>
        <option value="unlearned">未學</option>
      </select>
    </div>
    <div class="grid" id="gate-list"></div>
  `;

  const list = document.getElementById("gate-list");
  const draw = () => {
    const q = document.getElementById("gate-search").value.trim();
    const center = document.getElementById("gate-center").value;
    const state = document.getElementById("gate-state").value;
    const learnedNow = Progress.learnedGates();
    const filtered = GATES.filter(g =>
      (!center || g.center === center) &&
      (!state || (state === "learned") === learnedNow.includes(g.no)) &&
      (!q || String(g.no) === q || g.name.includes(q) || g.keyword.includes(q) || g.iching.includes(q))
    );
    list.innerHTML = filtered.map(g => `
      <div class="card gate-card ${learnedNow.includes(g.no) ? "learned" : ""}" onclick="location.hash='#/gate/${g.no}'">
        ${learnedNow.includes(g.no) ? '<span class="learned-badge">✓ 已學</span>' : ""}
        <h3><span class="gate-no">${g.no}</span>${esc(g.name)}</h3>
        <p class="meta">${esc(g.iching)} ｜ ${centerName(g.center)}</p>
        <span class="tag">${esc(g.keyword)}</span>
      </div>`).join("") || "<p>沒有符合條件的閘門。</p>";
  };
  ["gate-search", "gate-center", "gate-state"].forEach(id =>
    document.getElementById(id).addEventListener("input", draw));
  draw();
}

function renderGate(arg) {
  const gate = gateByNo(Number(arg));
  if (!gate) { location.hash = "#/gates"; return; }
  const learned = Progress.learnedGates().includes(gate.no);
  const detail = GATE_DETAILS[gate.no];
  const channels = gateChannels(gate.no);
  const prev = gateByNo(gate.no === 1 ? 64 : gate.no - 1);
  const next = gateByNo(gate.no === 64 ? 1 : gate.no + 1);

  $app.innerHTML = `
    <p class="breadcrumb"><a href="#/gates">64 閘門</a> ／ 閘門 ${gate.no}</p>
    <h1><span class="gate-no">${gate.no}</span>${esc(gate.name)}</h1>
    <div class="pill-row">
      <span class="tag">${esc(gate.iching)}</span>
      <span class="tag">${centerName(gate.center)}</span>
      <span class="tag gold">關鍵字：${esc(gate.keyword)}</span>
    </div>
    <div class="card"><h3>閘門主題</h3><p>${esc(gate.desc)}</p></div>
    <div class="example-box"><div class="label">🌱 生活範例</div><p>${esc(gate.example)}</p></div>
    ${detail ? `
    <div class="card"><h3>🔍 深入認識</h3><p>${esc(detail.deep)}</p></div>
    <div class="spectrum">
      <div class="card shadow-side"><h3>🌑 陰影面（低頻）</h3><p>${esc(detail.shadow)}</p></div>
      <div class="card gift-side"><h3>✨ 天賦面（高頻）</h3><p>${esc(detail.gift)}</p></div>
    </div>
    <div class="card">
      <h3>六爻速覽</h3>
      <p class="meta">每個閘門可再細分成六條「爻」。以下以六爻的通用原型，對應本閘門「${esc(gate.keyword)}」的主題，作為入門參考；各爻的細部關鍵字屬進階內容。</p>
      <ul class="lines-list">
        ${LINE_ARCHETYPES.map(l => `
          <li><span class="line-no">第 ${l.line} 爻</span><strong>${esc(l.name)}</strong>（${esc(l.theme)}）— ${esc(l.desc)}</li>`).join("")}
      </ul>
    </div>
    <div class="reflect-box"><div class="label">🪞 隨身反思</div>${esc(detail.reflect)}</div>` : ""}
    <div class="card">
      <h3>相關通道</h3>
      ${channels.map(ch => `
        <p>通道 ${ch.label}「${esc(ch.name)}」：與 <a href="#/gate/${ch.partner}">閘門 ${ch.partner}（${esc(gateByNo(ch.partner).name)}）</a> 組成。</p>`).join("")}
      <p class="meta">只啟動通道一端時稱為「懸掛閘門」，會自然受擁有另一端閘門的人吸引。</p>
    </div>
    <div class="card">
      <button class="btn ${learned ? "secondary" : ""}" id="toggle-gate">
        ${learned ? "↩︎ 取消已學標記" : "✓ 標記為已學"}
      </button>
      <a class="btn secondary" href="#/quiz" style="margin-left:.5rem">✏️ 去抽考</a>
    </div>
    <div style="display:flex;justify-content:space-between;gap:1rem;">
      <a href="#/gate/${prev.no}">← 閘門 ${prev.no}（${esc(prev.name)}）</a>
      <a href="#/gate/${next.no}">閘門 ${next.no}（${esc(next.name)}）→</a>
    </div>
  `;
  document.getElementById("toggle-gate").onclick = () => {
    Progress.toggleGate(gate.no);
    renderGate(arg);
  };
}

/* ---------- 小知識 ---------- */
function renderTidbits() {
  $app.innerHTML = `
    <h1>💡 小知識</h1>
    <p class="page-desc">關於人類圖的冷知識與實用觀念，配茶剛好。</p>
    <div class="grid">
      ${TIDBITS.map(t => `<div class="card"><h3>${esc(t.title)}</h3><p class="meta">${esc(t.text)}</p></div>`).join("")}
    </div>
  `;
}

/* ---------- 抽考 ---------- */
function renderQuizSetup() {
  const learnedCount = Progress.learnedGates().length;
  const todayResult = Progress.dailyResults()[localDate()];
  const streak = Progress.dailyStreak();
  $app.innerHTML = `
    <h1>✏️ 閘門抽考</h1>
    <p class="page-desc">系統會從閘門資料隨機出題（名稱、中心、關鍵字、敘述配對），做完立即檢核。</p>
    <div class="card">
      <h3>📅 每日一考 ${streak ? `<span class="tag gold">🔥 連續 ${streak} 天</span>` : ""}</h3>
      <p class="meta">每天固定 5 題、全站題目相同，成績以當天第一次作答為準。天天報到，養成複習的習慣！</p>
      ${todayResult
        ? `<p>今日已完成：<strong>${todayResult.score} / ${todayResult.total}</strong>。想再練習可以重考，但不影響今日成績。</p>
           <button class="btn secondary" id="daily-start">再練一次今日題目</button>`
        : `<button class="btn" id="daily-start">開始今日挑戰</button>`}
    </div>
    <div class="card">
      <h3>🎲 自由抽考</h3>
      <p>
        題數：
        <select id="quiz-count">
          <option value="5">5 題（快速）</option>
          <option value="10" selected>10 題（標準）</option>
          <option value="20">20 題（完整）</option>
        </select>
      </p>
      <p>
        範圍：
        <select id="quiz-scope">
          <option value="all">全部 64 個閘門</option>
          <option value="learned" ${learnedCount < 4 ? "disabled" : ""}>只考我標記已學的閘門（${learnedCount} 個${learnedCount < 4 ? "，需至少 4 個" : ""}）</option>
        </select>
      </p>
      <button class="btn" id="quiz-start">開始抽考</button>
    </div>
    <div class="card">
      <h3>學習檢核建議</h3>
      <p class="meta">・每學完 8–10 個閘門做一次「只考已學」的抽考，正確率達 80% 再往下學。<br>
      ・答錯的閘門會列在結果頁，點進去重讀一次印象最深。<br>
      ・所有測驗成績都會記錄在「學習進度」頁，方便追蹤。</p>
    </div>
  `;
  document.getElementById("quiz-start").onclick = () => {
    const count = Number(document.getElementById("quiz-count").value);
    const scope = document.getElementById("quiz-scope").value;
    startQuiz(count, scope);
  };
  document.getElementById("daily-start").onclick = startDailyQuiz;
}

const QUESTION_MAKERS = [
    gate => ({ // 編號 → 名稱
      q: `閘門 ${gate.no} 的名稱是？`,
      answer: gate.name,
      options: shuffle([gate.name, ...shuffle(GATES.filter(g => g.no !== gate.no)).slice(0, 3).map(g => g.name)]),
      explain: `閘門 ${gate.no} 是「${gate.name}」（${gate.iching}），關鍵字：${gate.keyword}。`,
      gateNo: gate.no,
    }),
    gate => ({ // 閘門 → 中心
      q: `閘門 ${gate.no}（${gate.name}）位於哪個能量中心？`,
      answer: centerName(gate.center),
      options: shuffle([gate.center, ...shuffle(CENTERS.filter(c => c.id !== gate.center)).slice(0, 3).map(c => c.id)]).map(centerName),
      explain: `閘門 ${gate.no}（${gate.name}）位於${centerName(gate.center)}。`,
      gateNo: gate.no,
    }),
    gate => ({ // 關鍵字 → 閘門
      q: `哪一個閘門的關鍵字是「${gate.keyword}」？`,
      answer: `閘門 ${gate.no}（${gate.name}）`,
      options: shuffle([gate, ...shuffle(GATES.filter(g => g.no !== gate.no && g.keyword !== gate.keyword)).slice(0, 3)]).map(g => `閘門 ${g.no}（${g.name}）`),
      explain: `「${gate.keyword}」是閘門 ${gate.no}（${gate.name}）的關鍵字。`,
      gateNo: gate.no,
    }),
    gate => ({ // 敘述 → 閘門
      q: `下列敘述在描述哪一個閘門？「${gate.desc}」`,
      answer: `閘門 ${gate.no}（${gate.name}）`,
      options: shuffle([gate, ...shuffle(GATES.filter(g => g.no !== gate.no)).slice(0, 3)]).map(g => `閘門 ${g.no}（${g.name}）`),
      explain: `這是閘門 ${gate.no}（${gate.name}）的主題，關鍵字：${gate.keyword}。`,
      gateNo: gate.no,
    }),
];

function buildQuestions(count, scope) {
  const learned = Progress.learnedGates();
  let pool = scope === "learned" ? GATES.filter(g => learned.includes(g.no)) : GATES;
  if (pool.length < 4) pool = GATES;
  return shuffle(pool).slice(0, count).map(gate =>
    QUESTION_MAKERS[Math.floor(Math.random() * QUESTION_MAKERS.length)](gate));
}

/* 每日一考：以日期為種子，全站當天題目相同 */
function buildDailyQuestions(date) {
  const rng = seededRng("hd-daily-" + date);
  return seededShuffle(GATES, rng).slice(0, 5).map(gate =>
    QUESTION_MAKERS[Math.floor(rng() * QUESTION_MAKERS.length)](gate));
}

function startQuiz(count, scope) {
  const questions = buildQuestions(count, scope);
  const state = { questions, index: 0, correct: 0, wrongGates: [], scope };
  showQuestion(state);
}

function startDailyQuiz() {
  const date = localDate();
  const state = { questions: buildDailyQuestions(date), index: 0, correct: 0, wrongGates: [], scope: "daily", date };
  showQuestion(state);
}

function showQuestion(state) {
  const { questions, index } = state;
  if (index >= questions.length) { showQuizResult(state); return; }
  const q = questions[index];

  $app.innerHTML = `
    <h1>✏️ 抽考中</h1>
    <p class="quiz-progress">第 ${index + 1} / ${questions.length} 題 ｜ 目前答對 ${state.correct} 題</p>
    <div class="progress-bar"><span style="width:${Math.round(index / questions.length * 100)}%"></span></div>
    <div class="card">
      <h3>${esc(q.q)}</h3>
      <div id="options">
        ${q.options.map(o => `<button class="quiz-option" data-value="${esc(o)}">${esc(o)}</button>`).join("")}
      </div>
      <div id="feedback"></div>
    </div>
  `;

  document.querySelectorAll(".quiz-option").forEach(btn => {
    btn.onclick = () => {
      const chosen = btn.dataset.value;
      const isRight = chosen === q.answer;
      document.querySelectorAll(".quiz-option").forEach(b => {
        b.disabled = true;
        if (b.dataset.value === q.answer) b.classList.add("correct");
        else if (b === btn && !isRight) b.classList.add("wrong");
      });
      if (isRight) state.correct++;
      else state.wrongGates.push(q.gateNo);
      document.getElementById("feedback").innerHTML = `
        <p class="quiz-feedback ${isRight ? "ok" : "bad"}">${isRight ? "✓ 答對了！" : "✗ 答錯了。"} ${esc(q.explain)}</p>
        <button class="btn" id="next-q">${state.index + 1 >= questions.length ? "看成績" : "下一題"}</button>
      `;
      document.getElementById("next-q").onclick = () => {
        state.index++;
        showQuestion(state);
      };
    };
  });
}

function showQuizResult(state) {
  const { questions, correct, wrongGates, scope } = state;
  const pct = Math.round(correct / questions.length * 100);
  const uniqueWrong = [...new Set(wrongGates)];
  const alreadyDoneToday = scope === "daily" && !!Progress.dailyResults()[state.date];
  if (scope === "daily") Progress.recordDaily(state.date, correct, questions.length);
  Progress.addQuizResult({
    date: new Date().toISOString(),
    score: correct,
    total: questions.length,
    scope,
    wrong: uniqueWrong,
  });
  const streak = scope === "daily" ? Progress.dailyStreak() : 0;

  const verdict = pct >= 90 ? "太強了，繼續往下一批閘門前進！"
    : pct >= 80 ? "通過檢核標準（80%），可以安心往下學。"
    : pct >= 60 ? "接近了！建議複習下面答錯的閘門後再考一次。"
    : "別灰心，回到圖鑑把答錯的閘門重讀一次，再挑戰看看。";

  $app.innerHTML = `
    <h1>📊 測驗結果</h1>
    <div class="card">
      ${scope === "daily" ? '<p style="text-align:center"><span class="tag gold">📅 每日一考</span></p>' : ""}
      <div class="score-big">${correct} / ${questions.length}（${pct}%）</div>
      <p style="text-align:center">${verdict}</p>
      ${scope === "daily" ? `<p style="text-align:center">🔥 連續挑戰 <strong>${streak}</strong> 天${alreadyDoneToday ? "（今日成績以第一次作答為準）" : ""}</p>` : ""}
      <div class="progress-bar"><span style="width:${pct}%"></span></div>
    </div>
    ${uniqueWrong.length ? `
      <div class="card">
        <h3>📌 建議複習的閘門</h3>
        ${uniqueWrong.map(no => {
          const g = gateByNo(no);
          return `<p><a href="#/gate/${no}">閘門 ${no}（${esc(g.name)}）</a> — ${esc(g.keyword)}</p>`;
        }).join("")}
      </div>` : `
      <div class="card"><h3>🎉 全對！</h3><p>這批閘門你已經掌握了。</p></div>`}
    <div style="display:flex;gap:.6rem;flex-wrap:wrap">
      <a class="btn" href="#/quiz">再考一次</a>
      <a class="btn secondary" href="#/gates">回閘門圖鑑</a>
      <a class="btn secondary" href="#/progress">查看學習進度</a>
    </div>
  `;
}

/* ---------- 學習進度 ---------- */
function renderProgress() {
  const learned = Progress.learnedGates();
  const doneLessons = Progress.doneLessons();
  const history = Progress.quizHistory();
  const recentWrong = [...new Set(history.slice(0, 5).flatMap(h => h.wrong || []))]
    .filter(no => gateByNo(no));

  const byCenter = CENTERS.map(c => {
    const total = GATES.filter(g => g.center === c.id).length;
    const done = GATES.filter(g => g.center === c.id && learned.includes(g.no)).length;
    return { ...c, total, done };
  });

  $app.innerHTML = `
    <h1>📈 學習進度</h1>

    <h2>閘門掌握度</h2>
    <div class="card">
      <p><strong>${learned.length} / 64</strong> 個閘門已標記為已學（${Math.round(learned.length / 64 * 100)}%）</p>
      <div class="progress-bar"><span style="width:${Math.round(learned.length / 64 * 100)}%"></span></div>
      <div class="table-wrap"><table>
        <tr><th>能量中心</th><th>進度</th><th></th></tr>
        ${byCenter.map(c => `
          <tr>
            <td>${c.name}</td>
            <td>${c.done} / ${c.total}</td>
            <td style="min-width:120px"><div class="progress-bar"><span style="width:${c.total ? Math.round(c.done / c.total * 100) : 0}%"></span></div></td>
          </tr>`).join("")}
      </table></div>
    </div>

    <h2>課程完成度</h2>
    <div class="card">
      ${LESSONS.map(l => `<p>${doneLessons.includes(l.id) ? "✅" : "⬜"} <a href="#/lesson/${l.id}">第 ${l.id} 課：${esc(l.title)}</a></p>`).join("")}
    </div>

    ${recentWrong.length ? `
    <h2>建議複習（近期答錯）</h2>
    <div class="card">
      ${recentWrong.map(no => {
        const g = gateByNo(no);
        return `<p><a href="#/gate/${no}">閘門 ${no}（${esc(g.name)}）</a> — ${esc(g.keyword)}</p>`;
      }).join("")}
    </div>` : ""}

    <h2>測驗紀錄</h2>
    <div class="card">
      <p>📅 每日一考：${Object.keys(Progress.dailyResults()).length ? `已完成 ${Object.keys(Progress.dailyResults()).length} 天，目前連續 🔥 ${Progress.dailyStreak()} 天` : `還沒開始，<a href="#/quiz">今天就來第一考！</a>`}</p>
      ${history.length ? `
      <div class="table-wrap"><table>
        <tr><th>日期</th><th>成績</th><th>範圍</th><th>答錯閘門</th></tr>
        ${history.map(h => `
          <tr>
            <td>${new Date(h.date).toLocaleString("zh-TW", { dateStyle: "short", timeStyle: "short" })}</td>
            <td>${h.score}/${h.total}（${Math.round(h.score / h.total * 100)}%）</td>
            <td>${h.scope === "learned" ? "已學閘門" : h.scope === "daily" ? "📅 每日一考" : "全部閘門"}</td>
            <td>${(h.wrong || []).map(no => `<a href="#/gate/${no}">${no}</a>`).join("、") || "—"}</td>
          </tr>`).join("")}
      </table></div>` : `<p class="meta">還沒有測驗紀錄，<a href="#/quiz">來做第一次抽考吧！</a></p>`}
    </div>
  `;
}
