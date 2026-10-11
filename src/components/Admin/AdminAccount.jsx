import Icon from '../Icon.jsx';

/**
 * Показывает роль и данные администратора, а также действия профиля и выхода.
 * @param {object} props
 * @param {{username: string, email: string, role: string}} props.user Пользователь с именем, email и ролью.
 * @param {() => void} props.onProfileEdit Открывает редактирование профиля.
 * @param {() => void} props.onLogout Обработчик выхода из аккаунта.
 */
function AdminAccount({ user, onProfileEdit, onLogout }) {
  return (
    <div className="admin-account">
      <span className="admin-role-badge">{user.role}</span>
      <span className="user-label" title={user.email}>{user.username}</span>
      <button
        aria-label="Настройки профиля"
        className="profile-edit-button"
        onClick={onProfileEdit}
        title="Настройки профиля"
        type="button"
      >
        <Icon name="edit" size={15} />
      </button>
      <button className="logout-button" onClick={onLogout} type="button">Выйти</button>
    </div>
  );
}

export default AdminAccount;
