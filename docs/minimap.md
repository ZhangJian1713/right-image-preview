# Minimap viewport drag (design notes)

This document explains why the navigation minimap behaves the way it does in embedded browsers (e.g. VS Code / Cursor WebView) and after rotation. It is meant for maintainers changing `Minimap.tsx` or `minimapMath.ts`.

## Goals

- While dragging the viewport frame on the minimap, it should track the pointer **1:1** in minimap space.
- After **pointer up** (including a click with no movement), the UI must leave **grabbing** state and stop listening for moves.

## Problem 1: Stuck “grabbing” and phantom drags

**Symptom:** After a simple press–release, the cursor stayed `grabbing`, and the frame sometimes kept moving with the pointer at several times the correct speed.

**Cause:** The handler called `preventDefault()` on **`pointerdown`**. In Chromium-based hosts, that **suppresses the compatibility mouse event sequence** (including **`mouseup`**). The old implementation ended the drag only on **`mouseup`** for mouse input. Then:

- **`mouseup` never ran** → drag listeners were never removed → `viewportDragging` stayed `true`.
- **`mousemove` could still fire** → every move kept applying pan → broken speed and “dragging while released”.

**Fix:** Drive the drag session **only** with **Pointer Events** on `window` (`pointermove` / `pointerup` / `pointercancel`, capture phase). Optionally use **`setPointerCapture`** on the handle so the stream stays coherent when the pointer leaves the element. Still listen to **`window` `blur`** to tear down if the embedder steals focus.

Do **not** rely on **`mouseup`** after **`preventDefault()`** on **`pointerdown`**.

## Problem 2: Frame moves faster than the pointer (e.g. ~3×)

**Symptom:** Dragging felt like a magnified pan; especially with **rotation**.

**Cause:** An old shortcut used **`kx = cw / bw`** (and `ky` with `bh`), where **`bw` / `bh`** were the **axis-aligned bounding box (AABB)** of the viewport quad on the minimap. For a **rotated** viewport, the AABB can be **much narrower** along one axis than the true scale from “container translate” to “minimap motion”. That made **`kx` too large** → too much pan per pixel of pointer movement.

**Fix:** Stop using the quad AABB for pan gain. Instead, linearise the map from **`(tx, ty)`** to the **viewport centre** on the minimap:

\[
\begin{bmatrix} dm_x \\ dm_y \end{bmatrix}
\approx J \begin{bmatrix} dtx \\ dty \end{bmatrix},
\quad
J = \begin{bmatrix} \partial m_x/\partial tx & \partial m_x/\partial ty \\ \partial m_y/\partial tx & \partial m_y/\partial ty \end{bmatrix}
\]

We approximate \(J\) with small finite differences on **`tx`** and **`ty`**, then apply **`[dtx, dty]^T = J^{-1} [dm_x, dm_y]^T`** to match the pointer delta **`(dm_x, dm_y)`** (same as client delta when the minimap is not independently scaled). The centre is mapped **without clamping** to natural bounds so derivatives stay stable near image edges.

See **`panDeltaFromMinimapPointerDelta`** in `minimapMath.ts`.

## If 1:1 breaks again

- **CSS `transform: scale` or `zoom`** on an ancestor of the minimap: client deltas may not match minimap user units; scale **`(dm_x, dm_y)`** by **`innerSize / getBoundingClientRect().width`** (and height) before calling **`panDeltaFromMinimapPointerDelta`**.

## Pan limits vs. dragging the main image

Tuning lives in **`src/components/ImagePreview/imagePreviewTuning.ts`**.

After each minimap-driven `panByDelta`, **`useImageTransform`** clamps translate using **`MINIMAP_PAN_MIN_VIEWPORT_COVERAGE`** (derived from **`MINIMAP_PAN_MAX_VIEWPORT_BACKGROUND_FRACTION`**, default **10%** background allowed per axis when the image is large enough). Very thin or short images may still expose more — the model caps requirements at **`scaledDim/2`**.

Dragging the **main** picture uses **`MAIN_DRAG_MIN_VIEWPORT_COVERAGE`** (default **50%** per axis), looser than the minimap path.

## Related files

- `src/components/ImagePreview/Minimap.tsx` — UI, pointer session lifecycle.
- `src/components/ImagePreview/minimapMath.ts` — coordinate transforms and Jacobian-based pan delta.
