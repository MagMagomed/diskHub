import CategoryNavigation from './CategoryNavigation.jsx';

/**
 * Адаптивная навигация категорий для узких экранов.
 * @param {object} props
 * @param {Array<{id: string, label: string}>} props.categories Список разделов библиотеки.
 * @param {string} props.category id текущего раздела.
 * @param {(categoryId: string) => void} props.onCategoryChange Обработчик переключения раздела.
 * @param {number} props.fileCount Число файлов для счётчика «Все файлы».
 */
function MobileNavigation({ categories, category, onCategoryChange, fileCount }) {
  return (
    <CategoryNavigation
      categories={categories}
      category={category}
      onCategoryChange={onCategoryChange}
      fileCount={fileCount}
      className="mobile-navigation"
    />
  );
}

export default MobileNavigation;
