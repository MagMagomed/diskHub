/**
 * Сетка файлов с административной раскладкой.
 * @param {object} props
 * @param {import('react').ReactNode} props.children Карточки пользовательских файлов.
 */
function AdminFileGrid({ children }) {
  return <div className="admin-file-grid">{children}</div>;
}

export default AdminFileGrid;
