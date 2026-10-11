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

test('photo preview opens the image and reuses the shared always-visible actions', async () => {
  const component = await readFile(new URL('../src/components/PhotoPreview.jsx', import.meta.url), 'utf8');
  const actions = await readFile(new URL('../src/components/FileActions.jsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  assert.match(component, /onClick=\{onOpen\}/);
  assert.match(component, /<FileActions/);
  assert.match(component, /downloadUrl=\{downloadUrl\}/);
  assert.match(component, /onDelete=\{onDelete\}/);
  assert.match(actions, /<DownloadButton/);
  assert.match(actions, /<DeleteButton/);
  assert.match(styles, /\.card-actions\s*\{[^}]*opacity:\s*1/);
});

test('the open viewer reuses the shared actions and keeps tap and hover visibility', async () => {
  const viewer = await readFile(new URL('../src/components/PhotoViewer.jsx', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  assert.match(viewer, /isShortPhotoTap\(start, end, event\.timeStamp - start\.time\)/);
  assert.match(viewer, /setActionsVisible\(true\)/);
  assert.match(viewer, /<FileActions/);
  assert.match(viewer, /downloadUrl=\{getDownloadUrl\(photo\)\}/);
  assert.match(viewer, /onDelete=\{\(\) => onDelete\(photo\)\}/);
  assert.match(viewer, /photo-viewer-actions/);
  assert.match(styles, /@media \(hover: hover\) and \(pointer: fine\)\s*\{[\s\S]*?\.photo-viewer-stage:hover \.photo-viewer-actions/);
  assert.match(styles, /\.photo-viewer-stage:hover \.photo-viewer-actions/);
  assert.match(styles, /\.photo-viewer-stage\.photo-actions-visible \.photo-viewer-actions/);
  assert.match(styles, /\.photo-viewer-stage \.photo-viewer-actions\s*\{[^}]*opacity:\s*0/);
});
