import Icon from './Icon.jsx';

/**
 * Верхняя панель пользовательской библиотеки с учётной записью и командами профиля.
 * @param {object} props
 * @param {{username: string, email: string}} props.user Данные вошедшего пользователя.
 * @param {() => void} props.onProfileEdit Открывает редактор профиля.
 * @param {() => void} props.onLogout Завершает пользовательский сеанс.
 */
function Topbar({ user, onProfileEdit, onLogout }) {
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>Мои файлы</span>
        <span className="breadcrumb-divider">/</span>
        <strong>Все файлы</strong>
      </div>
      <div className="topbar-right">
        <div className="avatar">{user.username[0].toLocaleUpperCase('ru')}</div>
        <span className="user-label" title={user.email}>{user.username}</span>
        <button
          className="profile-edit-button"
          onClick={onProfileEdit}
          aria-label="Настройки профиля"
          title="Настройки профиля"
          type="button"
        >
          <Icon name="edit" size={15} />
        </button>
        <button className="logout-button" onClick={onLogout} type="button">Выйти</button>
      </div>
    </header>
  );
}

export default Topbar;
