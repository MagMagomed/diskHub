import { useState } from 'react';
import AuthForm from './Auth/AuthForm.jsx';
import PrimaryButton from './Buttons/PrimaryButton.jsx';
import { authApi } from '../services/api.js';

/**
 * Форма изменения пароля текущего пользователя с подтверждением нового пароля.
 * Не принимает props; отправляет данные в authApi и показывает результат внутри формы.
 */
function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  async function changePassword(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    if (newPassword !== confirmPassword) {
      setError('Новые пароли не совпадают.');
      return;
    }

    setSaving(true);
    try {
      const response = await authApi.changePassword({ currentPassword, newPassword });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Не удалось изменить пароль.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setNotice('Пароль изменён. Другие активные сеансы завершены.');
    } catch (changeError) {
      setError(changeError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthForm className="password-change-form" onSubmit={changePassword}>
      <h3>Изменение пароля</h3>
      <label htmlFor="profile-current-password">Текущий пароль</label>
      <input
        autoComplete="current-password"
        id="profile-current-password"
        maxLength={128}
        onChange={(event) => setCurrentPassword(event.target.value)}
        required
        type="password"
        value={currentPassword}
      />
      <label htmlFor="profile-new-password">Новый пароль</label>
      <input
        autoComplete="new-password"
        id="profile-new-password"
        maxLength={128}
        minLength={10}
        onChange={(event) => setNewPassword(event.target.value)}
        required
        type="password"
        value={newPassword}
      />
      <label htmlFor="profile-confirm-password">Повторите новый пароль</label>
      <input
        autoComplete="new-password"
        id="profile-confirm-password"
        maxLength={128}
        minLength={10}
        onChange={(event) => setConfirmPassword(event.target.value)}
        required
        type="password"
        value={confirmPassword}
      />
      <span className="profile-input-hint">Новый пароль должен содержать от 10 до 128 символов.</span>
      {error && <div className="auth-error" role="alert">{error}</div>}
      {notice && <div className="password-change-notice" role="status">{notice}</div>}
      <div className="profile-dialog-actions">
        <PrimaryButton disabled={saving} type="submit">
          {saving ? 'Сохраняем…' : 'Изменить пароль'}
        </PrimaryButton>
      </div>
    </AuthForm>
  );
}


export default PasswordChangeForm;
