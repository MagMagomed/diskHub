/**
 * Заголовок секции административной панели с подписью.
 * @param {object} props
 * @param {string} props.title Название секции.
 * @param {string} props.caption Дополнительная информация, например число записей.
 */
function AdminSectionHeading({ title, caption }) {
  return (
    <div className="admin-section-heading">
      <div>
        <h2>{title}</h2>
        <span className="section-caption">{caption}</span>
      </div>
    </div>
  );
}

export default AdminSectionHeading;
