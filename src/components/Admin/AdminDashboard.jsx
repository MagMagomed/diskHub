import { useCallback, useMemo, useState } from 'react';
import AdminContent from './AdminContent.jsx';
import AdminEmpty from './AdminEmpty.jsx';
import AdminFileGrid from './AdminFileGrid.jsx';
import AdminHeading from './AdminHeading.jsx';
import AdminSection from './AdminSection.jsx';
import AdminShell from './AdminShell.jsx';
import AdminStats from './AdminStats.jsx';
import AdminTopbar from './AdminTopbar.jsx';
import AuthForm from '../Auth/AuthForm.jsx';
import Icon from '../Icon.jsx';
import FileCard from '../File/FileCard.jsx';
import FileDetails from '../File/FileDetails.jsx';
import FilePreview from '../File/FilePreview.jsx';
import PrimaryButton from '../Buttons/PrimaryButton.jsx';
import ProfileDialogBackdrop from '../Profile/ProfileDialogBackdrop.jsx';
import ProfileDialogClose from '../Profile/ProfileDialogClose.jsx';
import ProfileDialogTitle from '../Profile/ProfileDialogTitle.jsx';
import PhotoPreview from '../Photo/PhotoPreview.jsx';
import PhotoViewer from '../Photo/PhotoViewer.jsx';
import PasswordChangeForm from '../PasswordChangeForm.jsx';
import { adminApi, authApi } from '../../services/api.js';
import { formatSize, isPhoto } from '../../utils/fileUtils.js';
import { useAdminData } from '../../hooks/useAdminData.js';

/**
 * Административная панель для поиска пользователей и файлов, просмотра статистики,
 * редактирования профиля и удаления файлов владельцев.
 * @param {object} props
 * @param {{id: string, username: string, email: string, role: string}} props.user Текущий пользователь с ролью System Customizer.
 * @param {(user: object) => void} props.onUserUpdated Передаёт родителю обновлённые данные пользователя.
 * @param {() => void} props.onLogout Завершает текущий сеанс.
 */
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
    <AdminShell>
      <AdminTopbar
        user={user}
        onProfileEdit={() => {
          setProfileName(user.username);
          setProfileError('');
          setProfileOpen(true);
        }}
        onLogout={onLogout}
      />
      <AdminContent>
        <AdminHeading query={query} onQueryChange={setQuery} />

        {error && (
          <div className="message message-error" role="alert">
            <span>{error}</span>
            <button aria-label="Закрыть уведомление" onClick={() => setError('')}>
              <Icon name="close" size={17} />
            </button>
          </div>
        )}

        <AdminStats users={data.users} files={data.files} totalBytes={totalBytes} />

        <AdminSection title="Пользователи" caption={`${matchingUsers.length} аккаунтов`}>
          {loading ? (
            <AdminEmpty>Загружаем аккаунты…</AdminEmpty>
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
            <AdminEmpty>{query ? 'Пользователи не найдены.' : 'Пользователей пока нет.'}</AdminEmpty>
          )}
        </AdminSection>

        <AdminSection
          title="Файлы всех пользователей"
          caption={`${matchingFiles.length} файлов · ${formatSize(totalBytes)} всего`}
        >
          {loading ? (
            <AdminEmpty>Загружаем файлы…</AdminEmpty>
          ) : matchingFiles.length ? (
            <AdminFileGrid>
              {matchingFiles.map((file) => {
                return (
                  <FileCard key={`${file.userId}:${file.id}`}>
                    {isPhoto(file.name) ? (
                      <PhotoPreview
                        name={file.name}
                        imageUrl={adminApi.previewUrl(file.userId, file.id)}
                        downloadUrl={adminApi.downloadUrl(file.userId, file.id)}
                        onOpen={() => setViewedPhoto(file)}
                        onDelete={() => deleteFile(file)}
                        deleteLabel={`Удалить ${file.name} пользователя ${file.username}`}
                        deleteDisabled={deletingId === file.id}
                      />
                    ) : (
                      <FilePreview
                        name={file.name}
                        downloadUrl={adminApi.downloadUrl(file.userId, file.id)}
                        onDelete={() => deleteFile(file)}
                        deleteLabel={`Удалить ${file.name} пользователя ${file.username}`}
                        deleteDisabled={deletingId === file.id}
                      />
                    )}
                    <FileDetails
                      name={file.name}
                      size={file.size}
                      uploadedAt={file.uploadedAt}
                      ownerLabel={`${file.username} · ${file.email}`}
                      ownerTitle={file.email}
                    />
                  </FileCard>
                );
              })}
            </AdminFileGrid>
          ) : (
            <AdminEmpty>
              {query ? 'Файлы не найдены.' : 'В хранилищах пока нет файлов.'}
            </AdminEmpty>
          )}
        </AdminSection>
        <footer className="page-footer">
          <span><span className="status-dot" /> Доступ с правами System Customizer</span>
          <span>DiskHub · Панель администратора</span>
        </footer>
      </AdminContent>
      {profileOpen && (
        <ProfileDialogBackdrop onClose={() => setProfileOpen(false)}>
          <section
            aria-labelledby="admin-profile-title"
            aria-modal="true"
            className="profile-dialog"
            onKeyDown={(event) => {
              if (event.key === 'Escape') setProfileOpen(false);
            }}
            role="dialog"
          >
            <ProfileDialogClose onClose={() => setProfileOpen(false)} />
            <div className="auth-eyebrow">ЛИЧНЫЙ ПРОФИЛЬ</div>
            <ProfileDialogTitle id="admin-profile-title">Имя пользователя</ProfileDialogTitle>
            <p className="profile-dialog-description">Это имя отображается в панели управления.</p>
            <AuthForm onSubmit={saveProfile}>
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
                <PrimaryButton disabled={profileSaving} type="submit">
                  {profileSaving ? 'Сохраняем…' : 'Сохранить'}
                </PrimaryButton>
              </div>
            </AuthForm>
            <PasswordChangeForm />
          </section>
        </ProfileDialogBackdrop>
      )}
      {viewedPhoto && (
        <PhotoViewer
          deleteDisabled={deletingId === viewedPhoto.id}
          getDownloadUrl={(photo) => adminApi.downloadUrl(photo.userId, photo.id)}
          getImageUrl={getPhotoUrl}
          onDelete={deleteFile}
          onPhotoChange={changeViewedPhoto}
          onClose={closePhotoViewer}
          ownerLabel={`${viewedPhoto.username} · ${viewedPhoto.email}`}
          photoId={viewedPhoto.id}
          photos={photos}
        />
      )}
    </AdminShell>
  );
}


export default AdminDashboard;
