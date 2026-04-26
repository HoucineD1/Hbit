const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const ALLOWED_PX = new Set([12, 14, 16, 20, 24, 32, 40, 56]);

const ALLOWED_TOKEN_NAMES = new Set([
  "fs-12", "fs-14", "fs-16", "fs-20", "fs-24", "fs-32", "fs-40", "fs-56",
  "font-size-xs", "font-size-sm", "font-size-base",
  "font-size-md", "font-size-lg", "font-size-xl",
  "font-size-2xl", "font-size-3xl",
  "font-xs", "font-sm", "font-md", "font-lg", "font-xl", "font-hero",
  "card-title-size", "card-subtitle-size",
]);

function walk(dir, matcher, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".git", "output", ".obsidian"].includes(entry.name)) continue;
      walk(full, matcher, out);
    } else if (matcher(full)) {
      out.push(full);
    }
  }
  return out;
}

const failures = [];
const tokensCss = fs.readFileSync(path.join(root, "css/core/tokens.css"), "utf8");
[
  "--fs-12", "--fs-14", "--fs-16", "--fs-20", "--fs-24", "--fs-32", "--fs-40", "--fs-56",
  "--motion-fast", "--motion-normal", "--motion-deliberate",
].forEach((token) => {
  if (!tokensCss.includes(token + ":")) failures.push(`css/core/tokens.css: missing ${token}`);
});

const baseCss = fs.readFileSync(path.join(root, "css/core/base.css"), "utf8");
const componentsCss = fs.readFileSync(path.join(root, "css/core/components.css"), "utf8");
const navCss = fs.readFileSync(path.join(root, "css/core/nav.css"), "utf8");
if (!baseCss.includes("font-optical-sizing: auto")) {
  failures.push("css/core/base.css: body must enable font-optical-sizing");
}
if (!baseCss.includes("font-variant-numeric: tabular-nums")) {
  failures.push("css/core/base.css: live number classes must use tabular-nums");
}
if (!componentsCss.includes("@media (prefers-reduced-motion: reduce)")) {
  failures.push("css/core/components.css: shared primitives must honor prefers-reduced-motion");
}
if (!navCss.includes(".hbit-bottom-tabs")) {
  failures.push("css/core/nav.css: mobile bottom tab bar is missing");
}

const targets = [
  ...walk(path.join(root, "css/pages"), (p) => p.endsWith(".css")),
  ...walk(path.join(root, "js/pages"),  (p) => p.endsWith(".js")),
];

const FS_RE = /font-size\s*:\s*([^;}\n]+)/gi;

for (const file of targets) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  const text = fs.readFileSync(file, "utf8");
  let m;
  while ((m = FS_RE.exec(text))) {
    const raw = m[1].trim().replace(/!important/i, "").trim();

    if (/^var\(\s*--([a-z0-9-]+)\s*(?:,\s*[^)]+)?\)$/i.test(raw)) {
      const name = raw.match(/^var\(\s*--([a-z0-9-]+)/i)[1];
      if (!ALLOWED_TOKEN_NAMES.has(name)) {
        failures.push(`${rel}: font-size uses non-scale token --${name}`);
      }
      continue;
    }

    if (/^(inherit|initial|unset|revert|smaller|larger|medium|small|x-small|xx-small|large|x-large|xx-large)$/i.test(raw)) continue;

    const px = raw.match(/^(\d+(?:\.\d+)?)px$/);
    if (px) {
      const n = Number(px[1]);
      if (!ALLOWED_PX.has(n)) {
        failures.push(`${rel}: off-scale font-size ${n}px`);
      }
      continue;
    }

    const rem = raw.match(/^(\d+(?:\.\d+)?)rem$/);
    if (rem) {
      const px2 = Number(rem[1]) * 16;
      if (!ALLOWED_PX.has(px2)) {
        failures.push(`${rel}: off-scale font-size ${rem[1]}rem (= ${px2}px)`);
      }
      continue;
    }

    const em = raw.match(/^(\d+(?:\.\d+)?)em$/);
    if (em) continue;

    if (/^calc\(/i.test(raw)) continue;
    if (/^clamp\(/i.test(raw)) continue;

    failures.push(`${rel}: unrecognized font-size value "${raw}"`);
  }
}

if (failures.length) {
  console.error(failures.map((f) => `- ${f}`).join("\n"));
  console.error(`\nPhase 3 static check failed: ${failures.length} off-scale font-size value(s).`);
  process.exit(1);
}

console.log("Phase 3 static checks passed.");
