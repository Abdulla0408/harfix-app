(function () {
  "use strict";

  var tg = window.Telegram && window.Telegram.WebApp;
  var inTelegram = !!(tg && tg.initData);
  var H = window.Harfix;
  // UI texts are written in the current Latin alphabet and shown in the new
  // one, exactly like the bot does.
  var L = function (s) { return H.convert(s); };

  function $(id) { return document.getElementById(id); }
  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, val);
    } catch (e) { return null; }
  }
  function haptic(kind) {
    try {
      if (!tg || !tg.HapticFeedback) return;
      if (kind === "select") tg.HapticFeedback.selectionChanged();
      else tg.HapticFeedback.notificationOccurred(kind);
    } catch (e) { /* old clients */ }
  }
  function versionAtLeast(v) {
    try { return tg && tg.isVersionAtLeast && tg.isVersionAtLeast(v); } catch (e) { return false; }
  }

  var toastTimer;
  function toast(text) {
    var el = $("toast");
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, 1800);
  }

  // --- Telegram setup ------------------------------------------------------
  if (tg) {
    try {
      tg.ready();
      tg.expand();
      if (tg.colorScheme) document.documentElement.dataset.theme = tg.colorScheme;
      if (versionAtLeast("6.1")) tg.setHeaderColor("secondary_bg_color");
      tg.onEvent && tg.onEvent("themeChanged", function () {
        document.documentElement.dataset.theme = tg.colorScheme;
      });
    } catch (e) { /* running outside Telegram */ }
  }

  // --- static texts --------------------------------------------------------
  document.querySelectorAll("[data-t]").forEach(function (el) { el.textContent = L(el.dataset.t); });
  $("src").placeholder = L("Matnni shu yerga yozing yoki qoʻying (lotin yoki kirill)…");

  // --- tabs ----------------------------------------------------------------
  document.querySelectorAll(".tab").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".tab").forEach(function (b) { b.classList.toggle("active", b === btn); });
      document.querySelectorAll(".panel").forEach(function (p) {
        p.classList.toggle("active", p.id === "tab-" + btn.dataset.tab);
      });
      haptic("select");
      if (btn.dataset.tab === "quiz" && !quiz.started) startQuiz();
    });
  });

  // --- converter -----------------------------------------------------------
  var NAMES = { "new": L("Yangi lotin"), "old": L("Eski lotin"), "cyr": "Кирилл" };
  var target = store("harfix.target");
  if (!NAMES[target]) target = "new";
  var src = $("src"), out = $("out");
  var result = "";

  function render() {
    var text = src.value;
    result = text ? H.convertTo(text, target) : "";
    out.textContent = result || L("Natija shu yerda chiqadi");
    out.classList.toggle("empty", !result);
    $("count").textContent = text.length ? L(text.length + " ta belgi") : "";
    $("badge").textContent = !text ? NAMES[target] : (result === text ? L("✓ oʻzgarish yoʻq") : NAMES[target]);
    $("copy").disabled = !result;
  }

  function setTarget(t) {
    target = t;
    store("harfix.target", t);
    document.querySelectorAll("#targets button").forEach(function (b) {
      b.classList.toggle("on", b.dataset.target === t);
      b.setAttribute("aria-checked", b.dataset.target === t ? "true" : "false");
    });
    render();
  }

  document.querySelectorAll("#targets button").forEach(function (b) {
    b.addEventListener("click", function () { haptic("select"); setTarget(b.dataset.target); });
  });
  src.addEventListener("input", render);
  $("clear").addEventListener("click", function () { src.value = ""; render(); src.focus(); });

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy") ? resolve() : reject(); } catch (e) { reject(e); }
      document.body.removeChild(ta);
    });
  }

  $("copy").addEventListener("click", function () {
    if (!result) return;
    copyText(result).then(function () {
      haptic("success");
      toast(L("Nusxalandi ✓"));
    }, function () {
      haptic("error");
      toast(L("Nusxalab boʻlmadi — matnni belgilab nusxalang"));
    });
  });

  // Share into any chat through the bot's inline mode.
  if (inTelegram && versionAtLeast("6.7")) {
    $("share").hidden = false;
    $("share").addEventListener("click", function () {
      if (!result) { toast(L("Avval matn yozing")); return; }
      try {
        tg.switchInlineQuery(src.value.slice(0, 256), ["users", "groups", "channels"]);
      } catch (e) {
        toast(L("Chatda @bot nomi va matnni yozing"));
      }
    });
  }

  // Send the result back to the bot chat (only when opened from the
  // keyboard button — Telegram allows sendData only there).
  if (inTelegram && !(tg.initDataUnsafe && tg.initDataUnsafe.query_id)) {
    $("send").hidden = false;
    $("send").addEventListener("click", function () {
      if (!result) { toast(L("Avval matn yozing")); return; }
      try { tg.sendData(result.slice(0, 4000)); } catch (e) { toast(L("Yuborib boʻlmadi")); }
    });
  }
  if ($("share").hidden && $("send").hidden) $("copy").style.gridColumn = "1 / -1";

  setTarget(target);

  // --- learn ---------------------------------------------------------------
  var LETTERS = [
    { big: "Ö ö", from: "oʻ · ў", ex: "Oʻzbekiston" },
    { big: "Ğ ğ", from: "gʻ · ғ", ex: "togʻ" },
    { big: "Ş ş", from: "sh · ш", ex: "shahar" },
    { big: "Ç ç", from: "ch · ч", ex: "choʻl" }
  ];
  $("letters").innerHTML = "";
  LETTERS.forEach(function (l) {
    var d = document.createElement("div");
    d.className = "letter";
    d.innerHTML = '<div class="big"></div><div class="from"></div><div class="ex"></div>';
    d.querySelector(".big").textContent = l.big;
    d.querySelector(".from").textContent = l.from;
    d.querySelector(".ex").textContent = l.ex + " → " + H.convert(l.ex);
    $("letters").appendChild(d);
  });

  function ex(words) {
    return words.map(function (w) { return w + " → <b>" + H.convert(w) + "</b>"; }).join(", ");
  }
  var RULES = [
    [L("Katta harflar"), ex(["SHAHAR", "Shahar", "OʻZBEKISTON"])],
    [L("Tutuq belgisi (ʼ) saqlanadi"), ex(["maʼno", "sheʼr"])],
    [L("s va h alohida tovush boʻlsa, oraga tutuq qoʻyiladi"), ex(["Isʼhoq"])],
    [L("ng oʻzgarmaydi"), ex(["tong", "ming"])],
    [L("Kirilldan"), ex(["Тошкент", "Ўзбекистон"])]
  ];
  $("rules").innerHTML = RULES.map(function (r) { return "<li>" + r[0] + ": " + r[1] + "</li>"; }).join("");

  // --- quiz ----------------------------------------------------------------
  var WORDS = ["Oʻzbekiston", "Toshkent", "shahar", "choʻl", "togʻ", "bogʻ", "qoʻshiq", "oʻqituvchi",
    "gʻisht", "choy", "chiroyli", "shamol", "quyosh", "ishchi", "oʻyin", "sogʻliq", "yashil", "tushlik",
    "choʻntak", "qishloq", "oʻrik", "gʻoya", "ochiq", "kecha", "kuchli", "oʻtmish", "sharbat", "chaqmoq",
    "oʻgʻil", "qizgʻaldoq", "ogʻir", "choʻqqi", "shirin", "ishonch", "Fargʻona", "Shahrisabz", "Chirchiq",
    "Qoʻqon", "Margʻilon", "Urganch", "Toʻrtkoʻl", "Gʻijduvon", "goʻsht", "toʻgʻri", "chegara", "koʻcha"];
  var LOOK = { "ö": "üõô", "ğ": "ǧĝg", "ş": "šśs", "ç": "čćc", "Ö": "ÜÕÔ", "Ğ": "ǦĜG", "Ş": "ŠŚS", "Ç": "ČĆC" };
  var QUIZ_LEN = 10;
  var quiz = { started: false };

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function wrongs(word, right) {
    var c = {};
    c[word.replace(/ʻ/g, "'")] = 1;
    c[right.replace(/[öğşçÖĞŞÇ]/g, function (ch) { return "ogscOGSC"["öğşçÖĞŞÇ".indexOf(ch)]; })] = 1;
    for (var k = 0; k < 12; k++) {
      var chars = right.split("");
      var idx = [];
      chars.forEach(function (ch, i) { if (LOOK[ch]) idx.push(i); });
      if (!idx.length) break;
      shuffle(idx).slice(0, 1 + Math.floor(Math.random() * idx.length)).forEach(function (i) {
        var opts = LOOK[chars[i]];
        chars[i] = opts[Math.floor(Math.random() * opts.length)];
      });
      c[chars.join("")] = 1;
    }
    delete c[right];
    return shuffle(Object.keys(c)).slice(0, 3);
  }

  function makeQuiz() {
    var qs = [];
    shuffle(WORDS.slice()).forEach(function (w) {
      if (qs.length >= QUIZ_LEN) return;
      var right = H.convert(w);
      var bad = wrongs(w, right);
      if (bad.length < 3) return;
      var opts = shuffle([right].concat(bad));
      var text = qs.length % 2 ? L("«" + w + "» yangi alifboda qanday yoziladi?")
                               : L("Qaysi soʻz yangi alifboda toʻgʻri yozilgan?");
      if (qs.length % 2) text = text.replace("«" + H.convert(w) + "»", "«" + w + "»");
      qs.push({ text: text, opts: opts, right: opts.indexOf(right), expl: w + " → " + right });
    });
    return qs;
  }

  function startQuiz() {
    quiz = { started: true, qs: makeQuiz(), i: 0, score: 0 };
    showQuestion();
  }

  function showQuestion() {
    var q = quiz.qs[quiz.i];
    $("qnum").textContent = L("Savol " + (quiz.i + 1) + " / " + quiz.qs.length);
    $("qscore").textContent = "✓ " + quiz.score;
    $("qbar").style.width = (quiz.i / quiz.qs.length * 100) + "%";
    $("qtext").textContent = q.text;
    $("qexpl").textContent = "";
    $("qnext").hidden = true;
    $("qopts").innerHTML = "";
    q.opts.forEach(function (o, i) {
      var b = document.createElement("button");
      b.className = "opt";
      b.textContent = o;
      b.addEventListener("click", function () { answer(i); });
      $("qopts").appendChild(b);
    });
  }

  function answer(i) {
    var q = quiz.qs[quiz.i];
    var btns = $("qopts").querySelectorAll(".opt");
    btns.forEach(function (b, k) {
      b.disabled = true;
      if (k === q.right) b.classList.add("ok");
      else if (k === i) b.classList.add("bad");
    });
    if (i === q.right) { quiz.score++; haptic("success"); } else { haptic("error"); }
    $("qscore").textContent = "✓ " + quiz.score;
    $("qexpl").textContent = L("Toʻgʻri javob: ") + q.expl;
    $("qnext").textContent = quiz.i + 1 < quiz.qs.length ? L("Keyingi savol") : L("Natijani koʻrish");
    $("qnext").hidden = false;
  }

  $("qnext").addEventListener("click", function () {
    if (quiz.finished) { startQuiz(); return; }
    quiz.i++;
    if (quiz.i < quiz.qs.length) { showQuestion(); return; }
    quiz.finished = true;
    var k = quiz.score / quiz.qs.length;
    var best = Math.max(quiz.score, parseInt(store("harfix.best") || "0", 10) || 0);
    store("harfix.best", String(best));
    $("qbar").style.width = "100%";
    $("qnum").textContent = L("Test tugadi");
    $("qtext").innerHTML = '<div class="final">' + (k === 1 ? "🏆" : k >= 0.8 ? "🥇" : k >= 0.6 ? "🥈" : "📚") + "</div>";
    $("qopts").innerHTML = "";
    $("qexpl").textContent = L("Natija: " + quiz.score + " / " + quiz.qs.length + " · eng yaxshi: " + best);
    $("qnext").textContent = L("Qaytadan boshlash");
    haptic(k >= 0.8 ? "success" : "warning");
  });
})();
