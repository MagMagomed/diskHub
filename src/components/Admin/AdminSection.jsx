import AdminSectionHeading from './AdminSectionHeading.jsx';

/**
 * Секция административной панели с заголовком и содержимым.
 * @param {object} props
 * @param {string} props.title Заголовок секции.
 * @param {string} props.caption Краткая подпись секции.
 * @param {import('react').ReactNode} props.children Таблица, сетка или сообщение состояния.
 */
function AdminSection({ title, caption, children }) {
  return (
    <section className="admin-section">
      <AdminSectionHeading title={title} caption={caption} />
      {children}
    </section>
  );
}

export default AdminSection;
