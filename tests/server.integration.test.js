import test, { after, before, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { promisify } from 'node:util';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const testRoot = path.join(rootDir, '.test-runtime', crypto.randomUUID());
const scrypt = promisify(crypto.scrypt);
const ids = {
  admin: '00000000-0000-4000-8000-000000000001',
  customer: '00000000-0000-4000-8000-000000000002',
  other: '00000000-0000-4000-8000-000000000003',
};
const legacyPhotoId = `${crypto.randomUUID()}__старое фото.JPG`;
const legacyDocumentId = `${crypto.randomUUID()}__старый документ.pdf`;
const password = 'test-password-123';
let child;
let port;
let baseUrl;
let childOutput = '';

async function reservePort() {
  const listener = net.createServer();
  await new Promise((resolve, reject) => {
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', resolve);
  });
  const { port: availablePort } = listener.address();
  await new Promise((resolve, reject) => {
    listener.close((error) => (error ? reject(error) : resolve()));
  });
  return availablePort;
}

async function createAccount(id, email, username, role) {
  const salt = crypto.randomBytes(16);
  const passwordHash = await scrypt(password, salt, 64);
  return {
    id,
    email,
    username,
    role,
    salt: salt.toString('hex'),
    passwordHash: passwordHash.toString('hex'),
  };
}

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`Test server exited with ${child.exitCode}.\n${childOutput}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`Test server did not become ready.\n${childOutput}`);
}

async function request(url, options = {}) {
  return fetch(`${baseUrl}${url}`, options);
}

async function login(email, loginPassword = password) {
  const response = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: loginPassword }),
  });
  const result = await response.json();
  return {
    response,
    result,
    cookie: response.headers.get('set-cookie')?.split(';')[0],
  };
}

async function uploadChunked(cookie, fileName, contents) {
  const started = await request('/api/uploads', {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/json' },
    body: JSON.stringify({ fileName, fileSize: contents.length }),
  });
  assert.equal(started.status, 201);
  const { uploadId, chunkSize } = await started.json();
  assert.ok(chunkSize > 0);

  for (let offset = 0; offset < contents.length; offset += chunkSize) {
    const chunk = contents.subarray(offset, Math.min(offset + chunkSize, contents.length));
    const response = await request(`/api/uploads/${uploadId}/chunk`, {
      method: 'PUT',
      headers: { cookie, 'content-type': 'application/octet-stream' },
      body: chunk,
    });
    assert.equal(response.status, 200);
  }

  const completed = await request(`/api/uploads/${uploadId}/complete`, {
    method: 'POST',
    headers: { cookie },
  });
  assert.equal(completed.status, 201);
  return { ...(await completed.json()), uploadId };
}

describe('DiskHub API integration', { concurrency: false }, () => {
  before(async () => {
    port = await reservePort();
    baseUrl = `http://127.0.0.1:${port}`;
    await fs.mkdir(path.join(testRoot, 'data'), { recursive: true });
    await fs.mkdir(path.join(testRoot, 'uploads', ids.customer), { recursive: true });
    await fs.copyFile(path.join(rootDir, 'server.js'), path.join(testRoot, 'server.js'));

    const accounts = [
      await createAccount(ids.admin, 'admin@example.test', 'Test Admin', 'System Customizer'),
      await createAccount(ids.customer, 'customer@example.test', 'Test Customer', 'Customer'),
      await createAccount(ids.other, 'other@example.test', 'Other Customer', 'Customer'),
    ];
    await fs.writeFile(
      path.join(testRoot, 'data', 'users.json'),
      `${JSON.stringify(accounts)}\n`,
    );

    await fs.writeFile(path.join(testRoot, 'uploads', ids.customer, legacyPhotoId), 'legacy-photo');
    await fs.writeFile(path.join(testRoot, 'uploads', ids.customer, legacyDocumentId), 'legacy-document');

    child = spawn(process.execPath, [path.join(testRoot, 'server.js')], {
      cwd: testRoot,
      env: { ...process.env, PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.setEncoding('utf8').on('data', (value) => { childOutput += value; });
    child.stderr.setEncoding('utf8').on('data', (value) => { childOutput += value; });
    await waitForServer();
  });

  after(async () => {
    if (child && child.exitCode === null) {
      const closed = new Promise((resolve) => child.once('close', resolve));
      child.kill();
      await closed;
    }
    await fs.rm(testRoot, { recursive: true, force: true });
    const runtimeRoot = path.join(rootDir, '.test-runtime');
    try {
      await fs.rmdir(runtimeRoot);
    } catch (error) {
      if (error.code !== 'ENOENT' && error.code !== 'ENOTEMPTY') throw error;
    }
  });

  test('health and unauthenticated access rules', async () => {
    const health = await request('/api/health');
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok' });

    const currentUser = await request('/api/auth/me');
    assert.equal(currentUser.status, 200);
    assert.equal(await currentUser.json(), null);
    assert.equal((await request('/api/files')).status, 401);
    assert.equal((await request('/api/admin/data')).status, 401);
  });

  test('startup migrates legacy files into each user category folder', async () => {
    const userDir = path.join(testRoot, 'uploads', ids.customer);
    assert.deepEqual((await fs.readdir(userDir)).sort(), ['files', 'photos']);

    assert.equal(await fs.readFile(path.join(userDir, 'photos', legacyPhotoId), 'utf8'), 'legacy-photo');
    assert.equal(await fs.readFile(path.join(userDir, 'files', legacyDocumentId), 'utf8'), 'legacy-document');

    const customer = await login('customer@example.test');
    assert.equal(customer.response.status, 200);
    const files = await request('/api/files', { headers: { cookie: customer.cookie } });
    assert.deepEqual(
      (await files.json()).map(({ id }) => id).sort(),
      [legacyPhotoId, legacyDocumentId].sort(),
    );
  });

  test('registration validates credentials and creates isolated folders', async () => {
    const invalidPassword = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'new@example.test',
        username: 'New User',
        password: 'short',
      }),
    });
    assert.equal(invalidPassword.status, 400);

    const invalidUsername = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'new@example.test',
        username: '!',
        password: 'long-test-password',
      }),
    });
    assert.equal(invalidUsername.status, 400);

    const registered = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'NEW@example.test',
        username: '  Новое   имя ',
        password: 'long-test-password',
      }),
    });
    assert.equal(registered.status, 201);
    const user = await registered.json();
    assert.equal(user.email, 'new@example.test');
    assert.equal(user.username, 'Новое имя');
    assert.equal(user.role, 'Customer');
    assert.ok(registered.headers.get('set-cookie'));
    await fs.access(path.join(testRoot, 'uploads', user.id, 'photos'));
    await fs.access(path.join(testRoot, 'uploads', user.id, 'files'));

    const duplicate = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'new@example.test',
        username: 'Another User',
        password: 'long-test-password',
      }),
    });
    assert.equal(duplicate.status, 409);
  });

  test('login, profile update, password change and logout', async () => {
    const invalidLogin = await login('customer@example.test', 'incorrect-password');
    assert.equal(invalidLogin.response.status, 401);

    const firstSession = await login('customer@example.test');
    const secondSession = await login('customer@example.test');
    assert.equal(firstSession.response.status, 200);
    assert.equal(secondSession.response.status, 200);

    const profile = await request('/api/auth/profile', {
      method: 'PATCH',
      headers: { cookie: firstSession.cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ username: '  Изменённое   имя ' }),
    });
    assert.equal(profile.status, 200);
    assert.equal((await profile.json()).username, 'Изменённое имя');

    const invalidProfile = await request('/api/auth/profile', {
      method: 'PATCH',
      headers: { cookie: firstSession.cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'x' }),
    });
    assert.equal(invalidProfile.status, 400);

    const wrongCurrentPassword = await request('/api/auth/password', {
      method: 'PATCH',
      headers: { cookie: firstSession.cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ currentPassword: 'wrong-password', newPassword: 'new-password-123' }),
    });
    assert.equal(wrongCurrentPassword.status, 401);

    const changedPassword = await request('/api/auth/password', {
      method: 'PATCH',
      headers: { cookie: firstSession.cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ currentPassword: password, newPassword: 'new-password-123' }),
    });
    assert.equal(changedPassword.status, 200);

    const currentSession = await request('/api/auth/me', { headers: { cookie: firstSession.cookie } });
    assert.equal((await currentSession.json()).email, 'customer@example.test');
    const revokedSession = await request('/api/auth/me', { headers: { cookie: secondSession.cookie } });
    assert.equal(await revokedSession.json(), null);
    assert.equal((await login('customer@example.test', password)).response.status, 401);
    assert.equal((await login('customer@example.test', 'new-password-123')).response.status, 200);

    const logout = await request('/api/auth/logout', {
      method: 'POST',
      headers: { cookie: firstSession.cookie },
    });
    assert.equal(logout.status, 204);
    assert.equal(
      await (await request('/api/auth/me', { headers: { cookie: firstSession.cookie } })).json(),
      null,
    );
  });

  test('chunked uploads preserve Cyrillic names and enforce ownership', async () => {
    const customer = await login('customer@example.test', 'new-password-123');
    const other = await login('other@example.test');

    const photo = await uploadChunked(customer.cookie, 'снимок.PNG', Buffer.from('photo-content'));
    const document = await uploadChunked(customer.cookie, 'документ.pdf', Buffer.from('document-content'));
    const customerDir = path.join(testRoot, 'uploads', ids.customer);
    assert.equal(await fs.readFile(path.join(customerDir, 'photos', photo.id), 'utf8'), 'photo-content');
    assert.equal(await fs.readFile(path.join(customerDir, 'files', document.id), 'utf8'), 'document-content');
    assert.equal(photo.name, 'снимок.PNG');

    const listed = await request('/api/files', { headers: { cookie: customer.cookie } });
    const files = await listed.json();
    assert.equal(listed.status, 200);
    assert.deepEqual(
      files.map(({ id }) => id).sort(),
      [
        legacyPhotoId,
        legacyDocumentId,
        photo.id,
        document.id,
      ].sort(),
    );

    const preview = await request(`/api/files/${encodeURIComponent(photo.id)}/preview`, {
      headers: { cookie: customer.cookie },
    });
    assert.equal(await preview.text(), 'photo-content');
    const download = await request(`/api/files/${encodeURIComponent(document.id)}/download`, {
      headers: { cookie: customer.cookie },
    });
    assert.equal(await download.text(), 'document-content');

    const otherListing = await request('/api/files', { headers: { cookie: other.cookie } });
    assert.deepEqual(await otherListing.json(), []);
    assert.notEqual(
      (await request(`/api/files/${encodeURIComponent(photo.id)}/download`, {
        headers: { cookie: other.cookie },
      })).status,
      200,
    );
    assert.equal(
      (await request(`/api/files/${encodeURIComponent(photo.id)}`, {
        method: 'DELETE',
        headers: { cookie: other.cookie },
      })).status,
      404,
    );
    assert.equal(
      await (await request(`/api/files/${encodeURIComponent(photo.id)}/download`, {
        headers: { cookie: customer.cookie },
      })).text(),
      'photo-content',
    );

    const admin = await login('admin@example.test');
    const adminDataResponse = await request('/api/admin/data', { headers: { cookie: admin.cookie } });
    assert.equal(adminDataResponse.status, 200);
    const adminData = await adminDataResponse.json();
    assert.ok(adminData.files.some((file) => file.userId === ids.customer && file.id === photo.id));
    assert.ok(adminData.users.some((account) => account.id === ids.customer && account.fileCount >= 4));

    const forbidden = await request('/api/admin/data', { headers: { cookie: customer.cookie } });
    assert.equal(forbidden.status, 403);

    const adminPreview = await request(
      `/api/admin/files/${ids.customer}/${encodeURIComponent(photo.id)}/preview`,
      { headers: { cookie: admin.cookie } },
    );
    assert.equal(await adminPreview.text(), 'photo-content');
    const adminDelete = await request(
      `/api/admin/files/${ids.customer}/${encodeURIComponent(document.id)}`,
      { method: 'DELETE', headers: { cookie: admin.cookie } },
    );
    assert.equal(adminDelete.status, 204);

    const personalDelete = await request(`/api/files/${encodeURIComponent(photo.id)}`, {
      method: 'DELETE',
      headers: { cookie: customer.cookie },
    });
    assert.equal(personalDelete.status, 204);

    const largeContent = Buffer.alloc(32 * 1024 * 1024 + 1, 0x5a);
    const largeFile = await uploadChunked(customer.cookie, 'multi-chunk.bin', largeContent);
    assert.equal(largeFile.size, largeContent.length);
    assert.equal(
      (await fs.stat(path.join(customerDir, 'files', largeFile.id))).size,
      largeContent.length,
    );
    const largeDelete = await request(`/api/files/${encodeURIComponent(largeFile.id)}`, {
      method: 'DELETE',
      headers: { cookie: customer.cookie },
    });
    assert.equal(largeDelete.status, 204);
  });

  test('incomplete upload cannot be completed and can be cancelled', async () => {
    const customer = await login('customer@example.test', 'new-password-123');
    const started = await request('/api/uploads', {
      method: 'POST',
      headers: { cookie: customer.cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ fileName: 'incomplete.txt', fileSize: 8 }),
    });
    assert.equal(started.status, 201);
    const { uploadId } = await started.json();
    const incomplete = await request(`/api/uploads/${uploadId}/complete`, {
      method: 'POST',
      headers: { cookie: customer.cookie },
    });
    assert.equal(incomplete.status, 409);

    const cancelledByOther = await request(`/api/uploads/${uploadId}`, {
      method: 'DELETE',
      headers: { cookie: (await login('other@example.test')).cookie },
    });
    assert.equal(cancelledByOther.status, 404);

    const cancelled = await request(`/api/uploads/${uploadId}`, {
      method: 'DELETE',
      headers: { cookie: customer.cookie },
    });
    assert.equal(cancelled.status, 204);
    const completedAfterCancel = await request(`/api/uploads/${uploadId}/complete`, {
      method: 'POST',
      headers: { cookie: customer.cookie },
    });
    assert.equal(completedAfterCancel.status, 404);
  });

  test('legacy multipart upload accepts Unicode names and routes by category', async () => {
    const customer = await login('customer@example.test', 'new-password-123');
    const body = new FormData();
    body.append('files', new Blob([Buffer.from('legacy upload')]), 'архив.zip');
    const response = await request('/api/files', {
      method: 'POST',
      headers: { cookie: customer.cookie },
      body,
    });
    assert.equal(response.status, 201);
    const [file] = await response.json();
    assert.equal(file.name, 'архив.zip');
    const stored = path.join(testRoot, 'uploads', ids.customer, 'files', file.id);
    assert.equal(await fs.readFile(stored, 'utf8'), 'legacy upload');
  });

  test('DJVU uploads are returned in the all-files listing', async () => {
    const customer = await login('customer@example.test', 'new-password-123');
    const started = await request('/api/uploads', {
      method: 'POST',
      headers: { cookie: customer.cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ fileName: 'справочник.djvu', fileSize: 12 }),
    });
    assert.equal(started.status, 201);
    const { uploadId } = await started.json();
    const chunk = await request(`/api/uploads/${uploadId}/chunk`, {
      method: 'PUT',
      headers: { cookie: customer.cookie, 'content-type': 'application/octet-stream' },
      body: Buffer.from('djvu-content'),
    });
    assert.equal(chunk.status, 200);
    const complete = await request(`/api/uploads/${uploadId}/complete`, {
      method: 'POST',
      headers: { cookie: customer.cookie },
    });
    assert.equal(complete.status, 201);
    const uploadedFile = await complete.json();
    assert.equal(uploadedFile.name, 'справочник.djvu');

    const listingResponse = await request('/api/files', { headers: { cookie: customer.cookie } });
    assert.equal(listingResponse.status, 200);
    const listing = await listingResponse.json();
    assert.ok(
      listing.some((file) => file.id === uploadedFile.id && file.name === 'справочник.djvu'),
      'the uploaded DJVU must remain visible in the all-files list',
    );
  });
});
