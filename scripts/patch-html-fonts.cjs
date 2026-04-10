const fs = require("fs");
const path = require("path");

const block = `  <meta name="color-scheme" content="dark light" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap" media="print" onload="this.media='all'" />
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap" /></noscript>
`;

const root = path.join(__dirname, "..");
const files = fs.readdirSync(root).filter((f) => f.endsWith(".html"));

for (const f of files) {
  const fp = path.join(root, f);
  let s = fs.readFileSync(fp, "utf8");
  if (s.includes('rel="preconnect"') && s.includes("fonts.googleapis.com/css2?family=DM+Sans")) {
    continue;
  }
  const needle = '<link rel="stylesheet" href="styles.css"';
  const i = s.indexOf(needle);
  if (i === -1) {
    console.warn("skip (no styles.css):", f);
    continue;
  }
  s = s.slice(0, i) + block + s.slice(i);
  fs.writeFileSync(fp, s);
  console.log("patched", f);
}
