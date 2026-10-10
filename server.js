import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import express from 'express';
import multer from 'multer';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(rootDir, 'uploads');
const dataDir = path.join(rootDir, 'data');
const usersFile = path.join(dataDir, 'users.json');
const distDir = path.join(rootDir, 'dist');
const port = Number(process.env.PORT) || 3001;
const app = express();
const scrypt = promisify(crypto.scrypt);
const sessionLifetime = 7 * 24 * 60 * 60 * 1000;
const sessionCookie = 'diskhub_session';
const userRoles = {
  SYSTEM_CUSTOMIZER: 'System Customizer',
  CUSTOMER: 'Customer',
};
const sessions = new Map();
let users = new Map();
let accountOperations = Promise.resolve();

fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });

function safeOriginalName(originalName) {
  const basename = path.basename(String(originalName).replace(/\\/g, '/'));
  return basename.replace(/[<>:"|?*\u0000-\u001f]/g, '_').trim() || 'file';
}

function storedName(filename) {
  return filename.slice(filename.indexOf('__') + 2);
}

function resolveStoredFile(userId, id) {
  if (typeof id !== 'string' || path.basename(id) !== id || !id.includes('__')) {
    return null;
  }
  return path.join(uploadsDir, userId, id);
}

function enqueueAccountOperation(operation) {
  const result = accountOperations.then(operation);
  accountOperations = result.catch(() => {});
  return result;
}

async function persistUsers(nextUsers) {
  const temporaryFile = `${usersFile}.${crypto.randomUUID()}.tmp`;
  try {
    await fs.promises.writeFile(
      temporaryFile,
      `${JSON.stringify([...nextUsers.values()], null, 2)}\n`,
      { mode: 0o600 },
    );
    await fs.promises.rename(temporaryFile, usersFile);
  } catch (error) {
    await fs.promises.rm(temporaryFile, { force: true });
    throw error;
  }
}

function sessionForRequest(req) {
  const cookie = req.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${sessionCookie}=`));
  if (!cookie) return null;

  const sessionId = cookie.slice(sessionCookie.length + 1);
  const session = sessions.get(sessionId);
  if (!session || session.expiresAt <= Date.now()) {
    sessions.delete(sessionId);
    return null;
  }
  return session;
}

function setSessionCookie(res, sessionId) {
  res.setHeader(
    'Set-Cookie',
    `${sessionCookie}=${sessionId}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(sessionLifetime / 1000)}`,
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${sessionCookie}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`,
  );
}

function createSession(userId, res) {
  for (const [id, session] of sessions) {
    if (session.expiresAt <= Date.now()) sessions.delete(id);
  }
  const sessionId = crypto.randomBytes(32).toString('hex');
  sessions.set(sessionId, { userId, expiresAt: Date.now() + sessionLifetime });
  setSessionCookie(res, sessionId);
}

function requireUser(req, res, next) {
  const session = sessionForRequest(req);
  const user = session ? users.get(session.userId) : null;
  if (!user) {
    res.status(401).json({ error: 'Необходим вход в аккаунт.' });
    return;
  }
  req.user = user;
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      res.status(403).json({ error: 'Недостаточно прав для выполнения этого действия.' });
      return;
    }
    next();
  };
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username || user.email.split('@')[0],
    role: user.role || userRoles.CUSTOMER,
  };
}

function normalizeUsername(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function usernameValidationError(username) {
  const length = [...username].length;
  if (length < 2 || length > 40) {
    return 'Имя пользователя должно содержать от 2 до 40 символов.';
  }
  if (!/^[\p{L}\p{N}](?:[\p{L}\p{N} ._-]*[\p{L}\p{N}])?$/u.test(username)) {
    return 'Используйте буквы, цифры, пробел, точку, дефис или подчёркивание.';
  }
  return null;
}

const storage = multer.diskStorage({
  destination: (req, _file, callback) => {
    const userDir = path.join(uploadsDir, req.user.id);
    fs.mkdir(userDir, { recursive: true }, (error) => callback(error, userDir));
  },
  filename: (_req, file, callback) => {
    callback(null, `${crypto.randomUUID()}__${safeOriginalName(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 20,
  },
});

app.use(express.json({ limit: '10kb' }));

app.get('/api/auth/me', (req, res) => {
  const session = sessionForRequest(req);
  const user = session ? users.get(session.userId) : null;
  res.json(user ? publicUser(user) : null);
});

app.post('/api/auth/register', async (req, res, next) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const username = normalizeUsername(req.body?.username || email.split('@')[0]);

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Укажите корректный адрес электронной почты.' });
    return;
  }
  const usernameError = usernameValidationError(username);
  if (usernameError) {
    res.status(400).json({ error: usernameError });
    return;
  }
  if (password.length < 10 || password.length > 128) {
    res.status(400).json({ error: 'Пароль должен содержать от 10 до 128 символов.' });
    return;
  }

  try {
    const user = await enqueueAccountOperation(async () => {
      if ([...users.values()].some((account) => account.email === email)) {
        const error = new Error('Аккаунт с такой почтой уже зарегистрирован.');
        error.status = 409;
        throw error;
      }

      const salt = crypto.randomBytes(16);
      const passwordHash = await scrypt(password, salt, 64);
      const account = {
        id: crypto.randomUUID(),
        email,
        username,
        role: userRoles.CUSTOMER,
        salt: salt.toString('hex'),
        passwordHash: passwordHash.toString('hex'),
      };
      const nextUsers = new Map(users);
      nextUsers.set(account.id, account);

      await fs.promises.mkdir(path.join(uploadsDir, account.id), { recursive: true });
      try {
        await persistUsers(nextUsers);
      } catch (error) {
        await fs.promises.rm(path.join(uploadsDir, account.id), { recursive: true, force: true });
        throw error;
      }
      users = nextUsers;
      return account;
    });

    createSession(user.id, res);
    res.status(201).json(publicUser(user));
  } catch (error) {
    if (error.status === 409) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    next(error);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const user = [...users.values()].find((account) => account.email === email);

  if (!user || password.length > 128) {
    res.status(401).json({ error: 'Неверная почта или пароль.' });
    return;
  }

  try {
    const candidateHash = await scrypt(password, Buffer.from(user.salt, 'hex'), 64);
    if (!crypto.timingSafeEqual(candidateHash, Buffer.from(user.passwordHash, 'hex'))) {
      res.status(401).json({ error: 'Неверная почта или пароль.' });
      return;
    }

    const previousSession = sessionForRequest(req);
    if (previousSession) {
      for (const [id, session] of sessions) {
        if (session === previousSession) sessions.delete(id);
      }
    }
    createSession(user.id, res);
    res.json(publicUser(user));
  } catch (error) {
    next(error);
  }
});

app.patch('/api/auth/profile', requireUser, async (req, res, next) => {
  const username = normalizeUsername(req.body?.username);
  const usernameError = usernameValidationError(username);
  if (usernameError) {
    res.status(400).json({ error: usernameError });
    return;
  }

  try {
    const updatedUser = await enqueueAccountOperation(async () => {
      const currentUser = users.get(req.user.id);
      if (!currentUser) {
        const error = new Error('Аккаунт не найден.');
        error.status = 404;
        throw error;
      }

      const account = { ...currentUser, username };
      const nextUsers = new Map(users);
      nextUsers.set(account.id, account);
      await persistUsers(nextUsers);
      users = nextUsers;
      return account;
    });
    res.json(publicUser(updatedUser));
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/logout', (req, res) => {
  const session = sessionForRequest(req);
  if (session) {
    for (const [id, storedSession] of sessions) {
      if (storedSession === session) sessions.delete(id);
    }
  }
  clearSessionCookie(res);
  res.sendStatus(204);
});

app.get(
  '/api/admin/data',
  requireUser,
  requireRole(userRoles.SYSTEM_CUSTOMIZER),
  async (_req, res, next) => {
    try {
      const accounts = await Promise.all(
        [...users.values()].map(async (user) => {
          const userDir = path.join(uploadsDir, user.id);
          let entries;
          try {
            entries = await fs.promises.readdir(userDir, { withFileTypes: true });
          } catch (error) {
            if (error.code !== 'ENOENT') throw error;
            entries = [];
          }

          const ownedFiles = await Promise.all(
            entries
              .filter((entry) => entry.isFile() && entry.name.includes('__'))
              .map(async (entry) => {
                const filePath = path.join(userDir, entry.name);
                const stats = await fs.promises.stat(filePath);
                return {
                  id: entry.name,
                  userId: user.id,
                  name: storedName(entry.name),
                  size: stats.size,
                  uploadedAt: stats.mtime.toISOString(),
                };
              }),
          );
          return { user: publicUser(user), files: ownedFiles };
        }),
      );

      const files = accounts.flatMap((account) => account.files.map((file) => ({
        ...file,
        username: account.user.username,
        email: account.user.email,
      })));
      files.sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt));
      res.json({
        users: accounts.map((account) => ({
          ...account.user,
          fileCount: account.files.length,
          storageSize: account.files.reduce((total, file) => total + file.size, 0),
        })),
        files,
      });
    } catch (error) {
      next(error);
    }
  },
);

app.get(
  '/api/admin/files/:userId/:id/preview',
  requireUser,
  requireRole(userRoles.SYSTEM_CUSTOMIZER),
  (req, res, next) => {
    if (!users.has(req.params.userId)) {
      res.sendStatus(404);
      return;
    }
    const filePath = resolveStoredFile(req.params.userId, req.params.id);
    if (!filePath) {
      res.sendStatus(400);
      return;
    }
    res.sendFile(filePath, (error) => {
      if (error && !res.headersSent) next(error);
    });
  },
);

app.get(
  '/api/admin/files/:userId/:id/download',
  requireUser,
  requireRole(userRoles.SYSTEM_CUSTOMIZER),
  (req, res, next) => {
    if (!users.has(req.params.userId)) {
      res.sendStatus(404);
      return;
    }
    const filePath = resolveStoredFile(req.params.userId, req.params.id);
    if (!filePath) {
      res.sendStatus(400);
      return;
    }
    res.download(filePath, storedName(req.params.id), (error) => {
      if (error && !res.headersSent) next(error);
    });
  },
);

app.delete(
  '/api/admin/files/:userId/:id',
  requireUser,
  requireRole(userRoles.SYSTEM_CUSTOMIZER),
  async (req, res, next) => {
    if (!users.has(req.params.userId)) {
      res.sendStatus(404);
      return;
    }
    const filePath = resolveStoredFile(req.params.userId, req.params.id);
    if (!filePath) {
      res.sendStatus(400);
      return;
    }
    try {
      await fs.promises.unlink(filePath);
      res.sendStatus(204);
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.sendStatus(404);
        return;
      }
      next(error);
    }
  },
);

app.get('/api/files', requireUser, async (req, res, next) => {
  try {
    const userDir = path.join(uploadsDir, req.user.id);
    await fs.promises.mkdir(userDir, { recursive: true });
    const entries = await fs.promises.readdir(userDir, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.includes('__'))
        .map(async (entry) => {
          const filePath = path.join(userDir, entry.name);
          const stats = await fs.promises.stat(filePath);
          return {
            id: entry.name,
            name: storedName(entry.name),
            size: stats.size,
            uploadedAt: stats.mtime.toISOString(),
          };
        }),
    );
    files.sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt));
    res.json(files);
  } catch (error) {
    next(error);
  }
});

app.post('/api/files', requireUser, upload.array('files', 20), (req, res) => {
  res.status(201).json(
    req.files.map((file) => ({
      id: file.filename,
      name: storedName(file.filename),
      size: file.size,
      uploadedAt: new Date().toISOString(),
    })),
  );
});

app.get('/api/files/:id/preview', requireUser, (req, res, next) => {
  const filePath = resolveStoredFile(req.user.id, req.params.id);
  if (!filePath) {
    res.sendStatus(400);
    return;
  }
  res.sendFile(filePath, (error) => {
    if (error && !res.headersSent) next(error);
  });
});

app.get('/api/files/:id/download', requireUser, (req, res, next) => {
  const filePath = resolveStoredFile(req.user.id, req.params.id);
  if (!filePath) {
    res.sendStatus(400);
    return;
  }
  res.download(filePath, storedName(req.params.id), (error) => {
    if (error && !res.headersSent) next(error);
  });
});

app.delete('/api/files/:id', requireUser, async (req, res, next) => {
  const filePath = resolveStoredFile(req.user.id, req.params.id);
  if (!filePath) {
    res.sendStatus(400);
    return;
  }
  try {
    await fs.promises.unlink(filePath);
    res.sendStatus(204);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.sendStatus(404);
      return;
    }
    next(error);
  }
});

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'Файл превышает ограничение 100 МБ.'
        : error.code === 'LIMIT_FILE_COUNT'
          ? 'За один раз можно загрузить не больше 20 файлов.'
          : error.message;
    res.status(400).json({ error: message });
    return;
  }
  if (error.status) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ error: 'Не удалось обработать запрос.' });
});

async function startServer() {
  try {
    const savedUsers = JSON.parse(await fs.promises.readFile(usersFile, 'utf8'));
    if (!Array.isArray(savedUsers)) throw new Error('Invalid users database format.');
    const migratedUsers = savedUsers.map((user) => {
      if (user.role !== undefined && !Object.values(userRoles).includes(user.role)) {
        throw new Error(`Account ${user.id} has an unsupported role.`);
      }
      return {
        ...user,
        username: user.username || user.email.split('@')[0],
        role: user.role || userRoles.CUSTOMER,
      };
    });
    users = new Map(migratedUsers.map((user) => [user.id, user]));
    if (migratedUsers.some((user, index) => (
      user.username !== savedUsers[index].username || user.role !== savedUsers[index].role
    ))) {
      await persistUsers(users);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  app.listen(port, () => {
    console.log(`DiskHub server running at http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to load the users database.', error);
  process.exitCode = 1;
});
