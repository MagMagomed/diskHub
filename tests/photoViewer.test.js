import test from 'node:test';
import assert from 'node:assert/strict';
import { getAdjacentPhotoId, getPhotoIndex } from '../src/utils/photoViewer.js';

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
