# Piecelight v3.3.0 — Photo Jigsaw Puzzle

A responsive, browser-only jigsaw game built with vanilla JavaScript, HTML, CSS, and SVG. The project has **zero runtime or build dependencies** and deploys to Vercel as a static site. No backend, database, accounts, analytics, or remote image storage are used.

## Run locally

Requires Node.js 18 or newer.

```bash
npm run dev
```

Open the local URL printed by the command (usually `http://localhost:5173`). No `npm install` is needed because the project deliberately has no external dependencies.

## Test and build

```bash
npm test
npm run build
npm run preview
```

`npm test` runs puzzle geometry, tray-filter state, and UI/layout regression tests. `npm run build` creates a clean `dist/` folder. `npm run preview` serves the production build on port 4173.

## Deploy to Vercel

Import the project or repository into Vercel. The included `vercel.json` defines:

- **Build command:** `npm run build`
- **Output directory:** `dist`

No environment variables or external services are required.

## Gameplay

- Upload a photo from your device or try the built-in sample image.
- Select Easy (~12 pieces), Medium (~30), or Hard (~60). The grid adapts to the photograph's proportions and uses the closest practical count.
- Pieces have actual complementary jigsaw tabs and image-clipping paths, not square-grid placeholders.
- Drag pieces with a mouse or touch. The lifted piece moves above the board/tray and snaps into its correct position when close enough.
- Correctly placed pieces stay locked. The game tracks time, moves, placed pieces, and displays a completion screen when all pieces are placed.
- Keyboard users can focus a loose piece and press Enter/Space for placement assistance.

## v3.2.0 UX polish

- Removed the marketing-style hero and footer: setup opens directly into the puzzle launcher.
- The solution photo is **not shown on the board by default**. `Picture guide` toggles a low-opacity guide on demand; `View original` opens the full-size photo in a dialog.
- Explicit “PHOTO JIGSAW PUZZLE” product label in the app chrome, plus a compact “Create a jigsaw puzzle” launcher title without a redundant eyebrow.
- A more distinct game-workbench art direction: dark pine app chrome, warm paper setup surface, high-contrast filled difficulty selection, flatter controls, and a dark piece rack.
- Removed redundant board frames: the jigsaw rectangle has one clear perimeter; the containing panel and viewport no longer draw nested borders.
- The board and loose-piece tray are separate surfaces. The board remains stable while the tray scrolls independently; the page itself does not scroll.
- Desktop uses a collapsible right-hand piece tray; mobile uses a compact bottom tray that can expand/collapse.
- On mobile, piece tiles are smaller in the tray and lift to full board scale during dragging. A dedicated tray grip adjusts the tray without stealing direct piece drags.
- Loose pieces are all rendered in one continuous, independently scrollable rack. No pagination or artificial piece pages.
- Edge-only filtering and tray shuffle help organize loose pieces.
- Setup and gameplay are fixed, viewport-fitted app surfaces. No document-level scrolling is used; the piece picker retains its own contained scrolling.
- Short landscape windows and phones switch to a compact two-pane layout so controls remain visible without introducing page scrolling.

## Privacy and resource handling

Uploaded files are read by the browser and represented by temporary `blob:` object URLs. They are never sent to a server. Replacing an image or leaving the page revokes the previous object URL. The sample image is an embedded SVG data URL. The app caps image uploads at 30 MB to avoid heavy local decoding and preserves the image's original aspect ratio in the preview and puzzle board.

### v3.2.0 polish details

- Removed the duplicate decorative icon beside the upload heading.
- Moved the Start your puzzle action directly below the difficulty summary instead of pinning it to the bottom of the column.
- Renamed the on-board guide control to **Picture guide** and the full-size image action to **View original**.
- Removed the non-interactive “Fit to screen” label.
- Replaced the shuffle control's circular-arrow icon with a shuffle icon and clarified its accessible name.
- Removed “One piece at a time” filler from the piece tray footer.
- Hide the scroll hint on desktop (where the scrollbar is visible) and retain it in mobile layouts where it is useful.
- Strengthened the board's outer perimeter and softened the placement-guide strokes to distinguish board boundary from piece outlines.
- Added regression tests for the updated labels, redundant copy/icon removal, CTA placement, and clearer tray actions.


## v3.3.0 correctness and code-review fixes

- Edge-only mode automatically turns off when no loose edge pieces remain and restores all remaining loose pieces.
- The tray never claims that all pieces are placed when a filter would otherwise leave the visible rack empty; the empty-state text is based on actual puzzle state. The automatic fallback visibly labels the rack “All pieces · no edges left” until the next piece/filter/shuffle action.
- A screen-reader live region announces the automatic edge-filter fallback.
- Changing the filter or shuffling resets the tray to the top; placing pieces preserves the current browse position.
- Resizing the board regenerates piece geometry while preserving the existing tray order and placed-piece state.
- Time formatting switches to `H:MM:SS` after one hour.
- Removed unused state, dead hint styling, and a stale counter update for an element no longer in the UI.
- Added regression tests for edge-filter fallback, true completion state, tray reset behavior, resize-order preservation, and mobile gesture intent.
- On touch devices, quick swipes scroll the piece rack; a short hold lifts a piece for dragging, preventing every swipe over a piece from becoming an accidental drag.
