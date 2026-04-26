/* One-shot sweep: rewrite raw px font-size values in css/pages/*.css
   to the locked Phase 3.1 scale (12, 14, 16, 20, 24, 32, 40, 56).
   Mapping rules:
     <= 11.5     -> 12
     12.5 - 15   -> 14
     15.5 - 17   -> 16
     17.5 - 22   -> 20
     22.5 - 27   -> 24
     27.5 - 36   -> 32
     36.5 - 47   -> 40
     >= 47.5     -> 56
*/
const fs = require("fs");
const path = require("path");

const SCALE = [
  { max: 11.5,  to: 12 },
  { max: 15,    to: 14 },
  { max: 17,    to: 16 },
  { max: 22,    to: 20 },
  { max: 27,    to: 24 },
  { max: 36,    to: 32 },
  { max: 47,    to: 40 },
  { max: 9999,  to: 56 },
];

function nearestScale(n) {
  for (const row of SCALE) if (n <= row.max) return row.to;
  return 56;
}

const pagesDir = path.resolve(__dirname, "..", "css", "pages");
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith(".css"));

let changed = 0;
let perFile = {};

for (const f of files) {
  const full = path.join(pagesDir, f);
  let text = fs.readFileSync(full, "utf8");
  const before = text;
  let count = 0;

  text = text.replace(/font-size\s*:\s*([^;}\n]+?)([;}\n])/gi, (whole, value, sep) => {
    const trimmed = value.trim();
    const importantMatch = trimmed.match(/^(.*?)(\s*!important\s*)$/i);
    const core = importantMatch ? importantMatch[1].trim() : trimmed;
    const tail = importantMatch ? importantMatch[2] : "";

    const px = core.match(/^(\d+(?:\.\d+)?)px$/);
    if (px) {
      const n = Number(px[1]);
      if ([12,14,16,20,24,32,40,56].includes(n)) return whole;
      const mapped = nearestScale(n);
      count++;
      return `font-size: ${mapped}px${tail}${sep}`;
    }
    const rem = core.match(/^(\d+(?:\.\d+)?)rem$/);
    if (rem) {
      const px2 = Number(rem[1]) * 16;
      if ([12,14,16,20,24,32,40,56].includes(px2)) return whole;
      const mapped = nearestScale(px2);
      count++;
      return `font-size: ${mapped}px${tail}${sep}`;
    }
    return whole;
  });

  if (text !== before) {
    fs.writeFileSync(full, text, "utf8");
    changed += count;
    perFile[f] = count;
  }
}

console.log(`Sweep done. ${changed} font-size values rewritten.`);
for (const [k, v] of Object.entries(perFile)) console.log(`  ${k}: ${v}`);
