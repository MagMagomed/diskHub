import test from 'node:test';
import assert from 'node:assert/strict';
import { categories, formatDate, formatSize, isPhoto } from '../src/utils/fileUtils.js';

test('file categories are available for the library navigation', () => {
  assert.deepEqual(categories.map(({ id }) => id), ['all', 'photos', 'other']);
});

test('photo detection is case-insensitive and supports the image extensions', () => {
  for (const extension of ['avif', 'bmp', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp']) {
    assert.equal(isPhoto(`фото.${extension}`), true);
    assert.equal(isPhoto(`фото.${extension.toUpperCase()}`), true);
  }
  assert.equal(isPhoto('document.pdf'), false);
  assert.equal(isPhoto('photo.png.exe'), false);
});

test('file sizes use Russian units and readable precision', () => {
  assert.equal(formatSize(0), '0 Б');
  assert.equal(formatSize(1023), '1023 Б');
  assert.equal(formatSize(1024), '1 КБ');
  assert.equal(formatSize(1536), '2 КБ');
  assert.equal(formatSize(1024 ** 2), '1.0 МБ');
  assert.equal(formatSize(1024 ** 3), '1.0 ГБ');
});

test('dates are formatted with the Russian locale and retain their year', () => {
  const formatted = formatDate('2026-10-10T12:00:00.000Z');
  assert.match(formatted, /2026/);
  assert.match(formatted.toLocaleLowerCase('ru'), /окт/);
});
