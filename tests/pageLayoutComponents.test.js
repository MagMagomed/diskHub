import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const component = (name) => readFile(
  new URL(`../src/components/${name}.jsx`, import.meta.url),
  'utf8',
);
const fileComponent = (name) => readFile(
  new URL(`../src/components/File/${name}.jsx`, import.meta.url),
  'utf8',
);
const buttonComponent = (name) => readFile(
  new URL(`../src/components/Buttons/${name}.jsx`, import.meta.url),
  'utf8',
);
const authComponent = (name) => readFile(
  new URL(`../src/components/Auth/${name}.jsx`, import.meta.url),
  'utf8',
);
const profileComponent = (name) => readFile(
  new URL(`../src/components/Profile/${name}.jsx`, import.meta.url),
  'utf8',
);

test('the customer page is composed from the extracted layout components', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  for (const name of [
    'Sidebar',
    'MainContent',
    'Topbar',
    'PageContent',
    'MobileNavigation',
    'PageHeading',
  ]) {
    assert.match(app, new RegExp(`<${name}\\b`), `${name} should be used by App`);
    assert.match(app, new RegExp(`import ${name} from`), `${name} should be imported`);
  }
});

test('sidebar and mobile navigation share category selection and counts', async () => {
  const [sidebar, mobileNavigation, navigation] = await Promise.all([
    component('Sidebar'),
    component('MobileNavigation'),
    component('CategoryNavigation'),
  ]);

  assert.match(sidebar, /<CategoryNavigation/);
  assert.match(mobileNavigation, /<CategoryNavigation/);
  assert.match(navigation, /onClick=\{\(\) => onCategoryChange\(item\.id\)\}/);
  assert.match(navigation, /fileCount/);
});

test('page heading supports composed actions and child controls', async () => {
  const heading = await component('PageHeading');
  assert.match(heading, /<div className="page-heading">/);
  assert.match(heading, /\{action\}/);
  assert.match(heading, /\{children\}/);
});

test('primary button centralizes styling while preserving button attributes', async () => {
  const primaryButton = await buttonComponent('PrimaryButton');
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const admin = await readFile(new URL('../src/components/Admin/AdminDashboard.jsx', import.meta.url), 'utf8');
  const auth = await readFile(new URL('../src/components/Auth/AuthScreen.jsx', import.meta.url), 'utf8');
  const password = await readFile(new URL('../src/components/PasswordChangeForm.jsx', import.meta.url), 'utf8');

  assert.match(primaryButton, /className=\{`primary-button/);
  assert.match(primaryButton, /\.\.\.buttonProps/);
  for (const source of [app, admin, auth, password]) {
    assert.match(source, /<PrimaryButton\b/);
    assert.doesNotMatch(source, /<button[^>]*className="primary-button/);
  }
  assert.match(app, /from '\.\/components\/Buttons\/PrimaryButton\.jsx'/);
});

test('file toolbar and grids are extracted and reused by both file libraries', async () => {
  const [toolbar, grid, app, admin] = await Promise.all([
    fileComponent('FilesToolbar'),
    fileComponent('FileGrid'),
    readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/Admin/AdminDashboard.jsx', import.meta.url), 'utf8'),
  ]);

  assert.match(toolbar, /className="files-toolbar"/);
  assert.match(toolbar, /onQueryChange\(event\.target\.value\)/);
  assert.match(toolbar, /onQueryChange\(''\)/);
  assert.match(grid, /className = 'file-grid'/);
  assert.match(grid, /\{children\}/);
  assert.match(app, /<FilesToolbar/);
  assert.match(app, /<FileGrid>/);
  assert.match(admin, /<AdminFileGrid>/);
  assert.match(app, /from '\.\/components\/File\/FilesToolbar\.jsx'/);
  assert.match(admin, /from '\.\/AdminFileGrid\.jsx'/);
});

test('profile dialog backdrop, close control, and title are reusable', async () => {
  const [backdrop, close, title, app, admin] = await Promise.all([
    profileComponent('ProfileDialogBackdrop'),
    profileComponent('ProfileDialogClose'),
    profileComponent('ProfileDialogTitle'),
    readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/Admin/AdminDashboard.jsx', import.meta.url), 'utf8'),
  ]);

  assert.match(backdrop, /className="profile-dialog-backdrop"/);
  assert.match(backdrop, /event\.target === event\.currentTarget/);
  assert.match(backdrop, /onClose\(\)/);
  assert.match(close, /className="profile-dialog-close"/);
  assert.match(close, /onClick=\{onClose\}/);
  assert.match(title, /<h2 id=\{id\}>\{children\}<\/h2>/);
  for (const source of [app, admin]) {
    assert.match(source, /<ProfileDialogBackdrop/);
    assert.match(source, /<ProfileDialogClose/);
    assert.match(source, /<ProfileDialogTitle/);
  }
  assert.match(app, /from '\.\/components\/Profile\/ProfileDialogBackdrop\.jsx'/);
  assert.match(admin, /from '\.\.\/Profile\/ProfileDialogBackdrop\.jsx'/);
});

test('shared auth form preserves native form props and class names in all form surfaces', async () => {
  const authForm = await authComponent('AuthForm');
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const admin = await readFile(new URL('../src/components/Admin/AdminDashboard.jsx', import.meta.url), 'utf8');
  const auth = await readFile(new URL('../src/components/Auth/AuthScreen.jsx', import.meta.url), 'utf8');
  const password = await readFile(new URL('../src/components/PasswordChangeForm.jsx', import.meta.url), 'utf8');

  assert.match(authForm, /<form/);
  assert.match(authForm, /\.\.\.formProps/);
  assert.match(authForm, /auth-form/);
  assert.match(authForm, /\{children\}/);
  for (const source of [app, admin, auth, password]) {
    assert.match(source, /<AuthForm/);
    assert.doesNotMatch(source, /<form className="auth-form/);
  }
  assert.match(password, /className="password-change-form"/);
  assert.match(app, /from '\.\/components\/Auth\/AuthForm\.jsx'/);
});
