/**
 * Отображает сообщение-заглушку или состояние загрузки в панели администратора.
 * @param {object} props
 * @param {import('react').ReactNode} props.children Текст или содержимое сообщения.
 */
function AdminEmpty({ children }) {
  return <div className="admin-empty">{children}</div>;
}

export default AdminEmpty;
