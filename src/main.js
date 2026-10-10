import {
  DIFFICULTIES,
  calculatePlayLayout,
  chooseGrid,
  createPuzzlePieces,
  formatTime,
  resolveTrayPieces,
} from './puzzle.js';

const root = document.querySelector('#app-root');
const state = {
  imageInfo: null,
  difficulty: 'medium',
  gameStarted: false,
  pieces: [],
  layout: null,
  solved: false,
  moves: 0,
  seconds: 0,
  busy: false,
  error: '',
  dragOver: false,
  boardPreview: false,
  edgeOnly: false,
  trayNotice: '',
  trayOrder: null,
  dragGhost: null,
  touchGesture: null,
  trayExpanded: false,
  trayCollapsed: false,
  objectUrl: null,
  loadSequence: 0,
  timer: null,
  resizeObserver: null,
  drag: null,
};

const ICONS = {
  puzzle: '<path d="M19 13h-2a2 2 0 1 0-4 0v2H9v-2a2 2 0 1 0-4 0H3V7h6V5a2 2 0 1 1 4 0v2h6z"/><path d="M19 7h2v6h-2M9 15v2a2 2 0 1 0 4 0v-2"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2"/>',
  shuffle: '<path d="m18 14 4 4-4 4"/><path d="m18 2 4 4-4 4"/><path d="M2 18h2.5a5 5 0 0 0 4-2l6-8a5 5 0 0 1 4-2H22"/><path d="M2 6h2.5a5 5 0 0 1 4 2l1 1"/><path d="m14 14 1.5 2a5 5 0 0 0 4 2H22"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
  close: '<path d="m18 6-12 12M6 6l12 12"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  sparkle: '<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z"/><path d="m19 14 1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5Z"/>',
  chevronUp: '<path d="m6 15 6-6 6 6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
};

function icon(name, size = 20, strokeWidth = 1.8) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.sparkle}</svg>`;
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const SAMPLE_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d8e9ed"/><stop offset="1" stop-color="#f5d9a9"/></linearGradient><linearGradient id="sea" x1="0" y1="0" x2="0.9" y2="1"><stop stop-color="#4b8c91"/><stop offset="1" stop-color="#28595f"/></linearGradient></defs>
  <rect width="1200" height="800" fill="url(#sky)"/><circle cx="906" cy="155" r="76" fill="#f5bd75" opacity=".96"/>
  <path d="M0 415 160 275 280 356 460 205 638 380 795 260 950 390 1080 290 1200 365V800H0Z" fill="#91a8a0"/>
  <path d="M0 470 175 350 312 432 490 285 660 445 825 332 1000 460 1125 365 1200 405V800H0Z" fill="#657f79"/>
  <path d="M0 520 Q190 450 360 520T730 500T1200 510V800H0Z" fill="url(#sea)"/><path d="M0 600 Q165 570 335 617T690 594T1000 617T1200 592V800H0Z" fill="#346a6c" opacity=".72"/>
  <path d="M0 675 Q160 638 325 688T670 673T1040 687T1200 665V800H0Z" fill="#234f55" opacity=".66"/><path d="M0 526 Q200 510 375 532T720 531T1200 526" fill="none" stroke="#e9d2a9" stroke-width="5" opacity=".72"/><path d="M88 800 Q250 700 389 735T600 800Z" fill="#d4b88e"/>
</svg>`)}`;

function appHeader() {
  return `<header class="topbar"><a class="brand" href="#top" aria-label="Piecelight jigsaw puzzle home"><span class="brand-mark">${icon('puzzle', 22)}</span><span class="brand-copy"><span class="brand-name">piece<span>light</span></span><span class="brand-descriptor">PHOTO JIGSAW PUZZLE</span></span></a><div class="topbar-note"><span class="status-dot"></span> A little space to think</div></header>`;
}


function renderSetup() {
  cleanupGame();
  const image = state.imageInfo;
  const aspect = image ? image.width / image.height : 1;
  const selectedCount = chooseGrid(aspect, DIFFICULTIES[state.difficulty].target).count;
  root.innerHTML = `<div class="app-shell setup-mode">${appHeader()}<main id="top" class="setup-main" aria-label="Photo jigsaw puzzle setup">
    <div class="launcher-heading"><div><h1>Create a jigsaw puzzle</h1></div><span class="launcher-privacy">${icon('shield', 14)} Your photo stays on this device</span></div>
    <section class="setup-grid" aria-label="Set up your jigsaw puzzle">
      <div class="setup-card upload-card"><div class="card-heading"><div><span class="step-label">YOUR PHOTO</span><h2>Choose a photo</h2></div></div>
        ${image ? `<div class="image-selected"><div class="preview-frame"><img src="${escapeHtml(image.src)}" alt="Preview of ${escapeHtml(image.name)}"/><button class="preview-open" type="button" data-action="preview" aria-label="View original photo">${icon('eye', 18)}</button></div>
          <div class="file-details"><div class="file-name-wrap"><span class="file-check">${icon('check', 13)}</span><div><strong>${escapeHtml(image.name)}</strong><small>${image.width.toLocaleString()} × ${image.height.toLocaleString()} px${image.size ? ` · ${formatBytes(image.size)}` : ' · Sample image'}</small></div></div><button type="button" class="text-button" data-action="clear-image">Change</button></div>
          <div class="ratio-note"><span class="ratio-glyph"></span> Original proportions preserved <span>${(image.width / image.height).toFixed(2)}:1</span></div>
          <label class="button button-quiet replace-button" for="image-upload">${icon('upload', 16)} Choose a different image</label><input id="image-upload" class="visually-hidden" type="file" accept="image/*"/>
        </div>` : `<div class="dropzone ${state.dragOver ? 'is-dragging' : ''}" id="dropzone"><div class="upload-illustration">${icon('upload', 27)}</div><h3>Drop a photo right here</h3><p>or choose one from your device</p><label class="button button-secondary choose-file" for="image-upload">Browse images ${icon('arrow', 16)}</label><input id="image-upload" class="visually-hidden" type="file" accept="image/*"/><span class="file-hint">JPG, PNG, WebP and more · up to 30 MB</span></div>`}
        ${state.error ? `<p role="alert" class="error-message">${escapeHtml(state.error)}</p>` : ''}${state.busy ? '<p class="loading-message">Opening your image…</p>' : ''}
        ${!image ? `<div class="sample-row"><span>Nothing handy?</span><button class="text-button sample-link" type="button" data-action="sample">Try a sample photo <span aria-hidden="true">↗</span></button></div>` : ''}
      </div>
      <div class="setup-card difficulty-card"><div class="card-heading"><div><span class="step-label">DIFFICULTY</span><h2>Choose your challenge</h2></div></div>
        <p class="section-intro">Choose how many pieces you want to solve.</p>
        <div class="difficulty-options" role="group" aria-label="Puzzle difficulty">${Object.entries(DIFFICULTIES).map(([key, level]) => {
          const count = chooseGrid(aspect, level.target).count;
          return `<button type="button" class="difficulty-option ${state.difficulty === key ? 'selected' : ''}" data-action="difficulty" data-difficulty="${key}" aria-pressed="${state.difficulty === key}"><span class="difficulty-art art-${key}" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span><span class="difficulty-copy"><strong>${level.label}</strong><small>${level.note}</small></span><span class="piece-count">~${count}<small>pieces</small></span><span class="radio-indicator" aria-hidden="true">${state.difficulty === key ? '<span></span>' : ''}</span></button>`;
        }).join('')}</div>
        <div class="setup-summary"><div class="summary-symbol">${icon('puzzle', 18)}</div><div><strong>A custom-cut puzzle</strong><p>${image ? `Your ${image.width > image.height ? 'landscape' : image.width < image.height ? 'portrait' : 'square'} image will become ${selectedCount} interlocking pieces.` : 'Piece shapes and grid adapt to your photo’s proportions.'}</p></div></div>
        <button type="button" class="button button-primary start-button" data-action="start" ${!image || state.busy ? 'disabled' : ''}>Start your puzzle ${icon('arrow', 18)}</button><p class="no-pressure"><span>✳</span> Your progress lives only in this tab.</p>
      </div>
    </section>
  </main></div>`;
}

function renderGame() {
  cleanupGame();
  state.gameStarted = true;
  state.solved = false;
  state.moves = 0;
  state.seconds = 0;
  state.drag = null;
  state.boardPreview = false;
  state.edgeOnly = false;
  state.trayNotice = '';
  state.trayOrder = null;
  state.trayExpanded = false;
  state.trayCollapsed = false;
  root.innerHTML = `<div class="app-shell game-mode">${appHeader()}<main class="game-main"><section class="game-screen" aria-label="Jigsaw puzzle game">
    <div class="game-header">
      <div class="game-title-block"><button class="back-link" type="button" data-action="back"><span aria-hidden="true">←</span> Setup</button><span class="game-level-label">${DIFFICULTIES[state.difficulty].label} · ${chooseGrid(state.imageInfo.width / state.imageInfo.height, DIFFICULTIES[state.difficulty].target).count}-piece jigsaw</span></div>
      <div class="game-tools">
        <div class="stat-pill" aria-label="Elapsed time">${icon('clock', 16)}<span class="js-timer">00:00</span></div>
        <div class="stat-pill" aria-label="Pieces placed"><span id="placed-counter">0</span><i>/</i><span id="total-counter">0</span><span class="stat-caption">placed</span></div>
        <button type="button" class="tool-button" data-action="toggle-guide" aria-label="Toggle picture guide" aria-pressed="false" title="Temporarily show the picture on the board">${icon('eye', 17)}<span>Picture guide</span></button>
        <button type="button" class="tool-button" data-action="preview" aria-label="View original photo" title="Open the full-size original photo">${icon('image', 17)}<span>View original</span></button>
        <button type="button" class="tool-button" data-action="toggle-edges" aria-label="Toggle edge-only filter" aria-pressed="false" title="Show only edge pieces">${icon('filter', 17)}<span>Edges</span></button>
        <button type="button" class="tool-button restart-button" data-action="restart" aria-label="Restart puzzle" title="Restart puzzle">${icon('refresh', 17)}<span>Restart</span></button>
      </div>
    </div>
    <div class="play-workspace" id="play-workspace">
      <section class="board-panel" aria-label="Puzzle board panel"><div class="panel-topline"><span class="svg-section-label">JIGSAW BOARD</span><div class="board-panel-actions"><button class="panel-tray-toggle" type="button" data-action="toggle-tray" aria-expanded="false" title="Show loose pieces">${icon('chevronLeft', 14)} Pieces</button></div></div><div class="board-viewport" id="board-viewport"><svg class="board-svg" id="board-svg" role="application" aria-label="Jigsaw puzzle board. Place pieces here." tabindex="0"></svg></div><div class="board-footer"><span class="board-status-dot"></span><span id="board-status">A little room to think.</span></div></section>
      <aside class="tray-panel" id="tray-panel" aria-label="Loose puzzle pieces"><button class="tray-sheet-handle" type="button" data-action="toggle-tray" aria-expanded="false" title="Expand piece tray"><span class="tray-sheet-bar"></span><span class="visually-hidden">Expand or collapse piece tray</span>${icon('chevronUp', 14)}</button><div class="tray-header"><div><span class="svg-section-label">LOOSE PIECES</span><span class="tray-count"><strong id="left-counter">0</strong> left</span></div><div class="tray-header-actions"><button class="icon-tool-button tray-collapse-button" type="button" data-action="toggle-tray" aria-expanded="true" title="Collapse piece tray" aria-label="Collapse piece tray">${icon('chevronRight', 16)}</button><button class="icon-tool-button" type="button" data-action="shuffle" title="Shuffle loose pieces" aria-label="Shuffle loose pieces">${icon('shuffle', 16)}</button></div></div><div class="tray-subline"><span id="tray-filter-label">All pieces</span><span class="tray-scroll-hint">Swipe to scroll · hold to drag</span><span id="tray-announcement" class="visually-hidden" role="status" aria-live="polite"></span></div><div class="piece-rack-viewport" id="piece-rack-viewport" aria-label="Loose puzzle pieces" tabindex="0"><div class="piece-grid" id="piece-grid"></div><div class="tray-empty" id="tray-empty" hidden>All pieces are in place.</div></div><div class="tray-footer"><span id="move-counter">0 moves</span></div></aside>
    </div>
  </section></main></div>`;

  const workspace = document.querySelector('#play-workspace');
  const boardViewport = document.querySelector('#board-viewport');
  if (state.imageInfo.width / state.imageInfo.height >= 1.2) workspace.classList.add('is-landscape');
  else if (state.imageInfo.width / state.imageInfo.height <= 0.82) workspace.classList.add('is-portrait');
  else workspace.classList.add('is-square');
  const trayPanel = document.querySelector('#tray-panel');
  const boardRect = boardViewport.getBoundingClientRect();
  const trayRect = trayPanel.getBoundingClientRect();
  state.layout = calculatePlayLayout(
    boardRect.width || Math.max(300, window.innerWidth * 0.58),
    boardRect.height || Math.max(220, window.innerHeight * 0.55),
    trayRect.width - 28 || 300,
    state.imageInfo.width / state.imageInfo.height,
    DIFFICULTIES[state.difficulty].target,
  );
  state.pieces = createPuzzlePieces(state.layout, state.difficulty);
  drawBoard();
  renderTray();
  bindGameEvents();
  updateCounters();
  state.timer = window.setInterval(() => {
    if (state.solved || !state.gameStarted) return;
    state.seconds += 1;
    const display = document.querySelector('.js-timer');
    if (display) display.textContent = formatTime(state.seconds);
  }, 1000);
  if (typeof ResizeObserver !== 'undefined') {
    state.resizeObserver = new ResizeObserver(() => {
      const rect = boardViewport.getBoundingClientRect();
      const sideRect = trayPanel.getBoundingClientRect();
      if (rect.width > 100 && rect.height > 100) {
        const current = state.layout;
        if (!current || Math.abs(current._boardBoxW - rect.width) > 8 || Math.abs(current._boardBoxH - rect.height) > 8 || Math.abs(current._trayBoxW - (sideRect.width - 28)) > 12) {
          reflowBoard(rect.width, rect.height, sideRect.width - 28);
          state.layout._boardBoxW = rect.width;
          state.layout._boardBoxH = rect.height;
          state.layout._trayBoxW = sideRect.width - 28;
        }
      }
    });
    state.resizeObserver.observe(boardViewport);
    state.resizeObserver.observe(trayPanel);
  }
}

function makePieceSvgMarkup(piece, prefix = 'tray') {
  const layout = state.layout;
  const image = state.imageInfo;
  const clipId = `${prefix}-piece-clip-${piece.id}`;
  return `<svg class="piece-svg" width="${layout.slotW}" height="${layout.slotH}" viewBox="${-layout.pad} ${-layout.pad} ${layout.slotW} ${layout.slotH}" aria-hidden="true" focusable="false"><defs><clipPath id="${clipId}" clipPathUnits="userSpaceOnUse"><path d="${piece.path}"/></clipPath></defs><image x="${-piece.col * layout.tileW}" y="${-piece.row * layout.tileH}" width="${layout.puzzleW}" height="${layout.puzzleH}" href="${escapeHtml(image.src)}" preserveAspectRatio="none" clip-path="url(#${clipId})"/><path class="piece-art-outline" d="${piece.path}"/></svg>`;
}

function makeBoardPieceMarkup(piece) {
  const layout = state.layout;
  const image = state.imageInfo;
  const clipId = `board-piece-clip-${piece.id}`;
  return `<g data-board-id="${piece.id}" class="placed-piece" transform="translate(${piece.homeX} ${piece.homeY})"><image x="${-piece.col * layout.tileW}" y="${-piece.row * layout.tileH}" width="${layout.puzzleW}" height="${layout.puzzleH}" href="${escapeHtml(image.src)}" preserveAspectRatio="none" clip-path="url(#${clipId})"/><path d="${piece.path}" class="placed-piece-outline"/></g>`;
}

function makeBoardMarkup(layout) {
  const pieces = state.pieces;
  const guides = pieces.map((piece) => `<path data-guide-id="${piece.id}" class="target-guide" d="${piece.path}" transform="translate(${piece.homeX} ${piece.homeY})"/>`).join('');
  const clipPaths = pieces.map((piece) => `<clipPath id="board-piece-clip-${piece.id}" clipPathUnits="userSpaceOnUse"><path d="${piece.path}"/></clipPath>`).join('');
  const verticalGrid = Array.from({ length: layout.cols - 1 }, (_, i) => `<line x1="${(i + 1) * layout.tileW}" y1="0" x2="${(i + 1) * layout.tileW}" y2="${layout.puzzleH}"/>`).join('');
  const horizontalGrid = Array.from({ length: layout.rows - 1 }, (_, i) => `<line x1="0" y1="${(i + 1) * layout.tileH}" x2="${layout.puzzleW}" y2="${(i + 1) * layout.tileH}"/>`).join('');
  const placed = pieces.filter((piece) => piece.placed).map(makeBoardPieceMarkup).join('');
  return `<defs><pattern id="board-paper" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".45" fill="#c8cec2" opacity=".35"/></pattern>${clipPaths}</defs>
    <rect x="0" y="0" width="${layout.puzzleW}" height="${layout.puzzleH}" fill="#faf7ef" stroke="#788c7b" stroke-width="1.7"/>
    <rect x="0.6" y="0.6" width="${Math.max(0, layout.puzzleW - 1.2)}" height="${Math.max(0, layout.puzzleH - 1.2)}" fill="url(#board-paper)"/>
    <image id="board-preview-image" href="${escapeHtml(state.imageInfo.src)}" x="0" y="0" width="${layout.puzzleW}" height="${layout.puzzleH}" preserveAspectRatio="none" opacity="${state.boardPreview ? '.24' : '0'}"/>
    ${guides}
    <g class="board-grid-lines" opacity=".12" stroke="#829183" stroke-width=".55">${verticalGrid}${horizontalGrid}</g>
    ${placed}`;
}

function drawBoard() {
  const svg = document.querySelector('#board-svg');
  if (!svg || !state.layout) return;
  const layout = state.layout;
  svg.setAttribute('width', layout.svgWidth);
  svg.setAttribute('height', layout.svgHeight);
  svg.setAttribute('viewBox', `${-layout.pad} ${-layout.pad} ${layout.svgWidth} ${layout.svgHeight}`);
  svg.innerHTML = makeBoardMarkup(layout);
  svg.style.aspectRatio = `${layout.svgWidth} / ${layout.svgHeight}`;
  svg.style.width = `${layout.svgWidth}px`;
  svg.style.height = `${layout.svgHeight}px`;
  svg.style.maxWidth = '100%';
  svg.style.maxHeight = '100%';
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  const placed = piecesPlacedCount();
  const status = document.querySelector('#board-status');
  if (status) status.textContent = state.solved ? 'Beautifully done.' : placed ? `${placed} piece${placed === 1 ? '' : 's'} in place.` : 'A little room to think.';
}

function getTrayPieces() {
  let pieces = state.pieces.filter((piece) => !piece.placed);
  if (state.trayOrder) {
    const order = new Map(state.trayOrder.map((id, index) => [id, index]));
    pieces.sort((a, b) => (order.get(a.id) ?? 9999) - (order.get(b.id) ?? 9999));
  }
  return resolveTrayPieces(pieces, state.layout.rows, state.layout.cols, state.edgeOnly);
}

function renderTray(resetScroll = false) {
  const grid = document.querySelector('#piece-grid');
  const rack = document.querySelector('#piece-rack-viewport');
  if (!grid || !rack || !state.layout) return;

  const previousScrollTop = rack.scrollTop;
  const trayResult = getTrayPieces();
  if (state.edgeOnly && !trayResult.edgeOnly) {
    state.edgeOnly = false;
    state.trayNotice = trayResult.autoCleared
      ? 'No edge pieces left. Showing all remaining pieces.'
      : '';
  }
  const pieces = trayResult.pieces;
  resetScroll = resetScroll || trayResult.autoCleared;
  const mobile = window.matchMedia('(max-width: 760px)').matches;
  const width = Math.max(140, rack.clientWidth - 8 || (mobile ? window.innerWidth - 42 : 300));
  const gap = mobile ? 5 : 8;
  const maxColumns = mobile ? (width < 350 ? 3 : 4) : (width >= 320 ? 3 : 2);
  const minSlotWidth = mobile ? 56 : 70;
  const columns = Math.max(1, Math.min(maxColumns, Math.floor((width + gap) / (minSlotWidth + gap))));
  const slotWidth = Math.min(mobile ? 84 : 116, (width - gap * (columns - 1)) / columns);
  const shapeRatio = state.layout.slotH / state.layout.slotW;
  const slotHeight = slotWidth * shapeRatio;

  grid.style.setProperty('--rack-piece-width', `${slotWidth}px`);
  grid.style.setProperty('--rack-piece-height', `${slotHeight}px`);
  grid.style.gridTemplateColumns = `repeat(${columns}, ${slotWidth}px)`;
  grid.style.gridAutoRows = `${slotHeight}px`;
  grid.style.gap = `${gap}px`;
  // Render every loose piece. The rack itself scrolls; there is no artificial page/pagination state.
  grid.innerHTML = pieces.map((piece) => `<button type="button" class="piece-card" data-piece-id="${piece.id}" aria-label="Piece ${piece.id + 1}, row ${piece.row + 1}, column ${piece.col + 1}. Drag onto the board, or press Enter for keyboard placement assistance.">${makePieceSvgMarkup(piece, 'tray')}</button>`).join('');
  grid.classList.toggle('edge-filtered', state.edgeOnly);

  const empty = document.querySelector('#tray-empty');
  if (empty) {
    empty.hidden = pieces.length > 0;
    empty.textContent = state.pieces.some((piece) => !piece.placed)
      ? 'No pieces match this filter.'
      : 'All pieces are in place.';
  }
  const label = document.querySelector('#tray-filter-label');
  if (label) label.textContent = state.edgeOnly ? 'Edge pieces' : state.trayNotice ? 'All pieces · no edges left' : 'All pieces';
  const announcement = document.querySelector('#tray-announcement');
  if (announcement && announcement.textContent !== state.trayNotice) {
    announcement.textContent = state.trayNotice;
  }
  const scrollHint = document.querySelector('.tray-scroll-hint');
  if (scrollHint) scrollHint.textContent = mobile && pieces.length > 0 && !state.trayNotice ? 'Swipe to scroll · hold to drag' : '';
  // Preserve browsing position during placement; reset to the start when the filter/order changes.
  rack.scrollTop = resetScroll ? 0 : Math.min(previousScrollTop, Math.max(0, rack.scrollHeight - rack.clientHeight));

  const filter = document.querySelector('[data-action="toggle-edges"]');
  if (filter) {
    filter.classList.toggle('tool-active', state.edgeOnly);
    filter.setAttribute('aria-pressed', String(state.edgeOnly));
  }
}
function updateTrayState() {
  const workspace = document.querySelector('#play-workspace');
  const tray = document.querySelector('#tray-panel');
  if (!workspace || !tray) return;
  const mobile = window.matchMedia('(max-width: 760px)').matches;
  if (mobile) state.trayCollapsed = false;
  else state.trayExpanded = false;
  workspace.classList.toggle('tray-collapsed', !mobile && state.trayCollapsed);
  tray.classList.toggle('tray-expanded', mobile && state.trayExpanded);
  document.querySelectorAll('[data-action="toggle-tray"]').forEach((button) => {
    const expanded = mobile ? state.trayExpanded : !state.trayCollapsed;
    button.setAttribute('aria-expanded', String(expanded));
    if (button.classList.contains('tray-sheet-handle')) {
      button.title = state.trayExpanded ? 'Collapse piece tray' : 'Expand piece tray';
      button.innerHTML = `<span class="tray-sheet-bar"></span><span class="visually-hidden">${state.trayExpanded ? 'Collapse' : 'Expand'} piece tray</span>${icon(state.trayExpanded ? 'chevronDown' : 'chevronUp', 14)}`;
    }
  });
}

function bindGameEvents() {
  const grid = document.querySelector('#piece-grid');
  if (grid) {
    grid.addEventListener('pointerdown', onTrayPointerDown);
    grid.addEventListener('keydown', onTrayKeyDown);
  }
  window.addEventListener('resize', updateTrayState);
  document.addEventListener('pointermove', onDragPointerMove);
  document.addEventListener('pointerup', onDragPointerUp);
  document.addEventListener('pointercancel', onDragPointerCancel);
}

function beginPieceDrag(card, piece, pointerId, clientX, clientY) {
  const rect = card.getBoundingClientRect();
  // The tray thumbnail is scaled down; preserve the grab point as a fraction so
  // the lifted piece can return to full board scale without jumping under the pointer.
  const offsetX = (clientX - rect.left) * state.layout.slotW / rect.width;
  const offsetY = (clientY - rect.top) * state.layout.slotH / rect.height;
  const ghost = document.createElement('div');
  ghost.className = 'drag-ghost';
  ghost.style.width = `${state.layout.slotW}px`;
  ghost.style.height = `${state.layout.slotH}px`;
  ghost.style.left = `${clientX - offsetX}px`;
  ghost.style.top = `${clientY - offsetY}px`;
  ghost.innerHTML = makePieceSvgMarkup(piece, 'drag');
  document.body.appendChild(ghost);
  state.dragGhost = ghost;
  state.drag = { id: piece.id, pointerId, offsetX, offsetY, startX: clientX, startY: clientY, moved: false, sourceCard: card };
  card.classList.add('is-dragging-source');
}

function onTrayPointerDown(event) {
  const card = event.target.closest('.piece-card');
  if (!card || state.solved || event.button > 0 || state.drag || state.touchGesture) return;
  const piece = state.pieces.find((item) => item.id === Number(card.dataset.pieceId));
  if (!piece || piece.placed) return;
  event.preventDefault();

  if (event.pointerType === 'touch') {
    // Touch gestures need to distinguish browsing the rack from picking up a
    // piece. A quick swipe scrolls the rack; a brief hold starts a piece drag.
    const rack = document.querySelector('#piece-rack-viewport');
    const gesture = {
      pointerId: event.pointerId,
      card,
      piece,
      rack,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      startScrollTop: rack?.scrollTop || 0,
      mode: 'pending',
      timer: null,
    };
    state.touchGesture = gesture;
    gesture.timer = window.setTimeout(() => {
      if (state.touchGesture !== gesture || gesture.mode !== 'pending') return;
      gesture.mode = 'dragging';
      beginPieceDrag(gesture.card, gesture.piece, gesture.pointerId, gesture.lastX, gesture.lastY);
    }, 210);
    return;
  }

  beginPieceDrag(card, piece, event.pointerId, event.clientX, event.clientY);
}

function onDragPointerMove(event) {
  const touch = state.touchGesture;
  if (touch && touch.pointerId === event.pointerId && touch.mode !== 'dragging') {
    touch.lastX = event.clientX;
    touch.lastY = event.clientY;
    if (touch.mode === 'pending' && Math.hypot(event.clientX - touch.startX, event.clientY - touch.startY) > 8) {
      window.clearTimeout(touch.timer);
      touch.timer = null;
      touch.mode = 'scrolling';
    }
    if (touch.mode === 'scrolling') {
      event.preventDefault();
      if (touch.rack) touch.rack.scrollTop = touch.startScrollTop - (event.clientY - touch.startY);
      return;
    }
    return;
  }
  const drag = state.drag;
  if (!drag || drag.pointerId !== event.pointerId) return;
  event.preventDefault();
  if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 2) drag.moved = true;
  if (state.dragGhost) {
    state.dragGhost.style.left = `${event.clientX - drag.offsetX}px`;
    state.dragGhost.style.top = `${event.clientY - drag.offsetY}px`;
  }
  const board = document.querySelector('#board-viewport');
  board?.classList.toggle('drop-ready', isOverBoard(event.clientX, event.clientY));
}

function isOverBoard(x, y) {
  const board = document.querySelector('#board-viewport');
  if (!board) return false;
  const rect = board.getBoundingClientRect();
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function onDragPointerUp(event) {
  const touch = state.touchGesture;
  if (touch && touch.pointerId === event.pointerId) {
    window.clearTimeout(touch.timer);
    state.touchGesture = null;
    if (touch.mode !== 'dragging') return;
  }
  const drag = state.drag;
  if (!drag || drag.pointerId !== event.pointerId) return;
  const piece = state.pieces.find((item) => item.id === drag.id);
  const ghostRect = state.dragGhost?.getBoundingClientRect();
  state.dragGhost?.remove();
  state.dragGhost = null;
  drag.sourceCard?.classList.remove('is-dragging-source');
  document.querySelector('#board-viewport')?.classList.remove('drop-ready');
  state.drag = null;
  if (!piece || !drag.moved) return;
  state.moves += 1;
  const boardSvg = document.querySelector('#board-svg');
  const rect = boardSvg?.getBoundingClientRect();
  if (rect && ghostRect) {
    const scaleX = rect.width / state.layout.svgWidth;
    const scaleY = rect.height / state.layout.svgHeight;
    const targetX = rect.left + (state.layout.pad + piece.homeX + state.layout.tileW / 2) * scaleX;
    const targetY = rect.top + (state.layout.pad + piece.homeY + state.layout.tileH / 2) * scaleY;
    const dropX = event.clientX - drag.offsetX + state.layout.slotW / 2;
    const dropY = event.clientY - drag.offsetY + state.layout.slotH / 2;
    const tolerance = Math.max(13, Math.min(state.layout.tileW * scaleX, state.layout.tileH * scaleY) * 0.44);
    if (Math.hypot(dropX - targetX, dropY - targetY) <= tolerance) {
      piece.placed = true;
      state.trayNotice = '';
      piece.x = piece.homeX;
      piece.y = piece.homeY;
      state.trayOrder = state.trayOrder?.filter((id) => id !== piece.id) ?? null;
      drawBoard();
    }
  }
  renderTray();
  updateCounters();
  if (state.pieces.length > 0 && state.pieces.every((item) => item.placed)) finishGame();
}

function onDragPointerCancel(event) {
  const touch = state.touchGesture;
  if (touch && touch.pointerId === event.pointerId) {
    window.clearTimeout(touch.timer);
    state.touchGesture = null;
    if (touch.mode !== 'dragging') return;
  }
  if (!state.drag || state.drag.pointerId !== event.pointerId) return;
  state.dragGhost?.remove();
  state.dragGhost = null;
  state.drag.sourceCard?.classList.remove('is-dragging-source');
  document.querySelector('#board-viewport')?.classList.remove('drop-ready');
  state.drag = null;
}

function onTrayKeyDown(event) {
  const card = event.target.closest('.piece-card');
  if (!card) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    const piece = state.pieces.find((item) => item.id === Number(card.dataset.pieceId));
    if (!piece || piece.placed) return;
    state.moves += 1;
    piece.placed = true;
    state.trayNotice = '';
    piece.x = piece.homeX;
    piece.y = piece.homeY;
    state.trayOrder = state.trayOrder?.filter((id) => id !== piece.id) ?? null;
    drawBoard();
    renderTray();
    updateCounters();
    if (state.pieces.every((item) => item.placed)) finishGame();
  }
}

function piecesPlacedCount() {
  return state.pieces.reduce((count, piece) => count + (piece.placed ? 1 : 0), 0);
}

function updateCounters() {
  const placed = piecesPlacedCount();
  const left = state.pieces.length - placed;
  const placedEl = document.querySelector('#placed-counter');
  const totalEl = document.querySelector('#total-counter');
  const leftEl = document.querySelector('#left-counter');
  const movesEl = document.querySelector('#move-counter');
  if (placedEl) placedEl.textContent = String(placed);
  if (totalEl) totalEl.textContent = String(state.pieces.length);
  if (leftEl) leftEl.textContent = String(left);
  if (movesEl) movesEl.textContent = `${state.moves} move${state.moves === 1 ? '' : 's'}`;
  const boardStatus = document.querySelector('#board-status');
  if (boardStatus) boardStatus.textContent = left === 0 ? 'Beautifully done.' : placed ? `${placed} piece${placed === 1 ? '' : 's'} in place.` : 'A little room to think.';
}

function finishGame() {
  if (state.solved) return;
  state.solved = true;
  state.edgeOnly = false;
  state.trayNotice = '';
  renderTray();
  if (state.timer) window.clearInterval(state.timer);
  state.timer = null;
  const display = document.querySelector('.js-timer');
  if (display) display.textContent = formatTime(state.seconds);
  const game = document.querySelector('.game-screen');
  if (!game) return;
  const confetti = Array.from({ length: 18 }, (_, i) => `<i class="confetti confetti-${i % 6}" style="--i:${i}"></i>`).join('');
  const overlay = document.createElement('div');
  overlay.className = 'completion-overlay';
  overlay.setAttribute('role', 'presentation');
  overlay.innerHTML = `<div class="completion-dialog" role="dialog" aria-modal="true" aria-labelledby="completion-title"><div class="celebration-art" aria-hidden="true"><div class="celebration-disc">${icon('puzzle', 42)}</div>${confetti}</div><p class="eyebrow"><span class="eyebrow-rule"></span> EVERY PIECE, IN PLACE</p><h2 id="completion-title">Lovely work.</h2><p class="completion-copy">You made something whole, one little piece at a time. Take that feeling with you.</p><div class="completion-stats"><div><span>TIME</span><strong>${formatTime(state.seconds)}</strong></div><div><span>MOVES</span><strong>${state.moves}</strong></div><div><span>PIECES</span><strong>${state.pieces.length}</strong></div></div><button class="button button-primary completion-primary" type="button" data-action="play-again">Play it again ${icon('refresh', 17)}</button><button class="text-button completion-secondary" type="button" data-action="clear-image">Choose another photo</button></div>`;
  game.appendChild(overlay);
}

function toggleBoardPreview() {
  state.boardPreview = !state.boardPreview;
  const image = document.querySelector('#board-preview-image');
  if (image) image.setAttribute('opacity', state.boardPreview ? '.24' : '0');
  const button = document.querySelector('[data-action="toggle-guide"]');
  if (button) {
    button.classList.toggle('tool-active', state.boardPreview);
    button.setAttribute('aria-pressed', String(state.boardPreview));
  }
}

function toggleEdgeFilter() {
  state.trayNotice = '';
  state.edgeOnly = !state.edgeOnly;
  renderTray(true);
}

function shuffleTray() {
  state.trayNotice = '';
  const ids = state.pieces.filter((piece) => !piece.placed).map((piece) => piece.id);
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  state.trayOrder = ids;
  renderTray(true);
}

function openPreview() {
  if (!state.imageInfo || document.querySelector('.modal-backdrop')) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';
  overlay.setAttribute('role', 'presentation');
  overlay.innerHTML = `<div class="preview-dialog" role="dialog" aria-modal="true" aria-labelledby="preview-title"><div class="modal-heading"><div><span class="step-label">A CLOSER LOOK</span><h2 id="preview-title">Original photo</h2></div><button type="button" class="modal-close" data-action="close-preview" aria-label="Close image preview">${icon('close', 20)}</button></div><div class="large-preview"><img src="${escapeHtml(state.imageInfo.src)}" alt="Full preview of ${escapeHtml(state.imageInfo.name)}"/></div><div class="modal-footer"><span>${state.imageInfo.width.toLocaleString()} × ${state.imageInfo.height.toLocaleString()} px</span><button type="button" class="button button-primary modal-done" data-action="close-preview">Back to puzzle</button></div></div>`;
  document.querySelector('.app-shell')?.appendChild(overlay);
}

function closePreview() {
  document.querySelector('.modal-backdrop')?.remove();
}

function reflowBoard(boardWidth, boardHeight, trayWidth) {
  if (!state.gameStarted || !state.imageInfo || !state.layout) return;
  const oldPieces = state.pieces;
  const edgeMap = oldPieces[0]?.edges;
  const nextLayout = calculatePlayLayout(boardWidth, boardHeight, trayWidth, state.imageInfo.width / state.imageInfo.height, DIFFICULTIES[state.difficulty].target);
  const generatedPieces = createPuzzlePieces(nextLayout, state.difficulty, Math.random, edgeMap);
  const generatedById = new Map(generatedPieces.map((piece) => [piece.id, piece]));
  // A resize changes geometry, not puzzle state: preserve the player's tray order.
  const nextPieces = oldPieces.map((previous) => {
    const next = generatedById.get(previous.id);
    if (previous.placed) {
      next.placed = true;
      next.x = next.homeX;
      next.y = next.homeY;
    }
    next.z = previous.z;
    return next;
  });
  state.layout = nextLayout;
  state.pieces = nextPieces;
  if (state.touchGesture?.timer) window.clearTimeout(state.touchGesture.timer);
  state.touchGesture = null;
  state.drag = null;
  state.dragGhost?.remove();
  state.dragGhost = null;
  drawBoard();
  renderTray();
  updateCounters();
}

function stopTimer() {
  if (state.timer) window.clearInterval(state.timer);
  state.timer = null;
}

function cleanupGame() {
  stopTimer();
  state.resizeObserver?.disconnect();
  state.resizeObserver = null;
  state.dragGhost?.remove();
  state.dragGhost = null;
  if (state.touchGesture?.timer) window.clearTimeout(state.touchGesture.timer);
  state.touchGesture = null;
  state.drag = null;
  document.removeEventListener('pointermove', onDragPointerMove);
  document.removeEventListener('pointerup', onDragPointerUp);
  document.removeEventListener('pointercancel', onDragPointerCancel);
  window.removeEventListener('resize', updateTrayState);
}

function startGame() {
  if (!state.imageInfo || state.busy) return;
  closePreview();
  state.gameStarted = true;
  state.boardPreview = false;
  renderGame();
}

function resetImageState() {
  state.loadSequence += 1;
  if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
  state.objectUrl = null;
  state.imageInfo = null;
  state.gameStarted = false;
  state.pieces = [];
  state.layout = null;
  state.solved = false;
  state.moves = 0;
  state.seconds = 0;
  state.busy = false;
  state.error = '';
  closePreview();
  cleanupGame();
  renderSetup();
}

function selectSample() {
  state.loadSequence += 1;
  if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
  state.objectUrl = null;
  state.imageInfo = { src: SAMPLE_IMAGE, width: 1200, height: 800, name: 'Coastal evening · sample', size: 0, isSample: true };
  state.gameStarted = false;
  state.pieces = [];
  state.solved = false;
  state.moves = 0;
  state.seconds = 0;
  state.busy = false;
  state.error = '';
  closePreview();
  renderSetup();
}

function acceptImage(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    state.error = 'That file does not look like an image. Choose a JPG, PNG, GIF, WebP, or another browser-supported image.';
    renderSetup();
    return;
  }
  if (file.size > 30 * 1024 * 1024) {
    state.error = 'That image is over 30 MB. Please choose a smaller file for the smoothest puzzle experience.';
    renderSetup();
    return;
  }
  state.loadSequence += 1;
  const sequence = state.loadSequence;
  state.error = '';
  state.busy = true;
  state.gameStarted = false;
  state.pieces = [];
  state.solved = false;
  state.moves = 0;
  state.seconds = 0;
  closePreview();
  renderSetup();
  const nextUrl = URL.createObjectURL(file);
  const probe = new Image();
  probe.onload = () => {
    if (sequence !== state.loadSequence) { URL.revokeObjectURL(nextUrl); return; }
    if (!probe.naturalWidth || !probe.naturalHeight) {
      URL.revokeObjectURL(nextUrl);
      state.busy = false;
      state.error = 'This image could not be read by your browser. Try saving it as JPG or PNG.';
      renderSetup();
      return;
    }
    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
    state.objectUrl = nextUrl;
    state.imageInfo = { src: nextUrl, width: probe.naturalWidth, height: probe.naturalHeight, name: file.name, size: file.size, isSample: false };
    state.busy = false;
    state.error = '';
    renderSetup();
  };
  probe.onerror = () => {
    URL.revokeObjectURL(nextUrl);
    if (sequence !== state.loadSequence) return;
    state.busy = false;
    state.error = 'This image could not be opened. Try another image format.';
    renderSetup();
  };
  probe.src = nextUrl;
}

function handleClick(event) {
  const actionEl = event.target.closest('[data-action]');
  if (!actionEl) {
    if (event.target.classList.contains('modal-backdrop')) closePreview();
    return;
  }
  const action = actionEl.dataset.action;
  switch (action) {
    case 'sample': selectSample(); break;
    case 'clear-image': resetImageState(); break;
    case 'difficulty':
      state.difficulty = actionEl.dataset.difficulty;
      state.gameStarted = false;
      state.pieces = [];
      state.solved = false;
      state.moves = 0;
      state.seconds = 0;
      renderSetup();
      break;
    case 'start': startGame(); break;
    case 'restart':
      if (state.solved || window.confirm('Restart this puzzle? Your current placement will be lost.')) startGame();
      break;
    case 'play-again': startGame(); break;
    case 'toggle-edges': toggleEdgeFilter(); break;
    case 'toggle-tray':
      if (window.matchMedia('(max-width: 760px)').matches) state.trayExpanded = !state.trayExpanded;
      else state.trayCollapsed = !state.trayCollapsed;
      updateTrayState();
      break;
    case 'shuffle': shuffleTray(); break;
    case 'back':
      state.gameStarted = false;
      state.pieces = [];
      state.solved = false;
      closePreview();
      renderSetup();
      break;
    case 'toggle-guide': toggleBoardPreview(); break;
    case 'preview': openPreview(); break;
    case 'close-preview': closePreview(); break;
    default: break;
  }
}

root.addEventListener('click', handleClick);
root.addEventListener('change', (event) => {
  if (event.target.matches('#image-upload')) {
    const file = event.target.files?.[0];
    event.target.value = '';
    acceptImage(file);
  }
});
root.addEventListener('dragover', (event) => {
  const zone = event.target.closest('.dropzone');
  if (!zone) return;
  event.preventDefault();
  state.dragOver = true;
  zone.classList.add('is-dragging');
});
root.addEventListener('dragleave', (event) => {
  const zone = event.target.closest('.dropzone');
  if (!zone || zone.contains(event.relatedTarget)) return;
  state.dragOver = false;
  zone.classList.remove('is-dragging');
});
root.addEventListener('drop', (event) => {
  if (!event.target.closest('.dropzone')) return;
  event.preventDefault();
  state.dragOver = false;
  acceptImage(event.dataTransfer?.files?.[0]);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closePreview();
});
window.addEventListener('pagehide', () => {
  cleanupGame();
  if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
});

renderSetup();
