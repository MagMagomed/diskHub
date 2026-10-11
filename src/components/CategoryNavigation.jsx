import Icon from './Icon.jsx';

/**
 * Рендерит навигацию категорий и вызывает обработчик при выборе раздела.
 * @param {object} props
 * @param {Array<{id: string, label: string}>} props.categories Категории с уникальным id и подписью.
 * @param {string} props.category id выбранной категории.
 * @param {(categoryId: string) => void} props.onCategoryChange Обработчик выбора категории.
 * @param {number} props.fileCount Количество файлов для счётчика категории «Все файлы».
 * @param {string} [props.className="navigation"] CSS-класс контейнера навигации.
 */
function CategoryNavigation({
  categories,
  category,
  onCategoryChange,
  fileCount,
  className = 'navigation',
}) {
  return (
    <nav
      aria-label="Разделы файлов"
      className={className}
    >
      {categories.map((item) => (
        <button
          className={`nav-item ${category === item.id ? 'active' : ''}`}
          key={item.id}
          onClick={() => onCategoryChange(item.id)}
          type="button"
        >
          <Icon name={item.id === 'all' ? 'grid' : item.id === 'photos' ? 'image' : 'file'} size={className === 'mobile-navigation' ? 17 : 20} />
          <span>{item.label}</span>
          {item.id === 'all' && <span className="nav-count">{fileCount}</span>}
        </button>
      ))}
    </nav>
  );
}

export default CategoryNavigation;
