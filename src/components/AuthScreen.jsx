import { useState } from 'react';
import Icon from './Icon.jsx';
import { authApi } from '../services/api.js';

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

      const response = await authApi.authenticate(mode, {
        email,
        password,
        ...(mode === 'register' ? { username } : {}),
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


export default AuthScreen;
