import { useCallback, useMemo, useState } from 'react';
import Icon from './Icon.jsx';
import PhotoViewer from './PhotoViewer.jsx';
import PasswordChangeForm from './PasswordChangeForm.jsx';
import { adminApi, authApi } from '../services/api.js';
import { formatDate, formatSize, isPhoto } from '../utils/fileUtils.js';
import { useAdminData } from '../hooks/useAdminData.js';

function AdminDashboard({ user, onUserUpdated, onLogout }) {
  const { data, setData, error, setError, loading } = useAdminData();
  const [query, setQuery] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(user.username);
  const [profileError, setProfileError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [viewedPhoto, setViewedPhoto] = useState(null);

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
  const photos = matchingFiles.filter((file) => isPhoto(file.name));
  const closePhotoViewer = useCallback(() => setViewedPhoto(null), []);
  const changeViewedPhoto = useCallback((nextPhotoId) => {
    setViewedPhoto(photos.find((photo) => photo.id === nextPhotoId) || null);
  }, [photos]);
  const getPhotoUrl = useCallback(
    (photo) => adminApi.previewUrl(photo.userId, photo.id),
    [],
  );

  async function saveProfile(event) {
    event.preventDefault();
    setProfileSaving(true);
    setProfileError('');
    try {
      const response = await authApi.updateProfile({ username: profileName });
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
      const response = await adminApi.deleteFile(file.userId, file.id);
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
            aria-label="Настройки профиля"
            className="profile-edit-button"
            onClick={() => { setProfileName(user.username); setProfileError(''); setProfileOpen(true); }}
            title="Настройки профиля"
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
                return (
                  <article className="file-card" key={`${file.userId}:${file.id}`}>
                    <div className={`file-preview ${isPhoto(file.name) ? 'photo-preview' : ''}`}>
                      {isPhoto(file.name) ? (
                        <button
                          aria-label={`Открыть фотографию ${file.name} пользователя ${file.username}`}
                          className="photo-open-button"
                          onClick={() => setViewedPhoto(file)}
                          type="button"
                        >
                          <img src={adminApi.previewUrl(file.userId, file.id)} alt="" loading="lazy" />
                        </button>
                      ) : (
                        <div className="file-type-icon"><Icon name="file" size={30} /></div>
                      )}
                      <div className="card-actions">
                        <a href={adminApi.downloadUrl(file.userId, file.id)} aria-label={`Скачать ${file.name}`} title="Скачать">
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
            <PasswordChangeForm />
          </section>
        </div>
      )}
      {viewedPhoto && (
        <PhotoViewer
          getImageUrl={getPhotoUrl}
          onPhotoChange={changeViewedPhoto}
          onClose={closePhotoViewer}
          ownerLabel={`${viewedPhoto.username} · ${viewedPhoto.email}`}
          photoId={viewedPhoto.id}
          photos={photos}
        />
      )}
    </div>
  );
}


export default AdminDashboard;
