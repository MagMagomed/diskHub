import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getPhotoTapAction, isShortPhotoTap } from '../src/utils/photoActions.js';

test('a short touch tap reveals photo actions before opening the viewer', () => {
  const start = { x: 120, y: 200 };
  const end = { x: 124, y: 203 };
  assert.equal(isShortPhotoTap(start, end, 180), true);
  assert.equal(getPhotoTapAction('touch', true, false), 'show-actions');
});

test('the next short touch tap opens the photo after actions are revealed', () => {
  assert.equal(getPhotoTapAction('touch', true, true), 'open');
});

test('mouse activation opens immediately while hover exposes actions', () => {
  assert.equal(getPhotoTapAction('mouse', true, false), 'open');
  assert.equal(getPhotoTapAction('mouse', true, true), 'open');
});

test('long presses and touch movement do not open or reveal actions', () => {
  assert.equal(getPhotoTapAction('touch', false, false), null);
  assert.equal(isShortPhotoTap({ x: 100, y: 100 }, { x: 110, y: 105 }, 180), true);
  assert.equal(isShortPhotoTap({ x: 100, y: 100 }, { x: 113, y: 100 }, 180), false);
  assert.equal(isShortPhotoTap({ x: 100, y: 100 }, { x: 102, y: 102 }, 500), false);
});

test('malformed tap coordinates are rejected', () => {
  assert.equal(isShortPhotoTap(null, { x: 1, y: 1 }, 100), false);
  assert.equal(isShortPhotoTap({ x: 1, y: 1 }, null, 100), false);
  assert.equal(isShortPhotoTap({ x: Number.NaN, y: 1 }, { x: 2, y: 2 }, 100), false);
});

test('photo preview provides working download and delete controls', async () => {
  const component = await readFile(new URL('../src/components/PhotoPreview.jsx', import.meta.url), 'utf8');
  assert.match(component, /href=\{downloadUrl\}/);
  assert.match(component, /aria-label=\{`Скачать \$\{name\}`\}/);
  assert.match(component, /onClick=\{onDelete\}/);
  assert.match(component, /aria-label=\{deleteLabel\}/);
});

test('photo preview shows touch actions on the first tap and opens on the next', async () => {
  const component = await readFile(new URL('../src/components/PhotoPreview.jsx', import.meta.url), 'utf8');
  assert.match(component, /onPointerDown=\{handlePointerDown\}/);
  assert.match(component, /onPointerUp=\{handlePointerUp\}/);
  assert.match(component, /setActionsVisible\(true\)/);
  assert.match(component, /if \(action === 'open'\) onOpen\(\)/);
  assert.match(component, /photo-actions-visible/);
});

test('mouse hover reveals photo actions without forcing them visible on touch layouts', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  assert.match(styles, /@media \(hover: hover\) and \(pointer: fine\)\s*\{[\s\S]*?\.file-card:hover \.card-actions/);
  assert.match(styles, /\.photo-actions-visible \.card-actions/);
  assert.doesNotMatch(styles, /\.card-actions\s*\{\s*opacity:\s*1;\s*transform:\s*none;/);
});
