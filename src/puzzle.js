export const DIFFICULTIES = {
  easy: { label: 'Easy', target: 12, note: 'A gentle warm-up' },
  medium: { label: 'Medium', target: 30, note: 'A little more focus' },
  hard: { label: 'Hard', target: 60, note: 'For the detail lovers' },
};

/** Choose a practical grid close to the target count while respecting image aspect ratio. */
export function chooseGrid(aspectRatio, target, maxDimension = 15) {
  const aspect = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  let best = { cols: 4, rows: 3, count: 12, score: Infinity };
  for (let rows = 2; rows <= maxDimension; rows += 1) {
    for (let cols = 2; cols <= maxDimension; cols += 1) {
      const count = rows * cols;
      // Piece count matters most; the second term avoids needlessly narrow/tall pieces.
      const countPenalty = Math.abs(count - target) * 1.25;
      const shapePenalty = Math.abs(Math.log((cols / rows) / aspect)) * 2.8;
      // Very extreme grids are less practical on small screens.
      const extremePenalty = (cols > 12 || rows > 12) ? 1.5 : 0;
      const score = countPenalty + shapePenalty + extremePenalty;
      if (score < best.score) best = { cols, rows, count, score };
    }
  }
  return { cols: best.cols, rows: best.rows, count: best.count };
}

export function createEdgeMap(rows, cols, random = Math.random) {
  const horizontal = Array.from({ length: rows + 1 }, (_, r) =>
    Array.from({ length: cols }, () => (r === 0 || r === rows ? 0 : random() < 0.5 ? -1 : 1)),
  );
  const vertical = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols + 1 }, (_, c) => (c === 0 || c === cols ? 0 : random() < 0.5 ? -1 : 1)),
  );
  return { horizontal, vertical };
}

function edgeSegment(x1, y1, x2, y2, nx, ny, sign, tabDepth) {
  const point = (t, depth = 0) => [
    x1 + (x2 - x1) * t + nx * depth * sign,
    y1 + (y2 - y1) * t + ny * depth * sign,
  ];
  const fmt = ([x, y]) => `${x.toFixed(3)} ${y.toFixed(3)}`;
  if (!sign) return `L ${fmt([x2, y2])}`;
  const p = (t, d = 0) => fmt(point(t, d * tabDepth));
  return [
    `L ${p(0.34)}`,
    `C ${p(0.39, 0)} ${p(0.39, 0.34)} ${p(0.425, 0.52)}`,
    `C ${p(0.447, 0.83)} ${p(0.465, 1)} ${p(0.5, 1)}`,
    `C ${p(0.535, 1)} ${p(0.553, 0.83)} ${p(0.575, 0.52)}`,
    `C ${p(0.61, 0.34)} ${p(0.61, 0)} ${p(0.66, 0)}`,
    `L ${fmt([x2, y2])}`,
  ].join(' ');
}

/** Path in piece-local coordinates. Adjacent pieces share opposite, matching edge profiles. */
export function makePiecePath({ row, col, rows, cols, tileW, tileH, edges }) {
  const { horizontal, vertical } = edges;
  const top = row === 0 ? 0 : -horizontal[row][col];
  const right = col === cols - 1 ? 0 : vertical[row][col + 1];
  const bottom = row === rows - 1 ? 0 : horizontal[row + 1][col];
  const left = col === 0 ? 0 : -vertical[row][col];
  const tabDepth = Math.min(tileW, tileH) * 0.22;
  return [
    'M 0 0',
    edgeSegment(0, 0, tileW, 0, 0, -1, top, tabDepth),
    edgeSegment(tileW, 0, tileW, tileH, 1, 0, right, tabDepth),
    edgeSegment(tileW, tileH, 0, tileH, 0, 1, bottom, tabDepth),
    edgeSegment(0, tileH, 0, 0, -1, 0, left, tabDepth),
    'Z',
  ].join(' ');
}

/**
 * Resolve the loose-piece tray filter without ever hiding all remaining pieces.
 * If the edge-only view becomes empty while loose pieces still exist, fall back
 * to the full loose-piece list and report that the filter should turn itself off.
 */
export function resolveTrayPieces(pieces, rows, cols, edgeOnly) {
  const loosePieces = pieces.filter((piece) => !piece.placed);
  if (!edgeOnly) {
    return { pieces: loosePieces, edgeOnly: false, autoCleared: false };
  }

  if (loosePieces.length === 0) {
    return { pieces: [], edgeOnly: false, autoCleared: false };
  }

  const edgePieces = loosePieces.filter((piece) =>
    piece.row === 0 || piece.row === rows - 1 || piece.col === 0 || piece.col === cols - 1,
  );
  if (edgePieces.length > 0) {
    return { pieces: edgePieces, edgeOnly: true, autoCleared: false };
  }

  return { pieces: loosePieces, edgeOnly: false, autoCleared: true };
}

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function fitImage(aspect, maxW, maxH) {
  let width = maxW;
  let height = width / aspect;
  if (height > maxH) {
    height = maxH;
    width = height * aspect;
  }
  return { width, height };
}

/** Geometry for a viewport-fitted board and an independently scrollable HTML piece tray. */
export function calculatePlayLayout(boardWidth, boardHeight, trayWidth, aspectRatio, targetCount) {
  const availableW = Math.max(180, Number(boardWidth) || 360);
  const availableH = Math.max(160, Number(boardHeight) || 320);
  const aspect = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  const grid = chooseGrid(aspect, targetCount);
  const puzzleSize = fitImage(aspect, availableW - 28, availableH - 28);
  const puzzleW = puzzleSize.width;
  const puzzleH = puzzleSize.height;
  const tileW = puzzleW / grid.cols;
  const tileH = puzzleH / grid.rows;
  const tabDepth = Math.min(tileW, tileH) * 0.22;
  const pad = tabDepth + 7;
  const slotW = tileW + 2 * pad;
  const slotH = tileH + 2 * pad;
  const innerTrayWidth = Math.max(100, Number(trayWidth) || 300);
  // The tray thumbnails are slightly smaller than their final board scale, so the
  // sidebar can show multiple columns without making the board itself tiny.
  const trayPieceScale = innerTrayWidth > 500 ? 0.86 : 0.84;
  const traySlotW = slotW * trayPieceScale;
  const traySlotH = slotH * trayPieceScale;
  const trayColumns = Math.max(1, Math.floor((innerTrayWidth + 8) / (traySlotW + 8)));
  const trayRows = Math.ceil(grid.count / trayColumns);
  return {
    ...grid,
    width: puzzleW + 2 * pad,
    height: puzzleH + 2 * pad,
    svgWidth: puzzleW + 2 * pad,
    svgHeight: puzzleH + 2 * pad,
    boardX: 0,
    boardY: 0,
    puzzleW,
    puzzleH,
    tileW,
    tileH,
    tabDepth,
    pad,
    slotW,
    slotH,
    trayPieceScale,
    traySlotW,
    traySlotH,
    trayX: 0,
    trayY: 0,
    trayW: innerTrayWidth,
    trayH: trayRows * (slotH + 8),
    trayColumns,
    trayRows,
    mobile: innerTrayWidth < 520,
  };
}

/** Responsive SVG stage geometry retained for geometry tests and compatibility. */
export function calculateStageLayout(stageWidth, aspectRatio, targetCount, mobile = stageWidth < 760) {
  const width = Math.max(280, stageWidth || 360);
  const aspect = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  const grid = chooseGrid(aspect, targetCount);
  const puzzleSize = mobile
    ? fitImage(aspect, width - 36, 300)
    : fitImage(aspect, Math.min(width * 0.57, 590), 580);
  const tileW = puzzleSize.width / grid.cols;
  const tileH = puzzleSize.height / grid.rows;
  const tabDepth = Math.min(tileW, tileH) * 0.22;
  const slotW = tileW + 2 * tabDepth + 8;
  const slotH = tileH + 2 * tabDepth + 12;

  if (mobile) {
    const boardX = (width - puzzleSize.width) / 2;
    const boardY = 22;
    const trayX = 16;
    const trayW = width - 32;
    const trayY = boardY + puzzleSize.height + 82;
    const columns = Math.max(1, Math.floor((trayW - 8) / slotW));
    const trayRows = Math.ceil(grid.count / columns);
    const trayH = Math.max(220, trayRows * slotH + 10);
    return {
      ...grid, width, height: trayY + trayH + 20, boardX, boardY,
      puzzleW: puzzleSize.width, puzzleH: puzzleSize.height,
      tileW, tileH, tabDepth, trayX, trayY, trayW, trayH,
      slotW, slotH, trayColumns: columns, trayRows, mobile: true,
    };
  }

  const boardX = 24;
  const boardY = 30;
  const trayX = boardX + puzzleSize.width + 52;
  const trayW = Math.max(slotW, width - trayX - 20);
  const trayY = 28;
  const columns = Math.max(1, Math.floor((trayW - 4) / slotW));
  const trayRows = Math.ceil(grid.count / columns);
  const trayH = Math.max(560, trayRows * slotH + 12);
  const height = Math.max(640, trayY + trayH + 24, puzzleSize.height + 80);
  return {
    ...grid, width, height, boardX, boardY,
    puzzleW: puzzleSize.width, puzzleH: puzzleSize.height,
    tileW, tileH, tabDepth, trayX, trayY, trayW, trayH,
    slotW, slotH, trayColumns: columns, trayRows, mobile: false,
  };
}

export function createPuzzlePieces(layout, difficultyKey, random = Math.random, edgesOverride = null) {
  const edges = edgesOverride || createEdgeMap(layout.rows, layout.cols, random);
  const slotIndexes = shuffle(Array.from({ length: layout.count }, (_, i) => i), random);
  const pieces = [];
  for (let row = 0; row < layout.rows; row += 1) {
    for (let col = 0; col < layout.cols; col += 1) {
      const id = row * layout.cols + col;
      const slot = slotIndexes[id];
      const slotCol = slot % layout.trayColumns;
      const slotRow = Math.floor(slot / layout.trayColumns);
      // Small jitter makes the tray feel scattered without hiding or stacking pieces.
      const jitterX = (random() - 0.5) * Math.min(5, layout.slotW * 0.12);
      const jitterY = (random() - 0.5) * Math.min(5, layout.slotH * 0.1);
      const x = layout.trayX + slotCol * layout.slotW + layout.tabDepth + 3 + jitterX;
      const y = layout.trayY + slotRow * layout.slotH + layout.tabDepth + 3 + jitterY;
      pieces.push({
        id, row, col, slot, x, y, homeX: layout.boardX + col * layout.tileW,
        homeY: layout.boardY + row * layout.tileH, placed: false, z: id, edges,
        path: makePiecePath({ row, col, rows: layout.rows, cols: layout.cols,
          tileW: layout.tileW, tileH: layout.tileH, edges }),
        difficultyKey,
      });
    }
  }
  return shuffle(pieces, random).map((piece, index) => ({ ...piece, z: index }));
}

export function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safeSeconds / 3600);
  const mins = Math.floor((safeSeconds % 3600) / 60).toString().padStart(2, '0');
  const secs = (safeSeconds % 60).toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${mins}:${secs}` : `${mins}:${secs}`;
}
