const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const outputDir = path.join(__dirname, "..", "output", "pdf");
fs.mkdirSync(outputDir, { recursive: true });

const outputPath = path.join(outputDir, "hbit-app-summary-one-page.pdf");

const doc = new PDFDocument({
  size: "LETTER",
  margins: { top: 34, bottom: 34, left: 38, right: 38 },
  info: {
    Title: "Hbit App Summary",
    Author: "Codex",
    Subject: "One-page repo-based app summary",
    CreationDate: new Date()
  }
});

doc.pipe(fs.createWriteStream(outputPath));

const C = {
  ink: "#0F172A",
  muted: "#475569",
  soft: "#E2E8F0",
  brand: "#E11D48",
  brandSoft: "#FFF1F2",
  accent: "#0F766E",
  white: "#FFFFFF"
};

const page = {
  width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
  left: doc.page.margins.left,
  right: doc.page.width - doc.page.margins.right
};

function rule(y, color = C.soft) {
  doc.save();
  doc.moveTo(page.left, y).lineTo(page.right, y).lineWidth(1).strokeColor(color).stroke();
  doc.restore();
}

function sectionTitle(text, y) {
  doc.font("Helvetica-Bold").fontSize(11).fillColor(C.brand).text(text.toUpperCase(), page.left, y);
}

function bodyText(text, x, y, width, opts = {}) {
  doc.font(opts.bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(opts.size || 9.2)
    .fillColor(opts.color || C.ink)
    .text(text, x, y, {
      width,
      lineGap: opts.lineGap ?? 1.5,
      align: opts.align || "left"
    });
}

function bulletList(items, x, y, width, opts = {}) {
  let cursorY = y;
  const bulletGap = opts.gap ?? 4;
  items.forEach((item) => {
    doc.font("Helvetica-Bold").fontSize(8.8).fillColor(opts.bulletColor || C.brand).text("-", x, cursorY);
    bodyText(item, x + 10, cursorY - 0.5, width - 10, {
      size: opts.size || 8.8,
      color: opts.color || C.ink,
      lineGap: 1.2
    });
    cursorY = doc.y + bulletGap;
  });
  return cursorY;
}

function tag(text, x, y, w) {
  doc.roundedRect(x, y, w, 20, 10).fillAndStroke(C.brandSoft, C.soft);
  bodyText(text, x, y + 5.3, w, { size: 8.2, align: "center", bold: true, color: C.brand });
}

doc.rect(0, 0, doc.page.width, 96).fill("#111827");
doc.circle(page.left + 22, 48, 18).fill(C.brand);
doc.font("Helvetica-Bold").fontSize(20).fillColor(C.white).text("H", page.left + 14.5, 40);
doc.font("Helvetica-Bold").fontSize(21).fillColor(C.white).text("Hbit", page.left + 56, 31);
doc.font("Helvetica").fontSize(9.5).fillColor("#CBD5E1")
  .text("One-page summary based only on repo evidence", page.left + 56, 56);

tag("Static web app", page.right - 218, 28, 66);
tag("Firebase-backed", page.right - 146, 28, 74);
tag("EN + FR", page.right - 66, 28, 52);

let y = 112;
sectionTitle("What it is", y);
bodyText(
  "Hbit is a web-first personal growth app that combines tracking for habits, budget, sleep, mood, focus, and planning in one dashboard. Repo evidence also shows account flows, onboarding, profile/settings, bilingual UI, and theme support.",
  page.left,
  y + 16,
  page.width
);

y = 176;
sectionTitle("Who it's for", y);
bodyText(
  'Primary persona in the repo brief: "The Motivated Generalist" - people roughly 18-40 who want one place to manage self-improvement across health, money, mind, and time.',
  page.left,
  y + 16,
  page.width
);

const colGap = 22;
const colW = (page.width - colGap) / 2;
const leftX = page.left;
const rightX = page.left + colW + colGap;

y = 236;
sectionTitle("What it does", y);
const features = [
  "Unified dashboard with weekly summary and module cards for habits, budget, sleep, and mood.",
  "Habits tracking with CRUD, streaks, completion logs, archive/restore, and milestone celebration logic.",
  "Budget tracking with entries, category planning, bills, monthly aggregates, and alerts.",
  "Sleep and mood logging, plus dedicated focus and planning screens.",
  "Email/password auth with signup, login, profile creation, and user-scoped data paths.",
  "Bilingual EN/FR interface via `data-i18n` and a large shared translation dictionary.",
  "Theme toggle, sidebar/nav shell, local state cleanup, and profile/settings pages."
];
const leftEndY = bulletList(features, leftX, y + 18, colW, { size: 8.7, gap: 3 });

sectionTitle("How it works", rightX === rightX ? y : y); // keeps layout explicit
const architecture = [
  "UI layer: root-level HTML pages (`index.html`, `home.html`, `budget.html`, `habits.html`, `sleep.html`, `mood.html`, `focus.html`, `plan.html`, `login.html`, `signup.html`, `profile.html`, `welcome.html`).",
  "Boot layer: `js/app.js` applies theme and i18n, initializes nav, then dispatches page-specific init by `body.id`.",
  "Shared services: `js/core/` contains Firebase init, Firestore data access, dashboard aggregation, i18n, storage, nav, theme, sidebar, toast, and utilities.",
  "Data flow: browser -> Firebase Auth for sign-in -> Firestore/Realtime Database via `window.HBIT` helpers -> page scripts render module state back into the DOM.",
  "Persistence shape in code: user data stored under `/users/{uid}` with subcollections such as `habits`, `habitLogs`, `budgetEntries`, `budgetGoals`, `sleepLogs`, and `moodLogs`.",
  "Hosting evidence: `firebase.json` serves the repo root and rewrites all routes to `/index.html`; `.firebaserc` points to default project `hbit-2026`."
];
const rightEndY = bulletList(architecture, rightX, y + 18, colW, { size: 8.55, gap: 3, bulletColor: C.accent });

y = Math.max(leftEndY, rightEndY) + 6;
rule(y);

sectionTitle("How to run", y + 12);
const steps = [
  "1. Install repo dependencies: `npm install`.",
  "2. Use the Firebase project wiring already present in `.firebaserc` (`hbit-2026`) and client config in `js/core/firebase-init.js` (`hbit-d62a6`).",
  "3. Serve the repo root as a static site so the HTML entry points load in a browser. Exact local serve command: Not found in repo.",
  "4. Start from `index.html`; authenticated app screens are separate HTML files in the repo root."
];
const stepsEnd = bulletList(steps, page.left, y + 30, page.width, { size: 8.9, gap: 3, bulletColor: C.accent });

rule(stepsEnd + 4);
bodyText(
  "Notes: Package scripts: Not found in repo. Backend custom server: Not found in repo. Architecture summary above is derived from checked-in HTML, JS, Firebase config, Firestore rules, and architecture/brief docs in this repository.",
  page.left,
  stepsEnd + 12,
  page.width,
  { size: 8.1, color: C.muted }
);

doc.end();

doc.on("end", () => {
  process.stdout.write(outputPath);
});
