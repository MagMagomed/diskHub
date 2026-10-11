import Icon from './Icon.jsx';
import CategoryNavigation from './CategoryNavigation.jsx';
import { formatSize } from '../utils/fileUtils.js';

/**
 * Боковая панель библиотеки: бренд, выбор категории и сводка объёма хранилища.
 * @param {object} props
 * @param {Array<{id: string, label: string}>} props.categories Список категорий файлов.
 * @param {string} props.category id выбранной категории.
 * @param {(categoryId: string) => void} props.onCategoryChange Обработчик выбора категории.
 * @param {number} props.fileCount Количество файлов в хранилище.
 * @param {number} props.storageSize Суммарный размер файлов в байтах.
 */
function Sidebar({ categories, category, onCategoryChange, fileCount, storageSize }) {
  return (
    <aside className="sidebar">
      <a className="brand" href="/" aria-label="DiskHub — главная">
        <span className="brand-mark"><Icon name="folder" size={21} /></span>
        <span>disk<span>hub</span></span>
      </a>

      <div className="sidebar-section-label">БИБЛИОТЕКА</div>
      <CategoryNavigation
        categories={categories}
        category={category}
        onCategoryChange={onCategoryChange}
        fileCount={fileCount}
      />

      <div className="sidebar-bottom">
        <div className="storage-heading">
          <span>Моё хранилище</span>
          <span>{formatSize(storageSize)}</span>
        </div>
        <div className="storage-track"><span /></div>
        <p>Файлы хранятся на этом устройстве</p>
        <div className="storage-location"><span className="status-dot" /> Личная папка аккаунта</div>
      </div>
    </aside>
  );
}

export default Sidebar;
