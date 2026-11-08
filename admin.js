/*
 * Harfix admin panel (Mini App, "⚙️ Admin" tab): ads on/off, own sponsor
 * ads, the Yandex banner for Android, an announcement, the "new version"
 * note, the statistics switch and the numbers.
 *
 * Opens only with a session the bot gives to admins (/admin → 📱 Ilovalar →
 * "Boshqaruv paneli"); app.js loads this file only then. Saved settings go to
 * Supabase (harfix_admin_save); the apps read them (harfix_config).
 */
(function () {
  "use strict";

  var RPC = "https://lucopmrphagzxticypmq.supabase.co/rest/v1/rpc/";
  var PLATFORMS = [["android", "Android"], ["windows", "Windows"], ["miniapp", "Mini App"], ["web", "Sayt"]];
  var O = window.HarfixOnline;
  var env, L, root, saveBar, saveBtn, saveNote;
  var version = 0, cfg = null, stats = null, expires = "", dirty = false, saving = false;
  var editing = null; // sponsor being edited: { index (-1: new), s }

  // --- small helpers -------------------------------------------------------------------
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === "text") e.textContent = v;
      else if (k === "cls") e.className = v;
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    });
    (kids || []).forEach(function (c) {
      if (c) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return e;
  }
  function copy(x) { return JSON.parse(JSON.stringify(x)); }
  function obj(x) { return x && typeof x === "object" && !Array.isArray(x) ? x : {}; }

  function rpc(name, body) {
    return fetch(RPC + name, {
      method: "POST", headers: { apikey: O.STATS.key, "Content-Type": "application/json" }, body: JSON.stringify(body)
    }).then(function (r) {
      return r.text().then(function (t) {
        var j = null;
        try { j = t ? JSON.parse(t) : null; } catch (e) { /* not JSON */ }
        if (!r.ok) {
          var err = new Error((j && j.message) || "HTTP " + r.status);
          err.status = r.status;
          throw err;
        }
        return j;
      });
    });
  }

  function ask(text, yes) {
    var tg = env.tg;
    if (tg && tg.showConfirm && tg.isVersionAtLeast && tg.isVersionAtLeast("6.2")) {
      tg.showConfirm(text, function (ok) { if (ok) yes(); });
    } else if (window.confirm(text)) {
      yes();
    }
  }

  /** "@kanal", "t.me/kanal", "sayt.uz" → https links. */
  function normUrl(u) {
    u = String(u || "").trim();
    if (!u) return "";
    if (/^@\w{4,}$/.test(u)) return "https://t.me/" + u.slice(1);
    if (/^http:\/\//i.test(u)) return "https://" + u.slice(7);
    if (!/^https:\/\//i.test(u) && /^[\w-]+(\.[\w-]+)+(\/|$)/.test(u)) return "https://" + u;
    return u;
  }

  function changed() {
    dirty = true;
    paintSaveBar();
    if (env.tg && env.tg.enableClosingConfirmation) {
      try { env.tg.enableClosingConfirmation(); } catch (e) { /* old Telegram */ }
    }
  }

  // --- form pieces ------------------------------------------------------------------------
  function input(value, onChange, opts) {
    opts = opts || {};
    var i = el(opts.multiline ? "textarea" : "input", {
      cls: "adm-input", type: opts.multiline ? null : opts.type || "text", placeholder: opts.placeholder || null,
      maxlength: opts.max || null, min: opts.min, max: opts.maxValue, rows: opts.multiline ? 3 : null,
      inputmode: opts.inputmode || null, autocomplete: "off", spellcheck: "false"
    });
    i.value = value == null ? "" : String(value);
    i.addEventListener("input", function () {
      onChange(opts.type === "number" ? (i.value === "" ? null : Number(i.value)) : i.value);
      if (!opts.draft) changed();
    });
    if (opts.url) {
      i.addEventListener("blur", function () {
        var n = normUrl(i.value);
        if (n !== i.value) { i.value = n; onChange(n); if (!opts.draft) changed(); }
      });
    }
    return i;
  }
  function field(label, control, hint) {
    return el("label", { cls: "adm-field" }, [
      el("span", { cls: "adm-label", text: L(label) }), control, hint ? el("span", { cls: "hint", text: L(hint) }) : null
    ]);
  }
  function toggle(label, on, onChange, hint) {
    var box = el("input", { type: "checkbox" });
    box.checked = !!on;
    box.addEventListener("change", function () { onChange(box.checked); changed(); });
    return el("label", { cls: "set adm-set" }, [
      el("div", {}, [el("b", { text: L(label) }), hint ? el("p", { cls: "hint", text: L(hint) }) : null]),
      el("span", { cls: "switch" }, [box, el("span")])
    ]);
  }
  /** Platform chips; an empty / missing list means "all". */
  function platforms(list, onChange, draft) {
    var chosen = Array.isArray(list) && list.length ? list.slice() : PLATFORMS.map(function (p) { return p[0]; });
    return el("div", { cls: "adm-chips" }, PLATFORMS.map(function (p) {
      var box = el("input", { type: "checkbox" });
      box.checked = chosen.indexOf(p[0]) >= 0;
      box.addEventListener("change", function () {
        chosen = chosen.filter(function (x) { return x !== p[0]; });
        if (box.checked) chosen.push(p[0]);
        onChange(chosen.length === PLATFORMS.length ? null : chosen.slice());
        if (!draft) changed();
      });
      return el("label", { cls: "adm-chip" }, [box, el("span", { text: p[1] })]);
    }));
  }
  function card(title, kids, hint) {
    return el("div", { cls: "card adm-card" }, [el("h2", { text: L(title) }), hint ? el("p", { cls: "hint", text: L(hint) }) : null]
      .concat(kids));
  }

  // --- settings with all the parts the panel edits ---------------------------------------------
  function normalize(c) {
    c = copy(obj(c));
    c.schema = c.schema || 1;
    c.ads = obj(c.ads);
    if (typeof c.ads.enabled !== "boolean") c.ads.enabled = false;
    if (typeof c.ads.grace_days !== "number") c.ads.grace_days = O.GRACE_DAYS;
    if (!Array.isArray(c.ads.sponsors)) c.ads.sponsors = [];
    c.ads.network = obj(c.ads.network);
    c.ads.network.android = obj(c.ads.network.android);
    var net = c.ads.network.android;
    if (typeof net.enabled !== "boolean") net.enabled = false;
    net.provider = net.provider || "yandex";
    net.banner_id = net.banner_id || "";
    c.stats = obj(c.stats);
    if (typeof c.stats.enabled !== "boolean") c.stats.enabled = true;
    if (c.notice && typeof c.notice === "object") {
      if (typeof c.notice.enabled !== "boolean") c.notice.enabled = true;
    } else {
      c.notice = { id: "", enabled: false, text: "" };
    }
    c.latest = obj(c.latest);
    c.latest.android = obj(c.latest.android);
    c.latest.windows = obj(c.latest.windows);
    return c;
  }

  // --- statistics -------------------------------------------------------------------------------
  function statsCard() {
    var p = obj(obj(stats).platforms);
    var head = el("tr", {}, ["", L("Oʻrnatilgan"), L("Bugun"), L("7 kun"), L("30 kun")].map(function (h) { return el("th", { text: h }); }));
    var rows = PLATFORMS.map(function (pl) {
      var s = obj(p[pl[0]]);
      return el("tr", {}, [el("td", { text: pl[1] })].concat([s.installs, s.d1, s.d7, s.d30].map(function (n) {
        return el("td", { text: String(n || 0) });
      })));
    });
    var total = PLATFORMS.reduce(function (a, pl) { return a + (obj(p[pl[0]]).d30 || 0); }, 0);
    return card("📊 Auditoriya", [
      el("table", { cls: "adm-table" }, [el("thead", {}, [head]), el("tbody", {}, rows)]),
      el("p", { cls: "hint", text: L("30 kunda jami faol: " + total + ". Bot foydalanuvchilari botdagi /admin da.") })
    ], "Faol — shu kunlarda ilovani ishlatganlar (anonim, har oʻrnatish bir marta).");
  }

  // --- ads ----------------------------------------------------------------------------------------
  function adsCard() {
    var ads = cfg.ads;
    return card("📺 Reklama", [
      toggle("Reklama yoqilgan", ads.enabled, function (v) { ads.enabled = v; paintWarnings(); },
        "Yoqilsa, faol homiylar (va Androidʼda Yandex banneri) chiqadi. Internet boʻlmasa hech qachon chiqmaydi."),
      field("Yangi foydalanuvchiga necha kun koʻrsatilmasin", input(ads.grace_days, function (v) {
        ads.grace_days = v == null || isNaN(v) ? O.GRACE_DAYS : Math.max(0, Math.min(60, Math.round(v)));
      }, { type: "number", min: "0", maxValue: "60", inputmode: "numeric" }))
    ]);
  }

  function sponsorStatus(s) {
    var d = O.today();
    if (s.enabled === false) return [L("toʻxtatilgan"), "off"];
    if (s.until && d > s.until) return [L("muddati tugagan"), "off"];
    if (s.from && d < s.from) return [L(s.from + " dan"), "wait"];
    return [L("faol"), "on"];
  }

  function sponsorsCard() {
    var list = cfg.ads.sponsors;
    var kids = [];
    if (editing) kids.push(sponsorEditor());
    if (!list.length && !editing) kids.push(el("p", { cls: "hint", text: L("Hali homiy yoʻq.") }));
    list.forEach(function (s, i) {
      if (editing && editing.index === i) return;
      var st = sponsorStatus(s);
      var where = Array.isArray(s.platforms) && s.platforms.length
        ? s.platforms.map(function (p) { return (PLATFORMS.filter(function (x) { return x[0] === p; })[0] || [p, p])[1]; }).join(", ")
        : L("hamma ilovalar");
      var dates = (s.from || s.until) ? " · " + (s.from || "…") + " — " + (s.until || "…") : "";
      kids.push(el("div", { cls: "adm-item" }, [
        el("div", { cls: "adm-item-main" }, [
          el("div", { cls: "row" }, [el("b", { text: s.title || s.text || "—" }), el("span", { cls: "adm-pill " + st[1], text: st[0] })]),
          s.title && s.text ? el("div", { cls: "adm-desc", text: s.text }) : null,
          el("div", { cls: "hint", text: where + dates + " · " + (s.url || "") })
        ]),
        el("div", { cls: "adm-item-acts" }, [
          el("button", { cls: "link", text: L("Tahrirlash"), onclick: function () { editing = { index: i, s: copy(s) }; paint(); } }),
          el("button", { cls: "link", text: s.enabled === false ? L("Yoqish") : L("Toʻxtatish"), onclick: function () {
            s.enabled = s.enabled === false;
            changed();
            paint();
          } }),
          el("button", { cls: "link danger", text: L("Oʻchirish"), onclick: function () {
            ask(L("«" + (s.title || s.text) + "» homiysini oʻchiraymi?"), function () {
              list.splice(i, 1);
              changed();
              paint();
            });
          } })
        ])
      ]));
    });
    if (!editing) {
      kids.push(el("button", { cls: "btn adm-wide", text: L("＋ Homiy qoʻshish"), onclick: function () {
        editing = { index: -1, s: { id: "", title: "", text: "", url: "", button: "", image: "" } };
        paint();
      } }));
    }
    return card("🤝 Oʻz reklamangiz (homiylar)", kids,
      "Oʻgirish sahifasining pastida «Reklama» belgisi bilan chiqadi. Bir nechta boʻlsa, har ochilganda bittasi.");
  }

  function sponsorEditor() {
    var s = editing.s;
    var preview = el("div", { cls: "online-ad adm-preview" });
    var error = el("p", { cls: "warn", hidden: true });
    function show() {
      O.render({ sponsor: { id: "p", title: s.title || "", text: s.text || "", button: s.button || "",
        url: "https://t.me", image: O.safeUrl(normUrl(s.image)) } }, { ad: preview, L: L, open: function () {}, dismiss: function () {} });
      if (!s.title && !s.text) preview.hidden = true;
    }
    function bind(key, opts) {
      opts = opts || {};
      opts.draft = true;
      return input(s[key], function (v) { s[key] = v; show(); }, opts);
    }
    function done() {
      var out = copy(s);
      out.url = normUrl(out.url);
      out.image = normUrl(out.image);
      var bad = !out.title && !out.text ? "Nomi yoki matnini yozing."
        : !O.safeUrl(out.url) ? "Havola https:// bilan boshlansin (masalan https://t.me/kanal yoki @kanal)."
        : out.image && !O.safeUrl(out.image) ? "Rasm havolasi https:// bilan boshlansin."
        : out.from && out.until && out.from > out.until ? "Tugash sanasi boshlanishidan oldin boʻlmasin."
        : "";
      if (bad) { error.textContent = L(bad); error.hidden = false; return; }
      ["image", "button", "from", "until", "title", "text"].forEach(function (k) { if (!out[k]) delete out[k]; });
      if (typeof out.weight !== "number" || isNaN(out.weight) || out.weight < 0) delete out.weight;
      if (!out.platforms) delete out.platforms;
      if (!out.id) out.id = "s" + Date.now().toString(36);
      if (out.enabled !== false) delete out.enabled;
      if (editing.index >= 0) cfg.ads.sponsors[editing.index] = out; else cfg.ads.sponsors.push(out);
      editing = null;
      changed();
      paint();
    }
    var box = el("div", { cls: "adm-editor" }, [
      el("b", { text: L(editing.index >= 0 ? "Homiyni tahrirlash" : "Yangi homiy") }),
      field("Nomi", bind("title", { max: 80, placeholder: L("Masalan: Kitob uyi") })),
      field("Matn", bind("text", { multiline: true, max: 300, placeholder: L("Qisqa taklif, 1–2 gap") })),
      field("Havola", bind("url", { url: true, max: 500, placeholder: "https://t.me/kanal  ·  @kanal" }),
        "Bosilganda shu ochiladi: Telegram kanal, sayt, bot."),
      field("Tugma matni", bind("button", { max: 30, placeholder: L("Batafsil") })),
      field("Rasm (ixtiyoriy)", bind("image", { url: true, max: 500, placeholder: "https://…/logo.png" }),
        "Kvadrat logotip havolasi (https). Boʻlmasa, karta rasmsiz chiqadi."),
      field("Qaysi ilovalarda", platforms(s.platforms, function (v) { s.platforms = v; }, true)),
      el("div", { cls: "adm-two" }, [
        field("Boshlanish", bind("from", { type: "date" })),
        field("Tugash", bind("until", { type: "date" }))
      ]),
      field("Ulush", bind("weight", { type: "number", min: "0", maxValue: "100", inputmode: "numeric", placeholder: "1" }),
        "Bir nechta homiy boʻlsa: 2 — ikki barobar koʻp chiqadi."),
      el("span", { cls: "adm-label", text: L("Koʻrinishi") }),
      preview,
      error,
      el("div", { cls: "adm-two" }, [
        el("button", { cls: "btn", text: L("Bekor qilish"), onclick: function () { editing = null; paint(); } }),
        el("button", { cls: "btn primary", text: L("Tayyor"), onclick: done })
      ])
    ]);
    show();
    return box;
  }

  function networkCard() {
    var net = cfg.ads.network.android;
    return card("🌐 Yandex reklamasi (Android)", [
      toggle("Yandex bannerini koʻrsatish", net.enabled, function (v) { net.enabled = v; paintWarnings(); },
        "Android ilova oynasining eng pastida. «Reklama yoqilgan» ham yoniq boʻlishi kerak."),
      field("Banner blok ID", input(net.banner_id, function (v) { net.banner_id = String(v || "").trim(); paintWarnings(); },
        { max: 100, placeholder: "R-M-1234567-1" }),
        "Yandex reklama tarmogʻida (Yandex Ads) Harfix ilovasi uchun «banner» blok ochib, ID sini yozing. Sinash uchun: demo-banner-yandex")
    ]);
  }

  // --- announcement, new version, statistics ----------------------------------------------------
  function noticeCard() {
    var n = cfg.notice;
    function fresh() { n.id = "n" + Date.now().toString(36); } // a new text is shown again to those who closed the old one
    return card("📢 Eʼlon", [
      toggle("Eʼlonni koʻrsatish", n.enabled, function (v) { n.enabled = v; if (v && !n.id) fresh(); }),
      field("Matn", input(n.text, function (v) { n.text = v; fresh(); }, { multiline: true, max: 300 })),
      field("Havola (ixtiyoriy)", input(n.url, function (v) { n.url = v; fresh(); }, { url: true, max: 500, placeholder: "https://t.me/…" })),
      field("Tugma matni", input(n.button, function (v) { n.button = v; }, { max: 30, placeholder: L("Ochish") })),
      field("Qaysi ilovalarda", platforms(n.platforms, function (v) { n.platforms = v; })),
      field("Qachongacha (ixtiyoriy)", input(n.until, function (v) { n.until = v; }, { type: "date" }))
    ], "Ilovalarning tepasida chiqadi. Foydalanuvchi yopsa, shu eʼlon unga qayta chiqmaydi.");
  }

  function latestCard() {
    function part(key, name) {
      var l = cfg.latest[key];
      return el("div", { cls: "adm-two" }, [
        field(name + ": " + L("versiya"), input(l.version, function (v) { l.version = String(v || "").trim(); },
          { max: 20, placeholder: "1.2.0", inputmode: "decimal" })),
        field(L("Yuklab olish havolasi"), input(l.url, function (v) { l.url = v; }, { url: true, max: 500, placeholder: "https://t.me/…" }))
      ]);
    }
    return card("⬆️ Yangi versiya", [part("android", "Android"), part("windows", "Windows")],
      "Foydalanuvchidagi versiya bundan eski boʻlsa, «Yangi versiya — Yuklab olish» chiqadi. Havola boʻsh boʻlsa chiqmaydi.");
  }

  function statsSwitchCard() {
    return card("📈 Anonim statistika", [
      toggle("Statistika yigʻish", cfg.stats.enabled, function (v) { cfg.stats.enabled = v; },
        "Oʻchirilsa, ilovalar kunlik anonim belgini yubormaydi va yuqoridagi raqamlar oʻsmaydi.")
    ]);
  }

  // --- checks before saving --------------------------------------------------------------------
  function problems() {
    var errs = [], warns = [];
    var net = cfg.ads.network.android, n = cfg.notice;
    if (net.enabled && !net.banner_id) errs.push("Yandex banner blok ID sini yozing yoki bannerni oʻchiring.");
    if (n.enabled && !String(n.text || "").trim()) errs.push("Eʼlon matnini yozing yoki eʼlonni oʻchiring.");
    if (n.url && !O.safeUrl(normUrl(n.url))) errs.push("Eʼlon havolasi https:// bilan boshlansin.");
    ["android", "windows"].forEach(function (k) {
      var l = cfg.latest[k];
      if (l.url && !O.safeUrl(normUrl(l.url))) errs.push(k + ": yuklab olish havolasi https:// bilan boshlansin.");
      if (l.url && !/^\d+(\.\d+){0,3}$/.test(l.version || "")) errs.push(k + ": versiyani 1.2.0 koʻrinishida yozing.");
    });
    if (editing) errs.push("Homiy tahririni «Tayyor» yoki «Bekor qilish» bilan yakunlang.");
    var active = cfg.ads.sponsors.filter(function (s) { return sponsorStatus(s)[1] === "on"; }).length;
    if (cfg.ads.enabled && !active && !(net.enabled && net.banner_id)) {
      warns.push("Reklama yoqilgan, lekin faol homiy ham, Yandex banneri ham yoʻq: hech narsa chiqmaydi.");
    }
    if (!cfg.ads.enabled && (active || net.enabled)) warns.push("Homiy/banner tayyor, lekin «Reklama yoqilgan» oʻchiq.");
    return { errs: errs, warns: warns };
  }

  function clean(c) {
    var out = copy(c);
    var n = out.notice;
    if (n) {
      n.text = String(n.text || "").trim();
      n.url = normUrl(n.url);
      ["url", "button", "until"].forEach(function (k) { if (!n[k]) delete n[k]; });
      if (!n.platforms) delete n.platforms;
      if (!n.enabled && !n.text) out.notice = null;
    }
    ["android", "windows"].forEach(function (k) { out.latest[k].url = normUrl(out.latest[k].url); });
    return out;
  }

  // --- saving ------------------------------------------------------------------------------------
  var warnBox;
  function paintWarnings() {
    if (!warnBox) return;
    var p = problems();
    warnBox.textContent = "";
    p.errs.concat(p.warns).forEach(function (t, i) {
      warnBox.appendChild(el("p", { cls: i < p.errs.length ? "warn" : "hint", text: (i < p.errs.length ? "⚠️ " : "ℹ️ ") + L(t) }));
    });
    warnBox.hidden = !warnBox.childNodes.length;
  }
  function paintSaveBar() {
    if (!saveBar) return;
    saveBtn.disabled = !dirty || saving;
    saveBtn.textContent = saving ? L("Saqlanmoqda…") : L("Saqlash");
    saveNote.textContent = dirty ? L("Saqlanmagan oʻzgarishlar bor") : L("Hammasi saqlangan");
    saveBar.classList.toggle("dirty", dirty);
    paintWarnings();
  }
  function save() {
    var p = problems();
    if (p.errs.length) { paintWarnings(); env.toast(L(p.errs[0])); return; }
    saving = true;
    paintSaveBar();
    var data = clean(cfg);
    rpc("harfix_admin_save", { p_token: env.token, p_config: data, p_version: version }).then(function (r) {
      version = r.version;
      cfg = normalize(data);
      dirty = false;
      saving = false;
      if (env.tg && env.tg.disableClosingConfirmation) { try { env.tg.disableClosingConfirmation(); } catch (e) { /* old */ } }
      paint();
      env.toast(L("Saqlandi ✓ Ilovalar ochilganda yangi sozlama oladi."));
    }, function (e) {
      saving = false;
      paintSaveBar();
      if (e.status === 409) env.toast(L("Sozlamalar boshqa joyda oʻzgargan. «Yangilash»ni bosing, keyin qayta kiriting."));
      else if (e.status === 401 || e.status === 403) ended();
      else env.toast(L("Saqlab boʻlmadi: internetni tekshiring."));
    });
  }

  // --- the panel ------------------------------------------------------------------------------------
  function header() {
    var until = expires ? new Date(expires) : null;
    var time = until ? ("0" + until.getHours()).slice(-2) + ":" + ("0" + until.getMinutes()).slice(-2) : "";
    return el("div", { cls: "card adm-card" }, [
      el("div", { cls: "row" }, [
        el("h2", { text: L("⚙️ Boshqaruv paneli") }),
        el("div", {}, [
          el("button", { cls: "link", text: L("🔄 Yangilash"), onclick: function () {
            if (dirty) ask(L("Saqlanmagan oʻzgarishlar yoʻqoladi. Davom etaymi?"), load); else load();
          } }),
          el("button", { cls: "link", text: L("Chiqish"), onclick: logout })
        ])
      ]),
      el("p", { cls: "hint", text: L("Faqat siz koʻrasiz. Sessiya " + time + " gacha; keyin botda /admin → 📱 Ilovalar orqali qayta oching.") })
    ]);
  }

  function paint() {
    root.textContent = "";
    if (!cfg) return;
    warnBox = el("div", { cls: "adm-warn", hidden: true });
    saveNote = el("span", { cls: "hint" });
    saveBtn = el("button", { cls: "btn primary", onclick: save });
    saveBar = el("div", { cls: "adm-save" }, [saveNote, saveBtn]);
    [header(), statsCard(), adsCard(), sponsorsCard(), networkCard(), noticeCard(), latestCard(), statsSwitchCard(), warnBox, saveBar]
      .forEach(function (x) { root.appendChild(x); });
    paintSaveBar();
  }

  function message(text, kids) {
    root.textContent = "";
    root.appendChild(el("div", { cls: "card adm-card" }, [el("p", { text: L(text) })].concat(kids || [])));
  }

  function load() {
    message("Yuklanmoqda…");
    rpc("harfix_admin_get", { p_token: env.token }).then(function (d) {
      version = d.version;
      cfg = normalize(d.config);
      stats = d.stats;
      expires = d.expires_at || "";
      dirty = false;
      editing = null;
      paint();
    }, function (e) {
      if (e.status === 401 || e.status === 403) ended();
      else message("Internetga ulanib boʻlmadi.", [el("button", { cls: "btn", text: L("Qayta urinish"), onclick: load })]);
    });
  }

  function ended() {
    env.store("harfix.admin", "");
    message("Sessiya tugagan. Botda /admin → 📱 Ilovalar → «Boshqaruv paneli» tugmasini qayta bosing.");
  }

  function logout() {
    rpc("harfix_admin_logout", { p_token: env.token }).catch(function () { /* expires anyway */ });
    env.store("harfix.admin", "");
    var tab = document.querySelector('.tab[data-tab="admin"]');
    tab.hidden = true;
    root.textContent = "";
    var first = document.querySelector('.tab[data-tab="convert"]');
    if (first) first.click();
  }

  window.HarfixAdmin = {
    /** env: { token, L, toast, tg, store, opened (came from the bot's button) } */
    start: function (e) {
      env = e;
      L = e.L;
      root = document.getElementById("tab-admin");
      var tab = document.querySelector('.tab[data-tab="admin"]');
      tab.hidden = false;
      tab.textContent = "Admin";
      load();
      if (e.opened) tab.click();
    },
    // for tests
    _normalize: function (c) { return normalize(c); },
    _normUrl: normUrl
  };
})();
