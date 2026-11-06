// Runs the shared converter tests (core/tests/cases*.json) against harfix.js.
// Usage: node miniapp/tests/run.cjs
const fs = require("fs");
const path = require("path");
const Harfix = require("../harfix.js");

const dir = path.join(__dirname, "..", "..", "core", "tests");
const sets = { new: "cases.json", old: "cases_old.json", cyr: "cases_cyr.json" };
let total = 0, fails = 0;
for (const [target, file] of Object.entries(sets)) {
  const cases = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  for (const [src, exp] of cases) {
    total++;
    const got = Harfix.convertTo(src, target);
    if (got !== exp) {
      fails++;
      console.log(`FAIL [${target}] ${JSON.stringify(src)}: expected ${JSON.stringify(exp)}, got ${JSON.stringify(got)}`);
    }
  }
}
console.log(`${total - fails}/${total} passed`);
process.exit(fails ? 1 : 0);
