import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const component = (name) => readFile(
  new URL(`../src/components/${name}.jsx`, import.meta.url),
  'utf8',
);

test('generic file previews reuse the common download and delete actions', async () => {
  const [preview, actions] = await Promise.all([
    component('FilePreview'),
    component('FileActions'),
  ]);

  assert.match(preview, /<FileActions/);
  assert.match(preview, /downloadUrl=\{downloadUrl\}/);
  assert.match(preview, /onDelete=\{onDelete\}/);
  assert.match(actions, /<DownloadButton/);
  assert.match(actions, /<DeleteButton/);
});

test('download and delete controls are standalone reusable components', async () => {
  const [download, remove] = await Promise.all([
    component('DownloadButton'),
    component('DeleteButton'),
  ]);

  assert.match(download, /<a href=\{href\} aria-label=\{label\}/);
  assert.match(remove, /<button/);
  assert.match(remove, /disabled=\{disabled\}/);
  assert.match(remove, /onClick=\{onDelete\}/);
});

test('file cards and file details are separate and reused in both libraries', async () => {
  const [card, details, app, admin] = await Promise.all([
    component('FileCard'),
    component('FileDetails'),
    readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/AdminDashboard.jsx', import.meta.url), 'utf8'),
  ]);

  assert.match(card, /className="file-card"/);
  assert.match(details, /className="file-details"/);
  for (const source of [app, admin]) {
    assert.match(source, /<FileCard/);
    assert.match(source, /<FileDetails/);
    assert.match(source, /<FilePreview/);
  }
});
