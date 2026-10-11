import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const adminComponent = (name) => readFile(
  new URL(`../src/components/Admin/${name}.jsx`, import.meta.url),
  'utf8',
);

test('admin dashboard and admin-specific components are grouped in the Admin folder', async () => {
  const [app, dashboard, topbar, account, heading, stats, section, empty, shell, content, grid] =
    await Promise.all([
      readFile(new URL('../src/App.jsx', import.meta.url), 'utf8'),
      adminComponent('AdminDashboard'),
      adminComponent('AdminTopbar'),
      adminComponent('AdminAccount'),
      adminComponent('AdminHeading'),
      adminComponent('AdminStats'),
      adminComponent('AdminSection'),
      adminComponent('AdminEmpty'),
      adminComponent('AdminShell'),
      adminComponent('AdminContent'),
      adminComponent('AdminFileGrid'),
    ]);

  assert.match(app, /components\/Admin\/AdminDashboard\.jsx/);
  assert.match(dashboard, /<AdminTopbar/);
  assert.match(dashboard, /<AdminHeading/);
  assert.match(dashboard, /<AdminStats/);
  assert.match(dashboard, /<AdminSection/);
  assert.match(dashboard, /<AdminEmpty/);
  assert.match(dashboard, /<AdminShell>/);
  assert.match(dashboard, /<AdminContent>/);
  assert.match(dashboard, /<AdminFileGrid>/);
  assert.match(topbar, /<AdminAccount/);
  assert.match(heading, /className="admin-heading"/);
  assert.match(stats, /<AdminStatCard/);
  assert.match(section, /<AdminSectionHeading/);
  assert.match(empty, /className="admin-empty"/);
  assert.match(shell, /className="admin-shell"/);
  assert.match(content, /className="admin-content"/);
  assert.match(grid, /className="admin-file-grid"/);
});

test('composed admin class blocks have dedicated components', async () => {
  const [account, stats, statCard, section, sectionHeading] = await Promise.all([
    adminComponent('AdminAccount'),
    adminComponent('AdminStats'),
    adminComponent('AdminStatCard'),
    adminComponent('AdminSection'),
    adminComponent('AdminSectionHeading'),
  ]);

  assert.match(account, /className="admin-account"/);
  assert.match(stats, /className="admin-stats"/);
  assert.match(statCard, /className="admin-stat-card"/);
  assert.match(section, /className="admin-section"/);
  assert.match(sectionHeading, /className="admin-section-heading"/);
});
