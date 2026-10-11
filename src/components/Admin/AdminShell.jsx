/**
 * Корневой визуальный контейнер страницы администратора.
 * @param {object} props
 * @param {import('react').ReactNode} props.children Верхняя панель, содержимое и диалоги администратора.
 */
function AdminShell({ children }) {
  return <div className="admin-shell">{children}</div>;
}

export default AdminShell;
