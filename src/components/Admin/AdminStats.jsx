import { formatSize } from '../../utils/fileUtils.js';
import AdminStatCard from './AdminStatCard.jsx';

/**
 * Сводные метрики пользователей, файлов, объёма хранилища и администраторов.
 * @param {object} props
 * @param {Array<{role: string}>} props.users Список аккаунтов с полем role.
 * @param {Array<object>} props.files Список файлов; используется для подсчёта количества.
 * @param {number} props.totalBytes Суммарный размер файлов в байтах.
 */
function AdminStats({ users, files, totalBytes }) {
  const administratorCount = users.filter(
    (account) => account.role === 'System Customizer',
  ).length;

  return (
    <section aria-label="Статистика приложения" className="admin-stats">
      <AdminStatCard label="Пользователи" value={users.length} />
      <AdminStatCard label="Все файлы" value={files.length} />
      <AdminStatCard label="Общий размер файлов" value={formatSize(totalBytes)} />
      <AdminStatCard label="Администраторы" value={administratorCount} />
    </section>
  );
}

export default AdminStats;
