import Icon from '../Icon.jsx';

/**
 * Панель списка файлов с заголовком, пояснением и управляемым полем поиска.
 * @param {object} props
 * @param {string} props.title Заголовок списка.
 * @param {string} props.caption Краткая подпись, например число файлов.
 * @param {string} props.query Текущее значение поискового запроса.
 * @param {(query: string) => void} props.onQueryChange Вызывается при изменении или очистке запроса.
 * @param {string} [props.searchLabel="Поиск по файлам"] Доступное имя поля поиска.
 * @param {string} [props.searchPlaceholder="Найти файл"] Подсказка внутри пустого поля.
 */
function FilesToolbar({
  title,
  caption,
  query,
  onQueryChange,
  searchLabel = 'Поиск по файлам',
  searchPlaceholder = 'Найти файл',
}) {
  return (
    <div className="files-toolbar">
      <div>
        <h2>{title}</h2>
        <span className="section-caption">{caption}</span>
      </div>
      <label className="search-box">
        <Icon name="search" size={18} />
        <input
          aria-label={searchLabel}
          placeholder={searchPlaceholder}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        {query && (
          <button
            aria-label="Очистить поиск"
            onClick={() => onQueryChange('')}
            type="button"
          >
            <Icon name="close" size={15} />
          </button>
        )}
      </label>
    </div>
  );
}

export default FilesToolbar;
