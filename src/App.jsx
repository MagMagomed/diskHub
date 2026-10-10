import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const categories = [
  { id: 'all', label: 'Все файлы' },
  { id: 'photos', label: 'Фотографии' },
  { id: 'other', label: 'Документы и другие' },
];

function isPhoto(name) {
  return /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(name);
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} ГБ`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function Icon({ name, size = 20 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>,
    folder: <><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
    upload: <><path d="M12 16V4m-5 5 5-5 5 5" /><path d="M20 16.5v2A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5v-2" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    download: <><path d="M12 4v12m-5-5 5 5 5-5" /><path d="M5 20h14" /></>,
    trash: <><path d="M3 6h18m-2 0-.9 14H5.9L5 6m4 0V4h6v2m-5 4v6m4-6v6" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    file: <><path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10z" /><path d="M13 3v7h7" /></>,
    sparkle: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z" /><path d="m19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14z" /></>,
    key: <><circle cx="8" cy="15" r="5" /><path d="m11.5 11.5 8-8L22 6l-2 2 2 2-3 3-2-2-2 2" /></>,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L9 17l-4 1 1-4z" /></>,
  };

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function AdminDashboard({ user, onUserUpdated, onLogout }) {
  const [data, setData] = useState({ users: [], files: [] });
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(user.username);
  const [profileError, setProfileError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/data');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Не удалось загрузить данные приложения.');
      setData(result);
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const matchingUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ru');
    return data.users.filter((account) => (
      account.username.toLocaleLowerCase('ru').includes(normalizedQuery)
      || account.email.toLocaleLowerCase('ru').includes(normalizedQuery)
      || account.role.toLocaleLowerCase('ru').includes(normalizedQuery)
    ));
  }, [data.users, query]);

  const matchingFiles = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ru');
    return data.files.filter((file) => (
      file.name.toLocaleLowerCase('ru').includes(normalizedQuery)
      || file.username.toLocaleLowerCase('ru').includes(normalizedQuery)
      || file.email.toLocaleLowerCase('ru').includes(normalizedQuery)
    ));
  }, [data.files, query]);

  const totalBytes = data.files.reduce((total, file) => total + file.size, 0);

  async function saveProfile(event) {
    event.preventDefault();
    setProfileSaving(true);
    setProfileError('');
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: profileName }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Не удалось изменить имя пользователя.');
      onUserUpdated(result);
      setProfileName(result.username);
      setData((current) => ({
        ...current,
        users: current.users.map((account) => (
          account.id === result.id ? { ...account, username: result.username } : account
        )),
        files: current.files.map((file) => (
          file.userId === result.id ? { ...file, username: result.username } : file
        )),
      }));
      setProfileOpen(false);
    } catch (saveError) {
      setProfileError(saveError.message);
    } finally {
      setProfileSaving(false);
    }
  }

  async function deleteFile(file) {
    if (!window.confirm(`Удалить файл «${file.name}» пользователя ${file.username}?`)) return;
    setDeletingId(file.id);
    try {
      const response = await fetch(
        `/api/admin/files/${encodeURIComponent(file.userId)}/${encodeURIComponent(file.id)}`,
        { method: 'DELETE' },
      );
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Не удалось удалить файл.');
      }
      setData((current) => ({
        users: current.users.map((account) => (
          account.id === file.userId
            ? {
                ...account,
                fileCount: account.fileCount - 1,
                storageSize: account.storageSize - file.size,
              }
            : account
        )),
        files: current.files.filter((item) => item.id !== file.id),
      }));
      setError('');
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingId('');
    }
  }

  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <a className="brand" href="/" aria-label="DiskHub — главная">
          <span className="brand-mark"><Icon name="folder" size={21} /></span>
          <span>disk<span>hub</span></span>
        </a>
        <div className="admin-account">
          <span className="admin-role-badge">{user.role}</span>
          <span className="user-label" title={user.email}>{user.username}</span>
          <button
            aria-label="Изменить имя пользователя"
            className="profile-edit-button"
            onClick={() => { setProfileName(user.username); setProfileError(''); setProfileOpen(true); }}
            title="Изменить имя пользователя"
            type="button"
          >
            <Icon name="edit" size={15} />
          </button>
          <button className="logout-button" onClick={onLogout}>Выйти</button>
        </div>
      </header>
      <main className="admin-content">
        <div className="eyebrow">АДМИНИСТРИРОВАНИЕ</div>
        <div className="admin-heading">
          <div>
            <h1>Все данные приложения</h1>
            <p className="page-subtitle">Пользователи, их роли и файлы в личных хранилищах.</p>
          </div>
          <label className="search-box admin-search">
            <Icon name="search" size={18} />
            <input
              aria-label="Поиск пользователей и файлов"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Имя, почта или файл"
              value={query}
            />
          </label>
        </div>

        {error && (
          <div className="message message-error" role="alert">
            <span>{error}</span>
            <button aria-label="Закрыть уведомление" onClick={() => setError('')}>
              <Icon name="close" size={17} />
            </button>
          </div>
        )}

        <section aria-label="Статистика приложения" className="admin-stats">
          <article className="admin-stat-card">
            <span>Пользователи</span><strong>{data.users.length}</strong>
          </article>
          <article className="admin-stat-card">
            <span>Все файлы</span><strong>{data.files.length}</strong>
          </article>
          <article className="admin-stat-card">
            <span>Общий размер файлов</span><strong>{formatSize(totalBytes)}</strong>
          </article>
          <article className="admin-stat-card">
            <span>Администраторы</span>
            <strong>{data.users.filter((account) => account.role === 'System Customizer').length}</strong>
          </article>
        </section>

        <section className="admin-section">
          <div className="admin-section-heading">
            <div>
              <h2>Пользователи</h2>
              <span className="section-caption">{matchingUsers.length} аккаунтов</span>
            </div>
          </div>
          {loading ? (
            <div className="admin-empty">Загружаем аккаунты…</div>
          ) : matchingUsers.length ? (
            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr><th>Имя</th><th>Электронная почта</th><th>Роль</th><th>Файлы</th><th>Хранилище</th></tr>
                </thead>
                <tbody>
                  {matchingUsers.map((account) => (
                    <tr key={account.id}>
                      <td><strong>{account.username}</strong></td>
                      <td>{account.email}</td>
                      <td>
                        <span className={`role-badge ${account.role === 'System Customizer' ? 'role-badge-admin' : ''}`}>
                          {account.role}
                        </span>
                      </td>
                      <td>{account.fileCount}</td>
                      <td>{formatSize(account.storageSize)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-empty">{query ? 'Пользователи не найдены.' : 'Пользователей пока нет.'}</div>
          )}
        </section>

        <section className="admin-section">
          <div className="admin-section-heading">
            <div>
              <h2>Файлы всех пользователей</h2>
              <span className="section-caption">{matchingFiles.length} файлов · {formatSize(totalBytes)} всего</span>
            </div>
          </div>
          {loading ? (
            <div className="admin-empty">Загружаем файлы…</div>
          ) : matchingFiles.length ? (
            <div className="admin-file-grid">
              {matchingFiles.map((file) => {
                const fileBase = `/api/admin/files/${encodeURIComponent(file.userId)}/${encodeURIComponent(file.id)}`;
                return (
                  <article className="file-card" key={`${file.userId}:${file.id}`}>
                    <div className={`file-preview ${isPhoto(file.name) ? 'photo-preview' : ''}`}>
                      {isPhoto(file.name) ? (
                        <img src={`${fileBase}/preview`} alt="" loading="lazy" />
                      ) : (
                        <div className="file-type-icon"><Icon name="file" size={30} /></div>
                      )}
                      <div className="card-actions">
                        <a href={`${fileBase}/download`} aria-label={`Скачать ${file.name}`} title="Скачать">
                          <Icon name="download" size={17} />
                        </a>
                        <button
                          aria-label={`Удалить ${file.name} пользователя ${file.username}`}
                          disabled={deletingId === file.id}
                          onClick={() => deleteFile(file)}
                          title="Удалить"
                        >
                          <Icon name="trash" size={17} />
                        </button>
                      </div>
                    </div>
                    <div className="file-details">
                      <strong title={file.name}>{file.name}</strong>
                      <span className="admin-owner" title={file.email}>{file.username} · {file.email}</span>
                      <span>{formatSize(file.size)} <i>·</i> {formatDate(file.uploadedAt)}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="admin-empty">
              {query ? 'Файлы не найдены.' : 'В хранилищах пока нет файлов.'}
            </div>
          )}
        </section>
        <footer className="page-footer">
          <span><span className="status-dot" /> Доступ с правами System Customizer</span>
          <span>DiskHub · Панель администратора</span>
        </footer>
      </main>
      {profileOpen && (
        <div
          className="profile-dialog-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setProfileOpen(false);
          }}
        >
          <section
            aria-labelledby="admin-profile-title"
            aria-modal="true"
            className="profile-dialog"
            onKeyDown={(event) => {
              if (event.key === 'Escape') setProfileOpen(false);
            }}
            role="dialog"
          >
            <button
              aria-label="Закрыть"
              className="profile-dialog-close"
              onClick={() => setProfileOpen(false)}
              type="button"
            >
              <Icon name="close" size={18} />
            </button>
            <div className="auth-eyebrow">ЛИЧНЫЙ ПРОФИЛЬ</div>
            <h2 id="admin-profile-title">Имя пользователя</h2>
            <p className="profile-dialog-description">Это имя отображается в панели управления.</p>
            <form className="auth-form" onSubmit={saveProfile}>
              <label htmlFor="admin-profile-username">Имя пользователя</label>
              <input
                autoFocus
                id="admin-profile-username"
                maxLength={40}
                minLength={2}
                onChange={(event) => setProfileName(event.target.value)}
                required
                type="text"
                value={profileName}
              />
              <span className="profile-input-hint">От 2 до 40 символов: буквы, цифры, пробел, точка, дефис или подчёркивание.</span>
              {profileError && <div className="auth-error" role="alert">{profileError}</div>}
              <div className="profile-dialog-actions">
                <button className="profile-cancel-button" onClick={() => setProfileOpen(false)} type="button">
                  Отмена
                </button>
                <button className="primary-button" disabled={profileSaving} type="submit">
                  {profileSaving ? 'Сохраняем…' : 'Сохранить'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('register');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [passwordGenerated, setPasswordGenerated] = useState(false);

  async function handleSubmit(event, saveInBrowser = false) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (saveInBrowser && !globalThis.isSecureContext) {
        throw new Error('Сохранение пароля доступно только на защищённом соединении HTTPS.');
      }

      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          ...(mode === 'register' ? { username } : {}),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Не удалось выполнить запрос.');

      let notice = '';
      if (saveInBrowser) {
        const PasswordCredentialType = globalThis.PasswordCredential;
        if (!PasswordCredentialType || typeof navigator.credentials?.store !== 'function') {
          notice = 'Браузер не поддерживает автоматическое сохранение паролей. Войдите через стандартную кнопку и сохраните пароль в настройках браузера.';
        } else {
          try {
            await navigator.credentials.store(new PasswordCredentialType({
              id: email.trim(),
              name: email.trim(),
              password,
            }));
            notice = 'Пароль сохранён в менеджере паролей браузера.';
          } catch {
            notice = 'Аккаунт открыт, но браузер не сохранил пароль. Проверьте настройки менеджера паролей.';
          }
        }
      }

      await onAuthenticated(result, notice);
    } catch (authError) {
      setError(authError.message);
    } finally {
      setSubmitting(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError('');
    setPasswordGenerated(false);
  }

  function generatePassword() {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    const randomValues = new Uint8Array(24);
    window.crypto.getRandomValues(randomValues);
    setPassword(Array.from(randomValues, (value) => alphabet[value & 63]).join(''));
    setPasswordGenerated(true);
    setError('');
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <a className="brand auth-brand" href="/" aria-label="DiskHub — главная">
          <span className="brand-mark"><Icon name="folder" size={21} /></span>
          <span>disk<span>hub</span></span>
        </a>
        <div className="auth-eyebrow">ВАШЕ ЛИЧНОЕ ОБЛАЧНОЕ ПРОСТРАНСТВО</div>
        <h1>{mode === 'register' ? 'Создайте аккаунт' : 'С возвращением'}</h1>
        <p className="auth-description">
          {mode === 'register'
            ? 'Зарегистрируйтесь, чтобы хранить файлы в личной папке.'
            : 'Войдите, чтобы открыть свои фотографии и файлы.'}
        </p>
        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <>
              <label htmlFor="auth-username">Имя пользователя</label>
              <input
                autoComplete="nickname"
                autoFocus
                id="auth-username"
                maxLength={40}
                minLength={2}
                name="nickname"
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Как к вам обращаться"
                required
                type="text"
                value={username}
              />
            </>
          )}
          <label htmlFor="auth-email">Электронная почта</label>
          <input
            autoComplete="email"
            autoFocus={mode === 'login'}
            id="auth-email"
            maxLength={254}
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
          <div className="password-label-row">
            <label htmlFor="auth-password">Пароль</label>
            {mode === 'register' && (
              <button
                className="password-action"
                disabled={submitting}
                onClick={generatePassword}
                type="button"
              >
                <Icon name="sparkle" size={14} />
                Сгенерировать
              </button>
            )}
          </div>
          <input
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            id="auth-password"
            maxLength={128}
            minLength={mode === 'register' ? 10 : undefined}
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder={mode === 'register' ? 'Не менее 10 символов' : 'Введите пароль'}
            required
            type="password"
            value={password}
          />
          {passwordGenerated && mode === 'register' && (
            <div className="password-generated" role="status">
              Пароль создан. Сохраните его в менеджере браузера или используйте кнопку ниже.
            </div>
          )}
          <button
            className="secondary-button browser-save-button"
            disabled={submitting}
            onClick={(event) => handleSubmit(event, true)}
            type="button"
          >
            <Icon name="key" size={16} />
            Сохранить пароль в браузере
          </button>
          <span className="browser-save-hint">Сначала войдём в аккаунт, затем сохраним пароль.</span>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="primary-button auth-submit" disabled={submitting} type="submit">
            {submitting
              ? 'Подождите…'
              : mode === 'register'
                ? 'Создать аккаунт'
                : 'Войти'}
          </button>
        </form>
        <p className="auth-switch">
          {mode === 'register' ? 'Уже есть аккаунт?' : 'Впервые в DiskHub?'}
          {' '}
          <button
            onClick={() => changeMode(mode === 'register' ? 'login' : 'register')}
            type="button"
          >
            {mode === 'register' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </p>
        <div className="auth-privacy"><span className="status-dot" /> У каждого аккаунта отдельная папка для файлов</div>
      </section>
    </main>
  );
}

function App() {
  const inputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  const loadFiles = useCallback(async () => {
    try {
      const response = await fetch('/api/files');
      if (!response.ok) throw new Error('Не удалось загрузить список файлов.');
      setFiles(await response.json());
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me')
      .then((response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((authenticatedUser) => {
        if (!active) return;
        if (authenticatedUser) {
          setUser(authenticatedUser);
          loadFiles();
        }
        setAuthLoading(false);
      })
      .catch((authError) => {
        if (!active) return;
        setError(authError.message);
        setAuthLoading(false);
      });
    return () => { active = false; };
  }, [loadFiles]);

  const filteredFiles = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ru');
    return files.filter((file) => {
      const matchesCategory =
        category === 'all' || (category === 'photos' ? isPhoto(file.name) : !isPhoto(file.name));
      return matchesCategory && file.name.toLocaleLowerCase('ru').includes(normalizedQuery);
    });
  }, [category, files, query]);

  const storageSize = files.reduce((total, file) => total + file.size, 0);

  async function handleAuthenticated(authenticatedUser, authNotice = '') {
    setUser(authenticatedUser);
    setProfileName(authenticatedUser.username);
    setError('');
    setNotice(authNotice);
    await loadFiles();
  }

  function openProfileEditor() {
    setProfileName(user.username);
    setProfileError('');
    setProfileOpen(true);
  }

  async function saveProfile(event) {
    event.preventDefault();
    setProfileSaving(true);
    setProfileError('');
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: profileName }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Не удалось изменить имя пользователя.');
      setUser(result);
      setProfileName(result.username);
      setProfileOpen(false);
      setNotice('Имя пользователя обновлено.');
      setError('');
    } catch (saveError) {
      setProfileError(saveError.message);
    } finally {
      setProfileSaving(false);
    }
  }

  async function logout() {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Не удалось выйти из аккаунта.');
      setUser(null);
      setFiles([]);
      setCategory('all');
      setQuery('');
      setNotice('');
      setError('');
    } catch (logoutError) {
      setError(logoutError.message);
    }
  }

  async function uploadFiles(selectedFiles) {
    if (!selectedFiles.length) return;
    setUploading(true);
    setError('');
    setNotice('');
    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append('files', file));

    try {
      const response = await fetch('/api/files', { method: 'POST', body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Не удалось загрузить файлы.');
      setNotice(`${result.length} ${result.length === 1 ? 'файл загружен' : 'файлы загружены'}`);
      await loadFiles();
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function deleteFile(file) {
    if (!window.confirm(`Удалить «${file.name}»?`)) return;
    try {
      const response = await fetch(`/api/files/${encodeURIComponent(file.id)}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Не удалось удалить файл.');
      }
      setFiles((current) => current.filter((item) => item.id !== file.id));
      setNotice('Файл удалён');
      setError('');
    } catch (deleteError) {
      setError(deleteError.message);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    uploadFiles(Array.from(event.dataTransfer.files));
  }

  if (authLoading) {
    return (
      <main className="auth-page">
        <div className="auth-loading" role="status">Проверяем вход…</div>
      </main>
    );
  }

  if (!user) return <AuthScreen onAuthenticated={handleAuthenticated} />;
  if (user.role === 'System Customizer') {
    return <AdminDashboard user={user} onUserUpdated={setUser} onLogout={logout} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="DiskHub — главная">
          <span className="brand-mark"><Icon name="folder" size={21} /></span>
          <span>disk<span>hub</span></span>
        </a>

        <div className="sidebar-section-label">БИБЛИОТЕКА</div>
        <nav className="navigation" aria-label="Разделы файлов">
          {categories.map((item) => (
            <button
              className={`nav-item ${category === item.id ? 'active' : ''}`}
              key={item.id}
              onClick={() => setCategory(item.id)}
            >
              <Icon name={item.id === 'all' ? 'grid' : item.id === 'photos' ? 'image' : 'file'} />
              <span>{item.label}</span>
              {item.id === 'all' && <span className="nav-count">{files.length}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="storage-heading">
            <span>Моё хранилище</span>
            <span>{formatSize(storageSize)}</span>
          </div>
          <div className="storage-track"><span /></div>
          <p>Файлы хранятся на этом устройстве</p>
          <div className="storage-location"><span className="status-dot" /> Личная папка аккаунта</div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>Мои файлы</span><span className="breadcrumb-divider">/</span><strong>Все файлы</strong></div>
          <div className="topbar-right">
            <div className="avatar">{user.username[0].toLocaleUpperCase('ru')}</div>
            <span className="user-label" title={user.email}>{user.username}</span>
            <button
              className="profile-edit-button"
              onClick={openProfileEditor}
              aria-label="Изменить имя пользователя"
              title="Изменить имя пользователя"
              type="button"
            >
              <Icon name="edit" size={15} />
            </button>
            <button className="logout-button" onClick={logout}>Выйти</button>
          </div>
        </header>

        <section className="page-content">
          <nav className="mobile-navigation" aria-label="Разделы файлов">
            {categories.map((item) => (
              <button
                className={`nav-item ${category === item.id ? 'active' : ''}`}
                key={item.id}
                onClick={() => setCategory(item.id)}
              >
                <Icon name={item.id === 'all' ? 'grid' : item.id === 'photos' ? 'image' : 'file'} size={17} />
                <span>{item.label}</span>
                {item.id === 'all' && <span className="nav-count">{files.length}</span>}
              </button>
            ))}
          </nav>

          <div className="page-heading">
            <div>
              <div className="eyebrow">ВАШЕ ПРОСТРАНСТВО</div>
              <h1>Все файлы</h1>
              <p className="page-subtitle">Фотографии и документы — всё в одном месте.</p>
            </div>
            <button className="primary-button" onClick={() => inputRef.current?.click()} disabled={uploading}>
              <Icon name="upload" size={18} />
              {uploading ? 'Загружаем…' : 'Загрузить файлы'}
            </button>
            <input
              ref={inputRef}
              className="visually-hidden"
              type="file"
              multiple
              onChange={(event) => uploadFiles(Array.from(event.target.files || []))}
            />
          </div>

          <section
            className={`dropzone ${dragging ? 'dragging' : ''}`}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false);
            }}
            onDrop={handleDrop}
          >
            <div className="dropzone-icon"><Icon name="upload" size={22} /></div>
            <div className="dropzone-copy">
              <strong>{dragging ? 'Отпустите файлы, чтобы загрузить' : 'Перетащите файлы сюда'}</strong>
              <span>или <button className="text-button" onClick={() => inputRef.current?.click()}>выберите на устройстве</button></span>
            </div>
            <span className="dropzone-limit">До 20 файлов · 100 МБ на файл</span>
          </section>

          {(notice || error) && (
            <div className={`message ${error ? 'message-error' : 'message-success'}`} role="status">
              <span>{error || notice}</span>
              <button aria-label="Закрыть уведомление" onClick={() => { setError(''); setNotice(''); }}>
                <Icon name="close" size={17} />
              </button>
            </div>
          )}

          <div className="files-toolbar">
            <div>
              <h2>Недавно добавленные</h2>
              <span className="section-caption">{files.length} {files.length === 1 ? 'файл' : 'файлов'} в хранилище</span>
            </div>
            <label className="search-box">
              <Icon name="search" size={18} />
              <input
                aria-label="Поиск по файлам"
                placeholder="Найти файл"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && <button aria-label="Очистить поиск" onClick={() => setQuery('')}><Icon name="close" size={15} /></button>}
            </label>
          </div>

          {filteredFiles.length > 0 ? (
            <div className="file-grid">
              {filteredFiles.map((file) => (
                <article className="file-card" key={file.id}>
                  <div className={`file-preview ${isPhoto(file.name) ? 'photo-preview' : ''}`}>
                    {isPhoto(file.name) ? (
                      <img src={`/api/files/${encodeURIComponent(file.id)}/preview`} alt="" loading="lazy" />
                    ) : (
                      <div className="file-type-icon"><Icon name="file" size={30} /></div>
                    )}
                    <div className="card-actions">
                      <a href={`/api/files/${encodeURIComponent(file.id)}/download`} aria-label={`Скачать ${file.name}`} title="Скачать">
                        <Icon name="download" size={17} />
                      </a>
                      <button onClick={() => deleteFile(file)} aria-label={`Удалить ${file.name}`} title="Удалить">
                        <Icon name="trash" size={17} />
                      </button>
                    </div>
                    {isPhoto(file.name) && <span className="photo-badge"><Icon name="image" size={15} /></span>}
                  </div>
                  <div className="file-details">
                    <strong title={file.name}>{file.name}</strong>
                    <span>{formatSize(file.size)} <i>·</i> {formatDate(file.uploadedAt)}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon"><Icon name={query ? 'search' : 'folder'} size={27} /></div>
              <h3>{query ? 'Ничего не найдено' : files.length ? 'В этом разделе пока пусто' : 'Здесь пока пусто'}</h3>
              <p>
                {query
                  ? 'Попробуйте изменить поисковый запрос.'
                  : files.length
                    ? 'Попробуйте выбрать другой раздел или загрузите файлы.'
                    : 'Загрузите фотографии или документы — они появятся здесь.'}
              </p>
              {!files.length && !query && (
                <button className="secondary-button" onClick={() => inputRef.current?.click()}>
                  <Icon name="upload" size={17} /> Загрузить первый файл
                </button>
              )}
            </div>
          )}

          <footer className="page-footer">
            <span><span className="status-dot" /> Ваши файлы доступны только на этом устройстве</span>
            <span>DiskHub · Простое хранение</span>
          </footer>
        </section>
        {profileOpen && (
          <div
            className="profile-dialog-backdrop"
            onClick={(event) => {
              if (event.target === event.currentTarget) setProfileOpen(false);
            }}
          >
            <section
              aria-labelledby="profile-dialog-title"
              aria-modal="true"
              className="profile-dialog"
              onKeyDown={(event) => {
                if (event.key === 'Escape') setProfileOpen(false);
              }}
              role="dialog"
            >
              <button
                aria-label="Закрыть"
                className="profile-dialog-close"
                onClick={() => setProfileOpen(false)}
                type="button"
              >
                <Icon name="close" size={18} />
              </button>
              <div className="auth-eyebrow">ЛИЧНЫЙ ПРОФИЛЬ</div>
              <h2 id="profile-dialog-title">Имя пользователя</h2>
              <p className="profile-dialog-description">
                Это имя отображается в вашем личном пространстве.
              </p>
              <form className="auth-form" onSubmit={saveProfile}>
                <label htmlFor="profile-username">Имя пользователя</label>
                <input
                  autoFocus
                  id="profile-username"
                  maxLength={40}
                  minLength={2}
                  onChange={(event) => setProfileName(event.target.value)}
                  required
                  type="text"
                  value={profileName}
                />
                <span className="profile-input-hint">От 2 до 40 символов: буквы, цифры, пробел, точка, дефис или подчёркивание.</span>
                {profileError && <div className="auth-error" role="alert">{profileError}</div>}
                <div className="profile-dialog-actions">
                  <button
                    className="profile-cancel-button"
                    onClick={() => setProfileOpen(false)}
                    type="button"
                  >
                    Отмена
                  </button>
                  <button className="primary-button" disabled={profileSaving} type="submit">
                    {profileSaving ? 'Сохраняем…' : 'Сохранить'}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
