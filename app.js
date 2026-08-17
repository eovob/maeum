(() => {
  "use strict";

  const STORAGE_KEY = "maeumgyeol_library_v1";
  const RECENT_KEY = "maeumgyeol_recent_v1";

  const els = {
    home: document.getElementById("screen-home"),
    reveal: document.getElementById("screen-reveal"),
    library: document.getElementById("screen-library"),
    moodGrid: document.getElementById("mood-grid"),
    btnDraw: document.getElementById("btn-draw"),
    btnBack: document.getElementById("btn-back"),
    btnAgain: document.getElementById("btn-again"),
    btnSave: document.getElementById("btn-save"),
    saveLabel: document.getElementById("save-label"),
    btnLibrary: document.getElementById("btn-library"),
    btnLibraryBack: document.getElementById("btn-library-back"),
    tabHome: document.getElementById("tab-home"),
    tabLibraryNav: document.getElementById("tab-library-nav"),
    quoteMoodTag: document.getElementById("quote-mood-tag"),
    quoteText: document.getElementById("quote-text"),
    quoteSource: document.getElementById("quote-source"),
    reflectText: document.getElementById("reflect-text"),
    journalInput: document.getElementById("journal-input"),
    ensoWrap: document.getElementById("enso-wrap"),
    ensoSvg: document.getElementById("enso-svg"),
    libraryList: document.getElementById("library-list"),
    libraryEmpty: document.getElementById("library-empty"),
    toast: document.getElementById("toast"),
    tabbar: document.getElementById("tabbar"),
  };

  let selectedMood = null;
  let currentQuote = null;
  let currentQuoteKey = null;

  // ---------- 유틸 ----------
  function loadLibrary() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  }
  function saveLibrary(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
  function loadRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; }
    catch { return []; }
  }
  function saveRecent(list) {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(-12)));
  }
  function quoteKey(q) { return q.mood + "::" + q.text.slice(0, 12); }
  function moodLabel(id) {
    const m = MOODS.find(m => m.id === id);
    return m ? m.label : id;
  }
  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => els.toast.classList.remove("show"), 1800);
  }

  // ---------- 기분 그리드 렌더 ----------
  function renderMoodGrid() {
    els.moodGrid.innerHTML = "";
    MOODS.forEach(m => {
      const btn = document.createElement("button");
      btn.className = "mood-chip";
      btn.setAttribute("role", "listitem");
      btn.dataset.mood = m.id;
      btn.innerHTML = `<span class="mood-chip__icon">${m.icon}</span><span>${m.label}</span>`;
      btn.addEventListener("click", () => selectMood(m.id));
      els.moodGrid.appendChild(btn);
    });
  }

  function selectMood(id) {
    selectedMood = id;
    [...els.moodGrid.children].forEach(c => {
      c.classList.toggle("selected", c.dataset.mood === id);
    });
    els.btnDraw.disabled = false;
  }

  // ---------- 추천 엔진 ----------
  function pickQuote(moodId) {
    const pool = QUOTES.filter(q => q.mood === moodId);
    if (pool.length === 0) return null;
    const recent = loadRecent();
    let candidates = pool.filter(q => !recent.includes(quoteKey(q)));
    if (candidates.length === 0) candidates = pool;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const key = quoteKey(pick);
    const r = loadRecent();
    r.push(key);
    saveRecent(r);
    return pick;
  }

  function showQuote(q) {
    currentQuote = q;
    currentQuoteKey = quoteKey(q);
    els.quoteMoodTag.textContent = moodLabel(q.mood);
    els.quoteText.textContent = q.text;
    els.quoteSource.textContent = q.source;
    els.reflectText.textContent = q.reflect;
    els.journalInput.value = "";

    // 저장 여부 반영
    const lib = loadLibrary();
    const saved = lib.some(item => item.key === currentQuoteKey);
    setSavedState(saved, lib.find(item => item.key === currentQuoteKey));

    // 선원상 애니메이션 재시작
    const oldSvg = els.ensoSvg;
    const newSvg = oldSvg.cloneNode(true);
    oldSvg.parentNode.replaceChild(newSvg, oldSvg);
    els.ensoSvg = newSvg;
  }

  function setSavedState(saved, item) {
    els.btnSave.classList.toggle("saved", saved);
    els.saveLabel.textContent = saved ? "서재에 저장됨" : "서재에 저장";
    if (saved && item && item.journal) {
      els.journalInput.value = item.journal;
    }
  }

  // ---------- 화면 전환 ----------
  function goHome() {
    els.reveal.hidden = true;
    els.library.hidden = true;
    els.home.hidden = false;
    els.tabbar.hidden = false;
    setActiveTab("home");
  }
  function goReveal() {
    els.home.hidden = true;
    els.library.hidden = true;
    els.reveal.hidden = false;
  }
  function goLibrary() {
    els.home.hidden = true;
    els.reveal.hidden = true;
    els.library.hidden = false;
    els.tabbar.hidden = false;
    setActiveTab("library");
    renderLibrary();
  }
  function setActiveTab(name) {
    els.tabHome.classList.toggle("tab--active", name === "home");
    els.tabLibraryNav.classList.toggle("tab--active", name === "library");
  }

  // ---------- 서재 렌더 ----------
  function renderLibrary() {
    const lib = loadLibrary().slice().reverse();
    els.libraryList.innerHTML = "";
    els.libraryEmpty.hidden = lib.length > 0;
    lib.forEach(item => {
      const div = document.createElement("div");
      div.className = "library-item";
      div.innerHTML = `
        <p class="library-item__tag">${moodLabel(item.mood)}</p>
        <p class="library-item__text">${item.text}</p>
        <p class="library-item__source">${item.source}</p>
        ${item.journal ? `<p class="library-item__journal">${escapeHtml(item.journal)}</p>` : ""}
        <button class="library-item__remove" aria-label="삭제">×</button>
      `;
      div.querySelector(".library-item__remove").addEventListener("click", () => {
        removeFromLibrary(item.key);
      });
      els.libraryList.appendChild(div);
    });
  }
  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }
  function removeFromLibrary(key) {
    const lib = loadLibrary().filter(i => i.key !== key);
    saveLibrary(lib);
    renderLibrary();
    if (currentQuoteKey === key) setSavedState(false);
  }

  // ---------- 이벤트 ----------
  els.btnDraw.addEventListener("click", () => {
    if (!selectedMood) return;
    const q = pickQuote(selectedMood);
    if (!q) { showToast("아직 준비된 구절이 없어요"); return; }
    showQuote(q);
    goReveal();
  });

  els.btnBack.addEventListener("click", goHome);
  els.btnLibraryBack.addEventListener("click", goHome);
  els.btnLibrary.addEventListener("click", goLibrary);
  els.tabHome.addEventListener("click", goHome);
  els.tabLibraryNav.addEventListener("click", goLibrary);

  els.btnAgain.addEventListener("click", () => {
    const q = pickQuote(selectedMood);
    if (!q) return;
    showQuote(q);
  });

  els.btnSave.addEventListener("click", () => {
    const lib = loadLibrary();
    const idx = lib.findIndex(i => i.key === currentQuoteKey);
    if (idx >= 0) {
      lib.splice(idx, 1);
      saveLibrary(lib);
      setSavedState(false);
      showToast("서재에서 지웠어요");
    } else {
      lib.push({
        key: currentQuoteKey,
        mood: currentQuote.mood,
        text: currentQuote.text,
        source: currentQuote.source,
        reflect: currentQuote.reflect,
        journal: els.journalInput.value.trim(),
        savedAt: Date.now(),
      });
      saveLibrary(lib);
      setSavedState(true, lib[lib.length - 1]);
      showToast("서재에 저장했어요");
    }
  });

  els.journalInput.addEventListener("blur", () => {
    if (!currentQuoteKey) return;
    const lib = loadLibrary();
    const idx = lib.findIndex(i => i.key === currentQuoteKey);
    if (idx >= 0) {
      lib[idx].journal = els.journalInput.value.trim();
      saveLibrary(lib);
      renderLibrary();
    }
  });

  document.querySelectorAll(".tab--soon").forEach(btn => {
    btn.addEventListener("click", () => {
      showToast(`${btn.dataset.soon}은(는) 곧 만나볼 수 있어요`);
    });
  });

  // ---------- 초기화 ----------
  renderMoodGrid();

  // ---------- 서비스워커 (오프라인 지원) ----------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
