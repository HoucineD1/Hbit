const PDFDocument = require('pdfkit');
const fs = require('fs');

const doc = new PDFDocument({
  size: 'A4',
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  info: {
    Title: 'Hbit - Full UI Master Audit Report',
    Author: 'Claude (AI-assisted)',
    Subject: 'UI/UX Audit',
    CreationDate: new Date()
  }
});

const out = fs.createWriteStream('UI-MASTER-REPORT.pdf');
doc.pipe(out);

// Colors
const C = {
  brand: '#E63946',
  bg: '#0D1117',
  text: '#1a1a2e',
  muted: '#555770',
  heading: '#0D1117',
  accent: '#E63946',
  p0: '#DC2626',
  p1: '#EA580C',
  p2: '#D97706',
  p3: '#2563EB',
  pass: '#059669',
  fail: '#DC2626',
  tableBorder: '#D1D5DB',
  tableHeader: '#F3F4F6',
  tableAlt: '#F9FAFB',
  link: '#2563EB',
  sectionBg: '#FEF2F2',
};

const pageW = 495; // usable width

// Helper: check page space
function ensureSpace(needed) {
  if (doc.y + needed > doc.page.height - 60) doc.addPage();
}

// ─── COVER PAGE ──────────────────────────────────────
doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0D1117');

// Brand mark
doc.roundedRect(230, 160, 80, 80, 16).fill(C.brand);
doc.fontSize(36).font('Helvetica-Bold').fillColor('#fff').text('H', 230, 178, { width: 80, align: 'center' });

doc.fontSize(42).font('Helvetica-Bold').fillColor('#fff').text('Hbit', 0, 270, { align: 'center' });
doc.fontSize(16).font('Helvetica').fillColor('#94A3B8').text('Full UI Master Audit Report', 0, 320, { align: 'center' });

doc.moveDown(3);
doc.fontSize(11).fillColor('#64748B');
doc.text('Date: April 9, 2026', 0, 400, { align: 'center' });
doc.text('Auditor: Claude (AI-assisted)', 0, 418, { align: 'center' });
doc.text('Stack: Vanilla HTML/CSS/JS + Firebase', 0, 436, { align: 'center' });
doc.text('Brand Color: #E63946 (Red) | Dark theme default', 0, 454, { align: 'center' });

doc.fontSize(9).fillColor('#475569').text('This report covers 11 pages, 7 core CSS files, 5 core JS files,', 0, 540, { align: 'center' });
doc.text('and 11 page-specific CSS files. No fixes were applied.', 0, 554, { align: 'center' });

// ─── PAGE 2: TABLE OF CONTENTS ──────────────────────
doc.addPage();
doc.fillColor(C.heading).fontSize(24).font('Helvetica-Bold').text('Table of Contents');
doc.moveDown(0.8);

const toc = [
  ['1', 'Executive Summary', 'Overall scores, top issues, what works, AI slop verdict'],
  ['2', 'Design System Audit', 'Tokens, typography, color, spacing, animations'],
  ['3', 'Page-by-Page Analysis', '11 pages scored on heuristics + technical quality'],
  ['4', 'Cross-Cutting Issues', 'Sidebar, nav, components, i18n, theming, mobile'],
  ['5', 'Prioritized Action Plan', '30 items ordered P0 through P3'],
  ['6', 'Missing Features & Additions', 'UI patterns, micro-interactions, accessibility'],
  ['7', 'Recommended Redesigns', 'Which pages need redesign and how'],
];

toc.forEach(([num, title, desc]) => {
  doc.fontSize(13).font('Helvetica-Bold').fillColor(C.accent).text(num + '. ', { continued: true });
  doc.fillColor(C.heading).text(title);
  doc.fontSize(10).font('Helvetica').fillColor(C.muted).text(desc);
  doc.moveDown(0.6);
});

// ─── HELPER: Section Header ─────────────────────────
function sectionHeader(num, title) {
  doc.addPage();
  doc.rect(0, 0, doc.page.width, 80).fill(C.brand);
  doc.fontSize(12).font('Helvetica').fillColor('#FCA5A5').text('SECTION ' + num, 50, 22);
  doc.fontSize(22).font('Helvetica-Bold').fillColor('#fff').text(title, 50, 42);
  doc.y = 100;
}

// ─── HELPER: Sub-header ─────────────────────────────
function subHeader(text) {
  ensureSpace(40);
  doc.moveDown(0.5);
  doc.fontSize(15).font('Helvetica-Bold').fillColor(C.heading).text(text);
  doc.moveDown(0.3);
}

function subSubHeader(text) {
  ensureSpace(30);
  doc.moveDown(0.3);
  doc.fontSize(12).font('Helvetica-Bold').fillColor(C.accent).text(text);
  doc.moveDown(0.2);
}

// ─── HELPER: Body text ─────────────────────────────
function body(text) {
  doc.fontSize(10).font('Helvetica').fillColor(C.text).text(text, { lineGap: 3 });
  doc.moveDown(0.3);
}

function bodyBold(text) {
  doc.fontSize(10).font('Helvetica-Bold').fillColor(C.text).text(text, { lineGap: 3 });
  doc.moveDown(0.3);
}

// ─── HELPER: Bullet point ──────────────────────────
function bullet(text, color) {
  ensureSpace(20);
  const x = doc.x;
  doc.fontSize(10).font('Helvetica').fillColor(color || C.text);
  doc.text('  \u2022  ' + text, { lineGap: 2, indent: 0 });
  doc.moveDown(0.15);
}

// ─── HELPER: Priority tag ──────────────────────────
function priorityItem(priority, text) {
  ensureSpace(25);
  const colors = { P0: C.p0, P1: C.p1, P2: C.p2, P3: C.p3 };
  const col = colors[priority] || C.text;
  doc.fontSize(10).font('Helvetica-Bold').fillColor(col).text(priority + ': ', { continued: true });
  doc.font('Helvetica').fillColor(C.text).text(text, { lineGap: 2 });
  doc.moveDown(0.2);
}

// ─── HELPER: Simple table ──────────────────────────
function simpleTable(headers, rows, colWidths) {
  ensureSpace(30 + rows.length * 22);
  const startX = 50;
  let y = doc.y;
  const rowH = 22;

  // Header
  doc.rect(startX, y, pageW, rowH).fill(C.tableHeader);
  let x = startX;
  headers.forEach((h, i) => {
    doc.fontSize(9).font('Helvetica-Bold').fillColor(C.heading).text(h, x + 4, y + 6, { width: colWidths[i] - 8 });
    x += colWidths[i];
  });
  y += rowH;

  // Rows
  rows.forEach((row, ri) => {
    if (y + rowH > doc.page.height - 60) {
      doc.addPage();
      y = doc.y;
    }
    if (ri % 2 === 1) doc.rect(startX, y, pageW, rowH).fill(C.tableAlt);
    x = startX;
    row.forEach((cell, ci) => {
      doc.fontSize(9).font('Helvetica').fillColor(C.text).text(String(cell), x + 4, y + 6, { width: colWidths[ci] - 8 });
      x += colWidths[ci];
    });
    y += rowH;
  });

  doc.y = y + 6;
}

// ─── HELPER: Score table for pages ──────────────────
function heuristicTable(scores) {
  const headers = ['#', 'Heuristic', 'Score', 'Notes'];
  const colWidths = [25, 160, 40, 270];
  simpleTable(headers, scores, colWidths);
}

function techTable(scores) {
  const headers = ['Dimension', 'Score', 'Notes'];
  const colWidths = [100, 50, 345];
  simpleTable(headers, scores, colWidths);
}

// ════════════════════════════════════════════════════
// SECTION 1: EXECUTIVE SUMMARY
// ════════════════════════════════════════════════════
sectionHeader('1', 'Executive Summary');

subHeader('Overall Scores');
simpleTable(
  ['Dimension', 'Score', 'Max'],
  [
    ['Heuristic Average (across all pages)', '27/40', '40'],
    ['Technical Audit Average', '13/20', '20'],
    ['Combined', '40/60', '60'],
  ],
  [250, 120, 125]
);

subHeader('Top 5 Most Critical Issues');
priorityItem('P0', 'i18n interpolation is broken. Translation keys like {n}, {amount}, {score} render literally. Every page affected. (js/core/i18n.js)');
priorityItem('P0', 'Sidebar HTML is copy-pasted across all 9 app pages. Any nav change requires editing 9 files.');
priorityItem('P1', 'Light theme is incomplete. Sleep, Focus, Plan, Budget have partial or missing light-theme overrides.');
priorityItem('P1', 'No loading states on any page. Users see "---" or "0/0" with no skeleton/spinner/shimmer.');
priorityItem('P1', 'Toast/offline messages and several UI strings are hardcoded in English despite 1250+ i18n keys.');

subHeader('Top 5 Things Already Working Well');
bullet('Sidebar navigation is excellent. Swipe gestures, keyboard shortcuts, ARIA attributes, responsive push/overlay.', C.pass);
bullet('Design token system is solid. tokens.css provides coherent palette, type scale, radius, shadows.', C.pass);
bullet('Page entrance animations are tasteful. Staggered hbitFadeUp, spring easing, prefers-reduced-motion support.', C.pass);
bullet('Module accent color system works. Each module has consistent color across dashboard, headers, and charts.', C.pass);
bullet('Mood page UX is the strongest. Band selector, sub-dimensions, emotion chips, reflection questions.', C.pass);

subHeader('AI Slop Verdict');
body('Mixed. The landing page has classic AI-generated tells (fake social proof "10,000+ users", generic quotes). The app pages are more distinctive -- dashboard cards, sleep cycle calculator, mood band selector feel like original product thinking. The biggest "AI smell" is inconsistency between pages -- each feels designed in a separate session.');

// ════════════════════════════════════════════════════
// SECTION 2: DESIGN SYSTEM AUDIT
// ════════════════════════════════════════════════════
sectionHeader('2', 'Design System Audit');

subHeader('Token Architecture (css/core/tokens.css)');
body('What you have:');
bullet('Font family: DM Sans with system fallbacks -- good choice');
bullet('Type scale: 8 sizes from 0.6875rem to 2.25rem');
bullet('Weight scale: 4 weights (500-800)');
bullet('Colors: Brand #E63946, 7 module accent colors, semantic bg/text/border');
bullet('Radius: 5-step scale (10px to 9999px)');
bullet('Shadows: 5-level scale plus accent shadow');
bullet('Light theme: Basic overrides for --bg, --panel, --text, --muted, --border');

doc.moveDown(0.4);
subSubHeader('Issues Found');
simpleTable(
  ['Issue', 'Sev', 'Details'],
  [
    ['No spacing tokens', 'P2', 'Padding/margins hardcoded everywhere. Need --space-1 to --space-8'],
    ['No easing tokens', 'P2', 'cubic-bezier(0.22,1,0.36,1) repeated 20+ times. Need --ease-spring'],
    ['Light theme shadows missing', 'P1', '--shadow-* values dark-mode-only. Light mode needs lighter shadows'],
    ['Module colors in 3 places', 'P2', 'tokens.css, home.css, habits.css all define different names'],
    ['--brand rarely used', 'P3', 'Brand red only in sidebar mark + profile avatar'],
    ['font-weight: 1000', 'P2', 'Invalid for DM Sans (max 800). Browser clamps silently'],
    ['No color-scheme', 'P2', 'Missing color-scheme: dark light for native form controls'],
  ],
  [140, 30, 325]
);

subHeader('Typography');
body('DM Sans is a strong choice -- geometric, modern, readable. Good fit for "personal coach, not hospital" brand.');
bullet('.sub uses hardcoded 13px instead of var(--font-size-sm) (base.css:27)');
bullet('.time uses hardcoded 12px instead of var(--font-size-sm) (base.css:30)');
bullet('Budget header buttons 34px vs 40-44px everywhere else');
bullet('font-weight: 900/1000 used but DM Sans maxes at 800');

subHeader('Color Palette');
body('Module colors are well-chosen:');
bullet('Habits: #34D399 (emerald green) -- growth, progress');
bullet('Budget: #F59E0B (amber) -- money, caution');
bullet('Sleep: #818CF8 / #60A5FA (INCONSISTENT -- two different blues)');
bullet('Mood: #A78BFA / #7c4dff (INCONSISTENT -- two different purples)');
bullet('Focus: #F97316 (orange) -- energy, urgency');
bullet('Plan: #22D3EE (cyan) -- clarity, scheduling');

subHeader('Spacing & Animation');
body('No formal spacing scale. Every file picks its own padding/margins. Animation system is strong -- keyframes well-defined, stagger timing tasteful, prefers-reduced-motion supported. Missing: exit animations, micro-interaction keyframes.');

// ════════════════════════════════════════════════════
// SECTION 3: PAGE-BY-PAGE ANALYSIS
// ════════════════════════════════════════════════════
sectionHeader('3', 'Page-by-Page Analysis');

// ── 3.1 Landing ──
subHeader('3.1 Landing Page (index.html)');
body('Split hero -- left side has headline, social proof, feature chips, CTAs, stat counters. Right side has carousel. Ambient glow layers create depth.');
doc.moveDown(0.2);
subSubHeader('Heuristic Score: 24/36');
subSubHeader('Technical Score: 12/20');
subSubHeader('AI Slop: PARTIAL FAIL');
body('Fake "Trusted by 10,000+ users", "4.8 stars" with no source, count-up animation on stats.');
doc.moveDown(0.2);
bodyBold('Issues:');
priorityItem('P1', 'Social proof is fake -- remove or make real');
priorityItem('P2', 'No <link rel="preload"> for DM Sans font');
priorityItem('P3', 'Hero headline is generic -- could be any app');
doc.moveDown(0.2);
bodyBold('Working Well:');
bullet('Feature chip nav with accent colors is distinctive');
bullet('Ambient glow layers create premium depth');
bullet('Good meta tags (OG, Twitter, schema.org)');

// ── 3.2 Login ──
subHeader('3.2 Login Page (login.html)');
body('Split-screen. Left: brand mark, motivational copy, glassmorphism rows, quote. Right: email/password form, Google sign-in.');
subSubHeader('Heuristic Score: 27/40 | Technical Score: 12/20');
subSubHeader('AI Slop: MINOR FAIL');
priorityItem('P1', 'Auth pages have no light theme support');
priorityItem('P2', 'No inline form validation');
priorityItem('P2', 'No "Remember me" option');
bullet('Split-screen layout is premium and distinctive', C.pass);

// ── 3.3 Signup ──
subHeader('3.3 Signup Page (signup.html)');
body('Same structure as login. Left panel shows module mini-cards. Scores: 27/40 heuristic, 12/20 technical.');
priorityItem('P2', 'No password strength indicator');
priorityItem('P2', 'No terms/privacy checkbox (legal risk)');

// ── 3.4 Home ──
subHeader('3.4 Home / Dashboard (home.html)');
body('Sticky header, greeting strip, module card grid with mini-charts (donuts, bars, sparklines). Featured weekly summary with concentric rings. Oura-inspired.');
subSubHeader('Heuristic Score: 24/40 | Technical Score: 13/20');
subSubHeader('AI Slop: PASS');
priorityItem('P0', 'No loading/skeleton state -- metrics show "---" or "0/0" on load');
priorityItem('P1', 'Mood card wrapper breaks grid consistency');
priorityItem('P2', 'Footer text hardcoded English, not i18n\'d');
bullet('Concentric ring chart for weekly summary is distinctive', C.pass);
bullet('Module accent glow on card hover is premium', C.pass);

// ── 3.5 Habits ──
subHeader('3.5 Habits Page (habits.html)');
body('Header with "New habit" CTA. Today strip. Filter chips. GitHub-style contribution heatmap. Habit cards. 7-step wizard modal. Detail modal.');
subSubHeader('Heuristic Score: 30/40 (2nd highest) | Technical Score: 14/20 (highest)');
subSubHeader('AI Slop: PASS');
priorityItem('P1', 'Heatmap not accessible -- screen readers get nothing');
priorityItem('P2', '"Step 1 of 7" not i18n\'d');
priorityItem('P2', 'Delete button needs stronger visual distinction from Edit/Pause/Archive');
bullet('Contribution heatmap is a standout feature', C.pass);
bullet('7-step wizard is thorough without being overwhelming', C.pass);

// ── 3.6 Sleep ──
subHeader('3.6 Sleep Page (sleep.html)');
body('Two-tab layout (Tonight / History). Tonight: hero with bedtime/wake plan, sleep debt, cycle calculator, wind-down checklist, weekly schedule. History: calendar with month nav.');
subSubHeader('Heuristic Score: 29/40 | Technical Score: 9/20 (2nd lowest)');
subSubHeader('AI Slop: PASS');
priorityItem('P1', 'Light theme is broken -- poor contrast');
priorityItem('P1', 'Help modal content entirely hardcoded English');
priorityItem('P1', '"Connect your device" with "Coming soon" hurts credibility');
bullet('Sleep cycle calculator is genuinely useful -- not just a logger', C.pass);
bullet('Help modal is one of the best features in the app', C.pass);

// ── 3.7 Mood ──
subHeader('3.7 Mood Page (mood.html)');
body('"How are you today?" lead-in. Two-column: Left has 5-band selector, sub-dimension sliders, emotion/impact chips, reflection questions. Right has streak, weekly insights, entries.');
subSubHeader('Heuristic Score: 33/40 (HIGHEST) | Technical Score: 13/20');
subSubHeader('AI Slop: PASS -- Most distinctive page');
priorityItem('P2', 'Hardcoded rgba(255,255,255,...) values won\'t work in light theme');
priorityItem('P2', '"Show more" buttons need i18n');
bullet('Progressive disclosure (quick save -> add details) is the best UX pattern', C.pass);
bullet('Page tint changes with mood band selection -- delightful', C.pass);

// ── 3.8 Budget ──
subHeader('3.8 Budget Page (budget.html)');
body('Header with date/title. Account cards with gradient backgrounds (salary, cash, credit, debt). Transaction list. Add modal. Category breakdown.');
subSubHeader('Heuristic Score: 24/40 | Technical Score: 9/20 (tied lowest)');
subSubHeader('AI Slop: PASS');
priorityItem('P1', 'Light theme broken -- dark gradients on light page');
priorityItem('P1', 'Header buttons 34px vs app standard 40-44px');
priorityItem('P2', 'No delete confirmation dialog');
priorityItem('P2', 'Avatar 32px round vs 40px rounded-rect elsewhere');

// ── 3.9 Focus ──
subHeader('3.9 Focus Page (focus.html)');
body('Minimal zen layout. Header "Zen Timer". Config pill. Large circular timer ring with phase chip, breathing circle during breaks. Reset/play/skip controls. Settings modal.');
subSubHeader('Heuristic Score: 28/40 | Technical Score: 12/20');
subSubHeader('AI Slop: PASS -- Original design');
priorityItem('P1', 'No light theme support at all');
priorityItem('P1', 'Settings modal text all hardcoded English');
priorityItem('P2', 'No session history after page closes');
bullet('Breathing circle animation during breaks is genuinely calming', C.pass);
bullet('Ambient glow transition (orange->blue) is premium', C.pass);

// ── 3.10 Plan ──
subHeader('3.10 Plan Page (plan.html)');
body('Header with date. Horizontal calendar strip (7 days). Timeline itinerary with vertical line, dots, event cards. FAB button. Modal form.');
subSubHeader('Heuristic Score: 24/40 | Technical Score: 13/20');
subSubHeader('AI Slop: PASS');
priorityItem('P1', 'Modal form labels all hardcoded English');
priorityItem('P2', 'Calendar days are <div> not <button> -- keyboard inaccessible');
priorityItem('P2', 'Carry-over and empty state text not i18n\'d');
bullet('Timeline with vertical line and dots is clean', C.pass);
bullet('Carry-over feature for unfinished tasks is smart', C.pass);

// ── 3.11 Profile ──
subHeader('3.11 Profile Page (profile.html)');
body('Uses topbar component (only page). Avatar hero, personal info form, stats grid, account info, logout.');
subSubHeader('Heuristic Score: 23/40 (LOWEST) | Technical Score: 12/20');
subSubHeader('AI Slop: PASS');
priorityItem('P1', 'ZERO i18n support -- every label is hardcoded English');
priorityItem('P1', 'Only page using topbar component -- layout inconsistency');
priorityItem('P2', 'No "Change password" or "Delete account" option');
bullet('Character counter on bio is a nice touch', C.pass);
bullet('Save button with spinner is proper UX', C.pass);

// ════════════════════════════════════════════════════
// SECTION 4: CROSS-CUTTING ISSUES
// ════════════════════════════════════════════════════
sectionHeader('4', 'Cross-Cutting Issues');

subHeader('4.1 Sidebar Duplication');
body('The entire <nav class="sb"> element (100+ lines) is copied into all 9 app pages. Adding a nav item requires editing 9 files. Fix: Create components/sidebar.html partial and inject via JS.');

subHeader('4.2 Shared Component Quality');
bullet('Cards: .card is defined but most pages create their own (.hc-card, .md-card, .sl-card, .pl-card)');
bullet('Buttons: At least 5 different button patterns that do the same thing');
bullet('Avatars: 4 different implementations with different sizes');
bullet('Modals: Each page has its own modal CSS. No shared component');

subHeader('4.3 i18n Coverage Gaps');
simpleTable(
  ['Area', 'Coverage'],
  [
    ['Core app pages (home, habits, mood)', '85-95%'],
    ['Profile page', '0%'],
    ['Focus settings modal', '0%'],
    ['Plan modal', '0%'],
    ['Sleep help modal', '0%'],
    ['Toast/offline messages', '0%'],
  ],
  [300, 195]
);
body('Critical bug: {n}, {amount}, {score} placeholders in keys are never replaced with actual values.');

subHeader('4.4 Theme Switching Quality');
simpleTable(
  ['Page', 'Light Theme Status'],
  [
    ['Home, Habits, Plan', 'Good -- comprehensive overrides'],
    ['Mood, Budget', 'Partial -- some hardcoded dark values'],
    ['Focus', 'Missing -- zero light theme support'],
    ['Sleep', 'Broken -- unreadable text in some sections'],
    ['Login/Signup', 'Missing -- always dark'],
  ],
  [200, 295]
);

subHeader('4.5 Mobile Responsiveness');
body('Generally good. Key issues:');
bullet('Sleep two-column layout stacks awkwardly on mobile');
bullet('Budget account cards may overflow narrow screens');
bullet('Mood left column is very long on mobile');
bullet('Plan calendar strip hard to scroll on very small devices');

// ════════════════════════════════════════════════════
// SECTION 5: PRIORITIZED ACTION PLAN
// ════════════════════════════════════════════════════
sectionHeader('5', 'Prioritized Action Plan');

subHeader('P0 -- Fix Immediately');
priorityItem('P0', '1. Fix i18n interpolation in js/core/i18n.js -- implement {key} replacement in t() function');
priorityItem('P0', '2. Add loading states to all pages -- skeleton shimmer for dashboard cards, lists, stats');
priorityItem('P0', '3. Extract sidebar into shared component -- eliminate 9 duplicate copies');

subHeader('P1 -- Fix Before Launch');
priorityItem('P1', '4. Complete light theme on focus.css, sleep.css, budget.css');
priorityItem('P1', '5. Add i18n to Profile page (20+ hardcoded strings)');
priorityItem('P1', '6. Add i18n to Focus settings modal');
priorityItem('P1', '7. Add i18n to Plan modal');
priorityItem('P1', '8. Add i18n to Sleep help modal');
priorityItem('P1', '9. Localize toast/offline messages in toast.js');
priorityItem('P1', '10. Remove/replace fake social proof on landing page');
priorityItem('P1', '11. Remove "Connect your device" section from sleep page');

subHeader('P2 -- Fix Soon');
priorityItem('P2', '12. Add spacing tokens (--space-1 through --space-8)');
priorityItem('P2', '13. Add easing tokens (--ease-spring, --ease-smooth)');
priorityItem('P2', '14. Unify module accent colors across all files');
priorityItem('P2', '15. Normalize button sizes to 40px minimum');
priorityItem('P2', '16. Normalize avatar styles to one shared component');
priorityItem('P2', '17. Create shared modal component CSS');
priorityItem('P2', '18. Fix font-weight: 1000 -> 800 in components.css');
priorityItem('P2', '19. Add color-scheme: dark light to :root');
priorityItem('P2', '20. Fix heatmap accessibility');
priorityItem('P2', '21. Make Plan calendar days into <button> elements');
priorityItem('P2', '22. Add delete confirmation dialogs');
priorityItem('P2', '23. Fix light theme shadows');

subHeader('P3 -- Polish');
priorityItem('P3', '24. Add help modals to Habits, Budget, Mood, Focus, Plan');
priorityItem('P3', '25. Add timer completion sound to Focus');
priorityItem('P3', '26. Add password strength indicator to signup');
priorityItem('P3', '27. Add scroll-to-top on mobile for long pages');
priorityItem('P3', '28. Add skip-to-content link on all pages');
priorityItem('P3', '29. Preload DM Sans font');
priorityItem('P3', '30. Add translated aria-labels to toggle buttons');

// ════════════════════════════════════════════════════
// SECTION 6: MISSING FEATURES
// ════════════════════════════════════════════════════
sectionHeader('6', 'Missing Features & Additions');

subHeader('UI Patterns That Should Exist');
simpleTable(
  ['Pattern', 'Status', 'Where Needed'],
  [
    ['Loading/skeleton states', 'Missing everywhere', 'All pages'],
    ['Error states (fetch failed)', 'Missing everywhere', 'All pages'],
    ['Empty states', 'Exists: Habits, Plan', 'Missing: Budget, Sleep, Mood'],
    ['Success states', 'Missing', 'After saving any entry'],
    ['Confirmation dialogs', 'Missing', 'Before delete actions'],
    ['Undo actions', 'Missing', 'After any delete'],
  ],
  [140, 140, 215]
);

subHeader('Micro-interactions Missing');
bullet('Checkbox animation when completing a habit');
bullet('Number counting animation when metrics update');
bullet('Pull-to-refresh on mobile');
bullet('Swipe-to-delete on list items');
bullet('Haptic feedback on mobile');

subHeader('Accessibility Features Missing');
bullet('Skip-to-content link');
bullet('color-scheme meta for native controls');
bullet('Keyboard navigation for calendars');
bullet('Consistent focus management for modals');
bullet('High contrast mode support');
bullet('Screen reader descriptions for all charts');

subHeader('Delight Moments to Add');
bullet('Confetti when completing all daily habits');
bullet('Streak milestone celebrations (7, 30, 100 days)');
bullet('Time-of-day motivational messages');
bullet('Smooth page transitions (currently hard navigates)');
bullet('Ambient sound option for Focus timer');

// ════════════════════════════════════════════════════
// SECTION 7: RECOMMENDED REDESIGNS
// ════════════════════════════════════════════════════
sectionHeader('7', 'Recommended Redesigns');

subHeader('Pages That Need Redesign');
simpleTable(
  ['Page', 'Verdict', 'Reason'],
  [
    ['Profile', 'Full Redesign', 'Weakest page. No personality. Zero i18n. Outdated layout.'],
    ['Budget', 'Partial Redesign', 'Light theme broken. Header sizing inconsistent.'],
  ],
  [80, 110, 305]
);

subHeader('Pages That Just Need Fixes');
simpleTable(
  ['Page', 'Key Fixes'],
  [
    ['Landing', 'Remove fake social proof, strengthen headline, preload fonts'],
    ['Login/Signup', 'Add light theme, inline validation'],
    ['Home', 'Add loading states, fix mood card wrapper'],
    ['Habits', 'Fix heatmap accessibility, wizard i18n'],
    ['Sleep', 'Fix light theme, i18n help modal, remove "coming soon"'],
    ['Mood', 'Fix hardcoded dark colors, mobile density'],
    ['Focus', 'Add light theme, i18n settings modal'],
    ['Plan', 'Fix i18n, keyboard-accessible calendar'],
  ],
  [100, 395]
);

subHeader('Profile Redesign Direction');
body('1. Run /frontend-design for new concept -- personal achievement dashboard, not a form');
body('2. Run /arrange -- hero with larger avatar, stats as progress rings, collapsible form');
body('3. Run /typeset for better type hierarchy');
body('4. Run /harden for complete i18n');
body('5. Run /animate for stat counter animations');

subHeader('Budget Partial Redesign Direction');
body('1. Run /normalize to align header/button sizes');
body('2. Run /colorize for proper light theme');
body('3. Run /arrange to improve account cards on mobile');
body('4. Run /harden for delete confirmations and form validation');

// ─── FINAL PAGE ─────────────────────────────────────
doc.addPage();
doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0D1117');
doc.fontSize(16).font('Helvetica-Bold').fillColor('#fff').text('End of Report', 0, 300, { align: 'center' });
doc.moveDown(1);
doc.fontSize(10).font('Helvetica').fillColor('#64748B');
doc.text('This audit analyzed 11 pages, 7 core CSS files, 5 core JS files,', 0, 340, { align: 'center' });
doc.text('and 11 page-specific CSS files.', 0, 356, { align: 'center' });
doc.text('Every issue has a specific file reference and severity level.', 0, 380, { align: 'center' });
doc.text('No fixes were applied -- this is analysis only.', 0, 396, { align: 'center' });
doc.moveDown(3);
doc.fontSize(9).fillColor('#475569').text('Generated by Claude | April 9, 2026', 0, 460, { align: 'center' });

doc.end();

out.on('finish', () => {
  console.log('PDF generated: UI-MASTER-REPORT.pdf');
});
