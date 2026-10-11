/**
 * Одна карточка со значением статистики.
 * @param {object} props
 * @param {string} props.label Подпись метрики.
 * @param {string|number} props.value Отображаемое значение метрики.
 */
function AdminStatCard({ label, value }) {
  return (
    <article className="admin-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export default AdminStatCard;
