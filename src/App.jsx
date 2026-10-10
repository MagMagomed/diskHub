import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminDashboard from './components/AdminDashboard.jsx';
import AuthScreen from './components/AuthScreen.jsx';
import Icon from './components/Icon.jsx';
import PhotoPreview from './components/PhotoPreview.jsx';
import PhotoViewer from './components/PhotoViewer.jsx';
import PasswordChangeForm from './components/PasswordChangeForm.jsx';
import { authApi, filesApi, uploadsApi } from './services/api.js';
import { categories, formatDate, formatSize, isPhoto } from './utils/fileUtils.js';
import { useFilteredFiles, useFiles } from './hooks/useFiles.js';

function App() {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const { files, setFiles, loadFiles } = useFiles(setError);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [notice, setNotice] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [viewedPhotoId, setViewedPhotoId] = useState('');
  const photos = useMemo(() => files.filter((file) => isPhoto(file.name)), [files]);

  useEffect(() => {
    let active = true;
    authApi.getCurrentUser()
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

  const filteredFiles = useFilteredFiles(files, category, query);

  const storageSize = files.reduce((total, file) => total + file.size, 0);
  const closePhotoViewer = useCallback(() => setViewedPhotoId(''), []);
  const getPhotoUrl = useCallback((photo) => filesApi.previewUrl(photo.id), []);

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
      const response = await authApi.updateProfile({ username: profileName });
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
      const response = await authApi.logout();
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
    let currentUploadId = '';
    let currentFileName = '';
    try {
      for (let fileIndex = 0; fileIndex < selectedFiles.length; fileIndex += 1) {
        const file = selectedFiles[fileIndex];
        currentFileName = file.name;
        const startResponse = await uploadsApi.start(file.name, file.size);
        const startResult = await startResponse.json();
        if (!startResponse.ok) {
          throw new Error(startResult.error || 'Не удалось начать загрузку файла.');
        }
        currentUploadId = startResult.uploadId;

        for (let offset = 0; offset < file.size; offset += startResult.chunkSize) {
          const chunk = file.slice(offset, Math.min(offset + startResult.chunkSize, file.size));
          const chunkResponse = await uploadsApi.uploadChunk(currentUploadId, chunk);
          const chunkResult = await chunkResponse.json();
          if (!chunkResponse.ok) {
            throw new Error(chunkResult.error || 'Не удалось загрузить часть файла.');
          }
          const percent = file.size
            ? Math.floor((chunkResult.receivedBytes / file.size) * 100)
            : 100;
          setUploadProgress(
            `Загрузка «${file.name}» (${fileIndex + 1}/${selectedFiles.length}): ${percent}%`,
          );
        }

        const completeResponse = await uploadsApi.complete(currentUploadId);
        const completeResult = await completeResponse.json();
        if (!completeResponse.ok) {
          throw new Error(completeResult.error || 'Не удалось завершить загрузку файла.');
        }
        currentUploadId = '';
      }
      setNotice(`${selectedFiles.length} ${selectedFiles.length === 1 ? 'файл загружен' : 'файлы загружены'}`);
      await loadFiles();
    } catch (uploadError) {
      if (currentUploadId) {
        try {
          await uploadsApi.cancel(currentUploadId);
        } catch (abortError) {
          console.error('Could not cancel the incomplete file upload.', abortError);
        }
      }
      await loadFiles();
      setError(
        currentFileName
          ? `Не удалось загрузить «${currentFileName}»: ${uploadError.message}`
          : uploadError.message,
      );
    } finally {
      setUploading(false);
      setUploadProgress('');
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function deleteFile(file) {
    if (!window.confirm(`Удалить «${file.name}»?`)) return;
    try {
      const response = await filesApi.delete(file.id);
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
              aria-label="Настройки профиля"
              title="Настройки профиля"
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
            <span className="dropzone-limit">
              {uploading
                ? uploadProgress
                : 'Без лимита на размер и количество файлов · ограничено свободным местом'}
            </span>
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
                  {isPhoto(file.name) ? (
                    <PhotoPreview
                      name={file.name}
                      imageUrl={filesApi.previewUrl(file.id)}
                      downloadUrl={filesApi.downloadUrl(file.id)}
                      onOpen={() => setViewedPhotoId(file.id)}
                      onDelete={() => deleteFile(file)}
                    />
                  ) : (
                    <div className="file-preview">
                      <div className="file-type-icon"><Icon name="file" size={30} /></div>
                      <div className="card-actions">
                        <a href={filesApi.downloadUrl(file.id)} aria-label={`Скачать ${file.name}`} title="Скачать">
                          <Icon name="download" size={17} />
                        </a>
                        <button onClick={() => deleteFile(file)} aria-label={`Удалить ${file.name}`} title="Удалить">
                          <Icon name="trash" size={17} />
                        </button>
                      </div>
                    </div>
                  )}
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
              <PasswordChangeForm />
            </section>
          </div>
        )}
        {viewedPhotoId && (
          <PhotoViewer
            getImageUrl={getPhotoUrl}
            onPhotoChange={setViewedPhotoId}
            onClose={closePhotoViewer}
            photoId={viewedPhotoId}
            photos={photos}
          />
        )}
      </main>
    </div>
  );
}

export default App;
