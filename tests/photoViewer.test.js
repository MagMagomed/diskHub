import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getAdjacentPhotoId,
  getPhotoIndex,
  getSwipeDirection,
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
