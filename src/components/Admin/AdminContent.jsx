/**
 * Основное семантическое содержимое административной страницы.
 * @param {object} props
 * @param {import('react').ReactNode} props.children Заголовки, статистика и секции панели.
 */
function AdminContent({ children }) {
  return <main className="admin-content">{children}</main>;
}

export default AdminContent;
