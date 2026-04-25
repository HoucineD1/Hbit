const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const cp = (...values) => String.fromCodePoint(...values);
const mojibakePatterns = [
  cp(0xe2, 0x20ac, 0x201d),
  cp(0xe2, 0x20ac, 0x201c),
  cp(0xe2, 0x2020, 0x2019),
  cp(0xe2, 0x2020, 0x2018),
  cp(0xe2, 0x20ac, 0xa2),
  cp(0xe2, 0x2022, 0x90),
  cp(0xe2, 0x201d, 0x20ac),
];

function walk(dir, matcher, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".git", "output"].includes(entry.name)) continue;
      walk(full, matcher, out);
    } else if (matcher(full)) {
      out.push(full);
    }
  }
  return out;
}

const failures = [];

const baseCss = fs.readFileSync(path.join(root, "css/core/base.css"), "utf8");
if (!/\[hidden\]\s*\{\s*display\s*:\s*none\s*!important\s*;\s*\}/.test(baseCss)) {
  failures.push("css/core/base.css must enforce [hidden] globally.");
}

const focusCss = fs.readFileSync(path.join(root, "css/pages/focus.css"), "utf8");
if (!/\.fc-panel:not\(\.is-active\)\s*\{\s*display\s*:\s*none\s*;/.test(focusCss)) {
  failures.push("css/pages/focus.css must remove inactive panels from layout.");
}

for (const file of walk(path.join(root, "js/pages"), (p) => p.endsWith(".js"))) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  const text = fs.readFileSync(file, "utf8");
  const hexes = text.match(/#[0-9a-fA-F]{3,8}\b/g);
  if (hexes) failures.push(`${rel} contains raw hex colors: ${[...new Set(hexes)].join(", ")}`);
}

for (const file of walk(root, (p) => /\.(html|css|js)$/.test(p))) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  const text = fs.readFileSync(file, "utf8");
  const bad = mojibakePatterns.filter((pattern) => text.includes(pattern));
  if (bad.length) failures.push(`${rel} contains mojibake patterns.`);
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Phase 1 static checks passed.");
