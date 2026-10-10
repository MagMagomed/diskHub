import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isShortPhotoTap } from '../src/utils/photoActions.js';

test('a short touch tap can be distinguished from a swipe gesture', () => {
  const start = { x: 120, y: 200 };
  const end = { x: 124, y: 203 };
  assert.equal(isShortPhotoTap(start, end, 180), true);
  assert.equal(isShortPhotoTap(start, { x: 180, y: 204 }, 180), false);
});

test('long presses and touch movement are not classified as taps', () => {
  assert.equal(isShortPhotoTap({ x: 100, y: 100 }, { x: 110, y: 105 }, 180), true);
  assert.equal(isShortPhotoTap({ x: 100, y: 100 }, { x: 113, y: 100 }, 180), false);
  assert.equal(isShortPhotoTap({ x: 100, y: 100 }, { x: 102, y: 102 }, 500), false);
});

test('malformed tap coordinates are rejected', () => {
  assert.equal(isShortPhotoTap(null, { x: 1, y: 1 }, 100), false);
  assert.equal(isShortPhotoTap({ x: 1, y: 1 }, null, 100), false);
  assert.equal(isShortPhotoTap({ x: Number.NaN, y: 1 }, { x: 2, y: 2 }, 100), false);
});

test('photo preview only opens the image and no longer owns file actions', async () => {
  const component = await readFile(new URL('../src/components/PhotoPreview.jsx', import.meta.url), 'utf8');
  assert.match(component, /onClick=\{onOpen\}/);
  assert.doesNotMatch(component, /card-actions|downloadUrl|onDelete/);
});

test('the open viewer owns touch and hover file actions', async () => {
  const viewer = await readFile(new URL('../src/components/PhotoViewer.jsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  assert.match(viewer, /isShortPhotoTap\(start, end, event\.timeStamp - start\.time\)/);
  assert.match(viewer, /setActionsVisible\(true\)/);
  assert.match(viewer, /if \(isShortPhotoTap[\s\S]*?setDragOffset\(0\)/);
  assert.match(viewer, /href=\{getDownloadUrl\(photo\)\}/);
  assert.match(viewer, /onClick=\{\(\) => onDelete\(photo\)\}/);
  assert.match(viewer, /disabled=\{deleteDisabled\}/);
  assert.match(viewer, /photo-viewer-actions/);
  assert.match(styles, /@media \(hover: hover\) and \(pointer: fine\)\s*\{[\s\S]*?\.file-card:hover \.card-actions/);
  assert.match(styles, /\.photo-viewer-stage:hover \.photo-viewer-actions/);
  assert.match(styles, /\.photo-viewer-stage\.photo-actions-visible \.photo-viewer-actions/);
  assert.doesNotMatch(styles, /\.card-actions\s*\{\s*opacity:\s*1;\s*transform:\s*none;/);
});
