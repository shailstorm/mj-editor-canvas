# Midjourney editor prototype

A fresh React + Vite frontend rebuilt from the **FINAL SCREENS** in [mj-takehome](https://www.figma.com/design/4H2ajvLbP3jvSahKDN30D0/mj-takehome?node-id=9-1336). The design reference viewport is **1600 × 1043**. Controls keep their pixel sizes as the window resizes; the space around the centered canvas contracts. Canvas magnification changes only through the zoom controls and gestures. Narrow windows use tighter toolbar spacing and horizontal scrolling when needed; floating prompts and image actions stay within the workspace.

## Run

```sh
npm install
npm run dev
```

Open the URL printed by Vite. The editor starts with the current photo and no selection, prompt, references, or generated variations. **All Projects** shows the current canvas and an image uploader.

Navigation icons are muted, static placeholders on desktop and mobile. Help opens the keyboard shortcuts panel from the bottom right on desktop and beneath the zoom control on mobile.

## Publish on shay.city

Publish this editor in its own GitHub repository and connect it to a separate Vercel project. `vercel.json` configures the Vite build, output directory, and routes for `/editor-canvas`. The editor's source stays independent of `shailstorm/shaysite`.

To verify the production build locally:

```sh
npm run build:production
```

The editor's Vercel production domain is `mj-editor-canvas.vercel.app`. Add these rewrites to the existing Next.js configuration in shaysite. This stable domain continues to point at the editor's latest production deployment.

```js
async rewrites() {
  return [
    {
      source: '/editor-canvas',
      destination: 'https://mj-editor-canvas.vercel.app/editor-canvas',
    },
    {
      source: '/editor-canvas/:path*',
      destination: 'https://mj-editor-canvas.vercel.app/editor-canvas/:path*',
    },
  ]
},
```

`deployment/shaysite.patch` contains the routing change for the current local shaysite checkout. It also removes the former embedded build hook and ignores the preserved local editor snapshot. Apply it with:

```sh
git -C /Users/shay/dev/shaysite apply /Users/shay/dev/mj/editor-redesign-canvas/deployment/shaysite.patch
```

Commit and push this editor's deployment configuration first, then deploy the shaysite configuration change. Visitors can then use `https://shay.city/editor-canvas` while the editor loads as a standalone page. The current apex-to-www redirect on shay.city still applies.

Subsequent commits pushed to the editor repository's Vercel production branch (typically `main`) automatically update the editor at this URL. Shaysite does not need to be redeployed for those updates. Local file saves alone do not deploy. Production must be publicly accessible so shaysite can proxy it.

## Try the flow

1. Select a photo and click its orange sparkle to open the prompt, or draw a region. Type your edit, or type `/` for a prompt suggestion.
2. Use the attachment button to upload references. Hover a reference photo to remove it or adjust its weight using the slider inside its bottom edge. Each photo has an independent 0–100% weight, starting at 50%; a slider drag is one undoable change. Controls also appear on keyboard focus and remain visible on touch screens. The reference heading and upload tile appear only while at least one reference is attached; removing the last one collapses the card.
3. Submit to append four prepared variations below the existing images. The view stays in place; pan down or choose **Fit canvas** from the zoom menu to see the results.
4. With **Select (V)**, click a photo to select it and drag it to move it. Dragging a selected group moves all of its photos together. Drag empty canvas to select the photos the rectangle touches. Shift-click toggles a photo in the selection; Shift-drag on empty canvas adds photos. Clicking empty canvas clears the selection and hides the prompt and image operations. Download, delete, or open selected photos for editing.
5. Use Undo/Redo to restore document changes without resetting the viewport.

Whole-photo selections show image operations; click the orange sparkle to replace them with a prompt centered below the selected photo or group. Completed rectangle, lasso, and magic-wand regions open their prompt automatically centered below the region.

Drag a whole-photo selection's corner handles to resize it proportionally. Groups scale together around the opposite corner. With the rectangle tool, drag inside a selected region to reposition it, or drag its corners to resize it freely within the photo. Each drag is one undoable change; Escape cancels it.

With **Select (V)** active, double-click a source photo or variation to crop it. The full original stays visible at lower opacity outside the crop; drag the photo to reposition it behind the fixed crop window, or adjust the edges and corners. Click outside the photo to finish; there are no crop confirmation or cancellation buttons. The original pixels remain available when cropping again, even after moving or resizing the photo. **Expand (X)** opens a rectangle editor: draw the bounds or drag any edge beyond the photo, with checkerboard space previewing the empty areas. **Apply expansion** keeps the visible photo pixels in place and opens a prompt for the empty area. Enter applies either edit; Escape discards the preview. Applying creates one undoable edit and preserves the photo's pixel resolution.

Tools: **V** select and move photos, **H** pan, **M** select a rectangular region, **L** draw a freehand region outline, **W** select a connected color region with the magic wand, **X** expand the image area. Drag the rectangle tool inside a photo to select a region, or on empty canvas to select whole photos within the rectangle. Drag the lasso around an area and release to close the outline and select its interior. The prompt appears after completing a region selection; image operations are reserved for whole photos. Region tools work on source photos and generated variations. The wand uses a fixed tolerance of 12. Hold **Space** to pan. Scroll pans; Ctrl/Command + scroll zooms. The zoom menu resets the view. Command/Ctrl + Z undoes, Shift + Command/Ctrl + Z redoes, and Delete removes selected photos.

## Frontend scope

- Uses the original Figma photos, reference thumbnails, SVG icons, texture, and locally hosted DM Sans fonts. No temporary Figma URLs are used at runtime.
- Prompt submission is a local, simulated preview using the four supplied Figma results. The prompt does not change these images yet.
- Magic-wand selection runs locally on connected pixels with similar colors. Its actual mask is stored in the document and drawn as a tinted overlay with a dashed outline; the original photo stays unchanged. This is color selection; semantic object segmentation is not connected yet. Image expansion displays the extra canvas area; it does not synthesize new pixels.
- Uploads, references, selection, and edit history live in memory for the current browser session. There is no backend, authentication, model call, or persistence yet.
- The original prototype is backed up at `/private/tmp/mj-prototype-backup` on the development machine.

## Code structure

`src/App.jsx` is the application entry point. `src/editor/Editor.jsx` composes the editor and connects its controls.

```text
src/editor/
  components/  Canvas, toolbar, navigation, prompt, references, and dialogs
  hooks/       Editor commands, history, gestures, viewport, shortcuts, generation, and toast
  model/       Document operations, history reducer, geometry, layout, tools, and asset references
  services/    Image file handling and the simulated generation request
  styles/      Readable styles grouped by canvas, controls, prompt, navigation, and dialogs
```

Components render their inputs and call event handlers. `useEditor` coordinates document commands; `useCanvasGestures` owns pointer and wheel handling. The history reducer keeps document changes immutable. Dragging previews intermediate states and commits one undo entry on release.

Change `services/generation.js` when connecting the backend. It accepts the current document and an abort signal, then returns result objects. Request cancellation and loading state live in `useGeneration`, separate from the UI.

## Validation

```sh
npm test
npm run lint
npm run build
```

Tests cover clean startup, prompt and reference rendering, selection and viewport geometry, appended result batches, editing results in place, undo/redo and grouped drags, cancelled generation, independent project state, and local asset integrity. Prepared document states are test fixtures only. Browser screenshot comparison remains pending: the automated browser connection was unavailable during this build, so exact rendered pixel parity has not yet been verified.
