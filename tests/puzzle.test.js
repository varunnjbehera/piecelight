import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chooseGrid,
  createEdgeMap,
  createPuzzlePieces,
  calculateStageLayout,
  calculatePlayLayout,
  makePiecePath,
  formatTime,
  resolveTrayPieces,
} from '../src/puzzle.js';

const seededRandom = (seed = 7) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

test('difficulty grids stay close to the requested piece counts', () => {
  for (const target of [12, 30, 60]) {
    const grid = chooseGrid(16 / 9, target);
    assert.ok(Math.abs(grid.count - target) <= 4, `${target} requested, received ${grid.count}`);
    assert.equal(grid.count, grid.rows * grid.cols);
    assert.ok(grid.rows >= 2 && grid.cols >= 2);
  }
});

test('portrait, square, and landscape boards preserve the source aspect ratio', () => {
  for (const [width, aspect] of [[390, 0.5], [1000, 1], [1280, 16 / 9]]) {
    const mobile = width < 760;
    const layout = calculateStageLayout(width, aspect, 30, mobile);
    assert.ok(Math.abs(layout.puzzleW / layout.puzzleH - aspect) < 1e-8);
    assert.ok(layout.boardX >= 0 && layout.boardY >= 0);
    assert.ok(layout.trayColumns >= 1);
  }
});


test('v2 play layout fits portrait, square, and landscape boards while scaling tray thumbnails', () => {
  for (const aspect of [0.48, 1, 1.85]) {
    const layout = calculatePlayLayout(700, 430, 320, aspect, 30);
    assert.ok(Math.abs(layout.puzzleW / layout.puzzleH - aspect) < 1e-8);
    assert.ok(layout.svgWidth > layout.puzzleW && layout.svgHeight > layout.puzzleH);
    assert.ok(layout.trayColumns >= 1);
    assert.ok(layout.traySlotW < layout.slotW);
    assert.ok(layout.traySlotH < layout.slotH);
    assert.equal(layout.count, layout.rows * layout.cols);
  }
});

test('generated pieces have closed paths, unique tray slots, and distinct homes', () => {
  const layout = calculateStageLayout(390, 4 / 3, 30, true);
  const pieces = createPuzzlePieces(layout, 'medium', seededRandom());
  assert.equal(pieces.length, layout.count);
  assert.equal(new Set(pieces.map((piece) => piece.slot)).size, pieces.length);
  assert.equal(new Set(pieces.map((piece) => `${piece.homeX},${piece.homeY}`)).size, pieces.length);
  for (const piece of pieces) {
    assert.ok(piece.path.startsWith('M 0 0'));
    assert.ok(piece.path.endsWith('Z'));
    assert.doesNotMatch(piece.path, /NaN|Infinity/);
    assert.equal(piece.placed, false);
  }
});

test('shared edge signatures are complementary and the outer edges are flat', () => {
  const rows = 4;
  const cols = 6;
  const edges = createEdgeMap(rows, cols, seededRandom(19));
  for (let r = 1; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) assert.ok([-1, 1].includes(edges.horizontal[r][c]));
  }
  for (let r = 0; r < rows; r += 1) {
    for (let c = 1; c < cols; c += 1) assert.ok([-1, 1].includes(edges.vertical[r][c]));
  }
  assert.ok(edges.horizontal[0].every((edge) => edge === 0));
  assert.ok(edges.horizontal[rows].every((edge) => edge === 0));
  assert.ok(edges.vertical.every((row) => row[0] === 0 && row[cols] === 0));
  const topPiece = makePiecePath({ row: 0, col: 2, rows, cols, tileW: 50, tileH: 42, edges });
  const bottomPiece = makePiecePath({ row: 1, col: 2, rows, cols, tileW: 50, tileH: 42, edges });
  assert.ok(topPiece.length > 30 && bottomPiece.length > 30);
});

test('clock formatting remains readable past an hour', () => {
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(65), '01:05');
  assert.equal(formatTime(3599), '59:59');
  assert.equal(formatTime(3600), '1:00:00');
  assert.equal(formatTime(3661), '1:01:01');
  assert.equal(formatTime(-1), '00:00');
});


test('edge-only filtering shows edge pieces while any remain', () => {
  const pieces = [
    { id: 0, row: 0, col: 0, placed: false },
    { id: 1, row: 1, col: 1, placed: false },
    { id: 2, row: 0, col: 2, placed: false },
    { id: 3, row: 1, col: 2, placed: true },
  ];
  const result = resolveTrayPieces(pieces, 3, 3, true);
  assert.deepEqual(result.pieces.map((piece) => piece.id), [0, 2]);
  assert.equal(result.edgeOnly, true);
  assert.equal(result.autoCleared, false);
});

test('edge-only filter automatically falls back when only interior pieces remain', () => {
  const pieces = [
    { id: 0, row: 1, col: 1, placed: false },
    { id: 1, row: 1, col: 2, placed: false },
    { id: 2, row: 0, col: 0, placed: true },
    { id: 3, row: 2, col: 2, placed: true },
  ];
  const result = resolveTrayPieces(pieces, 3, 4, true);
  assert.deepEqual(result.pieces.map((piece) => piece.id), [0, 1]);
  assert.equal(result.edgeOnly, false);
  assert.equal(result.autoCleared, true);
});

test('edge-only filter clears harmlessly when the puzzle is actually complete', () => {
  const pieces = [
    { id: 0, row: 0, col: 0, placed: true },
    { id: 1, row: 1, col: 1, placed: true },
  ];
  const result = resolveTrayPieces(pieces, 2, 2, true);
  assert.deepEqual(result.pieces, []);
  assert.equal(result.edgeOnly, false);
  assert.equal(result.autoCleared, false);
});
