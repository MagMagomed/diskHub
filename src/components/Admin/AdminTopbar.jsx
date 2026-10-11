import AdminAccount from './AdminAccount.jsx';

/**
 * Верхняя панель администратора с брендом и блоком учётной записи.
 * @param {object} props
 * @param {{username: string, email: string, role: string}} props.user Пользователь и его роль.
 * @param {() => void} props.onProfileEdit Открывает редактор профиля.
 * @param {() => void} props.onLogout Завершает сеанс администратора.
 */
function AdminTopbar({ user, onProfileEdit, onLogout }) {
  return (
    <header className="admin-topbar">
      <a className="brand" href="/" aria-label="DiskHub — главная">
        <span className="brand-mark"><Icon name="folder" size={21} /></span>
        <span>disk<span>hub</span></span>
      </a>
      <AdminAccount user={user} onProfileEdit={onProfileEdit} onLogout={onLogout} />
    </header>
  );
}

export default AdminTopbar;
