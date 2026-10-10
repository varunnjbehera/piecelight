import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const project = new URL('../', import.meta.url);
const [main, css, html] = await Promise.all([
  readFile(new URL('src/main.js', project), 'utf8'),
  readFile(new URL('src/styles.css', project), 'utf8'),
  readFile(new URL('index.html', project), 'utf8'),
]);

test('the app clearly identifies itself as a photo jigsaw puzzle on desktop and mobile', () => {
  assert.match(main, /brand-descriptor[^>]*>PHOTO JIGSAW PUZZLE</);
  assert.match(main, /<h1>Create a jigsaw puzzle<\/h1>/);
  assert.match(main, /aria-label="Photo jigsaw puzzle setup"/);
  assert.match(html, /Piecelight — Photo Jigsaw Puzzle/);
});

test('setup opens directly into a compact launcher with no marketing hero', () => {
  assert.match(main, /class="app-shell setup-mode"/);
  assert.doesNotMatch(main, /class="hero-block"/);
  assert.doesNotMatch(main, /class="how-it-works"/);
  assert.doesNotMatch(main, /\$\{appFooter\(\)\}/);
  assert.match(css, /\.setup-mode\s*\{[^}]*position:\s*fixed;[^}]*inset:\s*0;/s);
  assert.match(css, /html, body, #app-root\s*\{[^}]*overflow:\s*hidden;/s);
  assert.match(css, /\.setup-main\s*\{[^}]*overflow:\s*hidden;/s);
});

test('active gameplay is viewport-locked while only the loose-piece rack scrolls', () => {
  assert.match(css, /\.game-mode\s*\{[^}]*position:\s*fixed;[^}]*inset:\s*0;/s);
  assert.match(css, /\.game-screen\s*\{[^}]*overflow:\s*hidden;/s);
  assert.match(css, /\.play-workspace\s*\{[^}]*overflow:\s*hidden;/s);
  assert.match(css, /\.piece-rack-viewport\s*\{[^}]*overflow:\s*auto;[^}]*overscroll-behavior:\s*contain;/s);
});

test('loose pieces are rendered in one continuous scrollable rack, never pagination', () => {
  assert.match(main, /grid\.innerHTML = pieces\.map\(/);
  assert.doesNotMatch(main, /pieces\.slice\(start, start \+ pageSize\)/);
  assert.doesNotMatch(main, /rack-pager|rack-page-button|data-action="tray-page"/);
  assert.doesNotMatch(main, /trayPage|rack-page-label/);
  assert.match(main, /Swipe to scroll · hold to drag/);
});

test('the puzzle has a single perimeter instead of nested decorative frames', () => {
  assert.doesNotMatch(main, /<rect x="\$\{-layout\.pad\}"/);
  assert.match(main, /width="\$\{layout\.puzzleW\}" height="\$\{layout\.puzzleH\}" fill="#faf7ef" stroke="#788c7b" stroke-width="1\.7"/);
  assert.match(css, /\.board-panel\s*\{[^}]*border:\s*0;/s);
  assert.match(css, /\.board-viewport\s*\{[^}]*border:\s*0;/s);
});

test('visual direction uses deliberate game chrome and a strong selected difficulty', () => {
  assert.match(css, /--forest-deep:\s*#1c382c/i);
  assert.match(css, /\.topbar\s*\{[^}]*background:\s*var\(--forest-deep\)/s);
  assert.match(css, /\.difficulty-option\.selected\s*\{[^}]*background:\s*var\(--forest\)/s);
  assert.match(css, /--clay:\s*#c97852/i);
});


test('short landscape viewports switch to a compact two-pane layout without page scroll', () => {
  assert.match(css, /@media \(orientation: landscape\) and \(max-height: 500px\)/);
  assert.match(css, /grid-template-rows:\s*minmax\(0, 1fr\)/);
  assert.match(css, /grid-template-columns:\s*minmax\(0, 1fr\) minmax\(164px, 31%\)/);
});


test('setup removes repeated intro copy and the decorative duplicate upload icon', () => {
  assert.match(main, /<h1>Create a jigsaw puzzle<\/h1>/);
  assert.doesNotMatch(main, /launcher-kicker|YOUR PHOTO, YOUR PUZZLE/);
  assert.match(main, /<h2>Choose a photo<\/h2><\/div><\/div>/);
  assert.doesNotMatch(main, /class="heading-icon"/);
  assert.match(css, /\.start-button\s*\{[^}]*margin-top:\s*8px/s);
  assert.doesNotMatch(css, /\.start-button\s*\{[^}]*margin-top:\s*auto/s);
});

test('guide overlay and original-photo lightbox have distinct names and purposes', () => {
  assert.match(main, /Toggle picture guide/);
  assert.match(main, /<span>Picture guide<\/span>/);
  assert.match(main, /class="tool-button" data-action="preview" aria-label="View original photo" title="Open the full-size original photo">\$\{icon\('image', 17\)\}<span>View original<\/span><\/button>/);
  assert.match(main, /<h2 id="preview-title">Original photo<\/h2>/);
  assert.doesNotMatch(main, /<span>Preview<\/span>|>View photo<\/button>/);
  assert.match(css, /\.board-footer \{ display: none; \}/);
  assert.match(css, /\.tray-collapse-button \{ display: none; \}/);
});

test('game controls avoid filler labels and ambiguous fit-to-screen text', () => {
  assert.doesNotMatch(main, /One piece at a time|Fit to screen|board-size-note/);
  assert.match(main, /title="Shuffle loose pieces" aria-label="Shuffle loose pieces">\$\{icon\('shuffle', 16\)\}/);
  assert.match(main, /aria-label="Toggle edge-only filter"/);
  assert.match(main, /aria-label="Restart puzzle"/);
  assert.match(main, /tray-footer\"><span id="move-counter">0 moves<\/span><\/div>/);
  assert.match(main, /mobile && pieces.length > 0 && !state\.trayNotice \? 'Swipe to scroll · hold to drag' : ''/);
  assert.match(css, /\.tray-scroll-hint \{ display: none/);
});


test('edge-only filter cannot hide remaining interior pieces or misreport completion', () => {
  assert.match(main, /return resolveTrayPieces\(pieces, state\.layout\.rows, state\.layout\.cols, state\.edgeOnly\)/);
  assert.match(main, /function renderTray\(resetScroll = false\)/);
  assert.match(main, /rack\.scrollTop = resetScroll \? 0/);
  assert.match(main, /state\.edgeOnly = false;[\s\S]{0,180}No edge pieces left\. Showing all remaining pieces\./);
  assert.match(main, /id="tray-announcement" class="visually-hidden" role="status" aria-live="polite"/);
  assert.match(main, /empty\.textContent = state\.pieces\.some\(\(piece\) => !piece\.placed\)[\s\S]*No pieces match this filter\.[\s\S]*All pieces are in place\./);
  assert.match(main, /filter\.setAttribute\('aria-pressed', String\(state\.edgeOnly\)\)/);
});


test('unused hint/preview/drag state and dead counter hooks are removed', () => {
  assert.doesNotMatch(main, /showPreview|trayScrollDrag|zIndex|hintId|game-piece-summary/);
  assert.doesNotMatch(css, /hint-target|hint-piece/);
});


test("resizing regenerates geometry without randomly reordering the player's loose pieces", () => {
  assert.match(main, /const generatedById = new Map\(generatedPieces\.map\(\(piece\) => \[piece\.id, piece\]\)\)/);
  assert.match(main, /const nextPieces = oldPieces\.map\(\(previous\) => \{/);
  assert.match(main, /state\.pieces = nextPieces/);
});


test('mobile tray gestures distinguish scrolling from deliberate piece pickup', () => {
  assert.match(main, /event\.pointerType === 'touch'/);
  assert.match(main, /mode: 'pending'/);
  assert.match(main, /mode = 'scrolling'/);
  assert.match(main, /mode = 'dragging'/);
  assert.match(main, /Swipe to scroll · hold to drag/);
  assert.match(main, /if \(state\.touchGesture\?\.timer\) window\.clearTimeout/);
});


test('edge-filter fallback also makes its reason visible to the player', () => {
  assert.match(main, /state\.trayNotice \? 'All pieces · no edges left' : 'All pieces'/);
  assert.match(main, /No edge pieces left\. Showing all remaining pieces\./);
});
