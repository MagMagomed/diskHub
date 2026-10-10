import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const usersFile = path.join(rootDir, 'data', 'users.json');
const roles = new Set(['Customer', 'System Customizer']);
const [requestedEmail, role] = process.argv.slice(2);

if (!requestedEmail || !roles.has(role)) {
  console.error('Usage: npm run role:set -- <email> "Customer|System Customizer"');
  process.exitCode = 1;
} else {
  try {
    await fs.mkdir(path.dirname(usersFile), { recursive: true });
    let users;
    try {
      users = JSON.parse(await fs.readFile(usersFile, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      throw new Error('No user database found. Register the account before assigning its role.');
    }
    if (!Array.isArray(users)) throw new Error('The user database format is invalid.');

    const email = requestedEmail.trim().toLowerCase();
    const index = users.findIndex((user) => user.email === email);
    if (index < 0) throw new Error(`No account found for ${email}.`);

    users[index] = { ...users[index], role };
    const temporaryFile = `${usersFile}.${crypto.randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporaryFile, `${JSON.stringify(users, null, 2)}\n`, { mode: 0o600 });
      await fs.rename(temporaryFile, usersFile);
    } catch (error) {
      await fs.rm(temporaryFile, { force: true });
      throw error;
    }

    console.log(`Updated ${email}: ${role}. Restart the application server to apply the role.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
