import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  getAdjacentPhotoId,
  getPhotoIndex,
  getSwipeOffset,
  getSwipeDirection,
  getSwipeTargetOffset,
} from '../src/utils/photoViewer.js';

const photos = [
  { id: 'photo-1', name: 'first.jpg' },
  { id: 'photo-2', name: 'second.png' },
  { id: 'photo-3', name: 'third.webp' },
];

test('opening a photo selects the matching image in the viewer', () => {
  assert.equal(getPhotoIndex(photos, 'photo-2'), 1);
});

test('viewer navigation moves to the adjacent photo', () => {
  assert.equal(getAdjacentPhotoId(photos, 'photo-2', -1), 'photo-1');
  assert.equal(getAdjacentPhotoId(photos, 'photo-2', 1), 'photo-3');
});

test('viewer navigation stops at the first and last photos', () => {
  assert.equal(getAdjacentPhotoId(photos, 'photo-1', -1), null);
  assert.equal(getAdjacentPhotoId(photos, 'photo-3', 1), null);
});

test('viewer handles unknown selection and empty photo lists', () => {
  assert.equal(getPhotoIndex(photos, 'missing'), -1);
  assert.equal(getAdjacentPhotoId(photos, 'missing', 1), null);
  assert.equal(getPhotoIndex([], 'photo-1'), -1);
  assert.equal(getAdjacentPhotoId([], 'photo-1', -1), null);
});

test('viewer navigation rejects directions other than previous or next', () => {
  assert.equal(getAdjacentPhotoId(photos, 'photo-2', 0), null);
  assert.equal(getAdjacentPhotoId(photos, 'photo-2', 2), null);
});

test('a horizontal swipe navigates in its direction', () => {
  assert.equal(getSwipeDirection({ x: 240, y: 100 }, { x: 160, y: 112 }), 1);
  assert.equal(getSwipeDirection({ x: 160, y: 112 }, { x: 240, y: 100 }), -1);
});

test('short gestures and predominantly vertical movement do not navigate', () => {
  assert.equal(getSwipeDirection({ x: 200, y: 100 }, { x: 155, y: 100 }), null);
  assert.equal(getSwipeDirection({ x: 200, y: 100 }, { x: 180, y: 190 }), null);
});

test('swipe threshold is inclusive and horizontal movement must dominate', () => {
  assert.equal(getSwipeDirection({ x: 200, y: 100 }, { x: 150, y: 100 }), 1);
  assert.equal(getSwipeDirection({ x: 150, y: 100 }, { x: 200, y: 100 }), -1);
  assert.equal(getSwipeDirection({ x: 200, y: 100 }, { x: 100, y: 190 }), null);
});

test('swipe direction rejects malformed touch coordinates', () => {
  assert.equal(getSwipeDirection(null, { x: 0, y: 0 }), null);
  assert.equal(getSwipeDirection({ x: 0, y: 0 }, null), null);
  assert.equal(getSwipeDirection({ x: Number.NaN, y: 0 }, { x: 100, y: 0 }), null);
});

test('the preview offset follows a horizontal finger movement exactly', () => {
  assert.equal(
    getSwipeOffset({ x: 300, y: 200 }, { x: 221, y: 210 }, true),
    -79,
  );
  assert.equal(
    getSwipeOffset({ x: 100, y: 200 }, { x: 184, y: 210 }, true),
    84,
  );
});

test('vertical movement and tiny touch jitter do not move the photo', () => {
  assert.equal(getSwipeOffset({ x: 200, y: 100 }, { x: 196, y: 101 }, true), 0);
  assert.equal(getSwipeOffset({ x: 200, y: 100 }, { x: 180, y: 130 }, true), 0);
});

test('swiping past either end applies resistance instead of navigating', () => {
  assert.equal(getSwipeOffset({ x: 100, y: 100 }, { x: 180, y: 105 }, false), 20);
  assert.equal(getSwipeOffset({ x: 200, y: 100 }, { x: 120, y: 105 }, false), -20);
});

test('the view transition target moves into place for either swipe direction', () => {
  assert.equal(getSwipeTargetOffset({ x: 300, y: 100 }, { x: 220, y: 105 }, 390), -390);
  assert.equal(getSwipeTargetOffset({ x: 100, y: 100 }, { x: 180, y: 105 }, 390), 390);
});

test('short, vertical and invalid swipes do not trigger an animated transition', () => {
  assert.equal(getSwipeTargetOffset({ x: 200, y: 100 }, { x: 170, y: 100 }, 390), null);
  assert.equal(getSwipeTargetOffset({ x: 200, y: 100 }, { x: 180, y: 190 }, 390), null);
  assert.equal(getSwipeTargetOffset({ x: 200, y: 100 }, { x: 100, y: 100 }, 0), null);
  assert.equal(getSwipeTargetOffset(null, { x: 100, y: 100 }, 390), null);
});

test('portrait layout hides arrow controls and uses the full viewport width', async () => {
  const styles = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8');
  const portraitRules = styles.match(/@media\s*\(orientation:\s*portrait\)\s*\{([\s\S]*?)\n\}/)?.[1];

  assert.ok(portraitRules, 'portrait-specific viewer styles should exist');
  assert.match(portraitRules, /\.photo-viewer-controls\s*\{\s*display:\s*none\s*;/);
  assert.match(portraitRules, /\.photo-viewer-stage\s*\{\s*width:\s*100vw\s*;/);
  assert.match(portraitRules, /\.photo-viewer-image\s*\{\s*width:\s*100vw\s*;/);
});

test('viewer images expose live drag transforms and a settling animation', async () => {
  const component = await readFile(new URL('../src/components/Photo/PhotoViewer.jsx', import.meta.url), 'utf8');
  assert.match(component, /onTouchMove=\{handleTouchMove\}/);
  assert.match(component, /transform: `translateX\(\$\{dragOffset\}px\)`/);
  assert.match(component, /transform 220ms ease-out/);
});
