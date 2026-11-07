// Tests for online.js (what the apps show from config.json) and config.json itself.
// Usage: node miniapp/tests/online.cjs
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const O = require("../online.js");

const root = path.join(__dirname, "..", "..");
let n = 0;
function test(name, fn) {
  try { fn(); n++; } catch (e) { console.log("FAIL " + name + ": " + e.message); process.exitCode = 1; }
}

const sponsor = { id: "s1", title: "Kitob do'koni", text: "Yangi alifbodagi kitoblar", url: "https://t.me/kitob",
  image: "https://example.uz/logo.png" };
const on = (extra) => ({ ads: Object.assign({ enabled: true, grace_days: 3, sponsors: [sponsor] }, extra || {}) });
const ctx = (extra) => Object.assign({ platform: "android", version: "1.1.0", today: "2027-03-01", installDays: 10,
  fresh: true, dismissed: [], random: 0 }, extra || {});

// Run this after editing config.json, before publishing it.
test("config.json is valid", () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(root, "miniapp", "config.json"), "utf8"));
  const ads = cfg.ads || {};
  assert.strictEqual(typeof ads.enabled, "boolean", "ads.enabled: true or false");
  assert.ok(Array.isArray(ads.sponsors), "ads.sponsors: a list");
  ads.sponsors.forEach((s, i) => {
    assert.ok(s.id && (s.title || s.text), `sponsor ${i + 1}: id and title/text`);
    assert.ok(O.safeUrl(s.url), `sponsor ${i + 1}: url must start with https://`);
    if (s.image) assert.ok(O.safeUrl(s.image), `sponsor ${i + 1}: image must start with https://`);
    for (const d of [s.from, s.until]) if (d) assert.match(d, /^\d{4}-\d\d-\d\d$/, `sponsor ${i + 1}: dates as 2027-01-31`);
  });
  const net = ((ads.network || {}).android) || {};
  if (net.enabled) assert.ok(net.banner_id, "network.android.banner_id is needed");
  for (const [p, l] of Object.entries(cfg.latest || {})) {
    if (l.url) assert.ok(O.safeUrl(l.url) && /^\d+(\.\d+)*$/.test(l.version), `latest.${p}: version and https url`);
  }
  for (const p of ["android", "windows", "miniapp"]) O.plan(cfg, ctx({ platform: p })); // must not throw
});

test("ads are off right now (version 1.1)", () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(root, "miniapp", "config.json"), "utf8"));
  if (cfg.ads.enabled) { console.log("note: ads are ON in config.json"); return; }
  for (const p of ["android", "windows", "miniapp"]) {
    const plan = O.plan(cfg, ctx({ platform: p }));
    assert.deepStrictEqual([plan.sponsor, plan.banner], [null, null]);
  }
});

test("no config (offline) shows nothing", () => {
  for (const c of [null, undefined, {}, "x", [], { ads: "yes" }]) {
    const p = O.plan(c, ctx());
    assert.deepStrictEqual([p.sponsor, p.banner, p.notice, p.update], [null, null, null, null]);
    assert.strictEqual(p.stats, true);
  }
});

test("ads only when switched on, loaded online and after the first days", () => {
  assert.strictEqual(O.plan(on(), ctx()).sponsor.title, "Kitob do'koni");
  assert.strictEqual(O.plan(on(), ctx({ fresh: false })).sponsor, null); // cached config, no internet
  assert.strictEqual(O.plan(on(), ctx({ installDays: 2 })).sponsor, null);
  assert.strictEqual(O.plan(on({ grace_days: 0 }), ctx({ installDays: 0 })).sponsor.id, "s1");
  assert.strictEqual(O.plan({ ads: { enabled: "true", sponsors: [sponsor] } }, ctx()).sponsor, null); // must be true
});

test("platforms, dates and unsafe links", () => {
  const s = (extra) => on({ sponsors: [Object.assign({}, sponsor, extra)] });
  assert.strictEqual(O.plan(s({ platforms: ["windows"] }), ctx()).sponsor, null);
  assert.ok(O.plan(s({ platforms: ["windows", "android"] }), ctx()).sponsor);
  assert.strictEqual(O.plan(s({ from: "2027-03-02" }), ctx()).sponsor, null);
  assert.strictEqual(O.plan(s({ until: "2027-02-28" }), ctx()).sponsor, null);
  assert.ok(O.plan(s({ from: "2027-03-01", until: "2027-03-01" }), ctx()).sponsor);
  for (const url of ["http://t.me/x", "javascript:alert(1)", "https://a.uz/\"><script>", "", 5]) {
    assert.strictEqual(O.plan(s({ url }), ctx()).sponsor, null, String(url));
  }
  assert.strictEqual(O.plan(s({ image: "http://a.uz/x.png" }), ctx()).sponsor.image, ""); // card without the picture
  assert.strictEqual(O.plan(s({ title: "", text: "" }), ctx()).sponsor, null);
});

test("weights pick the sponsor", () => {
  const a = Object.assign({}, sponsor, { id: "a", weight: 3 }), b = Object.assign({}, sponsor, { id: "b", weight: 1 });
  const c = on({ sponsors: [a, b] });
  assert.strictEqual(O.plan(c, ctx({ random: 0 })).sponsor.id, "a");
  assert.strictEqual(O.plan(c, ctx({ random: 0.74 })).sponsor.id, "a");
  assert.strictEqual(O.plan(c, ctx({ random: 0.76 })).sponsor.id, "b");
  assert.strictEqual(O.plan(on({ sponsors: [Object.assign({}, a, { weight: 0 })] }), ctx()).sponsor, null);
});

test("ad network banner only where it is set up", () => {
  const c = on({ network: { android: { enabled: true, provider: "yandex", banner_id: "R-M-1-2" } } });
  assert.deepStrictEqual(O.plan(c, ctx()).banner, { provider: "yandex", id: "R-M-1-2" });
  assert.strictEqual(O.plan(c, ctx({ platform: "windows" })).banner, null);
  assert.strictEqual(O.plan(c, ctx({ fresh: false })).banner, null);
  const off = on({ network: { android: { enabled: false, banner_id: "R-M-1-2" } } });
  assert.strictEqual(O.plan(off, ctx()).banner, null);
});

test("new version note", () => {
  const c = { latest: { android: { version: "1.2.0", url: "https://t.me/harfix_bot" } } };
  assert.strictEqual(O.plan(c, ctx()).update.version, "1.2.0");
  assert.strictEqual(O.plan(c, ctx({ version: "1.2.0" })).update, null);
  assert.strictEqual(O.plan(c, ctx({ version: "1.10.0" })).update, null);
  assert.strictEqual(O.plan(c, ctx({ dismissed: ["update:1.2.0"] })).update, null);
  assert.strictEqual(O.plan(c, ctx({ platform: "windows" })).update, null);
  assert.ok(O.plan(c, ctx({ fresh: false })).update); // shown from the saved config too
  assert.ok(O.versionNewer("1.0.10", "1.0.9"));
  assert.ok(!O.versionNewer("1.0", "1.0.0"));
});

test("announcement", () => {
  const c = { notice: { id: "n1", text: "Yangi imkoniyat!", url: "https://t.me/x", until: "2027-03-05" } };
  assert.strictEqual(O.plan(c, ctx()).notice.id, "notice:n1");
  assert.strictEqual(O.plan(c, ctx({ dismissed: ["notice:n1"] })).notice, null);
  assert.strictEqual(O.plan(c, ctx({ today: "2027-03-06" })).notice, null);
  assert.strictEqual(O.plan({ notice: { id: "n2", text: "Faqat matn" } }, ctx()).notice.url, "");
});

test("paused sponsors and announcements stay hidden (admin panel)", () => {
  assert.strictEqual(O.plan(on({ sponsors: [Object.assign({}, sponsor, { enabled: false })] }), ctx()).sponsor, null);
  assert.ok(O.plan(on({ sponsors: [Object.assign({}, sponsor, { enabled: true })] }), ctx()).sponsor);
  const n = { id: "n1", text: "Salom", enabled: false };
  assert.strictEqual(O.plan({ notice: n }, ctx()).notice, null);
  assert.ok(O.plan({ notice: Object.assign({}, n, { enabled: true }) }, ctx()).notice);
});

test("statistics switch and address", () => {
  assert.strictEqual(O.plan({ stats: { enabled: false } }, ctx()).stats, false);
  assert.deepStrictEqual(O.statsTarget({}), O.STATS);
  assert.deepStrictEqual(O.statsTarget({ stats: { url: "https://new.example/ping", key: "k" } }),
    { url: "https://new.example/ping", key: "k" });
  assert.deepStrictEqual(O.statsTarget({ stats: { url: "http://insecure/ping", key: "k" } }), O.STATS);
});

test("helpers", () => {
  assert.strictEqual(O.today(new Date(2027, 0, 5)), "2027-01-05");
  global.crypto = global.crypto || require("crypto").webcrypto;
});

test("same online.js in every app", () => {
  const mini = fs.readFileSync(path.join(root, "miniapp", "online.js"));
  for (const copy of ["android/app/src/main/assets/ui/online.js", "desktop/harfix_desktop/ui/online.js"]) {
    assert.ok(fs.readFileSync(path.join(root, copy)).equals(mini), "copy miniapp/online.js to " + copy);
  }
});

console.log(n + " online tests passed" + (process.exitCode ? " (some FAILED)" : ""));
