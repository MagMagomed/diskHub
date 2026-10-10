import test from 'node:test';
import assert from 'node:assert/strict';
import { filterFiles } from '../src/utils/fileUtils.js';

const files = [
  { id: 'document', name: 'manual.pdf' },
  { id: 'djvu', name: 'reference.djvu' },
  { id: 'photo', name: 'cover.jpg' },
];

test('the all-files category keeps every supported file extension', () => {
  assert.deepEqual(
    filterFiles(files, 'all').map((file) => file.id),
    ['document', 'djvu', 'photo'],
  );
});

test('DJVU documents remain visible in the documents and other category', () => {
  assert.deepEqual(
    filterFiles(files, 'other').map((file) => file.id),
    ['document', 'djvu'],
  );
});

test('search can find a DJVU file by name or extension', () => {
  assert.deepEqual(filterFiles(files, 'all', 'reference.djvu'), [files[1]]);
  assert.deepEqual(filterFiles(files, 'other', '.DJVU'), [files[1]]);
});

test('photo category contains only supported image files', () => {
  assert.deepEqual(filterFiles(files, 'photos'), [files[2]]);
});
